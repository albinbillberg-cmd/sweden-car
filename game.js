import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#91b8d5');
scene.fog = new THREE.Fog('#91b8d5', 48, 120);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 220);
const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const player = { x: 0, z: 14, yaw: Math.PI, speed: 8, driving: false, vehicle: null, mesh: null };
const game = {
  started: false, licensed: false, location: 'Ullervad', money: 3000, day: 1, minutes: 480,
  items: { spark: 0, oil: 0, coolant: 0, belt: 0, fuel: 0, food: 0, drink: 0, rims: 0 },
  built: { spark: false, oil: false, coolant: false, belt: false },
  flags: { rims: false, ghost: false, date: false, club: false },
};
const names = { spark: 'Tändstift', oil: 'Motorolja', coolant: 'Kylvätska', belt: 'Rem', fuel: 'Bensin', food: 'Mat', drink: 'Dryck', rims: 'Fälgar' };
const prices = { spark: 100, oil: 200, coolant: 500, belt: 50, fuel: 300, food: 80, drink: 120 };
const keys = new Set();
const interactables = [];
let toastTimer = 0;

const ui = Object.fromEntries(['startScreen','licenseScreen','hud','licenseButton','questionCounter','scoreCounter','questionText','answers','testFeedback','nextQuestion','retryTest','startGameButton','locationName','clock','money','licenseStatus','carStatus','inventory','toast','interactionPrompt','touchControls','touchUse','resetButton'].map(id => [id, document.getElementById(id)]));
const questions = [
  { q: 'Du kommer fram till en obevakad korsning samtidigt som ett fordon kommer från höger. Vad gäller?', answers: ['Jag kör först eftersom jag är på en större väg.', 'Jag lämnar företräde åt fordonet från höger.', 'Jag tutar och kör.'], correct: 1 },
  { q: 'En fotgängare är på väg ut på ett obevakat övergångsställe. Vad gör du?', answers: ['Sänker farten och stannar om det behövs.', 'Ökar farten så jag passerar först.', 'Blinkar med helljuset och fortsätter.'], correct: 0 },
  { q: 'Vad gör du om du blir trött när du kör?', answers: ['Öppnar fönstret och kör fortare.', 'Stannar på en säker plats och vilar.', 'Dricker kaffe medan jag kör vidare.'], correct: 1 },
];
let questionIndex = 0, correctAnswers = 0;

