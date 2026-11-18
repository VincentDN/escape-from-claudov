// Every model file is fetched and parsed once per page; each use gets a clone that shares the parsed geometry and
// textures (cheap to make, nothing decoded twice). Shared geometry is marked `userData.shared`: dispose a clone's
// materials, never its geometry (see disposeModel).
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const parsed = new Map(); // url -> Promise<scene template>

/** Parse a GLB once (later calls share the promise); the template itself is never shown. */
export function loadTemplate(url) {
  if (!parsed.has(url))
    parsed.set(
      url,
      loader.loadAsync(url).then(gltf => {
        gltf.scene.traverse(o => o.isMesh && (o.geometry.userData.shared = true));
        return gltf.scene;
      }),
    );
  const p = parsed.get(url);
  p.catch(() => parsed.delete(url)); // a failed fetch can be retried
  return p;
}
/** A fresh copy of the file's scene to place, pose or take apart. */
export const loadModel = async url => (await loadTemplate(url)).clone(true);
/** Fetch and parse in the background, one file per idle moment, so the first use is instant. */
export function prefetchModels(urls) {
  if (navigator.connection?.saveData) return; // respect Data Saver
  const queue = [...urls];
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200));
  const next = () =>
    queue.length &&
    idle(
      () =>
        loadTemplate(queue.shift())
          .catch(() => {})
          .then(next),
      {timeout: 5000},
    );
  // only after the page has loaded: requests in flight before then hold the load event back
  if (document.readyState === 'complete') next();
  else addEventListener('load', next, {once: true});
}
/** Free what a clone owns: its materials, and geometry made for it (not the shared, parsed geometry). */
export function disposeModel(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.userData.shared) o.geometry.dispose();
    for (const m of [o.material].flat()) m.dispose();
  });
}
