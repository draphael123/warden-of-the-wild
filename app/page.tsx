"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/immutability */

import { useCallback, useEffect, useRef, useState } from "react";

type Element = "fire" | "frost" | "storm" | "nature";
type Tower = { x:number; y:number; element:Element; level:number; cooldown:number; range:number; id:number; priority:"first"|"strong" };
type Enemy = { x:number; y:number; waypoint:number; hp:number; maxHp:number; speed:number; armor:number; radius:number; burn:number; burnTick:number; chill:number; root:number; poison:number; alive:boolean; kind:string; reward:number; phase?:boolean };
type Bolt = { x:number; y:number; tx:number; ty:number; color:string; life:number };
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number };
type Popup = { x:number; y:number; label:string; life:number; color:string };

const W=1000, H=620;
const path = [[-30,178],[110,178],[185,115],[330,115],[400,220],[520,220],[590,350],[735,350],[790,255],[910,255],[1030,310]];
const pads = [[105,95],[210,215],[300,45],[392,305],[492,130],[548,430],[670,270],[710,445],[820,165],[895,370]];
const colors:Record<Element,string>={fire:"#ff6847",frost:"#5ed8f2",storm:"#e4c7ff",nature:"#83d46b"};
const names:Record<Element,string>={fire:"Ember",frost:"Frost",storm:"Storm",nature:"Wild"};
const costs:Record<Element,number>={fire:90,frost:80,storm:110,nature:85};
const waves=[
  [{kind:"scout",count:8,gap:.72,hp:72,speed:72,reward:12}],
  [{kind:"scout",count:10,gap:.5,hp:92,speed:80,reward:12},{kind:"brute",count:3,gap:1.2,hp:230,speed:42,reward:22}],
  [{kind:"brute",count:6,gap:.78,hp:250,speed:44,reward:23},{kind:"wisp",count:6,gap:.45,hp:100,speed:100,reward:14}],
  [{kind:"scout",count:12,gap:.36,hp:140,speed:80,reward:14},{kind:"brute",count:5,gap:.85,hp:330,speed:45,reward:26}],
  [{kind:"wisp",count:14,gap:.34,hp:165,speed:106,reward:16},{kind:"brute",count:7,gap:.68,hp:430,speed:47,reward:29}],
  [{kind:"warden",count:1,gap:1,hp:3500,speed:30,reward:180},{kind:"scout",count:12,gap:.34,hp:190,speed:86,reward:15}],
];
let audio:AudioContext|null=null;
function tone(kind:"build"|"wave"|"upgrade"){
  try{audio??=new AudioContext();const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=kind==="wave"?"sawtooth":"sine";osc.frequency.setValueAtTime(kind==="build"?260:kind==="upgrade"?420:120,now);osc.frequency.exponentialRampToValueAtTime(kind==="build"?520:kind==="upgrade"?780:220,now+.18);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.24);osc.start(now);osc.stop(now+.25)}catch{/* Sound remains optional. */}
}

