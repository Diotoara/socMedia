const { StateGraph, END } = require('@langchain/langgraph');
const { ErrorHandler, ErrorAction } = require('./error-handler.service');

/**
 * AutomationWorkflow - Manages the Instagram comment automation workflow using LangGraph
 * Orchestrates comment detection, AI reply generation, and posting
 */
class AutomationWorkflow {
  constructor(instagramService, aiReplyService, storageService, config = {}) {
    if (!instagramService) {
      throw new Error('InstagramService is required');
    }
    if (!aiReplyService) {
      throw new Error('AIReplyService is required');
    }
    if (!storageService) {
      throw new Error('StorageService is required');
    }

    this.instagramService = instagramService;
    this.aiReplyService = aiReplyService;
    this.storageService = storageService;
    this.errorHandler = new ErrorHandler(storageService);

    // Configuration
    this.pollIntervalSeconds = config.pollIntervalSeconds || 30;
    this.maxCommentsPerCheck = config.maxCommentsPerCheck || 10;
    this.replyTone = config.replyTone || 'friendly';
    this.selectedPostIds = config.selectedPostIds || [];
    this.monitorAll = config.monitorAll || false;

    // Workflow state
    this.state = {
      isRunning: false,
      lastCheckTime: null,
      processedComments: new Set(),
      pendingComments: [],
      errors: [],
      stats: {
        commentsDetected: 0,
        repliesGenerated: 0,
        repliesPosted: 0,
        errorCount: 0
      }
    };

    // Polling mechanism
    this.pollTimer = null;
    this.isProcessing = false;

    // Initialize LangGraph workflow
    this.graph = null;
    this.initializeGraph();
  }

  /**
   * Initialize the LangGraph StateGraph with workflow nodes and edges
   * @private
   */
  initializeGraph() {
    // Create a new StateGraph
    const workflow = new StateGraph({
      channels: {
        isRunning: null,
        lastCheckTime: null,
        processedComments: null,
        pendingComments: null,
        errors: null,
        stats: null,
        currentComment: null,
        currentReply: null,
        shouldContinue: null
      }
    });

    // Add nodes to the graph
    workflow.addNode('detectComments', this.detectCommentsNode.bind(this));
    workflow.addNode('generateReply', this.generateReplyNode.bind(this));
    workflow.addNode('postReply', this.postReplyNode.bind(this));
    workflow.addNode('errorHandling', this.errorHandlingNode.bind(this));

    // Define the workflow edges
    workflow.addEdge('__start__', 'detectComments');
    
    // Conditional edge from detectComments
    workflow.addConditionalEdges(
      'detectComments',
      this.routeAfterDetection.bind(this),
      {
        'generateReply': 'generateReply',
        'end': END
      }
    );

    // Edge from generateReply to postReply or errorHandling
    workflow.addConditionalEdges(
      'generateReply',
      this.routeAfterGeneration.bind(this),
      {
        'postReply': 'postReply',
        'errorHandling': 'errorHandling'
      }
    );

    // Edge from postReply back to detectComments or errorHandling
    workflow.addConditionalEdges(
      'postReply',
      this.routeAfterPosting.bind(this),
      {
        'detectComments': 'detectComments',
        'errorHandling': 'errorHandling'
      }
    );

    // Edge from errorHandling back to detectComments
    workflow.addEdge('errorHandling', 'detectComments');

    // Compile the graph
    this.graph = workflow.compile();
  }

