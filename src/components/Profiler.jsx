// src/components/Profiler.jsx
import React from 'react';

const COMFORT_OPTIONS = [
  {
    choice: 'Text feels hard to read',
    icon: '📖',
    detail: 'Letters blur, words jump, or reading is slow'
  },
  {
    choice: 'I lose focus easily',
    icon: '⚡',
    detail: 'My mind wanders or I get overwhelmed quickly'
  },
  {
    choice: 'Bright screens hurt my eyes',
    icon: '🌙',
    detail: 'Harsh light or busy pages feel uncomfortable'
  },
  {
    choice: 'I prefer pictures over words',
    icon: '🗺️',
    detail: 'Diagrams and visuals help me understand better'
  },
  {
    choice: 'I like things calm and predictable',
    icon: '🧩',
    detail: 'Sudden changes or surprises make things harder'
  },
  {
    choice: 'I read at my own pace',
    icon: '🐢',
    detail: 'I need more time, or I like content read aloud'
  }
];

export function Profiler({ selectedChoices, toggleChoice, onConfirm }) {
  const hasSelection = selectedChoices.length > 0;

  return (
    <div className="container py-5 d-flex flex-column" style={{ minHeight: '90vh' }}>
      
      {/* Brand Header */}
      <div className="text-center mb-5">
        <div className="brand-mark mb-3"><span className="brand-icon fs-1">⬡</span></div>
        <h1 className="brand-name">Stride <span className="brand-accent">Adaptive</span></h1>
        <p className="brand-tagline text-muted">Learning shaped around you — no labels, no limits.</p>
      </div>

      <div className="row justify-content-center flex-grow-1">
        <div className="col-12 col-md-10 col-lg-8">
          
          <div className="text-center mb-4">
            <h2 className="fs-3 font-lexend fw-semibold">How do you learn best today?</h2>
            <p className="text-muted">Select everything that feels true for you. We'll adjust the room.</p>
          </div>

          <div className="row g-3 mb-5">
            {COMFORT_OPTIONS.map((opt) => {
              const isActive = selectedChoices.includes(opt.choice);
              return (
                <div className="col-12 col-sm-6" key={opt.choice}>
                  <button
                    type="button"
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                      padding: '1rem', border: `2px solid ${isActive ? 'var(--bs-primary)' : 'var(--border-color)'}`,
                      borderRadius: '14px', background: isActive ? 'rgba(124,111,238,0.12)' : 'var(--surface-1)',
                      cursor: 'pointer', position: 'relative',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      transition: 'all 0.2s ease', gap: '0.85rem'
                    }}
                    onClick={() => toggleChoice(opt.choice)}
                    aria-pressed={isActive}
                  >
                    <span style={{ fontSize: '1.75rem', lineHeight: 1 }} aria-hidden="true">{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#e8eaf0', marginBottom: '3px', fontSize: '0.95rem' }}>{opt.choice}</div>
                      <div style={{ color: '#9ba1b4', fontSize: '0.8rem', lineHeight: 1.5 }}>{opt.detail}</div>
                    </div>
                    {isActive && (
                      <i className="bi bi-check-circle-fill" style={{ color: 'var(--bs-primary)', fontSize: '1.2rem', flexShrink: 0 }}></i>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              className="btn btn-primary btn-lg px-5 py-3 rounded-pill fw-bold shadow position-relative"
              disabled={!hasSelection}
              onClick={onConfirm}
              style={{ transition: 'all 0.3s ease' }}
            >
              Start Learning My Way
              <i className="bi bi-arrow-right ms-2"></i>
            </button>
            {!hasSelection && (
              <p className="small text-muted mt-3">Select at least one comfort option to begin.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