function dist(a:{x:number,y:number},b:{x:number,y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}

export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const game=useRef<any>(null);
  const [selected,setSelected]=useState<Element>("fire");
  const selectedRef=useRef<Element>("fire");
  const [ui,setUi]=useState({gold:260,lives:20,wave:0,score:0,state:"ready",message:"The Hollow stirs at dusk.",speed:1,combo:0,best:0,muted:false,veteran:false,ability:0,aiming:false});
  const setElement=(e:Element)=>{setSelected(e);selectedRef.current=e};

  const reset=useCallback(()=>{
    const best=typeof window!=="undefined"?Number(localStorage.getItem("warden-best")||0):0;
    game.current={gold:260,lives:20,wave:0,score:0,state:"ready",towers:[] as Tower[],enemies:[] as Enemy[],bolts:[] as Bolt[],particles:[] as Particle[],texts:[] as Popup[],spawn:[] as any[],spawnClock:0,nextId:1,time:0,shake:0,flash:0,message:"Build your first elemental tower.",hover:-1,mouse:{x:500,y:300},selectedTower:-1,speed:1,combo:0,comboTimer:0,best,muted:false,veteran:false,ability:0,abilityShown:0,aiming:false,surgeMark:null};
    setUi({gold:260,lives:20,wave:0,score:0,state:"ready",message:"Build your first elemental tower.",speed:1,combo:0,best,muted:false,veteran:false,ability:0,aiming:false});
  },[]);
  useEffect(()=>reset(),[reset]);

  const sync=()=>{const g=game.current;if(g)setUi({gold:g.gold,lives:g.lives,wave:g.wave,score:g.score,state:g.state,message:g.message,speed:g.speed,combo:g.combo,best:g.best,muted:g.muted,veteran:g.veteran,ability:g.ability,aiming:g.aiming})};
  const startWave=()=>{const g=game.current;if(!g||g.state==="wave"||g.state==="lost"||g.state==="won")return;if(g.wave>=waves.length)return;if(!g.muted)tone("wave");g.wave++;g.state="wave";g.message=g.wave===6?"THE ASHEN WARDEN APPROACHES":g.wave===3?"LIFEBLOOM WISPS · BURN OR POISON STOPS THEIR HEALING":"Wave "+g.wave+" breaks from the Hollow";g.spawn=[];let delay=.5;waves[g.wave-1].forEach(group=>{for(let i=0;i<group.count;i++){g.spawn.push({...group,at:delay});delay+=group.gap}delay+=1});g.spawnClock=0;sync()};

  const upgrade=()=>{const g=game.current;if(!g||g.selectedTower<0)return;const t=g.towers[g.selectedTower],price=75+t.level*55;if(t.level<3&&g.gold>=price){if(!g.muted)tone("upgrade");g.gold-=price;t.level++;t.range+=12;g.message=`${names[t.element]} tower awakened to level ${t.level}`;burst(g,t.x,t.y,colors[t.element],16);sync()}};
  const sell=()=>{const g=game.current;if(!g||g.selectedTower<0)return;const t=g.towers[g.selectedTower];g.gold+=Math.floor((costs[t.element]+(t.level-1)*75)*.65);g.towers.splice(g.selectedTower,1);g.selectedTower=-1;g.message="Tower reclaimed. Its essence returns.";sync()};
  const toggleTarget=()=>{const g=game.current;if(!g||g.selectedTower<0)return;const tower=g.towers[g.selectedTower];tower.priority=tower.priority==="first"?"strong":"first";g.message=`Targeting ${tower.priority} enemies`;sync()};
  const castSurge=()=>{const g=game.current;if(!g||g.ability>0||g.state!=="wave")return;g.aiming=!g.aiming;g.message=g.aiming?"Choose a kill zone on the road · tap Wild Surge again to cancel":"Wild Surge cancelled";sync()};

  useEffect(()=>{
    let raf=0,last=performance.now();
    const frame=(now:number)=>{const dt=Math.min((now-last)/1000,.035);last=now;update(game.current,dt*(game.current?.speed??1),sync);draw(canvas.current,game.current,selectedRef.current);raf=requestAnimationFrame(frame)};
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf)
  },[]);

  const clickCanvas=(ev:React.MouseEvent<HTMLCanvasElement>)=>{
    const c=canvas.current,g=game.current;if(!c||!g)return;const r=c.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;
    if(g.aiming){g.aiming=false;g.ability=22;g.abilityShown=22;g.surgeMark={x,y,life:1.15};g.message="WILD SURGE · THE FOREST ANSWERS";g.shake=7;if(!g.muted)tone("upgrade");let caught=0;for(const enemy of g.enemies){if(!enemy.alive||dist(enemy,{x,y})>112)continue;caught++;enemy.root=Math.max(enemy.root,2.8);damage(g,enemy,36);burst(g,enemy.x,enemy.y,colors.nature,12)}g.texts.push({x,y:y-20,label:caught?`WILD SURGE · ${caught} HELD`:"THE ROOTS WAIT",life:1.2,color:"#e5ff9d"});sync();return}
    const ti=g.towers.findIndex((t:Tower)=>dist(t,{x,y})<31);if(ti>=0){g.selectedTower=ti;g.message=`Level ${g.towers[ti].level} ${names[g.towers[ti].element]} tower selected`;sync();return}
    const pi=pads.findIndex((p)=>Math.hypot(x-p[0],y-p[1])<34&&!g.towers.some((t:Tower)=>dist(t,{x:p[0],y:p[1]})<5));
    if(pi>=0){const e=selectedRef.current,cost=costs[e];if(g.gold>=cost){if(!g.muted)tone("build");g.gold-=cost;g.towers.push({x:pads[pi][0],y:pads[pi][1],element:e,level:1,cooldown:0,range:e==="storm"?142:154,id:g.nextId++,priority:"first"});g.selectedTower=g.towers.length-1;g.message=`${names[e]} tower bound to the old stone`;burst(g,pads[pi][0],pads[pi][1],colors[e],14)}else g.message="Not enough sunstone";sync()}
  };
  const moveCanvas=(ev:React.MouseEvent<HTMLCanvasElement>)=>{const c=canvas.current,g=game.current;if(!c||!g)return;const r=c.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;g.mouse={x,y};g.hover=pads.findIndex((p)=>Math.hypot(x-p[0],y-p[1])<36)};
  const t=game.current?.selectedTower>=0?game.current.towers[game.current.selectedTower]:null;
  const upgradeCost=t?75+t.level*55:0;

  return <main>
    <section className="game-shell">
      <header><div><span className="eyebrow">ELEMENTAL DEFENSE</span><h1>WARDEN OF THE WILD</h1></div><div className="status"><span>◈ <b>{ui.gold}</b></span><span>♥ <b>{ui.lives}</b></span><span>WAVE <b>{ui.wave}/6</b></span>{ui.combo>1&&<span className="combo">COMBO <b>×{ui.combo}</b></span>}<span>SCORE <b>{ui.score}</b></span>{ui.best>0&&<span>BEST <b>{ui.best}</b></span>}</div></header>
      <div className="stage-wrap">
        <canvas ref={canvas} width={W} height={H} onClick={clickCanvas} onMouseMove={moveCanvas} aria-label="Elemental tower defense battlefield" />
        {ui.state==="ready"&&ui.wave===0&&<div className="intro"><span>THE HOLLOW AWAKENS</span><h2>Bind the four elements.<br/>Break the coming horde.</h2><p>Choose an element, then build on the glowing foundation stones.</p><div className="intro-actions"><button className="mode" onClick={()=>{game.current.veteran=!game.current.veteran;game.current.message=game.current.veteran?"Veteran mode · 30% tougher enemies · 50% score bonus":"Standard mode restored";sync()}}>MODE · {ui.veteran?"VETERAN":"STANDARD"}</button><button onClick={()=>{game.current.state="between";game.current.message="Choose an element below, then claim a foundation.";sync()}}>ENTER THE WILD</button></div></div>}
        {(ui.state==="lost"||ui.state==="won")&&<div className="intro end"><span>{ui.state==="won"?"THE WILD ENDURES":"THE HEARTSTONE FELL"}</span><h2>{ui.state==="won"?"The Hollow is silent.":"The forest remembers."}</h2><p>Final score: {ui.score}</p><button onClick={reset}>PLAY AGAIN</button></div>}
      </div>
      <div className="message"><span className="rune">✦</span>{ui.message}</div>
      <footer>
        <div className="elements">
          {(Object.keys(colors) as Element[]).map(e=><button key={e} onClick={()=>setElement(e)} className={`element ${selected===e?"active":""}`} style={{"--e":colors[e]} as React.CSSProperties}><i>{e==="fire"?"▲":e==="frost"?"❄":e==="storm"?"ϟ":"♣"}</i><span><b>{names[e]}</b><small>{e==="fire"?"Burn":e==="frost"?"Slow + freeze":e==="storm"?"Chain damage":"Poison + root"} · ◈{costs[e]}</small></span></button>)}
        </div>
        <div className="actions">
          {t&&<><div className="selection"><small>SELECTED</small><b style={{color:colors[t.element]}}>{names[t.element]} · LV {t.level}</b></div><button className="secondary" onClick={toggleTarget}>TARGET {t.priority.toUpperCase()}</button><button className="secondary" onClick={sell}>SELL</button><button className="secondary" disabled={t.level>=3||ui.gold<upgradeCost} onClick={upgrade}>{t.level>=3?"MAX LEVEL":`UPGRADE ◈${upgradeCost}`}</button></>}
          <button className="secondary speed" onClick={()=>{game.current.speed=game.current.speed===1?2:game.current.speed===2?0:1;game.current.message=game.current.speed===2?"Time quickens through the Wild":game.current.speed===0?"The battle is paused":"The Wild returns to its natural rhythm";sync()}}>{ui.speed===0?"PAUSED":`${ui.speed}× SPEED`}</button>
          <button className="secondary" aria-label={ui.muted?"Turn sound on":"Mute sound"} onClick={()=>{game.current.muted=!game.current.muted;game.current.message=game.current.muted?"Sound muted":"Sound restored";sync()}}>{ui.muted?"SOUND OFF":"SOUND ON"}</button>
          <button className={`surge ${ui.aiming?"aiming":""}`} disabled={ui.state!=="wave"||ui.ability>0} onClick={castSurge}>{ui.ability>0?`WILD SURGE · ${Math.ceil(ui.ability)}s`:ui.aiming?"CANCEL SURGE":"WILD SURGE"}<span>{ui.aiming?"Choose a kill zone":"Place a root snare"}</span></button>
          <button className="wave" disabled={ui.state==="wave"||ui.state==="lost"||ui.state==="won"} onClick={startWave}>{ui.wave===0?"CALL FIRST WAVE":ui.wave>=6?"FINAL WAVE":"CALL NEXT WAVE"}<span>{ui.wave===0?"Scouts":ui.wave===1?"Scouts + Brutes":ui.wave===2?"Brutes + Lifebloom Wisps":ui.wave===3?"Scouts + Brutes":ui.wave===4?"Lifebloom Wisps + Brutes":"The Ashen Warden"}</span></button>
        </div>
      </footer>
      <aside><b>REACTIONS</b><span><i className="dot fire"/> Fire + Frozen <em>THERMAL SHOCK</em></span><span><i className="dot storm"/> Storm + Rooted <em>OVERGROWTH ARC</em></span><span><i className="dot nature"/> Fire + Poison <em>TOXIC FLAME</em></span><span><i className="dot wisp"/> Lifebloom <em>STOP WITH BURN OR POISON</em></span></aside>
    </section>
  </main>
}

