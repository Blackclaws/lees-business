'use strict';
// Game rules. No DOM in here, so a bot can play it headless (see tools/sim.js).

const SAVE_VERSION = 2;
// Version 1 named Earth contracts after venues; version 2 names them after milestones.
const V1_CONTRACTS = { gas: 'loo', cafe: 'flat', office: 'floor', mall: 'block', stadium: 'street',
  airport: 'neighbourhood', city: 'town', nation: 'city', continent: 'country' };
const STAFF_GROWTH = 1.13;
const CONTRACT_GROWTH = 1.15;
// The door price, as a share of a mess's value. Positive: visitors pay to get in.
// Negative: we pay them (Pay-Per-Poo). Footfall is e^(−DOOR_ELASTICITY × price).
const DOOR_FEE_MAX = 2;
const DOOR_BOUNTY_MAX = 0.9;
const DOOR_ELASTICITY = 3;

function freshState(plungers = 0) {
  return {
    v: SAVE_VERSION,
    time: 0,               // seconds of game time; buffs are timed against this
    pennies: 0,
    totalPennies: 0,       // this run
    messes: 1,
    progress: 0,           // manual scrub progress toward the next mess
    earthToilets: 1,       // Lee's own toilet, at home
    spaceToilets: 0,
    staff: {},
    extraGarys: 0,         // Garys the cupboards made; nobody hired these
    garyDims: {},          // Gary Dimensions bought
    garyAmt: {},           // Gary Dimensions owned, bought plus grown
    uncle: 0,              // Uncle Steves hired
    extraSteves: 0,        // Steves the sheds made
    steveDims: {},
    steveAmt: {},
    steveMesses: 0,        // waiting in Steve's toilets, for a Gary
    contracts: {},
    upgrades: {},
    flags: {},
    memos: [],             // ids of memos already sent
    cleaned: 0,
    manualCleaned: 0,
    clicks: 0,
    price: 0,              // door price, see DOOR_* above
    royalty: 0,            // pennies/sec Gary sends from Earth after the handover
    buffs: [],
    plungers,              // Golden Plungers from previous runs: +100% value each
    started: Date.now(),
    savedAt: Date.now(),
  };
}

function staffPrice(S, st) { return Math.ceil(st.cost * Math.pow(st.growth || STAFF_GROWTH, S.staff[st.id] || 0)); }

function priceRange(S) {
  return { min: S.flags.poo ? -DOOR_BOUNTY_MAX : 0, max: S.flags.coinslot ? DOOR_FEE_MAX : 0 };
}

function footfall(price) { return Math.exp(-DOOR_ELASTICITY * price); }
// Gary and Steve Dimensions work the same way; this says where each family keeps its numbers.
const DIM_STATE = {
  gary: { list: GARY_DIMENSIONS, bought: 'garyDims', amt: 'garyAmt', extra: 'extraGarys', flag: 'garydim' },
  steve: { list: STEVE_DIMENSIONS, bought: 'steveDims', amt: 'steveAmt', extra: 'extraSteves', flag: 'stevedim' },
};
function dimPrice(S, g) { return Math.ceil(g.cost * Math.pow(g.growth, S[DIM_STATE[g.fam].bought][g.id] || 0)); }
function stevePrice(S) { return Math.ceil(UNCLE_STEVE.cost * Math.pow(UNCLE_STEVE.growth, S.uncle || 0)); }
function contractPrice(S, c) { return Math.ceil(c.cost * Math.pow(CONTRACT_GROWTH, S.contracts[c.id] || 0)); }

function buffMult(S, kind) {
  let m = 1;
  for (const b of S.buffs) if (b.kind === kind) m *= b.mult;
  return m;
}

