// Workbench intro: an over-the-shoulder opening shot in the style of The Last of Us Part II's
// workbench. The operator from the AK customiser leans over a table with the rifle lying flat,
// hands on it. "Load all demos" pushes the camera down onto the Nokia beside it, fades to black and hands
// over to the index (menu/), the same phone close up with every demo on its screen.
// Scene space: operator's feet on y=0 facing +z, right side -x (see operator.js); meters.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {MODELS,DEFAULT_MODEL} from './ak15-weapon-customiser/models.js';
import {DEFAULT_OPERATOR,buildOperator} from './ak15-weapon-customiser/operator.js';
import {solveArm} from './ak15-weapon-customiser/field.js';
import {mountTopBar} from '../shared/topbar.js';
import * as mech from './ak15-weapon-customiser/mech.js';
import {loaderError} from '../shared/loader.js';

const INDEX='../workbench/stg44/';
const CAMPAIGN='../../';
const TABLE={top:.86,x:[-.95,.95],z:[.24,1.04]};
const RIFLE_AT=new T.Vector3(.04,0,.47);// x/z on the table; y comes from the rifle's own thickness
// Camera behind and above the right shoulder, looking down at the rifle.
const SHOT={position:new T.Vector3(-.56,1.86,0),target:new T.Vector3(-.06,.84,.42)};
const PUSH_IN={duration:1.9,fadeAt:.75};// seconds; the fade starts at this fraction of the push
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Sound ----------
// The top bar (shared/topbar.js) holds the music player and puts the sound layer in its bench mix: the music comes out of
// the old radio, with the camp around it. The layer belongs to the shell, so the music carries on from page to page.
const sound=mountTopBar({scene:'bench',overlay:true,current:'intro'});

const stage=document.querySelector('#stage'),status=document.querySelector('#status'),start=document.querySelector('#start'),fade=document.querySelector('#fade');
const campaignBtn=document.querySelector('#campaign'),guided=document.querySelector('#guided'),actions=[campaignBtn,start];
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x07090a);scene.fog=new T.Fog(0x07090a,2.2,5);
const camera=new T.PerspectiveCamera(42,1,.05,20);camera.position.copy(SHOT.position);camera.lookAt(SHOT.target);

// ---------- Lighting: one warm work lamp, a cold fill, a dim HDR for the metal ----------
scene.add(new T.HemisphereLight(0x4a5a66,0x120d08,.35));
const lamp=new T.SpotLight(0xffc98a,26,4,.62,.55,2);lamp.position.set(.42,1.62,.78);lamp.target.position.set(.02,TABLE.top,.6);
lamp.castShadow=true;lamp.shadow.mapSize.set(2048,2048);lamp.shadow.bias=-.0004;lamp.shadow.normalBias=.01;scene.add(lamp,lamp.target);
const fill=new T.DirectionalLight(0x6f8fb0,.35);fill.position.set(-1.5,2,-1);scene.add(fill);
new RGBELoader().load('../assets/lighting/studio.hdr',hdr=>{hdr.mapping=T.EquirectangularReflectionMapping;scene.environment=hdr;scene.environmentIntensity=.28;});