function burst(g:any,x:number,y:number,color:string,n=8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*90;g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.45,color,size:2+Math.random()*4})}}
function damage(g:any,e:Enemy,amount:number){e.hp-=Math.max(2,amount-e.armor);if(e.hp<=0&&e.alive){e.alive=false;g.gold+=e.reward;g.score+=e.reward*10*(g.veteran?1.5:1);g.dirty=true;burst(g,e.x,e.y,e.kind==="warden"?"#ffc65c":"#dbe7b6",12);g.shake=e.kind==="warden"?10:2}}
function update(g:any,dt:number,sync:()=>void){if(!g)return;g.texts??=[];g.time+=dt;g.shake=Math.max(0,g.shake-dt*20);g.flash=Math.max(0,g.flash-dt);
  if(g.surgeMark){g.surgeMark.life-=dt;if(g.surgeMark.life<=0)g.surgeMark=null}
  if(g.ability>0){g.ability=Math.max(0,g.ability-dt);const shown=Math.ceil(g.ability);if(shown!==g.abilityShown){g.abilityShown=shown;g.dirty=true}}
  if(g.comboTimer>0){g.comboTimer-=dt;if(g.comboTimer<=0&&g.combo>0){g.combo=0;g.dirty=true}}
  if(g.state==="wave"){g.spawnClock+=dt;while(g.spawn.length&&g.spawn[0].at<=g.spawnClock){const s=g.spawn.shift(),hp=Math.round(s.hp*(g.veteran?1.3:1));g.enemies.push({x:path[0][0],y:path[0][1],waypoint:1,hp,maxHp:hp,speed:s.speed*(g.veteran?1.05:1),armor:(s.kind==="brute"?8:s.kind==="warden"?16:0)+(g.veteran?2:0),radius:s.kind==="warden"?23:s.kind==="brute"?16:11,burn:0,burnTick:0,chill:0,root:0,poison:0,alive:true,kind:s.kind,reward:s.reward})}}
  for(const e of g.enemies){if(!e.alive)continue;e.burn=Math.max(0,e.burn-dt);e.poison=Math.max(0,e.poison-dt);e.chill=Math.max(0,e.chill-dt);e.root=Math.max(0,e.root-dt);if(e.kind==="wisp"&&e.burn<=0&&e.poison<=0&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+9*dt);if(e.burn>0||e.poison>0){e.burnTick+=dt;if(e.burnTick>.25){damage(g,e,(e.burn>0?4:0)+(e.poison>0?2.5:0));e.burnTick=0}}if(!e.alive)continue;if(e.kind==="warden"&&!e.phase&&e.hp<e.maxHp*.5){e.phase=true;e.speed*=1.32;e.armor=5;g.message="THE WARDEN ENRAGES · ARMOR SHATTERED";g.shake=9;g.dirty=true;burst(g,e.x,e.y,"#ff985c",28)}const p=path[e.waypoint];if(!p)continue;const d=Math.hypot(p[0]-e.x,p[1]-e.y),spd=e.root>0?0:e.speed*(e.chill>0?.56:1);if(d<spd*dt+2){e.x=p[0];e.y=p[1];e.waypoint++;if(e.waypoint>=path.length){e.alive=false;g.lives-=e.kind==="warden"?8:e.kind==="brute"?2:1;g.shake=12;g.flash=.2;if(g.lives<=0){g.lives=0;g.state="lost";g.message="The Heartstone has fallen.";g.best=Math.max(g.best,g.score);try{localStorage.setItem("warden-best",String(g.best))}catch{/* Storage is optional. */}}sync()}}else{e.x+=(p[0]-e.x)/d*spd*dt;e.y+=(p[1]-e.y)/d*spd*dt}}
  for(const t of g.towers){t.cooldown-=dt;if(t.cooldown>0)continue;const targets=g.enemies.filter((e:Enemy)=>e.alive&&dist(t,e)<t.range).sort((a:Enemy,b:Enemy)=>t.priority==="strong"?b.hp-a.hp:b.waypoint-a.waypoint);const e=targets[0];if(!e)continue;const power=(16+t.level*8)*(t.element==="storm"?.82:1);let reaction="";
    if(t.element==="fire"){if(e.chill>0){reaction="THERMAL SHOCK";damage(g,e,power*2.3);e.armor=Math.max(0,e.armor-5);e.chill=0;g.shake=4}else{damage(g,e,power);e.burn=2.3}if(e.poison>0){reaction="TOXIC FLAME";for(const x of targets.slice(0,4)){damage(g,x,power*.65);x.burn=1.4}}}
    if(t.element==="frost"){damage(g,e,power*.72);e.chill=2.2;if(e.chill>0&&Math.random()<.12*t.level)e.root=.65}
    if(t.element==="nature"){damage(g,e,power*.62);e.poison=3;if(Math.random()<.2+.08*t.level)e.root=.8}
    if(t.element==="storm"){for(const x of targets.slice(0,2+t.level)){damage(g,x,power*(x===e?1:.58));g.bolts.push({x:t.x,y:t.y,tx:x.x,ty:x.y,color:colors.storm,life:.15})}if(e.root>0){reaction="OVERGROWTH ARC";for(const x of targets.slice(0,5))damage(g,x,power*.65)}}
    if(t.element!=="storm")g.bolts.push({x:t.x,y:t.y,tx:e.x,ty:e.y,color:colors[t.element],life:.18});burst(g,e.x,e.y,colors[t.element],3);if(reaction){g.combo=Math.min(9,(g.combo||0)+1);g.comboTimer=2.5;g.message=`${reaction} · ×${g.combo}`;g.score+=25*g.combo;g.dirty=true;g.texts.push({x:e.x,y:e.y-18,label:`${reaction}  ×${g.combo}`,life:.9,color:"#fff0a0"});burst(g,e.x,e.y,"#fff5bd",14)}t.cooldown=(t.element==="fire"?.78:t.element==="frost"?.7:t.element==="storm"?1.05:.83)/(1+(t.level-1)*.17)
  }
  g.enemies=g.enemies.filter((e:Enemy)=>e.alive);for(const b of g.bolts)b.life-=dt;g.bolts=g.bolts.filter((b:Bolt)=>b.life>0);for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;p.life-=dt}g.particles=g.particles.filter((p:Particle)=>p.life>0);for(const t of g.texts){t.y-=22*dt;t.life-=dt}g.texts=g.texts.filter((t:Popup)=>t.life>0);
  if(g.dirty){g.dirty=false;sync()}
  if(g.state==="wave"&&!g.spawn.length&&!g.enemies.length){if(g.wave>=waves.length){g.state="won";g.message="The Ashen Warden is broken. The Wild endures.";g.score+=g.lives*100;g.best=Math.max(g.best,g.score);try{localStorage.setItem("warden-best",String(g.best))}catch{/* Storage may be unavailable in private contexts. */}}else{g.state="between";g.gold+=55+g.wave*10;g.message=`Wave ${g.wave} cleared · Sunstone recovered`}sync()}
}

