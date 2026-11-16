import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb5d5);
scene.fog = new THREE.Fog(0x8fb5d5, 35, 110);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 250);
const clock = new THREE.Clock();

const world = new THREE.Group();
scene.add(world);

const player = {
  x: 0,
  z: 0,
  radius: 1.2,
  speed: 11,
  turnSpeed: 2.2,
  yaw: 0,
  onGround: true,
};

const state = {
  location: 'ullervad',
  money: 3000,
  day: 1,
  minutes: 8 * 60,
  inventory: {
    spark: 0,
    oil: 0,
    coolant: 0,
    belt: 0,
    fuel: 0,
    food: 0,
    drink: 0,
    rims: 0,
  },
  built: {
    spark: false,
    oil: false,
    coolant: false,
    belt: false,
  },
  story: {
    ghost: false,
    dateAsked: false,
    clubPaid: false,
    rimsFound: false,
    woodJob: 0,
    towJob: 0,
    repairJob: 0,
  }
};

const ui = {
  locationName: document.getElementById('locationName'),
  clock: document.getElementById('clock'),
  money: document.getElementById('money'),
  carStatus: document.getElementById('carStatus'),
  inventory: document.getElementById('inventory'),
  message: document.getElementById('message'),
  prompt: document.getElementById('prompt'),
  reset: document.getElementById('resetButton'),
};

const itemNames = {
  spark: 'Tändstift',
  oil: 'Motorolja',
  coolant: 'Kylvätska',
  belt: 'Rem',
  fuel: 'Bensin',
  food: 'Mat',
  drink: 'Dryck',
  rims: 'Fälgar',
};

const prices = { spark: 100, oil: 200, coolant: 500, belt: 50, fuel: 300, food: 80, drink: 120 };
const keyState = {};
const interactables = [];
const locationOrder = ['ullervad', 'mariestad'];

const arena = {
  ullervad: { offset: { x: 0, z: 0 }, playerStart: { x: -12, z: 14 }, radius: 28 },
  mariestad: { offset: { x: 38, z: 0 }, playerStart: { x: 42, z: 14 }, radius: 26 },
};

// Lighting
const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x46713d, 1.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1be, 1.85);
sun.position.set(18, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);

function formatMoney(value) {
  return `${Math.max(0, value).toLocaleString('sv-SE')} kr`;
}

