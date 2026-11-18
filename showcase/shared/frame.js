// External links leave the frame; everything else stays inside it so the music keeps playing.
addEventListener('click', e => {
  const a = /** @type {any} */ (e.target)?.closest?.('a[href]');
  if (a && /^https?:/.test(a.getAttribute('href')) && new URL(a.href).origin !== location.origin) a.target = '_top';
});
