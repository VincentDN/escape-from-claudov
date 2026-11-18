// Load shared attachment meshes into a canonical metre-based frame, with authored orientation and proportions.
import * as T from 'three';
import {loadModel} from '../shared/model-cache.js';

// Real (downloaded, CC0 / CC BY) attachment parts. Replace a code-built `build` with
//   build: glb('red-dot.glb', {position:[0,0,0], rotation:[0,0,0], scale:1})
// where the file lives in assets/models/attachments/ (import it with tools/assets/import-asset.py,
// add its budget to assets/register.json). Geometry arrives asynchronously into an empty group,
// so the slot works immediately and the part pops in when loaded. Units: metres in slot space
// (+x toward the muzzle, +y up, +z right side, origin at the mount point).
/** Every model file an attachment can come from, for prefetching (shared/model-cache.js). */
export const ATTACHMENT_FILES = new Set();
export const glb = (file, {position = [0, 0, 0], rotation = [0, 0, 0], scale = 1} = {}) => {
  ATTACHMENT_FILES.add(new URL(`../assets/models/attachments/${file}`, import.meta.url).href);
  return () => {
    const group = new T.Group();
    loadModel(new URL(`../assets/models/attachments/${file}`, import.meta.url).href).then(
      model => {
        model.position.set(...position);
        model.rotation.set(...rotation);
        model.scale.setScalar(scale);
        model.traverse(m => {
          if (m.isMesh) {
            m.castShadow = m.receiveShadow = true;
            m.material = m.material.clone();
          }
        });
        group.add(model);
        group.dispatchEvent({type: 'loaded'}); // rifle-instance.js repaints late parts (the retro MCX)
      },
      err => console.error(`attachment ${file} failed to load`, err),
    );
    return group;
  };
};

// A real part out of one of the downloaded Sketchfab files in assets/models/weapons/ (CC BY 4.0 / CC0, see the register).
//   file     the GLB; `nodes` picks some nodes out of a set (names as in the file, sanitised like the rifles' parts)
//   scale    metres per source unit (printed by the importer)
//   rotation Euler radians that lay the part's forward axis along +x, its up axis along +y
//   anchor   which point of the rotated part sits at the slot origin, per axis: 'min', 'max' or 'c' (centre)
//   offset   metres, added after anchoring
const nodeId = name => T.PropertyBinding.sanitizeNodeName(name);
export const real = (
  file,
  {nodes, scale = 1, rotation = [0, 0, 0], stretch = [1, 1, 1], anchor = ['min', 'c', 'c'], offset = [0, 0, 0]} = {},
) => {
  ATTACHMENT_FILES.add(new URL(`../assets/models/weapons/${file}`, import.meta.url).href);
  return () => {
    const group = new T.Group();
    loadModel(new URL(`../assets/models/weapons/${file}`, import.meta.url).href).then(
      src => {
        src.updateMatrixWorld(true);
        let part = src;
        if (nodes) {
          part = new T.Group();
          for (const n of nodes) {
            const found = src.getObjectByName(nodeId(n));
            if (found) part.attach(found);
          }
        }
        const wrap = new T.Group();
        wrap.add(part);
        wrap.rotation.set(...rotation);
        wrap.scale.setScalar(scale);
        const scaled = new T.Group();
        scaled.scale.set(...stretch);
        scaled.add(wrap);
        scaled.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(scaled);
        scaled.position.set(
          ...anchor.map(
            (a, i) =>
              (a === 'min'
                ? -box.min.getComponent(i)
                : a === 'max'
                  ? -box.max.getComponent(i)
                  : -(box.min.getComponent(i) + box.max.getComponent(i)) / 2) + offset[i],
          ),
        );
        wrap.traverse(m => {
          if (m.isMesh) {
            m.castShadow = m.receiveShadow = true;
            m.material = m.material.clone();
          }
        });
        group.add(scaled);
        group.dispatchEvent({type: 'loaded'});
      },
      err => console.error(`attachment ${file} failed to load`, err),
    );
    return group;
  };
};
// Forward is +z in most of the downloaded parts and -z in the AK kit; these turn either onto +x.
export const Z_FWD = [0, Math.PI / 2, 0];
export const Z_BACK = [0, -Math.PI / 2, 0];
