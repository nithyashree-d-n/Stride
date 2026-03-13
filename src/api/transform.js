// src/api/transform.js — Stride Adaptive
// Production-safe serverless proxy architecture — no client-side API keys.

const STRIDE_PROXY_ENDPOINT = '/api/stride-ai';

/**
 * Sanitizes input to prevent malformed request payloads.
 * Strips non-printable characters, replacement chars, and collapses whitespace.
 */
function sanitizeInput(text) {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps HTTP status codes from the proxy to neuro-friendly, encouraging messages.
 */
function mapProxyError(status) {
  if (status === 401 || status === 403) {
    return "Stride isn't authorised to connect right now. A quick settings check should sort it out!";
  }
  if (status === 429) {
    return "Stride is taking a quick break to organize its thoughts. Give it a few seconds and try again — you're doing great!";
  }
  if (status === 502 || status === 504) {
    return "The learning gateway is a little slow right now. Hang tight — Stride will be with you in a moment.";
  }
  return `Stride hit an unexpected snag (${status}). Let's try once more.`;
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ── Core Proxy Wrapper ────────────────────────────────────────────────────────
/**
 * Calls the internal Stride AI serverless proxy endpoint.
 * No API keys are sent from the client — authentication lives on the server.
 *
 * @param {string} userPrompt      - The user-facing instruction/content.
 * @param {string} systemInstruction - System-level persona/rules for the AI.
 * @param {Object} opts            - { maxTokens, forceJson }
 * @param {number} retries         - Remaining automatic retry attempts.
 */
async function callStrideProxy(
  userPrompt,
  systemInstruction,
  { maxTokens = 2000, forceJson = false } = {},
  retries = 2
) {
  const payload = {
    userPrompt,
    systemInstruction,
    maxTokens,
    forceJson,
  };

  try {
    const response = await fetch(STRIDE_PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No Authorization header — credentials stay on the server side.
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(mapProxyError(response.status));
    }

    // Null-safe extraction of JSON body
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Stride received an unreadable reply from the learning gateway. Let's try once more.");
    }

    // Strict null / undefined guard on the expected text field
    const rawText = data?.text ?? data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

    if (rawText === null || rawText === undefined || rawText === '') {
      throw new Error('Stride received an empty response. Please try again.');
    }

    return typeof rawText === 'string' ? rawText.trim() : String(rawText).trim();

  } catch (error) {
    if (retries > 0) {
      console.warn(`[Stride] Proxy call failed — retrying (${retries} left):`, error.message);
      await delay(1500 * (3 - retries)); // progressive back-off: 1.5s, 3s
      return callStrideProxy(userPrompt, systemInstruction, { maxTokens, forceJson }, retries - 1);
    }
    // Surface the mapped/original message to the caller
    throw new Error(error.message || 'Stride had trouble reaching its learning gateway.');
  }
}

// ── Main Content Transformer ──────────────────────────────────────────────────
/**
 * Fetches simplified text, key terms, flashcards, and an engagement tip.
 * Decoupled from the underlying AI provider — all routing happens in the proxy.
 */
export async function fetchTransformData(textPrompt, isPdf = false) {
  const pdfNote = isPdf
    ? 'The input is from a PDF. Ignore page numbers and citations.'
    : '';

  const systemInstruction = `You are an expert Educational Content Designer for Neurodiversity.
Tone: Encouraging and jargon-free.
Rules: Use Plain Language. High clarity.
${pdfNote}
Output MUST be a valid JSON object.`;

  const sanitizedText = sanitizeInput(textPrompt);

  const userPrompt = `Analyse this text and return a JSON object with these keys: 
  "simplified_text", "key_terms", "flashcards", "engagement_tip".
  
  TEXT:
  """
  ${sanitizedText.substring(0, 10000)}
  """`;

  const raw = await callStrideProxy(userPrompt, systemInstruction, {
    maxTokens: 2000,
    forceJson: true,
  });

  // Null-safe JSON parse guard
  if (!raw || typeof raw !== 'string') {
    throw new Error("Stride had trouble organising the data. Let's try once more.");
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Stride] JSON Parse Error:', err);
    throw new Error("Stride had trouble organising the data. Let's try once more.");
  }
}

// ── Mind Map Generator ────────────────────────────────────────────────────────
/**
 * Fetches Mermaid.js mindmap code for a given topic.
 * Decoupled from the underlying AI provider — all routing happens in the proxy.
 */
export async function fetchMindMapCode(topic) {
  const systemInstruction =
    'Output ONLY raw Mermaid.js mindmap code. No explanations, no backticks, no markdown.';

  const userPrompt = `Create a Mermaid.js mindmap for: "${sanitizeInput(topic)}".
  Format:
  mindmap
    root((Topic))
      Branch
        Subnode`;

  const raw = await callStrideProxy(userPrompt, systemInstruction, { maxTokens: 800 });

  if (!raw || typeof raw !== 'string') {
    throw new Error('Stride could not build the mind map. Please try again.');
  }

  return raw
    .replace(/```(?:mermaid)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}