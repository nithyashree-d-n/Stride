/**
 * breadcrumb.js — Linear Step-by-Step Navigation
 * Steps: Profile → Input → Learn → Review
 * Prevents backward navigation during active focus session
 */

const BREADCRUMB = (() => {
  const STEPS = [
    { id: 0, label: 'Profile' },
    { id: 1, label: 'Input' },
    { id: 2, label: 'Learn' },
    { id: 3, label: 'Review' }
  ];

  let currentStep = 0;

  function init(containerEl) {
    if (!containerEl) return;
    _render(containerEl);
  }

  function setStep(stepId) {
    currentStep = stepId;
    const container = document.getElementById('breadcrumb-container');
    if (container) _render(container);
  }

  function nextStep() { setStep(Math.min(STEPS.length - 1, currentStep + 1)); }
  function prevStep() { setStep(Math.max(0, currentStep - 1)); }
  function getCurrentStep() { return currentStep; }

  function _render(container) {
    const ol = document.createElement('ol');
    ol.className = 'adaptive-breadcrumb';
    ol.setAttribute('aria-label', 'Learning progress');

    STEPS.forEach((step, i) => {
      if (i > 0) {
        const sep = document.createElement('li');
        sep.className = 'breadcrumb-divider';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '›';
        ol.appendChild(sep);
      }

      const li = document.createElement('li');
      li.className = 'breadcrumb-step';
      if (i < currentStep) li.classList.add('done');
      else if (i === currentStep) li.classList.add('active');

      li.setAttribute('aria-current', i === currentStep ? 'step' : 'false');
      li.innerHTML = `
        <span class="breadcrumb-step-num" aria-hidden="true">${i < currentStep ? '✓' : i + 1}</span>
        <span class="breadcrumb-step-label">${step.label}</span>
      `;

      ol.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(ol);
  }

  return { init, setStep, nextStep, prevStep, getCurrentStep };
})();