  /**
   * Node: Detect new comments from Instagram posts
   * @private
   */
  async detectCommentsNode(state) {
    try {
      console.log('[AutomationWorkflow] ========== Starting Comment Detection ==========');
      console.log('[AutomationWorkflow] Current time:', new Date().toISOString());
      
      // Update last check time
      state.lastCheckTime = new Date();

      // Get posts to monitor (either selected posts or recent posts)
      let posts;
      if (!this.monitorAll && this.selectedPostIds && this.selectedPostIds.length > 0) {
        console.log(`[AutomationWorkflow] Monitoring ${this.selectedPostIds.length} selected posts`);
        // For selected posts, we need to fetch them individually
        // For now, get all posts and filter
        const allPosts = await this.errorHandler.executeWithRetry(
          () => this.instagramService.getAccountPosts(100),
          { operation: 'getAccountPosts', node: 'detectComments' }
        );
        posts = allPosts.filter(post => this.selectedPostIds.includes(post.id));
        console.log(`[AutomationWorkflow] Found ${posts.length} matching posts from ${allPosts.length} total posts`);
      } else {
        // Get recent posts from the authenticated user with error handling
        console.log('[AutomationWorkflow] Fetching recent posts (monitoring all posts)...');
        const fetchLimit = this.monitorAll ? 25 : 5;
        posts = await this.errorHandler.executeWithRetry(
          () => this.instagramService.getAccountPosts(fetchLimit),
          { operation: 'getAccountPosts', node: 'detectComments' }
        );
      }
      
      console.log(`[AutomationWorkflow] Checking ${posts.length} posts for comments`);
      
      const newComments = [];

      // Get bot's own username to filter out self-replies
      const botUsername = await this.instagramService.getAccountInfo().then(info => info.username).catch(() => null);
      console.log(`[AutomationWorkflow] Bot username: @${botUsername}`);

      // Fetch comments for each post
      for (const post of posts) {
        console.log(`[AutomationWorkflow] Checking post ${post.id} (${post.type}) - ${post.commentCount} comments`);
        try {
          const comments = await this.errorHandler.executeWithRetry(
            () => this.instagramService.getRecentComments(post.id),
            { operation: 'getRecentComments', node: 'detectComments', postId: post.id }
          );
          
          console.log(`[AutomationWorkflow] Retrieved ${comments.length} comments from post ${post.id}`);
          
          // Filter out already processed comments and bot's own comments
          for (const comment of comments) {
            // Skip bot's own comments to prevent infinite loop
            if (botUsername && comment.username === botUsername) {
              console.log(`[AutomationWorkflow] Skipping bot's own comment ${comment.id}`);
              continue;
            }

            const isProcessed = await this.storageService.isCommentProcessed(comment.id);
            
            console.log(`[AutomationWorkflow] Comment ${comment.id} from @${comment.username}: "${comment.text.substring(0, 50)}..." - Processed: ${isProcessed}`);
            
            // Skip if already processed
            if (isProcessed) {
              console.log(`[AutomationWorkflow] Skipping already processed comment ${comment.id}`);
              continue;
            }
            
            // Graph API doesn't return replies in the main comments list, so all are top-level
            newComments.push({
              ...comment,
              postCaption: post.caption,
              postType: post.type
            });

            // Log comment detection
            await this.storageService.appendLog({
              type: 'comment_detected',
              message: `New comment detected from @${comment.username}`,
              details: {
                commentId: comment.id,
                postId: comment.postId,
                username: comment.username,
                text: comment.text
              }
            });
          }
        } catch (error) {
          // Handle error for individual post
          const errorResult = await this.errorHandler.handleError(error, {
            operation: 'getRecentComments',
            node: 'detectComments',
            postId: post.id
          });
          
          // If we should stop automation, throw the error
          if (errorResult.shouldStop) {
            throw error;
          }
          // Otherwise continue with other posts
        }
      }

      // Limit to max comments per check
      const commentsToProcess = newComments.slice(0, this.maxCommentsPerCheck);

      state.pendingComments = commentsToProcess;
      state.stats.commentsDetected += commentsToProcess.length;

      console.log(`[AutomationWorkflow] Found ${commentsToProcess.length} new comments to process`);
      console.log(`[AutomationWorkflow] Total posts checked: ${posts.length}`);
      console.log(`[AutomationWorkflow] Total new comments found: ${newComments.length}`);

      return state;
    } catch (error) {
      console.error('[AutomationWorkflow] Error in detectCommentsNode:', error.message);
      
      // Handle error with error handler
      const errorResult = await this.errorHandler.handleError(error, {
        node: 'detectComments',
        operation: 'detectCommentsNode'
      });
      
      state.errors.push({
        node: 'detectComments',
        error: error.message,
        timestamp: new Date(),
        shouldStop: errorResult.shouldStop
      });
      
      // If authentication error, stop the workflow
      if (errorResult.shouldStop) {
        await this.stop();
      }
      
      return state;
    }
  }

