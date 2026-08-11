"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/immutability */

import { useCallback, useEffect, useRef, useState } from "react";

type Element = "fire" | "frost" | "storm" | "nature";
type Tower = { x:number; y:number; element:Element; level:number; cooldown:number; range:number; id:number; priority:"first"|"strong"; kick:number };
type Enemy = { x:number; y:number; waypoint:number; hp:number; maxHp:number; speed:number; armor:number; radius:number; burn:number; burnTick:number; chill:number; root:number; poison:number; hit:number; facing:number; alive:boolean; kind:string; reward:number; phase?:boolean };
type Bolt = { x:number; y:number; tx:number; ty:number; color:string; life:number; kind:Element };
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number };
type Popup = { x:number; y:number; label:string; life:number; color:string };
type ReactionFx = { x:number; y:number; kind:string; life:number; max:number };

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
let emberForgeArt:HTMLImageElement|null=null;
let frostSpireArt:HTMLImageElement|null=null;
let stormBastionArt:HTMLImageElement|null=null;
let wildLodgeArt:HTMLImageElement|null=null;
function tone(kind:"build"|"wave"|"upgrade"|"reaction"|"leak"|"surge"){
  try{audio??=new AudioContext();if(audio.state==="suspended")void audio.resume();const profiles={build:[260,520,.07,"sine"],wave:[120,220,.07,"sawtooth"],upgrade:[420,780,.07,"sine"],reaction:[330,990,.055,"triangle"],leak:[110,52,.08,"square"],surge:[170,680,.075,"triangle"]} as const,[from,to,volume,wave]=profiles[kind],now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=wave;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+.18);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.24);osc.start(now);osc.stop(now+.25)}catch{/* Sound remains optional. */}
}

