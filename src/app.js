/**
 * app.js — Stride Adaptive Orchestrator
 * Initializes all modules, wires events, manages global state
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── State ─────────────────────────────────────────────
  const state = {
    currentMode: 'text',       // 'text' | 'flashcards' | 'mindmap'
    lastGeneratedText: '',
    lastFlashcards: [],
    lastMindmapCode: '',
    lastSimplifiedText: '',
    ttsActive: false,
    qaQuestion: '',
    qaAnswer: ''
  };

  // ── Init ──────────────────────────────────────────────
  BREADCRUMB.init(document.getElementById('breadcrumb-container'));
  PROFILER.init();
  _restoreApiKey();
  _populateSidebarTags([]);

  // Attempt to restore saved profile
  const savedProfile = THEME_ENGINE.loadProfile();
  if (savedProfile?.comfortTags?.length) {
    // If profile exists from before, offer to jump in (or go through profiler)
    console.log('[Stride] Restored profile:', savedProfile.comfortTags);
  }

  // ── Profile Applied ───────────────────────────────────
  document.addEventListener('profile-applied', (e) => {
    const { tags } = e.detail;
    _populateSidebarTags(tags);
    BREADCRUMB.setStep(1); // Move to Input step

    // ADHD profile: auto-highlight Pomodoro widget
    if (tags.includes('adhd')) {
      setTimeout(() => {
        document.getElementById('pomodoro-widget')?.classList.add('pulse-highlight');
        TTS_ENGINE.announceUI('Your Focus Session timer is ready in the sidebar. Tap Start when you are ready.');
      }, 800);
    }

    // Sensory: apply sliders silently
    if (tags.includes('sensory-sensitive')) {
      THEME_ENGINE.setAnimationLevel(0);
      document.getElementById('slider-animation').value = 0;
      _updateSliderBadge('val-animation', 0);
    }

    // Slow reader: enable TTS
    if (tags.includes('slow-reader')) {
      TTS_ENGINE.setEnabled(true);
      state.ttsActive = true;
    }
  });

  // ── Back to Profiler ──────────────────────────────────
  document.getElementById('btn-back-profiler')?.addEventListener('click', (e) => {
    e.preventDefault();
    POMODORO.reset();
    document.getElementById('panel-workspace').setAttribute('hidden', '');
    document.getElementById('panel-workspace').classList.remove('panel-active');
    document.getElementById('panel-profiler').classList.add('panel-active');
    BREADCRUMB.setStep(0);
  });

  document.getElementById('btn-change-profile')?.addEventListener('click', () => {
    document.getElementById('btn-back-profiler').click();
  });

  // ── AI Actions ────────────────────────────────────────
  document.getElementById('btn-generate-flashcards')?.addEventListener('click', async () => {
    const text = document.getElementById('content-input').value.trim();
    if (!_validateInput(text)) return;
    state.lastGeneratedText = text;
    _setLoading(true);
    try {
      const cards = await AI_ENGINE.generateFlashcards(text);
      state.lastFlashcards = cards;
      _renderOutput('flashcards', cards);
      _setMode('flashcards');
      BREADCRUMB.setStep(2); // Now at Learn
      _updateReadingTime(text);
      TTS_ENGINE.speak(`${cards.length} flashcards are ready! Click any card to flip it.`);
    } catch (err) {
      _renderAIError(err);
    } finally {
      _setLoading(false);
    }
  });

  document.getElementById('btn-generate-mindmap')?.addEventListener('click', async () => {
    const text = document.getElementById('content-input').value.trim();
    if (!_validateInput(text)) return;
    // Extract topic (first sentence or first 60 chars)
    const topic = text.split(/[.!?]/)[0].slice(0, 80).trim() || text.slice(0, 60);
    state.lastGeneratedText = text;
    _setLoading(true);
    try {
      const mermaidCode = await AI_ENGINE.generateMindMap(topic);
      state.lastMindmapCode = mermaidCode;
      _renderOutput('mindmap', mermaidCode);
      _setMode('mindmap');
      BREADCRUMB.setStep(2);
      _updateReadingTime(text);
    } catch (err) {
      _renderAIError(err);
    } finally {
      _setLoading(false);
    }
  });

  document.getElementById('btn-simplify')?.addEventListener('click', async () => {
    const text = document.getElementById('content-input').value.trim();
    if (!_validateInput(text)) return;
    state.lastGeneratedText = text;
    _setLoading(true);
    try {
      const simplified = await AI_ENGINE.simplifyText(text);
      state.lastSimplifiedText = simplified;
      _renderOutput('text', simplified);
      _setMode('text');
      BREADCRUMB.setStep(2);
      _updateReadingTime(simplified);
      TTS_ENGINE.speak(simplified);
    } catch (err) {
      _renderAIError(err);
    } finally {
      _setLoading(false);
    }
  });

  // ── Q&A Feedback ──────────────────────────────────────
  document.getElementById('btn-qa-submit')?.addEventListener('click', async () => {
    const answer = document.getElementById('qa-answer-input').value.trim();
    if (!answer || !state.qaQuestion) return;
    const feedbackEl = document.getElementById('qa-feedback-display');
    feedbackEl.innerHTML = '<div class="loading-indicator" style="display:flex"><div class="spinner"></div><span>Checking…</span></div>';
    try {
      const fb = await AI_ENGINE.getFeedback(state.qaQuestion, state.qaAnswer, answer);
      feedbackEl.innerHTML = `
        <div class="feedback-card ${fb.isCorrect ? 'correct' : 'incorrect'}">
          <strong>${fb.isCorrect ? '✓ Correct!' : '× Not quite'}</strong>
          <p style="margin:0.3rem 0 0">${fb.encouragement}</p>
          ${fb.correction ? `<p class="feedback-correction">${fb.correction}</p>` : ''}
        </div>`;
      TTS_ENGINE.speak(fb.encouragement + (fb.correction ? '. ' + fb.correction : ''));
      BREADCRUMB.setStep(3); // Review step
    } catch (err) {
      feedbackEl.innerHTML = `<div class="feedback-card incorrect">Couldn't check your answer right now. <button class="btn-action btn-secondary-action" onclick="document.getElementById('btn-qa-submit').click()">Retry</button></div>`;
    }
  });

  // ── View Mode Switcher ────────────────────────────────
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      _setMode(mode);
      // Re-render last content in new mode
      if (mode === 'flashcards' && state.lastFlashcards.length) {
        _renderOutput('flashcards', state.lastFlashcards);
      } else if (mode === 'mindmap' && state.lastMindmapCode) {
        _renderOutput('mindmap', state.lastMindmapCode);
      } else if (mode === 'text' && state.lastSimplifiedText) {
        _renderOutput('text', state.lastSimplifiedText);
      }
    });
  });

  // ── Pomodoro Controls ─────────────────────────────────
  document.getElementById('btn-pom-start')?.addEventListener('click', () => POMODORO.start());
  document.getElementById('btn-pom-reset')?.addEventListener('click', () => POMODORO.reset());

  document.addEventListener('sprint-complete', (e) => {
    _showToast('Sprint complete! 🎯', `Sprint ${e.detail.sprintsCompleted} done. Take a short break.`, 'success');
  });
  document.addEventListener('session-complete', () => {
    _showToast('Session complete! 🏆', 'All 4 sprints done. Take a long break — you earned it!', 'success');
  });

  // ── Pomodoro Settings ─────────────────────────────────
  document.getElementById('btn-save-pom-settings')?.addEventListener('click', () => {
    const sprint = parseInt(document.getElementById('pom-sprint').value, 10) || 15;
    const brk = parseInt(document.getElementById('pom-break').value, 10) || 5;
    POMODORO.configure(sprint, brk);
    _showToast('Timer Updated', `Sprint: ${sprint}min, Break: ${brk}min`, 'info');
  });

  // ── TTS Toggle ────────────────────────────────────────
  document.getElementById('btn-tts-toggle')?.addEventListener('click', () => {
    state.ttsActive = TTS_ENGINE.toggle();
    if (state.ttsActive && state.lastSimplifiedText) {
      TTS_ENGINE.speak(state.lastSimplifiedText);
    }
  });

  // ── Settings: API Key ─────────────────────────────────
  document.getElementById('btn-save-api-key')?.addEventListener('click', () => {
    const key = document.getElementById('gemini-api-key').value.trim();
    const statusEl = document.getElementById('api-key-status');
    if (!key.startsWith('AIza')) {
      statusEl.textContent = '⚠ That doesn\'t look like a valid Gemini key (should start with "AIza")';
      statusEl.className = 'settings-status error';
      return;
    }
    localStorage.setItem('stride_gemini_key', key);
    statusEl.textContent = '✓ API key saved';
    statusEl.className = 'settings-status success';
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });

  // ── Settings: Sensory Sliders ─────────────────────────
  document.getElementById('slider-animation')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    THEME_ENGINE.setAnimationLevel(val);
    _updateSliderBadge('val-animation', val);
  });

  document.getElementById('slider-audio')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    TTS_ENGINE.setAudioIntensity(val);
    _updateSliderBadge('val-audio', val);
  });

  document.getElementById('slider-contrast')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    THEME_ENGINE.setContrastLevel(val);
    _updateSliderBadge('val-contrast', val);
  });

  document.getElementById('slider-fontsize')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    THEME_ENGINE.setFontSize(val);
    _updateSliderBadge('val-fontsize', val + 'px');
  });

  document.getElementById('slider-tts-rate')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(1);
    TTS_ENGINE.setRate(val);
    _updateSliderBadge('val-tts-rate', val + '×');
  });

  document.getElementById('voice-select')?.addEventListener('change', (e) => {
    TTS_ENGINE.setVoice(e.target.value);
  });

  // ── Input: Update Reading Time on Paste/Type ──────────
  document.getElementById('content-input')?.addEventListener('input', (e) => {
    _updateReadingTime(e.target.value);
  });

  // ── Internal Helpers ──────────────────────────────────

  function _validateInput(text) {
    if (!text || text.length < 10) {
      _showToast('No text found', 'Please paste some educational text first (at least a sentence).', 'warning');
      return false;
    }
    if (!AI_ENGINE.getApiKey()) {
      _showToast('API key needed', 'Open ⚙ Settings and add your Gemini API key to use AI features.', 'warning');
      return false;
    }
    return true;
  }

  function _setLoading(active) {
    const el = document.getElementById('ai-loading');
    if (active) el?.removeAttribute('hidden');
    else el?.setAttribute('hidden', '');
    // Disable buttons during load
    ['btn-generate-flashcards','btn-generate-mindmap','btn-simplify'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = active;
    });
  }

  function _renderOutput(type, data) {
    const outputZone = document.getElementById('output-zone');
    const emptyState = document.getElementById('output-empty');
    if (emptyState) emptyState.style.display = 'none';

    // Clear previous AI content (not the empty state div)
    outputZone.querySelectorAll('.ai-output-item').forEach(el => el.remove());

    const wrapper = document.createElement('div');
    wrapper.className = 'ai-output-item';

    if (type === 'flashcards') {
      FLASHCARD_COMPONENT.render(data, wrapper);
      // Show Q&A zone
      _setUpQA(data[0]);
    } else if (type === 'mindmap') {
      MINDMAP_COMPONENT.render(data, wrapper);
    } else if (type === 'text') {
      const mins = _calcReadTime(data);
      wrapper.innerHTML = `
        <div class="simplified-text-card">
          <div class="section-label"><i class="bi bi-magic" style="margin-right:0.4rem"></i>Simplified View</div>
          <div class="read-time-badge"><i class="bi bi-clock"></i> ~${mins} min read</div>
          ${data.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('')}
        </div>`;
    }

    outputZone.appendChild(wrapper);
  }

  function _setMode(mode) {
    state.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function _setUpQA(firstCard) {
    if (!firstCard) return;
    state.qaQuestion = firstCard.front;
    state.qaAnswer = firstCard.back;
    const qaZone = document.getElementById('qa-zone');
    const qDisplay = document.getElementById('qa-question-display');
    if (qaZone) qaZone.removeAttribute('hidden');
    if (qDisplay) qDisplay.innerHTML = `<p class="qa-question">${firstCard.front}</p>`;
    document.getElementById('qa-answer-input').value = '';
    document.getElementById('qa-feedback-display').innerHTML = '';
  }

  function _renderAIError(err) {
    const details = AI_ENGINE.getErrorDetails(err);
    const outputZone = document.getElementById('output-zone');
    const emptyState = document.getElementById('output-empty');
    if (emptyState) emptyState.style.display = 'none';
    outputZone.querySelectorAll('.ai-output-item').forEach(el => el.remove());

    const errEl = document.createElement('div');
    errEl.className = 'ai-output-item error-forgiveness-card';
    errEl.innerHTML = `
      <div class="error-title">⚠ ${details.title}</div>
      <div class="error-cause">${details.cause}</div>
      <ol>${details.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <div class="error-reassure"><i class="bi bi-heart"></i> ${details.reassure}</div>
    `;
    outputZone.appendChild(errEl);
    TTS_ENGINE.speak(details.title + '. ' + details.cause + '. ' + details.steps[0]);
  }

  function _updateReadingTime(text) {
    const mins = _calcReadTime(text);
    const timeEl = document.getElementById('reading-time-value');
    if (timeEl) timeEl.textContent = mins || '—';
  }

  function _calcReadTime(text) {
    if (!text || !text.trim()) return 0;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200)); // avg 200 wpm for neuro-inclusive reading
  }

  function _populateSidebarTags(tags) {
    const container = document.getElementById('sidebar-profile-tags');
    if (!container) return;
    if (!tags.length) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">No profile set</span>';
      return;
    }
    container.innerHTML = tags.map(tag => `<span class="profile-tag ${tag}">${tag.replace('-', ' ')}</span>`).join('');
  }

  function _showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const iconMap = { success: 'bi-check-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill', error: 'bi-x-circle-fill' };
    const colorMap = { success: 'var(--accent-success)', warning: 'var(--accent-warm)', info: 'var(--accent-primary)', error: 'var(--accent-danger)' };

    const toastEl = document.createElement('div');
    toastEl.id = id;
    toastEl.className = 'toast custom-toast align-items-center';
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="toast-header">
        <i class="bi ${iconMap[type]}" style="color:${colorMap[type]};margin-right:0.5rem"></i>
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" style="color:var(--text-secondary);font-size:0.88rem">${message}</div>
    `;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  function _updateSliderBadge(badgeId, value) {
    const el = document.getElementById(badgeId);
    if (el) el.textContent = value;
  }

  function _restoreApiKey() {
    const key = localStorage.getItem('stride_gemini_key');
    if (key) {
      const field = document.getElementById('gemini-api-key');
      if (field) field.value = key;
      const statusEl = document.getElementById('api-key-status');
      if (statusEl) {
        statusEl.textContent = '✓ API key loaded';
        statusEl.className = 'settings-status success';
      }
    }
  }

});
