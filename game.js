const state = {
  money: 3000,
  day: 1,
  time: 8,
  location: 'ullervad',
  carReady: false,
  inventory: {
    tandstift: 0,
    motorolja: 0,
    kylvatska: 0,
    rem: 0,
    bensin: 0,
    mat: 0,
    dryck: 0,
    falgar: 0,
  },
  story: {
    ladugard: false,
    ghostSeen: false,
    isabellMet: false,
    dateAsked: false,
    clubPaid: false,
    journeyStarted: false,
  },
};

const locationNames = {
  ullervad: 'Ullervad',
  mariestad: 'Mariestad',
  ladugard: 'Övergiven ladugård',
};

const prices = {
  tandstift: 100,
  motorolja: 200,
  kylvatska: 500,
  rem: 50,
  bensin: 300,
  mat: 80,
  dryck: 120,
  falgar: 0,
};

const storyLog = document.getElementById('storyLog');
const actionList = document.getElementById('actions');
const inventoryList = document.getElementById('inventoryList');
const moneyEl = document.getElementById('money');
const dayEl = document.getElementById('day');
const timeEl = document.getElementById('time');
const locationNameEl = document.getElementById('locationName');
const carStatusEl = document.getElementById('carStatus');
const locationsEl = document.getElementById('locations');

function addLog(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = message;
  storyLog.prepend(entry);
}

function formatMoney(value) {
  return `${value} kr`;
}

function tickTime(hours) {
  state.time += hours;
  while (state.time >= 24) {
    state.time -= 24;
    state.day += 1;
  }
}

function setLocation(name) {
  state.location = name;
  render();
}

function renderStats() {
  moneyEl.textContent = formatMoney(state.money);
  dayEl.textContent = String(state.day);
  timeEl.textContent = `${String(state.time).padStart(2, '0')}:00`;
  locationNameEl.textContent = locationNames[state.location];

  const carText = state.carReady
    ? 'Volvo 945: körklar'
    : 'Volvo 945: trasig';
  carStatusEl.textContent = carText;
}

function renderInventory() {
  inventoryList.innerHTML = '';
  Object.entries(state.inventory).forEach(([key, value]) => {
    if (value <= 0) return;

    const li = document.createElement('li');
    li.innerHTML = `<span>${labelForItem(key)}</span><strong>${value}</strong>`;
    inventoryList.appendChild(li);
  });
}

function labelForItem(key) {
  const labels = {
    tandstift: 'Tändstift',
    motorolja: 'Motorolja',
    kylvatska: 'Kylvätska',
    rem: 'Rem',
    bensin: 'Bensin',
    mat: 'Mat',
    dryck: 'Dryck',
    falgar: 'Fälgar',
  };

  return labels[key] || key;
}

function renderLocations() {
  locationsEl.innerHTML = '';
  Object.entries(locationNames).forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (state.location === key) btn.classList.add('active');
    btn.addEventListener('click', () => setLocation(key));
    locationsEl.appendChild(btn);
  });
}

function canAssembleCar() {
  return (
    state.inventory.tandstift > 0 &&
    state.inventory.motorolja > 0 &&
    state.inventory.kylvatska > 0 &&
    state.inventory.rem > 0
  );
}