function tree(c:CanvasRenderingContext2D,x:number,y:number,s=1){
  c.fillStyle="#253f2b55";c.beginPath();c.ellipse(x+5*s,y+12*s,22*s,8*s,0,0,Math.PI*2);c.fill();
  c.fillStyle="#59432b";c.fillRect(x-4*s,y-3*s,8*s,24*s);
  c.fillStyle="#1f5b37";c.beginPath();c.arc(x,y-15*s,17*s,0,Math.PI*2);c.arc(x-12*s,y-5*s,14*s,0,Math.PI*2);c.arc(x+13*s,y-3*s,15*s,0,Math.PI*2);c.fill();
  c.fillStyle="#3f8450";c.beginPath();c.arc(x-5*s,y-20*s,9*s,0,Math.PI*2);c.arc(x+9*s,y-10*s,8*s,0,Math.PI*2);c.fill();
  c.fillStyle="#79a85e";c.beginPath();c.arc(x-7*s,y-23*s,3*s,0,Math.PI*2);c.fill();
}
function towerArt(c:CanvasRenderingContext2D,t:Tower,selected:boolean,time:number){
  const col=colors[t.element];
  if(selected){c.fillStyle=col+"16";c.strokeStyle=col+"88";c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,t.range,0,Math.PI*2);c.fill();c.stroke()}
  const x=t.x,y=t.y,lv=t.level,bob=Math.sin(time*3+t.id)*2;c.lineJoin="round";
  c.fillStyle="#26342d55";c.beginPath();c.ellipse(x+5,y+22,27+lv*3,10+lv,0,0,Math.PI*2);c.fill();
  c.fillStyle="#746d59";c.strokeStyle="#40382c";c.lineWidth=3;c.beginPath();c.ellipse(x,y+9,25+lv*2,15+lv,0,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle="#b9aa83";c.fillRect(x-16-lv,y-13-lv*2,32+lv*2,26+lv*2);c.strokeStyle="#5b4c38";c.strokeRect(x-16-lv,y-13-lv*2,32+lv*2,26+lv*2);
  c.fillStyle="#806e50";for(let s=-1;s<=1;s++)c.fillRect(x+s*11-2,y+2-lv*2,4,11+lv*2);
  if(t.element==="fire"){
    c.fillStyle="#813a28";c.beginPath();c.moveTo(x-23-lv*2,y-13-lv*2);c.lineTo(x,y-34-lv*4);c.lineTo(x+23+lv*2,y-13-lv*2);c.closePath();c.fill();c.stroke();
    if(lv>1){for(const dx of [-14,14]){c.fillStyle="#4b3a30";c.fillRect(x+dx-4,y-37-lv*3,8,18);c.strokeRect(x+dx-4,y-37-lv*3,8,18);c.fillStyle="#ee8a3c";c.beginPath();c.arc(x+dx,y-39-lv*3+bob,3+lv,0,Math.PI*2);c.fill()}}
    if(lv===3){c.fillStyle="#f4c65b";c.beginPath();c.moveTo(x,y-53+bob);c.quadraticCurveTo(x+9,y-44,x,y-38);c.quadraticCurveTo(x-9,y-44,x,y-53+bob);c.fill()}
  }else if(t.element==="frost"){
    c.fillStyle="#4d91a2";for(let i=-lv;i<=lv;i++){const dx=i*9;c.beginPath();c.moveTo(x+dx,y-12-lv*2);c.lineTo(x+dx+5,y-31-Math.abs(i%2)*7-lv*4);c.lineTo(x+dx+10,y-12-lv*2);c.closePath();c.fill();c.stroke()}
    c.fillStyle="#bff6ff";c.beginPath();c.moveTo(x,y-42-lv*4+bob);c.lineTo(x+6,y-30-lv*2);c.lineTo(x,y-22);c.lineTo(x-6,y-30-lv*2);c.closePath();c.fill();
  }else if(t.element==="storm"){
    c.fillStyle="#68527d";c.fillRect(x-22-lv,y-24-lv*3,44+lv*2,13+lv);c.strokeRect(x-22-lv,y-24-lv*3,44+lv*2,13+lv);for(const dx of [-17,0,17])c.fillRect(x+dx-4-lv/2,y-34-lv*3,8+lv,12);
    if(lv>1){c.strokeStyle="#d9c5ff";c.lineWidth=2;c.beginPath();c.arc(x,y-39-lv*4,8+lv*2,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-13,y-39-lv*4);c.lineTo(x+13,y-39-lv*4);c.moveTo(x,y-52-lv*4);c.lineTo(x,y-26-lv*4);c.stroke()}
  }else{
    c.strokeStyle="#58442b";c.lineWidth=7+lv;c.beginPath();c.moveTo(x,y+5);c.lineTo(x,y-27-lv*3);c.moveTo(x,y-14);c.lineTo(x-17-lv*2,y-25-lv*2);c.moveTo(x,y-17);c.lineTo(x+18+lv*2,y-29-lv*2);c.stroke();
    c.fillStyle="#437a3d";for(const [dx,dy] of [[-15,-25],[0,-34],[17,-27]]){c.beginPath();c.arc(x+dx,y+dy-lv*3,10+lv*2,0,Math.PI*2);c.fill();c.strokeStyle="#315d32";c.lineWidth=2;c.stroke()}
    if(lv===3){c.fillStyle="#b6dc6b";for(const dx of [-22,0,22]){c.beginPath();c.arc(x+dx,y-38+bob,4,0,Math.PI*2);c.fill()}}
  }
  c.shadowColor=col;c.shadowBlur=14;c.fillStyle=col;c.beginPath();c.arc(x,y-12-lv*2+bob,4+lv,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle="#342f27";c.lineWidth=2;c.stroke();
  if(lv>1){c.fillStyle="#e8c98d";c.beginPath();c.arc(x-8,y-10-lv*2,4,0,Math.PI*2);c.fill();c.fillStyle="#372c23";c.fillRect(x-11,y-15-lv*2,6,3)}
  for(let p=0;p<lv;p++){c.fillStyle="#f1df9c";c.beginPath();c.arc(x+(p-(lv-1)/2)*7,y+18,2.5,0,Math.PI*2);c.fill()}
}

function draw(canvas:HTMLCanvasElement|null,g:any,selected:Element){if(!canvas||!g)return;const c=canvas.getContext("2d")!;c.save();const sx=(Math.random()-.5)*g.shake,sy=(Math.random()-.5)*g.shake;c.translate(sx,sy);const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#77a55d");grad.addColorStop(1,"#396d4b");c.fillStyle=grad;c.fillRect(-20,-20,W+40,H+40);
  // terrain texture
  c.globalAlpha=.18;c.fillStyle="#d8e88e";for(let i=0;i<90;i++){const x=(i*137)%W,y=(i*83)%H;c.beginPath();c.arc(x,y,2+(i%4),0,Math.PI*2);c.fill()}c.globalAlpha=1;
  [[35,62,1.1],[82,43,.85],[155,42,1],[245,53,.82],[365,48,.95],[456,62,.8],[580,52,1],[690,54,.82],[780,56,1],[940,65,1.15],[48,475,1.1],[125,520,.88],[212,495,1],[325,555,1.08],[440,520,.85],[590,535,1],[735,548,1.05],[850,520,.85],[960,535,1.1]].forEach(v=>tree(c,v[0],v[1],v[2]));
  c.fillStyle="#f0d98b";for(const [x,y] of [[68,410],[280,390],[650,115],[865,455]]){c.fillRect(x-2,y,4,9);c.fillStyle="#b8523d";c.beginPath();c.arc(x,y,5,Math.PI,0);c.fill();c.fillStyle="#f0d98b"}
  for(const [x,y] of [[180,410],[350,365],[535,85],[620,470],[760,110],[915,430]]){c.fillStyle="#4a6648";c.beginPath();c.moveTo(x-9,y+6);c.lineTo(x-5,y-5);c.lineTo(x+4,y-8);c.lineTo(x+11,y+5);c.closePath();c.fill();c.strokeStyle="#91a775";c.lineWidth=2;c.stroke()}
  c.strokeStyle="#315f37";c.lineWidth=2;for(let i=0;i<34;i++){const x=(i*173+47)%960+20,y=(i*97+73)%500+35;c.beginPath();c.moveTo(x,y+6);c.lineTo(x-3,y);c.moveTo(x,y+6);c.lineTo(x+2,y-3);c.moveTo(x,y+6);c.lineTo(x+5,y+1);c.stroke()}
  c.fillStyle="#6f4c2c";c.fillRect(28,206,6,35);c.fillRect(12,208,39,7);c.fillStyle="#ead08b";c.font="bold 8px Georgia";c.save();c.translate(31,214);c.rotate(-.04);c.textAlign="center";c.fillText("THE HOLLOW",0,0);c.restore();c.textAlign="left";
  // river and path
  c.strokeStyle="#2a6871";c.lineWidth=68;c.beginPath();c.moveTo(0,540);c.bezierCurveTo(280,450,600,650,1020,480);c.stroke();c.strokeStyle="#55a4b4";c.lineWidth=52;c.stroke();c.strokeStyle="#94d0d0";c.lineWidth=3;c.setLineDash([22,28]);c.lineDashOffset=-g.time*18;c.stroke();c.setLineDash([]);
  c.lineCap="round";c.lineJoin="round";c.strokeStyle="#53613e";c.lineWidth=68;c.beginPath();path.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle="#c8a66d";c.lineWidth=54;c.stroke();c.strokeStyle="#e3c789";c.lineWidth=4;c.setLineDash([4,17]);c.stroke();c.setLineDash([]);
  // heartstone
  c.shadowBlur=25;c.shadowColor="#7de6c4";c.fillStyle="#89efd0";c.beginPath();c.moveTo(960,288);c.lineTo(976,258);c.lineTo(990,288);c.lineTo(976,320);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle="#d3fff0";c.font="11px Georgia";c.fillText("HEARTSTONE",925,340);
  pads.forEach((p,i)=>{const occupied=g.towers.some((t:Tower)=>dist(t,{x:p[0],y:p[1]})<5);if(occupied)return;const hover=g.hover===i;c.fillStyle="#453f32aa";c.beginPath();c.ellipse(p[0]+3,p[1]+8,29,10,0,0,Math.PI*2);c.fill();c.strokeStyle=hover?colors[selected]:"#d2be83";c.fillStyle=hover?colors[selected]+"66":"#776e57";c.lineWidth=hover?4:3;c.beginPath();c.arc(p[0],p[1],hover?31:27,0,Math.PI*2);c.fill();c.stroke();for(let s=0;s<8;s++){const a=s*Math.PI/4;c.strokeStyle="#4f493b";c.beginPath();c.moveTo(p[0]+Math.cos(a)*18,p[1]+Math.sin(a)*18);c.lineTo(p[0]+Math.cos(a)*27,p[1]+Math.sin(a)*27);c.stroke()}c.globalAlpha=.7;c.strokeStyle=hover?colors[selected]:"#d9ce9d";c.beginPath();c.arc(p[0],p[1],10+Math.sin(g.time*2+i)*2,0,Math.PI*2);c.stroke();c.globalAlpha=1});
  g.towers.forEach((t:Tower,i:number)=>towerArt(c,t,g.selectedTower===i,g.time));
  const sigil=g.aiming?{...g.mouse,life:1}:g.surgeMark;if(sigil){const pulse=1+Math.sin(g.time*8)*.035;c.save();c.translate(sigil.x,sigil.y);c.scale(pulse,pulse);c.globalAlpha=g.aiming?.72:Math.min(.9,sigil.life);c.fillStyle="#79cf5430";c.strokeStyle="#d9ff8b";c.lineWidth=g.aiming?3:6;c.beginPath();c.arc(0,0,112,0,Math.PI*2);c.fill();c.stroke();c.rotate(g.time*.45);for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(72,0);c.quadraticCurveTo(92,-15,108,0);c.quadraticCurveTo(92,15,72,0);c.stroke()}c.restore()}
  for(const e of g.enemies){
    if(!e.alive)continue;
    c.save();c.translate(0,Math.sin(g.time*9+e.x*.08)*2);
    c.fillStyle=e.kind==="warden"?"#3b2720":e.kind==="brute"?"#4b4331":e.kind==="wisp"?"#273742":"#27362b";
    c.beginPath();
    if(e.kind==="wisp"){if(e.burn<=0&&e.poison<=0){c.save();c.translate(e.x,e.y);c.rotate(g.time*1.7);c.strokeStyle="#b8f5df";c.lineWidth=2;c.globalAlpha=.55+.2*Math.sin(g.time*5);c.setLineDash([5,5]);c.beginPath();c.arc(0,0,e.radius+7,0,Math.PI*2);c.stroke();c.setLineDash([]);c.restore()}c.moveTo(e.x,e.y-e.radius);c.lineTo(e.x+e.radius,e.y);c.lineTo(e.x,e.y+e.radius);c.lineTo(e.x-e.radius,e.y);c.closePath()}
    else if(e.kind==="brute"){c.rect(e.x-e.radius,e.y-e.radius,e.radius*2,e.radius*2)}
    else{c.arc(e.x,e.y,e.radius,0,Math.PI*2)}
    c.fill();c.strokeStyle=e.chill>0?colors.frost:e.root>0?colors.nature:e.burn>0?colors.fire:"#aebc99";c.lineWidth=2;c.stroke();
    if(e.kind==="warden"){c.fillStyle=e.phase?"#ff5e45":"#ff9e5b";c.fillRect(e.x-5,e.y-5,4,4);c.fillRect(e.x+3,e.y-5,4,4)}
    else if(e.kind==="wisp"){c.fillStyle="#b8e7ff";c.fillRect(e.x-2,e.y-2,4,4)}
    else if(e.kind==="scout"){c.fillStyle="#27362b";c.beginPath();c.moveTo(e.x-e.radius+2,e.y-5);c.lineTo(e.x-e.radius-7,e.y-12);c.lineTo(e.x-e.radius+1,e.y+1);c.moveTo(e.x+e.radius-2,e.y-5);c.lineTo(e.x+e.radius+7,e.y-12);c.lineTo(e.x+e.radius-1,e.y+1);c.fill();c.fillStyle="#e7d77a";c.fillRect(e.x-5,e.y-3,3,3);c.fillRect(e.x+2,e.y-3,3,3);c.strokeStyle="#172019";c.lineWidth=3;c.beginPath();c.moveTo(e.x-5,e.y+e.radius);c.lineTo(e.x-7,e.y+e.radius+6);c.moveTo(e.x+5,e.y+e.radius);c.lineTo(e.x+7,e.y+e.radius+6);c.stroke()}
    else if(e.kind==="brute"){c.fillStyle="#3a3025";c.fillRect(e.x-e.radius-7,e.y-8,7,14);c.fillRect(e.x+e.radius,e.y-8,7,14);c.fillStyle="#ef9b58";c.fillRect(e.x-6,e.y-5,4,4);c.fillRect(e.x+2,e.y-5,4,4);c.strokeStyle="#211d18";c.lineWidth=4;c.beginPath();c.moveTo(e.x-8,e.y+e.radius);c.lineTo(e.x-10,e.y+e.radius+7);c.moveTo(e.x+8,e.y+e.radius);c.lineTo(e.x+10,e.y+e.radius+7);c.stroke()}
    c.fillStyle="#111";c.fillRect(e.x-e.radius,e.y-e.radius-9,e.radius*2,4);c.fillStyle=e.hp/e.maxHp<.3?"#ff665b":"#a8de75";c.fillRect(e.x-e.radius,e.y-e.radius-9,e.radius*2*Math.max(0,e.hp/e.maxHp),4);c.restore()
  }
  const boss=g.enemies.find((e:Enemy)=>e.alive&&e.kind==="warden");if(boss){c.fillStyle="#09120fdd";c.fillRect(300,18,400,36);c.strokeStyle=boss.phase?"#ff6847":"#d9b467";c.strokeRect(300,18,400,36);c.fillStyle="#25110f";c.fillRect(314,39,372,6);c.fillStyle=boss.phase?"#ff6847":"#d9b467";c.fillRect(314,39,372*Math.max(0,boss.hp/boss.maxHp),6);c.fillStyle="#f1dfbd";c.font="bold 11px Georgia";c.textAlign="center";c.fillText(boss.phase?"ASHEN WARDEN · ENRAGED":"ASHEN WARDEN",500,34);c.textAlign="left"}
  c.lineCap="round";for(const b of g.bolts){c.globalAlpha=Math.min(1,b.life*8);c.strokeStyle=b.color;c.shadowColor=b.color;c.shadowBlur=9;c.lineWidth=2.5;c.beginPath();c.moveTo(b.x,b.y);c.lineTo((b.x+b.tx)/2+(Math.random()-.5)*14,(b.y+b.ty)/2+(Math.random()-.5)*14);c.lineTo(b.tx,b.ty);c.stroke()}c.shadowBlur=0;c.globalAlpha=1;for(const p of g.particles){c.globalAlpha=Math.max(0,p.life*2);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size)}for(const t of g.texts){c.globalAlpha=Math.min(1,t.life*2);c.fillStyle="#1f291d";c.font="900 15px Georgia";c.textAlign="center";c.fillText(t.label,t.x+2,t.y+2);c.fillStyle=t.color;c.fillText(t.label,t.x,t.y)}c.textAlign="left";c.globalAlpha=1;if(g.flash){c.fillStyle=`rgba(255,100,70,${g.flash})`;c.fillRect(0,0,W,H)}c.restore()}
