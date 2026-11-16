// Sweden Car: a small original top-down walking adventure prototype.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const world = { w: 1800, h: 1250 };
const player = { x: 420, y: 765, r: 12, speed: 175, faceX: 0, faceY: 1 };
const state = {
  money: 3000, day: 1, minutes: 8 * 60, place: 'ullervad',
  inv: { spark: 0, oil: 0, coolant: 0, belt: 0, fuel: 0, food: 0, drink: 0, rims: 0 },
  built: { spark: false, oil: false, coolant: false, belt: false },
  flags: { rims: false, ghost: false, date: false, club: false, woodJob: 0, towJob: 0, repairJob: 0 },
};
const names = { ullervad: 'Ullervad', mariestad: 'Mariestad' };
const itemNames = { spark:'Tändstift', oil:'Motorolja', coolant:'Kylvätska', belt:'Rem', fuel:'Bensin', food:'Mat', drink:'Dryck', rims:'Fälgar' };
const colors = { grass:'#719456', grassDark:'#65854b', path:'#c5aa78', pathEdge:'#9c835c', wood:'#79543a', roof:'#9a5540', wall:'#d9c99f', tree:'#285b35', tree2:'#397346', leaves:'#518644', metal:'#778181', blue:'#386b83' };
let messageTimer = 0, lastTime = 0;
const keys = new Set(), touchKeys = new Set();
const obstacles = [];
const objects = [];
const rnd = (n) => Math.sin(n * 127.1) * 43758.5453 % 1;