function dist(a:{x:number,y:number},b:{x:number,y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}

export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const game=useRef<any>(null);
  const [selected,setSelected]=useState<Element>("fire");
  const [panel,setPanel]=useState<"guide"|"settings"|"levels"|null>(null);
  const [autoWaves,setAutoWaves]=useState(false);
  const [autoCountdown,setAutoCountdown]=useState(0);
  const [tutorialStep,setTutorialStep]=useState(0);
  const selectedRef=useRef<Element>("fire");
  const [ui,setUi]=useState({gold:260,lives:20,wave:0,score:0,state:"ready",message:"The Hollow stirs at dusk.",speed:1,combo:0,best:0,muted:false,veteran:false,screenShake:true,damageNumbers:true,ability:0,aiming:false,nextReady:false,rushBonus:0});
  const setElement=(e:Element)=>{setSelected(e);selectedRef.current=e};

  const reset=useCallback(()=>{
    const best=typeof window!=="undefined"?Number(localStorage.getItem("warden-best")||0):0,muted=localStorage.getItem("warden-muted")==="true",veteran=localStorage.getItem("warden-veteran")==="true",speed=localStorage.getItem("warden-speed")==="2"?2:1,screenShake=localStorage.getItem("warden-shake")!=="false",damageNumbers=localStorage.getItem("warden-damage-numbers")!=="false";
    game.current={gold:260,lives:20,wave:0,score:0,state:"ready",towers:[] as Tower[],enemies:[] as Enemy[],falls:[],bolts:[] as Bolt[],particles:[] as Particle[],texts:[] as Popup[],rings:[],reactions:[] as ReactionFx[],spawn:[] as any[],spawnClock:0,nextId:1,time:0,shake:0,flash:0,message:"Build your first elemental tower.",hover:-1,mouse:{x:500,y:300},selectedTower:-1,speed,menuSpeed:speed,combo:0,comboTimer:0,best,muted,veteran,screenShake,damageNumbers,ability:0,abilityShown:0,aiming:false,surgeMark:null,waveBanner:null,autoCountdown:0,lastReactionTone:-1};
    setUi({gold:260,lives:20,wave:0,score:0,state:"ready",message:"Build your first elemental tower.",speed,combo:0,best,muted,veteran,screenShake,damageNumbers,ability:0,aiming:false,nextReady:false,rushBonus:0});
  },[]);
  useEffect(()=>{reset();try{setAutoWaves(localStorage.getItem("warden-auto-waves")==="true");if(localStorage.getItem("warden-tutorial-done")!=="true")setTutorialStep(1)}catch{/* Storage is optional. */}},[reset]);
  useEffect(()=>{const image=new Image();image.src="/assets/towers/ember-forge-l1-v3.png";image.onload=()=>{emberForgeArt=image};return()=>{if(emberForgeArt===image)emberForgeArt=null}},[]);
  useEffect(()=>{const image=new Image();image.src="/assets/towers/frost-spire-l1.png";image.onload=()=>{frostSpireArt=image};return()=>{if(frostSpireArt===image)frostSpireArt=null}},[]);
  useEffect(()=>{const image=new Image();image.src="/assets/towers/storm-bastion-l1-v2.png";image.onload=()=>{stormBastionArt=image};return()=>{if(stormBastionArt===image)stormBastionArt=null}},[]);
  useEffect(()=>{const image=new Image();image.src="/assets/towers/wild-lodge-l1.png";image.onload=()=>{wildLodgeArt=image};return()=>{if(wildLodgeArt===image)wildLodgeArt=null}},[]);

  const sync=()=>{const g=game.current;if(g){const nextReady=g.state==="wave"&&!g.spawn.length&&g.enemies.some((e:Enemy)=>e.alive)&&g.wave<waves.length,rushBonus=nextReady?Math.min(30,g.enemies.filter((e:Enemy)=>e.alive).length*3):0;setUi({gold:g.gold,lives:g.lives,wave:g.wave,score:g.score,state:g.state,message:g.message,speed:g.speed,combo:g.combo,best:g.best,muted:g.muted,veteran:g.veteran,screenShake:g.screenShake,damageNumbers:g.damageNumbers,ability:g.ability,aiming:g.aiming,nextReady,rushBonus})}};
  const toggleSetting=(key:"muted"|"veteran"|"screenShake"|"damageNumbers",storage:string)=>{const g=game.current;if(!g)return;g[key]=!g[key];try{localStorage.setItem(storage,String(g[key]))}catch{/* Storage is optional. */}sync()};
  const startWave=()=>{const g=game.current;if(!g||g.state==="lost"||g.state==="won"||g.wave>=waves.length)return;const early=g.state==="wave";if(early&&g.spawn.length)return;const bonus=early?Math.min(30,g.enemies.filter((e:Enemy)=>e.alive).length*3):0;if(!g.muted)tone("wave");g.gold+=bonus;g.score+=bonus*5;g.wave++;g.state="wave";g.autoCountdown=0;if(tutorialStep===2)setTutorialStep(3);const warning=g.wave===6?"THE ASHEN WARDEN APPROACHES":g.wave===3?"LIFEBLOOM WISPS · BURN OR POISON STOPS THEIR HEALING":"Wave "+g.wave+" breaks from the Hollow";g.message=warning+(early?` · RUSH BONUS ◈${bonus}`:"");g.waveBanner={title:g.wave===6?"FINAL ASSAULT":`WAVE ${g.wave}`,subtitle:g.wave===6?"THE ASHEN WARDEN APPROACHES":g.wave===3?"LIFEBLOOM WISPS":"THE HOLLOW ADVANCES",life:2.15,max:2.15,boss:g.wave===6};g.spawn=[];let delay=.5;waves[g.wave-1].forEach(group=>{for(let i=0;i<group.count;i++){g.spawn.push({...group,at:delay});delay+=group.gap}delay+=1});g.spawnClock=0;sync()};
  const toggleAutoWaves=()=>setAutoWaves(current=>{const next=!current;try{localStorage.setItem("warden-auto-waves",String(next))}catch{/* Storage is optional. */}if(game.current)game.current.message=next?"Auto waves enabled · next assault begins after 10 seconds":"Auto waves disabled · you control the horn";return next});
  useEffect(()=>{if(!autoWaves||ui.state!=="between"||ui.wave>=waves.length){setAutoCountdown(0);if(game.current)game.current.autoCountdown=0;return}setAutoCountdown(10);if(game.current)game.current.autoCountdown=10;const started=Date.now(),ticker=window.setInterval(()=>{const next=Math.max(0,Math.ceil(10-(Date.now()-started)/1000));setAutoCountdown(next);if(game.current)game.current.autoCountdown=next},200),timer=window.setTimeout(()=>startWave(),10000);return()=>{clearInterval(ticker);clearTimeout(timer)}}
  // `startWave` reads the live game ref; restarting this timer on every render would prevent it firing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ,[autoWaves,ui.state,ui.wave]);

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
    if(g.aiming){g.aiming=false;g.ability=22;g.abilityShown=22;g.surgeMark={x,y,life:1.15};g.message="WILD SURGE · THE FOREST ANSWERS";g.shake=7;if(!g.muted)tone("surge");let caught=0;for(const enemy of g.enemies){if(!enemy.alive||dist(enemy,{x,y})>112)continue;caught++;enemy.root=Math.max(enemy.root,2.8);damage(g,enemy,36);burst(g,enemy.x,enemy.y,colors.nature,12)}g.texts.push({x,y:y-20,label:caught?`WILD SURGE · ${caught} HELD`:"THE ROOTS WAIT",life:1.2,color:"#e5ff9d"});sync();return}
    const ti=g.towers.findIndex((t:Tower)=>dist(t,{x,y})<31);if(ti>=0){g.selectedTower=ti;g.message=`Level ${g.towers[ti].level} ${names[g.towers[ti].element]} tower selected`;sync();return}
    const pi=pads.findIndex((p)=>Math.hypot(x-p[0],y-p[1])<34&&!g.towers.some((t:Tower)=>dist(t,{x:p[0],y:p[1]})<5));
    if(pi>=0){const e=selectedRef.current,cost=costs[e];if(g.gold>=cost){if(!g.muted)tone("build");g.gold-=cost;g.towers.push({x:pads[pi][0],y:pads[pi][1],element:e,level:1,cooldown:0,range:e==="storm"?142:154,id:g.nextId++,priority:"first",kick:0});g.selectedTower=g.towers.length-1;if(tutorialStep===1)setTutorialStep(2);g.message=`${names[e]} tower bound to the old stone`;burst(g,pads[pi][0],pads[pi][1],colors[e],14)}else g.message="Not enough sunstone";sync()}
  };
  const moveCanvas=(ev:React.MouseEvent<HTMLCanvasElement>)=>{const c=canvas.current,g=game.current;if(!c||!g)return;const r=c.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;g.mouse={x,y};g.hover=pads.findIndex((p)=>Math.hypot(x-p[0],y-p[1])<36)};
  const t=game.current?.selectedTower>=0?game.current.towers[game.current.selectedTower]:null;
  const upgradeCost=t?75+t.level*55:0;
  const openPanel=(next:"guide"|"settings"|"levels")=>{const g=game.current;if(g){g.menuSpeed=g.speed;g.speed=0;sync()}setPanel(next)};
  const closePanel=()=>{const g=game.current;if(g){g.speed=g.menuSpeed??1;sync()}setPanel(null)};
  const enterLevel=()=>{closePanel();game.current.state="between";game.current.message="Choose an element below, then claim a foundation.";sync()};
  const finishTutorial=()=>{setTutorialStep(0);try{localStorage.setItem("warden-tutorial-done","true")}catch{/* Storage is optional. */}};
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.repeat)return;if(e.key==="Escape"&&panel){closePanel();return}if(panel)return;const elements:Element[]=["fire","frost","storm","nature"],index=Number(e.key)-1;if(index>=0&&index<4){setElement(elements[index]);return}if(e.code==="Space"){e.preventDefault();startWave()}else if(e.key.toLowerCase()==="r")castSurge();else if(e.key.toLowerCase()==="p"){const g=game.current;if(g){g.speed=g.speed===0?1:0;g.message=g.speed?"The battle resumes":"The battle is paused";sync()}}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)});

  return <main>
    <section className="game-shell">
      <header><div><span className="eyebrow">ELEMENTAL DEFENSE</span><h1>WARDEN OF THE WILD</h1><nav aria-label="Game menu"><button onClick={()=>openPanel("levels")}>MAP</button><button onClick={()=>openPanel("guide")}>FIELD GUIDE</button><button onClick={()=>openPanel("settings")}>SETTINGS</button></nav></div><div className="status"><span>◈ <b>{ui.gold}</b></span><span>♥ <b>{ui.lives}</b></span><span>WAVE <b>{ui.wave}/6</b></span>{ui.combo>1&&<span className="combo">COMBO <b>×{ui.combo}</b></span>}<span>SCORE <b>{ui.score}</b></span>{ui.best>0&&<span>BEST <b>{ui.best}</b></span>}</div></header>
      <div className="stage-wrap">
        <canvas ref={canvas} width={W} height={H} onClick={clickCanvas} onMouseMove={moveCanvas} aria-label="Elemental tower defense battlefield" />
        {ui.state==="ready"&&ui.wave===0&&!panel&&<div className="intro"><span>THE HOLLOW AWAKENS</span><h2>Bind the four elements.<br/>Break the coming horde.</h2><p>You are the last Warden of Briarwood. Hold Hollow Road before the Ashen Host reaches the Heartstone.</p><div className="intro-actions"><button className="mode" onClick={()=>openPanel("guide")}>READ FIELD GUIDE</button><button onClick={()=>openPanel("levels")}>CHOOSE LEVEL</button></div></div>}
        {tutorialStep>0&&ui.state!=="ready"&&!panel&&<div className={`field-brief step-${tutorialStep}`} role="status" aria-live="polite"><span>WARDEN&apos;S BRIEF · {tutorialStep}/3</span><b>{tutorialStep===1?"Claim an old foundation":tutorialStep===2?"Sound the horn":"Combine the elements"}</b><p>{tutorialStep===1?"Choose Ember, Frost, Storm, or Wild below, then place it on a glowing stone circle.":tutorialStep===2?"Build another tower or call the first wave when your defense is ready.":"Status effects set up reactions. Try Frost then Ember for Thermal Shock. Wild Surge can hold a crowded kill zone."}</p>{tutorialStep===3&&<button onClick={finishTutorial}>I&apos;M READY</button>}<button className="brief-skip" onClick={finishTutorial}>{tutorialStep===3?"CLOSE":"SKIP BRIEFING"}</button></div>}
        {(ui.state==="lost"||ui.state==="won")&&<div className="intro end"><span>{ui.state==="won"?"THE WILD ENDURES":"THE HEARTSTONE FELL"}</span><h2>{ui.state==="won"?"The Hollow is silent.":"The forest remembers."}</h2><p>Final score: {ui.score}</p><button onClick={reset}>PLAY AGAIN</button></div>}
        {panel&&<div className="menu-overlay" role="dialog" aria-modal="true" aria-label={panel==="guide"?"Field Guide":panel==="settings"?"Settings":"Level Select"}>
          <section className="folio">
            <button className="folio-close" onClick={closePanel} aria-label="Close menu">×</button>
            {panel==="levels"&&<><span className="folio-kicker">BRIARWOOD CAMPAIGN</span><h2>Choose the next stand</h2><p className="folio-lede">The Ashen Host moves east. Only Hollow Road is open in this prototype campaign.</p><div className="level-map"><article className="level-card current"><i>Ⅰ</i><div><b>HOLLOW ROAD</b><span>Verdant pass · 6 waves · Ashen Warden</span></div><button onClick={enterLevel}>DEFEND</button></article><article className="level-card locked"><i>Ⅱ</i><div><b>MOSSKEEP CROSSING</b><span>Locked · campaign expansion</span></div><em>🔒</em></article><article className="level-card locked"><i>Ⅲ</i><div><b>EMBERFALL RIDGE</b><span>Locked · campaign expansion</span></div><em>🔒</em></article></div></>}
            {panel==="guide"&&<><span className="folio-kicker">WARDEN&apos;S FIELD GUIDE</span><h2>Know your allies and quarry</h2><div className="guide-grid"><section><h3>Elemental Towers</h3><article><i className="guide-icon fire">▲</i><div><b>Ember Forge</b><p>Heavy damage and burn. Fire shatters frozen targets and ignites poison.</p></div></article><article><i className="guide-icon frost">❄</i><div><b>Frost Spire</b><p>Slows advancing enemies and sometimes freezes them in place.</p></div></article><article><i className="guide-icon storm">ϟ</i><div><b>Storm Bastion</b><p>Chains lightning across groups. Rooted enemies amplify the arc.</p></div></article><article><i className="guide-icon nature">♣</i><div><b>Wild Lodge</b><p>Poisons and roots enemies, preparing them for elemental reactions.</p></div></article></section><section><h3>Bestiary</h3><article><i className="beast scout">♠</i><div><b>Hollow Scout</b><p>Fast, fragile raiders. Dangerous when allowed to slip through in packs.</p></div></article><article><i className="beast brute">◆</i><div><b>Briar Brute</b><p>Armored and slow. Thermal Shock strips its protection.</p></div></article><article><i className="beast wisp">✦</i><div><b>Lifebloom Wisp</b><p>Regenerates health unless burning or poisoned.</p></div></article><article><i className="beast boss">♜</i><div><b>Ashen Warden</b><p>A two-phase boss. Below half health its armor breaks and speed surges.</p></div></article></section></div></>}
            {panel==="settings"&&<><span className="folio-kicker">BATTLE OPTIONS</span><h2>Settings</h2><div className="settings-list"><button onClick={()=>toggleSetting("muted","warden-muted")}><span><b>Sound</b><small>Battle tones and alerts</small></span><strong>{ui.muted?"OFF":"ON"}</strong></button><button onClick={()=>toggleSetting("veteran","warden-veteran")}><span><b>Difficulty</b><small>Veteran: tougher enemies, 50% score bonus</small></span><strong>{ui.veteran?"VETERAN":"STANDARD"}</strong></button><button onClick={toggleAutoWaves}><span><b>Auto waves</b><small>Begin the next assault after a 10-second respite</small></span><strong>{autoWaves?"ON":"OFF"}</strong></button><button onClick={()=>{game.current.speed=game.current.speed===2?1:2;game.current.menuSpeed=game.current.speed;try{localStorage.setItem("warden-speed",String(game.current.speed))}catch{/* Storage is optional. */}sync()}}><span><b>Default battle speed</b><small>Can also be changed during combat</small></span><strong>{(game.current?.menuSpeed??1)===2?"2×":"1×"}</strong></button><button onClick={()=>toggleSetting("screenShake","warden-shake")}><span><b>Screen shake</b><small>Camera impact during reactions and heavy hits</small></span><strong>{ui.screenShake?"ON":"OFF"}</strong></button><button onClick={()=>toggleSetting("damageNumbers","warden-damage-numbers")}><span><b>Damage numbers</b><small>Show larger hits above enemies</small></span><strong>{ui.damageNumbers?"ON":"OFF"}</strong></button></div><p className="setting-note">Keyboard: 1–4 select towers · Space calls a wave · R aims Wild Surge · P pauses · Esc closes menus.<br/>Reduced motion follows your device accessibility preference automatically.</p></>}
          </section>
        </div>}
      </div>
      <div className="message"><span className="rune">✦</span>{ui.message}</div>
      <footer>
        <div className="elements">
          {(Object.keys(colors) as Element[]).map((e,i)=><button key={e} aria-keyshortcuts={String(i+1)} onClick={()=>setElement(e)} className={`element ${selected===e?"active":""}`} style={{"--e":colors[e]} as React.CSSProperties}><i>{e==="fire"?"▲":e==="frost"?"❄":e==="storm"?"ϟ":"♣"}</i><span><b>{names[e]}</b><small>{e==="fire"?"Burn":e==="frost"?"Slow + freeze":e==="storm"?"Chain damage":"Poison + root"} · ◈{costs[e]}</small></span></button>)}
        </div>
        <div className="actions">
          {t&&<><div className="selection"><small>SELECTED</small><b style={{color:colors[t.element]}}>{names[t.element]} · LV {t.level}</b></div><button className="secondary" onClick={toggleTarget}>TARGET {t.priority.toUpperCase()}</button><button className="secondary" onClick={sell}>SELL</button><button className="secondary" disabled={t.level>=3||ui.gold<upgradeCost} onClick={upgrade}>{t.level>=3?"MAX LEVEL":`UPGRADE ◈${upgradeCost}`}</button></>}
          <button className="secondary speed" aria-keyshortcuts="P" onClick={()=>{game.current.speed=game.current.speed===1?2:game.current.speed===2?0:1;game.current.message=game.current.speed===2?"Time quickens through the Wild":game.current.speed===0?"The battle is paused":"The Wild returns to its natural rhythm";sync()}}>{ui.speed===0?"PAUSED":`${ui.speed}× SPEED`}</button>
          <button className="secondary" aria-label={ui.muted?"Turn sound on":"Mute sound"} onClick={()=>{game.current.muted=!game.current.muted;game.current.message=game.current.muted?"Sound muted":"Sound restored";sync()}}>{ui.muted?"SOUND OFF":"SOUND ON"}</button>
          <button className={`secondary auto-wave ${autoWaves?"active":""}`} aria-pressed={autoWaves} onClick={toggleAutoWaves}>{autoWaves&&autoCountdown>0?`AUTO · ${autoCountdown}s`:autoWaves?"AUTO WAVES · ON":"AUTO WAVES · OFF"}</button>
          <button className={`surge ${ui.aiming?"aiming":""}`} aria-keyshortcuts="R" disabled={ui.state!=="wave"||ui.ability>0} onClick={castSurge}>{ui.ability>0?`WILD SURGE · ${Math.ceil(ui.ability)}s`:ui.aiming?"CANCEL SURGE":"WILD SURGE"}<span>{ui.aiming?"Choose a kill zone":"Place a root snare"}</span></button>
          <button className={`wave ${ui.nextReady?"rush":""}`} aria-keyshortcuts="Space" disabled={ui.state==="lost"||ui.state==="won"||(ui.state==="wave"&&!ui.nextReady)} onClick={startWave}>{ui.nextReady?"RUSH NEXT WAVE":ui.wave===0?"CALL FIRST WAVE":ui.wave>=6?"FINAL WAVE":"CALL NEXT WAVE"}<span>{ui.nextReady?`Overlap the assault · ◈${ui.rushBonus}`:ui.wave===0?"Scouts":ui.wave===1?"Scouts + Brutes":ui.wave===2?"Brutes + Lifebloom Wisps":ui.wave===3?"Scouts + Brutes":ui.wave===4?"Lifebloom Wisps + Brutes":"The Ashen Warden"}</span></button>
        </div>
      </footer>
      <aside><b>REACTIONS</b><span><i className="dot fire"/> Fire + Frozen <em>THERMAL SHOCK</em></span><span><i className="dot frost"/> Frost + Poison <em>PERMAFROST</em></span><span><i className="dot storm"/> Storm + Frozen <em>SUPERCONDUCT</em></span><span><i className="dot storm"/> Storm + Rooted <em>OVERGROWTH ARC</em></span><span><i className="dot nature"/> Wild + Burning <em>WILDFIRE</em></span><span><i className="dot fire"/> Fire + Poison <em>TOXIC FLAME</em></span><span><i className="dot wisp"/> Lifebloom <em>BURN OR POISON</em></span></aside>
    </section>
  </main>
}

