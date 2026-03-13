/**
 * mindmap.js — Mermaid.js Mind Map Renderer
 * Validates Mermaid syntax, injects into DOM, triggers render
 */

const MINDMAP_COMPONENT = (() => {

  // Mermaid config (dark theme to match app)
  const MERMAID_CONFIG = {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#7c6fee',
      primaryTextColor: '#e8eaf0',
      primaryBorderColor: '#5a4ed4',
      lineColor: '#56cfb2',
      secondaryColor: '#1c2333',
      tertiaryColor: '#131820',
      background: '#0e1117',
      mainBkg: '#1c2333',
      nodeBorder: '#7c6fee',
      clusterBkg: '#161b24',
      titleColor: '#e8eaf0',
      edgeLabelBackground: '#161b24',
      fontFamily: 'Inter, sans-serif',
    },
    startOnLoad: false,
    securityLevel: 'loose'
  };

  let initialized = false;

  function _initMermaid() {
    if (initialized) return;
    try {
      mermaid.initialize(MERMAID_CONFIG);
      initialized = true;
    } catch (e) {
      console.warn('Mermaid init error:', e);
    }
  }

  /**
   * render(mermaidCode, containerEl)
   * @param {string} mermaidCode - Raw Mermaid code (starts with 'mindmap')
   * @param {HTMLElement} containerEl
   */
  async function render(mermaidCode, containerEl) {
    _initMermaid();
    containerEl.innerHTML = '';

    // Validate basic structure
    if (!mermaidCode || !mermaidCode.trim().startsWith('mindmap')) {
      _renderError(containerEl, 'The mind map code did not start with "mindmap".');
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'mindmap-container';
    wrapper.innerHTML = `
      <div class="section-label">
        <i class="bi bi-diagram-3" style="margin-right:0.4rem"></i>
        Mind Map
        <button class="btn-icon" id="mindmap-copy-btn" style="margin-left:auto;display:inline-flex;width:auto;padding:0.2rem 0.6rem;font-size:0.78rem;gap:0.3rem" aria-label="Copy Mermaid code">
          <i class="bi bi-clipboard"></i> Copy code
        </button>
      </div>
    `;

    const preEl = document.createElement('pre');
    preEl.className = 'mermaid';
    preEl.textContent = mermaidCode;
    wrapper.appendChild(preEl);

    containerEl.appendChild(wrapper);

    // Render the diagram
    try {
      await mermaid.run({ nodes: [preEl] });
    } catch (renderErr) {
      console.error('Mermaid render error:', renderErr);
      _renderError(containerEl, 'The diagram could not be drawn from the AI output.');
      return;
    }

    // Copy button
    document.getElementById('mindmap-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(mermaidCode).then(() => {
        const btn = document.getElementById('mindmap-copy-btn');
        if (btn) {
          btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
          setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy code'; }, 2000);
        }
      });
    });

    // TTS: Announce that mind map is ready
    TTS_ENGINE.speak('Your mind map is ready. It shows the main ideas and how they connect.');
  }

  function _renderError(containerEl, detail) {
    containerEl.innerHTML = `
      <div class="error-forgiveness-card">
        <div class="error-title">⚠ Mind map couldn't load</div>
        <div class="error-cause">${detail}</div>
        <ol>
          <li>Click "Mind Map" again to retry</li>
          <li>Make sure mermaid.min.js loaded (check browser console)</li>
          <li>Try pasting shorter or simpler text</li>
        </ol>
        <div class="error-reassure">This is fixable and not your fault — the AI occasionally returns unexpected formats.</div>
      </div>
    `;
  }

  return { render };
})();