function rect(x,y,w,h,fill,stroke=null) { ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);} }
function addObstacle(x,y,w,h) { obstacles.push({x,y,w,h}); }
function addObject(id,label,x,y,r=40) { objects.push({id,label,x,y,r}); }
function setupWorld() {
  obstacles.length=0; objects.length=0;
  if(state.place==='ullervad') {
    // Farmhouse and garage yard.
    addObstacle(180,130,350,210); addObstacle(700,125,360,235); addObstacle(1130,120,300,215);
    addObstacle(230,470,250,175); addObstacle(820,465,320,180); addObstacle(1330,485,210,160);
    for(let i=0;i<17;i++){const x=40+i*104; addObstacle(x,35,42,45); addObstacle(x+8,1140,52,48);}
    addObject('house','Stugan · Gå in och vila',360,380,54);
    addObject('car','Volvo 945 · Tryck E vid motorhuven',940,710,65);
    addObject('tractor','John Deere · Åk till Mariestad',675,780,62);
    addObject('wood','Vedleverans · Jobba',560,500,50);
    addObject('tow','Bärgningsjobb · Jobba',1190,785,58);
    addObject('repair','Kundbil · Reparera för pengar',1335,735,52);
    addObject('barn','Övergiven ladugård · Fälgar och spöke',1545,950,58);
    addObject('road','Landsväg',880,1120,44);
    // Decorative orchard trees around the outer field.
  } else {
    addObstacle(150,160,350,220); addObstacle(620,140,355,245); addObstacle(1110,150,360,220);
    addObstacle(185,570,300,210); addObstacle(740,590,300,210); addObstacle(1250,560,350,220);
    for(let i=0;i<15;i++) addObstacle(30+i*120,35,48,48);
    addObject('mekonomen','Mekonomen · Köp motordelar',315,425,65);
    addObject('coop','Coop · Köp mat och dryck',790,470,65);
    addObject('okq8','OKQ8 · Köp bensin',1300,430,62);
    addObject('pub','Puben · Träffa Isabell',520,890,62);
    addObject('club','Klubben · Entré 10 000 kr',1020,900,60);
    addObject('tractorReturn','John Deere · Tillbaka till Ullervad',1520,980,60);
  }
}
setupWorld();
function isNight(){return state.minutes>=20*60||state.minutes<5*60;}
function clockText(){return `Dag ${state.day} · ${String(Math.floor(state.minutes/60)).padStart(2,'0')}:${String(state.minutes%60).padStart(2,'0')}`;}
function say(text){const el=document.getElementById('message');el.textContent=text;el.classList.add('visible');messageTimer=3.4;}
function advance(minutes){state.minutes+=minutes;while(state.minutes>=1440){state.minutes-=1440;state.day++;}if(state.place==='ullervad'&&isNight()&&Math.hypot(player.x-1545,player.y-950)<100&&!state.flags.ghost){state.flags.ghost=true;say('Ett spöke sveper fram i ladugården! Stig springer ut i sommarnatten.');}}
function setPlace(place,x,y){state.place=place;player.x=x;player.y=y;setupWorld();say(place==='mariestad'?'Stig har tagit traktorn till Mariestad.':'Tillbaka i Ullervad.');renderHud();}
function money(n){return `${Math.max(0,n).toLocaleString('sv-SE')} kr`;}
function ready(){return Object.values(state.built).every(Boolean)&&state.inv.fuel>0;}
function renderHud(){document.getElementById('locationName').textContent=names[state.place];document.getElementById('clock').textContent=clockText();document.getElementById('money').textContent=money(state.money);document.getElementById('carStatus').textContent=ready()?'Körklar · bensin finns':`${Object.values(state.built).filter(Boolean).length}/4 motordelar monterade${state.inv.fuel?' · bensin finns':''}`;const inv=Object.entries(state.inv).filter(([,n])=>n>0).map(([k,n])=>`${itemNames[k]} ×${n}`);document.getElementById('inventory').textContent=inv.join(' · ')||'Tomt';}
function nearby(){let best=null,dist=Infinity;for(const o of objects){const d=Math.hypot(player.x-o.x,player.y-o.y);if(d<o.r&&d<dist){best=o;dist=d;}}return best;}
function interact(){const o=nearby();if(!o){say('Gå närmare något för att interagera.');return;}const shop=(item,price)=>{if(state.money<price){say(`Stig har inte råd. ${itemNames[item]} kostar ${price} kr.`);return;}state.money-=price;state.inv[item]++;advance(20);say(`Köpte ${itemNames[item]} för ${price} kr.`);};
  switch(o.id){
    case 'house': advance(60);say('Stig tar en paus i stugan. En timme går.');break;
    case 'wood':state.money+=800;state.flags.woodJob++;advance(90);say('Ved levererad med traktorn! +800 kr.');break;
    case 'tow':state.money+=1200;state.flags.towJob++;advance(120);say('Stig bärgar en bil med traktorn. +1 200 kr.');break;
    case 'repair':state.money+=1500;state.flags.repairJob++;advance(150);say('Kundbilen är lagad. +1 500 kr.');break;
    case 'car':{
      const parts=[['spark','Tändstift'],['oil','Motorolja'],['coolant','Kylvätska'],['belt','Rem']];
      const missing=parts.filter(([id])=>!state.built[id]);
      if(missing.length&&missing.every(([id])=>state.inv[id]>0)) {for(const [id] of missing){state.inv[id]--;state.built[id]=true;}advance(180);say('Du monterar delarna under motorhuven. Motorn är ihopbyggd!');}
      else if(missing.length) say(`Saknas: ${missing.map(([,n])=>n).join(', ')}. Handla på Mekonomen i Mariestad.`);
      else if(!state.inv.fuel) say('Motorn är byggd, men tanken är tom. Köp bensin på OKQ8.');
      else say('Volvo 945:an är redo! Kör till Mariestad via traktorn först och ta sedan bilen.');
      break;}
    case 'tractor': if(ready())say('Bilen är körklar. Gå fram till Volvo 945:an och tryck E för att åka!');else{advance(120);setPlace('mariestad',1510,1030);}break;
    case 'tractorReturn':advance(120);setPlace('ullervad',700,820);break;
    case 'road':say('Sommarluften är varm och vägen går mot Mariestad. Ta traktorn för att komma in till stan.');break;
    case 'mekonomen':showShop('mekonomen');break;
    case 'coop':showShop('coop');break;
    case 'okq8':if(!ready()&&Object.values(state.built).some(Boolean)){shop('fuel',300);}else if(state.inv.fuel){say('Du har redan bensin i förrådet.');}else shop('fuel',300);break;
    case 'pub':if(!ready()){say('Bygg motorn och gör Volvo 945:an körklar först.');}else if(state.flags.date){say('Stig har redan frågat Isabell. De har bestämt att höras igen.');}else{state.flags.date=true;advance(45);say('Stig frågar Isabell om en dejt. Hon tackar ja — men bestämmer själv hur kvällen fortsätter.');}break;
    case 'club':if(state.flags.club)say('Stig är redan inne på klubben.');else if(state.money<10000)say('Vakten kräver 10 000 kr. Stig behöver jobba ihop mer pengar.');else{state.money-=10000;state.flags.club=true;advance(30);say('Stig betalar 10 000 kr i spelets entréutmaning och går in.');}break;
    case 'barn':if(!state.flags.rims){state.flags.rims=true;state.inv.rims+=2;advance(20);say('Du hittar två gamla fälgar bland bråten.');}else if(isNight()){if(!state.flags.ghost){state.flags.ghost=true;say('Ett spöke visar sig i ladugården! Spring!');}else say('Ladugården är kusligt tyst igen.');}else say('Du har redan hittat fälgarna. Spöket sägs bara komma fram på natten.');break;
  }
  renderHud();
}
function showShop(type){const opts=type==='mekonomen'?[['spark',100],['oil',200],['coolant',500],['belt',50]]:[['food',80],['drink',120]];const choice=prompt(`${type==='mekonomen'?'Mekonomen':'Coop'} — skriv nummer att köpa:\n${opts.map(([id,p],i)=>`${i+1}. ${itemNames[id]} — ${p} kr`).join('\n')}\n\nAvbryt: Cancel`);if(choice===null)return;const opt=opts[Number(choice)-1];if(!opt){say('Ogiltigt val. Gå nära butiken och tryck E igen.');return;}shopBuy(opt[0],opt[1]);}
function shopBuy(id,price){if(state.money<price){say('Pengarna räcker inte. Ta ett jobb i Ullervad först.');return;}state.money-=price;state.inv[id]++;advance(15);say(`Köpte ${itemNames[id]} för ${price} kr.`);renderHud();}
function collides(x,y){for(const b of obstacles){const px=Math.max(b.x,Math.min(x,b.x+b.w)),py=Math.max(b.y,Math.min(y,b.y+b.h));if(Math.hypot(x-px,y-py)<player.r+2)return true;}return false;}
function update(dt){let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup')||touchKeys.has('up'))dy--;if(keys.has('s')||keys.has('arrowdown')||touchKeys.has('down'))dy++;if(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left'))dx--;if(keys.has('d')||keys.has('arrowright')||touchKeys.has('right'))dx++;if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;player.faceX=dx;player.faceY=dy;const speed=player.speed*((keys.has('shift'))?1.55:1);const nx=Math.max(22,Math.min(world.w-22,player.x+dx*speed*dt)),ny=Math.max(22,Math.min(world.h-22,player.y+dy*speed*dt));if(!collides(nx,player.y))player.x=nx;if(!collides(player.x,ny))player.y=ny;}
  const target=nearby();document.getElementById('prompt').textContent=target?`E · ${target.label}`:'Gå runt och utforska. Närma dig något och tryck E.';}