function burst(g:any,x:number,y:number,color:string,n=8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*90;g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.45,color,size:2+Math.random()*4})}}
function damage(g:any,e:Enemy,amount:number){const dealt=Math.max(2,amount-e.armor);e.hp-=dealt;e.hit=.12;g.rings??=[];if(g.damageNumbers&&dealt>=28)g.texts.push({x:e.x,y:e.y-10,label:`${Math.round(dealt)}`,life:.48,color:"#fff4c2"});if(e.hp<=0&&e.alive){e.alive=false;g.falls??=[];g.falls.push({x:e.x,y:e.y,kind:e.kind,life:e.kind==="warden"?1.1:.65});g.gold+=e.reward;g.score+=e.reward*10*(g.veteran?1.5:1);g.dirty=true;burst(g,e.x,e.y,e.kind==="warden"?"#ffc65c":"#dbe7b6",12);g.rings.push({x:e.x,y:e.y,color:e.kind==="warden"?"#ffb35c":"#e9e2b0",life:.38,max:.38,size:e.kind==="warden"?55:24});g.shake=e.kind==="warden"?10:2;if(e.kind==="warden")g.texts.push({x:e.x,y:e.y-28,label:"KRAK!",life:1.1,color:"#ffd879"})}}
function update(g:any,dt:number,sync:()=>void){if(!g)return;g.texts??=[];g.falls??=[];g.rings??=[];g.reactions??=[];g.time+=dt;g.shake=Math.max(0,g.shake-dt*20);g.flash=Math.max(0,g.flash-dt);
  if(g.waveBanner){g.waveBanner.life-=dt;if(g.waveBanner.life<=0)g.waveBanner=null}
  if(g.surgeMark){g.surgeMark.life-=dt;if(g.surgeMark.life<=0)g.surgeMark=null}
  if(g.ability>0){g.ability=Math.max(0,g.ability-dt);const shown=Math.ceil(g.ability);if(shown!==g.abilityShown){g.abilityShown=shown;g.dirty=true}}
  if(g.comboTimer>0){g.comboTimer-=dt;if(g.comboTimer<=0&&g.combo>0){g.combo=0;g.dirty=true}}
  if(g.state==="wave"){g.spawnClock+=dt;while(g.spawn.length&&g.spawn[0].at<=g.spawnClock){const s=g.spawn.shift(),hp=Math.round(s.hp*(g.veteran?1.3:1));g.enemies.push({x:path[0][0],y:path[0][1],waypoint:1,hp,maxHp:hp,speed:s.speed*(g.veteran?1.05:1),armor:(s.kind==="brute"?8:s.kind==="warden"?16:0)+(g.veteran?2:0),radius:s.kind==="warden"?25:s.kind==="brute"?18:s.kind==="wisp"?14:13,burn:0,burnTick:0,chill:0,root:0,poison:0,hit:0,facing:1,alive:true,kind:s.kind,reward:s.reward});if(!g.spawn.length)g.dirty=true}}
  for(const e of g.enemies)e.hit=Math.max(0,e.hit-dt);
  for(const e of g.enemies){if(!e.alive)continue;e.burn=Math.max(0,e.burn-dt);e.poison=Math.max(0,e.poison-dt);e.chill=Math.max(0,e.chill-dt);e.root=Math.max(0,e.root-dt);if(e.kind==="wisp"&&e.burn<=0&&e.poison<=0&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+9*dt);if(e.burn>0||e.poison>0){e.burnTick+=dt;if(e.burnTick>.25){damage(g,e,(e.burn>0?4:0)+(e.poison>0?2.5:0));e.burnTick=0}}if(!e.alive)continue;if(e.kind==="warden"&&!e.phase&&e.hp<e.maxHp*.5){e.phase=true;e.speed*=1.32;e.armor=5;g.message="THE WARDEN ENRAGES · ARMOR SHATTERED";g.shake=9;g.dirty=true;burst(g,e.x,e.y,"#ff985c",28)}const p=path[e.waypoint];if(!p)continue;const dx=p[0]-e.x,d=Math.hypot(dx,p[1]-e.y),spd=e.root>0?0:e.speed*(e.chill>0?.56:1);if(Math.abs(dx)>1)e.facing=dx<0?-1:1;if(d<spd*dt+2){e.x=p[0];e.y=p[1];e.waypoint++;if(e.waypoint>=path.length){e.alive=false;g.lives-=e.kind==="warden"?8:e.kind==="brute"?2:1;g.shake=12;g.flash=.2;if(!g.muted)tone("leak");if(g.lives<=0){g.lives=0;g.state="lost";g.message="The Heartstone has fallen.";g.best=Math.max(g.best,g.score);try{localStorage.setItem("warden-best",String(g.best))}catch{/* Storage is optional. */}}sync()}}else{e.x+=dx/d*spd*dt;e.y+=(p[1]-e.y)/d*spd*dt}}
  for(const t of g.towers){t.kick=Math.max(0,(t.kick||0)-dt*5.5);t.cooldown-=dt;if(t.cooldown>0)continue;const targets=g.enemies.filter((e:Enemy)=>e.alive&&dist(t,e)<t.range).sort((a:Enemy,b:Enemy)=>t.priority==="strong"?b.hp-a.hp:b.waypoint-a.waypoint);const e=targets[0];if(!e)continue;t.kick=1;const power=(16+t.level*8)*(t.element==="storm"?.82:1);let reaction="";
    if(t.element==="fire"){if(e.chill>0){reaction="THERMAL SHOCK";damage(g,e,power*2.3);e.armor=Math.max(0,e.armor-5);e.chill=0;g.shake=4}else{damage(g,e,power);e.burn=2.3}if(e.poison>0){reaction="TOXIC FLAME";for(const x of targets.slice(0,4)){damage(g,x,power*.65);x.burn=1.4}}}
    if(t.element==="frost"){damage(g,e,power*.72);if(e.poison>0){reaction="PERMAFROST";e.poison=0;e.chill=3.4;e.root=Math.max(e.root,1.25);damage(g,e,power*.8)}else{e.chill=2.2;if(Math.random()<.12*t.level)e.root=.65}}
    if(t.element==="nature"){damage(g,e,power*.62);if(e.burn>0){reaction="WILDFIRE";for(const x of targets.slice(0,4)){damage(g,x,power*.48);x.burn=Math.max(x.burn,1.8);x.poison=Math.max(x.poison,1.5)}}e.poison=Math.max(e.poison,3);if(Math.random()<.2+.08*t.level)e.root=.8}
    if(t.element==="storm"){const chilled=e.chill>0,chainCount=chilled?4+t.level:2+t.level;for(const x of targets.slice(0,chainCount)){damage(g,x,power*(x===e?1:.58));g.bolts.push({x:t.x,y:t.y,tx:x.x,ty:x.y,color:colors.storm,life:.15,kind:"storm"});if(chilled)x.root=Math.max(x.root,.32)}if(chilled){reaction="SUPERCONDUCT";e.chill=0}else if(e.root>0){reaction="OVERGROWTH ARC";for(const x of targets.slice(0,5))damage(g,x,power*.65)}}
    if(t.element!=="storm")g.bolts.push({x:t.x,y:t.y,tx:e.x,ty:e.y,color:colors[t.element],life:.18,kind:t.element});burst(g,e.x,e.y,colors[t.element],3);g.rings.push({x:e.x,y:e.y,color:colors[t.element],life:.22,max:.22,size:18});if(reaction){g.combo=Math.min(9,(g.combo||0)+1);g.comboTimer=2.5;g.message=`${reaction} · ×${g.combo}`;g.score+=25*g.combo;g.dirty=true;if(!g.muted&&g.time-g.lastReactionTone>.16){tone("reaction");g.lastReactionTone=g.time}g.texts.push({x:Math.max(105,Math.min(W-105,e.x)),y:e.y-18,label:`${reaction}  ×${g.combo}`,life:.9,color:"#fff0a0"});g.rings.push({x:e.x,y:e.y,color:"#fff2a6",life:.55,max:.55,size:58});g.reactions.push({x:e.x,y:e.y,kind:reaction,life:.72,max:.72});g.shake=Math.max(g.shake,5);burst(g,e.x,e.y,"#fff5bd",18)}t.cooldown=(t.element==="fire"?.78:t.element==="frost"?.7:t.element==="storm"?1.05:.83)/(1+(t.level-1)*.17)
  }
  g.enemies=g.enemies.filter((e:Enemy)=>e.alive);for(const f of g.falls)f.life-=dt;g.falls=g.falls.filter((f:any)=>f.life>0);for(const b of g.bolts)b.life-=dt;g.bolts=g.bolts.filter((b:Bolt)=>b.life>0);for(const r of g.rings)r.life-=dt;g.rings=g.rings.filter((r:any)=>r.life>0);for(const fx of g.reactions)fx.life-=dt;g.reactions=g.reactions.filter((fx:ReactionFx)=>fx.life>0);for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;p.life-=dt}g.particles=g.particles.filter((p:Particle)=>p.life>0);for(const t of g.texts){t.y-=22*dt;t.life-=dt}g.texts=g.texts.filter((t:Popup)=>t.life>0);
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
function ruin(c:CanvasRenderingContext2D,x:number,y:number,s=1){
  c.save();c.translate(x,y);c.scale(s,s);c.fillStyle="#26372b55";c.beginPath();c.ellipse(3,19,27,8,0,0,Math.PI*2);c.fill();c.fillStyle="#77806a";c.strokeStyle="#3d473c";c.lineWidth=3;c.beginPath();c.moveTo(-23,15);c.lineTo(-20,-17);c.lineTo(-8,-22);c.lineTo(-5,4);c.lineTo(9,1);c.lineTo(12,-13);c.lineTo(23,-8);c.lineTo(24,17);c.closePath();c.fill();c.stroke();c.strokeStyle="#aeb58a";c.lineWidth=2;c.beginPath();c.moveTo(-18,-10);c.lineTo(-9,-13);c.moveTo(12,-5);c.lineTo(20,-2);c.stroke();c.strokeStyle="#527144";c.lineWidth=3;c.beginPath();c.moveTo(-20,-4);c.quadraticCurveTo(-6,8,-12,18);c.moveTo(8,2);c.quadraticCurveTo(2,12,14,17);c.stroke();c.restore();
}
function flowerPatch(c:CanvasRenderingContext2D,x:number,y:number,col:string){for(let i=0;i<5;i++){const dx=(i%3)*8-8,dy=Math.floor(i/3)*8-4;c.strokeStyle="#315f37";c.lineWidth=1.5;c.beginPath();c.moveTo(x+dx,y+dy+5);c.lineTo(x+dx,y+dy);c.stroke();c.fillStyle=col;for(let p=0;p<4;p++){const a=p*Math.PI/2;c.beginPath();c.arc(x+dx+Math.cos(a)*2.4,y+dy+Math.sin(a)*2.4,2.2,0,Math.PI*2);c.fill()}c.fillStyle="#f5d56a";c.beginPath();c.arc(x+dx,y+dy,1.4,0,Math.PI*2);c.fill()}}
function towerElementalAura(c:CanvasRenderingContext2D,t:Tower,time:number){
  const x=t.x,y=t.y,lv=t.level,phase=time*1.8+t.id;c.save();c.lineCap="round";c.lineJoin="round";
  if(t.element==="fire"){
    c.strokeStyle="#ffb54f";c.lineWidth=2;c.shadowColor="#ff6b38";c.shadowBlur=8;for(let i=0;i<3+lv;i++){const a=i*Math.PI*2/(3+lv)+phase*.35,r=27+lv*2;c.globalAlpha=.35+.25*Math.sin(phase*2+i);c.beginPath();c.moveTo(x+Math.cos(a)*r,y+12+Math.sin(a)*7);c.lineTo(x+Math.cos(a)*r*.72,y+4+Math.sin(a)*5);c.stroke()}for(let i=0;i<3;i++){const p=(time*.7+i/3+t.id*.11)%1,dx=Math.sin(phase+i)*7;c.globalAlpha=1-p;c.fillStyle=i?"#ff7b39":"#ffe077";c.beginPath();c.moveTo(x+dx-3,y-45-p*23);c.quadraticCurveTo(x+dx,y-54-p*29,x+dx+3,y-45-p*23);c.quadraticCurveTo(x+dx,y-39-p*18,x+dx-3,y-45-p*23);c.fill()}}
  else if(t.element==="frost"){
    c.strokeStyle="#c8f7ff";c.fillStyle="#8de8f7";c.shadowColor="#78dff4";c.shadowBlur=9;for(let i=0;i<4+lv;i++){const a=i*Math.PI*2/(4+lv)-phase*.18,r=24+lv*4;c.globalAlpha=.48+.2*Math.sin(phase*2+i);c.save();c.translate(x+Math.cos(a)*r,y-15+Math.sin(a)*r*.42);c.rotate(a+phase*.4);c.beginPath();c.moveTo(0,-5);c.lineTo(3,0);c.lineTo(0,5);c.lineTo(-3,0);c.closePath();c.fill();c.stroke();c.restore()}c.globalAlpha=.22;c.strokeStyle="#e1fbff";for(let i=0;i<3;i++){const yy=y+8+i*5+Math.sin(phase+i)*2;c.beginPath();c.moveTo(x-24-i*2,yy);c.quadraticCurveTo(x,yy-5,x+24+i*2,yy);c.stroke()}}
  else if(t.element==="storm"){
    c.strokeStyle="#e6ccff";c.shadowColor="#c38cff";c.shadowBlur=10;c.lineWidth=2;for(let i=0;i<3+lv;i++){const a=i*Math.PI*2/(3+lv)+phase*.12,r=25+lv*3,ex=x+Math.cos(a)*r,ey=y-18+Math.sin(a)*r*.45;c.globalAlpha=.3+.5*(.5+.5*Math.sin(phase*5+i*2));c.beginPath();c.moveTo(x,y-33-lv*3);c.lineTo((x+ex)/2+Math.sin(phase*7+i)*5,(y-33-lv*3+ey)/2);c.lineTo(ex,ey);c.stroke()}c.globalAlpha=.45;c.fillStyle="#f3e7ff";c.beginPath();c.arc(x,y-37-lv*3,5+Math.sin(phase*4)*2,0,Math.PI*2);c.fill()}
  else{
    c.strokeStyle="#9edc72";c.fillStyle="#bce982";c.shadowColor="#76c759";c.shadowBlur=7;for(let i=0;i<5+lv;i++){const a=i*Math.PI*2/(5+lv)+phase*.08,r=24+lv*3,wave=Math.sin(phase*2+i)*3;c.globalAlpha=.45+.22*Math.sin(phase+i);c.save();c.translate(x+Math.cos(a)*(r+wave),y-9+Math.sin(a)*(r*.52+wave));c.rotate(a+phase*.12);c.beginPath();c.moveTo(6,0);c.quadraticCurveTo(0,-5,-6,0);c.quadraticCurveTo(0,5,6,0);c.fill();c.stroke();c.restore()}for(let i=0;i<4;i++){const p=(time*.22+i/4+t.id*.09)%1;c.globalAlpha=(1-p)*.65;c.fillStyle="#e0f6a1";c.beginPath();c.arc(x-20+i*13+Math.sin(phase+i)*4,y-25-p*28,1.5+p,0,Math.PI*2);c.fill()}}
  c.restore();
}
function towerArt(c:CanvasRenderingContext2D,t:Tower,selected:boolean,time:number){
  const col=colors[t.element];
  if(selected){c.fillStyle=col+"16";c.strokeStyle=col+"88";c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,t.range,0,Math.PI*2);c.fill();c.stroke()}
  const x=t.x,y=t.y,lv=t.level,bob=Math.sin(time*3+t.id)*2,recoil=Math.sin(Math.min(1,t.kick||0)*Math.PI);c.lineJoin="round";
  c.save();c.translate(x,y);c.scale(1+recoil*.045,1-recoil*.07);c.translate(-x,-y-recoil*3);
  if(t.element==="fire"&&lv===1&&emberForgeArt?.complete){
    const breathe=.5+.5*Math.sin(time*4.2+t.id),smoke=(time*.34+t.id*.17)%1;
    c.fillStyle="#18271f77";c.beginPath();c.ellipse(x+2,y+20,35,10,0,0,Math.PI*2);c.fill();
    // Crop the chroma-key source padding so the masonry visibly meets its pad.
    c.drawImage(emberForgeArt,10,70,1100,1190,x-45,y-75,90,98);
    c.globalAlpha=.32+.3*breathe;c.shadowColor="#ff6a3d";c.shadowBlur=18+8*breathe;c.fillStyle="#ff9b4d";c.beginPath();c.ellipse(x,y-7,7+2*breathe,10+3*breathe,0,0,Math.PI*2);c.fill();c.shadowBlur=0;c.globalAlpha=1;
    for(let i=0;i<3;i++){const p=(smoke+i/3)%1,drift=Math.sin(time*1.7+i)*5;c.globalAlpha=(1-p)*.25;c.fillStyle="#ded7c1";c.beginPath();c.arc(x-17+drift*p,y-57-p*25,3+p*7,0,Math.PI*2);c.fill()}
    c.globalAlpha=1;if(recoil>.15){c.fillStyle="#ffd36c";for(let i=0;i<4;i++){const a=i*Math.PI/2+time*3;c.fillRect(x+Math.cos(a)*(13+recoil*8)-1,y-11+Math.sin(a)*(10+recoil*6)-1,3,3)}}towerElementalAura(c,t,time);c.restore();return
  }
  if(t.element==="frost"&&lv===1&&frostSpireArt?.complete){
    c.fillStyle="#18313877";c.beginPath();c.ellipse(x+1,y+20,34,10,0,0,Math.PI*2);c.fill();
    c.drawImage(frostSpireArt,120,15,1015,1210,x-42,y-77,84,100);
    const pulse=.5+.5*Math.sin(time*3.4+t.id);c.globalAlpha=.18+.22*pulse;c.shadowColor="#6fe8f4";c.shadowBlur=18;c.fillStyle="#baf7fb";c.beginPath();c.moveTo(x,y-59);c.lineTo(x+7,y-36);c.lineTo(x,y-21);c.lineTo(x-7,y-36);c.closePath();c.fill();c.shadowBlur=0;c.globalAlpha=1;towerElementalAura(c,t,time);c.restore();return
  }
  if(t.element==="storm"&&lv===1&&stormBastionArt?.complete){
    c.fillStyle="#1d203077";c.beginPath();c.ellipse(x+1,y+20,33,10,0,0,Math.PI*2);c.fill();
    c.drawImage(stormBastionArt,140,20,920,1215,x-38,y-78,76,101);
    const pulse=.5+.5*Math.sin(time*5.2+t.id);c.globalAlpha=.2+.3*pulse;c.shadowColor="#d4a8f4";c.shadowBlur=20;c.fillStyle="#d9b8f2";c.beginPath();c.moveTo(x,y-48);c.lineTo(x+8,y-35);c.lineTo(x,y-22);c.lineTo(x-8,y-35);c.closePath();c.fill();c.shadowBlur=0;c.globalAlpha=1;towerElementalAura(c,t,time);c.restore();return
  }
  if(t.element==="nature"&&lv===1&&wildLodgeArt?.complete){
    c.fillStyle="#20311c77";c.beginPath();c.ellipse(x+1,y+20,35,10,0,0,Math.PI*2);c.fill();
    c.drawImage(wildLodgeArt,120,40,1010,1180,x-42,y-75,84,98);
    const pulse=.5+.5*Math.sin(time*3+t.id);c.globalAlpha=.16+.3*pulse;c.shadowColor="#d7e66d";c.shadowBlur=18;c.fillStyle="#e1ed82";c.beginPath();c.moveTo(x,y-51);c.quadraticCurveTo(x+9,y-40,x,y-25);c.quadraticCurveTo(x-9,y-40,x,y-51);c.fill();c.shadowBlur=0;c.globalAlpha=1;towerElementalAura(c,t,time);c.restore();return
  }
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
  towerElementalAura(c,t,time);
  c.restore();
}

