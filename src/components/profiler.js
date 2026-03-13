/**
 * profiler.js — Comfort Selection UI
 * Renders 6 comfort-choice cards, manages selection state,
 * maps selections to comfort tags, and fires profile-ready event
 */

const PROFILER = (() => {
  const COMFORT_OPTIONS = [
    {
      tag: 'dyslexic',
      icon: '📖',
      label: 'Text feels hard to read',
      detail: 'Letters blur, words jump, or reading is slow'
    },
    {
      tag: 'adhd',
      icon: '⚡',
      label: 'I lose focus easily',
      detail: 'My mind wanders or I get overwhelmed quickly'
    },
    {
      tag: 'sensory-sensitive',
      icon: '🌙',
      label: 'Bright screens hurt my eyes',
      detail: 'Harsh light or busy pages feel uncomfortable'
    },
    {
      tag: 'visual-learner',
      icon: '🗺️',
      label: 'I prefer pictures over words',
      detail: 'Diagrams and visuals help me understand better'
    },
    {
      tag: 'autism-comfort',
      icon: '🧩',
      label: 'I like things calm and predictable',
      detail: 'Sudden changes or surprises make things harder'
    },
    {
      tag: 'slow-reader',
      icon: '🐢',
      label: 'I read at my own pace',
      detail: 'I need more time, or I like content read aloud'
    }
  ];

  let selectedTags = new Set();

  function init() {
    const grid = document.getElementById('comfort-grid');
    const btn = document.getElementById('btn-start-learning');
    if (!grid || !btn) return;

    grid.innerHTML = '';
    COMFORT_OPTIONS.forEach(option => {
      const card = _buildCard(option);
      grid.appendChild(card);
    });

    btn.addEventListener('click', _handleStart);
  }

  function _buildCard(option) {
    const btn = document.createElement('button');
    btn.className = 'comfort-choice';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('data-tag', option.tag);
    btn.innerHTML = `
      <span class="choice-icon" aria-hidden="true">${option.icon}</span>
      <span class="choice-text">
        <span class="choice-label">${option.label}</span>
        <span class="choice-detail" style="display:block;font-size:0.77rem;color:var(--text-muted);margin-top:2px;">${option.detail}</span>
      </span>
      <span class="choice-checkmark" aria-hidden="true"><i class="bi bi-check"></i></span>
    `;

    btn.addEventListener('click', () => _toggleChoice(btn, option.tag));
    return btn;
  }

  function _toggleChoice(btn, tag) {
    const isSelected = selectedTags.has(tag);
    if (isSelected) {
      selectedTags.delete(tag);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      selectedTags.add(tag);
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    }
    _updateStartButton();
  }

  function _updateStartButton() {
    const btn = document.getElementById('btn-start-learning');
    if (!btn) return;
    const hasSelection = selectedTags.size > 0;
    btn.disabled = !hasSelection;
    btn.setAttribute('aria-disabled', String(!hasSelection));
  }

  function _handleStart() {
    const tags = Array.from(selectedTags);
    // Apply profile
    const profile = THEME_ENGINE.applyProfile(tags);
    THEME_ENGINE.saveProfile(profile);

    // Update TTS auto-start based on slow-reader tag
    if (tags.includes('slow-reader')) {
      TTS_ENGINE.setEnabled(true);
    }

    // Transition to workspace
    _showWorkspace();

    // Fire event for app.js
    document.dispatchEvent(new CustomEvent('profile-applied', { detail: { tags, profile } }));
  }

  function _showWorkspace() {
    const profilerPanel = document.getElementById('panel-profiler');
    const workspacePanel = document.getElementById('panel-workspace');
    if (profilerPanel) profilerPanel.classList.remove('panel-active');
    if (workspacePanel) {
      workspacePanel.removeAttribute('hidden');
      workspacePanel.classList.add('panel-active');
    }
    BREADCRUMB.setStep(1); // Move to "Input" step
  }

  function getSelectedTags() { return Array.from(selectedTags); }

  return { init, getSelectedTags };
})();
