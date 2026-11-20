/* L0 art style lab, image side: the lab's post-processing pass (retro, lens, colour), the procedural lens dirt, PS1 vertex snapping and
   nearest texture filtering. Nothing here runs unless the #artlab route (47-efc-artlab.js) creates it: normal play never gets the pass,
   a patched material or a changed texture. The pass is appended after the engine's finalPass, so it works on the finished display image. */

/* Fragment shader. Order: lens bulge (fisheye) -> pixelation -> chromatic aberration -> exposure, saturation, contrast -> lens dirt and
   spectral streak lit by the bloom -> shadow tint and ordered dither with posterisation -> vignette -> grain. With every dial neutral the
   result is the source pixel (the route then disables the pass altogether). */
const EFC_ART_FRAG = `
  uniform sampler2D tDiffuse, tBloom, tDirt, tMask;
  uniform vec4 uRS; uniform vec2 uRes; uniform vec3 uTint;
  uniform float uScale, uLevels, uDither, uDStr, uDCell, uTintAmt, uVm, uMaskOn, uFish, uAberr, uVig, uGrain, uDirt, uStreak, uBloomOn;
  uniform float uExpo, uCon, uSat, uSplit, uTime;
  varying vec2 vUv;
  ${RS_GLSL}
  vec3 src(vec2 u){ return texture2D(tDiffuse, rsUv(u, uRS)).rgb; }
  float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float bay2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bay4(vec2 a){ return bay2(0.5 * a) * 0.25 + bay2(a); }
  float bay8(vec2 a){ return bay4(0.5 * a) * 0.25 + bay2(a); }
  vec3 spec(float f){ return clamp(abs(fract(f * 0.8 + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
  // dither threshold 0..1 for this screen pixel: Bayer 2x2, 4x4, 8x8 in cells of uDCell pixels, or a 45-degree halftone dot screen
  // whose dot pitch is three cells
  float thresh(vec2 fc){
    vec2 p = fc / max(uDCell, 1.0);
    if (uDither < 1.5) return bay2(p);
    if (uDither < 2.5) return bay4(p);
    if (uDither < 3.5) return bay8(p);
    vec2 q = p / 3.0; q = vec2(q.x + q.y, q.x - q.y) * 0.7071;
    return clamp(length(fract(q) - 0.5) * 1.4142, 0.0, 0.999);
  }
  void main(){
    vec2 uv = vUv;
    if (uSplit > 0.5) {
      if (abs(uv.x - 0.5) * uRes.x < 1.0) { gl_FragColor = vec4(1.0); return; }
      if (uv.x < 0.5) { gl_FragColor = vec4(src(uv), 1.0); return; }
    }
    vec2 asp = vec2(uRes.x / uRes.y, 1.0), d = uv - 0.5;
    float r2 = dot(d * asp, d * asp) / dot(0.5 * asp, 0.5 * asp); // 0 at the centre, 1 in the corners
    vec2 uvL = uFish > 0.0 ? 0.5 + d * (1.0 + uFish * r2) / (1.0 + uFish) : uv;
    float keep = uMaskOn > 0.5 ? step(0.5, texture2D(tMask, uvL).r) * (1.0 - uVm) : 0.0; // viewmodel pixel kept out of the retro stage
    vec2 uvS = uvL;
    if (uScale < 0.999 && keep < 0.5) { vec2 vr = max(floor(uRes * uScale), vec2(1.0)); uvS = (floor(uvL * vr) + 0.5) / vr; }
    vec3 col;
    if (uAberr > 0.0) { vec2 ca = (uvS - 0.5) * uAberr * r2 * 0.025; col = vec3(src(uvS - ca).r, src(uvS).g, src(uvS + ca).b); }
    else col = src(uvS);
    if (uExpo != 1.0) col = pow(pow(max(col, 0.0), vec3(2.2)) * uExpo, vec3(1.0 / 2.2));
    if (uSat != 1.0) col = mix(vec3(luma(col)), col, uSat);
    if (uCon != 1.0) col = (col - 0.5) * uCon + 0.5;
    col = clamp(col, 0.0, 1.0);
    if (uDirt > 0.0 || uStreak > 0.0) {
      vec3 dt = texture2D(tDirt, uv).rgb; // r: specks, smudges and streaks; g: where the spectral streak catches
      float lit = luma(texture2D(tBloom, uvL).rgb) * uBloomOn * 1.5 + max(luma(col) - 0.72, 0.0) * 2.5;
      col += dt.r * lit * uDirt * vec3(1.0, 0.96, 0.9);
      if (uStreak > 0.0) {
        // spectral streak: bright light within a short horizontal reach is spread across the spectrum, as through a prism
        vec3 s = vec3(0.0);
        for (int i = 0; i < 12; i++) {
          float f = float(i) / 11.0;
          vec2 o = vec2((f - 0.5) * 0.11, 0.0);
          float b = max(luma(texture2D(tBloom, uvL + o).rgb) * uBloomOn - 0.12, 0.0);
          s += b * spec(f);
        }
        col += s * (uStreak * 0.5 * (0.3 + dt.g));
      }
    }
    if (keep < 0.5) {
      float l = luma(col), sh = uTintAmt * pow(1.0 - smoothstep(0.0, 0.42, l), 1.5);
      float amp = uDStr * mix(1.0, 0.4, smoothstep(0.6, 0.95, l)); // the dither is strongest in shadows and midtones
      bool dith = uDither > 0.5;
      float t = dith ? thresh(gl_FragCoord.xy) : 0.5;
      if (sh > 0.0) {
        // shadows go to the tint, not to black: as dots of the tint under the dither pattern, else as a smooth lift
        if (dith) col = t < sh * uDStr ? mix(col, uTint, 0.8) : mix(col, uTint, sh * 0.3);
        else col = mix(col, uTint, sh * 0.6);
      }
      if (uLevels < 255.5) { float L = uLevels - 1.0; col = floor(col * L + mix(0.5, t, dith ? amp : 0.0)) / L; }
    }
    col *= 1.0 - uVig * smoothstep(0.1, 1.0, r2);
    if (uGrain > 0.0) col += (fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uGrain * 0.2;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

/* Procedural lens dirt (no image asset): r = soft smudges, specks and short rain-like streaks; g = the band where the spectral streak
   catches. Seeded, so every session and every capture gets the same lens. */
function efcArtDirtTexture() {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), rnd = efcRng(0x1a2b3c);
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'lighter';
  const blob = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,0,0,${a})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  for (let i = 0; i < 14; i++) blob(rnd() * N, rnd() * N, 40 + rnd() * 110, 0.06 + rnd() * 0.1); // smudges
  for (let i = 0; i < 420; i++) blob(rnd() * N, rnd() * N, 0.8 + rnd() * rnd() * 4.5, 0.35 + rnd() * 0.6); // specks
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) { // short streaks, mostly downward like rain on the glass
    const x = rnd() * N, y = rnd() * N, len = 4 + rnd() * 22, a = Math.PI / 2 + (rnd() - 0.5) * 0.5;
    const gr = g.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(0.7, `rgba(255,0,0,${0.25 + rnd() * 0.45})`); gr.addColorStop(1, 'rgba(255,0,0,0.05)');
    g.strokeStyle = gr; g.lineWidth = 0.6 + rnd() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  for (let i = 0; i < 9; i++) { // greasy patches where the spectral streak shows best
    const x = rnd() * N, y = rnd() * N, r = 50 + rnd() * 90, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(0,255,0,${0.4 + rnd() * 0.5})`); gr.addColorStop(1, 'rgba(0,255,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

class EFCArtPass extends THREE.Pass {
  constructor() {
    super();
    // it draws to the screen: no buffer swap, so the composer's read/write alternation from frame to frame stays as the engine has it
    this.needsSwap = false;
    const v2 = () => ({ value: new THREE.Vector2(1, 1) }), f = (x) => ({ value: x });
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: f(null), tBloom: f(null), tDirt: f(efcArtDirtTexture()), tMask: f(null), uRS: RS.u, uRes: v2(), uTint: { value: new THREE.Color(0x1f2a55) },
        uScale: f(1), uLevels: f(256), uDither: f(0), uDStr: f(1), uDCell: f(1), uTintAmt: f(0), uVm: f(1), uMaskOn: f(0),
        uFish: f(0), uAberr: f(0), uVig: f(0), uGrain: f(0), uDirt: f(0), uStreak: f(0), uBloomOn: f(0),
        uExpo: f(1), uCon: f(1), uSat: f(1), uSplit: f(0), uTime: f(0),
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: EFC_ART_FRAG, depthTest: false, depthWrite: false,
    });
    this.mat.uniforms.uRS = RS.u; // shared with the engine (ShaderMaterial keeps the object we give it)
    this.quad = new THREE.FullScreenQuad(this.mat);
    this.maskRT = new THREE.WebGLRenderTarget(1, 1);
    this.maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.mat.uniforms.tMask.value = this.maskRT.texture;
    this.clear0 = new THREE.Color();
  }
  /* Viewmodel coverage, for 'Viewmodel gets the effect' off: the weapon scene drawn white on black with the engine's own camera */
  renderMask(renderer) {
    const rt = this.maskRT, w = Math.max(1, RS.w), h = Math.max(1, RS.h);
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    renderer.getClearColor(this.clear0);
    const ca = renderer.getClearAlpha(), sm = renderer.shadowMap.enabled, om = vmScene.overrideMaterial;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, false);
    vmScene.overrideMaterial = this.maskMat; renderer.shadowMap.enabled = false;
    try { renderer.render(vmScene, vmCamera); } finally { vmScene.overrideMaterial = om; renderer.shadowMap.enabled = sm; renderer.setClearColor(this.clear0, ca); }
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tBloom.value = bloomPass ? bloomPass.renderTargetsHorizontal[0].texture : null;
    u.uTime.value = (performance.now() / 1000) % 1000;
    renderer.getDrawingBufferSize(u.uRes.value);
    if (u.uMaskOn.value > 0.5) this.renderMask(renderer);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

