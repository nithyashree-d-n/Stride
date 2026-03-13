// src/api/transform.js — Stride Adaptive
// Gemini 1.5 Flash integration with robust error handling, retries, and sanitization

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export function getApiKey() {
  // Use Vite environment variable instead of localStorage
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

function sanitizeInput(text) {
  // Remove non-printable characters and ensure valid UTF-8 by replacing replacement characters if any
  return text
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/g, '') // Keep typical printable + unicode
    .replace(/\uFFFD/g, '') // Remove replacement char
    .trim();
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ── Core fetch wrapper with Retry ──────────────────────────────────────────────
async function callGemini(userPrompt, systemInstruction, { maxTokens = 2000, forceJson = false } = {}, retries = 1) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const generationConfig = {
    temperature: 0.3,
    topK: 32,
    topP: 0.95,
    maxOutputTokens: maxTokens,
  };
  if (forceJson) generationConfig.responseMimeType = 'application/json';

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig,
  };

  try {
    const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errObj = await response.json().catch(() => ({}));
      if (response.status === 400) throw new Error(`BAD_REQUEST`);
      if (response.status === 403) throw new Error('INVALID_API_KEY');
      if (response.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(errObj.error?.message || 'API_ERROR');
    }

    const data = await response.json();

    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') throw new Error('SAFETY_BLOCK');
    if (finishReason === 'MAX_TOKENS') {
      console.warn('[Stride] Max tokens hit, response may be truncated');
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('EMPTY_RESPONSE');

    return rawText.trim();
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Stride] API call failed (${error.message}). Retrying in 1 second...`);
      await delay(1000); // 1 second backoff
      return callGemini(userPrompt, systemInstruction, { maxTokens, forceJson }, retries - 1);
    }
    // Transform specific errors into neuro-friendly messages
    throw new Error("Stride is taking a deep breath... Let's try that again in a second.");
  }
}

// ── Helper: extract JSON from text that may have markdown fences ──────────────
function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenced ? fenced[1] : raw;
  return JSON.parse(jsonStr);
}

// ── Main transform ─────────────────────────────────────────────────────────────
export async function fetchTransformData(textPrompt, isPdf = false) {
  const pdfNote = isPdf
    ? 'The input is from a PDF. Ignore page numbers, citations, and repetitive headers. Produce a continuous learning narrative.'
    : '';

  const systemInstruction = `You are an expert Educational Content Designer specialising in Universal Design for Learning (UDL) and Neurodiversity.
Tone: Encouraging, clear, and jargon-free.
Use Plain Language: short sentences, active voice, no double negatives.
${pdfNote}
CRITICAL: Output ONLY a valid JSON object — no extra text, no markdown fences, no code block delimiters.`;

  const sanitizedText = sanitizeInput(textPrompt);

  const userPrompt = `Analyse this text and return a JSON object with EXACTLY these four keys:

TEXT:
"""
${sanitizedText}
"""

REQUIRED JSON FORMAT (return this exactly, filling in the values):
{
  "simplified_text": "A 3-4 sentence summary using 5th-grade vocabulary.",
  "key_terms": [
    { "term": "First term", "simple_definition": "Its plain-language meaning." },
    { "term": "Second term", "simple_definition": "Its plain-language meaning." },
    { "term": "Third term", "simple_definition": "Its plain-language meaning." },
    { "term": "Fourth term", "simple_definition": "Its plain-language meaning." },
    { "term": "Fifth term", "simple_definition": "Its plain-language meaning." }
  ],
  "flashcards": [
    { "question": "Question 1?", "answer": "Answer 1." },
    { "question": "Question 2?", "answer": "Answer 2." },
    { "question": "Question 3?", "answer": "Answer 3." }
  ],
  "engagement_tip": "One concrete tip for a student with ADHD to stay focused on this topic."
}`;

  const raw = await callGemini(userPrompt, systemInstruction, { maxTokens: 2000 });

  try {
    return extractJson(raw);
  } catch (parseErr) {
    console.error('[Stride] JSON parse failed. Raw response:', raw);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_) { }
    }
    throw new Error("Stride is taking a deep breath... Let's try that again in a second.");
  }
}

// ── Mind map ──────────────────────────────────────────────────────────────────
export async function fetchMindMapCode(topic) {
  const systemInstruction = `You are an expert Educational Content Designer. Output ONLY raw Mermaid diagram code. No markdown fences, no backticks, no explanation.`;

  const sanitizedTopic = sanitizeInput(topic);

  const userPrompt = `Create a Mermaid.js mindmap for: "${sanitizedTopic}".
Rules:
- Start with: mindmap
- Root: root((Topic Name))
- 3 main branches with 2 sub-nodes each
- Labels max 3 words, no special characters or quotes

Example:
mindmap
  root((Photosynthesis))
    Sunlight
      Energy Source
      Chlorophyll
    Water
      Root Absorption
      Transport
    Carbon Dioxide
      Atmosphere
      Stomata`;

  const raw = await callGemini(userPrompt, systemInstruction, { maxTokens: 600 });
  const cleaned = raw.replace(/```(?:mermaid)?\s*/gi, '').replace(/```\s*/g, '').trim();
  if (!cleaned.startsWith('mindmap')) throw new Error("Stride is taking a deep breath... Let's try that again in a second.");
  return cleaned;
}
