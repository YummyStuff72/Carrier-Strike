/* CARRIER STRIKE — complete browser campaign build
   One-file gameplay engine: map, AI, combat, aircraft missions, liberation, economy,
   upgrades, refueling, fog, saves, daily orders, and final escort operation. */
(() => {
'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const C={DAY:1440,FUEL_RATE:7.5,AIR_FUEL_RATE:0.125,SHIP_FUEL:32400,AIR_FUEL:9225,MAP_W:7200,MAP_H:3600};
const DIFF={easy:{enemy:0.72,ai:0.7,econ:1.15},normal:{enemy:1,ai:1,econ:1},hard:{enemy:1.3,ai:1.25,econ:.9},extra:{enemy:1.65,ai:1.55,econ:.75}};
let difficulty='normal', running=false, raf=0, last=0, menuSceneRAF=0, toastTimer=0;
const map=$('map'),ctx=map.getContext('2d'); const m3=$('menu3d'),m3ctx=m3.getContext('2d');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), lerp=(a,b,t)=>a+(b-a)*t, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)], fmt=n=>Math.round(n).toLocaleString();
function resize(){for(const [c,ct] of [[map,ctx],[m3,m3ctx]]){const r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.max(1,r.width*d);c.height=Math.max(1,r.height*d);ct.setTransform(d,0,0,d,0,0)}} addEventListener('resize',resize); resize();

// Historical strategic locations, represented as an intentionally simplified strategic chart.
const islands=[
{id:'japan',name:'Japanese Home Islands',x:-3000,y:-520,side:'jp',size:250,def:{mg:8,flak:2,gun:0,quad:0},lib:0},
{id:'honshu',name:'Honshu',x:-2940,y:-520,side:'jp',size:150,def:{mg:6,flak:2,gun:0,quad:0},lib:0},
{id:'okinawa',name:'Okinawa',x:-2440,y:60,side:'jp',size:85,def:{mg:5,flak:1,gun:0,quad:0},lib:0},
{id:'iwo',name:'Iwo Jima',x:-2250,y:-250,side:'jp',size:55,def:{mg:3,flak:1,gun:0,quad:0},lib:0},
{id:'wake',name:'Wake Island',x:-1480,y:-80,side:'us',size:58,def:{mg:3,flak:0,gun:0,quad:0},lib:100},
{id:'midway',name:'Midway',x:-1840,y:-540,side:'us',size:68,def:{mg:4,flak:1,gun:0,quad:0},lib:100},
{id:'hawaii',name:'Hawaii',x:-860,y:220,side:'us',size:150,def:{mg:8,flak:3,gun:1,quad:1},lib:100,base:true},
{id:'johnston',name:'Johnston Atoll',x:-1030,y:470,side:'us',size:45,def:{mg:2,flak:0,gun:0,quad:0},lib:100},
{id:'guam',name:'Guam',x:-1640,y:610,side:'jp',size:72,def:{mg:4,flak:1,gun:0,quad:0},lib:0,base:true},
{id:'philippines',name:'Philippines',x:-1940,y:1030,side:'jp',size:180,def:{mg:8,flak:2,gun:1,quad:0},lib:0},
{id:'palau',name:'Palau',x:-1590,y:820,side:'jp',size:70,def:{mg:4,flak:1,gun:0,quad:0},lib:0},
{id:'truk',name:'Truk',x:-1300,y:650,side:'jp',size:78,def:{mg:5,flak:1,gun:0,quad:0},lib:0},
{id:'saipan',name:'Saipan',x:-1910,y:370,side:'jp',size:70,def:{mg:4,flak:1,gun:0,quad:0},lib:0},
{id:'tinian',name:'Tinian',x:-1880,y:430,side:'jp',size:48,def:{mg:3,flak:0,gun:0,quad:0},lib:0},
{id:'kwajalein',name:'Kwajalein',x:-1340,y:-70,side:'jp',size:70,def:{mg:4,flak:1,gun:0,quad:0},lib:0},
{id:'tarawa',name:'Tarawa',x:-1170,y:20,side:'jp',size:62,def:{mg:4,flak:1,gun:0,quad:0},lib:0},
{id:'guadalcanal',name:'Guadalcanal',x:-1040,y:900,side:'jp',size:78,def:{mg:5,flak:1,gun:0,quad:0},lib:0},
{id:'newgeorgia',name:'New Georgia',x:-980,y:810,side:'jp',size:62,def:{mg:4,flak:1,gun:0,quad:0},lib:0},
{id:'bougainville',name:'Bougainville',x:-830,y:720,side:'jp',size:90,def:{mg:5,flak:1,gun:0,quad:0},lib:0},
{id:'newguinea',name:'New Guinea',x:-850,y:1180,side:'us',size:190,def:{mg:7,flak:2,gun:0,quad:0},lib:100},
{id:'fiji',name:'Fiji',x:-650,y:1330,side:'us',size:70,def:{mg:4,flak:1,gun:0,quad:0},lib:100},
{id:'samoa',name:'Samoa',x:-470,y:1110,side:'us',size:60,def:{mg:3,flak:0,gun:0,quad:0},lib:100},
{id:'guamSouth',name:'Palmyra',x:-1040,y:560,side:'us',size:38,def:{mg:2,flak:0,gun:0,quad:0},lib:100},
{id:'california',name:'California',x:2800,y:80,side:'us',size:230,def:{mg:12,flak:5,gun:3,quad:2},lib:100,base:true}
];
// The map coordinate system deliberately puts Japan/Guam/Philippines left and continental USA right.
const neutrals=[{name:'Australia',x:-260,y:1560,size:280},{name:'USSR',x:-2350,y:-1250,size:300},{name:'China',x:-2400,y:260,size:230}];
const shipDefs={
'Patrol Boat':{hp:50,speed:12,range:12,weapons:[['mg',2,260,12]],value:35},
'Trader':{hp:100,speed:6,range:0,weapons:[],value:100},
'Submarine':{hp:100,speed:12,range:60,weapons:[['mg',2,260,12],['torpedo',150,4,60]],value:180},
'Destroyer':{hp:300,speed:6,range:145,weapons:[['mg',2,260,12],['flak',15,100,20],['gun',100,20,145]],value:250},
'Cruiser':{hp:600,speed:6,range:145,weapons:[['mg',2,260,12],['flak',15,100,20],['gun',150,20,145]],value:500},
'Battleship':{hp:1200,speed:3,range:145,weapons:[['mg',2,260,12],['flak',15,100,20],['quad',25,40,8],['gun',150,20,145]],value:900},
'Carrier':{hp:800,speed:6,range:145,weapons:[['mg',2,260,12],['flak',15,100,20]],value:1100}
};
const planes={
Scout:{hp:25,maxHp:25,ammo:50,fuel:75,speed:2.22,sight:360,mg:1,mgDamage:2,value:45},
Fighter:{hp:50,maxHp:50,ammo:250,fuel:90,speed:2.22,sight:230,mg:4,mgDamage:2,value:65},
'Dive Bomber':{hp:50,maxHp:50,ammo:75,fuel:90,speed:2.22,sight:250,mg:1,mgDamage:2,bombs:1,bombDamage:100,value:90}
};
const state={time:0,speed:1,paused:false,gameOver:false,camera:{x:1700,y:250,zoom:.34},carrier:{x:1800,y:220,hp:800,maxHp:800,shipFuel:C.SHIP_FUEL,airFuel:C.AIR_FUEL,throttle:60},money:1000,rep:0,air:{Scout:10,Fighter:40,'Dive Bomber':20},route:[],ships:[],missions:[],effects:[],selected:{kind:'carrier',obj:null},explored:[],missionPlanning:false,missionDraft:null,upgrades:{},dc:2,libKills:0,territoryCaptured:0,dayMainDone:false,daySideDone:false,final:false,finalBomber:null,finalStarted:false,orders:null,seed:Math.floor(Math.random()*1e9)};
const discovered=new Set(['california','hawaii','wake','midway']);
function newId(prefix){return prefix+Math.random().toString(36).slice(2,9)}
function addShip(type,x,y,side='jp',extra={}){const d=shipDefs[type];const s={id:newId('s'),type,x,y,side,hp:d.hp,maxHp:d.hp,speed:d.speed,weaponClock:{},target:null,submerged:type==='Submarine',surfaceTimer:0,torpedoes:type==='Submarine'?Math.floor(rand(1,5)):0,cargo:null,escort:false,retreat:false,aiClock:0,...extra};state.ships.push(s);return s}
function makeWorld(){state.ships=[];for(let i=0;i<3;i++)addShip('Patrol Boat',-2400+i*100,rand(-300,900));for(let i=0;i<3;i++)addShip('Destroyer',-1750+i*85,rand(-100,850));addShip('Cruiser',-1510,420);addShip('Submarine',-1200,300);addShip('Submarine',-1050,600,'jp',{})
  spawnMerchant(-2050,650);spawnMerchant(-1820,250);spawnMerchant(-1450,50);spawnMerchant(-2600,-300);
  spawnFormation('Carrier',-2600,-100); spawnFormation('Battleship',-2250,400); spawnFormation('Cruiser',-1500,1000);
}
function spawnMerchant(x,y){const s=addShip('Trader',x,y,'jp',{cargo:pick(['civilian','food','military clothing','infantry ammo + weapons','tanks + artillery + ammo','VIP'])});let escorts=[];if(s.cargo==='food'||s.cargo==='military clothing'){for(let i=0;i<Math.floor(rand(1,3));i++)escorts.push(addShip('Patrol Boat',x+rand(-40,40),y+rand(-40,40)));}else if(s.cargo==='infantry ammo + weapons'){for(let i=0;i<2;i++)escorts.push(addShip('Destroyer',x+rand(-50,50),y+rand(-50,50)));}else if(s.cargo==='tanks + artillery + ammo'){for(let i=0;i<4;i++)escorts.push(addShip('Destroyer',x+rand(-60,60),y+rand(-60,60)));escorts.push(addShip('Battleship',x+80,y+40));}else if(s.cargo==='VIP'){for(let i=0;i<4;i++)escorts.push(addShip('Destroyer',x+rand(-60,60),y+rand(-60,60)));escorts.push(addShip('Battleship',x+80,y+40));if(Math.random()<.5){escorts.push(addShip('Cruiser',x-70,y-40));escorts.push(addShip('Cruiser',x+30,y-70));}}s.escort=true;return s}
function spawnFormation(type,x,y){const s=addShip(type,x,y);if(type==='Carrier'){addShip('Battleship',x-100,y+70);for(let i=0;i<2;i++)addShip('Cruiser',x-130-i*80,y-70);for(let i=0;i<4;i++)addShip('Destroyer',x-80-i*70,y+150);}else if(type==='Battleship'){for(let i=0;i<2;i++)addShip('Cruiser',x-90-i*70,y-80);for(let i=0;i<4;i++)addShip('Destroyer',x-70-i*60,y+100);}else if(type==='Cruiser'){for(let i=0;i<3;i++)addShip('Destroyer',x-60-i*55,y+90)}return s}
makeWorld();

