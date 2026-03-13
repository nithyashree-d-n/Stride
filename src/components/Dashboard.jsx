// src/components/Dashboard.jsx — Stride Adaptive
import React, { useState, useRef, useEffect } from 'react';
import { fetchTransformData, fetchMindMapCode } from '../api/transform';
import { useTTS } from '../hooks/useTTS';
import { FlashcardSet } from './FlashcardSet';
import { MermaidMap } from './MermaidMap';
import { KeyTerms } from './KeyTerms';
import { FileIngestion } from './FileIngestion';
import { TTSToolbar, BionicText } from './TTSToolbar';

// ── Line Focus Ruler ──────────────────────────────────────────────────────────
function LineFocusRuler() {
  const [y, setY] = useState(-200);
  useEffect(() => {
    const h = e => setY(e.clientY);
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: y - 28, background: 'rgba(14,17,23,0.55)', pointerEvents: 'none', zIndex: 1000, transition: 'height 0.05s linear' }} />
      <div style={{ position: 'fixed', top: y + 28, left: 0, right: 0, bottom: 0, background: 'rgba(14,17,23,0.55)', pointerEvents: 'none', zIndex: 1000, transition: 'top 0.05s linear' }} />
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function Dashboard({ uiState }) {
  const { comfortTags, isFocusMode, setIsFocusMode, clearProfile } = uiState;
  const tts = useTTS();

  const [inputText, setInputText]   = useState('');
  const [inputMode, setInputMode]   = useState('paste'); // 'paste' | 'upload'
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [aiData, setAiData]         = useState(null);
  const [mindmapCode, setMindmapCode] = useState(null);
  const [activeTab, setActiveTab]   = useState('text');

  // Comfort features
  const [bionicEnabled, setBionicEnabled] = useState(false);
  const [lineFocusEnabled, setLineFocusEnabled] = useState(false);

  // Pomodoro
  const [focusTimer, setFocusTimer] = useState(25 * 60);
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

  // Stop TTS on tab change
  useEffect(() => { tts.stop(); }, [activeTab]);

  const handleTransform = async (extractedText) => {
    const textToProcess = typeof extractedText === 'string' ? extractedText : inputText;
    if (!textToProcess.trim()) return;

    setLoading(true);
    setError(null);
    tts.stop();
    try {
      const data = await fetchTransformData(textToProcess);
      setAiData(data);
      const topic = textToProcess.split(/[.!?]/)[0].slice(0, 50).trim() || 'Concept Map';
      fetchMindMapCode(topic).then(setMindmapCode).catch(() => {});
      setActiveTab('text');
    } catch (err) {
      console.error('[Stride] transform error:', err.message);
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
        setError('Missing or invalid Gemini API key in your .env file.');
      } else if (err.message === 'RATE_LIMIT') {
        setError('Rate limit reached. Please wait a moment and try again.');
      } else if (err.message === 'NETWORK_ERROR') {
        setError('Network error. Check your internet connection and retry.');
      } else {
        setError(`Transform failed (${err.message}). Try with a shorter text or retry.`);
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
      {lineFocusEnabled && <LineFocusRuler />}

      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh', overflow: 'hidden' }}>

        {/* ── TOP NAV ── */}
        <nav style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#fff' }}>
            ⬡ Stride <span style={{ color: '#ff8c42', fontWeight: 400 }}>Adaptive</span>
          </span>

          {/* Feature toggles */}
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
            {[
              { label: 'Bionic', active: bionicEnabled, toggle: () => setBionicEnabled(b => !b), title: 'Bold first half of each word' },
              { label: '📏 Focus', active: lineFocusEnabled, toggle: () => setLineFocusEnabled(l => !l), title: 'Line focus ruler' },
            ].map(f => (
              <button key={f.label} onClick={f.toggle} title={f.title}
                style={{ background: f.active ? 'rgba(124,111,238,0.2)' : 'transparent', color: f.active ? '#7c6fee' : 'var(--text-muted)', border: `1px solid ${f.active ? 'rgba(124,111,238,0.4)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={clearProfile}
              style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.3rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem' }}>
              <i className="bi bi-person-gear me-1"></i>Profile
            </button>
          </div>
        </nav>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden' }}>

          {/* ── LEFT SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', overflowY: 'auto', background: 'var(--surface-1)' }}>
            <div style={{ padding: '1.25rem', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>

              {/* Input mode toggle */}
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.85rem', background: 'var(--surface-2)', borderRadius: '10px', padding: '3px' }}>
                {[
                  { id: 'paste', label: '✏️ Paste Text' },
                  { id: 'upload', label: '📄 Upload File' },
                ].map(m => (
                  <button key={m.id} onClick={() => setInputMode(m.id)}
                    style={{ flex: 1, background: inputMode === m.id ? '#7c6fee' : 'transparent', color: inputMode === m.id ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: inputMode === m.id ? 600 : 400, transition: 'all 0.2s' }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Paste mode */}
              {inputMode === 'paste' && (
                <textarea
                  style={{ flex: '1 1 auto', minHeight: '260px', resize: 'none', background: 'var(--surface-2)', color: '#e8eaf0', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem', fontSize: '0.9rem', lineHeight: 1.7, outline: 'none', fontFamily: 'inherit', marginBottom: '0.85rem' }}
                  placeholder="Paste any complex text here — article, textbook passage, notes…"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
              )}

              {/* Upload mode */}
              {inputMode === 'upload' && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <FileIngestion onTextExtracted={text => { setInputText(text); setInputMode('paste'); handleTransform(text); }} />
                  {inputText && (
                    <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'var(--surface-2)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <i className="bi bi-check-circle text-success me-2"></i>
                      {inputText.length.toLocaleString()} chars ready — switch to Paste to edit
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleTransform}
                disabled={loading || !inputText.trim()}
                style={{ background: '#7c6fee', color: '#fff', border: 'none', borderRadius: '24px', padding: '0.7rem', cursor: loading || !inputText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Lexend,sans-serif', fontWeight: 600, fontSize: '0.9rem', opacity: loading || !inputText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm"></span> Processing…</>
                  : <><i className="bi bi-magic"></i> Transform Content</>}
              </button>

              {error && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '10px', color: '#ff9999', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <i className="bi bi-exclamation-triangle me-2"></i>{error}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            {/* Pomodoro */}
            {comfortTags.includes('adhd') && (
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <i className="bi bi-lightning-charge" style={{ color: '#ff8c42' }}></i>
                  <span style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 500, color: '#e8eaf0', fontSize: '0.9rem' }}>Focus Session</span>
                  {isFocusMode && <span style={{ marginLeft: 'auto', color: '#56cfb2', fontSize: '0.75rem' }}>● Active</span>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 700, fontSize: '2.6rem', color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                    {String(Math.floor(focusTimer / 60)).padStart(2,'0')}:{String(focusTimer % 60).padStart(2,'0')}
                  </div>
                  <button onClick={() => setTimerRunning(t => !t)}
                    style={{ marginTop: '0.5rem', background: timerRunning ? 'rgba(255,107,107,0.15)' : '#7c6fee', color: timerRunning ? '#ff9999' : '#fff', border: 'none', borderRadius: '20px', padding: '0.45rem 1.2rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
                    <i className={`bi ${timerRunning ? 'bi-pause-fill' : 'bi-play-fill'} me-1`}></i>
                    {timerRunning ? 'Pause' : 'Start Focus'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e1117' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-1)', minHeight: '52px' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} disabled={!aiData}
                  style={{ background: activeTab === tab.id && aiData ? '#7c6fee' : 'transparent', color: activeTab === tab.id && aiData ? '#fff' : aiData ? 'var(--text-muted)' : 'var(--border-color)', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontFamily: 'Lexend,sans-serif', fontWeight: 500, cursor: aiData ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s' }}>
                  <i className={`bi ${tab.icon}`}></i> {tab.label}
                </button>
              ))}
            </div>

            {/* Output */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '1.75rem 2.25rem' }}>

              {/* Empty state */}
              {!aiData && !loading && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.25 }}><i className="bi bi-stars"></i></div>
                  <h4 style={{ color: '#9ba1b4', fontFamily: 'Lexend,sans-serif', fontWeight: 500, marginBottom: '0.5rem' }}>Your Learning Space</h4>
                  <p style={{ maxWidth: '350px', fontSize: '0.88rem', lineHeight: 1.7 }}>
                    Paste or upload any text on the left, then click <strong style={{ color: '#7c6fee' }}>Transform Content</strong> to get simplified summaries, flashcards, key terms, and a visual mind map.
                  </p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '52px', height: '52px', border: '4px solid rgba(124,111,238,0.2)', borderTopColor: '#7c6fee', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: '1.25rem' }}></div>
                  <p style={{ fontFamily: 'Lexend,sans-serif', fontWeight: 500, color: '#e8eaf0', marginBottom: '0.3rem' }}>Rewriting for your brain…</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Simplifying language · building flashcards · drawing mind map</p>
                </div>
              )}

              {/* Results */}
              {aiData && !loading && (
                <div>
                  {/* ADHD tip */}
                  {aiData.engagement_tip && comfortTags.includes('adhd') && (
                    <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.1rem', background: 'rgba(255,140,66,0.07)', border: '1px solid rgba(255,140,66,0.18)', borderLeft: '4px solid #ff8c42', borderRadius: '12px', display: 'flex', gap: '0.75rem' }}>
                      <i className="bi bi-lightbulb-fill" style={{ color: '#ff8c42', fontSize: '1rem', marginTop: '2px', flexShrink: 0 }}></i>
                      <div><span style={{ fontWeight: 600, color: '#ff8c42', fontSize: '0.78rem' }}>FOCUS TIP · </span><span style={{ color: '#d4d8e8', fontSize: '0.88rem' }}>{aiData.engagement_tip}</span></div>
                    </div>
                  )}

                  {/* TTS toolbar — only on text/vocab tabs */}
                  {(activeTab === 'text' || activeTab === 'vocab') && aiData && (
                    <TTSToolbar tts={tts} text={
                      activeTab === 'text'
                        ? aiData.simplified_text
                        : aiData.key_terms?.map(k => `${k.term}: ${k.simple_definition}`).join('. ')
                    } />
                  )}

                  {activeTab === 'text' && (
                    <div>
                      <h3 style={{ fontFamily: 'Lexend,sans-serif', color: '#e8eaf0', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1.25rem' }}>Simplified Summary</h3>
                      <BionicText
                        text={aiData.simplified_text}
                        highlightedSentenceIndex={tts.highlightedSentenceIndex}
                        bionicEnabled={bionicEnabled}
                      />
                    </div>
                  )}

                  {activeTab === 'vocab' && <KeyTerms terms={aiData.key_terms} />}
                  {activeTab === 'cards' && <FlashcardSet flashcards={aiData.flashcards} />}
                  {activeTab === 'map'   && <MermaidMap chartCode={mindmapCode} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
