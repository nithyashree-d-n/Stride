// src/utils/fileParser.js — Stride Adaptive
// Client-side extraction: PDF (pdfjs-dist) + DOCX (mammoth) + plain text

/**
 * parseFile(file) → { text: string, pageCount: number|null }
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt' || ext === 'md') {
    const text = await file.text();
    return { text: text.trim(), pageCount: null };
  }

  if (ext === 'pdf') {
    return parsePDF(file);
  }

  if (ext === 'docx') {
    return parseDOCX(file);
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload PDF, DOCX, or TXT.`);
}

// ── PDF ───────────────────────────────────────────────────
async function parsePDF(file) {
  // Dynamically import pdfjs to avoid SSR issues and keep bundle lean
  const pdfjsLib = await import('pdfjs-dist');

  // pdfjs needs a worker — use the CDN worker for simplicity
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const textParts = [];

  for (let pageNum = 1; pageNum <= Math.min(totalPages, 30); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) textParts.push(pageText);
  }

  // Clean common PDF noise: standalone page numbers, headers, footers
  const raw = textParts.join('\n\n');
  const cleaned = cleanPdfNoise(raw);

  return { text: cleaned, pageCount: totalPages };
}

// ── DOCX ──────────────────────────────────────────────────
async function parseDOCX(file) {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.replace(/\s+/g, ' ').trim();
  return { text, pageCount: null };
}

// ── PDF Noise Cleaner ─────────────────────────────────────
function cleanPdfNoise(text) {
  return text
    // Standalone page numbers: "Page 3 of 10" / "- 3 -" / lone digits on a line
    .replace(/^Page\s+\d+\s+of\s+\d+/gim, '')
    .replace(/^[-–]\s*\d+\s*[-–]$/gm, '')
    .replace(/^\d+\s*$/gm, '')
    // Repetitive short headers (3 words or fewer repeated 3+ times)
    .replace(/(.{1,40})\n(?:\1\n){2,}/g, '$1\n')
    // Multiple blank lines → double newline
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