// ---------- Room and bench (original low-poly geometry) ----------
const std=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
function woodTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#6b5238';g.fillRect(0,0,512,256);
 for(let i=0;i<150;i++){const y=Math.random()*256;g.strokeStyle=`rgba(${Math.random()<.5?'40,26,14':'150,118,82'},${.08+Math.random()*.18})`;g.lineWidth=.5+Math.random()*2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=512;x+=32)g.lineTo(x,y+Math.sin(x/70+i)*3);g.stroke();}
 for(let i=0;i<40;i++){g.fillStyle=`rgba(20,14,8,${Math.random()*.25})`;g.beginPath();g.ellipse(Math.random()*512,Math.random()*256,4+Math.random()*30,2+Math.random()*10,0,0,Math.PI*2);g.fill();}// stains
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}
const mesh=(geo,material,[x,y,z],shadow=true)=>{const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;};
const W=TABLE.x[1]-TABLE.x[0],D=TABLE.z[1]-TABLE.z[0],CX=(TABLE.x[0]+TABLE.x[1])/2,CZ=(TABLE.z[0]+TABLE.z[1])/2;
mesh(new T.BoxGeometry(W,.05,D),std(0xffffff,.78,{map:woodTexture()}),[CX,TABLE.top-.025,CZ]);
for(const x of [TABLE.x[0]+.06,TABLE.x[1]-.06])for(const z of [TABLE.z[0]+.06,TABLE.z[1]-.06])mesh(new T.BoxGeometry(.07,TABLE.top-.05,.07),std(0x3b2c1f),[x,(TABLE.top-.05)/2,z]);
mesh(new T.PlaneGeometry(8,8).rotateX(-Math.PI/2),std(0x1b1d1e,.95),[0,0,0],false);
mesh(new T.PlaneGeometry(6,3),std(0x2b2f2c,.95),[0,1.5,TABLE.z[1]+.05],false);// back wall
mesh(new T.BoxGeometry(1.4,.8,.015),std(0x4a3f30,.9),[.1,1.42,TABLE.z[1]+.035],false);// pegboard
// Props: screwdriver, file, rag, ammo tin, power strip with a lit switch.
const tools=std(0x3a3f44,.45,{metalness:.7});
const driver=new T.Group();driver.add(new T.Mesh(new T.CylinderGeometry(.014,.016,.11,8).rotateZ(Math.PI/2),std(0x3f4b3a,.6)),new T.Mesh(new T.CylinderGeometry(.004,.004,.12,6).rotateZ(Math.PI/2).translate(.115,0,0),tools));
driver.position.set(.18,TABLE.top+.016,.96);driver.rotation.y=.25;driver.traverse(m=>{if(m.isMesh)m.castShadow=true;});scene.add(driver);
mesh(new T.BoxGeometry(.2,.008,.025),tools,[.32,TABLE.top+.004,.72]).rotation.y=-.4;
const rag=mesh(new T.IcosahedronGeometry(.1,1).scale(1.3,.28,1),std(0x6d6a60,.98,{flatShading:true}),[.6,TABLE.top+.012,.95]);rag.rotation.y=.6;
mesh(new T.BoxGeometry(.18,.1,.1),std(0x3e4a32,.7),[-.68,TABLE.top+.05,.62]).rotation.y=.3;
const strip=mesh(new T.BoxGeometry(.06,.035,.3),std(0x8e9092,.6),[.8,TABLE.top+.018,.5]);strip.rotation.y=-.15;
mesh(new T.BoxGeometry(.03,.012,.03),std(0xff2a1a,.4,{emissive:0xff2a1a,emissiveIntensity:2.5}),[.8,TABLE.top+.04,.4],false);
// The lamp itself: a shade and a glowing bulb above the bench.
mesh(new T.ConeGeometry(.12,.14,10,1,true),std(0x3c4a3f,.6,{side:T.DoubleSide}),[lamp.position.x,lamp.position.y+.05,lamp.position.z],false);
mesh(new T.SphereGeometry(.03,8,6),new T.MeshBasicMaterial({color:0xfff0d0}),[lamp.position.x,lamp.position.y,lamp.position.z],false);

// The old radio at the back of the bench: wooden case, cloth grille, lit tuning dial, two knobs
// and a carry handle. The music comes out of it (bench-audio.js pans the sound to its position).
const RADIO_AT=new T.Vector3(-.26,TABLE.top,.92);
const radio=new T.Group();radio.position.copy(RADIO_AT);radio.rotation.y=.25;scene.add(radio);
{
 const part=(geo,material,[x,y,z])=>{const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;radio.add(m);return m;};
 const W=.34,H=.21,D=.13,wood=std(0x4a2e1a,.6,{flatShading:true});
 part(new T.BoxGeometry(W,H,D),wood,[0,H/2,0]);
 part(new T.BoxGeometry(W+.012,.014,D+.012),std(0x2e1c10,.6),[0,H-.004,0]);// lid lip
 part(new T.BoxGeometry(W*.52,H*.72,.004),std(0x8a7a5c,.95),[-W*.2,H*.47,-D/2-.001]);// grille cloth
 for(let i=0;i<5;i++)part(new T.BoxGeometry(W*.52,.008,.006),wood,[-W*.2,H*.18+i*H*.14,-D/2-.004]);// grille slats
 part(new T.BoxGeometry(W*.3,H*.26,.006),std(0x1a1410,.5),[W*.29,H*.68,-D/2-.002]);// dial bezel
 radio.userData.dial=part(new T.PlaneGeometry(W*.26,H*.2).rotateY(Math.PI),std(0xffd9a0,.5,{emissive:0xffa447,emissiveIntensity:1.4}),[W*.29,H*.68,-D/2-.0055]);
 part(new T.BoxGeometry(.003,H*.18,.002),std(0x9a2a1a,.5),[W*.25,H*.68,-D/2-.007]);// needle
 for(const x of [.2,.38])part(new T.CylinderGeometry(.017,.019,.018,10).rotateX(Math.PI/2),std(0x201a15,.4),[W*x+W*.03,H*.26,-D/2-.009]);// knobs
 part(new T.TorusGeometry(.07,.008,5,10,Math.PI),std(0x2a2522,.5,{metalness:.4}),[0,H+.002,0]);// handle
}