/* ---------- PS1 vertex snapping: clip-space positions rounded to a coarse screen grid ----------
   Each material's vertex shader gets a uniform and two lines after <project_vertex> through onBeforeCompile (chained after the
   material's own hook, with its own program key kept). World and viewmodel materials use separate uniforms so the viewmodel toggle works.
   With the uniform at zero the shader output is unchanged. */
const EFC_ART_SNAP = { w: { value: new THREE.Vector3() }, v: { value: new THREE.Vector3() }, done: new WeakSet(), n: 0 };
const EFC_ART_SNAP_GLSL = `
  if (efcSnap.x > 0.5 && gl_Position.w > 0.0) { vec2 efcG = efcSnap.yz * 0.5; gl_Position.xy = floor(gl_Position.xy / gl_Position.w * efcG + 0.5) / efcG * gl_Position.w; }`;
function efcArtSnapPatch(m, u) {
  if (!m || m.isRawShaderMaterial || EFC_ART_SNAP.done.has(m)) return;
  EFC_ART_SNAP.done.add(m); EFC_ART_SNAP.n++;
  const ob = m.onBeforeCompile, ok = m.customProgramCacheKey, base = THREE.Material.prototype.customProgramCacheKey, obs = String(ob);
  m.onBeforeCompile = function (sh, r) {
    ob.call(this, sh, r);
    if (!sh.vertexShader.includes('#include <project_vertex>')) return;
    sh.uniforms.efcSnap = u;
    sh.vertexShader = 'uniform vec3 efcSnap;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + EFC_ART_SNAP_GLSL);
  };
  m.customProgramCacheKey = function () { return (ok === base ? obs : ok.call(this)) + '|efcSnap'; };
  m.needsUpdate = true;
}
function efcArtMaterials(sc, fn) {
  sc.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m && m.isMaterial) fn(m); });
}
/* Patches every material in the world and the viewmodel scenes, plus the depth prepass and the lab's own mask, so their depths agree */
function efcArtSnapAll(pass) {
  efcArtMaterials(vmScene, (m) => efcArtSnapPatch(m, EFC_ART_SNAP.v));
  efcArtMaterials(scene, (m) => efcArtSnapPatch(m, EFC_ART_SNAP.w));
  if (prePass && prePass.mat) efcArtSnapPatch(prePass.mat, EFC_ART_SNAP.w);
  if (ssaoPass && ssaoPass.normalMaterial) efcArtSnapPatch(ssaoPass.normalMaterial, EFC_ART_SNAP.w);
  if (pass) efcArtSnapPatch(pass.maskMat, EFC_ART_SNAP.v);
}