function worldToScreen(x,y){return{x:(x-state.camera.x)*state.camera.zoom+innerWidth/2,y:(y-state.camera.y)*state.camera.zoom+innerHeight/2}}
function screenToWorld(x,y){return{x:(x-innerWidth/2)/state.camera.zoom+state.camera.x,y:(y-innerHeight/2)/state.camera.zoom+state.camera.y}}
function landRadius(i){return i.size*.52}
function lineHitsIsland(a,b,margin=0){for(const i of islands){if(i.side==='neutral')continue;const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((i.x-a.x)*dx+(i.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);const p={x:a.x+dx*t,y:a.y+dy*t};if(dist(p,i)<landRadius(i)+margin)return i}return null}
function nearestIsland(p,side){let best=null,bd=Infinity;for(const i of islands){if(side&&i.side!==side)continue;const d=dist(p,i);if(d<bd){bd=d;best=i}}return best}
function safeMove(o,target,dt){const dx=target.x-o.x,dy=target.y-o.y,d=Math.hypot(dx,dy);if(d<.1)return true;let sp=(o.speed||6)*dt;sp=Math.min(sp,d);const nx=o.x+dx/d*sp,ny=o.y+dy/d*sp;if(lineHitsIsland({x:o.x,y:o.y},{x:nx,y:ny},o.type==='Carrier'?35:18)){const ang=Math.atan2(dy,dx);o.x+=Math.cos(ang+.75)*sp*.35;o.y+=Math.sin(ang+.75)*sp*.35;return false}o.x=nx;o.y=ny;return d<=sp}
function moveCarrier(dt,gameDt){if(!state.route.length||state.carrier.throttle===0)return;const t=state.route[0], temp={...state.carrier,speed:6};const sp=6*(state.carrier.throttle/100);if(sp<0){const back={x:state.carrier.x-(t.x-state.carrier.x),y:state.carrier.y-(t.y-state.carrier.y)};safeMove(temp,back,dt*Math.abs(state.carrier.throttle)/100)}else{const before={x:state.carrier.x,y:state.carrier.y};const done=safeMove(temp,t,dt*state.carrier.throttle/100);if(lineHitsIsland(before,{x:temp.x,y:temp.y},38)){showToast('Island blocks the route — routing around it.')}if(done)state.route.shift()}state.carrier.x=temp.x;state.carrier.y=temp.y;state.carrier.shipFuel=Math.max(0,state.carrier.shipFuel-C.FUEL_RATE*Math.max(.15,Math.abs(state.carrier.throttle)/100)*gameDt)}
function moveEscort(e,idx,dt){const ang=idx?Math.PI/2:-Math.PI/2;const t={x:state.carrier.x+Math.cos(ang)*45,y:state.carrier.y+Math.sin(ang)*45};e.x=lerp(e.x,t.x,Math.min(1,dt*2));e.y=lerp(e.y,t.y,Math.min(1,dt*2))}
function makeEscorts(){return [addShip('Destroyer',state.carrier.x-25,state.carrier.y+35,'us',{escort:true}),addShip('Destroyer',state.carrier.x+25,state.carrier.y+35,'us',{escort:true})]}
let escorts=makeEscorts();

function accuracy(range,max){const p=range/max;if(p<=.15)return .4;if(p>=.9)return .05;if(p<=.35)return lerp(.4,1,(p-.15)/.2);return lerp(1,.05,(p-.35)/.55)}
function targetFor(s){let enemies=state.ships.filter(x=>x.side!==s.side&&x.hp>0&&!x.submerged);if(s.side==='jp'){enemies=enemies.filter(x=>x.side==='us'||x===stateCarrierProxy());}if(!enemies.length)return null;return enemies.sort((a,b)=>dist(s,a)-dist(s,b))[0]}
function stateCarrierProxy(){return {x:state.carrier.x,y:state.carrier.y,hp:state.carrier.hp,maxHp:state.carrier.maxHp,side:'us',type:'Carrier',id:'carrier'}}
function weaponFire(s,target,kind,damage,bpm,maxRange,dt){const key=kind;if(!s.weaponClock[key])s.weaponClock[key]=0;s.weaponClock[key]+=dt;const interval=60/bpm;if(s.weaponClock[key]<interval)return;s.weaponClock[key]-=interval;const d=dist(s,target),p=accuracy(d,maxRange);if(Math.random()>p)return;damage*=DIFF[difficulty].enemy;if(target.id==='carrier')state.carrier.hp=Math.max(0,state.carrier.hp-damage);else target.hp=Math.max(0,target.hp-damage);state.effects.push({x:target.x,y:target.y,t:.35,kind:'hit'});if(target.hp<=0&&target.id!=='carrier')destroyShip(target,s)}
function fireWeapons(s,target,dt){const d=shipDefs[s.type];for(const w of d.weapons){if(w[0]==='torpedo'){if(s.submerged||s.torpedoes<=0)continue;if(dist(s,target)<=60){s.torpedoes--;const lead=dist(s,target)/Math.max(8,target.speed||6);const aim={x:target.x+(target.x-s.x)/Math.max(1,dist(s,target))*(target.speed||6)*lead,y:target.y+(target.y-s.y)/Math.max(1,dist(s,target))*(target.speed||6)*lead};state.effects.push({x:s.x,y:s.y,t:.8,kind:'torpedo',tx:aim.x,ty:aim.y,source:s});}}else if(dist(s,target)<=w[3])weaponFire(s,target,w[0],w[1],w[2],w[3],dt)}}
function destroyShip(s,killer){if(s.dead)return;s.dead=true;s.hp=0;state.money+=Math.round(shipDefs[s.type].value*DIFF[difficulty].econ);state.rep+=2;if(s.side==='jp'&&s.type!=='Trader')state.rep+=1;showToast(`${s.type} destroyed · +$${Math.round(shipDefs[s.type].value*DIFF[difficulty].econ)}`)}
function updateCombat(dt){for(const s of state.ships){if(s.dead)continue;if(s.type==='Submarine'){if(!s.submerged){s.surfaceTimer+=dt;if(s.surfaceTimer>=30)s.submerged=true;}else if(Math.random()<dt/45){s.submerged=false;s.surfaceTimer=0}}
  if(s.side==='jp'){const proxy=stateCarrierProxy();const escortsAlive=state.ships.filter(x=>x.side==='us'&&x.escort&&!x.dead);let target=escortsAlive.length?pick(escortsAlive):proxy;const d=dist(s,target);if(d<145&&!(s.type==='Submarine'&&s.submerged)){fireWeapons(s,target,dt)}if(d<500&&s.type!=='Trader'&&s.type!=='Patrol Boat'){const me=s.hp/s.maxHp;if(me<.22){s.retreat=true}else if(me>.55){s.retreat=false}const t=s.retreat?nearestIsland(s,'jp')||{x:-2200,y:0}:target; if(s.type!=='Submarine'||s.submerged)safeMove(s,t,dt*.18*DIFF[difficulty].ai)}}
 }
 for(const e of escorts.filter(x=>!x.dead)){const t=state.ships.filter(x=>x.side==='jp'&&!x.dead&&!x.submerged).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(t&&dist(e,t)<145)fireWeapons(e,t,dt)}
}
function updateTorpedoes(dt){for(const e of state.effects){if(e.kind!=='torpedo'||e.done)continue;const dx=e.tx-e.x,dy=e.ty-e.y,d=Math.hypot(dx,dy),sp=70*dt;if(d<=sp){e.done=true;const target=state.ships.find(s=>!s.dead&&s.side==='us'&&dist(s,e)<30)||null;if(target)target.hp=Math.max(0,target.hp-150);if(dist(state.carrier,e)<30)state.carrier.hp=Math.max(0,state.carrier.hp-150);e.x=e.tx;e.y=e.ty;e.t=.5;showToast('TORPEDO DETONATION');}else{e.x+=dx/d*sp;e.y+=dy/d*sp;e.t=Math.min(1,e.t+dt)}}state.effects=state.effects.filter(e=>e.t>0&&!e.done||e.kind==='hit'&&e.t>0)}

function revealAround(p,r){
 const sourceId=p.id||'carrier';
 let e=state.explored.find(x=>x.sourceId===sourceId);
 if(!e){e={sourceId,x:p.x,y:p.y,r,t:0};state.explored.push(e)}
 const moved=Math.hypot(e.x-p.x,e.y-p.y)>Math.max(25,r*.12);
 if(moved||e.r<r){e.x=p.x;e.y=p.y;e.r=r;e.t=0}
 else e.t=0;
 for(const i of islands)if(dist(p,i)<r+landRadius(i)+50)discovered.add(i.id);
 for(const sh of state.ships)if(sh.side==='jp'&&!sh.dead&&!sh.submerged&&dist(p,sh)<r)discovered.add(sh.id)
}
function updateFog(dt){
 for(const e of state.explored)e.t+=dt;
 state.explored=state.explored.filter(e=>e.t<300);
 revealAround(state.carrier,180+((state.upgrades.Binoculars||0)*80)+(state.upgrades.Telescopes?100:0));
 for(const m of state.missions)for(const p of m.planes||[])if(!p.dead)revealAround(p,planes[p.type].sight*(p.scoutBoost||1));
 if(state.upgrades['Radar I'])radarReveal(420);if(state.upgrades['Radar II'])radarReveal(600);if(state.upgrades['Radar III'])radarReveal(850)
}
function radarReveal(r){for(const s of state.ships)if(s.side==='jp'&&dist(state.carrier,s)<r&&!s.submerged)discovered.add(s.id)}
function isVisible(o){if(o.side==='us')return true;if(o.side==='neutral')return true;if(o.kind==='island')return true;if(o.submerged)return !!state.upgrades.Sonar&&dist(state.carrier,o)<(state.upgrades['Radar III']?850:state.upgrades['Radar II']?600:state.upgrades['Radar I']?420:180);if(discovered.has(o.id))return true;return state.explored.some(e=>dist(e,o)<e.r)}

function updateIslands(dt){for(const i of islands){if(i.side==='jp'&&i.lib>0){i.lib=clamp(i.lib+8.33*(dt/60),0,100);if(i.lib>=100){i.side='us';i.lib=100;state.money+=500;state.rep+=10;showToast(`${i.name} captured! +$500`);}}
  if(i.side==='us'&&i.lib<100)i.lib=100;
}}
function captureProgress(i,damage){if(i.side!=='jp')return;const gain=damage?damage*.002:0;i.lib=clamp(i.lib+gain,0,100);}
function enemyIslandAttacks(dt){for(const i of islands.filter(x=>x.side==='jp')){const nearby=state.ships.some(s=>s.side==='jp'&&!s.dead&&dist(s,i)<250);if(nearby&&i.lib>0)i.lib=Math.max(0,i.lib-0.4*dt/60)}}
function capturedPct(){const jpStart=islands.filter(i=>i.side!=='neutral').length;const us=islands.filter(i=>i.side==='us').length;return us/jpStart*100}

function dailyReset(day){state.dayMainDone=false;state.daySideDone=false;state.orders=makeOrders(day);if(day>1){spawnDailyForces(day)}showToast(`Day ${day}: new orders received`)}
function makeOrders(day){const enemy=islands.filter(i=>i.side==='jp');const a=pick(enemy),b=pick(enemy);return{main:{name:`Strike ${a.name}`,target:a.id,reward:700+day*40,done:false},side:{name:`Recon ${b.name}`,target:b.id,reward:300+day*20,done:false}}}
function spawnDailyForces(day){const count=Math.min(4,1+Math.floor(day/2));for(let i=0;i<count;i++){const x=-2500+rand(-500,500),y=rand(-700,1200);addShip(pick(['Patrol Boat','Destroyer','Submarine']),x,y)}}
function checkOrders(){if(!state.orders)return;const main=state.orders.main,side=state.orders.side;if(!main.done){const i=islands.find(x=>x.id===main.target);if(i&&i.side==='us'){main.done=true;state.dayMainDone=true;state.money+=main.reward;state.rep+=8;showToast(`Main mission complete · +$${main.reward}`)}}if(!side.done){if(discovered.has(side.target)){side.done=true;state.daySideDone=true;state.money+=side.reward;state.rep+=3;showToast(`Side mission complete · +$${side.reward}`)}}}

function launchMission(){const mission=state.missionDraft;if(!mission||!mission.area||!mission.intercept){$('missionStatus').textContent='Choose both map points first.';return false}const n=+mission.scout+(+mission.fighter)+(+mission.bomber);if(!n){$('missionStatus').textContent='Send at least one aircraft.';return false}if(+mission.scout>state.air.Scout||+mission.fighter>state.air.Fighter||+mission.bomber>state.air['Dive Bomber']){ $('missionStatus').textContent='Not enough aircraft.';return false}const fuel=+mission.fuel,ammo=+mission.ammo;const group=[];for(const [type,count] of [['Scout',+mission.scout],['Fighter',+mission.fighter],['Dive Bomber',+mission.bomber]]){state.air[type]-=count;for(let j=0;j<count;j++)group.push({id:newId('p'),type,hp:planes[type].hp,maxHp:planes[type].hp,fuel:planes[type].fuel*fuel,maxFuel:planes[type].fuel,ammo:planes[type].ammo*ammo,maxAmmo:planes[type].ammo,bombType:mission.bomb,area:{...mission.area},intercept:{...mission.intercept},intent:mission.intent,phase:'out',x:state.carrier.x,y:state.carrier.y,dead:false,returning:false,age:0,shotClock:0})}
state.missions.push({id:newId('m'),planes:group,area:{...mission.area},intercept:{...mission.intercept},intent:mission.intent,created:state.time});state.missionPlanning=false;state.missionDraft=null;state.paused=false;$('missionModal').classList.add('hidden');showToast(`${n} aircraft launched — ${mission.intent}`);return true}
function planeSpeed(p){let s=planes[p.type].speed;if(p.bombType==='heavy')s*=.88;if(p.bombType==='light')s*=1.1;return s}
function planeUpdate(p,dt){
 if(p.dead)return;
 const d=planes[p.type];
 p.age+=dt;
 p.fuel-=dt*C.AIR_FUEL_RATE;
 // Start returning before the reserve is exhausted.  90 fuel = 12 real minutes at 1x.
 const reserve=Math.min(22.5,p.maxFuel*.25);
 if(p.fuel<=reserve||p.hp<=0)p.returning=true;
 let target=p.returning?p.intercept:p.phase==='out'?p.area:null;
 if(target){
   const dd=dist(p,target),step=planeSpeed(p)*dt;
   if(dd<=step){
     p.x=target.x;p.y=target.y;
     if(p.returning){p.phase='landing';p.returning=false;return}
     p.phase='combat';p.loiter=0;
   }else{
     const ang=Math.atan2(target.y-p.y,target.x-p.x);
     p.x+=Math.cos(ang)*step;p.y+=Math.sin(ang)*step;
   }
 }
 if(p.phase==='combat'){
   p.loiter=(p.loiter||0)+dt;
   p.shotClock+=dt;
   const enemies=state.ships.filter(s=>s.side==='jp'&&!s.dead&&!s.submerged&&dist(s,p)<90);
   const enemyPlanes=state.missions.flatMap(m=>m.planes).filter(q=>q!==p&&!q.dead&&q.enemy&&dist(q,p)<90);
   let targets=[];
   if(p.intent==='Air Battle')targets=enemyPlanes;
   else if(p.intent==='Sea Battle')targets=enemies;
   else targets=p.intent==='Precision Attack'?enemies.slice(0,1):[...enemies,...enemyPlanes];
   if(targets.length&&p.shotClock>=60/80){
     p.shotClock=0;const t=pick(targets);const hit=Math.random()<accuracy(dist(p,t),90);
     if(hit){
       if(t.enemy)t.hp-=d.mgDamage*d.mg;
       else{
         let dmg=d.mgDamage*d.mg;
         if(p.type==='Dive Bomber'&&p.ammo>0){dmg=p.bombType==='heavy'?125:p.bombType==='light'?75:100;t.hp-=dmg;p.ammo=Math.max(0,p.ammo-1)}
         else{t.hp-=d.mgDamage;p.ammo=Math.max(0,p.ammo-d.mg)}
       }
       if(t.hp<=0&&!t.enemy)destroyShip(t,p);
     }
   }
   // Scouts sweep their selected mission zone, then return to the intercept point.
   // Other mission types return when their assigned work is complete or ammunition is gone.
   const workDone=(p.intent==='Scout'&&p.loiter>=12)||(p.intent==='Precision Attack'&&enemies.length===0);
   if(workDone)p.returning=true;
 }
 if(p.ammo<=0&&p.type!=='Scout')p.returning=true;
 if(p.fuel<=0&&p.phase!=='landing'){p.dead=true;showToast(`${p.type} lost — fuel exhausted`);return}
 if(p.phase==='landing'){
   const crash=p.hp<15?(state.upgrades['Safety II']?.35:state.upgrades['Safety I']?.45:.65):0;
   if(Math.random()<crash*dt/60){p.dead=true;showToast(`${p.type} crashed on deck`)}
   else{state.air[p.type]++;state.carrier.airFuel=Math.min(C.AIR_FUEL,state.carrier.airFuel+Math.max(0,p.fuel));p.dead=true;showToast(`${p.type} landed safely`)}
 }
}
function updateMissions(dt){for(const m of state.missions)for(const p of m.planes)planeUpdate(p,dt);state.missions=state.missions.filter(m=>m.planes.some(p=>!p.dead));}

function refuelAtIsland(i){if(i.side!=='us'){showToast('Only friendly islands can refuel.');return}const cost=Math.round((C.SHIP_FUEL-state.carrier.shipFuel)*(.012+Math.max(0,-i.x)/100000));if(state.money<cost){showToast(`Need $${cost}.`);return}state.paused=true;showToast('Refueling — 4 in-game hours');setTimeout(()=>{state.carrier.shipFuel=C.SHIP_FUEL;state.money-=cost;state.paused=false;showToast(`Refueled for $${cost}.`)},240000)}
function buyAircraft(type){const base=planes[type].value*4;const price=Math.round(base*(1+Math.max(0,-nearestIsland(state.carrier).x)/3000)*DIFF[difficulty].econ);if(state.money<price){showToast(`Need $${price}.`);return}state.money-=price;state.air[type]++;showToast(`${type} purchased for $${price}. Restock timing represented by campaign availability.`)}
const upgradeDefs={
'Faster Lift I':['Faster Lift I','Launch operations 15% faster',400], 'Faster Lift II':['Faster Lift II','Launch operations 30% faster',700], Binoculars:['Binoculars','Better visual detection',300], 'Radar I':['Radar I','Detection radius 420 miles',500], 'Radar II':['Radar II','Detection radius 600 miles',900], 'Radar III':['Radar III','Detection radius 850 miles',1400], Sonar:['Sonar','See submerged submarines at full radar range',1000], 'Damage Control Crew':['Damage Control Crew','+1 damage-control team',600], 'Damage Control Tools':['Damage Control Tools','Repair 2× faster',700], 'Iron Hull':['Iron Hull','Carrier +200 HP',1000], Catapults:['Catapults','Aircraft launch faster; max launch speed',800], 'Catapults II':['Catapults II','Further launch improvement',1200], 'Hangar I':['Hangar I','+15 plane capacity',700], 'Hangar II':['Hangar II','+15 plane capacity',1000], 'Hangar III':['Hangar III','+20 plane capacity',1400], Telescopes:['Telescopes','Longer visual horizon',450], Engine:['Engine','Carrier maneuvering improvement',650], 'Engine II':['Engine II','Further engine improvement',1100], AA:['AA','Adds quad MG-flak to carrier',800], 'Safety I':['Safety I','Deck crash chance 45%',500], 'Safety II':['Safety II','Deck crash chance 35%',900]};
function buyUpgrade(k){if(state.upgrades[k]){showToast('Already installed.');return}const u=upgradeDefs[k];if(state.money<u[2]){showToast(`Need $${u[2]}.`);return}state.money-=u[2];state.upgrades[k]=1;if(k==='Iron Hull')state.carrier.maxHp=1000;if(k==='Damage Control Crew')state.dc++;showToast(`${k} installed.`);renderUpgrades()}
function renderUpgrades(){const box=$('upgradeContent');box.innerHTML='';for(const k in upgradeDefs){const u=upgradeDefs[k],el=document.createElement('div');el.className='upgrade';el.innerHTML=`<b>${u[0]}</b><p>${u[1]}</p><span>$${u[2].toLocaleString()}</span><button class="wide" ${state.upgrades[k]?'disabled':''}>${state.upgrades[k]?'INSTALLED':'INSTALL'}</button>`;el.querySelector('button').onclick=()=>buyUpgrade(k);box.appendChild(el)}}
function openIsland(i){state.paused=true;$('storeTitle').textContent=i.name;$('storeContent').innerHTML=`<p>${i.side==='us'?'Friendly island command.':'Enemy island — liberation '+i.lib.toFixed(1)+'%.'}</p><div class="upgradeGrid"></div>`;const box=$('storeContent').querySelector('.upgradeGrid');if(i.side==='us'){for(const type of ['Scout','Fighter','Dive Bomber']){const price=planes[type].value*4;const d=document.createElement('div');d.className='upgrade';d.innerHTML=`<b>Buy ${type}</b><p>Aircraft added to your reserve.</p><span>$${price}</span><button class="wide">PURCHASE</button>`;d.querySelector('button').onclick=()=>buyAircraft(type);box.appendChild(d)}const b=document.createElement('button');b.className='wide primary';b.textContent='REFUEL — 4 HOURS';b.onclick=()=>{refuelAtIsland(i);$('storeModal').classList.add('hidden')};box.appendChild(b)}else{const b=document.createElement('button');b.className='wide primary';b.textContent='BEGIN LIBERATION';b.onclick=()=>{i.lib=Math.max(i.lib,1);showToast(`Liberation of ${i.name} begun.`);$('storeModal').classList.add('hidden');state.paused=false};box.appendChild(b)}$('storeModal').classList.remove('hidden')}

function saveCode(){const data={...state,time:state.time,ships:state.ships.map(s=>({...s,weaponClock:{}})),missions:state.missions.map(m=>({...m,planes:m.planes.map(p=>({...p}))})),islands:islands.map(i=>({...i,def:{...i.def}})),air:state.air,upgrades:state.upgrades,route:state.route};return btoa(unescape(encodeURIComponent(JSON.stringify(data))))}
function loadCode(code){try{const data=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));Object.assign(state,data);for(const src of data.islands||[])Object.assign(islands.find(i=>i.id===src.id)||{},src);state.carrier=data.carrier;state.ships=data.ships||[];state.missions=data.missions||[];state.air=data.air;state.upgrades=data.upgrades||{};state.route=data.route||[];state.gameOver=false;state.paused=false;showToast('Campaign loaded.');return true}catch(e){showToast('Invalid save code.');return false}}