// The Nokia, face up on the bench with its screen lit: "Load all demos" pushes in on it and opens the index on its LCD
// (menu/ shows the same phone close up). Real size (a 3310: 113 x 48 x 22 mm); local +y is the top of the phone.
// The LCD is the real 84 x 48 pixels, redrawn about 12 times a second: a dithered lambda turning in a sweeping light,
// then a console log scrolling, in turn.
const PHONE_AT=new T.Vector3(-.36,TABLE.top,.64),PHONE={w:.048,l:.113,t:.016,screen:{w:.034,h:.0195,y:.022}};
const phone=new T.Group();phone.position.copy(PHONE_AT);phone.rotation.order='YXZ';phone.rotation.set(-Math.PI/2,Math.PI-.5,0);scene.add(phone);
const LCD={w:84,h:48},lcd=document.createElement('canvas');lcd.width=LCD.w;lcd.height=LCD.h;
const lcdTex=new T.CanvasTexture(lcd);lcdTex.colorSpace=T.SRGBColorSpace;lcdTex.magFilter=T.NearestFilter;lcdTex.minFilter=T.LinearFilter;
{
 const mat=(color,rough=.55,extra={})=>new T.MeshStandardMaterial({color,roughness:rough,...extra});
 const shape=new T.Shape(),w=PHONE.w/2,h=PHONE.l/2,r=.012;
 shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);
 shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
 const body=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:PHONE.t,bevelEnabled:true,bevelThickness:.003,bevelSize:.002,bevelSegments:3,curveSegments:10}),mat(0x1f251c,.5));
 body.castShadow=body.receiveShadow=true;phone.add(body);
 const top=PHONE.t+.003,sc=PHONE.screen;
 const add=(geo,material,x,y,z)=>{const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;phone.add(m);return m;};
 add(new T.PlaneGeometry(sc.w+.008,sc.h+.009),mat(0x0c100a,.3),0,sc.y,top+.0003);// bezel
 add(new T.PlaneGeometry(sc.w,sc.h),new T.MeshBasicMaterial({map:lcdTex,color:0xc8c8c8}),0,sc.y,top+.0006).castShadow=false;
 add(new T.BoxGeometry(.012,.0015,.001),mat(0x0a0c09),0,sc.y+sc.h/2+.009,top+.0003);// earpiece
 const key=mat(0x3a4234,.45);
 add(new T.CylinderGeometry(.0075,.0075,.003,24).rotateX(Math.PI/2),mat(0x2b3126,.4),0,-.004,top+.0015);// the Navi key
 for(const x of[-.016,.016])add(new T.BoxGeometry(.008,.005,.0025),key,x,-.006,top+.0012);
 for(let row=0;row<4;row++)for(let col=0;col<3;col++)add(new T.BoxGeometry(.011,.0055,.0028),key,(col-1)*.0135,-.02-row*.0082,top+.0014);
}
const LCD_ON='#1f2a14',LCD_OFF='#9fb184';
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];// 4 x 4 ordered dither
const glyph=document.createElement('canvas');glyph.width=LCD.w;glyph.height=LCD.h;
const LOG=['> partisan.sys v0.3','> altis-net .... ok','> radio 98.4 FM ok','> mount /demos','> 14 demos found','> squad: 3 alive','> convoy eta 04:12','> cache: 2 rifles','> mesh link ...ok','> awaiting input'];
let lcdAt=-1;
function drawLcd(time){
 if(time-lcdAt<1/12)return;lcdAt=time;
 const g=lcd.getContext('2d'),phase=Math.floor(time/9)%2;
 g.fillStyle=LCD_OFF;g.fillRect(0,0,LCD.w,LCD.h);g.fillStyle=LCD_ON;
 for(let i=0;i<4;i++)g.fillRect(1+i*2,6-i*1.5,1,1+i*1.5);// signal bars
 for(let i=0;i<4;i++)g.fillRect(LCD.w-2-i*2,6-i*1.5,1,1+i*1.5);// battery
 if(phase===0){
  // a lambda in a light sweeping round it, shaded in grey then dithered to the LCD's two tones
  const q=glyph.getContext('2d');q.clearRect(0,0,LCD.w,LCD.h);
  const lx=LCD.w/2+Math.cos(time*1.3)*30,ly=LCD.h/2+Math.sin(time*1.3)*16;
  const grad=q.createRadialGradient(lx,ly,2,lx,ly,46);grad.addColorStop(0,'#fff');grad.addColorStop(1,'#222');
  q.fillStyle=grad;q.font='bold 44px serif';q.textAlign='center';q.textBaseline='middle';
  q.save();q.translate(LCD.w/2,LCD.h/2+2);q.scale(1+Math.sin(time*.9)*.06,1);q.fillText('λ',0,0);q.restore();
  const d=q.getImageData(0,0,LCD.w,LCD.h).data;
  for(let y=0;y<LCD.h;y++)for(let x=0;x<LCD.w;x++){
   const k=(y*LCD.w+x)*4,a=d[k+3]/255;if(a<.3)continue;
   const v=(.3+.7*d[k]/255)*a;if(v*16>BAYER[(y&3)*4+(x&3)])g.fillRect(x,y,1,1);
  }
 }else{
  // the console log, one line every half second, with a blinking cursor
  g.font='7px monospace';g.textBaseline='top';g.textAlign='left';
  const shown=Math.floor((time%9)*2),start=Math.max(0,shown-5);
  for(let i=start;i<=Math.min(shown,LOG.length-1);i++)g.fillText(LOG[i],1,10+(i-start)*7);
  if(Math.floor(time*2)%2)g.fillRect(1,10+(Math.min(shown,LOG.length-1)-start+1)*7,4,6);
 }
 // the LCD's hard edges: round to on/off so the canvas text does not grey
 const img=g.getImageData(0,0,LCD.w,LCD.h),px=img.data;
 for(let k=0;k<px.length;k+=4){const on=px[k+1]<120;px[k]=on?0x1f:0x9f;px[k+1]=on?0x2a:0xb1;px[k+2]=on?0x14:0x84;}
 g.putImageData(img,0,0);lcdTex.needsUpdate=true;
}
const phoneScreen=()=>new T.Vector3(0,PHONE.screen.y,PHONE.t+.004).applyMatrix4(phone.matrixWorld);

