// Live drawings for the four Home-page animations (Design, Print, Signage, Digital).
// Each scene is a pure function of time `t` (seconds), drawn on a <canvas> by HeroShowcase at the screen's
// own frame rate, so the motion is smooth at any refresh rate and the picture is sharp on every display.
// To change an animation, edit its function below.
import { W, H, RUN_SECONDS, HOLD_SECONDS } from './heroConstants';
export { W, H, RUN_SECONDS, HOLD_SECONDS };
let c = null; // the 2D context of whatever we are currently drawing into
const LIME='#afcc39',DLIME='#7d9a1c',INK='#12151a';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const P=(t,a,b)=>clamp((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3);
const eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const ob=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const lerp=(a,b,t)=>a+(b-a)*t;
function rr(x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function lg(x0,y0,x1,y1,s){const g=c.createLinearGradient(x0,y0,x1,y1);s.forEach(([o,k])=>g.addColorStop(o,k));return g}
function rg(x,y,r0,r1,s){const g=c.createRadialGradient(x,y,r0,x,y,r1);s.forEach(([o,k])=>g.addColorStop(o,k));return g}
let bgCache = null, bgScale = 0;
function bg() {
  // the grid of dots and the glow never change, so draw them once and reuse (much cheaper every frame)
  const sc = c.getTransform().a || 1;
  if (!bgCache || bgScale !== sc) {
    bgCache = document.createElement('canvas'); bgCache.width = Math.round(W * sc); bgCache.height = Math.round(H * sc);
    const g = bgCache.getContext('2d'); g.scale(sc, sc);
    const keep = c; c = g;
    c.fillStyle = lg(0, 0, 0, H, [[0, '#171b22'], [1, '#0d1014']]); c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.07)';
    for (let y = 24; y < H; y += 36) for (let x = 24; x < W; x += 36) c.fillRect(x, y, 2, 2);
    c.fillStyle = rg(W * .78, H * .12, 10, 460, [[0, 'rgba(175,204,57,.22)'], [1, 'rgba(175,204,57,0)']]); c.fillRect(0, 0, W, H);
    c = keep; bgScale = sc;
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(bgCache, 0, 0); c.restore();
}
function shadow(b=30,y=18,a=.5){c.shadowColor=`rgba(0,0,0,${a})`;c.shadowBlur=b;c.shadowOffsetY=y}
function noShadow(){c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;c.shadowOffsetX=0}
function along(pts,p){ // point at fraction p along a polyline
  let L=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);L+=d}
  let r=p*L;for(let i=0;i<seg.length;i++){if(r<=seg[i]||i===seg.length-1){const k=seg[i]?clamp(r/seg[i]):0;return [lerp(pts[i][0],pts[i+1][0],k),lerp(pts[i][1],pts[i+1][1],k)]}r-=seg[i]}
}
function cursor(x,y,a=1){c.save();c.globalAlpha=a;c.translate(x,y);c.fillStyle='#fff';c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(0,26);c.lineTo(7,20);c.lineTo(13,32);c.lineTo(18,30);c.lineTo(12,18);c.lineTo(21,18);c.closePath();c.fill();c.stroke();c.restore()}