function startGame(diff){difficulty=diff;running=true;$('mainMenu').classList.add('hidden');$('gameScreen').classList.remove('hidden');resize();state.time=0;state.paused=false;state.gameOver=false;state.camera={x:1700,y:250,zoom:.34};state.carrier={x:1800,y:220,hp:800,maxHp:800,shipFuel:C.SHIP_FUEL,airFuel:C.AIR_FUEL,throttle:60};state.money=1000;state.rep=0;state.air={Scout:10,Fighter:40,'Dive Bomber':20};state.route=[];state.missions=[];state.effects=[];state.explored=[];state.missionPlanning=false;state.missionDraft=null;state.upgrades={};state.explored.push({x:state.carrier.x,y:state.carrier.y,r:900,t:0});state.orders=makeOrders(1);state.final=false;state.finalStarted=false;state.finalBomber=null;makeWorld();state.ships.push(...escorts);escorts.forEach((e,i)=>{e.x=state.carrier.x+(i?25:-25);e.y=state.carrier.y+35});last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);showToast(`${diff[0].toUpperCase()+diff.slice(1)} campaign started.`);}
function endGame(title,text){state.gameOver=true;state.paused=true;$('gameOverTitle').textContent=title;$('gameOverText').textContent=text;$('gameOver').classList.remove('hidden')}
function finalCheck(){if(!state.final&&capturedPct()>=85){state.final=true;state.finalStarted=true;const near=islands.filter(i=>i.side==='us').sort((a,b)=>dist(a,{x:-3000,y:-520})-dist(b,{x:-3000,y:-520}))[0];state.finalBomber={x:near.x,y:near.y,hp:100,target:{x:-3000,y:-520},speed:95};showToast('85% TERRITORY CAPTURED — FINAL BOMBER OPERATION');}if(state.final&&state.finalBomber){const b=state.finalBomber;if(dist(b,b.target)<8){endGame('MISSION ACCOMPLISHED','The bomber reached Japan. The Pacific campaign is complete.');return}const nearbyEnemyPlanes=state.missions.flatMap(m=>m.planes).filter(p=>p.enemy&&!p.dead&&dist(p,b)<120);if(nearbyEnemyPlanes.length)b.hp-=.3;if(b.hp<=0){endGame('BOMBER LOST','The final bomber was destroyed.');return}const a=Math.atan2(b.target.y-b.y,b.target.x-b.x);b.x+=Math.cos(a)*b.speed/60;b.y+=Math.sin(a)*b.speed/60;for(const s of state.ships.filter(s=>s.side==='jp'&&!s.dead)){if(dist(s,b)<145&&Math.random()<.04) b.hp-=10}}}
function tick(dt){if(!running||state.paused||state.gameOver)return;const realDt=dt*state.speed;const gameDt=realDt*60;state.time+=gameDt;const day=Math.floor(state.time/C.DAY)+1;if(Math.floor((state.time-gameDt)/C.DAY)!==Math.floor(state.time/C.DAY))dailyReset(day);moveCarrier(realDt,gameDt);for(let i=0;i<escorts.length;i++)if(!escorts[i].dead)moveEscort(escorts[i],i,realDt);updateCombat(gameDt);updateTorpedoes(realDt);updateMissions(gameDt);updateFog(gameDt);updateIslands(gameDt);enemyIslandAttacks(gameDt);checkOrders();finalCheck();if(state.carrier.hp<=0)endGame('CARRIER LOST','Your carrier was destroyed. The campaign is over.');if(state.carrier.shipFuel<=0){state.carrier.throttle=0;showToast('Carrier fuel exhausted.');}}