const hemi = new THREE.HemisphereLight(0xd8efff, 0x58713f, 1.65); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffedc1, 2.2); sun.position.set(-20, 32, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

function box(parent, x,y,z, sx,sy,sz, color, opts={}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? .86, metalness: opts.metalness ?? 0 }));
  mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addBuilding(x,z,w,d,color,label) {
  box(world,x,2.1,z,w,4.2,d,color);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.78,2.1,4),new THREE.MeshStandardMaterial({color:'#984f3a',roughness:.9})); roof.position.set(x,5.25,z); roof.rotation.y=Math.PI/4; roof.castShadow=true; world.add(roof);
  box(world,x,1.05,z+d/2+.03,1.15,2.1,.12,'#694633');
  if(label) addLabel(label,x,6.65,z);
}
function addTree(x,z,scale=1) {
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22*scale,.34*scale,2.1*scale,7),new THREE.MeshStandardMaterial({color:'#725035'})); trunk.position.set(x,1.05*scale,z); trunk.castShadow=true; world.add(trunk);
  const crown=new THREE.Mesh(new THREE.SphereGeometry(1.25*scale,9,8),new THREE.MeshStandardMaterial({color:'#39733c',roughness:1})); crown.position.set(x,2.55*scale,z); crown.castShadow=true; world.add(crown);
}
function addLabel(text,x,y,z) {
  const c=document.createElement('canvas'); c.width=512;c.height=100;const cx=c.getContext('2d');cx.fillStyle='rgba(16,25,17,.82)';cx.fillRect(0,0,512,100);cx.fillStyle='#fff0bb';cx.font='bold 34px system-ui';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,256,52);
  const tex=new THREE.CanvasTexture(c); const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(6,1.2,1);world.add(sprite);return sprite;
}
function addInteract(id,label,x,z,callback,radius=2.8) { interactables.push({id,label,x,z,callback,radius}); }
function makeCar(x,z,tractor=false) {
  const g=new THREE.Group();
  const color=tractor?'#4b8535':'#687b80';
  box(g,0,.8,0,tractor?3:4.7,.9,tractor?2.1:2.1,color);
  if(tractor){box(g,.2,1.65,-.1,1.4,1.05,1.45,'#79a8b4');box(g,-1.15,1.3,-.05,.8,.55,1.1,'#e1bd46');}
  else {box(g,.15,1.43,0,2.35,.8,1.7,'#476f7e');}
  for(const [wx,wz,r] of [[-1,-1,.48],[-1,1,.48],[1,-1,.48],[1,1,.48]]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.28,12),new THREE.MeshStandardMaterial({color:'#202322'}));wheel.rotation.z=Math.PI/2;wheel.position.set(wx*(tractor?1.05:1.7),.45,wz*(tractor?.85:.86));wheel.castShadow=true;g.add(wheel);}
  g.position.set(x,0,z); world.add(g);return g;
}
function clearWorld(){while(world.children.length){const obj=world.children[0];world.remove(obj);if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}}interactables.length=0;player.mesh=null;player.vehicle=null;}
function buildWorld() {
  clearWorld();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(130,130),new THREE.MeshStandardMaterial({color:'#759854',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);
  box(world,0,.04,0,130,.08,7,'#c4ae7b');box(world,0,.045,0,130,.04,5.6,'#d1c092');
  for(let i=-58;i<60;i+=8){addTree(i,-56,1);addTree(i,57,.9);}
  if(game.location==='Ullervad'){
    addBuilding(-19,-18,12,10,'#d8c6a0','STIGS STUGA');addBuilding(3,-18,13,11,'#c5b48e','GARAGE');addBuilding(21,-17,11,10,'#c9bb9a','LADUGÅRD');
    const car=makeCar(4,-4); const tractor=makeCar(-5,12,true); const customer=makeCar(22,4);
    addLabel('VOLVO 945',4,3.8,-4);addLabel('JOHN DEERE',-5,3.1,12);
    addInteract('car','Volvo 945 · E för att skruva eller köra',4,-4,()=>interactCar(car),3.7);
    addInteract('tractor','John Deere-traktor · E för att åka till Mariestad',-5,12,()=>{player.vehicle=tractor;player.driving=true;travel('Mariestad');},3.6);
    addInteract('wood','Vedhögen · leverera ved för 800 kr',-20,2,()=>job('Stig levererar ved med traktorn. +800 kr.',800,90),3);
    addInteract('tow','Bärgningsjobb · 1 200 kr',18,12,()=>job('Stig bärgar en bil med traktorn. +1 200 kr.',1200,120),3);
    addInteract('repair','Kundbil · laga för 1 500 kr',22,4,()=>job('Kundbilen är lagad. +1 500 kr.',1500,150),3.2);
    addInteract('barn','Övergiven ladugård · hitta fälgar',21,-17,()=>{if(!game.flags.rims){game.flags.rims=true;game.items.rims+=2;advance(15);toast('Du hittar två gamla fälgar i ladugården.');}else if(isNight()){game.flags.ghost=true;toast('Spöket visar sig i mörkret! Stig springer ut.');}else toast('Du har redan hittat fälgarna. Spöket kommer bara fram på natten.');},3.8);
    addInteract('home','Stugan · vila',-19,-18,()=>{advance(60);toast('Stig vilar en stund i stugan. En timme går.');},3.5);
  } else {
    addBuilding(-20,-17,11,9,'#d9d2b8','MEKONOMEN');addBuilding(0,-17,12,10,'#c5d3b3','COOP');addBuilding(21,-17,12,10,'#d8d0b9','OKQ8');addBuilding(-20,17,11,9,'#cfbda3','PUBEN');addBuilding(2,17,12,10,'#bca9a2','KLUBBEN');
    const tractor=makeCar(21,8,true);addInteract('tractorBack','John Deere · tillbaka till Ullervad',21,8,()=>travel('Ullervad'),3.5);
    addInteract('mekonomen','Mekonomen · motordelar',-20,-17,()=>shop('mekonomen'),3.5);addInteract('coop','Coop · mat och dryck',0,-17,()=>shop('coop'),3.5);addInteract('okq8','OKQ8 · bensin',21,-17,()=>buy('fuel',300),3.5);
    addInteract('pub','Puben · fråga Isabell om en dejt',-20,17,()=>{if(!carReady())toast('Bygg motorn och gör bilen körklar innan du frågar Isabell.');else if(game.flags.date)toast('Stig och Isabell har redan bestämt att ses igen.');else{game.flags.date=true;advance(30);toast('Stig frågar Isabell om en dejt. Hon tackar ja.');}},3.5);
    addInteract('club','Klubben · entré 10 000 kr',2,17,()=>{if(game.money<10000)toast('Vakten kräver 10 000 kr. Jobba ihop mer pengar först.');else if(game.flags.club)toast('Stig är redan inne på klubben.');else{game.money-=10000;game.flags.club=true;toast('Stig betalar entrén och går in på klubben.');}},3.5);
  }
  // Player is a simple original low-poly character.
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.95,4,8),new THREE.MeshStandardMaterial({color:'#3e6e9a'}));body.position.y=1.15;body.castShadow=true;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.34,12,10),new THREE.MeshStandardMaterial({color:'#e4bd97'}));head.position.y=2.08;head.castShadow=true;
  player.mesh=new THREE.Group();player.mesh.add(body,head);player.mesh.position.set(player.x,0,player.z);world.add(player.mesh);
  updateHud();
}
function isNight(){return game.minutes>=20*60||game.minutes<5*60;}
function advance(minutes){game.minutes+=minutes;while(game.minutes>=1440){game.minutes-=1440;game.day++;}}
function clockText(){return `Dag ${game.day} · ${String(Math.floor(game.minutes/60)).padStart(2,'0')}:${String(game.minutes%60).padStart(2,'0')}`;}
function ready(){return Object.values(game.built).every(Boolean)&&game.items.fuel>0;}
function updateHud(){ui.locationName.textContent=game.location;ui.clock.textContent=clockText();ui.money.textContent=`${game.money.toLocaleString('sv-SE')} kr`;ui.licenseStatus.textContent=game.licensed?'Körkort ✓':'Körkort saknas';ui.carStatus.textContent=ready()?'Körklar · bensin finns':`${Object.values(game.built).filter(Boolean).length}/4 motordelar monterade`;const inv=Object.entries(game.items).filter(([,n])=>n>0).map(([id,n])=>`${names[id]} ×${n}`);ui.inventory.textContent=inv.join(' · ')||'Tomt';}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('visible');toastTimer=3.5;}
function job(text,pay,minutes){game.money+=pay;advance(minutes);toast(text);updateHud();}
function buy(id,price){if(game.money<price){toast('Pengarna räcker inte. Ta ett jobb i Ullervad först.');return;}game.money-=price;game.items[id]++;advance(15);toast(`Köpte ${names[id]} för ${price} kr.`);updateHud();}
function shop(where){const list=where==='mekonomen'?[['spark',100],['oil',200],['coolant',500],['belt',50]]:[['food',80],['drink',120]];const choice=prompt(`${where==='mekonomen'?'Mekonomen':'Coop'} — skriv numret på varan:\n${list.map(([id,p],i)=>`${i+1}. ${names[id]} — ${p} kr`).join('\n')}`);if(choice===null)return;const item=list[Number(choice)-1];if(!item){toast('Ogiltigt val.');return;}buy(...item);}
function interactCar(car){const missing=Object.keys(game.built).filter(k=>!game.built[k]);if(missing.length){const absent=missing.filter(k=>game.items[k]<=0);if(absent.length){toast(`Saknas: ${absent.map(k=>names[k]).join(', ')}. Handla i Mariestad.`);return;}for(const id of missing){game.items[id]--;game.built[id]=true;}advance(180);toast('Du monterar delarna under huven. Motorn är ihopbyggd!');updateHud();return;}if(!game.items.fuel){toast('Motorn är byggd, men tanken är tom. Köp bensin på OKQ8.');return;}if(game.location==='Ullervad'){game.items.fuel--;travel('Mariestad');toast('Stig kör sin Volvo 945 till Mariestad.');}else toast('Volvo 945:an är redo att köra!');}
function travel(place){game.location=place;player.x=place==='Mariestad'?20:0;player.z=place==='Mariestad'?10:14;player.driving=false;player.vehicle=null;buildWorld();advance(120);updateHud();toast(`Stig kommer fram till ${place}.`);}
function nearest(){let result=null,best=Infinity;for(const item of interactables){const d=Math.hypot(player.x-item.x,player.z-item.z);if(d<item.radius&&d<best){result=item;best=d;}}return result;}
function interact(){if(!game.started)return;if(player.driving){player.driving=false;player.vehicle=null;toast('Stig kliver ur fordonet.');return;}const target=nearest();if(!target){toast('Gå närmare ett föremål eller en person och tryck E.');return;}target.callback();updateHud();}
function startQuestion(){ui.questionCounter.textContent=`Fråga ${questionIndex+1} av ${questions.length}`;ui.scoreCounter.textContent=`Rätt: ${correctAnswers}`;ui.questionText.textContent=questions[questionIndex].q;ui.answers.replaceChildren();ui.testFeedback.textContent='';ui.testFeedback.classList.remove('error');ui.nextQuestion.classList.add('hidden');ui.retryTest.classList.add('hidden');ui.startGameButton.classList.add('hidden');questions[questionIndex].answers.forEach((text,index)=>{const button=document.createElement('button');button.type='button';button.className='answer';button.textContent=text;button.addEventListener('click',()=>answerQuestion(index));ui.answers.append(button);});}
function answerQuestion(index){const q=questions[questionIndex];const buttons=[...ui.answers.children];buttons.forEach(b=>b.disabled=true);if(index===q.correct){buttons[index].classList.add('correct');correctAnswers++;ui.testFeedback.textContent='Rätt svar! Bra tänkt i trafiken.';}else{buttons[index].classList.add('wrong');buttons[q.correct].classList.add('correct');ui.testFeedback.textContent='Inte riktigt. Läs på och försök testet igen.';ui.testFeedback.classList.add('error');}
  ui.scoreCounter.textContent=`Rätt: ${correctAnswers}`;if(index!==q.correct){ui.retryTest.classList.remove('hidden');return;}if(questionIndex<questions.length-1)ui.nextQuestion.classList.remove('hidden');else{game.licensed=true;ui.testFeedback.textContent='Godkänt! Stig har fått sitt körkort.';ui.startGameButton.classList.remove('hidden');}}
