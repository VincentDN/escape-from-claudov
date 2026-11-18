// Mechanical handling sounds for the customiser and the workbench: original, synthesised live,
// no samples. Heavy steel is built from four ingredients:
//   ring(): modal synthesis. A struck metal part rings at a few inharmonic frequencies that each
//           die away at their own rate; sines with exponential envelopes, jittered a little so
//           no two hits are identical.
//   thump(): the body of the rifle, a falling low sine, so a part seats with weight.
//   scrape(): metal sliding on metal, band-passed noise with a moving centre and a grainy,
//           randomly modulated level.
//   tick(): a detent or ratchet click, a very short transient plus two high modes.
// They're combined into the actions below and played through a small, dark workshop room.
// Heavier parts (by grams) seat lower and louder.
import {audio} from './sfx.js';

// Real handling sounds shipped (2026-09-28): CC0 foley in sfx/cuts/ (see sfx/README.txt) plays
// once loaded, with the synthesis below as the fallback while it's loading or if it fails to
// fetch. Every call site in viewer.js and the workbench stays wired up either way.
export const ENABLED=true;

const rand=(a,b)=>a+Math.random()*(b-a),jit=(v,amount=.04)=>v*(1+rand(-amount,amount));
const at=()=>audio().ctx.currentTime+.01;
// Play a random take of `cls` from `lib` at time t; returns when it ends (t if there's no take).
function sample(lib,cls,t,gain=1){
 const list=lib?.[cls];if(!list?.length)return t;
 const {ctx,out}=audio(),buf=list[Math.floor(Math.random()*list.length)],src=ctx.createBufferSource(),g=ctx.createGain();
 src.buffer=buf;src.playbackRate.value=jit(1,.03);g.gain.value=gain*.88;src.connect(g).connect(out);src.start(t);
 return t+buf.duration/src.playbackRate.value;
}
// A bank of the same actions, built from whatever `lib()` returns (a getter, since it loads async).
function bank(lib){
 const s=(cls,t,gain)=>sample(lib(),cls,t,gain);
 const b={
  clunk:(w=.5)=>{s('clunk',at(),.7+.3*w);},
  latch:()=>{s('click',at());},
  railSlide:()=>s('slide',at()),
  railStep:()=>{s('click',at(),.8);},
  magazine:(w=.4,{out=true,in:seat=true}={})=>{let t=at();if(out)t=s('click',t)+.15;if(seat)s('click',s('clunk',t)-.02);},
  charge:()=>{s('long',at());},
  handle:(i=.5)=>{s('handle',at(),.5+.5*i);},
  setDown:()=>{s('hit',at());},
  file:()=>{s('slide',at(),.6);},
  tap:()=>{s('hit',at(),.5);},
  fit:(slot,option,previous)=>{
   const off=!option.grams&&/^(none|bare)$/.test(option.id);let t=at();
   switch(slot){
    case 'muzzle':if(previous&&!/^(bare|none)$/.test(previous.id))t=s('ratchet',t)+.1;if(!off)s('clunk',s('ratchet',t)-.03);break;
    case 'optic':case 'foregrip':case 'side':if(off){s('slide',s('click',t));break;}s('click',s('slide',t)-.02);break;
    case 'magazine':b.magazine(.5,{out:!!previous&&previous.id!=='none',in:!off});break;
    case 'grip':s('clunk',s('ratchet',t));break;
    case 'stock':if(off){s('slide',s('click',t));break;}s('click',s('clunk',s('slide',t)-.03));break;
    default:s('clunk',t);
   }
  }
 };
 return b;
}
// Load a class→takes manifest under `base`, returning null on any failure (offline, 404, …).
async function loadBank(base){
 const res=await fetch(new URL('manifest.json',base));if(!res.ok)return null;
 const manifest=await res.json(),{ctx}=audio(),loaded={};
 await Promise.all(Object.entries(manifest).map(async([cls,files])=>{
  loaded[cls]=(await Promise.all(files.map(f=>fetch(new URL(`${cls}/${f}`,base)).then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).catch(()=>null)))).filter(Boolean);
 }));
 return loaded;
}

