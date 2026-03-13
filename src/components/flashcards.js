/**
 * flashcards.js — Flip-Card Deck Renderer
 * Keyboard accessible, animated, with dot-based navigation
 */

const FLASHCARD_COMPONENT = (() => {
  let cards = [];
  let currentIndex = 0;

  /**
   * render(cardsData, containerEl)
   * @param {Array<{front, back}>} cardsData
   * @param {HTMLElement} containerEl
   */
  function render(cardsData, containerEl) {
    cards = cardsData;
    currentIndex = 0;
    containerEl.innerHTML = '';

    if (!cards.length) {
      containerEl.innerHTML = '<p style="color:var(--text-muted)">No flashcards could be generated.</p>';
      return;
    }

    const deck = document.createElement('div');
    deck.className = 'flashcard-deck';

    // Header with navigation
    const header = document.createElement('div');
    header.className = 'flashcard-deck-header';
    header.innerHTML = `
      <div class="flashcard-deck-title">
        <i class="bi bi-card-text" style="color:var(--accent-primary)"></i>
        Flashcards <span style="color:var(--text-muted);font-weight:400">(${cards.length} cards)</span>
      </div>
      <div class="flashcard-nav">
        <button id="fc-prev" aria-label="Previous card"><i class="bi bi-chevron-left"></i></button>
        <span id="fc-counter">1 / ${cards.length}</span>
        <button id="fc-next" aria-label="Next card"><i class="bi bi-chevron-right"></i></button>
      </div>
    `;
    deck.appendChild(header);

    // Card scene
    const scene = document.createElement('div');
    scene.className = 'flashcard-scene';
    scene.setAttribute('role', 'button');
    scene.setAttribute('tabindex', '0');
    scene.setAttribute('aria-label', 'Flashcard — click or press Enter to flip');
    scene.innerHTML = `
      <div class="flashcard-inner" id="fc-inner">
        <div class="flashcard-face flashcard-front">
          <span class="flashcard-face-label">Question</span>
          <div class="flashcard-text" id="fc-front-text">${_esc(cards[0].front)}</div>
          <div class="flashcard-hint">Click to reveal answer</div>
        </div>
        <div class="flashcard-face flashcard-back">
          <span class="flashcard-face-label">Answer</span>
          <div class="flashcard-text" id="fc-back-text">${_esc(cards[0].back)}</div>
        </div>
      </div>
    `;
    deck.appendChild(scene);

    // Dot navigation
    const dots = document.createElement('div');
    dots.className = 'flashcard-progress';
    dots.setAttribute('aria-hidden', 'true');
    cards.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'flashcard-dot' + (i === 0 ? ' active' : '');
      dot.dataset.idx = i;
      dots.appendChild(dot);
    });
    deck.appendChild(dots);

    containerEl.appendChild(deck);

    // Events
    scene.addEventListener('click', _flip);
    scene.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _flip(); }
      if (e.key === 'ArrowRight') _navigate(1);
      if (e.key === 'ArrowLeft') _navigate(-1);
    });
    document.getElementById('fc-next')?.addEventListener('click', () => _navigate(1));
    document.getElementById('fc-prev')?.addEventListener('click', () => _navigate(-1));

    _updateDots();
  }

  function _flip() {
    const inner = document.getElementById('fc-inner');
    if (!inner) return;
    inner.classList.toggle('flipped');
    const isFlipped = inner.classList.contains('flipped');
    const scene = inner.closest('.flashcard-scene');
    scene?.setAttribute('aria-label', isFlipped ? 'Answer shown — press Enter to flip back' : 'Question shown — press Enter to flip');
    TTS_ENGINE.speak(isFlipped ? cards[currentIndex]?.back : cards[currentIndex]?.front);
  }

  function _navigate(dir) {
    const inner = document.getElementById('fc-inner');
    if (inner?.classList.contains('flipped')) inner.classList.remove('flipped');

    currentIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + dir));
    const frontEl = document.getElementById('fc-front-text');
    const backEl = document.getElementById('fc-back-text');
    const counter = document.getElementById('fc-counter');

    if (frontEl) frontEl.textContent = cards[currentIndex].front;
    if (backEl) backEl.textContent = cards[currentIndex].back;
    if (counter) counter.textContent = `${currentIndex + 1} / ${cards.length}`;
    _updateDots();
    TTS_ENGINE.speak(cards[currentIndex]?.front);
  }

  function _updateDots() {
    document.querySelectorAll('.flashcard-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function _esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render };
})();
