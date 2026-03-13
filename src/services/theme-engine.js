/**
 * theme-engine.js — CSS Injection & Profile Manager
 * Reads comfort tags, applies CSS classes, persists to localStorage
 */

const THEME_ENGINE = (() => {
  const STORAGE_KEY = 'everway_student_profile';
  const BODY = document.body;

  const TAG_CLASS_MAP = {
    'dyslexic': 'profile-dyslexic',
    'adhd': 'profile-adhd',
    'sensory-sensitive': 'profile-sensory',
    'visual-learner': 'profile-visual',
    'autism-comfort': 'profile-autism',
    'slow-reader': 'profile-slow-reader'
  };

  // All classes we manage (to cleanly remove before re-applying)
  const ALL_PROFILE_CLASSES = Object.values(TAG_CLASS_MAP);
  const ALL_CONTRAST_CLASSES = ['contrast-soft', 'contrast-high'];
  const ALL_MOTION_CLASSES = ['motion-none', 'motion-reduced', 'motion-full'];

  let currentProfile = null;

  /**
   * applyProfile(tags[]) — adds CSS classes to <body>, updates tokens
   * @param {string[]} tags - array of comfort tags
   */
  function applyProfile(tags) {
    // Remove all existing profile classes first
    BODY.classList.remove(...ALL_PROFILE_CLASSES);

    tags.forEach(tag => {
      const cls = TAG_CLASS_MAP[tag];
      if (cls) BODY.classList.add(cls);
    });

    currentProfile = buildProfileObject(tags);
    _applyPreferencesToRoot(currentProfile.uiPreferences);
    return currentProfile;
  }

  /**
   * removeProfile(tag) — removes a single tag's class
   */
  function removeProfile(tag) {
    const cls = TAG_CLASS_MAP[tag];
    if (cls) BODY.classList.remove(cls);
    if (currentProfile) {
      currentProfile.comfortTags = currentProfile.comfortTags.filter(t => t !== tag);
    }
  }

  /**
   * saveProfile(profileObj) — persist to localStorage
   */
  function saveProfile(profileObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileObj));
    } catch (e) {
      console.warn('Profile save failed (storage quota?):', e);
    }
  }

  /**
   * loadProfile() — restore from localStorage, re-apply classes
   * Returns the profile object or null
   */
  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const profile = JSON.parse(raw);
      if (profile && Array.isArray(profile.comfortTags)) {
        applyProfile(profile.comfortTags);
        currentProfile = profile;
        // Restore sensory preferences
        if (profile.uiPreferences) {
          _applyPreferencesToRoot(profile.uiPreferences);
        }
        return profile;
      }
    } catch (e) {
      console.warn('Profile load failed:', e);
    }
    return null;
  }

  /**
   * updatePreference(key, value) — update a single UI pref and persist
   */
  function updatePreference(key, value) {
    if (!currentProfile) currentProfile = buildProfileObject([]);
    currentProfile.uiPreferences[key] = value;
    _applyPreferencesToRoot(currentProfile.uiPreferences);
    saveProfile(currentProfile);
  }

  /**
   * setAnimationLevel(level 0-3)
   */
  function setAnimationLevel(level) {
    BODY.classList.remove(...ALL_MOTION_CLASSES);
    const speeds = ['0s', '0.1s', '0.25s', '0.4s'];
    const intensities = [0, 0.3, 0.7, 1];
    document.documentElement.style.setProperty('--animation-speed', speeds[level]);
    document.documentElement.style.setProperty('--animation-intensity', intensities[level]);
    if (level === 0) BODY.classList.add('motion-none');
    else if (level === 1) BODY.classList.add('motion-reduced');
    else BODY.classList.add('motion-full');
    updatePreference('animationLevel', level);
  }

  /**
   * setContrastLevel(level 0-3)
   */
  function setContrastLevel(level) {
    BODY.classList.remove(...ALL_CONTRAST_CLASSES);
    if (level === 3) BODY.classList.add('contrast-high');
    else if (level === 0) BODY.classList.add('contrast-soft');
    updatePreference('contrastLevel', level);
  }

  /**
   * setFontSize(px) — updates --font-size-base token
   */
  function setFontSize(px) {
    document.documentElement.style.setProperty('--font-size-base', px + 'px');
    document.documentElement.style.fontSize = px + 'px';
    updatePreference('fontSize', px);
  }

  /**
   * setFocusMode(active) — for Focus Session
   */
  function setFocusMode(active) {
    if (active) {
      BODY.classList.add('focus-session-active');
      document.getElementById('workspace-sidebar')?.style.setProperty('display', 'none');
      document.getElementById('focus-overlay')?.removeAttribute('hidden');
    } else {
      BODY.classList.remove('focus-session-active');
      const sidebar = document.getElementById('workspace-sidebar');
      if (sidebar) sidebar.style.removeProperty('display');
      document.getElementById('focus-overlay')?.setAttribute('hidden', '');
    }
  }

  /**
   * getCurrentProfile() — returns current profile object
   */
  function getCurrentProfile() { return currentProfile; }

  // ── Private helpers ──────────────────────────────────

  function buildProfileObject(tags) {
    return {
      profileId: crypto.randomUUID?.() || Date.now().toString(36),
      createdAt: new Date().toISOString(),
      comfortTags: tags,
      uiPreferences: _defaultPrefsFromTags(tags),
      learningPreferences: _defaultLearningPrefs(tags),
      sessionHistory: []
    };
  }

  function _defaultPrefsFromTags(tags) {
    const prefs = {
      fontFamily: 'Inter',
      fontSize: 16,
      lineHeight: 1.65,
      bgColor: '#0e1117',
      animationsEnabled: true,
      highContrast: false,
      animationLevel: 2,
      contrastLevel: 1
    };
    if (tags.includes('dyslexic')) {
      prefs.fontFamily = 'OpenDyslexic';
      prefs.lineHeight = 1.9;
      prefs.fontSize = 17;
    }
    if (tags.includes('sensory-sensitive')) {
      prefs.animationsEnabled = false;
      prefs.animationLevel = 0;
      prefs.bgColor = '#0a0c10';
    }
    if (tags.includes('autism-comfort')) {
      prefs.animationsEnabled = false;
      prefs.animationLevel = 0;
    }
    if (tags.includes('slow-reader')) {
      prefs.fontSize = 19;
      prefs.lineHeight = 2.0;
    }
    return prefs;
  }

  function _defaultLearningPrefs(tags) {
    return {
      preferredContentMode: tags.includes('visual-learner') ? 'mindmap' : 'text',
      ttsEnabled: tags.includes('slow-reader'),
      ttsRate: 0.9,
      pomodoroEnabled: tags.includes('adhd'),
      sprintDurationMinutes: 15,
      breakDurationMinutes: 5
    };
  }

  function _applyPreferencesToRoot(prefs) {
    if (!prefs) return;
    if (prefs.fontSize) setFontSize(prefs.fontSize);
    if (prefs.animationLevel !== undefined) {
      const speeds = ['0s', '0.1s', '0.25s', '0.4s'];
      document.documentElement.style.setProperty('--animation-speed', speeds[prefs.animationLevel] || '0.3s');
    }
  }

  return {
    applyProfile,
    removeProfile,
    saveProfile,
    loadProfile,
    updatePreference,
    setAnimationLevel,
    setContrastLevel,
    setFontSize,
    setFocusMode,
    getCurrentProfile
  };
})();