// FIA flag (Altis) draped over the near edge of the bench: most of it lies flat on the table
// top under the rifle and the rest hangs down towards the operator's knees, swaying a little. The cloth is a grid
// bent over the edge on the CPU each frame; texture: fia-flag.png (supplied by the site owner).
const FLAG={x:[-.95,-.25],flat:.3,height:.40,bend:.012,cols:36,rows:26};
const flagGeo=new T.PlaneGeometry(1,1,FLAG.cols,FLAG.rows);
// flipY off turns the image 180° together with the +x mapping in drapeFlag (not a mirror image):
// the crest ends up in view and reads the right way round from above.
const flagTexture=new T.TextureLoader().load('./fia-flag.png');flagTexture.flipY=false;flagTexture.colorSpace=T.SRGBColorSpace;flagTexture.anisotropy=8;
const flagMat=new T.MeshStandardMaterial({map:flagTexture,roughness:.95,side:T.DoubleSide});
const flag=new T.Mesh(flagGeo,flagMat);flag.castShadow=flag.receiveShadow=true;flag.frustumCulled=false;scene.add(flag);
function drapeFlag(time){
 const p=flagGeo.attributes.position,uv=flagGeo.attributes.uv,width=FLAG.x[1]-FLAG.x[0],edge=TABLE.z[0],arc=FLAG.bend*Math.PI/2;
 for(let i=0;i<p.count;i++){
  const u=uv.getX(i),v=uv.getY(i),s=(1-v)*FLAG.height;// s: distance down the cloth from the top edge
  // Hoist (the black triangle) at the operator's end (+x), so the crest lies in the open patch of
  // table right of the stock where the bench shot sees it.
  let x=FLAG.x[0]+u*width,y,z;
  if(s<FLAG.flat){y=TABLE.top+.002;z=edge+FLAG.flat-s;}
  else if(s<FLAG.flat+arc){const a=(s-FLAG.flat)/FLAG.bend;y=TABLE.top+.002-FLAG.bend*(1-Math.cos(a));z=edge-FLAG.bend*Math.sin(a);}
  else{
   const h=s-FLAG.flat-arc,k=h/(FLAG.height-FLAG.flat);// 0 at the edge, 1 at the bottom hem
   y=TABLE.top+.002-FLAG.bend-h;
   // Folds from the weight of the cloth, plus a slow sway (off under reduced motion).
   const sway=reduceMotion?0:Math.sin(time*1.1+u*5)*.008*k+Math.sin(time*.7+u*11)*.003*k;
   z=edge-FLAG.bend-Math.sin(u*Math.PI*5)*.012*k-.01*k*k-sway;
   x+=reduceMotion?0:Math.sin(time*.9+v*4)*.004*k;
  }
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;flagGeo.computeVertexNormals();
}
drapeFlag(0);

// ---------- Operator, leaning over the bench ----------
const op=buildOperator({...DEFAULT_OPERATOR,headgear:'none',gloves:'none',pack:'none'});
op.root.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true;});scene.add(op.root);
const LEAN={hips:.1,spine:.16,chest:.18,neck:.08,head:.42};
function pose(time){
 const breath=reduceMotion?0:Math.sin(time*1.4)*.012;
 for(const [joint,x] of Object.entries(LEAN))op.joints[joint].rotation.x=x+(joint==='chest'?breath:0);
 op.joints.head.rotation.y=-.1+look.x*.12;
 for(const side of ['R','L']){op.joints['upperLeg'+side].rotation.x=-.08;op.joints['lowerLeg'+side].rotation.x=.14;}
 op.root.updateMatrixWorld(true);
}

