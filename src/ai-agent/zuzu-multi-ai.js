// packages/backend/src/ai-agent/zuzu-multi-ai.js
export class ZuzuMultiAI {
  constructor(env) {
    this.env = env;
    this.name = "ဇူဇူ";
    this.master = "ဆရာသီ";
    this.availableAIs = [];
    
    // Check available APIs
    if (env.OPENAI_API_KEY) this.availableAIs.push('openai');
    if (env.GEMINI_API_KEY) this.availableAIs.push('gemini');
    if (env.ANTHROPIC_API_KEY) this.availableAIs.push('claude');
    this.availableAIs.push('cloudflare'); // Always available
  }

  async chat(request) {
    try {
      const { message, aiType = 'auto', taskType = 'general' } = await request.json();

      // Select AI
      const selectedAI = await this.selectAI(aiType, taskType);
      
      // Get response
      let response;
      switch(selectedAI) {
        case 'openai':
          response = await this.callOpenAI(message);
          break;
        case 'gemini':
          response = await this.callGemini(message);
          break;
        case 'claude':
          response = await this.callClaude(message);
          break;
        default:
          response = await this.callCloudflareAI(message);
      }

      return {
        success: true,
        from: this.name,
        to: this.master,
        aiUsed: selectedAI,
        message: response,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: "ဆရာသီ... ဇူဇူ အလုပ်မလုပ်ဘူးကွ။ နည်းနည်းနေပြီးမှ ပြန်မေးပါဦး။"
      };
    }
  }

  async selectAI(aiType, taskType) {
    if (aiType !== 'auto') return aiType;

    // Auto select based on task
    const taskMap = {
      'creative': 'claude',
      'code': 'openai',
      'analysis': 'gemini',
      'simple': 'cloudflare',
      'post': 'claude',
      'promo': 'openai',
      'reminder': 'cloudflare'
    };

    return taskMap[taskType] || 'cloudflare';
  }

  async callOpenAI(message) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are Zuzu, an AI assistant for "ဆရာသီ". Respond in Burmese.' },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async callGemini(message) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Zuzu, assistant for "ဆရာသီ". Respond in Burmese: ${message}`
          }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async callClaude(message) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are Zuzu, assistant for "ဆရာသီ". Respond in Burmese: ${message}`
        }]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  }

  async callCloudflareAI(message) {
    const systemPrompt = `
      You are Zuzu, an AI assistant created for "ဆရာသီ".
      You are playful, helpful, and always respectful to your master "ဆရာသီ".
      Respond in Burmese language with a friendly tone.
    `;

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-2-7b-chat-int8`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    const result = await response.json();
    return result.result?.response || 'ဆရာသီ... ဇူဇူ နားမလည်ဘူးကွ။';
  }

  async getAvailableAIs() {
    return {
      success: true,
      ais: this.availableAIs.map(ai => ({
        id: ai,
        name: this.getAIName(ai),
        available: true
      }))
    };
  }

  getAIName(ai) {
    const names = {
      'openai': 'ChatGPT',
      'gemini': 'Google Gemini',
      'claude': 'Anthropic Claude',
      'cloudflare': 'Cloudflare AI'
    };
    return names[ai] || ai;
  }
}