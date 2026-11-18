// Neuro-Bash magazine proportions: preserve the feed-lip seat and width while restoring the side-profile length.
export function correctNeuroMagazines(root) {
  for (const [name, height] of [
    ['mag_25', 0.205],
    ['mag_40', 0.26],
  ]) {
    const mesh = root.getObjectByName(name);
    if (!mesh?.isMesh) continue;
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.userData = {...mesh.geometry.userData, shared: false};
    const g = mesh.geometry;
    g.computeBoundingBox();
    const {min, max} = g.boundingBox,
      ratio = height / (max.y - min.y),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, max.y + (p.getY(i) - max.y) * ratio);
    p.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
}
