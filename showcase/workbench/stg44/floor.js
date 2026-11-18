// StG 44 (2044) bench: the dusty floor texture, a pool of light fading to black with grit.
import * as THREE from 'three';

export function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d'),
    g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, '#3a3f45');
  g.addColorStop(0.45, '#15181c');
  g.addColorStop(1, '#06080b');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    x.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`;
    x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