// ---------- Recorded foley (shipped) ----------
// The 42-take shortlist (6 per class, see sfx/README.txt and sfx/reels/reel-00-shortlist.mp3)
// cut from CC0 recordings, classified the same way as the placeholder below: click, clunk,
// ratchet, slide, hit, handle, long. Lazily fetched on the first handling sound, ~1.5 MB total.
let foley=null,foleyLoad=null;
function ensureFoley(){return foleyLoad??=loadBank(new URL('../../assets/audio/foley/',import.meta.url)).then(b=>foley=b).catch(()=>{});}
const FOLEY=bank(()=>foley);

// ---------- Placeholder recordings ----------
// ?sfx=placeholder (remembered for the tab, so it carries through the workbench shell) plays
// recorded takes from ./placeholder-sfx/ instead of the shipped foley above. That folder holds
// sounds cut from a TLOU II workbench recording: git-ignored, never deployed, so on the live site
// the manifest 404s and nothing changes. Same manifest.json shape (class → files) as the foley.
const PLACEHOLDER=(()=>{try{
 if(new URLSearchParams(location.search).get('sfx')==='placeholder')sessionStorage.setItem('ak-sfx','placeholder');
 return sessionStorage.getItem('ak-sfx')==='placeholder';
}catch{return false;}})();
let takes=null;
if(PLACEHOLDER)loadBank(new URL('./placeholder-sfx/',import.meta.url)).then(b=>takes=b).catch(()=>{});
const PLACE=bank(()=>takes);
// The bank to use for the next sound: the placeholder override, else the shipped foley once
// loaded (kicking off its fetch on first use), else null so callers fall through to synthesis.
function active(){
 if(takes)return PLACE;
 if(foley)return FOLEY;
 ensureFoley();
 return null;
}
let room=null;
function bus(){
 const {ctx,out,noise}=audio();
 if(!room){
  // Short, damped room (0.5 s) plus a low shelf: a workbench in a stone hut, not a studio.
  const n=Math.floor(ctx.sampleRate*.5),ir=ctx.createBuffer(2,n,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n)**3*Math.exp(-i/n*3);}
  const verb=ctx.createConvolver();verb.buffer=ir;const damp=ctx.createBiquadFilter();damp.type='lowpass';damp.frequency.value=3200;
  const wet=ctx.createGain();wet.gain.value=.242;
  const shelf=ctx.createBiquadFilter();shelf.type='lowshelf';shelf.frequency.value=180;shelf.gain.value=5;
  const dry=ctx.createGain();dry.gain.value=.99;
  const input=ctx.createGain();input.connect(shelf).connect(dry).connect(out);shelf.connect(verb).connect(damp).connect(wet).connect(out);
  room={input};
 }
 return {ctx,noise,input:room.input};
}
function env(ctx,g,t,peak,attack,decay){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);}
function panned(ctx,input,pan){const p=ctx.createStereoPanner();p.pan.value=pan;p.connect(input);return p;}

// ---------- Ingredients ----------
function ring(t,{modes,gain=.2,pan=0}){
 const {ctx,input}=bus(),dest=panned(ctx,input,pan);
 for(const [freq,decay,level=1] of modes){
  const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=jit(freq);
  env(ctx,g,t,gain*level,.0015,jit(decay,.15));o.connect(g).connect(dest);o.start(t);o.stop(t+decay*1.3+.05);
 }
}
function thump(t,{from=140,to=55,gain=.5,decay=.16,pan=0}){
 const {ctx,input}=bus(),o=ctx.createOscillator(),g=ctx.createGain();
 o.type='sine';o.frequency.setValueAtTime(jit(from),t);o.frequency.exponentialRampToValueAtTime(to,t+decay*.8);
 env(ctx,g,t,gain,.003,decay);o.connect(g).connect(panned(ctx,input,pan));o.start(t);o.stop(t+decay+.05);
}
function transient(t,{freq=3000,type='highpass',gain=.3,decay=.012,q=.7,pan=0}){
 const {ctx,noise,input}=bus(),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
 s.buffer=noise;f.type=type;f.frequency.value=jit(freq);f.Q.value=q;env(ctx,g,t,gain,.0008,decay);
 s.connect(f).connect(g).connect(panned(ctx,input,pan));s.start(t,Math.random());s.stop(t+decay+.03);
}
function scrape(t,{dur=.18,from=1600,to=2600,gain=.12,q=3,pan=0}){
 const {ctx,noise,input}=bus(),s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),grain=ctx.createGain();
 s.buffer=noise;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(jit(from),t);f.frequency.exponentialRampToValueAtTime(jit(to),t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+dur*.2);g.gain.setValueAtTime(gain,t+dur*.75);g.gain.linearRampToValueAtTime(0,t+dur);
 // Grain: the level stutters as the surfaces catch and release.
 for(let k=0,step=.012;k*step<dur;k++)grain.gain.setValueAtTime(rand(.35,1),t+k*step);
 s.connect(f).connect(grain).connect(g).connect(panned(ctx,input,pan));s.start(t,Math.random());s.stop(t+dur+.02);
}
function tick(t,{pitch=1,gain=.25,pan=0}={}){
 transient(t,{freq:4200*pitch,gain:gain*1.3,decay:.006,pan});
 ring(t,{modes:[[3100*pitch,.035],[5300*pitch,.02,.6],[1250*pitch,.05,.35]],gain:gain*.6,pan});
}

