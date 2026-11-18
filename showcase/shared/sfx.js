// Shared Web Audio context for synthesised UI and handling sounds: one context, one compressor.
// (Weapon-fire synthesis was removed in Partisan Project v0.3.)
let ctx, out, noise;
function setup() {
  if (ctx) return;
  ctx = new AudioContext();
  out = ctx.createDynamicsCompressor();
  out.threshold.value = -10;
  out.ratio.value = 6;
  const level = ctx.createGain();
  level.gain.value = 0.5;
  out.connect(level).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function audio() {
  setup();
  ctx.resume();
  return {ctx, out, noise};
}
