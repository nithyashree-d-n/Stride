/**
 * pomodoro.js — ADHD Focus Engine
 * State machine: IDLE → WORKING → BREAK → LONG_BREAK
 * Emits: sprint-complete, break-start, session-complete
 * Updates: Bootstrap progress bar, SVG ring, Pomodoro badge
 */

class PomodoroTimer {
  constructor() {
    this.STATES = { IDLE: 'idle', WORKING: 'working', BREAK: 'break', LONG_BREAK: 'long_break' };
    this.state = this.STATES.IDLE;
    this.sprintDuration = 15 * 60;  // seconds
    this.breakDuration = 5 * 60;
    this.longBreakDuration = 15 * 60;
    this.sprintsPerSession = 4;
    this.sprintsCompleted = 0;
    this.timeRemaining = this.sprintDuration;
    this.totalTime = this.sprintDuration;
    this._interval = null;

    // Milestone messages
    this.milestones = {
      25: { msg: '🚀 Great start! Keep going!', emoji: '🚀' },
      50: { msg: '🔥 Halfway there — you\'re crushing it!', emoji: '🔥' },
      75: { msg: '⚡ Almost done! One final push!', emoji: '⚡' },
      100: { msg: '🎉 Session complete! You did it!', emoji: '🎉' }
    };
  }

  /**
   * set duration settings (from settings panel)
   */
  configure(sprintMin, breakMin) {
    this.sprintDuration = sprintMin * 60;
    this.breakDuration = breakMin * 60;
    if (this.state === this.STATES.IDLE) {
      this.timeRemaining = this.sprintDuration;
      this.totalTime = this.sprintDuration;
      this._updateDisplay();
    }
  }

  start() {
    if (this._interval) return; // already running
    if (this.state === this.STATES.IDLE) {
      this.state = this.STATES.WORKING;
      this.timeRemaining = this.sprintDuration;
      this.totalTime = this.sprintDuration;
      THEME_ENGINE.setFocusMode(true);
    }
    this._updateBtnState('running');
    this._updateLabel();

    this._interval = setInterval(() => {
      this.timeRemaining--;
      this._updateDisplay();
      if (this.timeRemaining <= 0) this._onTimerEnd();
    }, 1000);

    // Update topbar badge active
    document.getElementById('pomodoro-badge')?.classList.add('active');
    TTS_ENGINE.announceUI('Focus session started. Distractions are now hidden.');
  }

  pause() {
    clearInterval(this._interval);
    this._interval = null;
    this._updateBtnState('paused');
  }

  reset() {
    clearInterval(this._interval);
    this._interval = null;
    this.state = this.STATES.IDLE;
    this.sprintsCompleted = 0;
    this.timeRemaining = this.sprintDuration;
    this.totalTime = this.sprintDuration;
    this._updateDisplay();
    this._updateBtnState('idle');
    this._updateLabel();
    this._updateSprintProgress();
    this._updateRing(0);
    THEME_ENGINE.setFocusMode(false);
    document.getElementById('pomodoro-badge')?.classList.remove('active', 'break');
    document.getElementById('sprint-milestone-msg').textContent = '';
  }

  // ── Private ──────────────────────────────

