/**
 * ai-engine.js — Gemini 1.5 Flash Integration
 * Handles: Flashcards, Mind Maps, ELI5 Simplification, Q&A Feedback
 */

const AI_ENGINE = (() => {
  const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  const SYSTEM_INSTRUCTIONS = `You are NeuroGuide, an educational AI designed for neuro-inclusive learning.
Always follow these rules:
1. Use plain, direct language (reading level: Grade 6 or below).
2. Avoid metaphors, sarcasm, or implied meaning.
3. Structure all information with clear numbered or bulleted lists.
4. Never write walls of text — max 3 sentences per paragraph.
5. When returning JSON, return ONLY valid JSON. No markdown fences, no preamble, no commentary.
6. Be warm, encouraging, and patient in tone.`;

  function getApiKey() {
    return localStorage.getItem('stride_gemini_key') || '';
  }

  async function callGemini(userPrompt, options = {}) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTIONS }]
      },
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        topK: options.topK ?? 32,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxTokens ?? 1024,
        candidateCount: 1
      }
    };

    const url = `${GEMINI_API_BASE}?key=${apiKey}`;
    let response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      throw new Error('NETWORK_ERROR');
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.error?.message || response.statusText;
      if (response.status === 400) throw new Error('INVALID_REQUEST: ' + msg);
      if (response.status === 403) throw new Error('INVALID_API_KEY');
      if (response.status === 429) throw new Error('RATE_LIMIT');
      throw new Error('API_ERROR: ' + msg);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('EMPTY_RESPONSE');
    return rawText.trim();
  }

  /**
   * generateFlashcards(text)
   * Returns: Array of { front: string, back: string }
   */
  async function generateFlashcards(text) {
    const prompt = `Convert the following educational text into a JSON array of flashcards.
Each flashcard must have exactly two keys:
- "front": a question (max 15 words)
- "back": the answer (max 30 words, plain language)

Generate 5 to 8 flashcards. Return ONLY the JSON array. No markdown, no explanation.

TEXT:
${text}`;

    let raw = await callGemini(prompt, { temperature: 0.3, maxTokens: 800 });

    // Strip any accidental markdown fences
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      return parsed.map(card => ({
        front: String(card.front || '').trim(),
        back: String(card.back || '').trim()
      })).filter(c => c.front && c.back);
    } catch (e) {
      throw new Error('PARSE_ERROR: Flashcard JSON was malformed. Raw: ' + raw.slice(0, 200));
    }
  }

  /**
   * generateMindMap(topic)
   * Returns: Raw Mermaid mindmap code string
   */
  async function generateMindMap(topic) {
    const prompt = `Generate a Mermaid.js mind map diagram for the topic: "${topic}".

Rules:
- Use "mindmap" as the diagram type (first line must be exactly: mindmap)
- The root node uses double parentheses: root((Topic))
- Max 2 levels: root → branches → leaves
- 4 to 6 branches maximum
- Short labels only (max 4 words per node)
- Return ONLY the raw Mermaid code. No markdown fences, no explanation, no extra text.

Example format:
mindmap
  root((Photosynthesis))
    Inputs
      Sunlight
      Water
      CO2
    Outputs
      Glucose
      Oxygen`;

    let raw = await callGemini(prompt, { temperature: 0.2, maxTokens: 400 });

    // Strip markdown fences if model adds them
    raw = raw.replace(/```mermaid\s*/gi, '').replace(/```\s*/g, '').trim();

    if (!raw.startsWith('mindmap')) {
      // Try to extract mindmap block
      const match = raw.match(/mindmap[\s\S]+/);
      if (match) return match[0].trim();
      throw new Error('MERMAID_PARSE_FAIL: Response did not start with "mindmap"');
    }

    return raw;
  }

  /**
   * simplifyText(text)
   * Returns: Plain, simplified paragraph string
   */
  async function simplifyText(text) {
    const prompt = `Explain this to a curious 10-year-old using MAXIMUM 4 sentences and ZERO technical jargon.
Use a real-world analogy from everyday life (food, sports, nature, or technology they'd know).
Write in second person ("you" / "your").
Return only the explanation — no headings, no lists, just friendly plain text.

TEXT:
${text}`;

    return await callGemini(prompt, { temperature: 0.5, maxTokens: 300 });
  }

  /**
   * getFeedback(question, correctAnswer, studentAnswer)
   * Returns: { isCorrect: boolean, encouragement: string, correction: string }
   */
  async function getFeedback(question, correctAnswer, studentAnswer) {
    const prompt = `A student answered a learning question. Evaluate their answer and give warm, encouraging feedback.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentAnswer}

Return ONLY a JSON object with exactly three keys:
- "isCorrect": boolean (true if substantially correct, false otherwise)  
- "encouragement": string (1 sentence, warm and specific, mention what they got right)
- "correction": string (1 sentence explaining the correct concept simply; empty string "" if isCorrect is true)

No markdown, no extra text. Just the JSON object.`;

    let raw = await callGemini(prompt, { temperature: 0.3, maxTokens: 200 });
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      const parsed = JSON.parse(raw);
      return {
        isCorrect: Boolean(parsed.isCorrect),
        encouragement: String(parsed.encouragement || '').trim(),
        correction: String(parsed.correction || '').trim()
      };
    } catch (e) {
      return {
        isCorrect: false,
        encouragement: 'Good try! Keep going.',
        correction: `The correct answer is: ${correctAnswer}`
      };
    }
  }

  /**
   * Friendly error messages for display (Error Forgiveness)
   */
  function getErrorDetails(error) {
    const msg = error.message || '';
    if (msg === 'NO_API_KEY') return {
      title: 'No API key found',
      cause: 'A Gemini API key is needed to use AI features.',
      steps: ['Click the ⚙ Settings button in the top bar', 'Paste your Gemini API key in the "API Key" field', 'Click Save, then try again'],
      reassure: 'Your key is stored only in this browser — never shared.'
    };
    if (msg === 'INVALID_API_KEY' || msg.includes('403')) return {
      title: 'API key not accepted',
      cause: 'The key saved appears to be invalid or expired.',
      steps: ['Go to Settings and check your API key', 'Make sure you copied the full key from Google AI Studio', 'Save it again and retry'],
      reassure: 'This is easy to fix — just double-check the key.'
    };
    if (msg === 'RATE_LIMIT') return {
      title: 'Too many requests',
      cause: 'The API rate limit was reached. This is temporary.',
      steps: ['Wait 30 seconds, then try again', 'If it continues, reduce the amount of text you paste'],
      reassure: 'This will resolve on its own shortly.'
    };
    if (msg === 'NETWORK_ERROR') return {
      title: 'Could not reach the AI',
      cause: 'Your internet connection may be offline.',
      steps: ['Check your internet connection', 'Refresh the page and try again'],
      reassure: 'Your work here is not lost.'
    };
    if (msg.startsWith('PARSE_ERROR')) return {
      title: 'Couldn\'t format the content',
      cause: 'The AI returned content in an unexpected format.',
      steps: ['Click "Try Again"', 'If it fails again, try with shorter text (under 400 words)', 'Switch to "Simplify" mode instead'],
      reassure: 'This is a rare hiccup — not your fault.'
    };
    return {
      title: 'Something went wrong',
      cause: 'An unexpected error occurred.',
      steps: ['Refresh the page and try again', 'Check your API key in Settings'],
      reassure: 'If the problem persists, try a different browser.'
    };
  }

  return { generateFlashcards, generateMindMap, simplifyText, getFeedback, getErrorDetails, getApiKey };
})();
