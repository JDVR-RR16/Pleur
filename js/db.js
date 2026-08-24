// Simpele localStorage-store. Datavolume is klein (persoonlijk gebruik),
// dus geen IndexedDB nodig.
const DB = (() => {
  const KEY = 'brewlog.v1';

  const defaults = { gear: [], coffees: [], recipes: [], seeded: false };

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    get gear() { return state.gear; },
    get coffees() { return state.coffees; },
    get recipes() { return state.recipes; },
    get seeded() { return state.seeded; },
    set seeded(v) { state.seeded = v; save(); },
    uid,
    save,

    // Voor back-up en herstel
    snapshot() { return JSON.parse(JSON.stringify(state)); },
    restore(obj) {
      state = { ...defaults, ...obj };
      save();
    },

    addGear(g)    { g.id = uid(); g.tasks = g.tasks || []; state.gear.push(g); save(); return g; },
    updateGear(g) { const i = state.gear.findIndex(x => x.id === g.id); if (i >= 0) state.gear[i] = g; save(); },
    removeGear(id){ state.gear = state.gear.filter(x => x.id !== id); save(); },
    findGear(id)  { return state.gear.find(x => x.id === id); },

    addCoffee(c)    { c.id = uid(); c.grinds = c.grinds || []; state.coffees.push(c); save(); return c; },
    updateCoffee(c) { const i = state.coffees.findIndex(x => x.id === c.id); if (i >= 0) state.coffees[i] = c; save(); },
    removeCoffee(id){ state.coffees = state.coffees.filter(x => x.id !== id); save(); },
    findCoffee(id)  { return state.coffees.find(x => x.id === id); },
    findByEan(ean)  { return state.coffees.find(x => x.ean && x.ean === ean); },

    addRecipe(r)    { r.id = uid(); state.recipes.push(r); save(); return r; },
    updateRecipe(r) { const i = state.recipes.findIndex(x => x.id === r.id); if (i >= 0) state.recipes[i] = r; save(); },
    removeRecipe(id){ state.recipes = state.recipes.filter(x => x.id !== id); save(); },
    findRecipe(id)  { return state.recipes.find(x => x.id === id); },
  };
})();
