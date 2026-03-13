// src/api/transform.js
// Integrates with Gemini 1.5 Flash using the specified JSON schema

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function getApiKey() {
  return localStorage.getItem('stride_gemini_key') || '';
}

async function callGemini(userPrompt, systemInstruction, maxTokens = 1500) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.3,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json' // Force JSON structure
    }
  };

  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errObj = await response.json().catch(() => ({}));
    if (response.status === 403) throw new Error('INVALID_API_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(errObj.error?.message || 'API_ERROR');
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('EMPTY_RESPONSE');
  
  return rawText.trim();
}

/**
 * fetchTransformData(text)
 * Implements the "Text-to-Flashcards & Simplification" prompt
 */
export async function fetchTransformData(textPrompt) {
  const systemInstruction = `You are an expert Educational Content Designer specializing in Universal Design for Learning (UDL) and Neurodiversity.
Tone: Encouraging, clear, and jargon-free.
Simplification: Use "Plain Language" principles (short sentences, active voice, no double negatives).
Output ONLY valid JSON. No conversational filler.`;

  const userPrompt = `Analyze the following text and provide a response in JSON format.

TEXT TO ANALYZE:
"${textPrompt}"

OUTPUT REQUIREMENTS MUST MATCH THIS JSON SCHEMA EXACTLY:
{
  "simplified_text": "A summary (max 4 sentences) using 5th-grade vocabulary. Avoid dense blocks; format with natural breaks.",
  "key_terms": [
    { "term": "...", "simple_definition": "..." } // Exactly 5 objects
  ],
  "flashcards": [
    { "question": "...", "answer": "..." } // Exactly 3 cards
  ],
  "engagement_tip": "A short advice for a student with ADHD to stay focused on this specific topic."
}`;

  const rawJson = await callGemini(userPrompt, systemInstruction);
  
  try {
    return JSON.parse(rawJson);
  } catch (err) {
    throw new Error('PARSE_ERROR: The AI response was not valid JSON.');
  }
}

/**
 * fetchMindMapCode(topic)
 * Implements the "Concept-to-Mind-Map" prompt
 */
export async function fetchMindMapCode(topic) {
  const systemInstruction = `You are an expert Educational Content Designer. Output ONLY the raw Mermaid diagram code. No markdown fences.`;

  // We temporarily disable JSON forced mode for this specific call
  // because Mermaid is not JSON.
  const userPrompt = `Create a Mermaid.js mindmap for the topic: "${topic}".

REQUIREMENTS:
1. Use the 'mindmap' diagram type.
2. Root node format: root((Topic Name))
3. Include 3 main branches representing core sub-concepts.
4. Use clear, concise labels (1-2 words).
5. Ensure there are no special characters like quotes or semicolons that break Mermaid syntax.

EXAMPLE OUTPUT:
mindmap
  root((Photosynthesis))
    Sunlight
      Energy
    Water
      Roots
    Carbon Dioxide
      Leaves`;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
  };

  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error('API_ERROR');

  const data = await response.json();
  let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean up any accidental markdown blocks
  rawText = rawText.replace(/```mermaid\s*/gi, '').replace(/```\s*/g, '').trim();
  
  if (!rawText.startsWith('mindmap')) {
     throw new Error('PARSE_ERROR: Missing mindmap keyword in AI output.');
  }

  return rawText;
}
