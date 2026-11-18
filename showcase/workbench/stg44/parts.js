// StG 44 (2044) bench: the slot catalogue. Rail parts are the Weapon Workbench's real attachment models; stocks and magazines are nodes of the rifle.
import {real, Z_FWD} from '../attachment-model.js';
import {buildScope} from '../attachment-mounts.js';

const S = 0.103763; // metres per unit in the shared attachment sets
const ON_TOP = ['c', 'min', 'c'],
  UNDER = ['c', 'max', 'c'],
  ON_SIDE = ['c', 'c', 'min'];
const none = label => ({id: 'none', label, grams: 0, len: 0, build: () => null});

// id, label, grams (handling-sound weight), len (length kept on the rail), build(M) or `show` (a rifle node prefix;
// an option whose nodes the current rifle lacks is greyed out)
export const SLOTS = {
  optic: {
    label: 'Optic',
    options: [
      {
        id: 'reddot',
        label: 'Micro red dot',
        grams: 130,
        len: 0.06,
        build: real('collimator-set.glb', {nodes: ['holosun_403r_1'], scale: S, anchor: ON_TOP}),
      },
      {
        id: 'holo',
        label: 'Holographic sight',
        grams: 320,
        len: 0.09,
        build: real('eotech.glb', {scale: 1.0, rotation: Z_FWD, anchor: ON_TOP}),
      },
      {id: 'scope', label: '4× scope in rings', grams: 460, len: 0.2, build: M => buildScope({materials: {'h-190': M.steel}})},
      none('Iron sights only'),
    ],
  },
  laser: {
    label: 'Laser',
    options: [
      {id: 'peq15', label: 'Aiming laser / illuminator', grams: 210, len: 0.11, build: real('peq15.glb', {scale: S, anchor: ON_TOP})},
      {id: 'peq2', label: 'Laser, older pattern', grams: 250, len: 0.12, build: real('peq2.glb', {scale: S, anchor: ON_TOP})},
      none('None'),
    ],
  },
  light: {
    label: 'Weapon light',
    options: [
      {
        id: 'scout',
        label: 'Weapon light',
        grams: 110,
        len: 0.09,
        build: real('light-surefire.glb', {
          scale: 0.00638423,
          rotation: [-Math.PI / 2, -Math.PI / 2, 0],
          stretch: [0.7, 1.4, 1.4],
          anchor: ON_SIDE,
        }),
      },
      none('None'),
    ],
  },
  under: {
    label: 'Underbarrel',
    options: [
      {
        id: 'angled',
        label: 'Angled foregrip',
        grams: 110,
        len: 0.1,
        build: real('grip-afg.glb', {nodes: ['normal_0'], scale: 0.9, rotation: Z_FWD, anchor: UNDER}),
      },
      {
        id: 'vertical',
        label: 'Vertical grip',
        grams: 150,
        len: 0.05,
        build: real('grip-rvg.glb', {scale: 1.46184, rotation: Z_FWD, anchor: UNDER}),
      },
      {
        id: 'bipod',
        label: 'Folding bipod',
        grams: 320,
        len: 0.12,
        build: real('g3-bipod.glb', {scale: 0.995917, rotation: [0, Math.PI / 2, 0], anchor: UNDER}),
      },
      none('Bare rail'),
    ],
  },
  muzzle: {
    label: 'Muzzle',
    options: [
      {id: 'brake', label: "The rifle's own muzzle device", grams: 90, show: 'muzzle_'},
      {
        id: 'supp',
        label: 'Sound suppressor',
        grams: 540,
        build: real('muzzle-set.glb', {nodes: ['sil_556m_8'], scale: S, anchor: ['min', 'c', 'c']}),
      },
      {id: 'none', label: 'Bare muzzle', grams: 0, build: () => null},
    ],
  },
  stock: {
    label: 'Stock',
    slide: {range: [0, 0.06], start: 0.03, label: 'Length of pull', only: 'adjustable'},
    options: [
      {id: 'fixed', label: 'Fixed polymer stock', grams: 380, show: 'stock_fixed'},
      {id: 'adjustable', label: 'Haenel adjustable, model 2043', grams: 330, show: 'stock_adj'},
    ],
  },
  mag: {
    label: 'Magazine',
    options: [
      {id: 'kurz25', label: '25 rounds, 7.92×33 Kurz', grams: 420, show: 'mag_25'},
      {id: 'kurz40', label: '40 rounds, extended', grams: 610, show: 'mag_40'},
    ],
  },
};
export const DEFAULT_BUILD = {
  optic: 'reddot',
  laser: 'peq15',
  light: 'scout',
  under: 'angled',
  muzzle: 'brake',
  stock: 'fixed',
  mag: 'kurz25',
};
export const optionOf = (slot, id) => SLOTS[slot].options.find(o => o.id === id) || SLOTS[slot].options[0];
