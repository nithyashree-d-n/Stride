// src/components/TTSToolbar.jsx — Stride Adaptive
// Floating "Listen & Learn" bar with sentence highlighting + Indian language selector

import React from 'react';
import { INDIAN_LANGUAGES } from '../hooks/useTTS';

export function TTSToolbar({ tts, text }) {
  const {
    isSpeaking, isPaused, rate, setRate,
    langCode, setLangCode, voiceGender, setVoiceGender,
    speak, stop, pause, resume,
  } = tts;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
      padding: '0.6rem 1rem', background: 'var(--surface-2)',
      borderRadius: '12px', border: '1px solid var(--border-color)',
      marginBottom: '1rem'
    }}>
      {/* Play / Pause / Stop */}
      {!isSpeaking && (
        <button
          onClick={() => speak(text)}
          style={{ background: '#7c6fee', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          title="Read aloud"
        >
          <i className="bi bi-play-fill"></i> Read Aloud
        </button>
      )}

      {isSpeaking && !isPaused && (
        <>
          <button onClick={pause}
            style={{ background: 'rgba(255,140,66,0.15)', color: '#ff8c42', border: '1px solid rgba(255,140,66,0.3)', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <i className="bi bi-pause-fill"></i> Pause
          </button>
          <button onClick={stop}
            style={{ background: 'rgba(255,107,107,0.12)', color: '#ff9999', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <i className="bi bi-stop-fill"></i> Stop
          </button>
        </>
      )}

      {isSpeaking && isPaused && (
        <>
          <button onClick={resume}
            style={{ background: 'rgba(86,207,178,0.12)', color: '#56cfb2', border: '1px solid rgba(86,207,178,0.25)', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <i className="bi bi-play-fill"></i> Resume
          </button>
          <button onClick={stop}
            style={{ background: 'rgba(255,107,107,0.12)', color: '#ff9999', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <i className="bi bi-stop-fill"></i> Stop
          </button>
        </>
      )}

      <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

      {/* Language selector */}
      <select
        value={langCode}
        onChange={e => setLangCode(e.target.value)}
        style={{ background: 'var(--surface-1)', color: '#e8eaf0', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}
        title="Language"
      >
        {INDIAN_LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
        ))}
      </select>

      {/* Voice gender */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {['female', 'male'].map(g => (
          <button
            key={g}
            onClick={() => setVoiceGender(g)}
            style={{
              background: voiceGender === g ? 'rgba(124,111,238,0.2)' : 'transparent',
              color: voiceGender === g ? '#7c6fee' : 'var(--text-muted)',
              border: `1px solid ${voiceGender === g ? 'rgba(124,111,238,0.4)' : 'var(--border-color)'}`,
              borderRadius: '6px', padding: '0.3rem 0.55rem', cursor: 'pointer', fontSize: '0.8rem'
            }}
            title={`${g} voice`}
          >
            {g === 'female' ? '♀' : '♂'}
          </button>
        ))}
      </div>

      {/* Rate slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Speed</span>
        <input
          type="range" min="0.5" max="1.8" step="0.1"
          value={rate}
          onChange={e => setRate(e.target.value)}
          style={{ width: '70px', accentColor: '#7c6fee' }}
        />
        <span style={{ color: '#e8eaf0', fontSize: '0.78rem', minWidth: '2rem' }}>{rate}×</span>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width: '3px', borderRadius: '2px', background: '#56cfb2', animation: `ttsBar${i} 0.8s ${i*0.15}s ease-in-out infinite alternate`, height: '12px' }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes ttsBar1 { from { height: 4px; } to { height: 16px; } }
        @keyframes ttsBar2 { from { height: 8px; } to { height: 12px; } }
        @keyframes ttsBar3 { from { height: 4px; } to { height: 20px; } }
      `}</style>
    </div>
  );
}


/**
 * BionicText — wraps the first 40-50% of each word in <strong>
 * and applies sentence-level "follow-along" highlight when TTS is active.
 */
export function BionicText({ text, highlightedSentenceIndex, bionicEnabled }) {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

  return (
    <div>
      {sentences.map((sentence, sIdx) => {
        const isHighlighted = highlightedSentenceIndex === sIdx;
        return (
          <span
            key={sIdx}
            style={{
              background: isHighlighted ? 'rgba(255,210,60,0.18)' : 'transparent',
              borderRadius: '4px',
              padding: isHighlighted ? '1px 2px' : '0',
              transition: 'background 0.3s ease',
              display: 'inline',
            }}
          >
            {bionicEnabled ? applyBionic(sentence) : sentence}
            {' '}
          </span>
        );
      })}
    </div>
  );
}

function applyBionic(text) {
  return text.split(/(\s+)/).map((chunk, i) => {
    if (!chunk.trim()) return chunk; // preserve whitespace
    const boldLen = Math.ceil(chunk.length * 0.45);
    return (
      <span key={i}>
        <strong>{chunk.slice(0, boldLen)}</strong>
        {chunk.slice(boldLen)}
      </span>
    );
  });
}