function derive(S) {
  let click = 1, staff = 1, mess = 1, value = 1, clickPct = 0, garyDim = 1, steveDim = 1, garyRoom = GARYS_PER_TOILET;
  const one = {};
  const owned = UPGRADES.filter(u => S.upgrades[u.id]).concat(MILESTONES.filter(m => m.fx && reached(S, m.id)));
  for (const u of owned) {
    const fx = u.fx;
    if (fx.click) click *= fx.click;
    if (fx.staff) staff *= fx.staff;
    if (fx.mess) mess *= fx.mess;
    if (fx.value) value *= fx.value;
    if (fx.clickPct) clickPct += fx.clickPct;
    if (fx.one) one[fx.one.id] = (one[fx.one.id] || 1) * fx.one.m;
    if (fx.garyDim) garyDim *= fx.garyDim;
    if (fx.garyRoom) garyRoom *= fx.garyRoom;
    if (fx.steveDim) steveDim *= fx.steveDim;
  }
  if (S.flags.sixth) garyDim *= 3;
  const garyCount = garys(S);

  let scrubRate = 0;
  for (const st of STAFF) {
    const n = S.staff[st.id] || 0;
    if (n) scrubRate += n * st.rate * (one[st.id] || 1);
  }
  scrubRate *= staff;
  // After the handover, Earth is Gary's problem. We only make mess in space.
  const t = S.flags.space ? S.spaceToilets : S.earthToilets;
  // Cupboard Garys bring their own brushes: only Gary upgrades help them.
  // They also need a toilet each, Steve's included; the rest wait in the cupboard.
  // Uncle Steve stays on Earth with Gary after the handover.
  const steveToilets = S.flags.space ? 0 : steves(S);
  const hired = S.staff.gary || 0;
  const cupboardWorking = Math.min(S.extraGarys, Math.max(0, (t + steveToilets) * garyRoom - hired));
  const cupboardScrub = cupboardWorking * STAFF[0].rate * (one.gary || 1);
  const garyScrub = (S.staff.gary || 0) * STAFF[0].rate * (one.gary || 1) * staff + cupboardScrub;
  scrubRate += cupboardScrub;

  const baseMessRate = t * BASE_MESS_RATE * mess * buffMult(S, 'mess');
  // Steve doesn't come through the door, so the door price doesn't touch him.
  const steveMessRate = steveToilets * BASE_MESS_RATE * mess * buffMult(S, 'mess');
  // Garys clean Steve's toilets first, and only Garys may. Whatever is left helps everyone else.
  const garyClean = garyScrub / SCRUB_PER_MESS;
  const otherClean = (scrubRate - garyScrub) / SCRUB_PER_MESS;
  const steveClean = Math.min(steveMessRate, garyClean);

  return {
    toilets: S.earthToilets + S.spaceToilets,
    serviced: t,
    clickPower: (click + clickPct * scrubRate) * buffMult(S, 'click'),
    scrubRate,
    cleanRate: otherClean + garyClean - steveClean,   // for our own toilets, once Steve is seen to
    garyClean,
    otherClean,
    steveToilets,
    steveMessRate,
    steveClean,
    steveCap: steveToilets * MESS_CAP_PER_TOILET,
    baseMessRate,
    messRate: baseMessRate * footfall(S.price),
    value: value * (1 + S.plungers) * buffMult(S, 'value'),
    cap: Math.max(10, t * MESS_CAP_PER_TOILET),
    messMult: mess,
    staffMult: staff,
    one,
    garyCount,
    garyScrub,
    garyWorking: hired + cupboardWorking,
    garyRoom: (t + steveToilets) * garyRoom,
    dimMult: { gary: garyDim, steve: steveDim },
  };
}

// What the business earns per second once the backlog has settled.
function steadyIncome(S, d = derive(S)) {
  const cleans = Math.min(d.messRate, d.cleanRate);
  return cleans * d.value * (1 + S.price) + d.steveClean * d.value + S.royalty;
}

// Gary takes Earth over one toilet at a time, so he needs a Gary for every toilet on it.
// Garys busy with Steve's toilets don't count; cupboard Garys do, they're only waiting.
function garysFree(S, d = derive(S)) {
  const perGary = STAFF[0].rate * (d.one.gary || 1) / SCRUB_PER_MESS;
  return Math.max(0, garys(S) - d.steveMessRate / perGary);
}
function garyCover(S) { return Math.min(1, garysFree(S) / EARTH_TOILETS); }
function earthReady(S) { return garysFree(S) >= EARTH_TOILETS; }

// What one Gary or Steve Dimension produces per second of the thing below it.
function dimOutput(S, g, d) {
  const k = DIM_STATE[g.fam];
  const bought = S[k.bought][g.id] || 0;
  return (S[k.amt][g.id] || 0) * g.rate * Math.pow(2, Math.floor(bought / 10)) * d.dimMult[g.fam];
}

function growDims(S, d, dt) {
  for (const [fam, k] of Object.entries(DIM_STATE)) {
    if (fam === 'steve' && S.flags.space) continue;
    for (let i = 0; i < k.list.length; i++) {
      const g = k.list[i];
      if (!S[k.amt][g.id]) continue;
      const made = dimOutput(S, g, d) * dt;
      if (i === 0) S[k.extra] += made;
      else {
        const below = k.list[i - 1].id;
        S[k.amt][below] = (S[k.amt][below] || 0) + made;
      }
    }
  }
}

function earn(S, amount) {
  S.pennies += amount;
  S.totalPennies += amount;
}