  /**
   * Node: Generate AI reply for a comment
   * @private
   */
  async generateReplyNode(state) {
    try {
      // Get the next pending comment
      if (state.pendingComments.length === 0) {
        state.currentComment = null;
        state.currentReply = null;
        return state;
      }

      const comment = state.pendingComments[0];
      state.currentComment = comment;

      console.log(`[AutomationWorkflow] Generating reply for comment: "${comment.text}"`);

      // Generate reply using AI service with error handling and retry
      const reply = await this.errorHandler.executeWithRetry(
        () => this.aiReplyService.generateReply(
          comment.text,
          this.replyTone,
          {
            caption: comment.postCaption,
            postType: comment.postType
          }
        ),
        {
          operation: 'generateReply',
          node: 'generateReply',
          commentId: comment.id
        }
      );

      const trimmedReply = typeof reply === 'string' ? reply.trim() : '';

      if (!trimmedReply) {
        console.warn('[AutomationWorkflow] Generated reply was empty. Marking comment as processed to avoid retry loop.');
        await this.storageService.markCommentProcessed(comment.id, {
          postId: comment.postId,
          username: comment.username,
          text: comment.text,
          reply: null,
          status: 'skipped'
        });
        state.pendingComments.shift();
        state.currentComment = null;
        state.currentReply = null;
        return state;
      }

      state.currentReply = trimmedReply;
      state.stats.repliesGenerated++;

      // Log reply generation
      await this.storageService.appendLog({
        type: 'reply_generated',
        message: `AI reply generated for comment from @${comment.username}`,
        details: {
          commentId: comment.id,
          commentText: comment.text,
          reply: trimmedReply,
          tone: this.replyTone
        }
      });

      console.log(`[AutomationWorkflow] Generated reply: "${trimmedReply}"`);

      return state;
    } catch (error) {
      console.error('[AutomationWorkflow] Error in generateReplyNode:', error.message);
      
      // Handle error with error handler
      const errorResult = await this.errorHandler.handleError(error, {
        node: 'generateReply',
        operation: 'generateReplyNode',
        commentId: state.currentComment?.id
      });
      
      state.errors.push({
        node: 'generateReply',
        error: error.message,
        comment: state.currentComment,
        timestamp: new Date(),
        action: errorResult.action
      });
      
      state.currentReply = null;
      
      // If we should skip this comment, remove it from pending
      if (errorResult.action === ErrorAction.SKIP_AND_CONTINUE) {
        state.pendingComments.shift();
      }
      
      return state;
    }
  }

  /**
   * Node: Post the generated reply to Instagram
   * @private
   */
  async postReplyNode(state) {
    try {
      const comment = state.currentComment;
      const reply = state.currentReply;

      if (!comment || !reply) {
        return state;
      }

      console.log(`[AutomationWorkflow] Posting reply to comment ${comment.id}`);

      // Post the reply to Instagram with error handling and retry
      // Use smart reply: tries public first, falls back to private if needed
      const replyResult = await this.errorHandler.executeWithRetry(
        () => this.instagramService.replyToCommentSmart(comment.id, reply),
        {
          operation: 'replyToComment',
          node: 'postReply',
          commentId: comment.id
        }
      );

      // Log the type of reply that was sent
      const replyType = replyResult?.type || 'public';
      const replyTypeDisplay = replyType === 'private' ? 'private message' : 'public reply';
      console.log(`[AutomationWorkflow] Successfully posted ${replyTypeDisplay}`);

      // Mark comment as processed with full data
      await this.storageService.markCommentProcessed(comment.id, {
        postId: comment.postId,
        username: comment.username,
        text: comment.text,
        reply: reply,
        replyId: replyResult?.id || null,
        status: 'reply_posted'
      });
      state.processedComments.add(comment.id);

      // Remove from pending comments
      state.pendingComments.shift();

      state.stats.repliesPosted++;

      // Log successful reply posting
      await this.storageService.appendLog({
        type: 'reply_posted',
        message: `${replyType === 'private' ? 'Private reply' : 'Public reply'} posted to comment from @${comment.username}`,
        details: {
          commentId: comment.id,
          postId: comment.postId,
          username: comment.username,
          reply: reply,
          replyType: replyType
        }
      });

      console.log(`[AutomationWorkflow] Successfully posted reply`);

      // Clear current comment and reply
      state.currentComment = null;
      state.currentReply = null;

      return state;
    } catch (error) {
      console.error('[AutomationWorkflow] Error in postReplyNode:', error.message);
      
      // Handle error with error handler
      const errorResult = await this.errorHandler.handleError(error, {
        node: 'postReply',
        operation: 'postReplyNode',
        commentId: state.currentComment?.id,
        attemptNumber: this.errorHandler.maxRetries
      });
      
      state.errors.push({
        node: 'postReply',
        error: error.message,
        comment: state.currentComment,
        reply: state.currentReply,
        timestamp: new Date(),
        action: errorResult.action
      });

      if (
        state.currentComment &&
        errorResult.action !== ErrorAction.STOP_AUTOMATION &&
        errorResult.action !== ErrorAction.WAIT_AND_RETRY &&
        errorResult.action !== ErrorAction.RETRY_WITH_BACKOFF
      ) {
        try {
          await this.storageService.markCommentProcessed(state.currentComment.id, {
            postId: state.currentComment.postId,
            username: state.currentComment.username,
            text: state.currentComment.text,
            reply: state.currentReply || null,
            status: errorResult.action === ErrorAction.SKIP_AND_CONTINUE ? 'failed' : 'skipped'
          });
        } catch (markError) {
          console.error('[AutomationWorkflow] Failed to mark comment as processed after post error:', markError.message);
        }
      }

      // Remove failed comment from pending (skip and continue)
      if (state.pendingComments.length > 0) {
        state.pendingComments.shift();
      }

      state.currentComment = null;
      state.currentReply = null;
      
      // If authentication error, stop the workflow
      if (errorResult.shouldStop) {
        await this.stop();
      }

      return state;
    }
  }