function renderActions() {
  actionList.innerHTML = '';

  if (state.location === 'ullervad') {
    addAction('Leverera ved med traktorn', 'Tjäna pengar och få lite ordning i vardagen.', () => {
      state.money += 800;
      tickTime(2);
      addLog('Stig kör ut och levererar ved till byn. Han får 800 kr och känner att livet börjar röra på sig.');
      render();
    });

    addAction('Bärga bil med traktorn', 'Värdefulla delar och lite extra inkomst.', () => {
      state.money += 1200;
      tickTime(2);
      addLog('Stig drar runt på gården och bärgar en trasig bil. Det blir några hundra kronor i fickan och ett nytt fynd.');
      render();
    });

    addAction('Laga bilar i garaget', 'Få betalt för att fixa andras fordon.', () => {
      state.money += 1500;
      tickTime(3);
      addLog('Stig fixar en annan bil i garaget. Det ger lite pengar och övar upp hans hantverk.');
      render();
    });

    addAction('Montera Volvo 945', 'Om du har alla delar kan bilen byggas färdig.', () => {
      if (!canAssembleCar()) {
        addLog('Stig öppnar huven. Det fattas fortfarande delar i bilen.');
        return;
      }

      state.inventory.tandstift -= 1;
      state.inventory.motorolja -= 1;
      state.inventory.kylvatska -= 1;
      state.inventory.rem -= 1;
      state.carReady = true;
      state.money += 0;
      tickTime(4);
      addLog('Volvo 945:an börjar äntligen leva. Motorn är monterad, remmen är på plats och bilen är körklar nog att ta sig till Mariestad.');
      render();
    });

    addAction('Åk till ladugården', 'Sök efter fälgar och gamla reservdelar.', () => {
      setLocation('ladugard');
    });
  }

  if (state.location === 'ladugard') {
    addAction('Sök efter fälgar', 'Det finns gamla hjul i den övergivna ladugården.', () => {
      if (state.story.ladugard) {
        addLog('Stig letar igen, men bara tomma hörn och gammal smuts finns kvar.');
        return;
      }

      state.story.ladugard = true;
      state.inventory.falgar += 2;
      tickTime(2);
      addLog('Stig hittar två gamla fälgar i ett hörn. De ser halvbra ut, men de kan spara pengar om han behöver byta till bättre hjul.');
      render();
    });

    addAction('Gå hem till Ullervad', 'Det är dags att återvända till garaget.', () => {
      setLocation('ullervad');
    });

    addAction('Gå till natten', 'Det är där spöket brukar dyka upp.', () => {
      if (!state.story.ladugard) {
        addLog('Stig går in i mörkret utan att ha hittat något. Det känns obekvämt, men ännu inget händer.');
        return;
      }

      state.story.ghostSeen = true;
      tickTime(3);
      addLog('När mörkret faller kommer spöket fram ur skuggorna. Stig rusar ut i panik med hjärtat i halsen. Han tänker att det blir en historia att berätta hemma.');
      render();
    });
  }

  if (state.location === 'mariestad') {
    addAction('Gå till Mekonomen', 'Köp tändstift, olja, kylvätska och rem.', () => {
      addLog('Stig går in i Mekonomen. Det finns allt han behöver för att finjustera bilen.');
      renderShop('mekonomen');
    });

    addAction('Gå till Coop', 'Handla mat och dryck.', () => {
      addLog('Stig handlar frukt, bröd och några kalla drycker inför reson och kvällens plan.');
      renderShop('coop');
    });

    addAction('Gå till OKQ8', 'Köp bensin till Volvo 945:an.', () => {
      if (state.money < prices.bensin) {
        addLog('Stig tittar på pumpen, men pengarna räcker inte ännu. Det blir ett nytt jobb först.');
        return;
      }
      state.inventory.bensin += 1;
      state.money -= prices.bensin;
      tickTime(1);
      addLog('Stig fyller bilen med bensin. Nu finns det lite mer bränsle till nästa resa.');
      render();
    });

    addAction('Gå till puben', 'Hitta Isabell och fråga om hon vill gå på dejt.', () => {
      if (!state.carReady) {
        addLog('Stig vill gärna gå till puben, men bilen är fortfarande trasig. Han måste fixa den först.');
        return;
      }

      state.story.isabellMet = true;
      tickTime(2);
      addLog('Stig träffar Isabell i puben. Hon ler och han vågar fråga om hon vill gå på dejt. Hon säger att det beror på om han kan ta henne hem säkert.');
      render();
    });

    addAction('Gå till klubben', 'Mutan kräver 10 000 kr.', () => {
      if (!state.story.isabellMet) {
        addLog('Stig är inte redo för klubben ännu. Han måste först hitta Isabell och få en riktig chans.');
        return;
      }

      if (state.money < 10000) {
        addLog('Vakterna tittar på honom men blir inte övertalade. Han behöver mer pengar först.');
        return;
      }

      state.money -= 10000;
      state.story.clubPaid = true;
      addLog('Stig mutar vakten med 10 000 kr. Nu kan han komma in i klubben och ta nästa steg i sin kväll.');
      render();
    });

    addAction('Kör hem till Ullervad', 'Återvänd till byn och garaget.', () => {
      setLocation('ullervad');
    });
  }

  if (state.location === 'ullervad' || state.location === 'mariestad') {
    const travelLabel = state.location === 'ullervad' ? 'Kör till Mariestad med traktorn' : 'Kör hem till Ullervad';
    addAction(travelLabel, 'Res från byn till stan och tillbaka igen.', () => {
      if (state.location === 'ullervad') {
        state.location = 'mariestad';
        state.story.journeyStarted = true;
        tickTime(2);
        addLog('Stig kör sina traktorfordon till Mariestad. Det är en lång resa, men nu börjar det riktiga äventyret.');
      } else {
        state.location = 'ullervad';
        tickTime(2);
        addLog('Stig kör tillbaka till Ullervad igen. Solen går ner och han måste planera nästa jobb.');
      }
      render();
    });
  }

  if (state.location === 'mariestad') {
    addAction('Gå hem till karaktären', 'Tillbaka till Ullervad.', () => {
      setLocation('ullervad');
    });
  }

  if (state.location === 'ullervad') {
    addAction('Ta dig till Mariestad', 'Bättre att ta traktorn om bilen inte är körklar ännu.', () => {
      setLocation('mariestad');
    });
  }
}

function addAction(title, description, handler) {
  const wrapper = document.createElement('div');
  wrapper.className = 'action-item';

  const info = document.createElement('div');
  info.innerHTML = `<strong>${title}</strong><small>${description}</small>`;

  const button = document.createElement('button');
  button.textContent = 'Kör';
  button.addEventListener('click', handler);

  wrapper.appendChild(info);
  wrapper.appendChild(button);
  actionList.appendChild(wrapper);
}

function renderShop(shopName) {
  actionList.innerHTML = '';

  const listing = {
    mekonomen: [
      ['Köp tändstift', prices.tandstift, 'tandstift'],
      ['Köp motorolja', prices.motorolja, 'motorolja'],
      ['Köp kylvätska', prices.kylvatska, 'kylvatska'],
      ['Köp rem', prices.rem, 'rem'],
    ],
    coop: [
      ['Köp mat', prices.mat, 'mat'],
      ['Köp dryck', prices.dryck, 'dryck'],
    ],
  };

  const items = listing[shopName] || [];

  items.forEach(([label, price, key]) => {
    addAction(`${label} (${price} kr)`, `Lägg till ${label.toLowerCase()} i förrådet.`, () => {
      if (state.money < price) {
        addLog(`Stig tittar på ${label.toLowerCase()}, men han har inte tillräckligt med pengar.`);
        return;
      }

      state.money -= price;
      state.inventory[key] += 1;
      tickTime(1);
      addLog(`Stig köper ${label.toLowerCase()} för ${price} kr.`);
      render();
    });
  });

  addAction('Tillbaka till stan', 'Återgå till Mariestad.', () => {
    setLocation('mariestad');
  });
}

function render() {
  renderStats();
  renderInventory();
  renderLocations();
  renderActions();
}

addLog('Det är sommaren i Ullervad. Stig har en trasig Volvo 945, 3000 kr i fickan och ett mål: få bilen körklar och ta sig till Mariestad.');
render();