function drawGround(camX,camY){ctx.fillStyle=colors.grass;ctx.fillRect(0,0,W,H);const startX=Math.floor(camX/100),startY=Math.floor(camY/100);for(let tx=startX;tx<startX+12;tx++)for(let ty=startY;ty<startY+8;ty++){const n=Math.abs(rnd(tx*43+ty*17));if(n>.66){ctx.fillStyle=n>.83?'#789a5b':'#6d8d51';ctx.fillRect(tx*100-camX+12,ty*100-camY+22,3,3);}}
  // Main gravel lanes.
  ctx.fillStyle=colors.pathEdge;ctx.fillRect(0,870-camY,world.w,142);ctx.fillRect(600-camX,0,145,world.h);ctx.fillStyle=colors.path;ctx.fillRect(0,879-camY,world.w,124);ctx.fillRect(609-camX,0,127,world.h);
  // Farm drive and Mariestad street.
  ctx.fillStyle='#ddc99a';if(state.place==='ullervad'){ctx.fillRect(425-camX,340-camY,310,78);ctx.fillRect(350-camX,340-camY,82,545);}else{ctx.fillRect(500-camX,375-camY,300,110);ctx.fillRect(515-camX,475-camY,95,420);ctx.fillRect(940-camX,400-camY,100,500);}}