  /**
   * Node: Handle errors and log them
   * @private
   */
  async errorHandlingNode(state) {
    try {
      // Get the most recent error
      if (state.errors.length > 0) {
        const recentError = state.errors[state.errors.length - 1];
        
        state.stats.errorCount++;

        // Log the error
        await this.storageService.appendLog({
          type: 'error',
          message: `Error in ${recentError.node}: ${recentError.error}`,
          details: {
            node: recentError.node,
            error: recentError.error,
            comment: recentError.comment,
            timestamp: recentError.timestamp
          }
        });

        console.error(`[AutomationWorkflow] Error handled: ${recentError.error}`);
      }

      // Clear current comment and reply to move on
      state.currentComment = null;
      state.currentReply = null;

      return state;
    } catch (error) {
      console.error('[AutomationWorkflow] Error in errorHandlingNode:', error.message);
      return state;
    }
  }

  /**
   * Routing function after comment detection
   * @private
   */
  routeAfterDetection(state) {
    // If there are pending comments, proceed to generate reply
    if (state.pendingComments && state.pendingComments.length > 0) {
      return 'generateReply';
    }
    // Otherwise, end this cycle
    return 'end';
  }

  /**
   * Routing function after reply generation
   * @private
   */
  routeAfterGeneration(state) {
    // If reply was generated successfully, post it
    if (state.currentReply) {
      return 'postReply';
    }
    // Otherwise, handle the error
    return 'errorHandling';
  }

  /**
   * Routing function after posting reply
   * @private
   */
  routeAfterPosting(state) {
    // Check if there was an error in posting
    const lastError = state.errors[state.errors.length - 1];
    if (lastError && lastError.node === 'postReply') {
      return 'errorHandling';
    }

    // If there are more pending comments, continue processing
    if (state.pendingComments && state.pendingComments.length > 0) {
      return 'detectComments';
    }

    // Otherwise, go back to detect comments (will end the cycle)
    return 'detectComments';
  }

  /**
   * Start the automation workflow
   */
  async start() {
    if (this.state.isRunning) {
      console.log('[AutomationWorkflow] Workflow is already running');
      return;
    }

    console.log('[AutomationWorkflow] Starting automation workflow...');
    this.state.isRunning = true;

    // Persist automation state
    await this.persistState();

    // Log workflow start
    await this.storageService.appendLog({
      type: 'info',
      message: 'Automation workflow started',
      details: {
        pollIntervalSeconds: this.pollIntervalSeconds,
        replyTone: this.replyTone
      }
    });

    // Start the polling mechanism
    this.startPolling();
  }

  /**
   * Stop the automation workflow
   */
  async stop() {
    if (!this.state.isRunning) {
      console.log('[AutomationWorkflow] Workflow is not running');
      return;
    }

    console.log('[AutomationWorkflow] Stopping automation workflow...');
    this.state.isRunning = false;

    // Stop the polling mechanism
    this.stopPolling();

    // Persist automation state
    await this.persistState();

    // Log workflow stop
    await this.storageService.appendLog({
      type: 'info',
      message: 'Automation workflow stopped',
      details: {
        stats: this.state.stats
      }
    });
  }