function fallArt(c:CanvasRenderingContext2D,f:any){
  const max=f.kind==="warden"?1.1:.65,p=1-f.life/max;c.save();c.translate(f.x+10*p,f.y+8*p);c.globalAlpha=Math.max(0,f.life/max);c.strokeStyle=f.kind==="wisp"?"#b8f5df":f.kind==="warden"?"#e39054":"#5b4b32";c.lineWidth=f.kind==="warden"?5:3;c.beginPath();c.ellipse(0,8,12+(f.kind==="warden"?18:5)*p,4+8*p,0,0,Math.PI*2);c.stroke();if(f.kind==="wisp"){c.fillStyle="#b8f5df";for(let i=0;i<5;i++){const a=i*Math.PI*.4+p*2;c.beginPath();c.arc(Math.cos(a)*(8+18*p),Math.sin(a)*(5+12*p),2,0,Math.PI*2);c.fill()}}else{c.rotate(p*.8);c.scale(1,Math.max(.18,1-p*.9));c.fillStyle=f.kind==="warden"?"#5d3028":f.kind==="brute"?"#665d44":"#435438";c.strokeStyle="#24251f";c.lineWidth=3;c.beginPath();c.roundRect(f.kind==="warden"?-24:-13,f.kind==="warden"?-22:-13,f.kind==="warden"?48:26,f.kind==="warden"?44:26,6);c.fill();c.stroke()}c.restore();
}

