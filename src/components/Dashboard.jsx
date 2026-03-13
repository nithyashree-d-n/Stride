// src/components/Dashboard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { fetchTransformData, fetchMindMapCode } from '../api/transform';
import { FlashcardSet } from './FlashcardSet';
import { MermaidMap } from './MermaidMap';
import { KeyTerms } from './KeyTerms';

// ── API Key Modal ────────────────────────────────────────
function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState(localStorage.getItem('stride_gemini_key') || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('AIza')) {
      setError('Key should start with "AIza". Check and try again.');
      return;
    }
    localStorage.setItem('stride_gemini_key', trimmed);
    onSave(trimmed);
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title text-white d-flex align-items-center gap-2">
              <i className="bi bi-key-fill text-primary"></i> Gemini API Key Required
            </h5>
          </div>
          <div className="modal-body pt-2">
            <p className="text-secondary small mb-3">
              Stride uses Gemini 1.5 Flash to transform content. Your key is stored only on this device — never sent to any server.
            </p>
            <p className="text-secondary small mb-3">
              Get your free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary">
                aistudio.google.com
              </a>
            </p>
            <input
              type="password"
              className="form-control text-white border-secondary mb-2"
              style={{ background: 'var(--surface-1)' }}
              placeholder="AIza..."
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            {error && <div className="text-danger small">{error}</div>}
          </div>
          <div className="modal-footer border-0 pt-0">
            <button className="btn btn-primary px-4 rounded-pill" onClick={handleSave}>
              <i className="bi bi-check2 me-2"></i> Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main Dashboard ───────────────────────────────────────