// ---------- Rifle: lying flat on its side, hands resting on the grip and handguard ----------
function normalize(root,scale){// long axis along +x, muzzle (the slimmer end) at +x, meters, centered
 root.updateMatrixWorld(true);
 let size=new T.Box3().setFromObject(root).getSize(new T.Vector3());
 if(size.z>size.x&&size.z>=size.y)root.rotation.y=Math.PI/2;else if(size.y>size.x&&size.y>size.z)root.rotation.z=Math.PI/2;
 root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(root);size=bounds.getSize(new T.Vector3());
 const ends=[[Infinity,-Infinity],[Infinity,-Infinity]],v=new T.Vector3();
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const t=(v.x-bounds.min.x)/size.x,e=t<.12?ends[0]:t>.88?ends[1]:null;if(e){e[0]=Math.min(e[0],v.y);e[1]=Math.max(e[1],v.y);}}});
 if(ends[0][1]-ends[0][0]<ends[1][1]-ends[1][0])root.rotateY(Math.PI);
 root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
 root.position.sub(new T.Box3().setFromObject(root).getCenter(new T.Vector3()));
 const holder=new T.Group();holder.add(root);return holder;
}
const rifle=new T.Group();scene.add(rifle);// yaw and tilt live here; the model inside lies on its left side
let rifleHalf=0,rifleLength=0;
async function loadRifle(){
 const config=MODELS[DEFAULT_MODEL],gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL(config.url,new URL('./ak15-weapon-customiser/models.js',import.meta.url)).href);
 const model=normalize(gltf.scene,config.scale);
 model.rotation.x=Math.PI/2;// top of the rifle points away from the operator, right side up
 model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
 model.position.sub(box.getCenter(new T.Vector3()));
 rifleHalf=size.y/2;rifleLength=size.x;rifle.add(model);
}
// Palm targets along the rifle: grip (right hand) and handguard (left hand), just above the top face.
const HOLD={R:{along:-.2,pole:new T.Vector3(-1,-.2,-.5)},L:{along:.2,pole:new T.Vector3(1,-.4,-.4)}};
function placeRifle(){
 const tilt=look.y*.07;// lift the far edge a touch, as if checking the ejection port
 rifle.position.set(RIFLE_AT.x,TABLE.top+rifleHalf+Math.abs(tilt)*rifleHalf,RIFLE_AT.z);
 rifle.rotation.set(tilt,-.22+look.x*.08,0,'YXZ');rifle.updateMatrixWorld(true);
 for(const [side,h] of Object.entries(HOLD)){
  const target=new T.Vector3(h.along*rifleLength,rifleHalf+.035,-.015).applyMatrix4(rifle.matrixWorld);
  solveArm(op,side,target,h.pole);
 }
}