/* ═════════ DESIGN: a logo is drawn, coloured, named, and put on cards ═════════ */
function design(t){
  bg(t);
  const a=ob(P(t,0,.65));
  c.save();c.translate(352,300);c.scale(a,a);
  shadow(40,24,.55);rr(-250,-200,500,400,22);c.fillStyle='#fff';c.fill();noShadow();
  // artboard guides
  c.strokeStyle='rgba(18,21,26,.07)';c.lineWidth=1;c.beginPath();c.moveTo(-250,-50);c.lineTo(250,-50);c.moveTo(0,-200);c.lineTo(0,200);c.stroke();
  const R=82,cy=-48;
  // ring
  const pr=eio(P(t,.6,1.8));
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=INK;c.lineWidth=15;
  if(pr>0){c.beginPath();c.arc(0,cy,R,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);c.stroke()}
  // arrow
  const A=[[-44,cy+30],[-8,cy-8],[14,cy+14],[48,cy-24]];
  const pa=eio(P(t,1.7,2.7));
  const flood=eo(P(t,2.7,3.25));
  if(flood>0){c.fillStyle=INK;c.beginPath();c.arc(0,cy,R*flood+0.01,0,7);c.fill()}
  c.strokeStyle=flood>0.6?LIME:DLIME;c.lineWidth=15;
  if(pa>0){c.save();c.setLineDash([320,320]);c.lineDashOffset=320*(1-pa);c.beginPath();c.moveTo(...A[0]);A.slice(1).forEach(p=>c.lineTo(...p));c.moveTo(24,cy-26);c.lineTo(50,cy-26);c.lineTo(50,cy);c.stroke();c.restore()}
  // anchors + pen
  const anchorsA=1-P(t,2.7,3.1);
  if(anchorsA>0&&t>.6){c.globalAlpha=anchorsA;c.fillStyle='#fff';c.strokeStyle='#2d7cff';c.lineWidth=2;A.forEach((p,i)=>{if(pa>i/3){c.fillRect(p[0]-5,p[1]-5,10,10);c.strokeRect(p[0]-5,p[1]-5,10,10)}});c.globalAlpha=1}
  // wordmark
  c.font='700 58px Poppins';c.textAlign='left';c.textBaseline='middle';const word='AD ZONEX';
  let tw=c.measureText(word).width,x=-tw/2;
  for(let i=0;i<word.length;i++){const ch=word[i],w=c.measureText(ch).width,p=eo(P(t,3.1+i*.08,3.5+i*.08));c.globalAlpha=p;c.fillStyle=INK;c.fillText(ch,x,112+(1-p)*18);x+=w}
  c.globalAlpha=1;
  const tg=eo(P(t,4.0,4.5));c.globalAlpha=tg;c.fillStyle=DLIME;c.fillRect(-120,150,240*tg,4);c.globalAlpha=1;
  // pen cursor
  let pen=null;
  if(t<1.8&&t>.55){const ang=-Math.PI/2+pr*Math.PI*2;pen=[Math.cos(ang)*R,cy+Math.sin(ang)*R]}
  else if(t>=1.8&&t<2.9){pen=along([A[0],A[1],A[2],A[3]],clamp(pa))}
  if(pen)cursor(pen[0],pen[1],1-P(t,2.6,2.9));
  c.restore();
  // swatches
  [LIME,INK,'#ffffff','#f2c94c'].forEach((k,i)=>{const p=ob(P(t,3.3+i*.13,3.8+i*.13));c.save();c.translate(704,200+i*72);c.scale(p,p);shadow(14,6,.4);c.fillStyle=k;c.beginPath();c.arc(0,0,26,0,7);c.fill();noShadow();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=3;c.stroke();c.restore()});
  // cards
  const cards=[[4.3,'#12151a','#ffffff',-9,598,500],[4.75,LIME,INK,6,470,538]];
  cards.forEach(([s,bgc,fg,rot,x,y])=>{const p=eo(P(t,s,s+.7));if(p<=0)return;c.save();c.translate(lerp(x+260,x,p),y);c.rotate(rot*Math.PI/180*p);shadow(26,14,.55);rr(-105,-62,210,124,12);c.fillStyle=bgc;c.fill();noShadow();
    c.fillStyle=fg;c.beginPath();c.arc(-62,-14,18,0,7);c.fillStyle=bgc===LIME?INK:LIME;c.fill();
    c.fillStyle=fg;c.fillRect(-30,-24,110,9);c.globalAlpha=.55;c.fillRect(-30,-6,80,6);c.fillRect(-84,24,170,6);c.fillRect(-84,38,120,6);c.globalAlpha=1;c.restore()});
}

