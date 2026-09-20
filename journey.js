/* Illustrative only: this demo never submits files, emails, or payments. */
(() => {
  const root = document.querySelector('.journey');
  if (!root) return;
  const steps = [
    ['DRAWING + REQUIREMENTS', 'Upload your drawing.', 'Choose the material, quantity and required delivery date.', 'bracket.step · 4 parts', 'Request sent ✓'],
    ['IN YOUR INBOX', 'Your quote arrives by email.', 'Review the price, manufacturing details and delivery timing.', 'BeRafiq · Manufacturing quote', 'Quote received ✓'],
    ['APPROVAL + PAYMENT', 'Approve your quote and pay.', 'Confirm the details and follow the payment instructions in your quote.', 'Quote approved · Order confirmed', 'Payment complete ✓'],
    ['PRODUCTION + DELIVERY', 'Your parts, delivered.', 'Your parts are manufactured, checked and delivered to your address.', '4 finished parts · Riyadh', 'Delivered ✓']
  ];
  const buttons = [...root.querySelectorAll('[data-journey-step]')];
  const preview = root.querySelector('.journey-preview');
  const toggle = root.querySelector('.journey-play');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fields = ['.journey-context', '.journey-title', '.journey-description', '.journey-detail', '.journey-badge'];
  let current = 0;
  let playing = !motion.matches;
  let visible = true;
  let timer;

  function render(manual = false) {
    // Announce user-requested changes, without repeatedly interrupting screen readers.
    preview.setAttribute('aria-live', manual ? 'polite' : 'off');
    fields.forEach((selector, i) => { root.querySelector(selector).textContent = steps[current][i]; });
    root.querySelector('.journey-count').textContent = `0${current + 1} / 04`;
    buttons.forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.parentElement.classList.toggle('is-complete', i < current);
    });
    preview.classList.remove('is-entering');
    if (!motion.matches) {
      void preview.offsetWidth;
      preview.classList.add('is-entering');
    }
  }

  function schedule() {
    window.clearTimeout(timer);
    toggle.textContent = playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} journey animation`);
    if (playing && visible && !document.hidden) {
      timer = window.setTimeout(() => {
        current = (current + 1) % steps.length;
        render();
        schedule();
      }, 3500);
    }
  }

  buttons.forEach((button, i) => button.addEventListener('click', () => {
    current = i;
    playing = false;
    render(true);
    schedule();
  }));
  toggle.addEventListener('click', () => { playing = !playing; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => { playing = !motion.matches; schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold: 0.1}).observe(root);
  }
  toggle.hidden = false;
  schedule();
})();