export function Dashboard({ uiState }) {
  const { comfortTags, isFocusMode, setIsFocusMode, clearProfile } = uiState;

  // Controlled API key state — source of truth
  const [apiKey, setApiKey]     = useState(localStorage.getItem('stride_gemini_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(!localStorage.getItem('stride_gemini_key'));

  const [inputText, setInputText]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [aiData, setAiData]         = useState(null);
  const [mindmapCode, setMindmapCode] = useState(null);
  const [activeTab, setActiveTab]   = useState('text');

  // Pomodoro
  const [focusTimer, setFocusTimer]   = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRunning && focusTimer > 0) {
      timerRef.current = setInterval(() => setFocusTimer(f => f - 1), 1000);
      setIsFocusMode(true);
    } else {
      clearInterval(timerRef.current);
      if (!timerRunning) setIsFocusMode(false);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const handleSaveKey = (key) => {
    setApiKey(key);
    setShowKeyModal(false);
  };

  const handleTransform = async () => {
    if (!inputText.trim()) return;

    // Always read the freshest key from localStorage (controlled state sync)
    const currentKey = localStorage.getItem('stride_gemini_key') || '';
    if (!currentKey) {
      setShowKeyModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransformData(inputText);
      setAiData(data);
      const topic = inputText.split(/[.!?]/)[0].slice(0, 50).trim() || 'Concept Map';
      try {
        const code = await fetchMindMapCode(topic);
        setMindmapCode(code);
      } catch (_) {}
      setActiveTab('text');
    } catch (err) {
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
        setError(null);
        setShowKeyModal(true);
      } else {
        setError('Transformation failed. Make sure your text is at least a sentence long and retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'text',  label: 'Summary',    icon: 'bi-file-text' },
    { id: 'vocab', label: 'Key Terms',  icon: 'bi-bookmark' },
    { id: 'cards', label: 'Flashcards', icon: 'bi-card-text' },
    { id: 'map',   label: 'Mind Map',   icon: 'bi-diagram-3' },
  ];

  return (
    <>
      {showKeyModal && <ApiKeyModal onSave={handleSaveKey} />}

      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh', overflow: 'hidden' }}>

        {/* ── TOP NAV ────── */}
        <nav style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', padding: '0.6rem 1.25rem' }}
             className="d-flex align-items-center justify-content-between gap-3">
          <span style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>
            ⬡ Stride <span style={{ color: 'var(--bs-secondary)', fontWeight: 400 }}>Adaptive</span>
          </span>

          <div className="d-flex align-items-center gap-2 ms-auto">
            {/* Status badge for API key */}
            <button
              className="btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3"
              style={{
                background: apiKey ? 'rgba(86,207,178,0.12)' : 'rgba(255,90,90,0.12)',
                color: apiKey ? '#56cfb2' : '#ff7777',
                border: `1px solid ${apiKey ? 'rgba(86,207,178,0.3)' : 'rgba(255,90,90,0.3)'}`,
                fontSize: '0.8rem', fontWeight: 500
              }}
              onClick={() => setShowKeyModal(true)}
            >
              <i className={`bi ${apiKey ? 'bi-key-fill' : 'bi-key'}`}></i>
              {apiKey ? 'API Key Set' : 'Add API Key'}
            </button>

            <button
              className="btn btn-sm rounded-pill px-3"
              style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
              onClick={clearProfile}
            >
              <i className="bi bi-person-gear me-1"></i> Profile
            </button>
          </div>
        </nav>

        {/* ── CONTENT GRID ────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden' }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderRight: '1px solid var(--border-color)', overflowY: 'auto', background: 'var(--surface-1)' }}>

            {/* Input Area */}
            <div style={{ padding: '1.25rem', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-pencil-square text-primary"></i>
                <span style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 500, color: '#e8eaf0', fontSize: '0.95rem' }}>Input Material</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                Paste complex text. Stride will simplify it for your learning style.
              </p>
              <textarea
                style={{
                  flex: '1 1 auto', minHeight: '280px', resize: 'none',
                  background: 'var(--surface-2)', color: '#e8eaf0',
                  border: '1px solid var(--border-color)', borderRadius: '12px',
                  padding: '0.85rem', fontSize: '0.92rem',
                  lineHeight: '1.7', outline: 'none', fontFamily: 'inherit',
                  marginBottom: '1rem'
                }}
                placeholder="Paste your educational content here…"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
              <button
                className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 rounded-pill"
                onClick={handleTransform}
                disabled={loading || !inputText.trim()}
                style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 600 }}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm" role="status"></span> Processing…</>
                  : <><i className="bi bi-magic"></i> Transform Content</>
                }
              </button>
              {error && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.25)', borderRadius: '10px', color: '#ff9999', fontSize: '0.85rem' }}>
                  <i className="bi bi-exclamation-triangle me-2"></i>{error}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            {/* Pomodoro */}
            {comfortTags.includes('adhd') && (
              <div style={{ padding: '1.25rem' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-lightning-charge text-secondary"></i>
                  <span style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 500, color: '#e8eaf0', fontSize: '0.95rem' }}>Focus Session</span>
                  {isFocusMode && <span style={{ marginLeft: 'auto', color: '#56cfb2', fontSize: '0.75rem', fontWeight: 500 }}>● Active</span>}
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                  <div style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 700, fontSize: '2.8rem', color: '#fff', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
                    {String(Math.floor(focusTimer / 60)).padStart(2, '0')}:{String(focusTimer % 60).padStart(2, '0')}
                  </div>
                  <button
                    className="btn rounded-pill px-4 mt-2"
                    style={{ background: timerRunning ? 'rgba(255,90,90,0.15)' : 'var(--bs-primary)', color: timerRunning ? '#ff9999' : '#fff', border: timerRunning ? '1px solid rgba(255,90,90,0.3)' : 'none', fontWeight: 500 }}
                    onClick={() => setTimerRunning(!timerRunning)}
                  >
                    <i className={`bi ${timerRunning ? 'bi-pause-fill' : 'bi-play-fill'} me-1`}></i>
                    {timerRunning ? 'Pause' : 'Start Focus'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e1117' }}>

            {/* Tabs Header */}
            <div style={{ borderBottom: '1px solid var(--border-color)', padding: '0 1.5rem', background: 'var(--surface-1)', display: 'flex', alignItems: 'center', gap: '0.25rem', minHeight: '54px' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!aiData}
                  style={{
                    background: activeTab === tab.id && aiData ? 'var(--bs-primary)' : 'transparent',
                    color: activeTab === tab.id && aiData ? '#fff' : aiData ? 'var(--text-muted)' : 'var(--border-color)',
                    border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem',
                    fontSize: '0.85rem', fontFamily: 'Lexend, sans-serif', fontWeight: 500,
                    cursor: aiData ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className={`bi ${tab.icon}`}></i> {tab.label}
                </button>
              ))}
            </div>

            {/* Output Content */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '1.75rem 2rem' }}>

              {/* Empty state */}
              {!aiData && !loading && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>
                    <i className="bi bi-stars"></i>
                  </div>
                  <h4 style={{ color: '#9ba1b4', fontFamily: 'Lexend, sans-serif', fontWeight: 500 }}>
                    Your Learning Space
                  </h4>
                  <p style={{ maxWidth: '360px', fontSize: '0.9rem', lineHeight: '1.7' }}>
                    Paste any complex educational text on the left and click <strong style={{ color: '#7c6fee' }}>Transform Content</strong> to get a simplified summary, flashcards, key terms, and a visual mind map.
                  </p>
                  {!apiKey && (
                    <button className="btn btn-sm mt-3 rounded-pill px-4"
                      style={{ background: 'rgba(124,111,238,0.15)', color: '#7c6fee', border: '1px solid rgba(124,111,238,0.3)', fontWeight: 500 }}
                      onClick={() => setShowKeyModal(true)}>
                      <i className="bi bi-key me-2"></i> Add API Key First
                    </button>
                  )}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#7c6fee' }}>
                  <div style={{ width: '56px', height: '56px', border: '4px solid rgba(124,111,238,0.2)', borderTopColor: '#7c6fee', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: '1.25rem' }}></div>
                  <p style={{ fontFamily: 'Lexend, sans-serif', fontWeight: 500, color: '#e8eaf0' }}>Rewriting for your brain…</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Simplifying language, building flashcards, drawing mind map…</p>
                </div>
              )}

              {/* Results */}
              {aiData && !loading && (
                <div>
                  {/* ADHD tip banner */}
                  {aiData.engagement_tip && comfortTags.includes('adhd') && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.2)', borderLeft: '4px solid #ff8c42', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <i className="bi bi-lightbulb-fill" style={{ color: '#ff8c42', fontSize: '1.1rem', marginTop: '2px' }}></i>
                      <div>
                        <div style={{ fontWeight: 600, color: '#ff8c42', fontSize: '0.85rem', marginBottom: '0.2rem' }}>FOCUS TIP</div>
                        <div style={{ color: '#e8eaf0', fontSize: '0.9rem', lineHeight: '1.6' }}>{aiData.engagement_tip}</div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'text' && (
                    <div>
                      <h3 style={{ fontFamily: 'Lexend, sans-serif', color: '#e8eaf0', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1.3rem' }}>
                        Simplified Summary
                      </h3>
                      {aiData.simplified_text.split('\n').filter(p => p.trim()).map((p, i) => (
                        <p key={i} style={{ color: '#d4d8e8', fontSize: '1.05rem', lineHeight: '1.85', marginBottom: '1rem' }}>{p}</p>
                      ))}
                    </div>
                  )}

                  {activeTab === 'vocab' && <KeyTerms terms={aiData.key_terms} />}
                  {activeTab === 'cards' && <FlashcardSet flashcards={aiData.flashcards} />}
                  {activeTab === 'map' && <MermaidMap chartCode={mindmapCode} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
