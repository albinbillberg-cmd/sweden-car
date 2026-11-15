const STARTING_MONEY = 3000;
const parts = [
  { id: 'sparkPlugs', name: 'Tändstift', price: 100 },
  { id: 'oil', name: 'Motorolja', price: 200 },
  { id: 'coolant', name: 'Kylvätska', price: 500 },
  { id: 'belt', name: 'Rem', price: 50 },
];
const itemNames = { sparkPlugs: 'Tändstift', oil: 'Motorolja', coolant: 'Kylvätska', belt: 'Rem', fuel: 'Bensin', food: 'Mat', drink: 'Dryck', rims: 'Fälgar' };
const locations = { ullervad: 'Ullervad', mariestad: 'Mariestad', barn: 'Övergiven ladugård' };

function freshState() {
  return { money: STARTING_MONEY, day: 1, hour: 8, location: 'ullervad', inventory: { sparkPlugs: 0, oil: 0, coolant: 0, belt: 0, fuel: 0, food: 0, drink: 0, rims: 0 }, built: { sparkPlugs: false, oil: false, coolant: false, belt: false }, story: { rimsFound: false, ghostSeen: false, isabellAsked: false, dateAccepted: false, clubEntered: false }, log: [] };
}
let state = freshState();
const $ = (id) => document.getElementById(id);