function enemyArt(c:CanvasRenderingContext2D,e:Enemy,time:number){
  const cadence=e.kind==="warden"?5.2:e.kind==="brute"?6.5:e.kind==="wisp"?6:10,step=Math.sin(time*cadence+e.x*.08),weight=e.kind==="warden"?.45:e.kind==="brute"?.65:1,hitKick=Math.min(1,e.hit*8),ink="#20261f";c.save();c.translate(e.x-e.facing*hitKick*8,e.y+step*2*weight);c.rotate(step*.035*weight-e.facing*hitKick*.08);c.scale(1+Math.abs(step)*.025*weight+hitKick*.07,1-Math.abs(step)*.02*weight-hitKick*.08);c.lineJoin="round";c.lineCap="round";
  c.fillStyle="#25332855";c.beginPath();c.ellipse(3,e.radius+7,e.radius+7,5,0,0,Math.PI*2);c.fill();
  if(e.kind==="wisp"){
    if(e.burn<=0&&e.poison<=0){c.save();c.rotate(time*1.7);c.strokeStyle="#b8f5df";c.lineWidth=2;c.globalAlpha=.55+.2*Math.sin(time*5);c.setLineDash([5,5]);c.beginPath();c.arc(0,0,e.radius+8,0,Math.PI*2);c.stroke();c.restore()}
    c.shadowColor="#a6f2e8";c.shadowBlur=14;c.fillStyle="#3a7080";c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(0,-e.radius-3);c.quadraticCurveTo(e.radius+5,-2,3,e.radius+6);c.quadraticCurveTo(-e.radius-5,2,0,-e.radius-3);c.fill();c.stroke();c.shadowBlur=0;c.fillStyle="#d5fff4";c.beginPath();c.arc(-3,-2,2.5,0,Math.PI*2);c.arc(4,-2,2.5,0,Math.PI*2);c.fill();
  }else if(e.kind==="scout"){
    c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(-5,8);c.lineTo(-8+step*3,17);c.moveTo(5,8);c.lineTo(8-step*3,17);c.stroke();c.fillStyle="#46573b";c.beginPath();c.ellipse(0,1,11,14,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#35492f";c.beginPath();c.moveTo(-8,-7);c.lineTo(-18,-15);c.lineTo(-11,0);c.moveTo(8,-7);c.lineTo(18,-15);c.lineTo(11,0);c.fill();c.fillStyle="#f5dc65";c.fillRect(-6,-4,4,3);c.fillRect(2,-4,4,3);c.strokeStyle="#c39b58";c.lineWidth=3;c.beginPath();c.moveTo(-11,1);c.lineTo(-18,9+step*2);c.stroke();
  }else if(e.kind==="brute"){
    c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.moveTo(-8,11);c.lineTo(-11+step*2,22);c.moveTo(8,11);c.lineTo(11-step*2,22);c.stroke();c.fillStyle="#5b543d";c.beginPath();c.roundRect(-16,-16,32,33,7);c.fill();c.stroke();c.fillStyle=e.armor>5?"#85785e":"#5f5746";c.beginPath();c.moveTo(-20,-11);c.lineTo(-7,-19);c.lineTo(3,5);c.lineTo(-15,12);c.closePath();c.fill();c.stroke();c.fillStyle="#d7bd7a";c.fillRect(-5,-7,4,4);c.fillRect(4,-7,4,4);c.strokeStyle="#c7b076";c.lineWidth=4;c.beginPath();c.moveTo(15,-5);c.lineTo(23,8+step);c.stroke();
  }else{
    c.strokeStyle=ink;c.lineWidth=6;c.beginPath();c.moveTo(-11,15);c.lineTo(-14+step*3,29);c.moveTo(11,15);c.lineTo(14-step*3,29);c.stroke();c.fillStyle=e.phase?"#6d2c25":"#47362c";c.beginPath();c.moveTo(-20,-17);c.quadraticCurveTo(0,-30,20,-17);c.lineTo(17,22);c.lineTo(0,13);c.lineTo(-17,22);c.closePath();c.fill();c.stroke();c.strokeStyle=e.phase?"#ff8054":"#b79058";c.lineWidth=5;c.beginPath();c.moveTo(-10,-19);c.lineTo(-22,-35);c.lineTo(-30,-38);c.moveTo(-20,-32);c.lineTo(-14,-42);c.moveTo(10,-19);c.lineTo(22,-35);c.lineTo(30,-38);c.moveTo(20,-32);c.lineTo(14,-42);c.stroke();c.fillStyle=e.phase?"#ff5e45":"#ffb05d";c.shadowColor=c.fillStyle;c.shadowBlur=9;c.beginPath();c.arc(-7,-8,3,0,Math.PI*2);c.arc(7,-8,3,0,Math.PI*2);c.fill();c.shadowBlur=0;
  }
  if(e.root>0){c.strokeStyle="#8fd06c";c.lineWidth=3;c.beginPath();c.moveTo(-e.radius,12);c.quadraticCurveTo(0,-2,e.radius,12);c.moveTo(-e.radius+4,17);c.quadraticCurveTo(0,4,e.radius-4,17);c.stroke()}
  if(e.chill>0){c.strokeStyle="#a8efff";c.lineWidth=3;c.beginPath();c.arc(0,1,e.radius+4,-2.8,.1);c.stroke()}
  if(e.burn>0){c.fillStyle="#ff7a42";c.beginPath();c.moveTo(-5,-e.radius);c.quadraticCurveTo(0,-e.radius-12+step*2,5,-e.radius);c.quadraticCurveTo(0,-e.radius+5,-5,-e.radius);c.fill()}
  if(e.poison>0){c.fillStyle="#89d46c";c.beginPath();c.arc(e.radius,-3,3,0,Math.PI*2);c.arc(e.radius+4,3,2,0,Math.PI*2);c.fill()}
  if(e.hit>0){c.globalAlpha=Math.min(.68,e.hit*7);c.fillStyle="#fff8d2";c.beginPath();c.arc(0,0,e.radius+5,0,Math.PI*2);c.fill();c.globalAlpha=1}
  c.fillStyle="#171914";c.fillRect(-e.radius,-e.radius-14,e.radius*2,6);c.fillStyle=e.hp/e.maxHp<.3?"#ff665b":"#a8de75";c.fillRect(-e.radius,-e.radius-14,e.radius*2*Math.max(0,e.hp/e.maxHp),6);
  const effects=[e.burn>0?"#ff7547":"",e.chill>0?"#78ddf5":"",e.poison>0?"#7fcf63":"",e.root>0?"#d0dc72":""].filter(Boolean);effects.forEach((col,i)=>{c.fillStyle=col;c.strokeStyle="#1b211b";c.lineWidth=1;c.beginPath();c.arc((i-(effects.length-1)/2)*7,e.radius+10,2.8,0,Math.PI*2);c.fill();c.stroke()});
  if(e.armor>0){c.fillStyle="#d9c58f";c.strokeStyle="#282820";c.lineWidth=1.5;c.beginPath();c.moveTo(e.radius+5,-e.radius-13);c.lineTo(e.radius+11,-e.radius-10);c.lineTo(e.radius+9,-e.radius-3);c.lineTo(e.radius+5,0);c.lineTo(e.radius+1,-e.radius-3);c.lineTo(e.radius-1,-e.radius-10);c.closePath();c.fill();c.stroke()}
  c.restore();
}

function ambientWild(c:CanvasRenderingContext2D,time:number){
  c.save();
  // Slow canopy shadows create depth without obscuring the combat lane.
  c.globalAlpha=.1;c.fillStyle="#102d20";for(let i=0;i<8;i++){const x=(i*173+Math.sin(time*.12+i)*24)%1080-40,y=i%2?26:585;c.beginPath();c.ellipse(x,y,72+i%3*18,24+i%2*11,Math.sin(i)*.2,0,Math.PI*2);c.fill()}
  // Reeds bend together beside the river, visually tying it into the woodland.
  c.globalAlpha=.75;c.strokeStyle="#244f36";c.lineWidth=3;for(let i=0;i<28;i++){const x=18+i*37,y=515+Math.sin(i*.8)*19,sway=Math.sin(time*1.2+i*.65)*4;c.beginPath();c.moveTo(x,y+17);c.quadraticCurveTo(x+sway,y+6,x+sway*.7,y-5);c.stroke();c.fillStyle=i%3?"#76934c":"#b79245";c.beginPath();c.ellipse(x+sway*.7,y-7,2.4,6,.25,0,Math.PI*2);c.fill()}
  // Pollen motes and fireflies give the clearing a restrained living rhythm.
  for(let i=0;i<18;i++){const x=(i*83+time*(3+i%3))%1040-20,y=70+(i*67)%430+Math.sin(time*(.7+i%4*.12)+i)*12,pulse=.25+.55*(.5+.5*Math.sin(time*2.2+i*1.7));c.globalAlpha=pulse;c.fillStyle=i%4===0?"#f6df73":"#d7eca1";c.shadowColor=c.fillStyle;c.shadowBlur=i%4===0?8:3;c.beginPath();c.arc(x,y,i%4===0?2.2:1.2,0,Math.PI*2);c.fill()}
  c.restore();
}

function reactionArt(c:CanvasRenderingContext2D,fx:ReactionFx){
  const p=1-fx.life/fx.max,r=16+p*36;c.save();c.translate(fx.x,fx.y);c.globalAlpha=(1-p)*.85;c.lineCap="round";c.lineJoin="round";
  if(fx.kind==="THERMAL SHOCK"||fx.kind==="PERMAFROST"){c.strokeStyle=fx.kind==="THERMAL SHOCK"?"#fff0b0":"#a9efff";c.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a+.18)*(r+7),Math.sin(a+.18)*(r+7));c.stroke()}}
  else if(fx.kind==="SUPERCONDUCT"||fx.kind==="OVERGROWTH ARC"){c.strokeStyle=fx.kind==="SUPERCONDUCT"?"#e5c8ff":"#c8ed7f";c.lineWidth=3;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r*.45,Math.sin(a)*r*.45);c.lineTo(Math.cos(a+.14)*r,Math.sin(a+.14)*r);c.stroke()}}
  else{const toxic=fx.kind==="TOXIC FLAME";c.strokeStyle=toxic?"#b6dc59":"#ff9b50";c.fillStyle=toxic?"#7bbf5266":"#ff6c4166";c.lineWidth=3;c.rotate(p*2.4);for(let i=0;i<6;i++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(7,0);c.quadraticCurveTo(r*.7,-12,r,0);c.quadraticCurveTo(r*.68,12,7,0);c.fill();c.stroke()}}
  c.restore();
}

