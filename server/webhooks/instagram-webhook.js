const express = require('express');
const crypto = require('crypto');

/**
 * Instagram Webhook Handler (Business Login compliant)
 *
 * Mount this router at `/webhooks/meta` to expose:
 *   GET  /webhooks/meta/instagram   -> verification handshake
 *   POST /webhooks/meta/instagram   -> event notifications (comments, messages, story_insights, etc.)
 */

const router = express.Router();

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET;

if (!VERIFY_TOKEN) {
  console.warn('[Webhook] INSTAGRAM_WEBHOOK_VERIFY_TOKEN not set. Verification will fail until configured.');
}

if (!APP_SECRET) {
  console.warn('[Webhook] INSTAGRAM_CLIENT_SECRET (app secret) not set. Signature validation disabled.');
}

/**
 * GET /webhooks/meta/instagram
 * Responds to Meta's verification challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`).
 */
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && challenge) {
    if (token === VERIFY_TOKEN) {
      console.log('[Webhook] Verification successful');
      return res.status(200).send(challenge);
    }

    console.error('[Webhook] Verification failed: invalid verify token');
    return res.sendStatus(403);
  }

  console.error('[Webhook] Verification failed: missing or invalid query params');
  return res.sendStatus(400);
});

/**
 * Middleware-aware signature verification using raw request body.
 */
function verifySignature(req) {
  if (!APP_SECRET) {
    return true; // Skip verification when secret is unavailable (development only)
  }

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader) {
    console.error('[Webhook] Invalid request: missing X-Hub-Signature-256 header');
    return false;
  }

  const [algorithm, signatureHash] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !signatureHash) {
    console.error('[Webhook] Invalid signature format');
    return false;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('[Webhook] Missing raw body for signature verification');
    return false;
  }

  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(Buffer.from(signatureHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  if (!isValid) {
    console.error('[Webhook] Signature mismatch');
  }

  return isValid;
}

/**
 * POST /webhooks/meta/instagram
 * Handles webhook notifications from Meta (comments, messages, mentions, story_insights, etc.).
 */
router.post(
  '/instagram',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf; // Preserve raw payload for signature verification
    }
  }),
  (req, res) => {
    if (!verifySignature(req)) {
      return res.sendStatus(403);
    }

    const body = req.body;

    if (body.object !== 'instagram') {
      return res.sendStatus(404);
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    entries.forEach(entry => {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      changes.forEach(change => {
        if (!change || !change.field) {
          return;
        }

        handleWebhookEvent(change, entry);
      });

      const messagingEvents = Array.isArray(entry.messaging) ? entry.messaging : [];
      messagingEvents.forEach(event => {
        if (!event) {
          return;
        }

        handleWebhookEvent({ field: 'messages', value: event }, entry);
      });
    });

    return res.status(200).send('EVENT_RECEIVED');
  }
);

/**
 * Dispatch webhook events based on field.
 */
function handleWebhookEvent(event, entry) {
  const field = event.field;
  const value = event.value;

  console.log(`[Webhook] Received event: ${field}`);

  switch (field) {
    case 'comments':
      handleCommentEvent(value);
      break;

    case 'mentions':
      handleMentionEvent(value);
      break;

    case 'messages':
      handleMessageEvent(value);
      break;

    case 'messaging_postbacks':
      handlePostbackEvent(value);
      break;

    case 'story_insights':
      handleStoryInsightsEvent(value);
      break;

    default:
      console.log(`[Webhook] Unhandled event type: ${field}`);
  }
}

function handleCommentEvent(value = {}) {
  const commentId = value.id;
  const mediaId = value.media_id || value.media?.id;
  const text = value.text;
  const from = value.from;

  console.log('[Webhook] New comment received:', {
    commentId,
    mediaId,
    from: from?.username || from?.id,
    text
  });

  if (global.eventEmitter) {
    global.eventEmitter.emit('instagram:comment', {
      commentId,
      mediaId,
      text,
      from,
      timestamp: new Date(),
      raw: value
    });
  }
}

function handleMessageEvent(event = {}) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const message = event.message;

  console.log('[Webhook] New message received:', {
    senderId,
    recipientId,
    message: message?.text || '[media]'
  });

  if (global.eventEmitter) {
    global.eventEmitter.emit('instagram:message', {
      senderId,
      recipientId,
      message,
      timestamp: new Date(),
      raw: event
    });
  }
}

function handlePostbackEvent(event = {}) {
  const senderId = event.sender?.id;
  const payload = event.postback?.payload;

  console.log('[Webhook] Postback received:', {
    senderId,
    payload
  });

  if (global.eventEmitter) {
    global.eventEmitter.emit('instagram:postback', {
      senderId,
      payload,
      timestamp: new Date(),
      raw: event
    });
  }
}

function handleMentionEvent(value = {}) {
  const mediaId = value.media_id;
  const commentId = value.comment_id;

  console.log('[Webhook] Mention received:', {
    mediaId,
    commentId
  });

  if (global.eventEmitter) {
    global.eventEmitter.emit('instagram:mention', {
      mediaId,
      commentId,
      timestamp: new Date(),
      raw: value
    });
  }
}

function handleStoryInsightsEvent(value = {}) {
  const storyId = value.story_id;
  const metrics = value.metrics;

  console.log('[Webhook] Story insights received:', {
    storyId,
    metrics
  });

  if (global.eventEmitter) {
    global.eventEmitter.emit('instagram:story_insight', {
      storyId,
      metrics,
      timestamp: new Date(),
      raw: value
    });
  }
}

module.exports = router;