function say(message) { state.log.unshift(message); state.log = state.log.slice(0, 20); }
function moneyText(amount) { return `${amount.toLocaleString('sv-SE')} kr`; }
function advance(hours) {
  state.hour += hours;
  while (state.hour >= 24) { state.hour -= 24; state.day += 1; }
  if (state.hour >= 20 || state.hour < 5) {
    if (state.location === 'barn' && !state.story.ghostSeen) {
      state.story.ghostSeen = true;
      say('Ett spöke visar sig i ladugården! Stig springer ut i sommarnatten.');
    }
  }
}
function changeLocation(location) { state.location = location; render(); }
function carReady() { return Object.values(state.built).every(Boolean) && state.inventory.fuel > 0; }
function canPay(price) { if (state.money < price) { say('Stig har inte tillräckligt med pengar. Dags att ta ett jobb.'); render(); return false; } return true; }
function doWork(job, pay, hours, message) { state.money += pay; advance(hours); say(`${message} +${moneyText(pay)}.`); render(); }
function action(title, description, handler, label = 'Gör') {
  const row = document.createElement('div'); row.className = 'action-row';
  const info = document.createElement('div'); const name = document.createElement('p'); name.textContent = title; const detail = document.createElement('small'); detail.textContent = description; info.append(name, detail);
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', handler); row.append(info, button); $('actions').append(row);
}
function buy(item, shop) {
  if (!canPay(item.price)) return;
  state.money -= item.price; state.inventory[item.id] += 1; advance(1); say(`Stig köper ${item.name.toLowerCase()} på ${shop} för ${moneyText(item.price)}.`); render();
}
function travelTo(city) {
  if (city === 'mariestad' && state.location === 'ullervad') {
    advance(2); state.location = 'mariestad'; say('Stig kör John Deere-traktorn längs sommarvägen in till Mariestad.');
  } else if (city === 'ullervad' && state.location === 'mariestad') {
    advance(2); state.location = 'ullervad'; say('Stig kör traktorn hem till Ullervad.');
  }
  render();
}
function renderActions() {
  const box = $('actions'); box.replaceChildren();
  if (state.location === 'ullervad') {
    action('Leverera ved', 'Kör John Deere-traktorn till kunder i trakten. · 800 kr · 2 timmar', () => doWork('vedleverans', 800, 2, 'Stig levererar ved med traktorn'));
    action('Bärga en bil', 'Hjälp en granne med traktorn. · 1 200 kr · 2 timmar', () => doWork('bärgning', 1200, 2, 'Stig bärgar en bil med traktorn'));
    action('Laga en bil', 'Fixa en kundbil i garaget. · 1 500 kr · 3 timmar', () => doWork('bilreparation', 1500, 3, 'Stig lagar en bil i garaget'));
    action('Bygg klart Volvo 945', 'Montera alla fyra inköpta motordelar i garaget.', () => {
      const missing = parts.filter((part) => state.inventory[part.id] < 1 || state.built[part.id]);
      if (missing.length) { say(`Det saknas delar: ${missing.map((part) => part.name).join(', ')}.`); render(); return; }
      for (const part of parts) { state.inventory[part.id] -= 1; state.built[part.id] = true; }
      advance(4); say('Stig monterar tändstift, olja, kylvätska och rem. Motorn är ihopbyggd!'); render();
    }, 'Skruva');
    action('Åk till ladugården', 'Leta efter övergivna fälgar. Se upp när det blir mörkt.', () => { state.location = 'barn'; advance(1); say('Stig tar traktorn till en övergiven ladugård utanför Ullervad.'); render(); }, 'Åk');
    action('Åk till Mariestad', 'Ta John Deere-traktorn till stan. · 2 timmar', () => travelTo('mariestad'), 'Kör');
    if (carReady()) action('Kör Volvo 945 till Mariestad', 'Bilen är körklar. Nu kan Stig åka till stan i 945:an.', () => { state.inventory.fuel -= 1; state.location = 'mariestad'; advance(1); say('Stig startar sin Volvo 945 och kör mot Mariestad.'); render(); }, 'Kör');
  }
  if (state.location === 'mariestad') {
    action('Mekonomen', 'Tändstift 100 kr · motorolja 200 kr · kylvätska 500 kr · rem 50 kr.', () => {
      box.replaceChildren(); for (const part of parts) action(`Köp ${part.name}`, `Pris: ${moneyText(part.price)}.`, () => buy(part, 'Mekonomen'), 'Köp');
      action('Tillbaka till Mariestad', 'Stäng butiken.', () => render(), 'Tillbaka');
    }, 'Handla');
    action('OKQ8', 'Köp bensin till Volvo 945:an. · 300 kr', () => buy({ id: 'fuel', name: 'Bensin', price: 300 }, 'OKQ8'), 'Tanka');
    action('Coop', 'Köp mat för 80 kr eller dryck för 120 kr.', () => {
      box.replaceChildren(); action('Köp mat', 'Pris: 80 kr.', () => buy({ id: 'food', name: 'Mat', price: 80 }, 'Coop'), 'Köp'); action('Köp dryck', 'Pris: 120 kr.', () => buy({ id: 'drink', name: 'Dryck', price: 120 }, 'Coop'), 'Köp'); action('Tillbaka till Mariestad', 'Stäng butiken.', () => render(), 'Tillbaka');
    }, 'Handla');
    action('Prata med Isabell på puben', 'Fråga henne om hon vill gå på en dejt. Hon bestämmer själv.', () => {
      if (!carReady()) { say('Stig vill först få Volvo 945:an körklar och bygga motorn.'); render(); return; }
      if (state.story.isabellAsked) { say(state.story.dateAccepted ? 'Isabell och Stig har redan bestämt att ses på dejt.' : 'Stig har redan frågat Isabell. Hon tackade nej den här gången.'); render(); return; }
      state.story.isabellAsked = true; state.story.dateAccepted = true; advance(1); say('Stig frågar Isabell om hon vill gå på dejt. Hon tackar ja och de bestämmer att ses en annan dag.'); render();
    }, 'Fråga');
    action('Klubbens entré', 'En fiktiv spelutmaning: vakten kräver 10 000 kr för att släppa in Stig.', () => {
      if (state.story.clubEntered) { say('Stig är redan inne på klubben.'); render(); return; }
      if (!canPay(10000)) return;
      state.money -= 10000; state.story.clubEntered = true; advance(1); say('Stig betalar de 10 000 kronorna och kommer in på klubben.'); render();
    }, 'Betala 10 000 kr');
    action('Till Ullervad', 'Kör tillbaka med traktorn. · 2 timmar', () => travelTo('ullervad'), 'Åk hem');
  }
  if (state.location === 'barn') {
    action('Leta efter fälgar', 'Utforska ladugården på dagen.', () => {
      if (state.story.rimsFound) { say('Stig har redan hittat fälgarna här.'); render(); return; }
      state.story.rimsFound = true; state.inventory.rims += 2; advance(1); say('Stig hittar två begagnade fälgar bland bråten.'); render();
    }, 'Leta');
    action('Vänta till natten', 'Spöket sägs bara visa sig efter mörkrets inbrott.', () => { advance(11); say('Solen går ner över åkrarna. Något rör sig inne i ladugården…'); render(); }, 'Vänta');
    action('Till Ullervad', 'Kör traktorn tillbaka till gården.', () => { state.location = 'ullervad'; advance(1); say('Stig åker hem från ladugården.'); render(); }, 'Åk hem');
  }
}
function render() {
  $('location').textContent = locations[state.location]; $('clock').textContent = `Dag ${state.day} · ${String(state.hour).padStart(2, '0')}:00`; $('money').textContent = moneyText(state.money);
  $('vehicle').textContent = state.location === 'mariestad' && carReady() ? 'Volvo 945' : 'John Deere-traktor';
  const scenes = {
    ullervad: ['Ullervad', 'Garaget väntar', 'Det är sommar i Ullervad. Stig har 3 000 kr, en John Deere-traktor och en Volvo 945 som behöver få motorn byggd. Jobba för att finansiera delarna.'],
    mariestad: ['Mariestad', 'En tur in till stan', 'Mekonomen, Coop, OKQ8 och puben ligger i stan. Köp det du behöver och ta dig hem igen.'],
    barn: ['Utanför Ullervad', 'Ladugården i skogsbrynet', 'Fälgarna kanske finns där inne. Under dagen är det tyst — men spöket sägs komma fram på natten.'],
  };
  const [eyebrow, title, text] = scenes[state.location]; $('sceneEyebrow').textContent = eyebrow; $('sceneTitle').textContent = title; $('sceneText').textContent = text;
  const completed = Object.values(state.built).filter(Boolean).length; const progress = Math.round(completed / 4 * 100); $('carProgress').style.width = `${progress}%`; $('carProgressText').textContent = carReady() ? 'Körklar' : `${completed}/4 motordelar monterade`;
  const inventory = $('inventory'); inventory.replaceChildren(); const carried = Object.entries(state.inventory).filter(([, count]) => count > 0);
  if (!carried.length) { const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = 'Inget ännu — dags att handla.'; inventory.append(empty); }
  for (const [id, count] of carried) { const li = document.createElement('li'); const name = document.createElement('span'); name.textContent = itemNames[id]; const amount = document.createElement('strong'); amount.textContent = `× ${count}`; li.append(name, amount); inventory.append(li); }
  const log = $('log'); log.replaceChildren(); for (const entry of state.log) { const p = document.createElement('p'); p.textContent = entry; log.append(p); }
  renderActions();
}
$('resetButton').addEventListener('click', () => { state = freshState(); say('En ny sommardag börjar i Ullervad. Stig har 3 000 kr och Volvo 945:an väntar i garaget.'); render(); });
say('En ny sommardag börjar i Ullervad. Stig har 3 000 kr och Volvo 945:an väntar i garaget.'); render();