function drawBuilding(o,camX,camY){const x=o.x-camX,y=o.y-camY;ctx.fillStyle='#0003';ctx.fillRect(x+10,y+16,o.w,o.h);ctx.fillStyle=colors.wall;ctx.fillRect(x,y+24,o.w,o.h-24);ctx.fillStyle=colors.roof;ctx.beginPath();ctx.moveTo(x-15,y+30);ctx.lineTo(x+o.w/2,y-25);ctx.lineTo(x+o.w+15,y+30);ctx.closePath();ctx.fill();ctx.strokeStyle='#6d493b';ctx.lineWidth=3;ctx.stroke();for(let i=0;i<2;i++){ctx.fillStyle='#668394';ctx.fillRect(x+30+i*(o.w-80),y+68,34,36);ctx.strokeStyle='#eee1b9';ctx.strokeRect(x+30+i*(o.w-80),y+68,34,36);}ctx.fillStyle='#624331';ctx.fillRect(x+o.w/2-18,y+o.h-56,36,56);}
function drawTree(x,y,scale,camX,camY){x-=camX;y-=camY;ctx.fillStyle='#533d2c';ctx.fillRect(x-5*scale,y+6*scale,10*scale,20*scale);ctx.fillStyle=colors.tree;ctx.beginPath();ctx.arc(x,y,20*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.tree2;ctx.beginPath();ctx.arc(x-8*scale,y-7*scale,13*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors.leaves;ctx.beginPath();ctx.arc(x+8*scale,y-9*scale,10*scale,0,Math.PI*2);ctx.fill();}
function drawCar(x,y,camX,camY,tractor=false){x-=camX;y-=camY;ctx.save();ctx.translate(x,y);if(tractor){ctx.fillStyle='#10130d';ctx.beginPath();ctx.arc(-18,10,20,0,7);ctx.arc(20,12,14,0,7);ctx.fill();ctx.fillStyle='#4b8736';ctx.fillRect(-28,-12,56,28);ctx.fillStyle='#98c9d8';ctx.fillRect(-12,-27,28,21);ctx.fillStyle='#f0c64c';ctx.fillRect(-26,-6,9,7);}else{ctx.fillStyle='#10130d';ctx.beginPath();ctx.ellipse(0,11,45,19,0,0,7);ctx.fill();ctx.fillStyle='#6e7980';ctx.fillRect(-43,-9,86,24);ctx.fillStyle='#477183';ctx.beginPath();ctx.moveTo(-26,-10);ctx.lineTo(-14,-29);ctx.lineTo(22,-29);ctx.lineTo(35,-10);ctx.closePath();ctx.fill();ctx.fillStyle='#cfdbd0';ctx.fillRect(-40,-7,7,5);ctx.fillRect(34,-7,7,5);}ctx.restore();}
function drawCharacter(x,y,color,camX,camY,isPlayer=false){x-=camX;y-=camY;ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,y+10,11,5,0,0,7);ctx.fill();ctx.fillStyle=isPlayer?'#426e99':color;ctx.fillRect(x-8,y-4,16,19);ctx.fillStyle='#e2b995';ctx.beginPath();ctx.arc(x,y-11,8,0,7);ctx.fill();ctx.fillStyle=isPlayer?'#283c2b':'#51392c';ctx.fillRect(x-8,y-20,16,6);}
function renderWorld(){const camX=Math.max(0,Math.min(world.w-W,player.x-W/2)),camY=Math.max(0,Math.min(world.h-H,player.y-H/2));drawGround(camX,camY);
  if(state.place==='ullervad'){drawBuilding({x:180,y:130,w:350,h:210},camX,camY);drawBuilding({x:700,y:125,w:360,h:235},camX,camY);drawBuilding({x:1130,y:120,w:300,h:215},camX,camY);drawBuilding({x:230,y:470,w:250,h:175},camX,camY);drawBuilding({x:820,y:465,w:320,h:180},camX,camY);drawBuilding({x:1330,y:485,w:210,h:160},camX,camY);for(let i=0;i<17;i++){drawTree(60+i*104,60,.85,camX,camY);drawTree(85+i*104,1160,.9,camX,camY);}drawCar(940,710,camX,camY);drawCar(675,780,camX,camY,true);rect(510-camX,450-camY,80,40,'#8a6038');rect(510-camX,450-camY,80,9,'#b38959');drawCar(1190,785,camX,camY);drawCharacter(1360,755,'#777',camX,camY);drawBuilding({x:1500,y:880,w:110,h:120},camX,camY);
  }else{drawBuilding({x:150,y:160,w:350,h:220},camX,camY);drawBuilding({x:620,y:140,w:355,h:245},camX,camY);drawBuilding({x:1110,y:150,w:360,h:220},camX,camY);drawBuilding({x:185,y:570,w:300,h:210},camX,camY);drawBuilding({x:740,y:590,w:300,h:210},camX,camY);drawBuilding({x:1250,y:560,w:350,h:220},camX,camY);for(let i=0;i<15;i++)drawTree(55+i*120,60,.85,camX,camY);drawCharacter(520,890,'#c788a6',camX,camY);drawCar(1520,980,camX,camY,true);}
  // Objects and readable labels.
  for(const o of objects){const x=o.x-camX,y=o.y-camY;if(x<-100||x>W+100||y<-100||y>H+100)continue;if(o.id==='tractor'||o.id==='tractorReturn')drawCar(o.x,o.y,camX,camY,true);if(o.id==='wood'){rect(x-34,y-25,68,38,'#8a6038');for(let i=0;i<3;i++)rect(x-28+i*23,y-20,18,27,'#b18453');}if(o.id==='car')drawCar(o.x,o.y,camX,camY);if(o.id==='barn')drawBuilding({x:1500,y:880,w:110,h:120},camX,camY);if(o.id==='mekonomen'||o.id==='coop'||o.id==='okq8'||o.id==='pub'||o.id==='club'){const tags={mekonomen:'MEKONOMEN',coop:'COOP',okq8:'OKQ8',pub:'PUBEN',club:'KLUBB'};ctx.fillStyle='#f0d477';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(tags[o.id],x,y-76);}
    ctx.fillStyle='#18221bdc';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(o.label.split(' · ')[0],x,y+48);
    if(Math.hypot(player.x-o.x,player.y-o.y)<o.r){ctx.strokeStyle='#ffe18b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();}}
  drawCharacter(player.x,player.y,'',camX,camY,true);
  if(state.place==='ullervad'&&isNight()&&Math.hypot(player.x-1545,player.y-950)<180){ctx.globalAlpha=.72;drawCharacter(1545,950,'#ddd',camX,camY,false);ctx.globalAlpha=1;}
  // Summer daylight tint shifts toward dusk/night.
  if(isNight()){ctx.fillStyle='rgba(12,21,49,.46)';ctx.fillRect(0,0,W,H);}else if(state.minutes>18*60){ctx.fillStyle='rgba(255,154,62,.13)';ctx.fillRect(0,0,W,H);}
}
function frame(ts){const dt=Math.min(.04,(ts-lastTime)/1000||0);lastTime=ts;update(dt);renderWorld();if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)document.getElementById('message').classList.remove('visible');}requestAnimationFrame(frame);}
function handleKeyDown(e){const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(!keys.has(key)&&key==='e')interact();keys.add(key);}
window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll('[data-dir]').forEach(button=>{const dir=button.dataset.dir;const down=e=>{e.preventDefault();touchKeys.add(dir);};const up=e=>{e.preventDefault();touchKeys.delete(dir);};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointerleave',up);button.addEventListener('pointercancel',up);});document.getElementById('touchInteract').addEventListener('click',interact);
document.getElementById('resetButton').addEventListener('click',()=>{state.money=3000;state.day=1;state.minutes=480;state.place='ullervad';Object.keys(state.inv).forEach(k=>state.inv[k]=0);Object.keys(state.built).forEach(k=>state.built[k]=false);Object.keys(state.flags).forEach(k=>state.flags[k]=false);player.x=420;player.y=765;setupWorld();renderHud();say('Ny sommardag! Stig börjar med 3 000 kr i Ullervad.');});
renderHud();requestAnimationFrame(frame);