  /**
   * Start the polling mechanism
   * @private
   */
  startPolling() {
    // Clear any existing timer
    this.stopPolling();

    // Execute workflow immediately
    this.executeWorkflowCycle();

    // Set up recurring polling
    this.pollTimer = setInterval(() => {
      if (this.state.isRunning && !this.isProcessing) {
        this.executeWorkflowCycle();
      }
    }, this.pollIntervalSeconds * 1000);

    console.log(`[AutomationWorkflow] Polling started with ${this.pollIntervalSeconds}s interval`);
  }

  /**
   * Stop the polling mechanism
   * @private
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('[AutomationWorkflow] Polling stopped');
    }
  }

  /**
   * Execute one cycle of the workflow
   * @private
   */
  async executeWorkflowCycle() {
    if (this.isProcessing) {
      console.log('[AutomationWorkflow] Already processing, skipping cycle');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('[AutomationWorkflow] Executing workflow cycle...');

      // Invoke the LangGraph workflow
      const result = await this.graph.invoke(this.state);

      // Update state with result
      this.state = { ...this.state, ...result };

      // Persist state after each cycle
      await this.persistState();

      console.log('[AutomationWorkflow] Workflow cycle completed');
      console.log(`[AutomationWorkflow] Stats: ${JSON.stringify(this.state.stats)}`);
    } catch (error) {
      console.error('[AutomationWorkflow] Error executing workflow cycle:', error.message);
      
      // Log the error
      await this.storageService.appendLog({
        type: 'error',
        message: `Workflow cycle error: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack
        }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get current workflow state and status
   */
  getState() {
    return {
      isRunning: this.state.isRunning,
      lastCheckTime: this.state.lastCheckTime,
      stats: this.state.stats,
      pendingCommentsCount: this.state.pendingComments.length,
      processedCommentsCount: this.state.processedComments.size,
      errorCount: this.state.errors.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Update configuration (reply tone, poll interval)
   */
  updateConfig(config) {
    if (config.replyTone) {
      this.replyTone = config.replyTone;
      console.log(`[AutomationWorkflow] Reply tone updated to: ${this.replyTone}`);
    }

    if (config.pollIntervalSeconds) {
      this.pollIntervalSeconds = config.pollIntervalSeconds;
      console.log(`[AutomationWorkflow] Poll interval updated to: ${this.pollIntervalSeconds}s`);
      
      // Restart polling with new interval if running
      if (this.state.isRunning) {
        this.startPolling();
      }
    }
  }

  /**
   * Reset workflow statistics
   */
  resetStats() {
    this.state.stats = {
      commentsDetected: 0,
      repliesGenerated: 0,
      repliesPosted: 0,
      errorCount: 0
    };
    console.log('[AutomationWorkflow] Statistics reset');
  }

  /**
   * Persist current automation state to storage
   * @private
   */
  async persistState() {
    try {
      await this.storageService.saveAutomationState({
        isActive: this.state.isRunning,
        lastCheckTime: this.state.lastCheckTime,
        stats: this.state.stats
      });
      console.log('[AutomationWorkflow] State persisted to storage');
    } catch (error) {
      console.error('[AutomationWorkflow] Error persisting state:', error.message);
      // Don't throw - state persistence failure shouldn't stop the workflow
    }
  }

  /**
   * Restore automation state from storage
   * @returns {Promise<boolean>} True if state was restored and automation should resume
   */
  async restoreState() {
    try {
      const savedState = await this.storageService.loadAutomationState();
      
      if (!savedState) {
        console.log('[AutomationWorkflow] No saved state found');
        return false;
      }

      // Restore statistics
      if (savedState.stats) {
        this.state.stats = savedState.stats;
      }

      // Restore last check time
      if (savedState.lastCheckTime) {
        this.state.lastCheckTime = savedState.lastCheckTime;
      }

      console.log('[AutomationWorkflow] State restored from storage');
      
      // Return whether automation was active
      return savedState.isActive === true;
    } catch (error) {
      console.error('[AutomationWorkflow] Error restoring state:', error.message);
      return false;
    }
  }
}

module.exports = AutomationWorkflow;