function tick(S, dt) {
  S.time += dt;
  if (S.buffs.length) S.buffs = S.buffs.filter(b => b.until > S.time);
  const d = derive(S);

  // Garys see to Steve first. What's left of them joins everyone else on our toilets.
  const steveAvail = S.steveMesses + d.steveMessRate * dt;
  const steveCleaned = Math.min(steveAvail, d.garyClean * dt);
  S.steveMesses = Math.min(d.steveCap, steveAvail - steveCleaned);

  // People use the toilets while staff clean them. The cap only limits what is
  // left waiting; beyond it, people give up and use the bushes.
  const before = S.messes;
  const avail = before + d.messRate * dt;
  const cleaned = Math.min(avail, (d.otherClean + d.garyClean) * dt - steveCleaned);
  S.messes = Math.min(d.cap, avail - cleaned);
  if (cleaned + steveCleaned > 0) {
    S.cleaned += cleaned + steveCleaned;
    earn(S, (cleaned + steveCleaned) * d.value);
  }

  // The door price: every visitor who didn't give up pays it, or is paid it.
  const visits = S.messes - before + cleaned;
  if (S.price > 0) earn(S, visits * d.value * S.price);
  else if (S.price < 0) S.pennies = Math.max(0, S.pennies + visits * d.value * S.price);
  if (S.royalty) earn(S, S.royalty * dt);
  growDims(S, d, dt);
  return d;
}

// One click on the toilet. Returns what happened so the UI can react.
function scrub(S) {
  const d = derive(S);
  S.clicks++;
  if (S.messes < 1) return { idle: true };
  S.progress += d.clickPower;
  const n = Math.min(Math.floor(S.progress / SCRUB_PER_MESS), Math.floor(S.messes));
  if (n < 1) return { progress: S.progress / SCRUB_PER_MESS };
  S.progress -= n * SCRUB_PER_MESS;
  if (S.messes - n < 1) S.progress = 0;
  S.messes -= n;
  S.cleaned += n;
  S.manualCleaned += n;
  const gained = n * d.value;
  earn(S, gained);
  return { cleaned: n, gained, progress: S.progress / SCRUB_PER_MESS };
}

function staffVisible(S, st) {
  if (st.space && !S.flags.space) return false;
  return (S.staff[st.id] || 0) > 0 || S.totalPennies >= st.cost * 0.5;
}

function dimVisible(S, g) {
  const k = DIM_STATE[g.fam];
  if (g.fam === 'steve' && S.flags.space) return false;
  if (!S.flags[k.flag] || (g.sealed && !S.flags.sixth)) return false;
  return (S[k.bought][g.id] || 0) > 0 || S.totalPennies >= g.cost * 0.5;
}

function buyDim(S, g) {
  const k = DIM_STATE[g.fam];
  const p = dimPrice(S, g);
  if (S.pennies < p || !dimVisible(S, g)) return false;
  S.pennies -= p;
  S[k.bought][g.id] = (S[k.bought][g.id] || 0) + 1;
  S[k.amt][g.id] = (S[k.amt][g.id] || 0) + 1;
  return true;
}

// Uncle Steve turns up once you know where Garys come from.
function steveVisible(S) { return !!S.flags.garydim && !S.flags.space; }

function hireSteve(S) {
  const p = stevePrice(S);
  if (S.pennies < p || !steveVisible(S)) return false;
  S.pennies -= p;
  S.uncle = (S.uncle || 0) + 1;
  return true;
}

function contractVisible(S, c) {
  if (c.space && !S.flags.space) return false;
  if (c.after && !S.contracts[c.after]) return false;
  return (S.contracts[c.id] || 0) > 0 || S.totalPennies >= c.cost * 0.5;
}

// Why a contract can't be bought right now, or null if it can.
function contractBlock(S, c) {
  if (c.max && (S.contracts[c.id] || 0) >= c.max) return 'Signed';
  if (!c.space && S.flags.space) return "Gary's now";
  if (!c.space && S.earthToilets >= EARTH_TOILETS) return 'Every toilet on Earth is yours';
  if (c.space && S.earthToilets + S.spaceToilets >= UNIVERSE_TOILETS) return 'There are no toilets left';
  return null;
}

function upgradeAvailable(S, u) {
  return !S.upgrades[u.id] && u.req(S);
}

// Locked projects worth showing early, so there is something to aim for.
function upgradeTeased(S, u) {
  return !S.upgrades[u.id] && !u.req(S) && !!u.tease && u.tease(S);
}

function buyStaff(S, st) {
  const p = staffPrice(S, st);
  if (S.pennies < p) return false;
  S.pennies -= p;
  S.staff[st.id] = (S.staff[st.id] || 0) + 1;
  return true;
}

