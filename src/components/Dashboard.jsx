// src/components/Dashboard.jsx
import React, { useState } from 'react';
import { fetchTransformData, fetchMindMapCode } from '../api/transform';
import { FlashcardSet } from './FlashcardSet';
import { MermaidMap } from './MermaidMap';
import { KeyTerms } from './KeyTerms';

export function Dashboard({ uiState }) {
  const { comfortTags, isFocusMode, setIsFocusMode, clearProfile } = uiState;
  
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AI Results
  const [aiData, setAiData] = useState(null);
  const [mindmapCode, setMindmapCode] = useState(null);
  const [activeTab, setActiveTab] = useState('text');

  // Pomodoro / Focus
  const [focusTimer, setFocusTimer] = useState(25 * 60); // 25 min default
  const [timerRunning, setTimerRunning] = useState(false);

  // Very basic timer purely for UI demonstration
  React.useEffect(() => {
    let interval = null;
    if (timerRunning && focusTimer > 0) {
      interval = setInterval(() => setFocusTimer(f => f - 1), 1000);
      setIsFocusMode(true);
    } else {
      clearInterval(interval);
      if (!timerRunning) setIsFocusMode(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, focusTimer, setIsFocusMode]);

  const toggleTimer = () => setTimerRunning(!timerRunning);

  const handleTransform = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch JSON (Text, Terms, Flashcards, Tip)
      const data = await fetchTransformData(inputText);
      setAiData(data);
      
      // 2. Fetch Map
      const topic = inputText.split(/[.!?]/)[0].slice(0, 50).trim() || "Concept Map";
      try {
        const code = await fetchMindMapCode(topic);
        setMindmapCode(code);
      } catch(mapErr) {
        console.error("Mind map failed, but continuing with text...", mapErr);
      }

      setActiveTab('text');
    } catch (err) {
      setError(err.message === 'NO_API_KEY' ? 'Please add your Gemini API Key in Settings.' : 'AI Generation failed. Try a different text block.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      
      {/* Top Nav */}
      <nav className="navbar navbar-dark bg-surface-2 border-bottom border-dark px-3 py-2">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1 fs-5 font-lexend text-white">⬡ Stride</span>
          <div className="d-flex align-items-center gap-3">
             {/* Simple API Key Input for PoC */}
             <input 
               type="password" 
               className="form-control form-control-sm bg-surface-1 text-white border-secondary" 
               placeholder="Gemini API Key..." 
               style={{ width: '200px' }}
               onChange={(e) => localStorage.setItem('stride_gemini_key', e.target.value)}
               defaultValue={localStorage.getItem('stride_gemini_key') || ''}
             />
             <button className="btn btn-sm btn-outline-secondary text-white border-0" onClick={clearProfile}>
               <i className="bi bi-person-gear me-1"></i> Profile
             </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid flex-grow-1 p-3 p-md-4">
        <div className="row g-4 h-100">
          
          {/* LEFT SIDEBAR - Tools & Input */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4 workspace-sidebar">
            
            {/* Input Panel */}
            <div className="card bento-panel h-100">
              <div className="bento-panel-header text-primary">
                <i className="bi bi-pencil-square"></i> Input Material
              </div>
              <div className="bento-panel-body d-flex flex-column">
                <p className="small text-muted mb-2">Paste complex text here. Stride will simplify it based on your profile.</p>
                <textarea 
                  className="form-control bg-surface-1 text-white flex-grow-1 border-secondary mb-3 readable-text"
                  placeholder="Paste educational content here..."
                  style={{ minHeight: '200px', resize: 'none' }}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button 
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleTransform}
                  disabled={loading || !inputText.trim()}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...</>
                  ) : (
                    <><i className="bi bi-magic"></i> Transform Content</>
                  )}
                </button>
                {error && <div className="text-danger small mt-2">{error}</div>}
              </div>
            </div>

            {/* Pomodoro Focus Panel (visible if ADHD tag present) */}
            {comfortTags.includes('adhd') && (
              <div className={`card bento-panel ${isFocusMode ? 'border-secondary shadow-lg' : ''}`}>
                <div className="bento-panel-header text-secondary">
                  <i className="bi bi-lightning-charge"></i> Focus Session
                </div>
                <div className="bento-panel-body text-center py-4">
                   <div className="display-4 font-lexend fw-bold text-white mb-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                     {String(Math.floor(focusTimer / 60)).padStart(2, '0')}:{String(focusTimer % 60).padStart(2, '0')}
                   </div>
                   <button 
                     className={`btn ${timerRunning ? 'btn-outline-danger' : 'btn-secondary'} rounded-pill px-4`}
                     onClick={toggleTimer}
                   >
                     {timerRunning ? 'Pause Focus' : 'Start Focus'}
                   </button>
                   {isFocusMode && <p className="small text-muted mt-3 mb-0">Immersion mode active. Distractions hidden.</p>}
                </div>
              </div>
            )}
          </div>

          {/* MAIN WORKSPACE - Output */}
          <div className="col-12 col-lg-8 workspace-main">
            <div className="card bento-panel h-100">
              
              <div className="bento-panel-header d-flex justify-content-between align-items-center">
                <div className="text-primary"><i className="bi bi-laptop"></i> Learning Space</div>
                
                {aiData && (
                  <div className="btn-group" role="group">
                    <button className={`btn btn-sm ${activeTab === 'text' ? 'btn-primary' : 'btn-outline-secondary text-white'}`} onClick={() => setActiveTab('text')}>Read</button>
                    <button className={`btn btn-sm ${activeTab === 'vocab' ? 'btn-primary' : 'btn-outline-secondary text-white'}`} onClick={() => setActiveTab('vocab')}>Vocab</button>
                    <button className={`btn btn-sm ${activeTab === 'cards' ? 'btn-primary' : 'btn-outline-secondary text-white'}`} onClick={() => setActiveTab('cards')}>Flashcards</button>
                    <button className={`btn btn-sm ${activeTab === 'map' ? 'btn-primary' : 'btn-outline-secondary text-white'}`} onClick={() => setActiveTab('map')}>Mind Map</button>
                  </div>
                )}
              </div>

              <div className="bento-panel-body" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                {!aiData && !loading && (
                  <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted text-center p-5">
                     <i className="bi bi-inbox fs-1 mb-3 opacity-50"></i>
                     <p>Paste text on the left and click <strong>Transform</strong> to generate a simplified view, flashcards, and a visual mind map.</p>
                  </div>
                )}

                {loading && (
                  <div className="h-100 d-flex flex-column align-items-center justify-content-center text-primary">
                    <div className="spinner-grow bg-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                    <p className="fw-medium font-lexend">Rewriting for your brain...</p>
                  </div>
                )}

                {aiData && !loading && (
                  <div className="fade-in">
                    
                    {/* ADHD Engagement Tip */}
                    {aiData.engagement_tip && comfortTags.includes('adhd') && (
                      <div className="alert alert-secondary bg-surface-2 border-secondary text-white d-flex align-items-start mb-4 shadow-sm" style={{ borderLeft: '4px solid var(--bs-secondary)' }}>
                        <i className="bi bi-lightbulb-fill fs-5 me-3 text-secondary mt-1"></i>
                        <div>
                          <strong>Focus Tip:</strong> {aiData.engagement_tip}
                        </div>
                      </div>
                    )}

                    {/* View Switching */}
                    {activeTab === 'text' && (
                       <div className="readable-text px-md-3 py-2">
                         <h4 className="font-lexend text-white mb-3 border-bottom border-dark pb-2">Simplified Summary</h4>
                         {/* Render line breaks naturally */}
                         {aiData.simplified_text.split('\n').filter(p => p.trim()).map((p, i) => (
                            <p key={i} className="mb-3 fs-5" style={{ color: 'var(--bs-body-color)' }}>{p}</p>
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
      </div>
    </div>
  );
}