ui.licenseButton.addEventListener('click',()=>{questionIndex=0;correctAnswers=0;ui.startScreen.classList.add('hidden');ui.licenseScreen.classList.remove('hidden');startQuestion();});
ui.nextQuestion.addEventListener('click',()=>{questionIndex++;startQuestion();});
ui.retryTest.addEventListener('click',()=>{questionIndex=0;correctAnswers=0;startQuestion();});
ui.startGameButton.addEventListener('click',()=>{ui.licenseScreen.classList.add('hidden');ui.hud.classList.remove('hidden');ui.interactionPrompt.classList.remove('hidden');ui.touchControls.classList.remove('hidden');game.started=true;buildWorld();toast('Körkortet är klart! Utforska Ullervad. Gå fram till saker och tryck E.');});
function movement(dt){if(!game.started)return;let dx=0,dz=0;if(keys.has('w')||keys.has('arrowup'))dz-=1;if(keys.has('s')||keys.has('arrowdown'))dz+=1;if(keys.has('a')||keys.has('arrowleft'))dx-=1;if(keys.has('d')||keys.has('arrowright'))dx+=1;if(!dx&&!dz)return;const len=Math.hypot(dx,dz);dx/=len;dz/=len;const speed=(keys.has('shift')&&!player.driving?11:player.driving?14:7)*dt;const nx=THREE.MathUtils.clamp(player.x+dx*speed,-55,55),nz=THREE.MathUtils.clamp(player.z+dz*speed,-55,55);player.x=nx;player.z=nz;if(player.mesh){player.mesh.position.set(nx,0,nz);if(dx||dz)player.mesh.rotation.y=Math.atan2(dx,dz);}if(player.driving&&player.vehicle)player.vehicle.position.set(nx,0,nz);}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);movement(dt);if(game.started){const focus=player.driving&&player.vehicle?player.vehicle.position:player.mesh.position;const desired=new THREE.Vector3(focus.x+10,8,focus.z+12);camera.position.lerp(desired,.08);camera.lookAt(focus.x,1,focus.z);const target=nearest();ui.interactionPrompt.textContent=target?`E · ${target.label}`:'WASD för att gå runt · gå nära något för att använda det';if(target)ui.interactionPrompt.classList.remove('hidden');else ui.interactionPrompt.classList.add('hidden');updateHud();}if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('visible');}renderer.render(scene,camera);}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(key==='e'&&!e.repeat)interact();keys.add(key);});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll('[data-key]').forEach(button=>{const key=button.dataset.key;const down=e=>{e.preventDefault();keys.add(key);};const up=e=>{e.preventDefault();keys.delete(key);};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointerleave',up);button.addEventListener('pointercancel',up);});ui.touchUse.addEventListener('click',interact);
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
buildWorld();player.x=0;player.z=14;camera.position.set(10,9,26);camera.lookAt(0,0,10);frame();
