const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

class AIReplyService {
  constructor(apiKey) {
    if (!apiKey || typeof apiKey !== "string") {
      throw new Error("Gemini API key is required");
    }

    const trimmed = apiKey.trim();
    if (!trimmed) throw new Error("Gemini API key cannot be empty");

    this.model = new ChatGoogleGenerativeAI({
      apiKey: trimmed,
      model: "gemini-2.5-flash", // Changed from gemini-2.5-flash (which doesn't exist yet)
      temperature: 0.9, // Balanced creativity
      topP: 0.95,
      maxOutputTokens: 250,
    });

    this.MAX_RETRIES = 3;
    this.DEFAULT_TONE = "engaging_friendly_curious";
  }

  /**
   * Generate a single reply (picks the first option from generateReplyOptions)
   */
  async generateReply(commentText, tone = this.DEFAULT_TONE, context = null) {
    if (!commentText) throw new Error("Comment is required");

    console.log(`[AIReplyService] Generating reply for: "${commentText.substring(0, 50)}..."`);
    console.log(`[AIReplyService] Tone: ${tone}, Context:`, context ? 'provided' : 'none');

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[AIReplyService] Attempt ${attempt}/${this.MAX_RETRIES}`);
        
        const prompt = this.buildPrompt(commentText, context);
        const response = await this.model.invoke(prompt);
        let raw = this.extract(response);

        console.log(`[AIReplyService] Raw response length: ${raw?.length || 0}`);
        
        if (!raw || this.looksBad(raw)) {
          console.log(`[AIReplyService] Empty or bad response (attempt ${attempt}/${this.MAX_RETRIES}). Retrying...`);
          continue;
        }

        const replies = this.formatToArray(raw);
        console.log(`[AIReplyService] Parsed ${replies.length} replies`);
        
        if (replies.length > 0) {
          const selectedReply = replies[0];
          console.log(`[AIReplyService] Selected reply: "${selectedReply}"`);
          return selectedReply;
        }

        console.log(`[AIReplyService] Empty reply from Gemini (attempt ${attempt}/${this.MAX_RETRIES}). Retrying...`);
      } catch (err) {
        console.error(`[AIReplyService] Error on attempt ${attempt}:`, err.message);
        if (attempt === this.MAX_RETRIES) {
          console.log(`[AIReplyService] Using fallback reply template after repeated failures.`);
          return this.getFallbackReply(commentText, context);
        }
      }
    }

    console.log(`[AIReplyService] Using fallback reply template after repeated empty responses from Gemini.`);
    return this.getFallbackReply(commentText, context);
  }

  /**
   * Generate multiple reply options (returns array of 5 replies)
   */
  async generateReplyOptions(commentText, tone = this.DEFAULT_TONE, context = null) {
    if (!commentText) throw new Error("Comment is required");

    const prompt = this.buildPrompt(commentText, context);

    for (let i = 1; i <= this.MAX_RETRIES; i++) {
      try {
        const response = await this.model.invoke(prompt);
        let raw = this.extract(response);

        if (!raw || this.looksBad(raw)) continue;

        const replies = this.formatToArray(raw);
        if (replies.length) return replies;

      } catch (err) {
        if (i === this.MAX_RETRIES) return this.defaultReplies(commentText);
      }
    }

    return this.defaultReplies(commentText);
  }

  buildPrompt(commentText, context) {
    return `
You are a *SUPER FRIENDLY + ENGAGING + CURIOUS* Instagram creator.
Your job: Generate **5 different** human-like, warm, natural Instagram comment replies.

🔥 STYLE RULES:
- Replies must feel like real creator talking.
- Very friendly, warm, positive.
- 1–2 emojis max (😄✨❤️🔥).
- Add a small curiosity question at the end.
- Each reply MUST be totally unique.
- No robotic wording.
- No JSON. No code. Only pure text.
- Each reply separated clearly in a list.

🧠 USER COMMENT:
"${commentText}"

${context?.caption ? `Post Caption: "${context.caption}"` : ""}

✨ OUTPUT FORMAT (VERY IMPORTANT):
Write EXACTLY like this:

1. reply text
2. reply text
3. reply text
4. reply text
5. reply text

Generate now:
    `;
  }

  extract(res) {
    if (!res) return "";
    if (typeof res === "string") return res;
    if (res.text) return res.text;

    if (Array.isArray(res.content)) {
      const c = res.content.find(x => x.text);
      return c?.text || "";
    }

    return "";
  }

  looksBad(t) {
    if (!t) return true;
    const x = t.trim();
    return (
      x.startsWith("{") ||
      x.startsWith("[") ||
      x.includes('"lc":') ||
      x.includes("constructor")
    );
  }

  formatToArray(text) {
    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(l => /^\d+\./.test(l))
      .map(l => l.replace(/^\d+\.\s*/, "").trim())
      .filter(l => l.length > 2);

    return lines;
  }

  /**
   * Get a single fallback reply (for generateReply method)
   */
  getFallbackReply(commentText, context) {
    const replies = this.defaultReplies(commentText);
    // Pick a random reply from the defaults
    return replies[Math.floor(Math.random() * replies.length)];
  }

  /**
   * Get multiple default replies (for generateReplyOptions method)
   */
  defaultReplies(comment) {
    return [
      `Aww thank you so much! 😄💛 Really means a lot! Btw, what made you comment this?`,
      `You're so sweet! ❤️ Appreciate it! Which part did you vibe with the most?`,
      `Thanks a ton! 😇✨ Love hearing from you! Anything specific you liked?`,
      `That’s so kind! 😄🔥 What caught your attention here?`,
      `You made my day! 💛😄 Tell me… what stood out the most to you?`
    ];
  }
}

module.exports = AIReplyService;
