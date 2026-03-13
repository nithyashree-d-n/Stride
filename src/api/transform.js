// src/api/transform.js — Stride Adaptive (Final Production Version)
// Gemini 1.5 Flash integration with Vite Support, JSON enforcement, and Robust Sanitization

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Retrieves the API Key using Vite's naming convention.
 * Variables must be prefixed with VITE_ in the .env file.
 */
export function getApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error('[Stride] API Key missing. Ensure VITE_GEMINI_API_KEY is in your .env');
  }
  return key || '';
}

/**
 * Sanitizes input to prevent "BAD_REQUEST" errors caused by 
 * hidden PDF characters or invalid UTF-8 sequences.
 */
function sanitizeInput(text) {
  return text
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ') // Collapse multiple spaces/newlines
    .trim();
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ── Core API Wrapper ──────────────────────────────────────────────────────────
async function callGemini(userPrompt, systemInstruction, { maxTokens = 2000, forceJson = false } = {}, retries = 2) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const generationConfig = {
    temperature: 0.3,
    topK: 32,
    topP: 0.95,
    maxOutputTokens: maxTokens,
  };

  // Use official JSON mode if requested
  if (forceJson) {
    generationConfig.responseMimeType = 'application/json';
  }

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
      if (response.status === 400) throw new Error('BAD_REQUEST');
      if (response.status === 403) throw new Error('INVALID_API_KEY');
      if (response.status === 429) throw new Error('RATE_LIMIT');
      throw new Error('API_ERROR');
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('EMPTY_RESPONSE');
    return rawText.trim();

  } catch (error) {
    if (retries > 0) {
      console.warn(`[Stride] Retrying API call... (${retries} left)`);
      await delay(1500);
      return callGemini(userPrompt, systemInstruction, { maxTokens, forceJson }, retries - 1);
    }
    throw new Error("Stride is taking a deep breath... Try a smaller section of text.");
  }
}

// ── Main Content Transformer ──────────────────────────────────────────────────
export async function fetchTransformData(textPrompt, isPdf = false) {
  const pdfNote = isPdf
    ? 'The input is from a PDF. Ignore page numbers and citations. Focus on a continuous narrative.'
    : '';

  const systemInstruction = `You are an expert Educational Content Designer for Neurodiversity.
Tone: Encouraging and jargon-free.
Rules: Use Plain Language. High clarity.
${pdfNote}
Output MUST be a valid JSON object.`;

  const sanitizedText = sanitizeInput(textPrompt);

  const userPrompt = `Analyse this text and return a JSON object with these keys: 
  "simplified_text", "key_terms" (array of 5), "flashcards" (array of 3), "engagement_tip".
  
  TEXT:
  """
  ${sanitizedText.substring(0, 12000)}
  """`;

  const raw = await callGemini(userPrompt, systemInstruction, { maxTokens: 2000, forceJson: true });

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Stride] JSON Parse Error:', err);
    throw new Error("Stride had trouble organizing the data. Let's try once more.");
  }
}

// ── Mind Map Generator ────────────────────────────────────────────────────────
export async function fetchMindMapCode(topic) {
  const systemInstruction = "Output ONLY raw Mermaid.js mindmap code. No explanations, no backticks, no markdown.";

  const userPrompt = `Create a Mermaid.js mindmap for: "${sanitizeInput(topic)}".
  Format:
  mindmap
    root((Topic))
      Branch
        Subnode`;

  const raw = await callGemini(userPrompt, systemInstruction, { maxTokens: 800 });

  // Strict cleaning for Mermaid rendering
  return raw
    .replace(/```(?:mermaid)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}