// ---------- Look (mouse, touch, gamepad) and the push-in ----------
const look={x:0,y:0},want={x:0,y:0};
addEventListener('pointermove',e=>{want.x=e.clientX/innerWidth*2-1;want.y=e.clientY/innerHeight*2-1;});
function pollPad(){
 for(const pad of navigator.getGamepads?.()||[]){
  if(!pad)continue;
  const [x,y]=pad.axes;if(Math.hypot(x,y)>.15){want.x=x;want.y=y;}
  if(pad.buttons[0]?.pressed)begin(CAMPAIGN);else if(pad.buttons[9]?.pressed)begin(INDEX);
 }
}
let push=null;
// Leave the bench for `dest`. The demos push down onto the Nokia (the index is that phone close up); the campaign
// leans in over the bench, as if to the map spread on it, and fades.
function begin(dest=INDEX){
 if(push||start.disabled)return;
 for(const b of actions)b.disabled=true;
 document.body.classList.add('leaving');
 mech.tap();// a key press on the phone
 phone.updateMatrixWorld(true);
 const from=camera.position.clone(),fromTarget=currentTarget.clone();
 let to,toTarget;
 if(dest===INDEX){toTarget=phoneScreen();to=toTarget.clone().add(new T.Vector3(0,.075,-.025));}// straight down onto the LCD
 else{toTarget=fromTarget.clone();to=from.clone().lerp(fromTarget,.45);}// lean in over the bench
 push={start:performance.now()/1000,from,fromTarget,to,toTarget,faded:false,dest};
 if(reduceMotion)push.start-=PUSH_IN.duration*PUSH_IN.fadeAt;
}
campaignBtn.addEventListener('click',()=>begin(CAMPAIGN));
start.addEventListener('click',()=>begin(INDEX));
guided.addEventListener('click',e=>e.preventDefault());// not available yet: it says so in its tooltip
addEventListener('keydown',e=>{if(e.target.matches('a,button,input,select,textarea'))return;const k=e.key.toLowerCase();if(k==='c')begin(CAMPAIGN);else if(k==='e')begin(INDEX);});
// Coming back with the browser's back button restores this page from cache: reset the shot.
addEventListener('pageshow',e=>{if(e.persisted){sound.scene('bench');push=null;for(const b of actions)b.disabled=false;document.body.classList.remove('leaving');fade.classList.add('clear');clock.getDelta();requestAnimationFrame(frame);}});

const currentTarget=SHOT.target.clone();
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
 camera.fov=w/h<1?60:42;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

const clock=new T.Clock();
function frame(){
 const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
 pollPad();
 const k=1-Math.exp(-dt*(push?1.5:4));look.x+=(want.x-look.x)*k;look.y+=(want.y-look.y)*k;
 pose(time);placeRifle();
 drapeFlag(time);
 drawLcd(time);
 radio.userData.dial.material.emissiveIntensity=1.3+Math.random()*.15;// valve glow flicker
 if(sound.bench){const at=radio.getWorldPosition(new T.Vector3()).project(camera);sound.bench.setPan(at.x*.8);}
 if(push){
  // Wall-clock time, so a slow device still hands over on schedule.
  const t=performance.now()/1000-push.start,u=Math.min(t/PUSH_IN.duration,1),e=ease(u);
  camera.position.lerpVectors(push.from,push.to,e);currentTarget.lerpVectors(push.fromTarget,push.toTarget,e);
  if(u>=PUSH_IN.fadeAt&&!push.faded){push.faded=true;fade.classList.remove('clear');}
  // Fully black: stop rendering so the main thread is free for the navigation.
  if(t>=PUSH_IN.duration+.5){if(!sound.shared)sound.music.handoff();location.href=push.dest;return;}
 }else{
  const sway=reduceMotion?0:Math.sin(time*.6)*.006;
  camera.position.set(SHOT.position.x+look.x*.05,SHOT.position.y-look.y*.03+sway,SHOT.position.z);
  currentTarget.set(SHOT.target.x+look.x*.1,SHOT.target.y-look.y*.06,SHOT.target.z);
 }
 camera.lookAt(currentTarget);
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}

