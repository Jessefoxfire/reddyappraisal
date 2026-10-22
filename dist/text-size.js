(() => {
  const sizes = [90, 100, 110, 120];
  const key = 'reddy-text-size';
  const toggle = document.querySelector('#text-size-toggle');
  const panel = document.querySelector('#text-size-panel');
  const smaller = document.querySelector('#text-smaller');
  const larger = document.querySelector('#text-larger');
  const output = document.querySelector('#text-size-value');
  let size = 100;
  try {
    const saved = Number(localStorage.getItem(key));
    if (sizes.includes(saved)) size = saved;
  } catch { /* Reading controls also work when browser storage is unavailable. */ }
  function apply(save = true) {
    document.querySelector('#main').style.setProperty('--text-scale', size / 100);
    document.body.classList.toggle('text-enlarged', size > 100);
    output.textContent = `${size}%`;
    smaller.disabled = size === sizes[0];
    larger.disabled = size === sizes[sizes.length - 1];
    if (save) {
      try { localStorage.setItem(key, String(size)); } catch { /* Keep the current-page preference. */ }
    }
  }
  function close(restoreFocus = false) {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  smaller.addEventListener('click', () => { size = sizes[Math.max(0, sizes.indexOf(size) - 1)]; apply(); });
  larger.addEventListener('click', () => { size = sizes[Math.min(sizes.length - 1, sizes.indexOf(size) + 1)]; apply(); });
  document.querySelector('#text-reset').addEventListener('click', () => { size = 100; apply(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(true); });
  document.addEventListener('click', e => { if (!e.target.closest('.text-size-control')) close(); });
  apply(false);
})();