/* ═════════ PRINT: sheets feed through four colour heads and stack up ═════════ */
function print(t){
  bg(t);
  const heads=[[250,'#00aeef'],[360,'#ec008c'],[470,'#ffe600'],[580,'#1b1b1b']];
  // machine hood
  shadow(30,16,.5);rr(170,90,520,180,24);c.fillStyle=lg(0,90,0,270,[[0,'#2c323b'],[1,'#1c2027']]);c.fill();noShadow();
  c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=2;rr(170,90,520,180,24);c.stroke();
  c.fillStyle=LIME;rr(196,112,90,10,5);c.fill();c.fillStyle='rgba(255,255,255,.18)';rr(300,112,60,10,5);c.fill();
  // belt
  c.fillStyle='#1b1f26';rr(60,452,640,26,13);c.fill();
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=3;c.setLineDash([14,22]);c.lineDashOffset=-t*150;c.beginPath();c.moveTo(80,465);c.lineTo(680,465);c.stroke();c.setLineDash([]);
  const sheets=[0.2,1.45,2.7];const SP=330,SW=170,SH=118,SY=334;
  let delivered=0;
  const pile=[];
  sheets.forEach((s,si)=>{
    const left=-190+(t-s)*SP;if(t<s)return;
    const doneX=600; // belt end
    const x=Math.min(left,doneX-SW/2+30);
    const landed=left>=doneX-SW/2+30;
    let yy=SY,rot=0,px=x;
    if(landed){const k=eo(P(left-(doneX-SW/2+30),0,140));px=lerp(x,690-SW/2,k);yy=lerp(SY,430-si*8,k);rot=(si-1)*2*k;if(k>=1)delivered++}
    c.save();c.translate(px+SW/2,yy+SH/2);c.rotate(rot*Math.PI/180);c.translate(-SW/2,-SH/2);
    shadow(16,8,.5);rr(0,0,SW,SH,8);c.fillStyle='#fff';c.fill();noShadow();
    c.save();rr(0,0,SW,SH,8);c.clip();
    const lay=(k,fn)=>{const hx=heads[k][0];const from=clamp(hx-(left),0,SW);c.save();c.beginPath();c.rect(from,0,SW,SH);c.clip();fn();c.restore()};
    const done=landed?1:0;
    const L=(k,fn)=>{if(landed){fn()}else lay(k,fn)};
    L(0,()=>{c.fillStyle='#00aeef';c.fillRect(0,0,SW,34);c.fillStyle='#fff';c.fillRect(12,13,62,8)});
    L(1,()=>{c.fillStyle='#ec008c';c.beginPath();c.arc(48,72,22,0,7);c.fill()});
    L(2,()=>{c.fillStyle='#ffe600';c.beginPath();c.moveTo(118,50);c.lineTo(146,98);c.lineTo(90,98);c.closePath();c.fill()});
    L(3,()=>{c.fillStyle='#1b1b1b';c.fillRect(14,104,80,5);c.fillRect(14,113-2,54,4);c.fillRect(112,106,44,4)});
    c.restore();c.restore();
  });
  // heads (drawn after sheets so nozzles sit over)
  heads.forEach(([x,k],i)=>{
    let act=0;sheets.forEach(s=>{const left=-190+(t-s)*SP;if(left<x&&left+SW>x&&left<600)act=1});
    const bob=act*Math.sin(t*28+i)*1.6;
    c.fillStyle='#10131a';rr(x-30,236,60,70+bob,10);c.fill();
    c.fillStyle=k;rr(x-30,296+bob,60,10,5);c.fill();
    if(act){c.fillStyle=k;c.globalAlpha=.9;c.beginPath();c.arc(x,320+bob,5,0,7);c.fill();c.globalAlpha=.25;c.beginPath();c.arc(x,322+bob,16,0,7);c.fill();c.globalAlpha=1}
  });
  // output pile
  for(let i=0;i<delivered;i++){const y=476-i*9;shadow(8,4,.4);c.fillStyle='#fff';rr(690-SW/2,y,SW,10,3);c.fill();noShadow();}
  // finished badge
  const b=ob(P(t,5.1,5.6));if(b>0){c.save();c.translate(690,262);c.scale(b,b);c.fillStyle=LIME;c.beginPath();c.arc(0,0,30,0,7);c.fill();c.strokeStyle=INK;c.lineWidth=7;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(-13,2);c.lineTo(-3,12);c.lineTo(15,-10);c.stroke();c.restore()}
}

