// Headless pacing check: a greedy bot plays the game and prints milestone times.
// Usage: node tools/sim.js [hours] [clicksPerSecond]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', 'js');
const code = ['data.js', 'engine.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const ctx = { Date, Math, JSON, console };
vm.createContext(ctx);
vm.runInContext(code + '\n;this.G = { freshState, derive, tick, scrub, steadyIncome, staffVisible, contractVisible, contractBlock, upgradeAvailable, buyStaff, buyContract, buyUpgrade, priceRange, contractToilets, staffPrice, dimPrice, dimVisible, buyDim, GARY_DIMENSIONS, STEVE_DIMENSIONS, garys, steves, stevePrice, steveVisible, hireSteve, earthReady, garyCover, contractPrice, STAFF, CONTRACTS, UPGRADES, EARTH_TOILETS, UNIVERSE_TOILETS };', ctx);
const G = ctx.G;

const HOURS = Number(process.argv[2] || 48);
const CPS = Number(process.argv[3] || 4);
const S = G.freshState();

function hms(t) {
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60;
  return `${h}h${String(m).padStart(2, '0')}m`;
}

// Set the door price the way an attentive player would: the best steady income on a 5% grid.
function bestPrice() {
  const r = G.priceRange(S);
  let best = 0, bestInc = -1;
  for (let p = r.min; p <= r.max + 1e-9; p += 0.05) {
    S.price = p;
    const inc = G.steadyIncome(S);
    if (inc > bestInc) { bestInc = inc; best = p; }
  }
  S.price = best;
}

const gatePending = () => !S.flags.space && S.earthToilets >= G.EARTH_TOILETS && !G.earthReady(S);

// Score = time to afford + payback time. Lower is better.
function candidates() {
  const inc = Math.max(G.steadyIncome(S), CPS * 0.25);
  const out = [];
  const tryIt = (label, cost, apply, undo, priority) => {
    const before = G.steadyIncome(S);
    apply(); const after = G.steadyIncome(S); undo();
    const gain = after - before;
    if (priority) out.push({ label, cost, score: cost / inc, buy: priority });
    else if (gain > 0) out.push({ label, cost, score: cost / inc + cost / gain });
  };
  if (!process.env.NOSTEVE && G.steveVisible(S)) {
    tryIt('steve:uncle', G.stevePrice(S), () => { S.uncle++; }, () => { S.uncle--; });
  }
  for (const st of G.STAFF) {
    if (!G.staffVisible(S, st) && !(S.totalPennies > 0)) continue;
    if (st.space && !S.flags.space) continue;
    tryIt('staff:' + st.id, G.staffPrice(S, st),
      () => { S.staff[st.id] = (S.staff[st.id] || 0) + 1; },
      () => { S.staff[st.id]--; });
  }
  for (const c of G.CONTRACTS) {
    if (c.space && !S.flags.space) continue;
    if (G.contractBlock(S, c) || (c.after && !S.contracts[c.after])) continue;
    const p = G.contractPrice(S, c);
    if (c.max) { out.push({ label: 'contract:' + c.id, cost: p, score: p / inc * 0.5 }); continue; }
    // Players buy toilets and staff together, so value a toilet at half the mess it could bring in.
    const e = S.earthToilets, sp = S.spaceToilets, d0 = G.derive(S);
    const per = G.contractToilets(S, c);
    if (c.space) S.spaceToilets += per; else S.earthToilets = Math.min(G.EARTH_TOILETS, e + per);
    const d1 = G.derive(S);
    S.earthToilets = e; S.spaceToilets = sp;
    const gain = Math.max(G.steadyIncome(S, d1) - G.steadyIncome(S, d0), (d1.messRate - d0.messRate) * d0.value * (S.flags.space ? 0.5 : 0.1));
    if (gain > 0) out.push({ label: 'contract:' + c.id, cost: p, score: p / inc + p / gain });
  }
  for (const u of G.UPGRADES) {
    if (!G.upgradeAvailable(S, u)) continue;
    if (u.fx.flag) { out.push({ label: 'project:' + u.id, cost: u.cost, score: u.cost / inc * 2 }); continue; }
    if (u.fx.toilets) {
      const c = G.CONTRACTS.find(x => x.id === u.fx.toilets.id);
      const e = S.earthToilets, sp = S.spaceToilets;
      tryIt('upgrade:' + u.id, u.cost,
        () => { const n = (S.contracts[c.id] || 0) * c.toilets; if (c.space) S.spaceToilets += n; else S.earthToilets = Math.min(G.EARTH_TOILETS, e + n); },
        () => { S.earthToilets = e; S.spaceToilets = sp; });
      continue;
    }
    tryIt('upgrade:' + u.id, u.cost,
      () => { S.upgrades[u.id] = true; }, () => { delete S.upgrades[u.id]; });
  }
  // Story-minded players buy the first of each new destination as soon as it's cheap.
  for (const c of G.CONTRACTS) {
    if (!c.space || !S.flags.space || S.contracts[c.id] || !G.contractVisible(S, c)) continue;
    const p = G.contractPrice(S, c);
    if (p < inc * 60) out.push({ label: 'contract:' + c.id, cost: p, score: 0 });
  }
  // Fallback: push toilets toward the next story beat even if they don't pay back.
  if (!out.length) {
    for (const c of G.CONTRACTS) {
      if ((c.space && !S.flags.space) || G.contractBlock(S, c) || (c.after && !S.contracts[c.after])) continue;
      out.push({ label: 'contract:' + c.id, cost: G.contractPrice(S, c), score: G.contractPrice(S, c) / inc });
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out;
}

function buy(label) {
  const [kind, id] = label.split(':');
  if (kind === 'staff') return G.buyStaff(S, G.STAFF.find(x => x.id === id));
  if (kind === 'steve') return G.hireSteve(S);
  if (kind === 'contract') return G.buyContract(S, G.CONTRACTS.find(x => x.id === id));
  return G.buyUpgrade(S, G.UPGRADES.find(x => x.id === id));
}

const marks = [];
const mark = (name) => { if (!marks.find(m => m.name === name)) { marks.push({ name, t: S.time }); console.log(hms(S.time).padStart(8), name); } };

let target = null, stuckFor = 0;
// "Things to do at every turn": the longest stretch in space with nothing bought.
let spaceAt = 0, lastBuy = 0, longestGap = 0, spaceBuys = 0, gapAt = '';
const end = HOURS * 3600;
while (S.time < end && !S.flags.ended) {
  for (let i = 0; i < 10; i++) {
    for (let c = 0; c < CPS; c++) G.scrub(S);
    G.tick(S, 1);
  }
  // Buy as many things as we can afford in priority order.
  for (let guard = 0; guard < 50; guard++) {
    const list = candidates();
    target = list[0];
    if (!target || S.pennies < target.cost) break;
    if (!buy(target.label)) break;
    if (S.flags.space) {
      if (!spaceAt) spaceAt = S.time;
      else if (S.time - lastBuy > longestGap) { longestGap = S.time - lastBuy; gapAt = `${hms(lastBuy)}, then ${target.label}`; }
      lastBuy = S.time; spaceBuys++;
    }
    if (target.label.startsWith('project:') || target.label.startsWith('contract:')) mark(target.label);
    bestPrice();
  }
  // Gary Dimensions don't pay back right away, so a player feeds them spare change.
  if (gatePending()) for (const g of G.GARY_DIMENSIONS) { while (G.dimVisible(S, g) && G.dimPrice(S, g) < S.pennies * 0.2) G.buyDim(S, g); }
  for (const g of process.env.NOGARY ? [] : G.GARY_DIMENSIONS) {
    // GARYFAN=1 plays like someone who loves watching the cupboards: 5% of the bank, as often as it can.
    if (process.env.GARYFAN) { while (G.dimVisible(S, g) && G.dimPrice(S, g) < S.pennies * 0.05) G.buyDim(S, g); }
    else if (G.dimVisible(S, g) && G.dimPrice(S, g) < S.pennies * 0.005) G.buyDim(S, g);
  }
  // Steve's sheds too, but a sensible player stops while the Garys can't keep up (unless STEVEFAN=1).
  for (const g of process.env.NOSTEVE ? [] : G.STEVE_DIMENSIONS) {
    const d = G.derive(S);
    if (!process.env.STEVEFAN && (d.steveMessRate > d.garyClean || gatePending())) break;
    const share = process.env.STEVEFAN ? 0.05 : 0.005;
    while (G.dimVisible(S, g) && G.dimPrice(S, g) < S.pennies * share) G.buyDim(S, g);
  }
  if (gatePending()) mark('waiting for a Gary at every toilet');
  // SAVEAT=seconds writes the game state to stdout at that point, for loading into the browser.
  if (process.env.SAVEAT && S.time >= Number(process.env.SAVEAT)) { S.savedAt = Date.now(); console.log('SAVE ' + JSON.stringify(S)); break; }
  const t = S.earthToilets + S.spaceToilets;
  for (const [n, name] of [[100, '100 toilets'], [1e4, '10K toilets'], [1e6, '1M toilets'], [1e8, '100M toilets'], [G.EARTH_TOILETS, 'EVERY TOILET ON EARTH'], [1e12, '1T toilets'], [G.UNIVERSE_TOILETS, 'UNIVERSE']])
    if (t >= n) mark(name);
  if (process.env.DUMP && S.time % 3600 < 10 && S.flags.space) console.log(candidates().slice(0, 6).map(c => `${c.label}@${c.cost.toExponential(1)} s=${c.score.toExponential(2)}`).join("  "));
  if (S.time % (Number(process.env.EVERY) || 3600) < 10) {
    const d = G.derive(S);
    console.log(`  [${hms(S.time)}] toilets=${t.toExponential(2)} mess/s=${d.messRate.toExponential(2)} clean/s=${d.cleanRate.toExponential(2)} income=${G.steadyIncome(S).toExponential(2)} bank=${S.pennies.toExponential(2)} garys=${G.garys(S).toExponential(2)} steves=${G.steves(S).toExponential(2)} steveMess=${G.derive(S).steveMessRate.toExponential(2)} garyClean=${G.derive(S).garyClean.toExponential(2)} cover=${(G.garyCover(S) * 100).toFixed(0)}% garyShare=${(G.derive(S).garyScrub / Math.max(1, G.derive(S).scrubRate) * 100).toFixed(1)}% price=${S.price.toFixed(2)} next=${target && target.label}@${target && target.cost.toExponential(2)}`);
  }
}
console.log(JSON.stringify(S.staff), JSON.stringify(S.garyDims), 'uncle', S.uncle, JSON.stringify(S.steveDims));
console.log(S.flags.ended ? `ENDED at ${hms(S.time)}` : `Did not finish in ${HOURS}h`);
if (spaceAt) console.log(`space: ${((S.time - spaceAt) / 60).toFixed(0)}m, ${spaceBuys} purchases, longest gap ${(longestGap / 60).toFixed(1)}m (from ${gapAt})`);
if (process.env.PROBE) {
  const d = G.derive(S), p0 = S.pennies;
  for (let i = 0; i < 100; i++) G.tick(S, 1);
  console.log({ claimed: G.steadyIncome(S).toExponential(2), actual: ((S.pennies - p0) / 100).toExponential(2), price: S.price, messes: S.messes.toExponential(2), cap: d.cap.toExponential(2), mess: d.messRate.toExponential(2), clean: d.cleanRate.toExponential(2), value: d.value.toExponential(2), royalty: S.royalty });
}