function drawOcean(ct,w,h){ct.fillStyle='#08293a';ct.fillRect(0,0,w,h);ct.save();ct.strokeStyle='rgba(78,128,150,.12)';ct.lineWidth=1;const step=180*state.camera.zoom;for(let x=(( -state.camera.x*state.camera.zoom+w/2)%step);x<w;x+=step){ct.beginPath();ct.moveTo(x,58);ct.lineTo(x,h-55);ct.stroke()}for(let y=(( -state.camera.y*state.camera.zoom+h/2)%step);y<h;y+=step){ct.beginPath();ct.moveTo(0,y);ct.lineTo(w,y);ct.stroke()}ct.restore()}
function islandShape(ct,i,p,r){ct.beginPath();const pts=9;for(let k=0;k<pts;k++){const a=k/pts*TAU,rr=r*(.72+.28*Math.sin(k*3.7+i.x)*Math.sin(k*1.9+i.y));const x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr*.62;k?ct.lineTo(x,y):ct.moveTo(x,y)}ct.closePath()}
function drawIslands(ct){for(const i of islands){const p=worldToScreen(i.x,i.y),r=Math.max(5,i.size*.5*state.camera.zoom);islandShape(ct,i,p,r);ct.fillStyle=i.side==='us'?'#315e6d':i.side==='jp'?'#704049':'#666c70';ct.fill();ct.strokeStyle='#d0d8da';ct.lineWidth=1;ct.stroke();ct.fillStyle='#e7eff1';ct.font='10px system-ui';ct.textAlign='center';ct.fillText(i.name,p.x,p.y-r-6);if(i.side==='jp'&&i.lib>0){ct.fillStyle='#111b20';ct.fillRect(p.x-r,p.y+r+5,r*2,4);ct.fillStyle='#c3a85e';ct.fillRect(p.x-r,p.y+r+5,r*2*i.lib/100,4)}}for(const n of neutrals){const p=worldToScreen(n.x,n.y),r=n.size*.5*state.camera.zoom;ct.globalAlpha=.22;ct.fillStyle='#92999c';ct.beginPath();ct.ellipse(p.x,p.y,r,r*.5,0,0,TAU);ct.fill();ct.globalAlpha=1}}
function shipVisible(s){return isVisible(s)||s.side==='us'}
function drawShip(s){if(s.dead||!shipVisible(s))return;const p=worldToScreen(s.x,s.y),z=state.camera.zoom;let r=Math.max(3,7*z);if(s.type==='Battleship')r*=1.8;if(s.type==='Carrier')r*=1.25;if(s.type==='Patrol Boat')r*=.7;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2((s.target?.y||s.y)-s.y,(s.target?.x||s.x)-s.x));ctx.fillStyle=s.side==='us'?'#bdc8ca':'#7c8386';ctx.beginPath();if(s.type==='Carrier'){ctx.moveTo(-r*2.2,-r*.55);ctx.lineTo(r*2.2,-r*.55);ctx.lineTo(r*1.8,r*.55);ctx.lineTo(-r*2.2,r*.55);ctx.closePath()}else{ctx.moveTo(-r*1.8,0);ctx.lineTo(r*1.4,-r*.6);ctx.lineTo(r*1.9,0);ctx.lineTo(r*1.4,r*.6);ctx.closePath()}ctx.fill();ctx.fillStyle='#3b4549';if(s.type==='Battleship'||s.type==='Cruiser'||s.type==='Carrier'){ct=ctx;for(let j=0;j<(s.type==='Battleship'?7:s.type==='Cruiser'?4:0);j++){const xx=-r*1.2+j*r*.38;ct.fillRect(xx,-r*.8,r*.14,r*.7)}}ctx.fillRect(-r*.4,-r*.35,r*.8,r*.7);ctx.restore();if(s.submerged){ctx.fillStyle='#d2dbe0';ctx.font='9px system-ui';ctx.fillText('?',p.x,p.y-r-3)}else if(!discovered.has(s.id)&&dist(state.carrier,s)<1000){ctx.fillStyle='#e7e4c9';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(s.type==='Battleship'?'???':'?',p.x,p.y-r-3)}if(s.hp<s.maxHp){ctx.fillStyle='#151d20';ctx.fillRect(p.x-r*2,p.y+r+3,r*4,3);ctx.fillStyle='#b58a59';ctx.fillRect(p.x-r*2,p.y+r+3,r*4*s.hp/s.maxHp,3)}}
function drawCarrier(){const p=worldToScreen(state.carrier.x,state.carrier.y),r=13*state.camera.zoom;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#d1d9da';ctx.beginPath();ctx.moveTo(-r*2.1,-r*.5);ctx.lineTo(r*2.1,-r*.5);ctx.lineTo(r*1.75,r*.5);ctx.lineTo(-r*2.1,r*.5);ctx.closePath();ctx.fill();ctx.fillStyle='#394449';ctx.fillRect(-r*1.45,-r*.82,r*2.8,r*.28);ctx.fillStyle='#aeb9bc';ctx.fillRect(-r*.25,-r*.52,r*.7,r*.3);ctx.restore();ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('USS CARRIER',p.x,p.y-r-7)}
function drawFog(){
 // Recon is NOT an opaque fog. The entire map remains visible; only unreconnoitered
 // water gets blue hatch marks. Ships are hidden separately by shipVisible().
 ctx.save();
 ctx.beginPath();
 ctx.rect(0,58,innerWidth,innerHeight-113);
 for(const e of state.explored){
   const p=worldToScreen(e.x,e.y),r=e.r*state.camera.zoom;
   ctx.moveTo(p.x+r,p.y);
   ctx.arc(p.x,p.y,r,0,TAU,true);
 }
 // even-odd clipping leaves the explored circles out of the hatch layer.
 try{ctx.clip('evenodd')}catch(_){ctx.restore();return drawFogFallback()}
 ctx.globalAlpha=.32;ctx.strokeStyle='#1b6180';ctx.lineWidth=2;
 for(let x=-innerHeight;x<innerWidth+innerHeight;x+=28){
   ctx.beginPath();ctx.moveTo(x,58);ctx.lineTo(x+innerHeight,innerHeight);ctx.stroke();
 }
 ctx.restore();
}
function drawFogFallback(){
 // Conservative fallback for browsers without even-odd canvas clipping.
 // It draws a lighter hatch layer; it never clears the map or carrier.
 ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#1b6180';ctx.lineWidth=2;
 for(let x=-innerHeight;x<innerWidth+innerHeight;x+=28){ctx.beginPath();ctx.moveTo(x,58);ctx.lineTo(x+innerHeight,innerHeight);ctx.stroke()}
 ctx.restore();
}
function drawRoute(){if(!state.route.length)return;ctx.strokeStyle='#d2b562';ctx.lineWidth=2;ctx.beginPath();let p=worldToScreen(state.carrier.x,state.carrier.y);ctx.moveTo(p.x,p.y);for(const q of state.route){const s=worldToScreen(q.x,q.y);ctx.lineTo(s.x,s.y)}ctx.stroke();for(const q of state.route){const s=worldToScreen(q.x,q.y);ctx.fillStyle='#d2b562';ctx.beginPath();ctx.arc(s.x,s.y,4,0,TAU);ctx.fill()}}
function drawEffects(){for(const e of state.effects){if(e.kind==='hit'){const p=worldToScreen(e.x,e.y);ctx.fillStyle='#e9c66e';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(3,12*e.t),0,TAU);ctx.fill()}else if(e.kind==='torpedo'){const a=worldToScreen(e.x,e.y),b=worldToScreen(e.tx,e.ty);ctx.strokeStyle='#cdd7d8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#e0b95f';ctx.beginPath();ctx.arc(a.x,a.y,3,0,TAU);ctx.fill()}}}
function drawPlanes(){for(const m of state.missions)for(const p of m.planes)if(!p.dead){const s=worldToScreen(p.x,p.y);ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(p.intercept.y-p.y,p.intercept.x-p.x));ctx.fillStyle=p.enemy?'#b66a6a':'#dce5e5';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-6,-3);ctx.lineTo(-3,0);ctx.lineTo(-6,3);ctx.closePath();ctx.fill();ctx.restore()}}
function drawMap(){ctx.clearRect(0,0,innerWidth,innerHeight);drawOcean(ctx,innerWidth,innerHeight);drawIslands(ctx);for(const s of state.ships)drawShip(s);drawCarrier();drawPlanes();drawRoute();drawEffects();drawFog();drawMissionZones();}