// ---------- Actions ----------
const now=()=>audio().ctx.currentTime+.01;
// weight: 0 (a few grams) … 1 (≈ 1 kg). Heavier parts thump lower and louder.
const heft=grams=>Math.min(1,Math.max(0,(grams||150)/900));

// A part seating home: transient, low body thump and the steel ringing briefly.
export function clunk(weight=.5,t=now(),pan=0){const b=active();if(b)return b.clunk(...arguments);if(!ENABLED)return;
 transient(t,{freq:1500,type:'lowpass',gain:.35+.25*weight,decay:.02,pan});
 thump(t,{from:150-50*weight,to:48,gain:.36+.32*weight,decay:.14+.1*weight,pan});
 ring(t,{modes:[[jit(230-60*weight),.22],[jit(540-90*weight),.16,.7],[jit(960),.1,.6],[jit(1720),.07,.5],[jit(2890),.045,.35]],gain:.15+.08*weight,pan});
}
// A spring latch snapping shut: sharp, bright and short.
export function latch(t=now(),pan=0){const b=active();if(b)return b.latch(...arguments);if(!ENABLED)return;
 tick(t,{pitch:jit(1),gain:.3,pan});
 ring(t+.004,{modes:[[1150,.08],[2630,.06,.7],[4100,.035,.5]],gain:.13,pan});
 thump(t,{from:220,to:120,gain:.15,decay:.05,pan});
}
// Sliding along a rail, clicking over the rail slots, then clamping.
export function railSlide(t=now(),{slots=3,dur=.22,pan=0}={}){const b=active();if(b)return b.railSlide(...arguments);if(!ENABLED)return;
 scrape(t,{dur,from:1400,to:2400,gain:.1,pan});
 for(let i=1;i<=slots;i++)tick(t+dur*i/(slots+1),{pitch:jit(.9,.06),gain:.13,pan});
 return t+dur;
}
// One rail slot: a firm detent, slightly different each time.
export function railStep(dir=1){const b=active();if(b)return b.railStep(...arguments);if(!ENABLED)return;const t=now();scrape(t,{dur:.07,from:dir>0?1800:2400,to:dir>0?2400:1800,gain:.06});tick(t+.06,{pitch:jit(1.05,.05),gain:.28});thump(t+.06,{from:180,to:110,gain:.12,decay:.05});}
// Threading on (or off): a run of ratchet ticks that speed up, over a thin scrape.
function thread(t,{turns=7,dur=.5,on=true,pan=0}={}){
 scrape(t,{dur,from:on?2200:2800,to:on?2800:2200,gain:.05,q:5,pan});
 for(let i=0;i<turns;i++){const u=i/turns,at=t+dur*(on?1-(1-u)**1.4:u**1.4);tick(at,{pitch:jit(.8,.05),gain:.16+.06*u,pan});}
 return t+dur;
}
// Screws being run down: a few tight clicks.
function screw(t,{n=4,pan=0}={}){for(let i=0;i<n;i++)tick(t+i*.055,{pitch:jit(1.3,.04),gain:.12,pan});return t+n*.055;}
// Magazine: release paddle, the old mag coming out, the new one rocked in and latched.
export function magazine(weight=.4,{out=true,in:seat=true}={}){const b=active();if(b)return b.magazine(...arguments);if(!ENABLED)return;
 let t=now();
 if(out){latch(t);scrape(t+.02,{dur:.12,from:900,to:600,gain:.07});t+=.28;}
 if(seat){scrape(t,{dur:.14,from:700,to:1000,gain:.07,q:2});clunk(.3+.5*weight,t+.13);latch(t+.16);}
}
// Charging handle: pulled to the rear against the spring, released, the bolt slamming home.
export function charge(){const b=active();if(b)return b.charge(...arguments);if(!ENABLED)return;
 const t=now();
 tick(t,{pitch:.8,gain:.2});scrape(t,{dur:.13,from:1100,to:2100,gain:.13,q:2.5});
 ring(t+.13,{modes:[[1800,.05],[3400,.03,.6]],gain:.06});thump(t+.13,{from:260,to:140,gain:.18,decay:.05});// hits the rear
 const home=t+.36;scrape(home-.07,{dur:.07,from:2100,to:1200,gain:.12,q:2});
 clunk(.9,home);latch(home+.012);
 ring(home,{modes:[[410,.35],[1230,.25,.6],[2470,.18,.4]],gain:.05});// the receiver rings on
}
// Picking the rifle up or turning it in the hands: sling swivel and parts settling. Quiet.
export function handle(intensity=.5){const b=active();if(b)return b.handle(...arguments);if(!ENABLED)return;
 const t=now(),n=1+Math.round(rand(0,2)*intensity);
 for(let i=0;i<n;i++)tick(t+rand(0,.08),{pitch:rand(.55,.8),gain:.1+.12*intensity,pan:rand(-.4,.4)});
 transient(t,{freq:700,type:'lowpass',gain:.12*intensity,decay:.05});
 thump(t,{from:170,to:110,gain:.08*intensity,decay:.06});
}
// The rifle set down on the bench: wood knock, body thump, a small rattle.
export function setDown(){const b=active();if(b)return b.setDown(...arguments);if(!ENABLED)return;
 const t=now();
 thump(t,{from:110,to:45,gain:.7,decay:.22});
 ring(t,{modes:[[175,.12],[395,.09,.7],[690,.06,.5]],gain:.12});// the table
 transient(t,{freq:1200,type:'lowpass',gain:.4,decay:.03});
 for(let i=0;i<3;i++)tick(t+.03+i*rand(.03,.06),{pitch:rand(.6,.9),gain:.08});
}
// A file drawn across the steel (wear): gritty scrape.
export function file(){const b=active();if(b)return b.file(...arguments);if(!ENABLED)return;scrape(now(),{dur:rand(.08,.13),from:3500,to:2600,gain:.16,q:1.2});}
// Finish: a light tap as the part is turned under the brush.
export function tap(){const b=active();if(b)return b.tap(...arguments);if(!ENABLED)return;const t=now();tick(t,{pitch:.7,gain:.12});thump(t,{from:200,to:130,gain:.1,decay:.05});}

