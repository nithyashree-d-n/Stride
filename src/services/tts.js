/**
 * tts.js — Web Speech API Text-to-Speech Service
 * Wraps SpeechSynthesis with rate/voice control and audio intensity
 */

const TTS_ENGINE = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let currentUtterance = null;
  let audioIntensity = 1; // 0=silent, 1=normal, 2=louder, 3=full
  let ttsRate = 1.0;
  let selectedVoice = null;
  let isEnabled = false;

  // Load voices (async on some browsers)
  function _loadVoices() {
    voices = synth.getVoices();
    if (!voices.length) {
      synth.addEventListener('voiceschanged', () => {
        voices = synth.getVoices();
        _populateVoiceSelect();
      }, { once: true });
    } else {
      _populateVoiceSelect();
    }
  }

  function _populateVoiceSelect() {
    const select = document.getElementById('voice-select');
    if (!select) return;
    select.innerHTML = '';
    // prefer English voices
    const eng = voices.filter(v => v.lang.startsWith('en'));
    const rest = voices.filter(v => !v.lang.startsWith('en'));
    [...eng, ...rest].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.default) opt.selected = true;
      select.appendChild(opt);
    });
    // Set default voice
    if (eng.length) selectedVoice = eng[0];
  }

  /**
   * speak(text) — read text aloud if enabled and audio > 0
   */
  function speak(text) {
    if (!isEnabled || audioIntensity === 0 || !text) return;
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;
    utterance.pitch = 1.0;
    utterance.volume = Math.min(1, audioIntensity / 3 + 0.3);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') console.warn('TTS error:', e.error);
    };

    currentUtterance = utterance;
    synth.speak(utterance);
  }

  function stop() {
    if (synth.speaking || synth.pending) synth.cancel();
    currentUtterance = null;
  }

  function pause() { if (synth.speaking) synth.pause(); }
  function resume() { if (synth.paused) synth.resume(); }

  function setRate(rate) {
    ttsRate = parseFloat(rate) || 1.0;
  }

  function setVoice(voiceName) {
    selectedVoice = voices.find(v => v.name === voiceName) || null;
  }

  function setAudioIntensity(level) {
    audioIntensity = parseInt(level, 10);
    if (audioIntensity === 0) stop();
  }

  function setEnabled(enabled) {
    isEnabled = enabled;
    if (!enabled) stop();
    // Update button visual state
    const btn = document.getElementById('btn-tts-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.innerHTML = enabled
        ? '<i class="bi bi-volume-up-fill"></i>'
        : '<i class="bi bi-volume-mute"></i>';
    }
  }

  function toggle() {
    setEnabled(!isEnabled);
    return isEnabled;
  }

  /**
   * announceUI(message) — for screen-reader-style UI guidance
   */
  function announceUI(message) {
    if (audioIntensity < 2) return; // Only announce at higher audio levels
    speak(message);
  }

  function listVoices() { return voices; }
  function getEnabled() { return isEnabled; }

  // Init
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    _loadVoices();
  }

  return { speak, stop, pause, resume, setRate, setVoice, setAudioIntensity, setEnabled, toggle, announceUI, listVoices, getEnabled };
})();