function renderUI(){const day=Math.floor(state.time/C.DAY)+1,dm=state.time%C.DAY,h=Math.floor(dm/60),m=Math.floor(dm%60);$('clock').textContent=`DAY ${day} · ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;$('hull').textContent=`${fmt(state.carrier.hp)} / ${fmt(state.carrier.maxHp)}`;$('shipFuel').textContent=`${fmt(state.carrier.shipFuel)} / ${fmt(C.SHIP_FUEL)}`;$('airFuel').textContent=`${fmt(state.carrier.airFuel)} / ${fmt(C.AIR_FUEL)}`;$('money').textContent='$'+fmt(state.money);$('rep').textContent=fmt(state.rep);$('hullBar').style.width=state.carrier.hp/state.carrier.maxHp*100+'%';$('shipFuelBar').style.width=state.carrier.shipFuel/C.SHIP_FUEL*100+'%';$('airFuelBar').style.width=state.carrier.airFuel/C.AIR_FUEL*100+'%';$('scouts').textContent=state.air.Scout;$('fighters').textContent=state.air.Fighter;$('bombers').textContent=state.air['Dive Bomber'];$('throttle').value=state.carrier.throttle;$('throttleVal').textContent=state.carrier.throttle+'%';const o=state.orders;$('dailyOrders').innerHTML=o?`<b>MAIN</b><br>${o.main.name} · $${o.main.reward} ${o.main.done?'✓':''}<br><br><b>SIDE</b><br>${o.side.name} · $${o.side.reward} ${o.side.done?'✓':''}<br><br><b>TERRITORY</b> ${capturedPct().toFixed(1)}%`:'';renderSelection()}
function renderSelection(){const t=$('selectedText'),a=$('selectedActions');a.innerHTML='';const s=state.selected;if(s.kind==='carrier'){t.innerHTML='<b>USS Carrier</b><br>'+fmt(state.carrier.hp)+' HP · 6 mi/s max<br>2 destroyer escorts';const b=document.createElement('button');b.className='actionBtn';b.textContent='CLEAR ROUTE';b.onclick=()=>state.route=[];a.appendChild(b)}else if(s.kind==='island'){const i=s.obj;t.innerHTML=`<b>${i.name}</b><br>${i.side==='us'?'Friendly':'Japanese'} territory<br>${i.side==='jp'?`Liberation: ${i.lib.toFixed(1)}%`:'Operational base'}`;const b=document.createElement('button');b.className='actionBtn';b.textContent=i.side==='us'?'OPEN ISLAND COMMAND':'LIBERATE ISLAND';b.onclick=()=>openIsland(i);a.appendChild(b)}else if(s.kind==='ship'){const x=s.obj;t.innerHTML=`<b>${x.type}</b><br>${x.side==='us'?'Friendly':'Japanese'} · ${fmt(x.hp)}/${fmt(x.maxHp)} HP<br>${x.type==='Trader'?'Cargo: '+x.cargo:''}`}}

function openMission(){
 state.paused=true;
 state.missionPlanning=true;
 state.missionDraft={area:null,intercept:null,intent:$('intent').value,scout:2,fighter:4,bomber:2,fuel:1,ammo:1,bomb:'normal'};
 syncMissionInputs();
 $('missionStatus').textContent='CLICK THE REAL MAP: first mission zone, then intercept/return zone.';
 $('missionModal').classList.remove('hidden');
}
function syncMissionInputs(){for(const id of ['mScout','mFighter','mBomber'])$(id).value=state.missionDraft[{mScout:'scout',mFighter:'fighter',mBomber:'bomber'}[id]];$('mScoutAvail').textContent=state.air.Scout;$('mFighterAvail').textContent=state.air.Fighter;$('mBomberAvail').textContent=state.air['Dive Bomber']}
function drawMissionZones(){
 if(!state.missionDraft)return;
 const d=state.missionDraft;
 if(d.area){const p=worldToScreen(d.area.x,d.area.y);ctx.save();ctx.strokeStyle='#e2c36b';ctx.fillStyle='rgba(226,195,107,.10)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,120*state.camera.zoom,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#f1d98a';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('MISSION ZONE',p.x,p.y-128*state.camera.zoom)}
 if(d.intercept){const p=worldToScreen(d.intercept.x,d.intercept.y);ctx.strokeStyle='#8fc0cf';ctx.fillStyle='rgba(143,192,207,.08)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,85*state.camera.zoom,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#b9d9e1';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('INTERCEPT / RETURN',p.x,p.y-93*state.camera.zoom)}
 if(d.area&&d.intercept){const a=worldToScreen(d.area.x,d.area.y),b=worldToScreen(d.intercept.x,d.intercept.y);ctx.strokeStyle='rgba(226,195,107,.65)';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}
 ctx.restore();
}
function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('toastShow');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('toastShow'),2400)}
function loop(t){if(!running)return;const dt=Math.min(.25,Math.max(0,(t-last)/1000));last=t;if(!state.paused&&!state.gameOver){const v=480/state.camera.zoom*dt;if(keys.w)state.camera.y-=v;if(keys.s)state.camera.y+=v;if(keys.a)state.camera.x-=v;if(keys.d)state.camera.x+=v;tick(dt)}drawMap();renderUI();raf=requestAnimationFrame(loop)}
// Menu 3D-ish carrier: WebGL-free, stylized perspective render so the carrier is the only 3D presentation element.
function drawMenuCarrier(t){const r=m3.getBoundingClientRect(),w=r.width,h=r.height;m3ctx.clearRect(0,0,w,h);const g=m3ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0a2938');g.addColorStop(.55,'#0a4154');g.addColorStop(1,'#061e2a');m3ctx.fillStyle=g;m3ctx.fillRect(0,0,w,h);m3ctx.strokeStyle='rgba(180,220,230,.08)';for(let y=0;y<h;y+=28){m3ctx.beginPath();m3ctx.moveTo(0,y+Math.sin(t*.0004+y)*4);m3ctx.lineTo(w,y+Math.sin(t*.0004+y)*4);m3ctx.stroke()}const cx=w*.62,cy=h*.58,scale=Math.min(w,h)/600; m3ctx.save();m3ctx.translate(cx,cy);m3ctx.rotate(-.18);m3ctx.transform(1,0,.18,.45,0,0);const s=scale*(1+.025*Math.sin(t*.001));m3ctx.scale(s,s);m3ctx.fillStyle='#c8d0d1';m3ctx.beginPath();m3ctx.moveTo(-210,-30);m3ctx.lineTo(190,-30);m3ctx.lineTo(225,15);m3ctx.lineTo(170,42);m3ctx.lineTo(-205,40);m3ctx.closePath();m3ctx.fill();m3ctx.fillStyle='#39464b';m3ctx.fillRect(-155,-47,300,18);m3ctx.fillStyle='#8d9ca0';m3ctx.fillRect(-20,-80,55,32);m3ctx.fillStyle='#d8dfdf';for(let i=-130;i<120;i+=45){m3ctx.fillRect(i,-22,24,8)}m3ctx.restore();m3ctx.fillStyle='rgba(255,255,255,.08)';m3ctx.font='700 12px system-ui';m3ctx.fillText('USS CARRIER',cx-45,cy+95);menuSceneRAF=requestAnimationFrame(drawMenuCarrier)}
drawMenuCarrier(performance.now());

// Controls
for(const b of document.querySelectorAll('.difficulty'))b.addEventListener('click',()=>{if(b.classList.contains('locked'))return;startGame(b.dataset.difficulty)});
for(const b of document.querySelectorAll('#speedButtons button'))b.addEventListener('click',()=>{state.speed=+b.dataset.speed;document.querySelectorAll('#speedButtons button').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
$('throttle').addEventListener('input',e=>state.carrier.throttle=+e.target.value);
$('missionBtn').onclick=openMission;$('upgradeBtn').onclick=()=>{state.paused=true;renderUpgrades();$('upgradeModal').classList.remove('hidden')};
$('saveBtn').onclick=()=>{state.paused=true;$('saveCode').value='';$('saveStatus').textContent='';$('saveModal').classList.remove('hidden')};
$('makeSave').onclick=()=>{$('saveCode').value=saveCode();$('saveStatus').textContent='Save code created.'};$('loadSave').onclick=()=>loadCode($('saveCode').value);
$('enginesFree').onclick=()=>{state.missionDraft.intent=$('intent').value;state.missionDraft.scout=clamp(+$('mScout').value,0,state.air.Scout);state.missionDraft.fighter=clamp(+$('mFighter').value,0,state.air.Fighter);state.missionDraft.bomber=clamp(+$('mBomber').value,0,state.air['Dive Bomber']);state.missionDraft.fuel=+$('fuelLoad').value;state.missionDraft.ammo=+$('ammoLoad').value;state.missionDraft.bomb=$('bombType').value;launchMission()};
for(const id of ['intent','fuelLoad','ammoLoad','bombType'])$(id).addEventListener('change',()=>{if(state.missionDraft)state.missionDraft[{intent:'intent',fuelLoad:'fuel',ammoLoad:'ammo',bombType:'bomb'}[id]]=$(id).value});
for(const id of ['mScout','mFighter','mBomber'])$(id).addEventListener('input',()=>{if(state.missionDraft)state.missionDraft[{mScout:'scout',mFighter:'fighter',mBomber:'bomber'}[id]]=+$(`${id}`).value});
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>{const id=b.dataset.close;$(id).classList.add('hidden');if(id==='missionModal'){state.missionPlanning=false;state.missionDraft=null;}state.paused=false};
$('menuBtn').onclick=()=>{state.paused=true;$('gameScreen').classList.add('hidden');$('mainMenu').classList.remove('hidden');running=false};$('restartBtn').onclick=()=>{location.reload()};
map.addEventListener('wheel',e=>{e.preventDefault();state.camera.zoom=clamp(state.camera.zoom*(e.deltaY<0?1.1:.91),.08,1.6)},{passive:false});
map.addEventListener('contextmenu',e=>{e.preventDefault();if(!running)return;const w=screenToWorld(e.clientX,e.clientY);if(state.missionPlanning&&state.missionDraft){if(!state.missionDraft.area)state.missionDraft.area={x:w.x,y:w.y};else state.missionDraft.intercept={x:w.x,y:w.y};return;}state.selected={kind:'carrier',obj:null};state.route=[w]});
map.addEventListener('click',e=>{if(e.clientY<58||e.clientY>innerHeight-60)return;const w=screenToWorld(e.clientX,e.clientY);if(state.missionPlanning&&state.missionDraft){if(!state.missionDraft.area){state.missionDraft.area={x:w.x,y:w.y};$('missionStatus').textContent='MISSION ZONE SET. Now click the real map for the intercept/return zone.';}else if(!state.missionDraft.intercept){state.missionDraft.intercept={x:w.x,y:w.y};$('missionStatus').textContent='BOTH ZONES SET. Configure aircraft/loadout, then Engines Free.';}else{state.missionDraft.intercept={x:w.x,y:w.y};$('missionStatus').textContent='Intercept/return zone moved.';}return;}if(state.selected.kind==='carrier'){state.route.push(w);return}let best=null,bd=Infinity;for(const i of islands){const d=dist(w,i);if(d<bd){bd=d;best={kind:'island',obj:i}}}for(const s of state.ships){if(s.dead||!shipVisible(s))continue;const d=dist(w,s);if(d<bd){bd=d;best={kind:'ship',obj:s}}}if(dist(w,state.carrier)<bd){best={kind:'carrier',obj:null};bd=dist(w,state.carrier)}if(best&&bd<120/state.camera.zoom)state.selected=best;else{state.selected={kind:'carrier',obj:null};state.route.push(w)}});
addEventListener('keydown',e=>{if(!running||state.paused)return;const k=e.key.toLowerCase();if(['w','a','s','d'].includes(k)){e.preventDefault();const v=260/state.camera.zoom*.016;if(k==='w')state.camera.y-=v;if(k==='s')state.camera.y+=v;if(k==='a')state.camera.x-=v;if(k==='d')state.camera.x+=v}});
// Smooth camera movement rather than grid jumps.
const keys={};addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
renderUI();
})();
