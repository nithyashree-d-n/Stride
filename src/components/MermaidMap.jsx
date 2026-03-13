// src/components/MermaidMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export function MermaidMap({ chartCode }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chartCode) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });

    const renderChart = async () => {
      try {
        setError(null);
        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Mermaid needs a unique ID for each render
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chartCode);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Apply custom sizing to the generated SVG
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Could not render the mind map from the AI output. This happens sometimes when the format is slightly off.');
      }
    };

    renderChart();
  }, [chartCode]);

  if (!chartCode) return null;

  return (
    <div className="mermaid-wrapper mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 text-primary fw-medium">
          <i className="bi bi-diagram-3 me-2"></i> Visual Mind Map
        </h5>
        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigator.clipboard.writeText(chartCode)}
          title="Copy Mermaid Code"
        >
          <i className="bi bi-clipboard"></i>
        </button>
      </div>

      <div className="card bento-panel bg-surface-1 border border-secondary p-3" style={{ minHeight: '300px', overflowX: 'auto' }}>
        {error ? (
          <div className="alert alert-warning d-flex align-items-center mb-0 h-100 justify-content-center border-0 bg-transparent text-muted">
             <div><i className="bi bi-exclamation-triangle fs-4 me-2"></i> {error}</div>
          </div>
        ) : (
          <div ref={containerRef} className="d-flex justify-content-center align-items-center h-100" />
        )}
      </div>
    </div>
  );
}
