// src/components/KeyTerms.jsx
import React from 'react';

export function KeyTerms({ terms }) {
  if (!terms || terms.length === 0) return null;

  return (
    <div className="mt-4">
      <h5 className="mb-3 text-primary fw-medium">
        <i className="bi bi-key me-2"></i> Key Terms
      </h5>
      <div className="row g-3">
        {terms.map((item, idx) => (
          <div className="col-12 col-md-6" key={idx}>
            <div className="card bento-panel h-100 border-start border-4 border-secondary border-top-0 border-end-0 border-bottom-0">
              <div className="card-body py-2 px-3">
                <div className="fw-bold text-white mb-1" style={{ fontSize: '0.95rem' }}>{item.term}</div>
                <div className="text-muted small readable-text">{item.simple_definition}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
