/* Pleur — main app */
(() => {
  const view = document.getElementById('view');
  const modalRoot = document.getElementById('modal-root');
  const topbarSub = document.getElementById('topbar-sub');

  // ---------- seed ----------
  // Vul ontbrekende geseede recepten aan (op titel), zodat nieuwe seeds
  // ook in al bestaande installaties verschijnen; werk de categorie bij
  // van eerder geseede recepten die er nog geen hebben.
  const seedTitles = SEED_RECIPES.map(r => r.title);
  DB.recipes
    .filter(x => !x.custom && !seedTitles.includes(x.title))
    .forEach(x => DB.removeRecipe(x.id));       // seed die niet meer bestaat
  SEED_RECIPES.forEach(r => {
    const existing = DB.recipes.find(x => !x.custom && x.title === r.title);
    if (!existing) DB.addRecipe({ ...r, custom: false });
    else DB.updateRecipe({ ...r, id: existing.id, custom: false }); // altijd de nieuwste tekst
  });
  DB.seeded = true;

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 86400000);

  function taskStatus(task) {
    const done = lastDoneOf(task);
    if (!done) return { cls: 'danger', label: 'Nog nooit', due: 0 };
    const elapsed = daysSince(done);
    const left = task.intervalDays - elapsed;
    if (left < 0) return { cls: 'danger', label: `${-left} d te laat`, due: left };
    if (left <= Math.max(2, task.intervalDays * 0.15)) return { cls: 'warn', label: `Over ${left} d`, due: left };
    return { cls: 'ok', label: `Over ${left} d`, due: left };
  }

  function gearWorstStatus(g) {
    if (!g.tasks.length) return null;
    const order = { danger: 0, warn: 1, ok: 2 };
    return g.tasks.map(taskStatus).sort((a, b) => order[a.cls] - order[b.cls])[0];
  }

  const GEAR_TYPES = ['Espressomachine', 'Maler', 'Brouwer', 'Ketel', 'Weegschaal', 'Overig'];
  // Bekende merken per type, met hun modellen (kort — zonder merknaam ervoor)
  const GEAR_BRANDS = {
    Espressomachine: {
      'Gaggia': ['Classic Pro', 'Classic Evo'],
      'Rancilio': ['Silvia', 'Silvia Pro X'],
      'Sage / Breville': ['Bambino', 'Bambino Plus', 'Barista Express', 'Dual Boiler'],
      'Lelit': ['Anna', 'Elizabeth', 'MaraX', 'Bianca'],
      'ECM': ['Classika', 'Synchronika'],
      'Profitec': ['Pro 500', 'Pro 700'],
      'La Marzocco': ['Linea Micra', 'Linea Mini', 'GS3'],
      'Ascaso': ['Dream', 'Steel Duo', 'Baby T'],
      'Flair': ['Neo', 'Classic', '58'],
      'Cafelat': ['Robot'],
      "De'Longhi": ['Dedica', 'La Specialista'],
    },
    Maler: {
      'Timemore': ['C2', 'C3', 'C3 Pro', '064', '078', '078s'],
      'Comandante': ['C40', 'C40 MK4'],
      '1Zpresso': ['Q2', 'X-Pro', 'JX-Pro', 'J-Max', 'K-Ultra'],
      'Kingrinder': ['K4', 'K6'],
      'Niche': ['Zero', 'Duo'],
      'DF': ['DF54', 'DF64', 'DF83'],
      'Eureka': ['Mignon Silenzio', 'Mignon Specialita', 'Oro'],
      'Fellow': ['Opus', 'Ode Gen 2'],
      'Baratza': ['Encore', 'Encore ESP', 'Virtuoso+'],
      'Mahlkönig': ['X54', 'EK43'],
      'Weber': ['Key', 'EG-1', 'HG-2'],
      'Wilfa': ['Svart', 'Uniform'],
    },
    Brouwer: {
      'Hario': ['V60-01', 'V60-02', 'Switch', 'Mugen'],
      'Chemex': ['3-cup', '6-cup', '8-cup'],
      'Kalita': ['Wave 155', 'Wave 185'],
      'Origami': ['Dripper S', 'Dripper M'],
      'AeroPress': ['Original', 'Go', 'Clear', 'XL'],
      'Clever': ['Dripper'],
      'Bodum': ['Chambord', 'Brazil'],
      'Bialetti': ['Moka Express', 'Brikka'],
      'Espro': ['P7', 'Ultralight'],
      'Fellow': ['Stagg [X]', 'Stagg [XF]'],
    },
    Ketel: {
      'Fellow': ['Stagg EKG', 'Stagg EKG Pro', 'Corvo EKG'],
      'Brewista': ['Artisan', 'Artisan Gen 2'],
      'Hario': ['Buono', 'Buono Power'],
      'Timemore': ['Fish Smart', 'Fish Pro'],
      'Bonavita': ['Variable Temp'],
    },
    Weegschaal: {
      'Acaia': ['Pearl', 'Pearl S', 'Lunar', 'Pyxis'],
      'Timemore': ['Black Mirror Basic 2', 'Black Mirror Nano'],
      'Felicita': ['Arc', 'Parallel'],
      'Brewista': ['Smart Scale II'],
      'Hario': ['V60 Drip Scale'],
    },
    Overig: {},
  };
  // Aanbevolen onderhoudsroutines per type (interval in dagen)
  const MAINT_REC = {
    Espressomachine: [
      { n: 'Backflush met water', d: 7 },
      { n: 'Backflush met schoonmaakmiddel', d: 30 },
      { n: 'Douchezeef & groepskop reinigen', d: 30 },
      { n: 'Ontkalken', d: 90 },
      { n: 'Groepskop-dichting vervangen', d: 365 },
    ],
    Maler: [
      { n: 'Burrs uitborstelen', d: 30 },
      { n: 'Diepe reiniging (grinder cleaner)', d: 90 },
      { n: 'Burrs controleren / vervangen', d: 730 },
    ],
    Brouwer: [
      { n: 'Grondige reiniging (koffie-olie)', d: 30 },
    ],
    Ketel: [
      { n: 'Ontkalken', d: 60 },
    ],
    Weegschaal: [
      { n: 'Batterijen controleren & kalibreren', d: 180 },
    ],
    Overig: [],
  };


  // Onderhoud: elke routine houdt zijn eigen log bij; de laatste
  // logdatum bepaalt de status (oudere data gebruikt nog lastDone).
  const CHECK_ICON = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 7.3c1.3 1.3 2.2 2.5 2.9 3.7C6.9 8.2 8.9 5.2 11.8 2.7"/></svg>';
  const lastDoneOf = t => (t.log && t.log.length)
    ? t.log.map(e => e.date).sort().at(-1)
    : (t.lastDone || null);
  const recCheckList = (items, idPrefix) => items.map((t, i) => `
    <label class="check">
      <input type="checkbox" name="${idPrefix}${i}" value="${esc(t.n)}" data-days="${t.d}" checked>
      <span class="box">${CHECK_ICON}</span>
      <span><span class="check-text">${esc(t.n)}</span>
      <span class="check-sub">elke ${t.d} dagen</span></span>
    </label>`).join('');
  const pickedTasks = (root, idPrefix, mkId) =>
    [...root.querySelectorAll(`input[name^="${idPrefix}"]:checked`)].map(el => ({
      id: mkId(), name: el.value, intervalDays: +el.dataset.days, log: [],
    }));
  // Alle logregels van een gear, nieuwste eerst
  const gearLog = g => (g.tasks || []).flatMap(t =>
    (t.log || []).map(e => ({ ...e, task: t.name, taskId: t.id })))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Categorie-indeling naar café-menuconventie:
  // zwarte espressodranken / melkdranken / filter & brew / iced / techniek.
  const RECIPE_CATS = [
    { v: 'espresso', l: 'Espresso' },
    { v: 'melk', l: 'Melk' },
    { v: 'filter', l: 'Filter & brew' },
    { v: 'iced', l: 'Iced' },
  ];

  // Bekende koffievariëteiten (dropdown; "Overig" = vrije invoer)
  const VARIETIES = [
    'Typica', 'Bourbon', 'Caturra', 'Catuaí', 'Castillo', 'Colombia', 'Tabi',
    'Gesha / Geisha', 'SL28', 'SL34', 'Ruiru 11', 'Batian', 'Kent',
    'Pacamara', 'Pacas', 'Maragogype', 'Mundo Novo', 'Villa Sarchi', 'Sidra',
    'Wush Wush', 'Java', 'Ethiopian heirloom', 'Typica Mejorado',
    'Catimor', 'Sarchimor', 'Marsellesa', 'Parainema', 'Obatã', 'Laurina',
    'Robusta (Canephora)', 'Liberica', 'Excelsa', 'Blend / meerdere',
  ];
  const catLabel = v => RECIPE_CATS.find(c => c.v === v)?.l || '';
  const drinkOf = r => r.drink || r.title;
  let recipeFilter = 'alle';
  let recipesExpanded = false;
  let drinkSel = null; // geselecteerde drank (variantenweergave)
  let coffeeView = 'lijst';
  let mapSelection = null;

  // ------------------------------------------------
  // Wereldbol: gestileerde continenten ([lon, lat]-polygonen)
  // + coördinaten van koffielanden.
  // ------------------------------------------------
  const ORIGINS = [
    [['colombia'], [-74, 4]],
    [['brazil', 'brazilië'], [-52, -12]],
    [['ethiopi'], [39, 8]],
    [['kenya', 'kenia'], [37, 0]],
    [['rwanda'], [30, -2]],
    [['burundi'], [30, -3]],
    [['tanzania'], [35, -6]],
    [['uganda', 'oeganda'], [32, 1]],
    [['congo'], [23, -2]],
    [['guatemala'], [-90, 15]],
    [['honduras'], [-87, 15]],
    [['salvador'], [-89, 14]],
    [['nicaragua'], [-85, 13]],
    [['costa rica'], [-84, 10]],
    [['panama'], [-80, 9]],
    [['mexico'], [-102, 23]],
    [['peru'], [-75, -9]],
    [['bolivia'], [-64, -17]],
    [['ecuador'], [-78, -2]],
    [['venezuela'], [-66, 7]],
    [['jamaica'], [-77, 18]],
    [['cuba'], [-79, 22]],
    [['dominicaanse', 'dominican'], [-70, 19]],
    [['haïti', 'haiti'], [-72, 19]],
    [['india'], [78, 21]],
    [['vietnam'], [106, 16]],
    [['sumatra'], [101, 0]],
    [['java'], [110, -7]],
    [['sulawesi'], [120, -2]],
    [['indonesi'], [118, -2]],
    [['papoea', 'papua'], [143, -6]],
    [['jemen', 'yemen'], [47, 15]],
    [['yunnan', 'china'], [102, 25]],
    [['thailand'], [101, 15]],
    [['myanmar'], [96, 20]],
    [['laos'], [103, 18]],
    [['filipijnen', 'philippines'], [122, 13]],
    [['hawaii', 'hawaï', 'kona'], [-156, 20]],
  ];
  function originSpot(origin) {
    if (!origin) return null;
    const s = origin.toLowerCase();
    for (const [keys, coord] of ORIGINS) {
      if (keys.some(k => s.includes(k))) return { key: keys[0], coord };
    }
    return null;
  }

  // ------------------------------------------------
  // Roast dates: meerdere batches per koffie + drinkvenster.
  // Richtlijnen uit de specialty-scene: ontgassen 4 d (filter) /
  // 7 d (espresso), beste venster t/m ± 30 d, uiterlijk ± 60 d.
  // ------------------------------------------------
  const REST_FILTER = 4, REST_ESPRESSO = 7, PEAK_END = 30, EXPIRY = 60;
  const addDays = (iso, d) => {
    const dt = new Date(iso);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  };
  function batchStatus(roastDate) {
    const age = daysSince(roastDate);
    if (age < 0) return { cls: 'warn', label: 'Toekomst', age };
    if (age < REST_FILTER) return { cls: 'warn', label: `Rust — nog ${REST_FILTER - age} d`, age };
    if (age < REST_ESPRESSO) return { cls: 'ok', label: 'Klaar voor filter', age };
    if (age <= PEAK_END) return { cls: 'ok', label: 'Optimaal', age };
    if (age <= EXPIRY) return { cls: 'warn', label: "Op z'n retour", age };
    return { cls: 'danger', label: 'Over datum', age };
  }
  // Migreer een losse roastDate naar de batchlijst
  function coffeeBatches(c) {
    if (!c.batches) {
      c.batches = c.roastDate ? [{ id: DB.uid(), roastDate: c.roastDate }] : [];
    }
    return [...c.batches].sort((a, b) => (b.roastDate || '').localeCompare(a.roastDate || ''));
  }


  // Handgetekende lijnillustraties — één accent per leeg scherm
  const ILLU = {
    gear: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 11.2c-.2-.7.3-1.3 1-1.3l10.3.2c.7 0 1.1.5 1 1.2l-.8 4.6c-.3 1.6-1.8 2.8-3.4 2.7l-4.3-.1c-1.6 0-2.9-1.2-3.1-2.7z"/><path d="M6.5 10.6c2-1.3 10.6-1.4 12.5.2"/><path d="M11 18.6c.1 1.2.2 2.4.4 3.5M14.2 18.7c0 1.1-.1 2.3-.2 3.4"/><path d="M18.7 12.9c2.6-.3 5.3.1 7.9.8.9.3 1.3 1.1.9 1.8-.4.7-1.4.9-2.3.7-2-.5-4.1-.8-6.3-.8"/></svg>',
    coffee: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><path d="M25.3 9c1.2 2.7-.6 6.8-4.3 9.9-3.9 3.3-8.8 4.7-11.5 3.2"/><path d="M9.5 22.1c-2.6-1.6-2.7-5.3.4-9 3.2-3.9 8.4-6.3 11.7-5.4"/><path d="M21.6 7.7c1.7.5 3 1.6 3.7 3.1"/><path d="M9.3 21.9c2.9-1.1 3.6-4.2 6-6.4 2.5-2.3 5.5-2.2 8.1-4.4"/><path d="M12.4 21.3c.9-.6 1.6-1.4 2.2-2.3"/></svg>',
    recipes: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><path d="M6.8 9.6c4.3-1.1 14.1-1 18.4.2"/><path d="M6.9 9.7 15 21.5c.6 1 1.9 1 2.5.1L25.2 9.8"/><path d="M11.6 10.4c1.1 3.5 2.3 7 3.6 10.4M20.6 10.5c-1 2.7-2.1 5.3-3.3 7.9"/><path d="M16 24.2c-1 1.4-1.6 2.4-1.6 3.3 0 1 .7 1.7 1.6 1.7.9 0 1.6-.7 1.6-1.7 0-.9-.6-1.9-1.6-3.3z"/></svg>',
  };
  const illu = k => `<div class="illu">${ILLU[k]}</div>`;

  // Alle maalstanden die op een bepaald apparaat zijn vastgelegd
  const grindsOnGear = g => DB.coffees.flatMap(co => (co.grinds || [])
    .filter(gr => gr.gearId === g.id)
    .map(gr => ({ ...gr, coffeeId: co.id, coffeeName: co.name, roaster: co.roaster })));

  const starsHtml = n => n
    ? `<span class="stars">${'★'.repeat(+n)}<span class="off">${'★'.repeat(5 - +n)}</span></span>` : '';

  // ------------------------------------------------
  // Brouw-calculator: schaal filter-recepten naar een
  // gekozen watervolume (of aantal personen à 250 g).
  // ------------------------------------------------
  const WATER_PP = 250; // g water per persoon
  let brewCalc = { id: null, water: null };
  let recipeCoffee = { id: null, coffeeId: '' }; // gekozen koffie per recept
  const parseNum = s => {
    const m = String(s ?? '').match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  };
  const parseRatioDenom = s => {
    const m = String(s ?? '').match(/1\s*:\s*(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  };
  // Schaal alle gram-waarden in een steptekst mee met de factor
  const scaleGrams = (text, f) => text.replace(/(\d+(?:[.,]\d+)?)(\s*g\b)/g,
    (_, num, suf) => Math.round(parseFloat(num.replace(',', '.')) * f) + suf);

  // ------------------------------------------------
  // Brouw-timer: volgt het tijdsschema van een recept en
  // geeft na afloop een gear-aanbeveling op tijd + gewicht.
  // ------------------------------------------------
  let brewTimer = { id: null, running: false, startTs: 0, elapsed: 0, int: null };
  const parseStepSec = t => {
    const m = String(t ?? '').match(/^(\d+):(\d{2})$/);
    return m ? +m[1] * 60 + +m[2] : null;
  };
  // Richttijd uit r.time: "± 3:30", "25–35 s", "9–12 min totaal"
  function parseTargetSec(time) {
    const s = String(time ?? '');
    let m = s.match(/(\d+)\s*[–-]\s*(\d+)\s*min/);
    if (m) return { lo: +m[1] * 60, hi: +m[2] * 60 };
    m = s.match(/(\d+)\s*[–-]\s*(\d+)\s*s/);
    if (m) return { lo: +m[1], hi: +m[2] };
    m = s.match(/(\d+):(\d{2})/);
    if (m) { const t = +m[1] * 60 + +m[2]; return { lo: t * 0.9, hi: t * 1.1 }; }
    return null;
  }
  const fmtSec = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const timerNow = () =>
    brewTimer.running ? (Date.now() - brewTimer.startTs) / 1000 : brewTimer.elapsed;

  function timerTick(timed, endSec, factor, tTarget, timeLabel) {
    const clock = document.getElementById('t-clock');
    if (!clock) return; // andere weergave actief; timer loopt door
    const now = timerNow();
    clock.textContent = fmtSec(now);
    clock.classList.toggle('over', now > endSec);
    const fill = document.getElementById('t-fill');
    if (fill) fill.style.width = Math.min(100, now / endSec * 100) + '%';
    document.querySelectorAll('.step[data-sec]').forEach(el => {
      const sec = +el.dataset.sec;
      el.classList.toggle('done', now > sec + 8);
      el.classList.toggle('active', now >= sec && now <= sec + 8);
    });
    const nextEl = document.getElementById('t-next');
    if (nextEl) {
      const next = timed.find(s => s.sec > now);
      if (next) {
        const left = Math.ceil(next.sec - now);
        const txt = factor !== 1 ? scaleGrams(next.s, factor) : next.s;
        nextEl.innerHTML = left <= 5
          ? `<strong>NU: ${esc(txt)}</strong>`
          : `Over <strong>${left}s</strong> — ${esc(txt)}`;
        if (left === 1 && navigator.vibrate) navigator.vibrate(200);
      } else if (timed.length) {
        nextEl.textContent = now > endSec ? 'Klaar? Rond af voor advies.' : 'Laatste stap bezig…';
      } else if (tTarget) {
        // Stopwatch-modus (espresso): stuur live op het doelvenster
        if (now < tTarget.lo) {
          nextEl.innerHTML = `Doel ${esc(timeLabel)} — nog <strong>${Math.ceil(tTarget.lo - now)}s</strong>`;
        } else if (now <= tTarget.hi) {
          nextEl.innerHTML = `<strong>IN HET DOELVENSTER</strong> — stop rond ${fmtSec(tTarget.hi)}`;
          if (Math.abs(now - tTarget.lo) < 0.3 && navigator.vibrate) navigator.vibrate(200);
        } else {
          nextEl.innerHTML = `Boven het doelvenster (${esc(timeLabel)}) — stop het shot.`;
        }
      }
    }
  }

  // Advies op basis van gemeten tijd + eindgewicht vs. doel
  // Geeft de adviesregels terug plus de richting voor de maalstand
  function brewAdvice(r, actualSec, actualG, targetG) {
    const t = parseTargetSec(r.time);
    const esp = r.cat === 'espresso';
    const advs = [];
    let dir = null;
    if (t && actualSec) {
      const doel = String(r.time || '').trim(); // leesbare richttijd uit het recept zelf
      if (actualSec > t.hi * 1.05) {
        dir = 'grover';
        advs.push(esp
          ? `Shot te langzaam (${fmtSec(actualSec)} vs. doel ${doel}): maal 1–2 stappen grover.`
          : `Doorlooptijd te lang (${fmtSec(actualSec)} vs. doel ${doel}): maal grover.`);
      } else if (actualSec < t.lo * 0.95) {
        dir = 'fijner';
        advs.push(esp
          ? `Shot te snel (${fmtSec(actualSec)} vs. doel ${doel}): maal 1–2 stappen fijner en check je puck-prep (WDT, tamp).`
          : `Doorlooptijd te kort (${fmtSec(actualSec)} vs. doel ${doel}): maal fijner voor meer extractie.`);
      } else {
        advs.push(`Tijd binnen het doel (${fmtSec(actualSec)} vs. ${doel}) — houd deze maalstand aan.`);
      }
    }
    if (targetG && actualG) {
      const dev = actualG / targetG;
      if (dev > 1.06) {
        advs.push(esp
          ? `Yield te hoog (${actualG} g vs. ${targetG} g): stop het shot eerder — de ratio loopt op en de smaak verdunt.`
          : `Eindgewicht hoger dan gepland (${actualG} g vs. ${targetG} g): weeg je gietingen en stop op het doelgewicht.`);
      } else if (dev < 0.94) {
        advs.push(esp
          ? `Yield te laag (${actualG} g vs. ${targetG} g): laat het shot iets langer lopen, of check op channeling.`
          : `Eindgewicht lager dan gepland (${actualG} g vs. ${targetG} g): giet door tot het doelgewicht.`);
      } else {
        advs.push(`Gewicht op doel (${actualG} g) — goed zo.`);
      }
    }
    if (!advs.length) advs.push('Vul tijd en/of gewicht in voor een advies.');
    return { advs, dir };
  }

  function feedbackModal(r, actualSec, targetG, coffee, grind, gear) {
    openModal('Brouw-feedback', `
      <form id="fb-form">
        <div class="field-row">
          ${formField('Tijd (m:ss)', 'time', fmtSec(actualSec), 'text', 'placeholder="2:45"')}
          ${formField('Eindgewicht (g)', 'grams', '', 'number', `inputmode="decimal" placeholder="${targetG || ''}"`)}
        </div>
        <div id="fb-advies"></div>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Sluiten</button>
          <button type="submit" class="btn">Advies</button>
        </div>
      </form>
      ${grind ? `<div id="fb-update" hidden>
        <div class="subsection">Stand bijwerken</div>
        <div class="notice">${esc(coffee.name)}${gear ? ' op ' + esc(gear.brand + ' ' + gear.model) : ''} — nu ${esc(grind.clicks)} ${isNaN(+grind.clicks) ? '' : 'kliks'}</div>
        <div class="field"><label>Nieuwe stand</label>
          <input id="fb-clicks" type="text" value="${esc(grind.clicks)}"></div>
        <div id="fb-dirhint" class="map-hint"></div>
        <button type="button" class="btn block" id="fb-save">Stand bijwerken</button>
      </div>` : ''}`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      let measured = { time: '', grams: '' };
      modal.querySelector('#fb-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        measured = { time: d.time, grams: d.grams };
        const sec = parseStepSec(d.time) ?? parseNum(d.time);
        const { advs, dir } = brewAdvice(r, sec, parseNum(d.grams), targetG);
        modal.querySelector('#fb-advies').innerHTML =
          advs.map(a => `<div class="notice">→ ${esc(a)}</div>`).join('');
        const upd = modal.querySelector('#fb-update');
        if (!upd) return;
        upd.hidden = false;
        const clicksEl = modal.querySelector('#fb-clicks');
        const hint = modal.querySelector('#fb-dirhint');
        const cur = parseNum(grind.clicks);
        if (dir && cur !== null) {
          clicksEl.value = String(dir === 'grover' ? cur + 1 : cur - 1);
          hint.textContent = `Voorstel: één stap ${dir}. Bij de meeste malers is een hoger getal grover — pas aan als dat bij jouw maler andersom werkt.`;
        } else {
          clicksEl.value = grind.clicks;
          hint.textContent = dir ? `Advies: ${dir} malen.` : 'Tijd zat goed — stand hoeft niet te wijzigen.';
        }
      });
      modal.querySelector('#fb-save')?.addEventListener('click', () => {
        grind.clicks = modal.querySelector('#fb-clicks').value.trim() || grind.clicks;
        if (measured.time) grind.time = measured.time;
        if (measured.grams) grind.yield = measured.grams;
        DB.updateCoffee(coffee); render();
      });
    });
  }


  // ---------- modal ----------
  function openModal(title, bodyHtml, onMount) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-title">${esc(title)}</div>
          ${bodyHtml}
        </div>
      </div>`;
    modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    // Datumvelden: kalender opent bij een tik op het hele veld
    modalRoot.querySelectorAll('input[type=date]').forEach(el => {
      el.addEventListener('click', () => { try { el.showPicker(); } catch {} });
      el.addEventListener('focus', () => { try { el.showPicker(); } catch {} });
    });
    if (onMount) onMount(modalRoot.querySelector('.modal'));
  }
  function closeModal() {
    const v = modalRoot.querySelector('video');
    if (v) Scanner.stop(v);
    modalRoot.innerHTML = '';
  }

  function formField(label, name, value = '', type = 'text', attrs = '') {
    return `<div class="field"><label>${esc(label)}</label>
      <input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
  }
  function formSelect(label, name, options, value = '') {
    return `<div class="field"><label>${esc(label)}</label>
      <select name="${name}">${options.map(o =>
        `<option value="${esc(o.v ?? o)}" ${((o.v ?? o) === value) ? 'selected' : ''}>${esc(o.l ?? o)}</option>`
      ).join('')}</select></div>`;
  }
  function formData(form) {
    const out = {};
    form.querySelectorAll('input, select, textarea').forEach(el => { out[el.name] = el.value.trim(); });
    return out;
  }

  // ---------- router ----------
  let route = { tab: 'coffees', detail: null };
  let lastViewKey = '';

  function go(tab, detail = null) {
    route = { tab, detail };
    render();
  }

  document.querySelectorAll('.tab').forEach(btn =>
    btn.addEventListener('click', () => { drinkSel = null; go(btn.dataset.tab); }));

  function render() {
    document.querySelectorAll('.tab').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === route.tab));
    closeModal();
    if (globeRaf) { cancelAnimationFrame(globeRaf); globeRaf = null; }
    if (route.tab === 'gear') route.detail ? renderGearDetail(route.detail) : renderGearList();
    if (route.tab === 'coffees') route.detail ? renderCoffeeDetail(route.detail) : renderCoffeeList();
    if (route.tab === 'recipes') route.detail ? renderRecipeDetail(route.detail) : renderRecipeList();
    // Alleen terug naar boven bij echte navigatie, niet bij een herteken-actie
    const key = `${route.tab}|${route.detail || ''}|${drinkSel || ''}`;
    if (key !== lastViewKey) { window.scrollTo(0, 0); lastViewKey = key; }
  }

  // ====================================================
  // GEAR
  // ====================================================
  function renderGearList() {
    topbarSub.textContent = 'Uitrusting';
    const card = g => {
      const st = g.retired ? null : gearWorstStatus(g);
      return `
        <div class="card" data-id="${g.id}" ${g.retired ? 'style="opacity:.55"' : ''}>
          <div class="card-row">
            <div>
              <div class="card-title">${esc(g.brand)} ${esc(g.model)}</div>
              <div class="card-sub">${esc(g.type)}${g.since ? ' · sinds ' + fmtDate(g.since) : ''}</div>
            </div>
            ${g.retired
              ? '<span class="badge">niet in gebruik</span>'
              : (st ? `<span class="badge ${st.cls}">${st.cls === 'ok' ? 'Onderhoud OK' : 'Onderhoud'}</span>` : '')}
          </div>
        </div>`;
    };
    const actief = DB.gear.filter(g => !g.retired);
    const archief = DB.gear.filter(g => g.retired);
    const items = actief.map(card).join('') +
      (archief.length ? `<div class="subsection">Niet in gebruik — ${archief.length}</div>${archief.map(card).join('')}` : '');

    view.innerHTML = `
      <div class="section-head">
        <div class="section-title">Uitrusting — ${actief.length}</div>
        <button class="btn small" id="add-gear" aria-label="Uitrusting toevoegen">+</button>
      </div>
      ${items || `${illu('gear')}<div class="empty"><strong>nog geen uitrusting</strong>voeg je machine, maler of ketel toe — de onderhoudsroutines komen er dan vanzelf bij.</div>`}`;

    view.querySelector('#add-gear').addEventListener('click', () => gearForm());
    view.querySelectorAll('.card').forEach(c =>
      c.addEventListener('click', () => go('gear', c.dataset.id)));
  }

  function gearForm(existing = null) {
    const g = existing || {};
    const brandsFor = type => Object.keys(GEAR_BRANDS[type] || {});
    const modelsFor = (type, brand) => (GEAR_BRANDS[type] || {})[brand] || [];
    const opts = (list, sel) => [
      '<option value="">—</option>',
      ...list.map(v => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(v)}</option>`),
      `<option value="__other" ${sel && !list.includes(sel) ? 'selected' : ''}>anders…</option>`,
    ].join('');

    const type0 = g.type || 'Maler';
    const brandKnown = brandsFor(type0).includes(g.brand);
    const modelKnown = brandKnown && modelsFor(type0, g.brand).includes(g.model);

    openModal(existing ? 'Uitrusting bewerken' : 'Uitrusting toevoegen', `
      <form id="gear-form">
        ${formSelect('Type', 'type', GEAR_TYPES, type0)}
        <div class="field"><label>Merk</label>
          <select name="brandSel">${opts(brandsFor(type0), g.brand)}</select></div>
        <div class="field" id="brand-other" ${g.brand && !brandKnown ? '' : 'hidden'}>
          <label>Merk (eigen invoer)</label>
          <input name="brandOther" type="text" value="${g.brand && !brandKnown ? esc(g.brand) : ''}" placeholder="Bijv. Olympia">
        </div>
        <div class="field"><label>Model</label>
          <select name="modelSel">${opts(modelsFor(type0, g.brand), g.model)}</select></div>
        <div class="field" id="model-other" ${g.model && !modelKnown ? '' : 'hidden'}>
          <label>Model (eigen invoer)</label>
          <input name="modelOther" type="text" value="${g.model && !modelKnown ? esc(g.model) : ''}" placeholder="Bijv. Cremina">
        </div>
        ${formField('In gebruik sinds', 'since', g.since || '', 'date')}
        <div class="field"><label>Notities</label><textarea name="notes">${esc(g.notes || '')}</textarea></div>
        ${existing ? '' : `<div class="subsection">aanbevolen onderhoud</div>
        <div id="rec-list">${recCheckList(MAINT_REC[type0] || [], 'rec_')}</div>`}
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      const typeSel = modal.querySelector('[name=type]');
      const brandSel = modal.querySelector('[name=brandSel]');
      const modelSel = modal.querySelector('[name=modelSel]');
      const brandOther = modal.querySelector('#brand-other');
      const modelOther = modal.querySelector('#model-other');
      const syncModels = () => {
        const known = brandSel.value && brandSel.value !== '__other';
        modelSel.innerHTML = opts(known ? modelsFor(typeSel.value, brandSel.value) : [], '');
        modelOther.hidden = true;
      };
      const recList = modal.querySelector('#rec-list');
      typeSel.addEventListener('change', () => {
        brandSel.innerHTML = opts(brandsFor(typeSel.value), '');
        brandOther.hidden = true;
        syncModels();
        if (recList) recList.innerHTML = recCheckList(MAINT_REC[typeSel.value] || [], 'rec_');
      });
      brandSel.addEventListener('change', () => {
        brandOther.hidden = brandSel.value !== '__other';
        syncModels();
        if (!brandOther.hidden) brandOther.querySelector('input').focus();
      });
      modelSel.addEventListener('change', () => {
        modelOther.hidden = modelSel.value !== '__other';
        if (!modelOther.hidden) modelOther.querySelector('input').focus();
      });
      modal.querySelector('#gear-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        const data = {
          type: d.type,
          brand: d.brandSel === '__other' ? (d.brandOther || '') : d.brandSel,
          model: d.modelSel === '__other' ? (d.modelOther || '') : d.modelSel,
          since: d.since,
          notes: d.notes,
        };
        if (!data.brand || !data.model) {
          (data.brand ? modelSel : brandSel).focus();
          return;
        }
        if (existing) DB.updateGear({ ...existing, ...data });
        else {
          const tasks = pickedTasks(e.target, 'rec_', () => DB.uid());
          DB.addGear({ ...data, tasks });
        }
        render();
      });
    });
  }

  function renderGearDetail(id) {
    const g = DB.findGear(id);
    if (!g) return go('gear');
    topbarSub.textContent = 'Uitrusting';

    const log = gearLog(g);
    const gr = grindsOnGear(g);
    const tasks = g.tasks.map(t => {
      const st = taskStatus(t);
      return `
        <div class="task ${st.cls}">
          <div>
            <div class="task-name">${esc(t.name)}</div>
            <div class="task-meta">Elke ${t.intervalDays} d · laatst: ${fmtDate(lastDoneOf(t))} · <strong>${st.label}</strong></div>
          </div>
          <div class="task-actions">
            <button class="btn small" data-done="${t.id}">Gedaan</button>
            <button class="btn small ghost" data-del-task="${t.id}">✕</button>
          </div>
        </div>`;
    }).join('');

    view.innerHTML = `
      <button class="back" id="back">← Terug</button>
      <div class="detail-head">
        <div class="detail-title">${esc(g.brand)} ${esc(g.model)}</div>
        <div class="detail-sub">${esc(g.type)}${g.since ? ' · in gebruik sinds ' + fmtDate(g.since) : ''}</div>
      </div>
      ${g.notes ? `<div class="notice">${esc(g.notes)}</div>` : ''}
      <div class="subsection">Onderhoud <button class="btn small" id="add-task" aria-label="Routine toevoegen">+</button></div>
      ${tasks || `<div class="empty">Geen onderhoudsroutines. Denk aan backflushen, ontkalken, burrs reinigen.</div>`}
      ${(MAINT_REC[g.type] || []).some(t => !(g.tasks || []).some(x => x.name === t.n))
        ? `<button class="btn ghost block" id="add-rec">Aanbevolen routines toevoegen (${(MAINT_REC[g.type] || []).filter(t => !(g.tasks || []).some(x => x.name === t.n)).length})</button>` : ''}
      ${gr.length ? `<div class="subsection">Maalstanden — ${gr.length}</div>
        ${gr.map(x => `<div class="card" data-coffee="${x.coffeeId}"><div class="card-row"><div>
          <div class="card-title" style="font-size:17px">${esc(x.coffeeName)}</div>
          <div class="card-sub">${esc(x.method)}${x.dose ? ' · ' + esc(x.dose) + ' g' : ''}${x.time ? ' · ' + esc(x.time) : ''}</div>
        </div><span class="badge accent">${esc(x.clicks)}</span></div></div>`).join('')}` : ''}
      ${log.length ? `<div class="subsection">Onderhoudslog — ${log.length}</div>
        ${log.map(e => `<div class="task"><div>
          <div class="task-name">${esc(e.task)}</div>
          <div class="task-meta">${fmtDate(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div>
        </div><div class="task-actions">
          <button class="btn small ghost" data-del-log="${e.taskId}|${e.id}" aria-label="Logregel verwijderen">✕</button>
        </div></div>`).join('')}` : ''}
      <div class="btn-row">
        <button class="btn ghost" id="edit">Bewerken</button>
        <button class="btn ghost" id="retire">${g.retired ? 'Weer in gebruik' : 'Niet in gebruik'}</button>
        <button class="btn danger" id="del">Verwijderen</button>
      </div>`;

    view.querySelector('#back').addEventListener('click', () => go('gear'));
    view.querySelector('#edit').addEventListener('click', () => gearForm(g));
    view.querySelector('#retire').addEventListener('click', () => {
      g.retired = !g.retired;
      DB.updateGear(g); render();
    });
    view.querySelector('#del').addEventListener('click', () => {
      if (confirm(`${g.brand} ${g.model} verwijderen?`)) { DB.removeGear(g.id); go('gear'); }
    });
    view.querySelector('#add-task').addEventListener('click', () => taskForm(g));
    view.querySelector('#add-rec')?.addEventListener('click', () => recForm(g));
    view.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', () =>
      logForm(g, g.tasks.find(x => x.id === b.dataset.done))));
    view.querySelectorAll('[data-coffee]').forEach(el =>
      el.addEventListener('click', () => go('coffees', el.dataset.coffee)));
    view.querySelectorAll('[data-del-log]').forEach(b => b.addEventListener('click', () => {
      const [taskId, entryId] = b.dataset.delLog.split('|');
      const t = g.tasks.find(x => x.id === taskId);
      if (t) t.log = (t.log || []).filter(e => e.id !== entryId);
      DB.updateGear(g); render();
    }));
    view.querySelectorAll('[data-del-task]').forEach(b => b.addEventListener('click', () => {
      g.tasks = g.tasks.filter(x => x.id !== b.dataset.delTask);
      DB.updateGear(g); render();
    }));
  }

  function logForm(g, task) {
    openModal('Onderhoud loggen', `
      <form id="log-form">
        <div class="notice">${esc(task.name)} — elke ${task.intervalDays} dagen</div>
        ${formField('Datum', 'date', new Date().toISOString().slice(0, 10), 'date', 'required')}
        ${formField('Notitie', 'note', '', 'text', 'placeholder="Nieuwe dichting, burrs zagen er goed uit"')}
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Vastleggen</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      modal.querySelector('#log-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        task.log = task.log || [];
        task.log.push({ id: DB.uid(), date: d.date, note: d.note || '' });
        DB.updateGear(g); render();
      });
    });
  }

  function recForm(g) {
    const missing = (MAINT_REC[g.type] || []).filter(t => !(g.tasks || []).some(x => x.name === t.n));
    openModal('Aanbevolen onderhoud', `
      <form id="rec-form">
        <div class="notice">Kies wat je wilt bijhouden voor deze ${esc(g.type.toLowerCase())}.</div>
        ${recCheckList(missing, 'rec_')}
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Toevoegen</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      modal.querySelector('#rec-form').addEventListener('submit', e => {
        e.preventDefault();
        g.tasks = [...(g.tasks || []), ...pickedTasks(e.target, 'rec_', () => DB.uid())];
        DB.updateGear(g); render();
      });
    });
  }

  function taskForm(g) {
    openModal('Onderhoudsroutine', `
      <form id="task-form">
        ${formField('Naam', 'name', '', 'text', 'required placeholder="Backflush met schoonmaakmiddel"')}
        ${formField('Interval (dagen)', 'intervalDays', '30', 'number', 'required min="1"')}
        ${formField('Laatst gedaan', 'lastDone', '', 'date')}
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      modal.querySelector('#task-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        g.tasks.push({ id: DB.uid(), name: d.name, intervalDays: +d.intervalDays,
          log: d.lastDone ? [{ id: DB.uid(), date: d.lastDone, note: '' }] : [] });
        DB.updateGear(g); render();
      });
    });
  }

  // ====================================================
  // COFFEES
  // ====================================================
  function renderCoffeeList() {
    topbarSub.textContent = 'Koffielog';
    const chips = [{ v: 'lijst', l: 'Lijst' }, { v: 'kaart', l: 'Kaart' }].map(c =>
      `<button class="chip ${coffeeView === c.v ? 'active' : ''}" data-view="${c.v}">${c.l}</button>`).join('');
    const body = coffeeView === 'kaart' ? coffeeMapHtml() : DB.coffees.map(c => `
      <div class="card" data-id="${c.id}">
        <div class="card-row">
          <div>
            <div class="card-title">${esc(c.name)}</div>
            <div class="card-sub">${esc(c.roaster)}${c.origin ? ' · ' + esc(c.origin) : ''}</div>
            ${c.rating ? `<div style="margin-top:4px">${starsHtml(c.rating)}</div>` : ''}
          </div>
          ${c.process ? `<span class="badge">${esc(c.process)}</span>` : ''}
        </div>
      </div>`).join('');

    view.innerHTML = `
      <div class="section-head">
        <div class="section-title">Koffies — ${DB.coffees.length}</div>
        <div style="display:flex;gap:6px">
          <button class="btn small ghost" id="scan">Scan</button>
          <button class="btn small" id="add-coffee" aria-label="Koffie toevoegen">+</button>
        </div>
      </div>
      <div class="chips">${chips}</div>
      ${body || `${illu('coffee')}<div class="empty"><strong>nog geen koffies</strong>scan een barcode of voeg er een met de hand toe.</div>`}`;

    view.querySelectorAll('[data-view]').forEach(ch => ch.addEventListener('click', () => {
      coffeeView = ch.dataset.view; mapSelection = null; render();
    }));
    view.querySelector('#add-coffee').addEventListener('click', () => coffeeForm());
    view.querySelector('#scan').addEventListener('click', scanFlow);
    view.querySelectorAll('.card[data-id]').forEach(c =>
      c.addEventListener('click', () => go('coffees', c.dataset.id)));
    if (coffeeView === 'kaart') initGlobe();
  }

  function coffeeGroups() {
    const groups = new Map();
    const unplaced = [];
    DB.coffees.forEach(c => {
      const spot = originSpot(c.origin);
      if (!spot) { unplaced.push(c); return; }
      if (!groups.has(spot.key)) groups.set(spot.key, { coord: spot.coord, coffees: [] });
      groups.get(spot.key).coffees.push(c);
    });
    return { groups, unplaced };
  }

  function coffeeMapHtml() {
    const { groups, unplaced } = coffeeGroups();
    const sel = mapSelection && groups.get(mapSelection);
    const selPanel = sel ? sel.coffees.map(c => `
      <div class="card" data-id="${c.id}"><div class="card-row"><div>
        <div class="card-title" style="font-size:15px">${esc(c.name)}</div>
        <div class="card-sub">${esc(c.roaster)}${c.origin ? ' · ' + esc(c.origin) : ''}</div>
        ${c.rating ? `<div style="margin-top:4px">${starsHtml(c.rating)}</div>` : ''}
        </div>${c.process ? `<span class="badge">${esc(c.process)}</span>` : ''}</div></div>`).join('') : '';
    return `
      <div class="map-wrap"><canvas id="globe" aria-label="Draaibare wereldbol met koffie-origines" role="img"></canvas></div>
      ${groups.size === 0 ? `<div class="empty">Geen koffies met een herkende origine. Vul bij een koffie het land in (bijv. "Colombia, Huila").</div>` : ''}
      ${sel ? `<div class="map-hint">${esc(mapSelection)} — ${sel.coffees.length}</div>${selPanel}` : (groups.size ? `<div class="map-hint">Sleep om te draaien · tik een punt</div>` : '')}
      ${unplaced.length ? `<div class="notice">Niet op de kaart (origine niet herkend): ${unplaced.map(c => esc(c.name)).join(', ')}</div>` : ''}`;
  }

  // ------------------------------------------------
  // Draaibare aardbol (orthografische projectie op canvas)
  // ------------------------------------------------
  let globeRaf = null;

  function initGlobe() {
    const canvas = view.querySelector('#globe');
    if (!canvas) return;
    if (globeRaf) cancelAnimationFrame(globeRaf);

    const { groups } = coffeeGroups();
    const wrapW = canvas.parentElement.clientWidth - 16;
    const size = Math.min(wrapW, 440);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(document.documentElement);
    const tok = n => css.getPropertyValue(n).trim();
    const C = {
      accent: tok('--accent'), landDot: tok('--text-dim'), line: tok('--line'),
      hi: tok('--globe-hi'), lo: tok('--globe-lo'),
      ink: tok('--accent-ink'), faint: tok('--text-faint'),
    };

    const cx = size * 0.56, cy = size / 2, R = size * 0.42; // iets naar rechts: ruimte voor het belt-label
    const D2R = Math.PI / 180;
    let rot = -60, tilt = 16;          // startpositie: Amerika's in beeld
    let dragging = false, moved = false, lastX = 0, lastY = 0;
    let idleSince = 0;
    let dotHits = [];                   // [{x, y, key}]
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Projectie: [x, y, zichtbaar]
    function proj(lon, lat) {
      const λ = (lon - rot) * D2R, φ = lat * D2R, φ0 = tilt * D2R;
      const cosφ = Math.cos(φ);
      const front = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * cosφ * Math.cos(λ);
      return [
        cx + R * cosφ * Math.sin(λ),
        cy - R * (Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * cosφ * Math.cos(λ)),
        front > 0,
      ];
    }

    function strokeRuns(pts, close) {
      // Teken alleen de zichtbare stukken van een lijn/omtrek
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          ctx.beginPath();
          run.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
          if (close && run.length === pts.length) ctx.closePath();
          ctx.stroke();
          if (close) ctx.fill();
        }
        run = [];
      };
      pts.forEach(([lo, la]) => {
        const [x, y, v] = proj(lo, la);
        if (v) run.push([x, y]); else flush();
      });
      flush();
    }

    function draw() {
      ctx.clearRect(0, 0, size, size);

      // Bol met randschaduw
      const grad = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .2, cx, cy, R);
      grad.addColorStop(0, C.hi);
      grad.addColorStop(.8, C.lo);
      grad.addColorStop(1, C.lo);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

      // Graticule
      ctx.strokeStyle = C.line; ctx.lineWidth = .5;
      for (let m = -180; m < 180; m += 30) {
        const pts = []; for (let la = -85; la <= 85; la += 5) pts.push([m, la]);
        strokeRuns(pts, false);
      }
      for (const la of [-60, -30, 0, 30, 60]) {
        const pts = []; for (let lo = -180; lo <= 180; lo += 5) pts.push([lo, la]);
        strokeRuns(pts, false);
      }

      // Coffee belt: gevulde band tussen de keerkringen
      ctx.beginPath();
      let started = false;
      for (let lo = rot - 90; lo <= rot + 90; lo += 3) {
        const [x, y] = proj(lo, 23.5);
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true;
      }
      for (let lo = rot + 90; lo >= rot - 90; lo -= 3) {
        const [x, y] = proj(lo, -23.5);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = C.accent + '22'; ctx.fill();
      ctx.strokeStyle = C.accent + '88'; ctx.lineWidth = .8;
      ctx.setLineDash([3, 5]);
      for (const la of [23.5, -23.5]) {
        const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la]);
        strokeRuns(pts, false);
      }
      ctx.setLineDash([]);

      // Continenten als dot-matrix (Shopify-stijl)
      ctx.fillStyle = C.landDot;
      const dotR = Math.max(1.1, size / 300);
      for (let i = 0; i < LAND_DOTS.length; i += 2) {
        const [x, y, v] = proj(LAND_DOTS[i] / 10, LAND_DOTS[i + 1] / 10);
        if (!v) continue;
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, 7); ctx.fill();
      }

      // "The Coffee Belt": label linksboven, buiten de bol, met een
      // aanwijslijn die schuin naar de linkerrand van de band buigt.
      const [, beltTopY] = proj(rot, 23.5);
      const [, beltBotY] = proj(rot, -23.5);
      const labelY = (beltTopY + beltBotY) / 2;
      const edgeDy = labelY - cy;
      const edgeDx = Math.sqrt(Math.max(0, R * R - edgeDy * edgeDy)); // punt op de bolrand
      const textY = size * 0.085;
      ctx.save();
      ctx.fillStyle = C.faint;
      ctx.font = '400 9px Fraunces, Georgia, serif';
      ctx.letterSpacing = '2px';
      ctx.textBaseline = 'bottom';
      ctx.fillText('the coffee belt', 3, textY);
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = C.accent + 'AA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, textY + 5);
      ctx.quadraticCurveTo(6, labelY, cx - edgeDx - 2, labelY);
      ctx.stroke();
      ctx.restore();

      // Koffie-punten
      dotHits = [];
      groups.forEach((g, key) => {
        const [x, y, v] = proj(...g.coord);
        if (!v) return;
        const n = g.coffees.length;
        const r = n > 1 ? 10 : 6;
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7);
        ctx.strokeStyle = C.accent + '66'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
        ctx.fillStyle = C.accent; ctx.fill();
        if (n > 1) {
          ctx.fillStyle = C.ink;
          ctx.font = '700 11px Fraunces, Georgia, serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(n, x, y);
          ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
        }
        dotHits.push({ x, y, key });
      });

      canvas.dataset.dots = dotHits.length; // t.b.v. tests
    }

    function frame(t) {
      if (!dragging && !reduceMotion && t - idleSince > 2500) rot += 0.12;
      draw();
      globeRaf = requestAnimationFrame(frame);
    }

    canvas.addEventListener('pointerdown', e => {
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      rot += dx * 0.45;
      // Met een vinger alleen draaien; verticaal blijft scrollen van de pagina
      if (e.pointerType !== 'touch') tilt = Math.max(-40, Math.min(55, tilt + dy * 0.3));
      lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener('pointerup', e => {
      dragging = false; idleSince = performance.now();
      if (!moved) {
        const rect = canvas.getBoundingClientRect();
        const px_ = e.clientX - rect.left, py_ = e.clientY - rect.top;
        const hit = dotHits.find(d => Math.hypot(d.x - px_, d.y - py_) < 16);
        if (hit) { mapSelection = hit.key; render(); }
      }
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; idleSince = performance.now(); });

    idleSince = performance.now();
    draw(); // eerste frame direct, ook als RAF nog niet vuurt
    globeRaf = requestAnimationFrame(frame);
  }

  function scanFlow() {
    const camHtml = Scanner.supported ? `
      <div class="scanner-wrap">
        <video playsinline muted></video>
        <div class="scanner-line"></div>
      </div>
      <div class="scanner-hint">Richt de camera op de barcode</div>
      <div class="divider-or">of handmatig</div>` :
      `<div class="notice">Barcode-scannen wordt door deze browser niet ondersteund (o.a. iOS Safari). Voer de EAN handmatig in.</div>`;

    openModal('Barcode scannen', `
      ${camHtml}
      <form id="ean-form">
        ${formField('EAN / barcode', 'ean', '', 'text', 'inputmode="numeric" placeholder="8712345678901" required')}
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Zoek</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);

      const handleEan = async ean => {
        const known = DB.findByEan(ean);
        if (known) { go('coffees', known.id); return; }
        // Onbekend: probeer Open Food Facts voor naam/merk, dan formulier
        const hint = await Scanner.lookup(ean);
        coffeeForm(null, { ean, name: hint?.name || '', roaster: hint?.brand || '' });
      };

      modal.querySelector('#ean-form').addEventListener('submit', e => {
        e.preventDefault();
        handleEan(formData(e.target).ean);
      });

      const videoEl = modal.querySelector('video');
      if (videoEl) {
        Scanner.start(videoEl, handleEan).catch(() => {
          modal.querySelector('.scanner-wrap').outerHTML =
            `<div class="notice">Geen cameratoegang. Voer de EAN handmatig in.</div>`;
        });
      }
    });
  }

  function coffeeForm(existing = null, prefill = {}) {
    const c = existing || prefill;
    openModal(existing ? 'Koffie bewerken' : 'Nieuwe koffie', `
      <form id="coffee-form">
        ${formField('Naam', 'name', c.name || '', 'text', 'required placeholder="Finca El Paraíso"')}
        ${formField('Brander', 'roaster', c.roaster || '', 'text', 'placeholder="Friedhats"')}
        <div class="field-row">
          ${formField('Origine', 'origin', c.origin || '', 'text', 'placeholder="Colombia, Huila"')}
          <div class="field"><label>Variëteit</label>
            <select name="varietySel">
              <option value="">—</option>
              ${VARIETIES.map(v => `<option value="${esc(v)}" ${c.variety === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
              <option value="__other" ${c.variety && !VARIETIES.includes(c.variety) ? 'selected' : ''}>Overig…</option>
            </select></div>
        </div>
        <div class="field" id="variety-other" ${c.variety && !VARIETIES.includes(c.variety) ? '' : 'hidden'}>
          <label>Variëteit (eigen invoer)</label>
          <input name="varietyOther" type="text" value="${c.variety && !VARIETIES.includes(c.variety) ? esc(c.variety) : ''}" placeholder="Bijv. Chiroso">
        </div>
        <div class="field-row">
          ${formSelect('Proces / fermentatie', 'process', ['', 'Washed', 'Natural', 'Honey', 'Anaerobic', 'Carbonic maceration', 'Thermal shock', 'Co-ferment', 'Wet-hulled', 'Decaf', 'Anders'], c.process || '')}
          ${formSelect('Branding', 'roastLevel', ['', 'Licht', 'Licht-medium', 'Medium', 'Medium-donker', 'Donker'], c.roastLevel || '')}
        </div>
        ${existing ? formField('EAN', 'ean', c.ean || '', 'text', 'inputmode="numeric"') : `<div class="field-row">
          ${formField('Roast date', 'roastDate', c.roastDate || '', 'date')}
          ${formField('EAN', 'ean', c.ean || '', 'text', 'inputmode="numeric"')}
        </div>`}
        ${formField('Smaaknotities', 'tastingNotes', c.tastingNotes || '', 'text', 'placeholder="Rood fruit, jasmijn, honing"')}
        <div class="field"><label>Notities</label><textarea name="notes">${esc(c.notes || '')}</textarea></div>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      const varSel = modal.querySelector('[name=varietySel]');
      const varOther = modal.querySelector('#variety-other');
      varSel.addEventListener('change', () => {
        varOther.hidden = varSel.value !== '__other';
        if (!varOther.hidden) varOther.querySelector('input').focus();
      });
      modal.querySelector('#coffee-form').addEventListener('submit', e => {
        e.preventDefault();
        const data = formData(e.target);
        data.variety = data.varietySel === '__other' ? (data.varietyOther || '') : data.varietySel;
        delete data.varietySel; delete data.varietyOther;
        if (existing) { DB.updateCoffee({ ...existing, ...data }); render(); }
        else {
          data.batches = data.roastDate ? [{ id: DB.uid(), roastDate: data.roastDate }] : [];
          const saved = DB.addCoffee(data);
          go('coffees', saved.id);
        }
      });
    });
  }

  function renderCoffeeDetail(id) {
    const c = DB.findCoffee(id);
    if (!c) return go('coffees');
    topbarSub.textContent = 'Koffie';

    const batches = coffeeBatches(c);
    const specs = [
      ['Origine', c.origin], ['Variëteit', c.variety],
      ['Proces', c.process], ['Branding', c.roastLevel],
      ['Laatste roast', batches[0] ? fmtDate(batches[0].roastDate) : ''], ['EAN', c.ean],
    ].filter(([, v]) => v);

    const grinds = (c.grinds || []).map(gr => {
      const gear = DB.findGear(gr.gearId);
      return `
        <div class="card" data-grind="${gr.id}">
          <div class="card-row">
            <div>
              <div class="card-title" style="font-size:15px">${gear ? esc(gear.brand + ' ' + gear.model) : 'Verwijderde maler'}</div>
              <div class="card-sub">${esc(gr.method)}</div>
            </div>
            <span class="badge accent">${esc(gr.clicks)} kliks</span>
          </div>
          <div class="specs">
            ${gr.dose ? `<div class="spec"><span class="spec-k">Dosis</span><span class="spec-v">${esc(gr.dose)}<span class="unit"> g</span></span></div>` : ''}
            ${gr.yield ? `<div class="spec"><span class="spec-k">Yield / water</span><span class="spec-v">${esc(gr.yield)}<span class="unit"> g</span></span></div>` : ''}
            ${gr.time ? `<div class="spec"><span class="spec-k">Tijd</span><span class="spec-v">${esc(gr.time)}</span></div>` : ''}
            ${gr.temp ? `<div class="spec"><span class="spec-k">Temp</span><span class="spec-v">${esc(gr.temp)}<span class="unit"> °C</span></span></div>` : ''}
          </div>
          ${gr.rating ? `<div style="margin-top:8px" class="stars">${'★'.repeat(+gr.rating)}<span class="off">${'★'.repeat(5 - +gr.rating)}</span></div>` : ''}
          ${gr.notes ? `<div class="card-sub" style="margin-top:6px">${esc(gr.notes)}</div>` : ''}
        </div>`;
    }).join('');

    view.innerHTML = `
      <button class="back" id="back">← Terug</button>
      <div class="detail-head">
        <div class="detail-title">${esc(c.name)}</div>
        <div class="detail-sub">${esc(c.roaster || '')}</div>
        <div class="rate-row" role="radiogroup" aria-label="Beoordeling">
          ${[1, 2, 3, 4, 5].map(n =>
            `<button class="rate-star ${c.rating >= n ? 'on' : ''}" data-rate="${n}" aria-label="${n} sterren">★</button>`).join('')}
        </div>
      </div>
      ${c.tastingNotes ? `<div class="notice">☕ ${esc(c.tastingNotes)}</div>` : ''}
      ${specs.length ? `<div class="card" style="cursor:default"><div class="specs" style="border-top:none;padding-top:0;margin-top:0">
        ${specs.map(([k, v]) => `<div class="spec"><span class="spec-k">${k}</span><span class="spec-v">${esc(v)}</span></div>`).join('')}
      </div></div>` : ''}
      ${c.notes ? `<div class="notice">${esc(c.notes)}</div>` : ''}
      <div class="subsection">Roast dates <button class="btn small" id="add-batch" aria-label="Roast date toevoegen">+</button></div>
      ${batches.length ? batches.map(b => {
        const st = batchStatus(b.roastDate);
        return `<div class="task ${st.cls}"><div>
          <div class="task-name">${fmtDate(b.roastDate)} · ${st.age} d oud</div>
          <div class="task-meta">Filter vanaf ${fmtDate(addDays(b.roastDate, REST_FILTER))} · espresso vanaf ${fmtDate(addDays(b.roastDate, REST_ESPRESSO))}</div>
          <div class="task-meta">Beste t/m ${fmtDate(addDays(b.roastDate, PEAK_END))} · uiterlijk ${fmtDate(addDays(b.roastDate, EXPIRY))}</div>
          ${b.note ? `<div class="task-meta">${esc(b.note)}</div>` : ''}
        </div>
        <div class="task-actions">
          <span class="badge ${st.cls}">${st.label}</span>
          <button class="btn small ghost" data-del-batch="${b.id}" aria-label="Batch verwijderen">✕</button>
        </div></div>`;
      }).join('') : `<div class="empty">Nog geen roast date. Voeg er een toe voor het drinkvenster.</div>`}
      <div class="subsection">Maalstanden &amp; recepten <button class="btn small" id="add-grind" aria-label="Maalstand toevoegen">+</button></div>
      ${grinds || `<div class="empty">Nog geen maalstanden voor deze koffie.</div>`}
      <div class="btn-row">
        <button class="btn ghost" id="edit">Bewerken</button>
        <button class="btn danger" id="del">Verwijderen</button>
      </div>`;

    view.querySelector('#back').addEventListener('click', () => go('coffees'));
    view.querySelectorAll('[data-rate]').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.rate;
      c.rating = (c.rating === n) ? null : n; // nogmaals tikken = rating wissen
      DB.updateCoffee(c); render();
    }));
    view.querySelector('#edit').addEventListener('click', () => coffeeForm(c));
    view.querySelector('#del').addEventListener('click', () => {
      if (confirm(`${c.name} verwijderen?`)) { DB.removeCoffee(c.id); go('coffees'); }
    });
    view.querySelector('#add-batch').addEventListener('click', () => batchForm(c));
    view.querySelectorAll('[data-del-batch]').forEach(b => b.addEventListener('click', () => {
      c.batches = (c.batches || []).filter(x => x.id !== b.dataset.delBatch);
      DB.updateCoffee(c); render();
    }));
    view.querySelector('#add-grind').addEventListener('click', () => grindForm(c));
    view.querySelectorAll('[data-grind]').forEach(el => el.addEventListener('click', () => {
      const gr = c.grinds.find(x => x.id === el.dataset.grind);
      grindForm(c, gr);
    }));
  }

  function batchForm(c) {
    openModal('Roast date toevoegen', `
      <form id="batch-form">
        ${formField('Brandatum', 'roastDate', new Date().toISOString().slice(0, 10), 'date', 'required')}
        ${formField('Notitie', 'note', '', 'text', 'placeholder="250 g zak, tweede keer besteld"')}
        <div class="notice">Filter kan doorgaans vanaf ${REST_FILTER} dagen, espresso vanaf ${REST_ESPRESSO}. Beste venster t/m ± ${PEAK_END} dagen, uiterlijk ± ${EXPIRY} dagen na branden.</div>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      modal.querySelector('#batch-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        c.batches = c.batches || [];
        c.batches.push({ id: DB.uid(), roastDate: d.roastDate, note: d.note || '' });
        DB.updateCoffee(c); render();
      });
    });
  }

  function grindForm(c, existing = null) {
    const grinders = DB.gear;
    if (!grinders.length) {
      openModal('Nog geen uitrusting', `
        <p style="margin-bottom:14px;color:var(--text-dim)">Voeg eerst een maler of machine toe onder Uitrusting.</p>
        <button class="btn block" id="cancel">OK</button>`, m =>
        m.querySelector('#cancel').addEventListener('click', closeModal));
      return;
    }
    const gr = existing || {};
    openModal(existing ? 'Instelling bewerken' : 'Maalstand toevoegen', `
      <form id="grind-form">
        ${formSelect('Apparaat', 'gearId', grinders.map(g => ({ v: g.id, l: `${g.brand} ${g.model}` })), gr.gearId || grinders[0].id)}
        ${formSelect('Methode', 'method', ['Espresso', 'Pour-over (V60)', 'AeroPress', 'French press', 'Moka pot', 'Cold brew', 'Batch brew', 'Anders'], gr.method || 'Espresso')}
        <div class="field-row">
          ${formField('Kliks / stand', 'clicks', gr.clicks || '', 'text', 'required placeholder="18"')}
          ${formField('Dosis (g)', 'dose', gr.dose || '', 'text', 'inputmode="decimal" placeholder="18"')}
        </div>
        <div class="field-row">
          ${formField('Yield / water (g)', 'yield', gr.yield || '', 'text', 'inputmode="decimal" placeholder="36"')}
          ${formField('Tijd', 'time', gr.time || '', 'text', 'placeholder="0:28"')}
        </div>
        ${formField('Watertemp (°C)', 'temp', gr.temp || '', 'text', 'inputmode="decimal" placeholder="94"')}
        ${formSelect('Beoordeling', 'rating', ['', { v: '1', l: '★' }, { v: '2', l: '★★' }, { v: '3', l: '★★★' }, { v: '4', l: '★★★★' }, { v: '5', l: '★★★★★' }], gr.rating || '')}
        <div class="field"><label>Recept-aanpassingen / notities</label><textarea name="notes" placeholder="Iets fijner dan standaard, langere pre-infusie">${esc(gr.notes || '')}</textarea></div>
        <div class="btn-row">
          ${existing ? '<button type="button" class="btn danger" id="del-grind">✕</button>' : ''}
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      if (existing) modal.querySelector('#del-grind').addEventListener('click', () => {
        c.grinds = c.grinds.filter(x => x.id !== existing.id);
        DB.updateCoffee(c); render();
      });
      modal.querySelector('#grind-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        if (existing) Object.assign(existing, d);
        else c.grinds.push({ id: DB.uid(), ...d });
        DB.updateCoffee(c); render();
      });
    });
  }

  // ====================================================
  // RECIPES
  // ====================================================
  function renderRecipeList() {
    topbarSub.textContent = 'Recepten';
    const filtered = recipeFilter === 'alle'
      ? DB.recipes
      : DB.recipes.filter(r => r.cat === recipeFilter);

    // Groepeer per drank; varianten (bronnen/stijlen) zitten eronder
    const drinkMap = new Map();
    filtered.forEach(r => {
      const d = drinkOf(r);
      if (!drinkMap.has(d)) drinkMap.set(d, []);
      drinkMap.get(d).push(r);
    });

    // Variantenweergave voor één drank
    if (drinkSel && drinkMap.has(drinkSel)) {
      const variants = drinkMap.get(drinkSel);
      view.innerHTML = `
        <button class="back" id="back-drink">← Alle recepten</button>
        <div class="detail-head">
          <div class="detail-title">${esc(drinkSel)}</div>
          <div class="detail-sub">Kies een stijl</div>
        </div>
        ${variants.map(r => `
          <div class="card" data-id="${r.id}"><div class="card-row"><div>
            <div class="card-title" style="font-size:15px">${esc(r.source)}</div>
            <div class="card-sub">${r.title !== drinkSel ? esc(r.title) + ' · ' : ''}${esc(r.method)}</div>
            </div><span class="badge accent">Recept</span></div></div>`).join('')}`;
      view.querySelector('#back-drink').addEventListener('click', () => { drinkSel = null; render(); });
      view.querySelectorAll('.card[data-id]').forEach(c =>
        c.addEventListener('click', () => go('recipes', c.dataset.id)));
      return;
    }
    drinkSel = null;

    const chips = [{ v: 'alle', l: 'Alle' }, ...RECIPE_CATS].map(c =>
      `<button class="chip ${recipeFilter === c.v ? 'active' : ''}" data-cat="${c.v}">${c.l}</button>`).join('');
    const drinks = [...drinkMap.entries()];
    const card = ([d, rs]) => `
      <div class="card" data-drink="${esc(d)}"><div class="card-row"><div>
        <div class="card-title">${esc(d)}</div>
        <div class="card-sub">${esc(rs[0].method)}</div>
        </div></div></div>`;
    // Top 5 tonen; nummer 6 half zichtbaar met "Bekijk meer"
    const clamped = !recipesExpanded && drinks.length > 5;
    const items = clamped
      ? drinks.slice(0, 5).map(card).join('') +
        `<div class="peek">${card(drinks[5])}</div>
         <button class="btn ghost block show-more" id="show-more">Bekijk meer (${drinks.length - 5})</button>`
      : drinks.map(card).join('') +
        (recipesExpanded && drinks.length > 5
          ? `<button class="btn ghost block show-more" id="show-less">Toon minder</button>` : '');

    view.innerHTML = `
      <div class="section-head">
        <div class="section-title">Recepten — ${drinks.length}</div>
        <button class="btn small" id="add-recipe" aria-label="Recept toevoegen">+</button>
      </div>
      <div class="chips">${chips}</div>
      ${items || `${illu('recipes')}<div class="empty"><strong>niets in deze categorie</strong>kies een andere, of leg je eigen recept vast.</div>`}`;

    view.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      recipeFilter = ch.dataset.cat;
      recipesExpanded = false;
      drinkSel = null;
      render();
    }));
    view.querySelector('#show-more')?.addEventListener('click', () => { recipesExpanded = true; render(); });
    view.querySelector('#show-less')?.addEventListener('click', () => { recipesExpanded = false; render(); });
    view.querySelector('#add-recipe').addEventListener('click', () => recipeForm());
    view.querySelectorAll('.card[data-drink]').forEach(c => c.addEventListener('click', () => {
      const rs = drinkMap.get(c.dataset.drink);
      if (rs.length === 1) go('recipes', rs[0].id);
      else { drinkSel = c.dataset.drink; render(); }
    }));
  }

  function renderRecipeDetail(id) {
    const r = DB.findRecipe(id);
    if (!r) return go('recipes');
    topbarSub.textContent = 'Recept';

    const specs = [
      ['Dosis', r.dose], ['Water', r.water],
      ['Ratio', r.ratio], ['Temp', r.temp], ['Tijd', r.time],
    ].filter(([, v]) => v && v !== '—');

    // Calculator alleen voor filter-recepten met een leesbare ratio + water
    const baseWater = r.cat === 'filter' ? parseNum(r.water) : null;
    const denom = r.cat === 'filter' ? parseRatioDenom(r.ratio) : null;
    const scalable = !!(baseWater && denom);
    if (brewCalc.id !== r.id) brewCalc = { id: r.id, water: null };
    const target = brewCalc.water || baseWater;
    const factor = scalable ? target / baseWater : 1;
    const doseOut = scalable ? Math.round(target / denom * 10) / 10 : null;

    // Timer: getimede stappen of een richttijd (espresso-stopwatch)
    if (brewTimer.id !== r.id) {
      clearInterval(brewTimer.int);
      brewTimer = { id: r.id, running: false, startTs: 0, elapsed: 0, int: null };
    }
    const timed = (r.steps || []).map(st => ({ ...st, sec: parseStepSec(st.t) })).filter(s => s.sec !== null);
    const tTarget = parseTargetSec(r.time);
    const endSec = Math.max(timed.length ? timed[timed.length - 1].sec + 30 : 0, tTarget ? tTarget.hi : 0) || 60;
    const timerable = timed.length >= 2 || !!tTarget;
    const fbTargetG = r.cat === 'filter' && scalable ? target : parseNum(r.water);

    // Koffie kiezen: toont jouw eigen maalstand voor deze methode
    if (recipeCoffee.id !== r.id) recipeCoffee = { id: r.id, coffeeId: '' };
    const chosen = DB.coffees.find(x => x.id === recipeCoffee.coffeeId);
    const myGrind = chosen && ((chosen.grinds || []).find(gr => gr.method === r.method) || (chosen.grinds || [])[0]);
    const grindGear = myGrind && DB.gear.find(g => g.id === myGrind.gearId);
    const coffeeHtml = DB.coffees.length ? `
      <div class="subsection">Jouw koffie</div>
      <div class="field" style="margin-bottom:10px"><label>Koffie</label>
        <select id="rc-select">
          <option value="">—</option>
          ${DB.coffees.map(x => `<option value="${x.id}" ${x.id === recipeCoffee.coffeeId ? 'selected' : ''}>${esc(x.name)}${x.roaster ? ' · ' + esc(x.roaster) : ''}</option>`).join('')}
        </select></div>
      ${chosen ? (myGrind ? `<div class="specs" style="border-top:none;padding-top:0;margin-top:0">
          <div class="spec"><span class="spec-k">Maalstand</span><span class="spec-v">${esc(myGrind.clicks)}<span class="unit"> kliks</span></span></div>
          ${grindGear ? `<div class="spec"><span class="spec-k">Op</span><span class="spec-v">${esc(grindGear.brand + ' ' + grindGear.model)}</span></div>` : ''}
          ${myGrind.dose ? `<div class="spec"><span class="spec-k">Jouw dosis</span><span class="spec-v">${esc(myGrind.dose)}<span class="unit"> g</span></span></div>` : ''}
          ${myGrind.yield ? `<div class="spec"><span class="spec-k">Jouw yield</span><span class="spec-v">${esc(myGrind.yield)}<span class="unit"> g</span></span></div>` : ''}
          ${myGrind.time ? `<div class="spec"><span class="spec-k">Jouw tijd</span><span class="spec-v">${esc(myGrind.time)}</span></div>` : ''}
          ${myGrind.temp ? `<div class="spec"><span class="spec-k">Jouw temp</span><span class="spec-v">${esc(myGrind.temp)}<span class="unit"> °C</span></span></div>` : ''}
        </div>${myGrind.notes ? `<div class="notice" style="margin-top:14px">${esc(myGrind.notes)}</div>` : ''}`
        : `<div class="notice">Nog geen maalstand voor ${esc(chosen.name)} — leg er een vast bij de koffie zelf.</div>`) : ''}` : '';

    const calcHtml = scalable ? `
      <div class="subsection">Brouw-calculator</div>
      <div class="card" style="cursor:default">
        <div class="chips" style="margin:0 0 10px">
          ${[1, 2, 3, 4].map(n =>
            `<button class="chip ${target === n * WATER_PP ? 'active' : ''}" data-pers="${n}">${n} pers.</button>`).join('')}
        </div>
        <div class="field" style="margin-bottom:10px"><label>Water (g)</label>
          <input id="calc-water" type="number" inputmode="numeric" min="100" max="2000" step="10" value="${target}"></div>
        <div class="specs" style="border-top:none;padding-top:0;margin-top:0">
          <div class="spec"><span class="spec-k">Aanbevolen dosis</span><span class="spec-v">${doseOut}<span class="unit"> g</span></span></div>
          <div class="spec"><span class="spec-k">Ratio</span><span class="spec-v">${esc(r.ratio)}</span></div>
        </div>
        ${factor !== 1 ? `<div class="map-hint" style="margin:8px 0 0">Stappen geschaald naar ${target} g</div>` : ''}
      </div>` : '';

    view.innerHTML = `
      <button class="back" id="back">← Terug</button>
      <div class="detail-head">
        <div class="detail-title">${esc(r.title)}</div>
        <div class="detail-sub">${esc(r.method)}${r.cat ? ' · ' + esc(catLabel(r.cat)) : ''} · <span class="tag-source">${esc(r.source)}</span></div>
      </div>
      <div class="card" style="cursor:default"><div class="specs" style="border-top:none;padding-top:0;margin-top:0">
        ${specs.map(([k, v]) => `<div class="spec"><span class="spec-k">${k}</span><span class="spec-v">${esc(v)}</span></div>`).join('')}
      </div></div>
      ${coffeeHtml}
      ${calcHtml}
      ${timerable ? `
      <div class="subsection">Brouw-timer</div>
      <div class="card" style="cursor:default">
        <div class="timer-clock" id="t-clock">${fmtSec(timerNow())}</div>
        <div class="timer-bar"><div class="timer-fill" id="t-fill"></div></div>
        <div class="timer-next" id="t-next">${tTarget ? `Doel: ${fmtSec(tTarget.lo)}–${fmtSec(tTarget.hi)}` : ''}</div>
        <div class="btn-row">
          <button class="btn" id="t-start">${brewTimer.running ? 'Pauze' : (brewTimer.elapsed > 0 ? 'Verder' : 'Start')}</button>
          <button class="btn ghost" id="t-reset">Reset</button>
          <button class="btn ghost" id="t-done">Klaar</button>
        </div>
      </div>` : ''}
      <div class="subsection">Stappen</div>
      <div class="steps">
        ${(r.steps || []).map(st => { const sec = parseStepSec(st.t); return `<div class="step"${sec !== null ? ` data-sec="${sec}"` : ''}><span>${esc(factor !== 1 ? scaleGrams(st.s, factor) : st.s)}${st.start ? '<span class="step-tag">timer start</span>' : ''}${st.opt ? '<span class="step-tag opt">optioneel</span>' : ''}</span>${st.t ? `<span class="step-time">${esc(st.t)}</span>` : ''}</div>`; }).join('')}
      </div>
      ${r.notes ? `<div class="notice" style="margin-top:16px">${esc(r.notes)}</div>` : ''}
      <div class="btn-row">
        ${r.custom ? `<button class="btn ghost" id="edit">Bewerken</button>
        <button class="btn danger" id="del">Verwijderen</button>`
        : `<button class="btn ghost block" id="save-as">Aanpassen en bewaren als eigen versie</button>`}
      </div>`;

    view.querySelector('#back').addEventListener('click', () => go('recipes'));
    view.querySelectorAll('[data-pers]').forEach(b => b.addEventListener('click', () => {
      brewCalc.water = +b.dataset.pers * WATER_PP; render();
    }));
    view.querySelector('#rc-select')?.addEventListener('change', e => {
      recipeCoffee.coffeeId = e.target.value;
      render();
    });
    view.querySelector('#save-as')?.addEventListener('click', () => recipeForm({
      ...r, id: null, custom: true,
      title: `${r.title} (mijn versie)`,
      source: 'Eigen',
      dose: myGrind?.dose ? `${myGrind.dose} g` : r.dose,
      water: r.cat === 'filter' && scalable ? `${target} g` : (myGrind?.yield ? `${myGrind.yield} g uit (yield)` : r.water),
      time: myGrind?.time || r.time,
      temp: myGrind?.temp ? `${myGrind.temp} °C` : r.temp,
      steps: (r.steps || []).map(st => ({ ...st, s: factor !== 1 ? scaleGrams(st.s, factor) : st.s })),
      notes: [myGrind?.notes, chosen ? `Voor ${chosen.name}` : ''].filter(Boolean).join(' · ') || r.notes,
    }));
    view.querySelector('#calc-water')?.addEventListener('change', e => {
      const v = +e.target.value;
      if (v >= 100 && v <= 2000) { brewCalc.water = v; render(); }
    });
    if (timerable) {
      const tick = () => timerTick(timed, endSec, factor, tTarget, r.time);
      if (brewTimer.running && !brewTimer.int) brewTimer.int = setInterval(tick, 250);
      tick();
      const startBtn = view.querySelector('#t-start');
      startBtn.addEventListener('click', () => {
        if (brewTimer.running) {
          brewTimer.elapsed = timerNow(); brewTimer.running = false;
          clearInterval(brewTimer.int); brewTimer.int = null;
          startBtn.textContent = 'Verder';
        } else {
          brewTimer.startTs = Date.now() - brewTimer.elapsed * 1000;
          brewTimer.running = true;
          brewTimer.int = setInterval(tick, 250);
          startBtn.textContent = 'Pauze';
        }
      });
      view.querySelector('#t-reset').addEventListener('click', () => {
        brewTimer.elapsed = 0; brewTimer.running = false;
        clearInterval(brewTimer.int); brewTimer.int = null;
        startBtn.textContent = 'Start';
        tick();
      });
      view.querySelector('#t-done').addEventListener('click', () => {
        const sec = timerNow();
        brewTimer.elapsed = sec; brewTimer.running = false;
        clearInterval(brewTimer.int); brewTimer.int = null;
        feedbackModal(r, sec, fbTargetG, chosen, myGrind, grindGear);
      });
    }
    if (r.custom) {
      view.querySelector('#edit').addEventListener('click', () => recipeForm(r));
      view.querySelector('#del').addEventListener('click', () => {
        if (confirm(`${r.title} verwijderen?`)) { DB.removeRecipe(r.id); go('recipes'); }
      });
    }
  }

  function recipeForm(existing = null) {
    const r = existing || {};
    if (existing && !existing.id) existing = null; // voorgevuld sjabloon = nieuw recept
    const stepsText = (r.steps || []).map(s => (s.t ? s.t + ' | ' : '') + s.s).join('\n');
    openModal(existing ? 'Recept bewerken' : 'Eigen recept', `
      <form id="recipe-form">
        ${formField('Titel', 'title', r.title || '', 'text', 'required')}
        ${formSelect('Categorie', 'cat', RECIPE_CATS, r.cat || 'espresso')}
        ${formField('Drank (groepering)', 'drink', r.drink || '', 'text', 'placeholder="Cappuccino"')}
        <div class="field-row">
          ${formField('Methode', 'method', r.method || '', 'text', 'placeholder="Pour-over (V60)"')}
          ${formField('Bron', 'source', r.source || 'Eigen', 'text')}
        </div>
        <div class="field-row">
          ${formField('Dosis', 'dose', r.dose || '', 'text', 'placeholder="20 g"')}
          ${formField('Water', 'water', r.water || '', 'text', 'placeholder="320 g"')}
        </div>
        <div class="field-row">
          ${formField('Ratio', 'ratio', r.ratio || '', 'text', 'placeholder="1:16"')}
          ${formField('Temp', 'temp', r.temp || '', 'text', 'placeholder="95 °C"')}
        </div>
        ${formField('Doorlooptijd', 'time', r.time || '', 'text', 'placeholder="3:00"')}
        <div class="field"><label>Stappen (één per regel, optioneel "tijd | stap")</label>
          <textarea name="steps" rows="6" placeholder="0:00 | Bloom met 60 g&#10;0:45 | Giet tot 125 g">${esc(stepsText)}</textarea></div>
        <div class="field"><label>Notities</label><textarea name="notes">${esc(r.notes || '')}</textarea></div>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="cancel">Annuleer</button>
          <button type="submit" class="btn">Opslaan</button>
        </div>
      </form>`, modal => {
      modal.querySelector('#cancel').addEventListener('click', closeModal);
      modal.querySelector('#recipe-form').addEventListener('submit', e => {
        e.preventDefault();
        const d = formData(e.target);
        d.steps = d.steps.split('\n').filter(Boolean).map(line => {
          const m = line.match(/^\s*([\d:]+)\s*\|\s*(.+)$/);
          return m ? { t: m[1], s: m[2] } : { t: '', s: line.trim() };
        });
        d.custom = true;
        if (existing) { DB.updateRecipe({ ...existing, ...d }); go('recipes', existing.id); }
        else { const saved = DB.addRecipe(d); go('recipes', saved.id); }
      });
    });
  }


  // ---------- back-up ----------
  const backupName = () => `pleur-backup-${new Date().toISOString().slice(0, 10)}.json`;

  function backupModal() {
    openModal('Back-up', `
      <div class="notice">Je gegevens staan alleen in deze browser. Bewaar af en toe een kopie —
        bij het wissen van je browserdata is alles anders weg.</div>
      <button class="btn block" id="bk-export">Kopie opslaan</button>
      <div id="bk-status" class="map-hint"></div>
      <div class="subsection">Terugzetten</div>
      <div class="notice">Een kopie terugzetten vervangt alles wat er nu in staat.</div>
      <input type="file" id="bk-file" accept="application/json,.json" hidden>
      <button class="btn ghost block" id="bk-import">Kopie kiezen…</button>
      <div class="btn-row"><button type="button" class="btn ghost" id="cancel">Sluiten</button></div>
    `, modal => {
      const status = modal.querySelector('#bk-status');
      modal.querySelector('#cancel').addEventListener('click', closeModal);

      modal.querySelector('#bk-export').addEventListener('click', async () => {
        const payload = JSON.stringify({
          app: 'pleur', version: 1,
          exported: new Date().toISOString(),
          data: DB.snapshot(),
        }, null, 2);
        const name = backupName();
        const file = new File([payload], name, { type: 'application/json' });
        // Op de telefoon via het deelmenu (Bestanden, iCloud, mail); anders gewoon downloaden
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: name });
            status.textContent = 'Kopie gedeeld.';
            return;
          } catch (err) {
            if (err?.name === 'AbortError') { status.textContent = 'Afgebroken.'; return; }
          }
        }
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = `Opgeslagen als ${name}`;
      });

      const fileInput = modal.querySelector('#bk-file');
      modal.querySelector('#bk-import').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files[0];
        if (!f) return;
        try {
          const parsed = JSON.parse(await f.text());
          const data = parsed.data || parsed;
          if (!Array.isArray(data.coffees) || !Array.isArray(data.gear)) {
            throw new Error('geen Pleur-kopie');
          }
          const n = (data.coffees.length) + (data.gear.length);
          if (!confirm(`Kopie van ${parsed.exported ? parsed.exported.slice(0, 10) : 'onbekende datum'} terugzetten? Alles wat er nu in staat (${DB.coffees.length} koffies, ${DB.gear.length} apparaten) wordt vervangen door ${data.coffees.length} koffies en ${data.gear.length} apparaten.`)) return;
          DB.restore(data);
          location.reload();
        } catch (err) {
          status.textContent = 'Dit bestand is geen Pleur-kopie.';
        }
      });
    });
  }
  document.getElementById('backup-btn')?.addEventListener('click', backupModal);

  // ---------- start ----------
  render();
})();
