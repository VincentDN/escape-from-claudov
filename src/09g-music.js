/* ==========================================================================
   MUSIQUE DES MENUS
   Le thème (dist/music/menu-theme.<condensat>.ogg, à côté du HTML ; voir build.py) joue dans les menus principaux et s'éteint en
   fondu dès le lancement d'une partie (écran de chargement, choix de la classe compris ; il revient si on annule). Au retour d'une
   partie il repart du début de la piste. Ni la pause, ni les résultats n'ont de musique.
   Le fichier n'est pas dans le HTML : il n'est téléchargé (en flux) que quand les menus sont affichés. Il boucle sans claquement :
   deux lecteurs du même fichier se relaient en fondu enchaîné au point de boucle (efcLoopNew, src/efc/46-efc-music.js).
   S'il manque, le jeu est simplement silencieux. MUS.off (service music:menu, pour la radio de l'établi) coupe le thème.
   Le volume est Musique x Volume général (Options, Audio).
   ========================================================================== */
const MUS = { el: null, url: '', vol: 0, dead: false, off: false };
const MUS_FADE_IN = 1.2, MUS_FADE_OUT = 3.5; // vitesses de fondu (par seconde)

function efcMenuTrack() {
  return Object.hasOwn(EFC_MENU_TRACKS, Settings.menuTrack) ? Settings.menuTrack : 'menu-theme';
}

function efcMenuTrackChange() {
  const m = document.querySelector('meta[name="menu-music"]');
  const url = efcMusicUrl(efcMenuTrack()) || m?.content || '';
  if (MUS.url === url) return;
  efcLoopStop(MUS.el);
  Object.assign(MUS, { url, el: null, vol: 0, dead: !url });
}

function musicInit() {
  efcMenuTrackChange();
  // le navigateur n'autorise le son qu'après un geste : le premier clic ou la première touche relance la lecture
  // (Safari sur iPhone n'accepte la lecture que dans un geste complet : on relance aussi à la fin du toucher et au clic, directement dans le geste)
  const unlock = () => { if (!MUS.el) return; MUS.el.blocked = false; if (MATCH.state === 'menu' && !MUS.off) efcLoopPlay(MUS.el); };
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, unlock, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && MUS.el) efcLoopPause(MUS.el); });
}
/* Retour au menu principal (partie quittée ou terminée) : le thème repart du début de la piste, en fondu */
function musicRestart() {
  MUS.vol = 0;
  if (!MUS.el) return;
  MUS.el.vol = 0; efcLoopRewind(MUS.el);
}
/* Appelée à chaque image de la boucle de jeu */
function musicTick(dt) {
  const M = MUS; if (M.dead) return;
  const want = MATCH.state === 'menu' && !UI.flow && !document.hidden && !M.off; // le lancement d'une partie (chargement compris) coupe la musique
  const target = want ? clamp(Settings.music * Settings.volume, 0, 1) : 0;
  M.vol += (target - M.vol) * Math.min(1, dt * (target > M.vol ? MUS_FADE_IN : MUS_FADE_OUT));
  if (!M.el) {
    if (!want || target <= 0) return;
    M.el = efcLoopNew(M.url, null);
  }
  if (M.el.dead) { M.dead = true; return; }
  if (want && target > 0 && !M.el.playing) efcLoopPlay(M.el);
  M.el.vol = clamp(M.vol, 0, 1);
  efcLoopTick(M.el);
  if (!want && M.vol < 0.003 && M.el.playing) efcLoopPause(M.el);
}