// ---------- Dithered load-in: the bench boots like a phone ----------
// While the bench loads, the whole screen is a Nokia LCD at chunky resolution, two tones through an 8 x 8 ordered
// dither: the backlight fades up, a lambda draws itself in and PARTISAN types out under it, a boot log ticks
// through, and a pixel snake runs round the border, growing as the bench loads. Then READY blinks and the screen drops
// out pixel by pixel from the middle outwards. About five seconds of frames (a loading stall pauses it); any key or click skips to the reveal once the bench
// has loaded. Reduced motion: a still screen and a quick reveal.
const B8=(()=>{let m=[[0]];for(let n=1;n<8;n*=2)m=[...m.map(r=>[...r.map(v=>4*v),...r.map(v=>4*v+2)]),...m.map(r=>[...r.map(v=>4*v+3),...r.map(v=>4*v+1)])];return m.flat();})();
const INK=[22,32,15],PAPER=[159,177,132],DARK=[7,9,10];
const BOOT={flicker:[.3,.75],lambda:[.8,1.9],name:1.55,log:2.1,logStep:.32,minDone:3.7,ready:.55,reveal:1.5};
const BOOT_LOG=['PARTISAN OS 3310.λ','SIM CARD ......... OK','RADIO NET ........ OK','STASH ............ OK','WORKBENCH ....... '];
const dither=document.createElement('canvas'),bootLcd=document.createElement('canvas'),bootG=bootLcd.getContext('2d',{willReadFrequently:true});
// text goes on its own layer, cut at a fixed threshold so the letters stay crisp instead of dithering to mush
const bootText=document.createElement('canvas'),bootTG=bootText.getContext('2d',{willReadFrequently:true});
Object.assign(dither.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:9,imageRendering:'pixelated',pointerEvents:'none'});
dither.setAttribute('aria-hidden','true');
document.body.append(dither);fade.classList.add('clear');
// the boot's own clock: it advances at most 1/20 s a frame, so a loading stall pauses the boot instead of skipping it
let bootT=0,bootLast=null;
let loadedAt=null,revealAt=null,skip=false;
const bootSkip=()=>{skip=true;};
addEventListener('keydown',bootSkip,{once:true});addEventListener('pointerdown',bootSkip,{once:true});
/** Estimated progress while loading (creeps toward 90%), then 100%. */
const progress=t=>loadedAt!==null?1:.9*(1-Math.exp(-t/2.2));
/** The boot screen in grey (white = lit LCD pixel), on the low-res canvas. */
function bootFrame(t,w,h){
 const g=bootG,u=Math.min(w,h);
 g.fillStyle='#000';g.fillRect(0,0,w,h);
 // the lambda draws in: one long stroke and the short leg
 bootTG.clearRect(0,0,w,h);
 const L=Math.max(0,Math.min(1,(t-BOOT.lambda[0])/(BOOT.lambda[1]-BOOT.lambda[0]))),S=u*.28,cx=w/2,cy=h*.3;
 if(L>0){
  g.strokeStyle='#fff';g.lineWidth=Math.max(2,u*.05);g.lineCap='square';
  const a=[cx-S*.42,cy-S*.5],b=[cx+S*.42,cy+S*.5],m=[cx,cy-S*.02],c=[cx-S*.42,cy+S*.5];
  const k1=Math.min(1,L/.65),k2=Math.max(0,(L-.65)/.35);
  g.beginPath();g.moveTo(...a);g.lineTo(a[0]+(b[0]-a[0])*k1,a[1]+(b[1]-a[1])*k1);
  if(k2>0){g.moveTo(...m);g.lineTo(m[0]+(c[0]-m[0])*k2,m[1]+(c[1]-m[1])*k2);}
  g.stroke();
  // a soft glow behind it, which the dither turns into a halftone
  const glow=g.createRadialGradient(cx,cy,0,cx,cy,S*1.1);glow.addColorStop(0,`rgba(255,255,255,${.35*L})`);glow.addColorStop(1,'rgba(255,255,255,0)');
  g.globalCompositeOperation='destination-over';g.fillStyle=glow;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
 }
 const T=bootTG,fs=Math.max(8,Math.round(u/13));
 T.font=`700 ${fs}px ui-monospace, Menlo, Consolas, monospace`;T.textBaseline='top';T.fillStyle='#fff';
 if(t>BOOT.name){const word='PARTISAN',n=Math.min(word.length,Math.floor((t-BOOT.name)*14));T.textAlign='center';T.fillText(word.slice(0,n)+(n<word.length&&t*6%2<1?'_':''),cx,cy+S*.6);}
 // the boot log, bottom left
 T.textAlign='left';const ls=Math.max(7,Math.round(u/19));T.font=`700 ${ls}px ui-monospace, Menlo, Consolas, monospace`;
 const lines=Math.min(BOOT_LOG.length,Math.floor((t-BOOT.log)/BOOT.logStep)+1),x0=Math.round(u*.08),y0=h-Math.round(u*.08)-BOOT_LOG.length*(ls+2);
 for(let i=0;i<lines&&t>BOOT.log;i++){
  let line='> '+BOOT_LOG[i];
  if(i===BOOT_LOG.length-1)line+=String(Math.floor(progress(t)*100)).padStart(3,' ')+'%';
  T.fillText(line,x0,y0+i*(ls+2));
 }
 if(revealAt!==null||(loadedAt!==null&&t>=BOOT.minDone)){if(Math.floor(t*5)%2===0){T.textAlign='right';T.fillText('READY',w-x0,y0+(BOOT_LOG.length-1)*(ls+2));}}
 // the snake runs round the border, its length the progress
 const per=2*(w+h)-8,len=Math.max(4,Math.round(per*.08+per*.45*progress(t))),head=Math.floor(t*per*.22)%per;
 const at=i=>{i=((i%per)+per)%per;const W=w-2,H=h-2;if(i<W)return[1+i,1];i-=W;if(i<H)return[w-2,1+i];i-=H;if(i<W)return[w-2-i,h-2];i-=W;return[1,h-2-i];};
 if(t>BOOT.flicker[1]){g.fillStyle='#fff';for(let i=0;i<len;i++){const[x,y]=at(head-i);g.fillRect(x,y,1,1);}const[fx,fy]=at(head+Math.floor(per*.3));if(Math.floor(t*4)%2===0)g.fillRect(fx,fy,1,1);}
}
function drawDither(){
 const now=performance.now()/1000;
 bootT+=bootLast===null?0:Math.min(now-bootLast,.05);bootLast=now;
 const t=reduceMotion?BOOT.minDone+1:bootT;
 const px=Math.max(2,Math.round(Math.min(innerWidth,innerHeight)/170)),w=Math.ceil(innerWidth/px),h=Math.ceil(innerHeight/px);
 if(dither.width!==w||dither.height!==h){dither.width=bootLcd.width=bootText.width=w;dither.height=bootLcd.height=bootText.height=h;}
 window.PARP_BOOT={t,loaded:loadedAt!==null,revealed:revealAt!==null};
 if(revealAt===null&&loadedAt!==null&&(skip||t>=BOOT.minDone+BOOT.ready))revealAt=now;
 const k=revealAt===null?0:Math.min(1,(now-revealAt)/(reduceMotion?.25:BOOT.reveal));
 bootFrame(t,w,h);
 const txt=bootTG.getImageData(0,0,w,h).data, src=bootG.getImageData(0,0,w,h).data,g=dither.getContext('2d'),img=g.createImageData(w,h),out=img.data;
 // the backlight: off, then it fades up smoothly
 const [f0,f1]=BOOT.flicker,light=t<f0?0:t<f1?(t-f0)/(f1-f0):1;// the backlight fades up smoothly (no flicker)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,o=i*4,th=(B8[(y&7)*8+(x&7)]+.5)/64;
  if(th*.55+Math.hypot(x/w-.5,(y/h-.5)*h/w)*1.4*.45<k*1.05){out[o+3]=0;continue;}// revealed
  const lit=txt[o+3]>110||src[o]/255>th,c=light===0?DARK:lit?INK:PAPER;// lit pixels are the LCD's dark ink on the green paper
  out[o]=DARK[0]+(c[0]-DARK[0])*light;out[o+1]=DARK[1]+(c[1]-DARK[1])*light;out[o+2]=DARK[2]+(c[2]-DARK[2])*light;out[o+3]=255;
 }
 g.putImageData(img,0,0);
 if(k<1)requestAnimationFrame(drawDither);else{dither.remove();removeEventListener('keydown',bootSkip);removeEventListener('pointerdown',bootSkip);}
}
requestAnimationFrame(drawDither);
const reveal=()=>{loadedAt??=performance.now()/1000;};

loadRifle().then(()=>{
 status.hidden=true;for(const b of actions)b.disabled=false;campaignBtn.focus({preventScroll:true});
 requestAnimationFrame(frame);requestAnimationFrame(reveal);
}).catch(err=>{loaderError(status,'Could not load the rifle: '+err.message);reveal();});