/* ═════════ SIGNAGE: gold letters are fitted, then the board lights up ═════════ */
function signage(t){
  const night=eio(P(t,3.0,4.4));
  c.fillStyle=lg(0,0,0,H,[[0,`rgb(${lerp(70,9,night)|0},${lerp(100,18,night)|0},${lerp(150,40,night)|0})`],[1,`rgb(${lerp(190,40,night)|0},${lerp(150,32,night)|0},${lerp(120,40,night)|0})`]]);c.fillRect(0,0,W,H);
  // building
  c.fillStyle=lg(0,180,0,H,[[0,'#262b33'],[1,'#171a20']]);c.fillRect(0,170,W,H-170);
  for(let y=190;y<430;y+=30){c.fillStyle='rgba(255,255,255,.035)';c.fillRect(0,y,W,2)}
  // glow on wall
  const glow=eo(P(t,3.1,4.2))*(t<4.2?(0.75+0.25*Math.sin(t*60)*(1-P(t,3.1,4.2))):1);
  c.fillStyle=rg(W/2,250,30,520,[[0,`rgba(255,226,150,${.42*glow})`],[1,'rgba(255,226,150,0)']]);c.fillRect(0,0,W,H);
  // fascia board
  shadow(30,20,.5);rr(70,150,660,200,18);c.fillStyle='#0d0f13';c.fill();noShadow();
  rr(70,150,660,200,18);c.strokeStyle='#59606b';c.lineWidth=5;c.stroke();
  // measuring guide (before letters)
  const gd=1-P(t,2.2,2.9);if(gd>0){c.globalAlpha=gd*.8;c.strokeStyle=LIME;c.lineWidth=2;c.setLineDash([8,8]);c.beginPath();c.moveTo(110,250);c.lineTo(690,250);c.stroke();c.setLineDash([]);c.globalAlpha=1}
  // letters
  c.font='700 112px Poppins';c.textAlign='left';c.textBaseline='alphabetic';
  const word='AD ZONEX';let tw=0;const ws=[...word].map(ch=>{const w=c.measureText(ch).width;tw+=w;return w});
  let x=W/2-tw/2;const base=292;
  [...word].forEach((ch,i)=>{
    const s=.45+i*.27,p=ob(P(t,s,s+.6)),dropY=lerp(-170,0,clamp(p,0,1.06));
    if(ch!==' '&&t>s){
      const y=base+dropY-lerp(0,0,1);
      for(let k=14;k>=1;k--){c.fillStyle=k>9?'#5d3f08':k>4?'#8a6210':'#a97a14';c.fillText(ch,x+k*.7,y+k*.7)}
      c.fillStyle=lg(0,y-80,0,y,[[0,'#fff3bf'],[.45,'#f2c94c'],[1,'#a87a14']]);
      if(glow>0){c.save();c.shadowColor=`rgba(255,226,150,${.8*glow})`;c.shadowBlur=26*glow;c.fillText(ch,x,y);c.restore()}else c.fillText(ch,x,y);
      c.fillStyle=lg(0,y-80,0,y,[[0,'#fff3bf'],[.45,'#f2c94c'],[1,'#a87a14']]);c.fillText(ch,x,y);
      c.strokeStyle='rgba(255,246,205,.6)';c.lineWidth=1.5;c.strokeText(ch,x,y);
    }
    x+=ws[i];
  });
  // accent underline lights on
  c.fillStyle=`rgba(175,204,57,${.25+.75*glow})`;rr(150,318,500,8,4);c.fill();
  // shop window
  const wl=eo(P(t,3.4,4.6));
  c.fillStyle=lg(0,420,0,520,[[0,`rgb(${lerp(40,255,wl)|0},${lerp(46,214,wl)|0},${lerp(56,150,wl)|0})`],[1,`rgb(${lerp(30,200,wl)|0},${lerp(34,130,wl)|0},${lerp(42,60,wl)|0})`]]);
  c.fillRect(110,400,580,120);[110,303,497,690].forEach(x=>{c.fillStyle='#12151a';c.fillRect(x-5,400,10,120)});
  c.fillStyle='#14171c';c.fillRect(0,520,W,80);
  c.fillStyle=rg(W/2,524,10,320,[[0,`rgba(255,226,150,${.3*glow})`],[1,'rgba(255,226,150,0)']]);c.fillRect(0,520,W,80);
  // sparkles
  [[210,196],[560,190],[690,300],[120,290]].forEach(([sx,sy],i)=>{const sp=P(t,4.3+i*.25,4.8+i*.25),a=Math.sin(sp*Math.PI);if(a>0){c.strokeStyle=`rgba(255,255,255,${a})`;c.lineWidth=2.5;const r=20*a;c.beginPath();c.moveTo(sx-r,sy);c.lineTo(sx+r,sy);c.moveTo(sx,sy-r);c.lineTo(sx,sy+r);c.stroke()}});
}

