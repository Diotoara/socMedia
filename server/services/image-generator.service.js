const { GoogleGenAI } = require('@google/genai');
const axios = require('axios'); // fallback ke liye hi use hoga
const fs = require('fs').promises;
const path = require('path');

/**
 * Ultra Enhanced Image Generator Service (Gemini SDK Version) 🎨
 */
class ImageGeneratorService {
  constructor() {
    this.initialized = false;
    this.apiKey = null;
    this.modelId = 'gemini-2.5-flash-image'; // Official Nano-Banana model
  }

  /**
   * Initialize with Gemini API key
   */
  initialize(apiKey) {
    if (!apiKey) throw new Error('Gemini API key is required');
    this.apiKey = apiKey.toString().trim();
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.initialized = true;
    console.log('[ImageGeneratorService] Initialized with Gemini SDK 🎨');
  }

  /**
   * Generate the enriched prompt
   */
  enrichPrompt(rawPrompt) {
    return `
${rawPrompt}

🎨 Visual Objective:
Design a high-resolution, square illustration that represents a web-development topic centred on **JavaScript or Java frameworks** (such as React, Next.js, Spring Boot) using **only icons and visual objects**. Exclude any readable text, arrows, flow-charts, connecting lines or labels.

🧩 Composition:
- Light neutral background (white or very light gray)
- Visual objects/icons tied to the framework or language:
  • For JavaScript frameworks: e.g., stylised browser window icon + code-bracket icon + the framework logo symbol (React, Next.js)  
  • For Java backend (Java): e.g., stylised server rack icon + coffee-cup icon + module icon representing Spring Boot  
- Consistent minimal icon style, subtle drop shadows, balanced spacing  
- No textual labels or annotation boxes, no arrows or flow-lines  
- Colour palette: professional tech tones (blues, teals, greys, charcoal) + one accent colour  
- Square format (target highest supported resolution by the model)

🧠 Content Focus:
- The image should clearly evoke the **specific framework or language ecosystem** (JavaScript or Java) and web-development domain (frontend framework, backend service) purely via objects/icons  
- Avoid full diagrams, sequence flows or code screenshots; focus on strong visual metaphor of the technology

🚫 Avoid:
- Any readable words or labels in the image  
- Flowcharts, arrows, step boxes, connecting lines  
- Boxed text inside the image or diagrams with steps  
- Overly decorative elements or clutter that distracts from the core technology theme

📐 Output Format:
Square image, highest resolution supported by the model, suitable for developer-audience social media posts.
`.trim();
  }



  /**
   * Main image generation function
   */
  async generateImage(rawPrompt) {
    if (!this.initialized) {
      throw new Error('Image generator not initialized');
    }

    const enriched = this.enrichPrompt(rawPrompt);

    try {
      console.log('[ImageGeneratorService] Generating with Gemini SDK...');

      const config = {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          imageSize: '6K', // 1024x1024
        },
      };

      const contents = [
        {
          role: 'user',
          parts: [{ text: enriched }],
        },
      ];

      const stream = await this.ai.models.generateContentStream({
        model: this.modelId,
        config,
        contents,
      });

      let imageBuffer = null;

      for await (const chunk of stream) {
        const part = chunk?.candidates?.[0]?.content?.parts?.[0];

        if (part?.inlineData?.data) {
          const base64 = part.inlineData.data;
          imageBuffer = Buffer.from(base64, 'base64');
        }
      }

      if (!imageBuffer) {
        throw new Error('Gemini did not return image data');
      }

      console.log(
        `[ImageGeneratorService] 🖼️ Gemini Image Ready (${(
          imageBuffer.length / 1024
        ).toFixed(2)} KB)`
      );

      return imageBuffer;
    } catch (error) {
      // Handle Rate Limit (429) specifically
      if (error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('[ImageGeneratorService] ⚠️ Gemini API quota exceeded (Free Tier limit). Switching to fallback image generator...');
      } else {
        console.error('[ImageGeneratorService] Gemini generation failed:', error.message);
      }

      return this.generateImageWithPollinations(enriched);
    }
  }

  /**
   * Fallback: Pollinations
   */
  async generateImageWithPollinations(prompt) {
    try {
      console.log('[ImageGeneratorService] Pollinations fallback...');

      const encodedPrompt = encodeURIComponent(
        `${prompt}, infographic, clean UI, canvas style, 1024x1024`
      );

      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&enhance=true`;

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // Increased to 60 seconds
      });

      return Buffer.from(response.data);
    } catch (err) {
      console.error('[ImageGeneratorService] Pollinations fallback failed:', err.message);
      console.log('[ImageGeneratorService] Using placeholder image as last resort...');
      return this.generatePlaceholderImage();
    }
  }

  async generatePlaceholderImage() {
    try {
      const response = await axios.get(
        'https://placehold.co/1080x1080/667eea/ffffff.png?text=AI+Generated+Post',
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[ImageGeneratorService] Placeholder failed, creating local buffer:', error.message);
      // Absolute last resort: Create a 1x1 pixel transparent GIF buffer or similar minimal valid image
      // This is a 1x1 pixel PNG
      const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      return minimalPng;
    }
  }

  /**
   * Save file
   */
  async saveImageToTemp(imageBuffer, filename = 'generated.jpg') {
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const filepath = path.join(tempDir, filename);
    await fs.writeFile(filepath, imageBuffer);
    return filepath;
  }
}

module.exports = ImageGeneratorService;
