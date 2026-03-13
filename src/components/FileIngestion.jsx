// src/components/FileIngestion.jsx — Stride Adaptive
// Drag-and-drop + local file picker zone with PDF/DOCX/TXT support

import React, { useRef, useState } from 'react';
import { parseFile } from '../utils/fileParser';

const ACCEPT = '.pdf,.docx,.txt,.md';
const MAX_SIZE_MB = 20;

export function FileIngestion({ onTextExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState(null); // null | 'processing' | 'done' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef();

  const processFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus('error');
      setStatusMsg(`File too large. Max size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','txt','md'].includes(ext)) {
      setStatus('error');
      setStatusMsg(`Unsupported format. Please upload PDF, DOCX, or TXT.`);
      return;
    }

    setStatus('processing');
    setProgress(10);
    setStatusMsg(`Reading ${file.name}…`);

    // Animate progress bar while parsing
    const ticker = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 220);

    try {
      const { text, pageCount } = await parseFile(file);
      clearInterval(ticker);
      setProgress(100);

      if (!text || text.length < 20) {
        setStatus('error');
        setStatusMsg('Could not extract readable text from this file.');
        return;
      }

      const pageInfo = pageCount ? ` (${pageCount} pages)` : '';
      setStatus('done');
      setStatusMsg(`✓ Extracted from ${file.name}${pageInfo} — ${text.length.toLocaleString()} characters`);
      onTextExtracted(text, ext === 'pdf');
    } catch (err) {
      clearInterval(ticker);
      setStatus('error');
      setStatusMsg(err.message || 'Failed to parse file.');
    }
  };

  // Drag events
  const onDragOver = e => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = e => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const onFileChange = e => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ''; // allow re-upload of same file
  };

  const zone = {
    border: `2px dashed ${isDragging ? 'var(--bs-primary)' : 'var(--border-color)'}`,
    borderRadius: '14px',
    padding: '1.5rem 1rem',
    textAlign: 'center',
    cursor: 'pointer',
    background: isDragging ? 'rgba(124,111,238,0.08)' : 'var(--surface-2)',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Drop Zone */}
      <div
        style={zone}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload a file"
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {isDragging ? '📂' : '📄'}
        </div>
        <div style={{ color: '#e8eaf0', fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
          {isDragging ? 'Drop to upload' : 'Drag & drop a file'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          PDF, DOCX, TXT — up to {MAX_SIZE_MB} MB
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <span style={{ background: 'rgba(124,111,238,0.15)', color: '#7c6fee', border: '1px solid rgba(124,111,238,0.3)', borderRadius: '20px', padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 500 }}>
            Browse files
          </span>
        </div>
      </div>

      {/* Status bar */}
      {status === 'processing' && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{statusMsg}</span>
            <span style={{ color: '#7c6fee', fontSize: '0.8rem' }}>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7c6fee, #56cfb2)', borderRadius: '3px', transition: 'width 0.25s ease' }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(86,207,178,0.1)', border: '1px solid rgba(86,207,178,0.25)', borderRadius: '8px', color: '#56cfb2', fontSize: '0.8rem' }}>
          {statusMsg}
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '8px', color: '#ff9999', fontSize: '0.8rem' }}>
          ⚠ {statusMsg}
        </div>
      )}
    </div>
  );
}