function draw(canvas:HTMLCanvasElement|null,g:any,selected:Element){if(!canvas||!g)return;const c=canvas.getContext("2d")!;c.save();const sx=g.screenShake?(Math.random()-.5)*g.shake:0,sy=g.screenShake?(Math.random()-.5)*g.shake:0;c.translate(sx,sy);const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#77a55d");grad.addColorStop(1,"#396d4b");c.fillStyle=grad;c.fillRect(-20,-20,W+40,H+40);
  // terrain texture
  c.globalAlpha=.18;c.fillStyle="#d8e88e";for(let i=0;i<90;i++){const x=(i*137)%W,y=(i*83)%H;c.beginPath();c.arc(x,y,2+(i%4),0,Math.PI*2);c.fill()}c.globalAlpha=1;
  [[35,62,1.1],[82,43,.85],[155,42,1],[245,53,.82],[365,48,.95],[456,62,.8],[580,52,1],[690,54,.82],[780,56,1],[940,65,1.15],[48,475,1.1],[125,520,.88],[212,495,1],[325,555,1.08],[440,520,.85],[590,535,1],[735,548,1.05],[850,520,.85],[960,535,1.1]].forEach(v=>tree(c,v[0],v[1],v[2]));
  ambientWild(c,g.time);
  ruin(c,336,470,.95);ruin(c,760,76,.72);flowerPatch(c,156,350,"#d9a5ee");flowerPatch(c,450,405,"#fff1a1");flowerPatch(c,870,95,"#ef9d8c");
  // The Hollow gate gives the enemy entrance a clear story silhouette.
  c.fillStyle="#17251d";c.strokeStyle="#394a32";c.lineWidth=7;c.beginPath();c.arc(0,178,48,-Math.PI/2,Math.PI/2);c.lineTo(0,226);c.closePath();c.fill();c.stroke();c.strokeStyle="#a57042";c.lineWidth=5;for(const y of [146,178,210]){c.beginPath();c.moveTo(4,y);c.lineTo(28,y-13);c.stroke()}c.fillStyle="#e07842";c.shadowColor="#ff7b3d";c.shadowBlur=14;c.beginPath();c.arc(14,178,5+Math.sin(g.time*5),0,Math.PI*2);c.fill();c.shadowBlur=0;
  c.fillStyle="#f0d98b";for(const [x,y] of [[68,410],[280,390],[650,115],[865,455]]){c.fillRect(x-2,y,4,9);c.fillStyle="#b8523d";c.beginPath();c.arc(x,y,5,Math.PI,0);c.fill();c.fillStyle="#f0d98b"}
  for(const [x,y] of [[180,410],[350,365],[535,85],[620,470],[760,110],[915,430]]){c.fillStyle="#4a6648";c.beginPath();c.moveTo(x-9,y+6);c.lineTo(x-5,y-5);c.lineTo(x+4,y-8);c.lineTo(x+11,y+5);c.closePath();c.fill();c.strokeStyle="#91a775";c.lineWidth=2;c.stroke()}
  c.strokeStyle="#315f37";c.lineWidth=2;for(let i=0;i<34;i++){const x=(i*173+47)%960+20,y=(i*97+73)%500+35;c.beginPath();c.moveTo(x,y+6);c.lineTo(x-3,y);c.moveTo(x,y+6);c.lineTo(x+2,y-3);c.moveTo(x,y+6);c.lineTo(x+5,y+1);c.stroke()}
  c.fillStyle="#6f4c2c";c.fillRect(28,206,6,35);c.fillRect(12,208,39,7);c.fillStyle="#ead08b";c.font="bold 8px Georgia";c.save();c.translate(31,214);c.rotate(-.04);c.textAlign="center";c.fillText("THE HOLLOW",0,0);c.restore();c.textAlign="left";
  // river and path
  c.strokeStyle="#2a6871";c.lineWidth=68;c.beginPath();c.moveTo(0,540);c.bezierCurveTo(280,450,600,650,1020,480);c.stroke();c.strokeStyle="#55a4b4";c.lineWidth=52;c.stroke();c.strokeStyle="#94d0d0";c.lineWidth=3;c.setLineDash([22,28]);c.lineDashOffset=-g.time*18;c.stroke();c.setLineDash([]);
  c.lineCap="round";c.lineJoin="round";c.strokeStyle="#53613e";c.lineWidth=68;c.beginPath();path.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();c.strokeStyle="#c8a66d";c.lineWidth=54;c.stroke();c.strokeStyle="#e3c789";c.lineWidth=4;c.setLineDash([4,17]);c.stroke();c.setLineDash([]);
  // Heartstone shrine: a readable objective rather than a floating gem.
  c.fillStyle="#34443c66";c.beginPath();c.ellipse(967,323,43,13,0,0,Math.PI*2);c.fill();c.fillStyle="#7d806b";c.strokeStyle="#3e493d";c.lineWidth=4;c.beginPath();c.moveTo(935,319);c.lineTo(944,286);c.lineTo(955,294);c.lineTo(980,294);c.lineTo(991,284);c.lineTo(999,319);c.closePath();c.fill();c.stroke();c.shadowBlur=25;c.shadowColor="#7de6c4";c.fillStyle="#89efd0";c.beginPath();c.moveTo(955,286);c.lineTo(974,249);c.lineTo(992,286);c.lineTo(974,326);c.closePath();c.fill();c.fillStyle="#d8fff3";c.beginPath();c.moveTo(966,280);c.lineTo(974,263);c.lineTo(979,280);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle="#effff4";c.font="bold 11px Georgia";c.textAlign="right";c.fillText("HEARTSTONE",995,347);c.textAlign="left";
  pads.forEach((p,i)=>{const occupied=g.towers.some((t:Tower)=>dist(t,{x:p[0],y:p[1]})<5);if(occupied)return;const hover=g.hover===i;c.fillStyle="#453f32aa";c.beginPath();c.ellipse(p[0]+3,p[1]+8,29,10,0,0,Math.PI*2);c.fill();c.strokeStyle=hover?colors[selected]:"#d2be83";c.fillStyle=hover?colors[selected]+"66":"#776e57";c.lineWidth=hover?4:3;c.beginPath();c.arc(p[0],p[1],hover?31:27,0,Math.PI*2);c.fill();c.stroke();for(let s=0;s<8;s++){const a=s*Math.PI/4;c.strokeStyle="#4f493b";c.beginPath();c.moveTo(p[0]+Math.cos(a)*18,p[1]+Math.sin(a)*18);c.lineTo(p[0]+Math.cos(a)*27,p[1]+Math.sin(a)*27);c.stroke()}c.globalAlpha=.7;c.strokeStyle=hover?colors[selected]:"#d9ce9d";c.beginPath();c.arc(p[0],p[1],10+Math.sin(g.time*2+i)*2,0,Math.PI*2);c.stroke();c.globalAlpha=1});
  g.towers.forEach((t:Tower,i:number)=>towerArt(c,t,g.selectedTower===i,g.time));
  const sigil=g.aiming?{...g.mouse,life:1}:g.surgeMark;if(sigil){const pulse=1+Math.sin(g.time*8)*.035;c.save();c.translate(sigil.x,sigil.y);c.scale(pulse,pulse);c.globalAlpha=g.aiming?.72:Math.min(.9,sigil.life);c.fillStyle="#79cf5430";c.strokeStyle="#d9ff8b";c.lineWidth=g.aiming?3:6;c.beginPath();c.arc(0,0,112,0,Math.PI*2);c.fill();c.stroke();c.rotate(g.time*.45);for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(72,0);c.quadraticCurveTo(92,-15,108,0);c.quadraticCurveTo(92,15,72,0);c.stroke()}c.restore()}
  for(const f of g.falls)fallArt(c,f);
  for(const r of g.rings){const p=1-r.life/r.max;c.save();c.globalAlpha=(1-p)*.85;c.strokeStyle=r.color;c.lineWidth=4*(1-p)+1;c.shadowColor=r.color;c.shadowBlur=8;c.beginPath();c.arc(r.x,r.y,5+r.size*p,0,Math.PI*2);c.stroke();c.restore()}
  for(const fx of g.reactions)reactionArt(c,fx);
  for(const e of g.enemies)if(e.alive)enemyArt(c,e,g.time);
  const boss=g.enemies.find((e:Enemy)=>e.alive&&e.kind==="warden");if(boss){c.fillStyle="#09120fdd";c.fillRect(300,18,400,36);c.strokeStyle=boss.phase?"#ff6847":"#d9b467";c.strokeRect(300,18,400,36);c.fillStyle="#25110f";c.fillRect(314,39,372,6);c.fillStyle=boss.phase?"#ff6847":"#d9b467";c.fillRect(314,39,372*Math.max(0,boss.hp/boss.maxHp),6);c.fillStyle="#f1dfbd";c.font="bold 11px Georgia";c.textAlign="center";c.fillText(boss.phase?"ASHEN WARDEN · ENRAGED":"ASHEN WARDEN",500,34);c.textAlign="left"}
  c.lineCap="round";for(const b of g.bolts){c.save();c.globalAlpha=Math.min(1,b.life*9);c.strokeStyle=b.color;c.fillStyle=b.color;c.shadowColor=b.color;c.shadowBlur=10;if(b.kind==="storm"){c.lineWidth=2.5;c.beginPath();c.moveTo(b.x,b.y);c.lineTo((b.x+b.tx)/2+(Math.random()-.5)*14,(b.y+b.ty)/2+(Math.random()-.5)*14);c.lineTo(b.tx,b.ty);c.stroke()}else{const p=1-b.life/.18,px=b.x+(b.tx-b.x)*p,py=b.y+(b.ty-b.y)*p-22*Math.sin(p*Math.PI),a=Math.atan2(b.ty-b.y,b.tx-b.x);c.translate(px,py);c.rotate(a);if(b.kind==="fire"){c.strokeStyle="#ffb34f";c.lineWidth=4;c.beginPath();c.moveTo(-18,0);c.lineTo(-5,0);c.stroke();c.fillStyle="#ff6a3d";c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.fillStyle="#ffe08a";c.beginPath();c.arc(2,-2,2.5,0,Math.PI*2);c.fill()}else if(b.kind==="frost"){c.rotate(p*Math.PI*2);c.fillStyle="#bdf6ff";c.strokeStyle="#429bb5";c.lineWidth=2;c.beginPath();c.moveTo(9,0);c.lineTo(0,5);c.lineTo(-9,0);c.lineTo(0,-5);c.closePath();c.fill();c.stroke()}else{c.rotate(Math.sin(p*8)*.5);c.strokeStyle="#b5e47e";c.lineWidth=2;c.beginPath();c.moveTo(-16,7);c.quadraticCurveTo(-8,-5,0,0);c.stroke();c.fillStyle="#75c85c";c.beginPath();c.moveTo(8,0);c.quadraticCurveTo(0,-8,-7,0);c.quadraticCurveTo(0,8,8,0);c.fill()}}c.restore()}c.shadowBlur=0;c.globalAlpha=1;for(const p of g.particles){c.globalAlpha=Math.max(0,p.life*2);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.size,p.size)}for(const t of g.texts){c.globalAlpha=Math.min(1,t.life*2);c.fillStyle="#1f291d";c.font="900 15px Georgia";c.textAlign="center";c.fillText(t.label,t.x+2,t.y+2);c.fillStyle=t.color;c.fillText(t.label,t.x,t.y)}c.textAlign="left";c.globalAlpha=1;
  if(g.waveBanner){const b=g.waveBanner,p=1-b.life/b.max,alpha=Math.min(1,b.life*2, p*5);c.save();c.globalAlpha=alpha;c.translate(500,82);c.scale(.92+Math.min(1,p*4)*.08,1);c.fillStyle=b.boss?"#3b1715e8":"#14251fe8";c.strokeStyle=b.boss?"#ec7652":"#d4bd72";c.lineWidth=2;c.beginPath();c.moveTo(-154,-27);c.lineTo(154,-27);c.lineTo(170,0);c.lineTo(154,27);c.lineTo(-154,27);c.lineTo(-170,0);c.closePath();c.fill();c.stroke();c.fillStyle="#fff0c0";c.font="900 19px Georgia";c.textAlign="center";c.fillText(b.title,0,-2);c.fillStyle=b.boss?"#ff9d78":"#9fc6a8";c.font="700 8px Arial";c.fillText(b.subtitle,0,13);c.restore()}
  if(g.autoCountdown>0&&g.state==="between"){c.save();c.globalAlpha=.9;c.fillStyle="#102019dc";c.strokeStyle="#89a96f";c.lineWidth=2;c.beginPath();c.arc(500,310,42,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#f3dda0";c.font="900 25px Georgia";c.textAlign="center";c.fillText(String(g.autoCountdown),500,312);c.fillStyle="#a8c2aa";c.font="700 7px Arial";c.fillText("NEXT WAVE",500,327);c.restore()}
  if(g.flash){c.fillStyle=`rgba(255,100,70,${g.flash})`;c.fillRect(0,0,W,H)}c.restore()}
