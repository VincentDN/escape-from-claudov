/* SKS model (P6, the free loadout): one-piece wooden stock, fixed ten-round box, gas tube, folded bayonet, hooded front sight.
   Même contexte que 06k-modeles-base.js. Carabine Simonov : boîtier usiné sur une crosse en bois d'un seul tenant (poignée à demi
   pistolet, sans poignée rapportée), garde-main haut sur le tube à gaz, chargeur fixe de dix coups sous le boîtier (chargé par le
   dessus, cartouche par cartouche : info.tubeFed), canon nu, guidon dans son capuchon, hausse tangente sur son bloc devant le
   boîtier, baïonnette à lame repliée sous le canon. Prises des mains et ligne de mire aux cotes de l'AK-47 (06l-modeles-fusils.js). */
defineGun('sks', 'rifle', (c) => {
  const { g, M, info } = c;
  // boîtier usiné, couvercle et son bouton, levier d'armement sur la culasse (droite), sûreté derrière la détente
  prof(g, M.metal, [[-0.205, 0.062, 0.003], [0.046, 0.062, 0.004], [0.056, 0.05, 0.006], [0.056, 0.004, 0.004], [-0.205, 0.004, 0.003]], 0.038, 0, 0.003, 0.003);
  prof(g, M.metal, [[-0.12, 0.068, 0.003], [0.03, 0.068, 0.008], [0.05, 0.062, 0.003], [0.05, 0.058, 0.002], [-0.12, 0.058, 0.002]], 0.034, 0, 0.004, 0.004);
  cy(g, M.dark, 0, 0.064, 0.052, 0.004, 0.008);
  cy(g, M.metal, 0.026, 0.05, -0.06, 0.0042, 0.022, 0, 0, Math.PI / 2);
  part(g, new THREE.SphereGeometry(1, 8, 6), M.metal, 0.038, 0.05, -0.06, 0.0065, 0.0065, 0.0065);
  rb(g, M.dark, 0.0195, 0.052, -0.1, 0.0012, 0.014, 0.06, 0.0005);
  // hausse tangente : bloc devant le boîtier, planchette couchée à curseur, cran de mire (ligne de mire de l'AK-47)
  info.sightY = 0.088; info.adsZ = 0.012;
  const y = info.sightY, rz = -0.212, nw = ironW(c, rz, 0.05), sw = 0.011 - nw / 2;
  prof(g, M.metal, [[-0.27, 0.062, 0.003], [-0.205, 0.068, 0.003], [-0.205, 0.04, 0.003], [-0.27, 0.042, 0.003]], 0.03, 0, 0.003, 0.003);
  rb(g, M.dark, 0, 0.071, -0.236, 0.018, 0.008, 0.06, 0.0015);
  rb(g, M.dark, 0, 0.076, -0.245, 0.022, 0.006, 0.012, 0.0015);
  rb(g, M.dark, 0, 0.0785, rz, 0.022, 0.009, 0.008, 0.0015);
  for (const sx of [-1, 1]) bx(g, M.dark, sx * (nw / 2 + sw / 2), (0.0825 + y) / 2, rz, sw, y - 0.0825, 0.008);
  // crosse d'un seul tenant : garde-main bas sous le canon, lit du boîtier, poignée à demi pistolet, crosse à busc ; plaque de couche
  prof(g, M.wood, [[-0.43, 0.03, 0.006], [-0.272, 0.03, 0.003], [-0.272, 0.004, 0.002], [0.058, 0.004, 0.004], [0.075, 0.018, 0.008], [0.16, 0.027, 0.012],
    [0.31, 0.026, 0.004], [0.31, -0.098, 0.004], [0.135, -0.054, 0.014], [0.09, -0.078, 0.012], [0.048, -0.066, 0.008], [0.024, -0.026, 0.004],
    [-0.19, -0.016, 0.004], [-0.27, -0.012, 0.01], [-0.43, 0.002, 0.008]], 0.04, 0, 0.005, 0.005);
  rb(g, M.metal, 0, -0.036, 0.312, 0.04, 0.124, 0.006, 0.003);
  rb(g, M.metal, 0, 0.016, -0.36, 0.044, 0.036, 0.008, 0.004); // bague du garde-main
  part(g, G_TOR, M.metal, 0, -0.07, 0.24, 0.0065, 0.0065, 0.0065, 0, Math.PI / 2, 0); // grenadière
  // chargeur fixe de dix coups sous le boîtier, devant le pontet, à fond arrondi
  prof(g, M.metal, [[-0.19, -0.012, 0.002], [-0.182, -0.058, 0.012], [-0.09, -0.05, 0.01], [-0.084, -0.012, 0.002]], 0.03, 0, 0.003, 0.003);
  rb(g, M.dark, 0, -0.046, -0.136, 0.031, 0.004, 0.08, 0.0012, -0.08);
  // pontet, détente, sûreté (prise de l'AK-47)
  guard(g, M.metal, -0.072, 0.03, -0.006, -0.054, 0.005, 0.004, 0.009);
  rb(g, M.dark, 0, -0.026, -0.034, 0.006, 0.042, 0.006, 0.002, 0.18);
  rb(g, M.metal, 0, -0.04, 0.026, 0.006, 0.012, 0.008, 0.002);
  // garde-main haut sur le tube à gaz, tube et bloc de gaz jusqu'au canon
  prof(g, M.wood, [[-0.43, 0.066, 0.008], [-0.29, 0.07, 0.006], [-0.272, 0.064, 0.003], [-0.272, 0.044, 0.003], [-0.43, 0.044, 0.003]], 0.03, 0, 0.004, 0.005);
  cy(g, M.metal, 0, 0.056, -0.38, 0.0085, 0.2);
  rb(g, M.metal, 0, 0.044, -0.488, 0.018, 0.034, 0.024, 0.004);
  // canon nu jusqu'au guidon ; guidon sur son embase, dans son capuchon ouvert (le cercle encadre la pointe en visée)
  const tip = -0.7, fz = -0.676;
  cy(g, M.metal, 0, 0.032, -0.35, 0.0088, 0.29);
  cone(g, M.metal, 0, 0.032, (tip - 0.495) / 2, 0.0072, 0.0085, -0.495 - tip);
  rb(g, M.metal, 0, 0.048, fz, 0.016, 0.03, 0.026, 0.003);
  bx(g, M.sight, 0, (0.062 + y) / 2, fz, ironW(c, fz, IRON.post), y - 0.062, 0.004);
  cone(g, M.dark, 0, 0.077, fz, 0.0165, 0.0165, 0.018, 18, true);
  // baïonnette repliée : charnière sous le guidon, lame couchée sous le canon, pointe dans son logement du garde-main
  cy(g, M.metal, 0, 0.016, fz + 0.01, 0.0065, 0.024, 0, 0, Math.PI / 2);
  rb(g, M.metal, 0, 0.016, fz + 0.04, 0.014, 0.016, 0.05, 0.003);
  prof(g, M.steel, [[fz + 0.065, 0.022, 0.001], [-0.44, 0.022, 0.001], [-0.425, 0.014, 0.001], [-0.44, 0.008, 0.001], [fz + 0.065, 0.01, 0.001]], 0.004, 0, 0.0008, 0.0008);
  if (!c.A.muzzle) cy(g, M.dark, 0, 0.032, tip + 0.004, 0.0094, 0.008);
  info.butt = [0, -0.02, 0.315];
  // chargé par le dessus : la cartouche de 7,62 × 39 mm que pousse le pouce (pas de chargeur amovible)
  info.magHome.set(0, 0.07, -0.11);
  info.buildMag = (parent) => {
    part(parent, G_CYL, M.brass, 0, -0.01, 0, 0.0056, 0.039, 0.0056);
    cone(parent, M.brass, 0, 0.0155, 0, 0.0056, 0.0036, 0.013).rotation.set(0, 0, 0); // pointe vers le haut
  };
  info.magGrip = new V3(0, -0.03, 0);
  info.tubeFed = true; info.mag.visible = false;
  info.gripR.set(0, -0.05, 0.062); info.gripL.set(0, 0.02, -0.33);
  info.mount.muzzle = { x: 0, y: 0.032, z: tip, r: 0.0085 };
  info.mount.side = { x: -0.024, y: 0.02, z: -0.33 };
  info.muzzle.position.set(0, 0.032, tip - 0.01); info.eject.position.set(0.021, 0.056, -0.06);
  info.gripDef = {
    R: [{ c: [0, -0.07, 0.07], h: [0.019, 0.05, 0.026], r: 0.012, rx: -0.5 }, { c: [0, 0.01, -0.02], h: [0.02, 0.03, 0.1], r: 0.006 }],
    L: [{ c: [0, 0.02, -0.33], h: [0.024, 0.026, 0.09], r: 0.012 }, { c: [0, 0.057, -0.34], h: [0.016, 0.014, 0.08], r: 0.01 }],
  };
  info.trigDef = { at: [0.004, -0.04, -0.046], xTip: -0.004, guard: [{ c: [0, -0.0515, -0.02], h: [0.0045, 0.0025, 0.05], r: 0.002 }, { c: [0, -0.03, -0.0695], h: [0.0045, 0.024, 0.0025], r: 0.002 },
    { c: [0, -0.035, -0.137], h: [0.016, 0.024, 0.05], r: 0.006 }, { c: [0, -0.026, -0.034], h: [0.003, 0.021, 0.003], r: 0.002, rx: 0.18 }] };
});
