// StG 44 (2044) bench: paint finishes with noise-driven wear; chamfers tagged in the model (aEdge) chip to bare steel first.
import * as THREE from 'three';

export const WEAR = {value: 0.45};
const NOISE = `
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .5*vn(p)+.25*vn(p*2.03)+.125*vn(p*4.1)+.0625*vn(p*8.3);}`;

// A PBR material whose paint chips to bare metal on chamfers (aEdge) and in noisy patches as WEAR rises.
export function finish(color, {rough = 0.62, metal = 0.15, bare = 0x8d8f92, chip = 1} = {}) {
  const m = new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal});
  m.onBeforeCompile = sh => {
    sh.uniforms.uWear = WEAR;
    sh.uniforms.uBare = {value: new THREE.Color(bare)};
    sh.uniforms.uChip = {value: chip};
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEdge;varying float vEdge;varying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge=aEdge;vObj=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uWear,uChip;uniform vec3 uBare;varying float vEdge;varying vec3 vObj;float wearK;${NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float nLo=fbm(vObj*38.),nHi=fbm(vObj*210.),streak=fbm(vObj*vec3(260.,18.,18.));
        float edge=vEdge*smoothstep(.25,.6,nHi+uWear*.55);
        float chipP=smoothstep(.70-.22*uWear,.78-.18*uWear,nLo)*smoothstep(.35,.6,nHi);
        wearK=clamp((edge*1.15+chipP*.55)*uWear*uChip*1.6,0.,1.);
        diffuseColor.rgb*=.74+.5*nLo;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.72,smoothstep(.55,.8,streak)*uWear*.6);
        diffuseColor.rgb=mix(diffuseColor.rgb,uBare*(.75+.4*nHi),wearK);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor*(.85+.3*nHi),.32+.2*nHi,wearK);',
      )
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.95,wearK);');
  };
  return m;
}

export const PALETTES = {
  feldgrau: {label: 'Feldgrau', body: 0x3c4638, furniture: 0x24282a},
  panzergrau: {label: 'Dark grey', body: 0x3a3d40, furniture: 0x232527},
  twotone: {label: 'Two-tone', body: 0x2f3336, furniture: 0x434e3d},
};
export function materials() {
  return {
    body: finish(PALETTES.feldgrau.body, {rough: 0.58, metal: 0.25}),
    furniture: finish(PALETTES.feldgrau.furniture, {rough: 0.78, metal: 0.02, bare: 0x5a5d5c, chip: 0.55}),
    steel: finish(0x1b1c1e, {rough: 0.42, metal: 0.85, bare: 0xa4a6a8}),
    black: finish(0x101112, {rough: 0.85, metal: 0.0, bare: 0x3a3a3a, chip: 0.3}),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x152a33,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.0,
      clearcoat: 1,
      reflectivity: 1,
    }),
    red: finish(0xb3231c, {rough: 0.6, metal: 0.0, bare: 0x2a2a2a, chip: 0.8}),
    amber: new THREE.MeshStandardMaterial({color: 0xffb030, emissive: 0xff8a10, emissiveIntensity: 0.6, roughness: 0.3}),
  };
}
export function applyPalette(mats, id) {
  const p = PALETTES[id] || PALETTES.feldgrau;
  mats.body.color.setHex(p.body);
  mats.furniture.color.setHex(p.furniture);
}