  _onTimerEnd() {
    clearInterval(this._interval);
    this._interval = null;

    if (this.state === this.STATES.WORKING) {
      this.sprintsCompleted++;
      this._updateSprintProgress();
      document.dispatchEvent(new CustomEvent('sprint-complete', { detail: { sprintsCompleted: this.sprintsCompleted } }));

      if (this.sprintsCompleted >= this.sprintsPerSession) {
        // Long break
        this.state = this.STATES.LONG_BREAK;
        this.timeRemaining = this.longBreakDuration;
        this.totalTime = this.longBreakDuration;
        document.dispatchEvent(new CustomEvent('session-complete'));
        this._showCelebration('🎉', this.milestones[100].msg);
        TTS_ENGINE.speak('Amazing work! You completed all four sprints. Take a 15-minute break — you earned it!');
        THEME_ENGINE.setFocusMode(false);
      } else {
        // Short break
        this.state = this.STATES.BREAK;
        this.timeRemaining = this.breakDuration;
        this.totalTime = this.breakDuration;
        document.dispatchEvent(new CustomEvent('break-start', { detail: { sprintsCompleted: this.sprintsCompleted } }));
        const pct = Math.round((this.sprintsCompleted / this.sprintsPerSession) * 100);
        const milestone = this._getNearestMilestone(pct);
        if (milestone) this._showCelebration(milestone.emoji, milestone.msg);
        TTS_ENGINE.speak(`Sprint ${this.sprintsCompleted} done! Take a 5-minute break.`);
      }
      document.getElementById('pomodoro-badge')?.classList.add('break');
      document.getElementById('pomodoro-badge')?.classList.remove('active');
      this._updateLabel();
      this.start(); // auto-start break
    } else if (this.state === this.STATES.BREAK || this.state === this.STATES.LONG_BREAK) {
      // Break ended — start next sprint
      this.state = this.STATES.WORKING;
      this.timeRemaining = this.sprintDuration;
      this.totalTime = this.sprintDuration;
      this._updateLabel();
      document.getElementById('pomodoro-badge')?.classList.remove('break');
      document.getElementById('pomodoro-badge')?.classList.add('active');
      THEME_ENGINE.setFocusMode(true);
      TTS_ENGINE.speak('Break over! Starting your next focus sprint now.');
      this.start();
    }
  }

  _updateDisplay() {
    const mins = String(Math.floor(this.timeRemaining / 60)).padStart(2, '0');
    const secs = String(this.timeRemaining % 60).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;

    const sidebarTimer = document.getElementById('sidebar-timer');
    const pomDisplay = document.getElementById('pomodoro-display');
    if (sidebarTimer) sidebarTimer.textContent = timeStr;
    if (pomDisplay) pomDisplay.textContent = timeStr;

    const progress = 1 - (this.timeRemaining / this.totalTime);
    this._updateRing(progress);
  }

  _updateLabel() {
    const labels = {
      idle: 'Ready',
      working: 'Focusing',
      break: 'Break!',
      long_break: 'Long Break'
    };
    const el = document.getElementById('pomodoro-label');
    if (el) el.textContent = labels[this.state] || 'Ready';
  }

  _updateBtnState(state) {
    const btn = document.getElementById('btn-pom-start');
    if (!btn) return;
    if (state === 'running') {
      btn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
      btn.onclick = () => this.pause();
    } else {
      btn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
      btn.onclick = () => this.start();
    }
  }

  _updateRing(fraction) {
    const circumference = 327; // 2*pi*52
    const ring = document.getElementById('pomodoro-ring-progress');
    if (!ring) return;
    const offset = circumference * (1 - fraction);
    ring.style.strokeDashoffset = offset;
    // Color change for break
    if (this.state === this.STATES.BREAK || this.state === this.STATES.LONG_BREAK) {
      ring.classList.add('break');
    } else {
      ring.classList.remove('break');
    }
  }

  _updateSprintProgress() {
    const pct = (this.sprintsCompleted / this.sprintsPerSession) * 100;
    const bar = document.getElementById('sprint-progress-bar');
    const container = bar?.parentElement;
    const label = document.getElementById('sprint-count-label');

    if (bar) bar.style.width = `${pct}%`;
    if (container) container.setAttribute('aria-valuenow', pct);
    if (label) label.textContent = `${this.sprintsCompleted} / ${this.sprintsPerSession}`;

    // Show milestone message
    const milestoneMsg = document.getElementById('sprint-milestone-msg');
    const nearest = this._getNearestMilestone(pct);
    if (milestoneMsg && nearest) milestoneMsg.textContent = nearest.msg;
  }

  _getNearestMilestone(pct) {
    for (const key of [25, 50, 75, 100]) {
      if (pct >= key) return this.milestones[key];
    }
    return null;
  }

  _showCelebration(emoji, msg) {
    const toast = document.getElementById('celebration-toast');
    const emojiEl = document.getElementById('celebration-emoji');
    const msgEl = document.getElementById('celebration-msg');
    if (!toast) return;
    if (emojiEl) emojiEl.textContent = emoji;
    if (msgEl) msgEl.textContent = msg;
    toast.removeAttribute('hidden');
    setTimeout(() => toast.setAttribute('hidden', ''), 3500);
  }
}

// Singleton instance — used by app.js
const POMODORO = new PomodoroTimer();