/* ---------- Texture filtering: nearest sampling set on the existing GL textures (no re-upload), original values kept to restore ---------- */
const EFC_ART_TEX = new Map(); // texture -> { min, mag, an }
const EFC_ART_MIPS = [THREE.NearestMipmapNearestFilter, THREE.NearestMipmapLinearFilter, THREE.LinearMipmapNearestFilter, THREE.LinearMipmapLinearFilter];
function efcArtGlFilter(gl, f) {
  const T = THREE;
  return { [T.NearestFilter]: gl.NEAREST, [T.NearestMipmapNearestFilter]: gl.NEAREST_MIPMAP_NEAREST, [T.NearestMipmapLinearFilter]: gl.NEAREST_MIPMAP_LINEAR,
    [T.LinearFilter]: gl.LINEAR, [T.LinearMipmapNearestFilter]: gl.LINEAR_MIPMAP_NEAREST, [T.LinearMipmapLinearFilter]: gl.LINEAR_MIPMAP_LINEAR }[f] ?? gl.LINEAR;
}
function efcArtTexSet(tex, min, mag, an) {
  tex.minFilter = min; tex.magFilter = mag; tex.anisotropy = an;
  const gt = renderer.properties.get(tex).__webglTexture; if (!gt) return; // not uploaded yet: the properties above apply at upload
  const gl = renderer.getContext();
  const target = tex.isDataArrayTexture || tex.isCompressedArrayTexture ? gl.TEXTURE_2D_ARRAY : tex.isData3DTexture ? gl.TEXTURE_3D : tex.isCubeTexture ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D;
  renderer.state.bindTexture(target, gt);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, efcArtGlFilter(gl, mag));
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, efcArtGlFilter(gl, min));
  const ext = renderer.extensions.get('EXT_texture_filter_anisotropic');
  if (ext) gl.texParameterf(target, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.max(1, an || 1));
}
function efcArtTexOf(m, out) {
  const add = (t) => { if (t && t.isTexture && !t.isRenderTargetTexture && !t.isDepthTexture && !t.isVideoTexture) out.add(t); };
  for (const k in m) { const v = m[k]; if (v && v.isTexture) add(v); }
  if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (Array.isArray(v)) v.forEach(add); else add(v); }
}
/* nearest: true sets nearest sampling on every texture of both scenes (mipmapped ones keep nearest mip levels); false restores them */
function efcArtTexFilter(nearest) {
  if (!nearest) { for (const [t, o] of EFC_ART_TEX) efcArtTexSet(t, o.min, o.mag, o.an); EFC_ART_TEX.clear(); return 0; }
  const all = new Set();
  for (const sc of [scene, vmScene]) efcArtMaterials(sc, (m) => efcArtTexOf(m, all));
  for (const t of all) {
    if (EFC_ART_TEX.has(t)) continue;
    EFC_ART_TEX.set(t, { min: t.minFilter, mag: t.magFilter, an: t.anisotropy });
    efcArtTexSet(t, EFC_ART_MIPS.includes(t.minFilter) ? THREE.NearestMipmapNearestFilter : THREE.NearestFilter, THREE.NearestFilter, 1);
  }
  return EFC_ART_TEX.size;
}