// Toilets one contract brings, after Campaigns.
function contractToilets(S, c) {
  let m = 1;
  for (const u of UPGRADES) if (S.upgrades[u.id] && u.fx.toilets && u.fx.toilets.id === c.id) m *= u.fx.toilets.m;
  return c.toilets * m;
}

function addToilets(S, c, n) {
  if (c.space) S.spaceToilets = Math.min(UNIVERSE_TOILETS - S.earthToilets, S.spaceToilets + n);
  else S.earthToilets = Math.min(EARTH_TOILETS, S.earthToilets + n);
}

function buyContract(S, c) {
  const p = contractPrice(S, c);
  if (S.pennies < p || contractBlock(S, c)) return false;
  S.pennies -= p;
  S.contracts[c.id] = (S.contracts[c.id] || 0) + 1;
  addToilets(S, c, contractToilets(S, c));
  return true;
}

function buyUpgrade(S, u) {
  if (!upgradeAvailable(S, u) || S.pennies < u.cost) return false;
  S.pennies -= u.cost;
  if (u.fx.toilets) {
    // A campaign doubles the toilets you already have from that contract, too.
    const c = CONTRACTS.find(x => x.id === u.fx.toilets.id);
    const extra = (S.contracts[c.id] || 0) * contractToilets(S, c) * (u.fx.toilets.m - 1);
    addToilets(S, c, extra);
  }
  S.upgrades[u.id] = true;
  if (u.fx.flag === 'space') handOverEarth(S);
  if (u.fx.flag) S.flags[u.fx.flag] = true;
  return true;
}

// Earth goes to Gary, with everything in the till. He pays a franchise fee;
// we start again in space with one toilet.
function handOverEarth(S) {
  S.royalty = steadyIncome(S) * ROYALTY_SHARE;
  S.pennies = 0;
  S.messes = 0;
  S.progress = 0;
  if (!garys(S)) S.staff.gary = 1;   // there is always a Gary
}

// Memos whose condition just became true. Marks them as sent.
function newMemos(S) {
  const out = [];
  for (const m of MEMOS) {
    if (S.memos.includes(m.id)) continue;
    if (m.when(S)) { S.memos.push(m.id); out.push(m); }
  }
  return out;
}

function pickThrone() {
  const total = THRONE_EFFECTS.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * total;
  for (const e of THRONE_EFFECTS) { if ((r -= e.weight) < 0) return e; }
  return THRONE_EFFECTS[0];
}

// Apply a Golden Throne effect. Returns the pennies gained, if any.
function claimThrone(S, effect) {
  if (effect.buff) {
    const b = effect.buff;
    S.buffs.push({ kind: b.kind, mult: b.mult, until: S.time + b.secs, name: effect.name });
    return 0;
  }
  // Lucky Clog: 10 minutes of income, but never more than 15% of the bank, plus a floor.
  const gain = Math.max(25, Math.min(steadyIncome(S) * 600, S.pennies * 0.15 + 50));
  earn(S, gain);
  return gain;
}

// Catch up after time away. Staff work while you sleep, at whatever door price you left.
function offlineProgress(S, seconds) {
  const secs = Math.min(seconds, 8 * 3600);
  if (secs < 30) return null;
  const d = derive(S);
  const cleans = Math.min(d.messRate, d.cleanRate) * secs;
  const gained = steadyIncome(S, d) * secs;
  // The cupboards keep going while you're away. Grow them in steps.
  const garysBefore = garys(S);
  const steps = Math.ceil(secs / 10);
  for (let i = 0; i < steps; i++) growDims(S, derive(S), secs / steps);
  if (gained <= 0) return null;
  S.cleaned += cleans;
  earn(S, gained);
  return { secs, cleans, gained, newGarys: garys(S) - garysBefore };
}

function restart(S) {
  // The Great Flush: start over with one more Golden Plunger.
  return freshState(S.plungers + 1);
}

function serialize(S) {
  S.savedAt = Date.now();
  return JSON.stringify(S);
}

function deserialize(text) {
  const raw = JSON.parse(text);
  if (!raw || (raw.v !== 1 && raw.v !== SAVE_VERSION)) throw new Error('This save is from a different version of the game.');
  if (raw.v === 1) {
    const old = raw.contracts || {};
    raw.contracts = {};
    for (const [id, n] of Object.entries(old)) raw.contracts[V1_CONTRACTS[id] || id] = n;
    raw.v = SAVE_VERSION;
  }
  if (raw.price === undefined) raw.price = -(raw.bounty || 0);   // saves from before the door price
  delete raw.bounty;
  return Object.assign(freshState(), raw);
}