// Fitting a part to a slot (or taking it off). Each slot has its own mechanism.
export function fit(slot,option,previous){const b=active();if(b)return b.fit(...arguments);if(!ENABLED)return;
 const off=!option.grams&&/^(none|bare)$/.test(option.id),w=heft(option.grams||previous?.grams);
 let t=now();
 switch(slot){
  case 'muzzle':
   if(previous&&!/^(bare|none)$/.test(previous.id))t=thread(t,{on:false,turns:6,dur:.42})+.08;
   if(!off){t=thread(t,{on:true,turns:8,dur:.55});clunk(w,t);}
   break;
  case 'optic':case 'foregrip':case 'side':
   if(off){latch(t);scrape(t+.03,{dur:.16,from:2200,to:1300,gain:.08});thump(t+.03,{from:180,to:100,gain:.12,decay:.06});break;}
   t=railSlide(t,{slots:slot==='optic'?4:3,dur:slot==='optic'?.26:.2});clunk(w*.8,t);latch(t+.07);if(slot==='optic')screw(t+.2,{n:3});
   break;
  case 'magazine':magazine(w,{out:!!previous&&previous.id!=='none',in:!off});break;
  case 'grip':t=screw(t,{n:3});clunk(.4,t+.04);break;
  case 'stock':
   if(off){latch(t);scrape(t+.02,{dur:.2,from:1600,to:900,gain:.1});thump(t+.04,{from:160,to:80,gain:.25,decay:.1});break;}
   scrape(t,{dur:.16,from:900,to:1500,gain:.1});clunk(.7+.3*w,t+.15);latch(t+.17);
   break;
  default:clunk(w,t);latch(t+.05);
 }
}
