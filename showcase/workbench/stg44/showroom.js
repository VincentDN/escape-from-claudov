// Shared studio lighting and shadow floor for both weapon viewers.
import * as THREE from 'three';
import {floorTexture} from './floor.js';

export function addShowroom(scene, renderer) {
  renderer.toneMappingExposure = 1.05;
  scene.fog = new THREE.Fog(0x06080b, 2.2, 5.5);
  scene.environmentIntensity = 0.55;
  const key = new THREE.SpotLight(0xffe2bd, 38, 6, 0.5, 0.6, 1.4);
  key.position.set(-0.7, 1.5, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0x7fb4ff, 2.6);
  rim.position.set(1.2, 0.9, -1.6);
  const kick = new THREE.DirectionalLight(0xff9a5c, 0.7);
  kick.position.set(-1.5, -0.2, -0.6);
  const lights = new THREE.Group();
  lights.add(key, key.target, rim, kick, new THREE.HemisphereLight(0x8fa6c4, 0x0a0806, 0.35));
  scene.add(lights);
  const floorTex = floorTexture();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4, 48),
    new THREE.MeshStandardMaterial({map: floorTex, roughness: 0.92, metalness: 0}),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.34;
  floor.receiveShadow = true;
  scene.add(floor);
  return {floor, lights};
}
