// Run with Node 22.15+ from Claudov: node tools/dev/efc/prepare-partisan-raid.mjs /path/to/partisan-project
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
if (!process.argv[2]) throw new Error('Supply the Partisan Project checkout path.');
const root = resolve(process.argv[2]);
const vendor = root + '/vendor/three/';
registerHooks({resolve(specifier, context, next) {
  if (specifier === '../shared/model-cache.js' || specifier === './model-cache.js') {
    return next('data:text/javascript,export const loadModel = url => globalThis.efcOfflineModel(url);', context);
  }
  if (specifier === './surface.js' && context.parentURL?.startsWith(pathToFileURL(root + '/workbench/').href)) {
    return next('data:text/javascript,export const paintSurface = () => {}; export const paintRetro = () => {};', context);
  }
  if (specifier === 'three') return next(pathToFileURL(vendor + 'build/three.module.min.js').href, context);
  if (specifier.startsWith('three/addons/')) return next(pathToFileURL(vendor + 'examples/jsm/' + specifier.slice(13)).href, context);
  return next(specifier, context);
}});
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, props) { this.type = type; Object.assign(this, props); } };
const T = await import('three');
const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
const {MeshoptDecoder} = await import('three/addons/libs/meshopt_decoder.module.js');
const {MODELS} = await import(root + '/workbench/models.js');
const {normalize, loadRifle, applySlotState} = await import(root + '/workbench/rifle-instance.js');
async function decode(file) {
  const src = await readFile(file);
  const jsonLength = src.readUInt32LE(12);
  const doc = JSON.parse(src.subarray(20,20 + jsonLength));
  const bin = 28 + jsonLength;
  doc.buffers[0].uri = 'data:application/octet-stream;base64,' + src.subarray(bin, bin + doc.buffers[0].byteLength).toString('base64');
  for (const m of doc.materials || []) {
    const legacy = m.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (legacy) m.pbrMetallicRoughness = {baseColorFactor:legacy.diffuseFactor};
    if (m.pbrMetallicRoughness) {
      delete m.pbrMetallicRoughness.baseColorTexture;
      delete m.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete m.emissiveTexture; delete m.normalTexture; delete m.occlusionTexture; delete m.extensions;
  }
  delete doc.textures; delete doc.images; delete doc.animations;
  doc.extensionsRequired = (doc.extensionsRequired || []).filter(x=>x !== 'KHR_materials_pbrSpecularGlossiness');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(JSON.stringify(doc),'');
  return gltf.scene;
}
const pendingModels = [];
globalThis.efcOfflineModel = url => {
  const path = fileURLToPath(url);
  if (!path.startsWith(root + '/assets/models/')) throw new Error('Unexpected Partisan model path: ' + path);
  const loaded = decode(path);
  pendingModels.push(loaded);
  return loaded;
};
async function load(config) {
  const scene = await decode(root + config.url.slice(2));
  const sockets = {};
  for (const [id, , point] of config.sockets) {
    const object = new T.Object3D();
    object.position.set(...point);
    scene.add(object);
    sockets[id] = object;
  }
  const holder = normalize(scene, config.scale, config.stretch);
  for (const [id, , point] of config.mounts || []) {
    const object = new T.Object3D();
    object.position.set(...point);
    holder.add(object);
    sockets[id] = object;
  }
  holder.rotation.y = Math.PI / 2;
  holder.updateMatrixWorld(true);
  return { holder, sockets };
}

const round = array => array.map(x => Math.round(x * 10000) / 10000);
const vector = new T.Vector3();
const prepare = value => value?.replaceAll(/[^A-Za-z0-9]/g, '').toLowerCase();
const result = {};
for (const [id, config] of Object.entries(MODELS)) {
  const { holder, sockets } = await load(config);
  const magazine = new Set((config.parts.find(({id}) => id === 'magazine')?.nodes || []).map(prepare));
  const claims = new Map(config.parts.flatMap(({id, nodes}) => nodes.map(name => [prepare(name), id])));
  const hidden = new Set(config.parts.flatMap(({id, nodes}) => {
    const visible = config.slots[id]?.factory[0]?.showNodes;
    return visible ? nodes.filter(node => !visible.includes(node)).map(prepare) : [];
  }));
  const groups = new Map(), grip = new T.Box3(), body = new T.Box3();
  const gripNodes = new Set((config.parts.find(({id}) => id === 'grip')?.nodes || []).map(prepare));
  holder.traverse(mesh => {
    if (!mesh.isMesh) return;
    const parents = [];
    for (let current = mesh; current && current !== holder; current = current.parent) parents.push(prepare(current.name));
    if (parents.some(name => hidden.has(name) || name?.includes('mag25red'))) return;
    const isMag = parents.some(name => magazine.has(name));
    const isGrip = parents.some(name => gripNodes.has(name));
    const color = (mesh.material.color || new T.Color(0x474b45)).getHex();
    const slot = isMag ? 'magazine' : parents.map(name => claims.get(name)).find(Boolean) || '';
    const key = slot + ':' + color;
    if (!groups.has(key)) groups.set(key, {slot, color, vertices: [], indices: []});
    const group = groups.get(key), offset = group.vertices.length / 3;
    const {index, attributes: {position}} = mesh.geometry;
    for (let i = 0; i < position.count; i++) {
      mesh.getVertexPosition(i, vector).applyMatrix4(mesh.matrixWorld);
      group.vertices.push(...vector.toArray().map(n => Math.round(n * 10000)));
      if (isGrip) grip.expandByPoint(vector);
      if (!isMag) body.expandByPoint(vector);
    }
    const length = index?.count ?? position.count;
    for (let i = 0; i < length; i++) group.indices.push(offset + (index ? index.getX(i) : i));
  });
  const mount = Object.fromEntries(Object.entries(sockets).map(([name, object]) => [name, round(object.getWorldPosition(vector).toArray())]));
  result[id] = {
    name: config.label, weight: config.baseGrams / 1000,
    bounds: [round(body.min.toArray()), round(body.max.toArray())], mount,
    grip: grip.isEmpty() ? null : round(grip.getCenter(vector).toArray()),
    compatible: Object.fromEntries(Object.entries(config.slots).map(([name, slot]) => [
      name, [...(slot.factory || []), ...(slot.library || [])].map(option => typeof option === 'string' ? option : option.id),
    ])),
    meshes: Array.from(groups.values(), ({slot, color, vertices, indices}) => {
      const wide = vertices.length / 3 > 65535;
      return [slot, color, Buffer.from(Int16Array.from(vertices).buffer).toString('base64'),
        Buffer.from((wide ? Uint32Array : Uint16Array).from(indices).buffer).toString('base64'), wide];
    }),
  };
  const triangles = Array.from(groups.values()).reduce((sum, g) => sum + g.indices.length / 3, 0);
  console.log(id, triangles, 'triangles', magazine.size, 'magazine nodes');
}
await writeFile('assets/raid-models/partisan.json', JSON.stringify(result) + '\n');


{
  const parts = {};
  const rotate = new T.Matrix4().makeRotationY(Math.PI / 2);
  for (const id of Object.keys(MODELS)) {
    const rifle = await loadRifle(id);
    pendingModels.length = 0;
    for (const [slot, entry] of Object.entries(rifle.slots)) {
      for (const option of entry.options) {
        if (option === entry.options[0] || /^(?:none|bare)$/.test(option.id)) continue;
        const key = slot + '/' + option.id + '/' + option.label;
        if (parts[key]) { parts[key].models.push(id); continue; }
        applySlotState(rifle, slot, option.id, 0);
        await Promise.all(pendingModels.splice(0));
        entry.container.updateWorldMatrix(true, true);
        const from = rotate.clone().multiply(entry.container.matrixWorld.clone().invert());
        const vertices = [], indices = [];
        entry.container.traverseVisible(mesh => {
          if (!mesh.isMesh) return;
          const offset = vertices.length / 3;
          const {index, attributes: {position}} = mesh.geometry;
          const trans = from.clone().multiply(mesh.matrixWorld);
          for (let i = 0; i < position.count; i++) {
            mesh.getVertexPosition(i, vector).applyMatrix4(trans);
            vertices.push(...vector.toArray().map(n => Math.round(n * 10000)));
          }
          for (let i = 0; i < (index?.count || position.count); i++) indices.push(offset + (index ? index.getX(i) : i));
        });
        if (!indices.length) continue;
        if (vertices.some(n => n < -32768 || n > 32767) || vertices.length / 3 > 65535) {
          console.warn('Part is above the packing budget:', key);
          continue;
        }
        parts[key] = {
          id: 'p' + createHash('sha1').update(key).digest('hex').slice(0, 9),
          slot, option: option.id, models: [id], name: option.label, weight: (option.grams || 100) / 1000,
          rounds: slot === 'magazine' ? option.rounds || Number(/\d+/.exec(option.label)?.[0]) || null : null,
          positions: Buffer.from(Int16Array.from(vertices).buffer).toString('base64'),
          indices: Buffer.from(Uint16Array.from(indices).buffer).toString('base64'),
        };
      }
    }
  }
  console.log('Attachment choices:', Object.keys(parts).length);
  await writeFile('assets/raid-models/partisan-parts.json', JSON.stringify(parts) + '\n');
}