function formatClock() {
  const hour = Math.floor(state.minutes / 60);
  const minute = state.minutes % 60;
  return `Dag ${state.day} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function advanceTime(minutes) {
  state.minutes += minutes;
  while (state.minutes >= 1440) {
    state.minutes -= 1440;
    state.day += 1;
  }
}

function showMessage(text, duration = 3.5) {
  ui.message.textContent = text;
  ui.message.classList.add('visible');
  ui.message.dataset.timeout = String(duration);
}

function hideMessage() {
  ui.message.classList.remove('visible');
}

function setPrompt(text) {
  ui.prompt.textContent = text;
}

function updateHud() {
  ui.locationName.textContent = state.location === 'ullervad' ? 'Ullervad' : 'Mariestad';
  ui.clock.textContent = formatClock();
  ui.money.textContent = formatMoney(state.money);
  const builtCount = Object.values(state.built).filter(Boolean).length;
  const ready = builtCount === 4 && state.inventory.fuel > 0;
  ui.carStatus.textContent = ready ? 'Volvo 945: körklar' : `${builtCount}/4 delar monterade${state.inventory.fuel ? ' · bensin finns' : ''}`;
  const entries = Object.entries(state.inventory).filter(([, v]) => v > 0);
  ui.inventory.textContent = entries.length ? entries.map(([id, count]) => `${itemNames[id]} ×${count}`).join(' · ') : 'Tomt';
}

function addInteractable(id, label, x, z, radius = 2.8, onInteract) {
  interactables.push({ id, label, x, z, radius, onInteract });
}

function rebuildWorld() {
  while (world.children.length) {
    world.remove(world.children[0]);
  }
  interactables.length = 0;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x7ea95d, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // Roads and paths
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xc9b784, roughness: 1 });
  const road1 = new THREE.Mesh(new THREE.BoxGeometry(100, 0.1, 6), roadMat);
  road1.position.set(0, 0.05, 0);
  const road2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 100), roadMat);
  road2.position.set(0, 0.05, 0);
  world.add(road1, road2);

  // Generic environment barriers / houses / buildings
  const addBuilding = (x, z, w, d, h, color = 0xd5c9a9) => {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    );
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    world.add(building);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.62, h * 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x9d573d, roughness: 0.85 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(x, h + h * 0.2, z);
    world.add(roof);
  };

  if (state.location === 'ullervad') {
    addBuilding(-16, -18, 11, 10, 6, 0xd7c7a4);
    addBuilding(10, -18, 12, 11, 5.5, 0xc8b995);
    addBuilding(18, 18, 10, 9, 5, 0xbca27b);
    addBuilding(-18, 17, 12, 10, 6, 0xc8b496);
    addBuilding(14, 10, 6, 6, 4, 0x8d785e);
    addBuilding(-5, 20, 8, 8, 4, 0x8d7c63);

    // decorations
    for (let i = -22; i <= 22; i += 6) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x6d4b31 }));
      trunk.position.y = 1.3;
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), new THREE.MeshStandardMaterial({ color: 0x2d6f3d }));
      leaves.position.y = 3.1;
      tree.add(trunk, leaves);
      tree.position.set(i, 0, -24);
      tree.traverse((mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      world.add(tree);
    }

    // interactive objects
    addInteractable('house', 'Stugan', -12, 8, 3.8, () => {
      advanceTime(60);
      showMessage('Stig vilar i stugan och får lite kraft. En timme går.');
    });
    addInteractable('wood', 'Vedleverans', -2, -6, 3.2, () => {
      state.money += 800;
      state.story.woodJob += 1;
      advanceTime(90);
      showMessage('Stig levererar ved till grannarna. +800 kr.');
    });
    addInteractable('tow', 'Bärgningsjobb', 16, 6, 3.2, () => {
      state.money += 1200;
      state.story.towJob += 1;
      advanceTime(120);
      showMessage('Han bärgar bilen med traktorn. +1 200 kr.');
    });
    addInteractable('repair', 'Garaget', 17, -10, 3.3, () => {
      state.money += 1500;
      state.story.repairJob += 1;
      advanceTime(150);
      showMessage('Stig fixar en kundbil och får betalt. +1 500 kr.');
    });
    addInteractable('car', 'Volvo 945', 9, -2, 5, () => {
      const needed = ['spark', 'oil', 'coolant', 'belt'];
      const missing = needed.filter((id) => !state.built[id]);
      if (missing.length > 0) {
        const inventoryMissing = missing.filter((id) => state.inventory[id] <= 0);
        if (inventoryMissing.length > 0) {
          showMessage(`Det saknas delar: ${inventoryMissing.map((id) => itemNames[id]).join(', ')}`);
        } else {
          missing.forEach((id) => {
            state.inventory[id] -= 1;
            state.built[id] = true;
          });
          advanceTime(180);
          showMessage('Stig monterar delarna. Motorn är byggd!');
        }
      } else if (state.inventory.fuel <= 0) {
        showMessage('Motorn fungerar, men bilen saknar bensin. Köp på OKQ8 i Mariestad.');
      } else {
        showMessage('Volvo 945:an är körklar och redo för en resa till Mariestad.');
      }
    });
    addInteractable('tractor', 'John Deere', 2, 12, 3.6, () => {
      const ready = Object.values(state.built).every(Boolean) && state.inventory.fuel > 0;
      if (ready) {
        state.location = 'mariestad';
        player.x = arena.mariestad.playerStart.x;
        player.z = arena.mariestad.playerStart.z;
        showMessage('Stig tar 945:an mot Mariestad.');
      } else {
        state.location = 'mariestad';
        player.x = arena.mariestad.playerStart.x;
        player.z = arena.mariestad.playerStart.z;
        showMessage('Traktorn går mot Mariestad. Det finns fortfarande arbete att göra.');
      }
      updateHud();
      rebuildWorld();
    });
    addInteractable('barn', 'Övergiven ladugård', 22, 16, 4.1, () => {
      if (!state.story.rimsFound) {
        state.story.rimsFound = true;
        state.inventory.rims += 2;
        advanceTime(30);
        showMessage('Stig hittar två gamla fälgar i ladugården.');
      } else if (state.minutes >= 20 * 60 || state.minutes < 5 * 60) {
        if (!state.story.ghost) {
          state.story.ghost = true;
          showMessage('Ett spöke visar sig i mörkret. Stig springer ut i panik!');
        } else {
          showMessage('Spöket är borta igen, men ladugården känns fortfarande obehaglig.');
        }
      } else {
        showMessage('Ladugården är stilla under dagen. Fälgarna finns redan i förrådet.');
      }
    });
  }

  if (state.location === 'mariestad') {
    addInteractable('mekonomen', 'Mekonomen', -10, 12, 3.8, () => {
      const choices = [
        ['spark', 100],
        ['oil', 200],
        ['coolant', 500],
        ['belt', 50],
      ];
      const choice = window.prompt(`Välj del:\n1. Tändstift (100 kr)\n2. Motorolja (200 kr)\n3. Kylvätska (500 kr)\n4. Rem (50 kr)\nSkriv nummer eller Cancel.`);
      if (choice === null) return;
      const pick = choices[Number(choice) - 1];
      if (!pick) {
        showMessage('Ogiltigt val.');
        return;
      }
      const [id, price] = pick;
      if (state.money < price) {
        showMessage('Pengarna räcker inte. Ta ett jobb i Ullervad först.');
      } else {
        state.money -= price;
        state.inventory[id] += 1;
        advanceTime(20);
        showMessage(`Stig köper ${itemNames[id]} för ${price} kr.`);
      }
    });
    addInteractable('coop', 'Coop', 7, -2, 3.4, () => {
      const choice = window.prompt('Köp:\n1. Mat (80 kr)\n2. Dryck (120 kr)\nSkriv nummer eller Cancel.');
      if (choice === null) return;
      const data = [['food', 80], ['drink', 120]];
      const pick = data[Number(choice) - 1];
      if (!pick) {
        showMessage('Ogiltigt val.');
        return;
      }
      const [id, price] = pick;
      if (state.money < price) {
        showMessage('Pengarna räcker inte för den varan.');
      } else {
        state.money -= price;
        state.inventory[id] += 1;
        advanceTime(15);
        showMessage(`Stig köper ${itemNames[id]} för ${price} kr.`);
      }
    });
    addInteractable('okq8', 'OKQ8', 18, 10, 3.2, () => {
      if (state.money < prices.fuel) {
        showMessage('Pengarna räcker inte för bensin ännu.');
      } else {
        state.money -= prices.fuel;
        state.inventory.fuel += 1;
        advanceTime(15);
        showMessage('Stig köper bensin till bilen.');
      }
    });
    addInteractable('pub', 'Puben', -8, -18, 3.9, () => {
      if (!Object.values(state.built).every(Boolean)) {
        showMessage('Stig måste först bygga motorn i garaget.');
      } else if (!state.story.dateAsked) {
        state.story.dateAsked = true;
        advanceTime(40);
        showMessage('Stig frågar Isabell om en dejt. Hon ler och säger ja.');
      } else {
        showMessage('Stig och Isabell har redan bestämt att träffas igen.');
      }
    });
    addInteractable('club', 'Klubben', 11, -18, 4.2, () => {
      if (!state.story.dateAsked) {
        showMessage('Det finns ingen anledning att gå in i klubben ännu.');
      } else if (state.money < 10000) {
        showMessage('Vakterna vill ha 10 000 kr. Stig behöver tjäna mer pengar först.');
      } else if (!state.story.clubPaid) {
        state.money -= 10000;
        state.story.clubPaid = true;
        advanceTime(30);
        showMessage('Stig mutar vakten med 10 000 kr och går in.');
      } else {
        showMessage('Stig är redan inne på klubben.');
      }
    });
    addInteractable('tractorReturn', 'Traktorn hem', 18, 20, 3.4, () => {
      state.location = 'ullervad';
      player.x = arena.ullervad.playerStart.x;
      player.z = arena.ullervad.playerStart.z;
      rebuildWorld();
      updateHud();
      showMessage('Stig kör hem till Ullervad med traktorn.');
    });
  }

  const groups = []; // simple placeholder for static world decoration
  for (let i = -32; i < 32; i += 7) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5d3b28 })
    );
    trunk.position.set(i * 0.7, 1.3, -28 + (i % 2) * 7);
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d7a46 })
    );
    leaves.position.set(i * 0.7, 3.0, -28 + (i % 2) * 7);
    groups.push(trunk, leaves);
  }
  groups.forEach((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
    world.add(child);
  });

  updateHud();
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.4, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4b7bb0, roughness: 0.8 })
  );
  body.castShadow = true;
  body.position.y = 1.3;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 15, 15),
    new THREE.MeshStandardMaterial({ color: 0xe8c7a1, roughness: 0.9 })
  );
  head.position.y = 2.7;
  group.add(body, head);
  group.position.set(player.x, 0, player.z);
  world.add(group);
  player.mesh = group;
}

function setPlayerPosition(x, z) {
  player.x = x;
  player.z = z;
  if (player.mesh) {
    player.mesh.position.set(player.x, 0, player.z);
  }
}

function updatePlayerMovement(dt) {
  let moveX = 0;
  let moveZ = 0;

  if (keyState['w'] || keyState['arrowup']) moveZ -= 1;
  if (keyState['s'] || keyState['arrowdown']) moveZ += 1;
  if (keyState['a'] || keyState['arrowleft']) moveX -= 1;
  if (keyState['d'] || keyState['arrowright']) moveX += 1;

  if (moveX !== 0 || moveZ !== 0) {
    const length = Math.hypot(moveX, moveZ) || 1;
    moveX /= length;
    moveZ /= length;
    player.yaw = Math.atan2(moveX, moveZ) + Math.PI;
    const speed = keyState['shift'] ? player.speed * 1.5 : player.speed;
    const nextX = player.x + moveX * speed * dt;
    const nextZ = player.z + moveZ * speed * dt;

    const maxDist = state.location === 'ullervad' ? 30 : 28;
    if (Math.hypot(nextX, nextZ) <= maxDist) {
      setPlayerPosition(nextX, nextZ);
    }
  }

  player.mesh.rotation.y = player.yaw;
}

function findNearestInteractable() {
  let nearest = null;
  let best = Infinity;
  for (const item of interactables) {
    const dx = player.x - item.x;
    const dz = player.z - item.z;
    const dist = Math.hypot(dx, dz);
    if (dist < item.radius && dist < best) {
      nearest = item;
      best = dist;
    }
  }
  return nearest;
}

function handleInteraction() {
  const target = findNearestInteractable();
  if (!target) {
    showMessage('Gå närmare något för att interagera.');
    return;
  }
  target.onInteract();
}

function applyTimeLighting() {
  const h = state.minutes / 1440;
  const daylight = Math.sin((h - 0.25) * Math.PI * 2) * 0.5 + 0.5;
  const skyColor = new THREE.Color().setHSL(0.6, 0.45, 0.25 + daylight * 0.45);
  scene.background.copy(skyColor);
  scene.fog.color.copy(skyColor);
  const sunStrength = 0.3 + daylight * 1.7;
  sun.intensity = sunStrength;
  sun.position.set(14 + daylight * 12, 22 + daylight * 12, 10);
  hemi.intensity = 0.7 + daylight * 0.8;
}

function resetGame() {
  state.money = 3000;
  state.day = 1;
  state.minutes = 8 * 60;
  state.location = 'ullervad';
  state.inventory = { spark: 0, oil: 0, coolant: 0, belt: 0, fuel: 0, food: 0, drink: 0, rims: 0 };
  state.built = { spark: false, oil: false, coolant: false, belt: false };
  state.story = { ghost: false, dateAsked: false, clubPaid: false, rimsFound: false, woodJob: 0, towJob: 0, repairJob: 0 };
  player.x = arena.ullervad.playerStart.x;
  player.z = arena.ullervad.playerStart.z;
  rebuildWorld();
  showMessage('Ny sommardag börjar i Ullervad. Stig har 3 000 kr och en trasig Volvo 945.');
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updatePlayerMovement(dt);
  const targetX = player.x + 8 * Math.sin(player.yaw);
  const targetZ = player.z + 8 * Math.cos(player.yaw);
  camera.position.lerp(new THREE.Vector3(player.x + 7, 8.5, player.z + 7), 0.1);
  camera.lookAt(player.x, 0.5, player.z);
  const desired = new THREE.Vector3(player.x, 2.5, player.z);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, desired.x + 9 * Math.sin(player.yaw + Math.PI), 0.12);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, desired.z + 9 * Math.cos(player.yaw + Math.PI), 0.12);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, 8.2, 0.12);
  camera.lookAt(player.x, 1.5, player.z);

  const nearest = findNearestInteractable();
  setPrompt(nearest ? `E · ${nearest.label}` : 'Gå runt och utforska. Tryck E nära något.');

  applyTimeLighting();
  updateHud();

  if (ui.message.dataset.timeout) {
    ui.message.dataset.timeout = String(Number(ui.message.dataset.timeout) - dt);
    if (Number(ui.message.dataset.timeout) <= 0) hideMessage();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keyState[key] = true;
  if (key === 'e') handleInteraction();
  if (key === 'shift') keyState.shift = true;
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  keyState[key] = false;
  if (key === 'shift') keyState.shift = false;
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

ui.reset.addEventListener('click', resetGame);

resetGame();
scene.add(world);
createPlayerMesh();
player.x = arena.ullervad.playerStart.x;
player.z = arena.ullervad.playerStart.z;
setPlayerPosition(player.x, player.z);
rebuildWorld();
showMessage('Det är sommaren i Ullervad. Stig har 3 000 kr, en John Deere-traktor och en Volvo 945 som behöver byggas.');
animate();