/* ═════════ DIGITAL: a site is built, traffic grows, the cloud and social light up ═════════ */
function digital(t){
  bg(t);
  // browser window
  const w=ob(P(t,0,.6));c.save();c.translate(300,300);c.scale(w,w);
  shadow(40,24,.55);rr(-270,-215,540,430,16);c.fillStyle='#fff';c.fill();noShadow();
  c.fillStyle='#e9ecef';c.beginPath();c.roundRect(-270,-215,540,38,[16,16,0,0]);c.fill();
  [['#ff5f57',-246],['#febc2e',-224],['#28c840',-202]].forEach(([k,x])=>{c.fillStyle=k;c.beginPath();c.arc(x,-196,6,0,7);c.fill()});
  c.fillStyle='#fff';rr(-170,-208,300,24,12);c.fill();c.fillStyle='#6b7280';c.font='600 13px Poppins';c.textAlign='left';c.textBaseline='middle';c.fillText('yourbrand.in',-152,-196);
  // nav
  const n=eo(P(t,.5,1.0));c.globalAlpha=n;c.fillStyle=INK;c.fillRect(-248,-160,60,10);[0,1,2].forEach(i=>{c.fillStyle='#c5cad1';c.fillRect(70+i*54,-160,40,8)});c.globalAlpha=1;
  // hero
  const h=eo(P(t,1.0,1.9));c.save();c.beginPath();c.rect(-248,-135,496,150);c.clip();c.fillStyle=lg(-248,-135,248,15,[[0,INK],[1,'#2a3320']]);c.fillRect(-248,-135-(1-h)*160,496,150);c.restore();
  const tl=[[210,16],[160,16],[110,9]];tl.forEach(([lw,lh],i)=>{const p=eo(P(t,1.5+i*.25,2.1+i*.25));c.fillStyle=i<2?'#fff':LIME;c.globalAlpha=p;c.fillRect(-224,-112+i*28,lw*p,lh);c.globalAlpha=1});
  const bt=ob(P(t,2.3,2.8));c.save();c.translate(-190,-8);c.scale(bt,bt);c.fillStyle=LIME;rr(-34,-13,68,26,13);c.fill();c.restore();
  // cards
  for(let i=0;i<3;i++){const p=ob(P(t,2.5+i*.2,3.0+i*.2));c.save();c.translate(-160+i*160,100);c.scale(p,p);c.fillStyle='#f3f5f0';rr(-64,-46,128,92,10);c.fill();c.fillStyle=[LIME,'#12151a','#f2c94c'][i];c.beginPath();c.arc(-36,-18,11,0,7);c.fill();c.fillStyle='#c5cad1';c.fillRect(-48,10,92,7);c.fillRect(-48,24,64,7);c.restore()}
  c.restore();
  // traffic chart (floating card)
  const cp=ob(P(t,3.1,3.7));c.save();c.translate(618,184);c.scale(cp,cp);shadow(24,14,.5);rr(-110,-78,220,156,14);c.fillStyle='#1d222a';c.fill();noShadow();
  c.fillStyle='#fff';c.font='600 13px Poppins';c.textAlign='left';c.fillText('Visitors',-92,-52);
  [28,44,38,64,84,104].forEach((v,i)=>{const g=eo(P(t,3.5+i*.12,4.1+i*.12));c.fillStyle=i===5?LIME:'rgba(175,204,57,.45)';rr(-86+i*32,62-v*g,20,v*g,4);c.fill()});
  const up=eo(P(t,4.6,5.0));c.globalAlpha=up;c.fillStyle=LIME;c.font='700 16px Poppins';c.fillText('+248%',22,-52);c.globalAlpha=1;c.restore();
  // phone with social post
  const pp=ob(P(t,3.6,4.2));c.save();c.translate(660,408);c.scale(pp,pp);c.rotate(.05);shadow(26,16,.55);rr(-60,-100,120,200,22);c.fillStyle='#0b0d11';c.fill();noShadow();rr(-54,-94,108,188,17);c.fillStyle='#fff';c.fill();
  c.fillStyle=LIME;c.beginPath();c.arc(-34,-70,9,0,7);c.fill();c.fillStyle='#c5cad1';c.fillRect(-18,-74,60,7);
  c.fillStyle=lg(0,-50,0,30,[[0,INK],[1,'#33402a']]);rr(-46,-52,92,84,8);c.fill();
  c.fillStyle='#fff';c.fillRect(-36,-36,58,7);c.fillStyle=LIME;c.fillRect(-36,-22,40,7);
  const hb=1+.25*Math.max(0,Math.sin(P(t,4.6,5.6)*Math.PI*3))*(t>4.6?1:0);
  c.save();c.translate(-30,58);c.scale(hb,hb);c.fillStyle='#ec0f5a';c.beginPath();c.moveTo(0,6);c.bezierCurveTo(-14,-4,-8,-14,0,-6);c.bezierCurveTo(8,-14,14,-4,0,6);c.fill();c.restore();
  c.fillStyle=INK;c.font='700 13px Poppins';c.textBaseline='middle';c.fillText(String(Math.round(lerp(0,1280,eo(P(t,4.4,5.6))))),-12,58);
  c.restore();
  // cloud
  const cl=ob(P(t,4.2,4.8));c.save();c.translate(704,58);c.scale(cl,cl);c.fillStyle='#fff';c.beginPath();c.arc(-18,6,18,0,7);c.arc(4,-6,24,0,7);c.arc(28,8,16,0,7);c.rect(-18,6,46,18);c.fill();
  c.fillStyle=INK;c.beginPath();c.moveTo(4,22);c.lineTo(4,0);c.moveTo(-6,10);c.lineTo(4,0);c.lineTo(14,10);c.lineWidth=0;c.strokeStyle=INK;c.lineWidth=5;c.lineCap='round';c.lineJoin='round';c.stroke();
  c.restore();
}

const SCENES = { design, print, signage, digital };

/** Draws scene `name` at time `t` into `ctx`, which must already be scaled so 1 unit = 1 of the 800x600 design pixels. */
export function drawScene(name, ctx, t) {
  c = ctx;
  c.globalAlpha = 1; c.setLineDash([]); c.lineWidth = 1; c.lineCap = 'butt'; c.lineJoin = 'miter';
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; noShadow();
  SCENES[name](t);
}
