// Original synthesised shot sounds for Test fire: no samples. Each shot is a noise crack, a low
// body thump and a filtered tail; the muzzle device shapes them (a suppressor cuts the crack and
// tail, a brake brightens and lengthens them).
const PROFILES={
 can:{crack:.18,cutoff:1400,body:.7,tail:.25,tailTime:.35},
 dtk1:{crack:1,cutoff:9000,body:.8,tail:.8,tailTime:1.1},
 brake:{crack:1,cutoff:8500,body:.9,tail:.75,tailTime:1},
 ak74:{crack:.95,cutoff:8000,body:.8,tail:.7,tailTime:1},
 comp:{crack:.9,cutoff:7000,body:.85,tail:.65,tailTime:.9},
 bare:{crack:.85,cutoff:6000,body:1,tail:.6,tailTime:.8}
};
let ctx,out,noise;
function setup(){
 if(ctx)return;
 ctx=new AudioContext();out=ctx.createDynamicsCompressor();out.threshold.value=-10;out.ratio.value=6;
 const level=ctx.createGain();level.gain.value=.5;out.connect(level).connect(ctx.destination);
 noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
// Shared with mech.js (handling and fitting sounds): one context, one compressor.
export function audio(){setup();ctx.resume();return {ctx,out,noise};}
function burst(t,{gain,type,freq,q=.7,attack=.001,decay}){
 const src=ctx.createBufferSource();src.buffer=noise;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);
 src.connect(f).connect(g).connect(out);src.start(t,Math.random());src.stop(t+attack+decay+.05);
}
export function shot(muzzle){
 setup();ctx.resume();
 const p=PROFILES[muzzle]||PROFILES.bare,t=ctx.currentTime+.01;
 burst(t,{gain:.9*p.crack,type:'lowpass',freq:p.cutoff,decay:.06});
 // Body: a falling sine thump.
 const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+.15);
 g.gain.setValueAtTime(p.body,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g).connect(out);o.start(t);o.stop(t+.25);
 burst(t+.01,{gain:.35*p.tail,type:'bandpass',freq:700,q:.5,attack:.01,decay:p.tailTime});
 // Mechanical clack of the action, the same for every muzzle device.
 burst(t+.045,{gain:.12,type:'highpass',freq:2500,decay:.03});
}

// Magazine handling: a dull release clack and a sharper seating click.
export function magOut(){setup();ctx.resume();const t=ctx.currentTime+.005;burst(t,{gain:.25,type:'bandpass',freq:1800,q:2,decay:.05});burst(t+.03,{gain:.12,type:'lowpass',freq:600,decay:.08});}
export function magIn(){setup();ctx.resume();const t=ctx.currentTime+.005;burst(t,{gain:.3,type:'highpass',freq:2200,decay:.035});burst(t+.06,{gain:.22,type:'bandpass',freq:1400,q:3,decay:.04});}
