'use strict';
// Everything on screen. Reads and writes the state through engine.js.

const SAVE_KEY = 'lees-business-save';
const $ = (id) => document.getElementById(id);

let S = freshState();
let bulk = 1;

// ---------- Numbers ----------
const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd'];
const LONG = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion',
  'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion'];

function fmt(n, long = false) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '−' + fmt(-n, long);
  if (n > 0 && n < 1) return (Math.floor(n * 100) / 100).toString();
  if (n < 100) return (Math.floor(n * 10) / 10).toLocaleString('en');
  if (n < 1e6) return Math.floor(n).toLocaleString('en');
  const e = Math.min(Math.floor(Math.log10(n) / 3), SHORT.length - 1);
  const v = n / Math.pow(10, e * 3);
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
  const num = (Math.floor(v * 10 ** digits) / 10 ** digits).toFixed(digits);
  return long ? `${num} ${LONG[e]}` : `${num}${SHORT[e]}`;
}

function fmtTime(secs) {
  secs = Math.floor(secs);
  const h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60, s = secs % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// ---------- Toasts and memos ----------
let toastTimer = 0;
function toast(html, ms = 4500) {
  const el = $('toast');
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function addMemo(memo, fresh) {
  const li = document.createElement('li');
  li.className = 'memo' + (fresh ? ' is-new' : '');
  const head = document.createElement('span');
  head.className = 'memo-head';
  head.textContent = 'Memo · from Lee';
  li.append(head, document.createTextNode(memo.text));
  $('memos').prepend(li);
}

function renderAllMemos() {
  $('memos').innerHTML = '';
  for (const id of S.memos) {
    const m = MEMOS.find(x => x.id === id);
    if (m) addMemo(m, false);
  }
}

// ---------- The toilet ----------
const fxLayer = $('fx');
let quipIndex = 0;

function spawnFx(x, y, text) {
  if (text) {
    const f = document.createElement('span');
    f.className = 'floater';
    f.textContent = text;
    f.style.left = `${x - 10}px`;
    f.style.top = `${y - 20}px`;
    fxLayer.append(f);
    setTimeout(() => f.remove(), 1000);
  }
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('span');
    b.className = 'bubble';
    b.style.left = `${x + (Math.random() * 40 - 20)}px`;
    b.style.top = `${y + (Math.random() * 20 - 10)}px`;
    b.style.setProperty('--dx', `${Math.random() * 40 - 20}px`);
    fxLayer.append(b);
    setTimeout(() => b.remove(), 700);
  }
}

function onScrub(e) {
  const r = scrub(S);
  const box = fxLayer.getBoundingClientRect();
  const x = e.clientX ? e.clientX - box.left : box.width / 2;
  const y = e.clientY ? e.clientY - box.top : box.height / 2;
  const t = $('toilet');
  t.classList.remove('is-hit');
  void t.offsetWidth;
  t.classList.add('is-hit');
  setTimeout(() => t.classList.remove('is-hit'), 90);

  if (r.idle) {
    const hint = $('toilet-hint');
    hint.textContent = CLEAN_QUIPS[quipIndex++ % CLEAN_QUIPS.length];
    hint.dataset.quipUntil = Date.now() + 2500;
    return;
  }
  spawnFx(x, y, r.cleaned ? `+${fmt(r.gained)}p` : '');
  checkMemos();
  render();
}

$('toilet').addEventListener('click', onScrub);
// Holding a key down shouldn't auto-scrub.
$('toilet').addEventListener('keydown', (e) => { if (e.repeat) e.preventDefault(); });

// ---------- Shop ----------
const rows = { staff: new Map(), contracts: new Map(), garys: new Map(), steves: new Map() };

function makeRow(kind, item) {
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'row';
  btn.innerHTML = `
    <span class="row-name"></span>
    <span class="row-count"></span>
    <span class="row-desc"></span>
    <span class="row-meta"><span class="row-cost"></span><span class="row-effect"></span></span>`;
  btn.addEventListener('click', () => buyBulk(kind, item));
  li.append(btn);
  const ref = {
    li, btn,
    name: btn.querySelector('.row-name'), count: btn.querySelector('.row-count'),
    desc: btn.querySelector('.row-desc'), cost: btn.querySelector('.row-cost'),
    effect: btn.querySelector('.row-effect'),
  };
  rows[kind].set(item.id, ref);
  return li;
}

function buildShop() {
  $('staff-list').append(...STAFF.map(st => makeRow('staff', st)));
  $('contract-list').append(...CONTRACTS.map(c => makeRow('contracts', c)));
  $('gary-list').append(...GARY_DIMENSIONS.map(g => makeRow('garys', g)));
  $('steve-list').append(...[UNCLE_STEVE, ...STEVE_DIMENSIONS].map(g => makeRow('steves', g)));
}

function ownedOf(kind, item) {
  if (kind === 'staff') return S.staff[item.id] || 0;
  if (kind === 'garys') return S.garyDims[item.id] || 0;
  if (kind === 'steves') return item.id === 'steve' ? S.uncle || 0 : S.steveDims[item.id] || 0;
  return S.contracts[item.id] || 0;
}

// The Steve tab is Uncle Steve himself, then his Dimensions.
const BUY = { staff: buyStaff, contracts: buyContract, garys: buyDim,
  steves: (S, item) => (item.id === 'steve' ? hireSteve(S) : buyDim(S, item)) };
const VISIBLE = { staff: staffVisible, contracts: contractVisible, garys: dimVisible,
  steves: (S, item) => (item.id === 'steve' ? steveVisible(S) : dimVisible(S, item)) };

// How many of an item the bulk setting would buy, and what that costs.
function bulkQuote(kind, item) {
  let n = bulk;
  if (kind === 'contracts') {
    if (contractBlock(S, item)) return { n: 0, cost: 0 };
    if (item.max) n = Math.min(n, item.max - (S.contracts[item.id] || 0));
    const left = item.space ? UNIVERSE_TOILETS - toilets(S) : EARTH_TOILETS - S.earthToilets;
    n = Math.max(1, Math.min(n, Math.ceil(left / contractToilets(S, item))));
  }
  const owned = ownedOf(kind, item);
  const growth = kind === 'staff' ? (item.growth || STAFF_GROWTH) : kind === 'contracts' ? CONTRACT_GROWTH : item.growth;
  let cost = 0;
  for (let i = 0; i < n; i++) cost += Math.ceil(item.cost * Math.pow(growth, owned + i));
  return { n, cost };
}

function buyBulk(kind, item) {
  const q = bulkQuote(kind, item);
  if (!q.n || S.pennies < q.cost) return;
  for (let i = 0; i < q.n; i++) {
    if (!BUY[kind](S, item)) break;
  }
  checkMemos();
  render();
}

function renderRows(kind, list, d) {
  let mysteryShown = false;
  for (const item of list) {
    const ref = rows[kind].get(item.id);
    // Earth is Gary's after the handover; only space is for sale.
    if (kind === 'contracts' && S.flags.space && !item.space) { ref.li.hidden = true; continue; }
    if (!VISIBLE[kind](S, item)) {
      // Show the next locked item as a silhouette; hide the rest, and all of space until it opens.
      const show = !mysteryShown && !(item.space && !S.flags.space) && !(item.sealed && !S.flags.sixth);
      mysteryShown = mysteryShown || show;
      ref.li.hidden = !show;
      if (show) {
        ref.btn.classList.add('is-mystery');
        ref.btn.disabled = true;
        ref.name.textContent = '???';
        ref.count.textContent = '';
        ref.desc.textContent = 'Keep earning to find out.';
        ref.cost.textContent = '';
        ref.effect.textContent = '';
      }
      continue;
    }
    ref.li.hidden = false;
    ref.btn.classList.remove('is-mystery');
    ref.name.textContent = item.name;
    let desc = item.desc;
    for (const [n, text] of item.descAt || []) if ((item.id === 'steve' ? steves(S) : garys(S)) >= n) desc = text;
    ref.desc.textContent = desc;
    let shown = ownedOf(kind, item);
    if (item.id === 'gary') shown = garys(S);
    if (item.id === 'steve') shown = steves(S);
    else if (kind === 'garys') shown = S.garyAmt[item.id] || 0;
    else if (kind === 'steves') shown = S.steveAmt[item.id] || 0;
    ref.count.textContent = shown ? fmt(shown) : '';

    if (item.id === 'steve') {
      ref.effect.textContent = `+1 toilet, ${fmt(BASE_MESS_RATE * d.messMult)} messes/s each · ${ownedOf(kind, item)} hired`;
    } else if (kind === 'garys' || kind === 'steves') {
      ref.effect.textContent = `${fmt(dimOutput(S, item, d))} ${item.makes}/s · ${ownedOf(kind, item)} bought`;
    } else if (kind === 'staff') {
      const each = item.rate * (d.one[item.id] || 1) * d.staffMult;
      ref.effect.textContent = `${fmt(each)} scrubs/s each`;
    } else {
      const per = contractToilets(S, item);
      ref.effect.textContent = `+${fmt(per)} toilet${per === 1 ? '' : 's'}`;
    }

    const blocked = kind === 'contracts' && contractBlock(S, item);
    ref.btn.classList.toggle('is-blocked', !!blocked);
    if (blocked) {
      ref.cost.textContent = blocked;
      ref.btn.disabled = true;
      continue;
    }
    const q = bulkQuote(kind, item);
    ref.cost.textContent = `${q.n > 1 ? `×${q.n} for ` : ''}${fmt(q.cost)}p`;
    ref.btn.disabled = S.pennies < q.cost;
  }
}

function fxText(u) {
  const fx = u.fx, out = [];
  if (fx.click) out.push(`Clicks ×${fx.click}`);
  if (fx.staff) out.push(`All staff ×${fx.staff}`);
  if (fx.mess) out.push(`Messes ×${fx.mess}`);
  if (fx.value) out.push(`Pennies per mess ×${fx.value}`);
  if (fx.clickPct) out.push(`Clicks +${Math.round(fx.clickPct * 100)}% of staff output`);
  if (fx.one) out.push(`${STAFF.find(s => s.id === fx.one.id).name} ×${fx.one.m}`);
  if (fx.garyDim) out.push(`Gary Dimensions ×${fx.garyDim}`);
  if (fx.steveDim) out.push(`Steve Dimensions ×${fx.steveDim}`);
  if (fx.toilets) out.push(`${CONTRACTS.find(c => c.id === fx.toilets.id).name}: toilets ×${fx.toilets.m}`);
  if (fx.flag) out.push('Changes everything');
  return out.join(' · ');
}

let upgradeKey = '';
const upgradeButtons = new Map();

function renderUpgrades() {
  const avail = UPGRADES.filter(u => upgradeAvailable(S, u)).sort((a, b) => a.cost - b.cost);
  const teased = UPGRADES.filter(u => upgradeTeased(S, u));
  const key = avail.map(u => u.id).join(',') + '|' + teased.map(u => `${u.id}:${u.needs(S)}`).join(',');
  if (key !== upgradeKey) {
    upgradeKey = key;
    upgradeButtons.clear();
    const list = $('upgrade-list');
    list.innerHTML = '';
    for (const u of avail) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'upgrade';
      btn.innerHTML = `<span class="chip" data-cat="${u.cat}">${CATEGORIES[u.cat]}</span>
        <span class="row-name"></span><span class="row-desc"></span>
        <span class="upgrade-effect"></span><span class="row-cost"></span>`;
      btn.querySelector('.row-name').textContent = u.name;
      btn.querySelector('.row-desc').textContent = u.desc;
      btn.querySelector('.upgrade-effect').textContent = fxText(u);
      btn.querySelector('.row-cost').textContent = `${fmt(u.cost)}p`;
      btn.addEventListener('click', () => {
        if (!buyUpgrade(S, u)) return;
        if (u.fx.flag === 'ended') showEnding();
        if (u.fx.flag === 'space') toast("<strong>Earth is Gary's now.</strong> He kept the till. Your first space toilet is in Contracts.", 7000);
        checkMemos();
        render();
      });
      li.append(btn);
      list.append(li);
      upgradeButtons.set(u.id, { btn, u });
    }
    for (const u of teased) {
      const li = document.createElement('li');
      const card = document.createElement('div');
      card.className = 'upgrade is-teased';
      card.innerHTML = `<span class="chip" data-cat="${u.cat}">${CATEGORIES[u.cat]}</span>
        <span class="row-name"></span><span class="row-desc"></span><span class="upgrade-needs"></span>`;
      card.querySelector('.row-name').textContent = u.name;
      card.querySelector('.row-desc').textContent = u.desc;
      card.querySelector('.upgrade-needs').textContent = u.needs(S);
      li.append(card);
      list.append(li);
    }
    $('upgrade-empty').hidden = avail.length + teased.length > 0;
    const owned = UPGRADES.filter(u => S.upgrades[u.id]);
    $('owned-count').textContent = `(${owned.length})`;
    $('owned-list').innerHTML = '';
    for (const u of owned) {
      const li = document.createElement('li');
      li.textContent = u.name;
      li.title = fxText(u);
      $('owned-list').append(li);
    }
  }
  let affordable = 0;
  for (const { btn, u } of upgradeButtons.values()) {
    btn.disabled = S.pennies < u.cost;
    if (!btn.disabled) affordable++;
  }
  $('upgrade-badge').hidden = affordable === 0;
  $('upgrade-badge').textContent = affordable;
}

// Tabs
const TABS = ['staff', 'contracts', 'upgrades', 'garys', 'steves'];
for (const t of TABS) {
  $(`tab-${t}`).addEventListener('click', () => {
    for (const o of TABS) {
      $(`tab-${o}`).setAttribute('aria-selected', String(o === t));
      $(`panel-${o}`).hidden = o !== t;
    }
  });
}
for (const b of document.querySelectorAll('.bulk-btn')) {
  b.addEventListener('click', () => {
    bulk = Number(b.dataset.bulk);
    for (const o of document.querySelectorAll('.bulk-btn')) o.setAttribute('aria-pressed', String(o === b));
    render();
  });
}

// ---------- Milestones ----------
let pipKey = '';
let reachedCount = -1;   // -1 until the first render, so loading a save doesn't toast

function renderTerritory() {
  const space = !!S.flags.space;
  const list = MILESTONES.filter(m => !!m.space === space);
  const count = space ? S.spaceToilets : S.earthToilets;
  const next = list.find(m => count < m.at);

  $('territory-label').textContent = space ? 'Toilets in space under contract' : 'Toilets on Earth under contract';
  $('territory-count').innerHTML = `<span class="mono">${fmt(count, true)}</span>`;
  $('territory-next').innerHTML = next
    ? `<span>Next: <strong></strong></span><span class="mono">${fmt(count)} / ${fmt(next.at)}</span>`
    : '<span><strong>All of them.</strong></span>';
  if (next) $('territory-next').querySelector('strong').textContent = next.name;
  $('territory-bar').style.width = `${next ? Math.min(100, count / next.at * 100) : 100}%`;
  $('territory-reward').textContent = next ? `Reward: ${next.reward}` : (space ? '' : 'Gary takes over once there is a free Gary at every toilet. See Upgrades.');
  const st = space ? 0 : steves(S);
  $('territory-steve').hidden = st < 1;
  $('territory-steve').textContent = `Plus ${fmt(st, true)} of Uncle Steve's toilets. They are not on any map.`;

  const key = list.map(m => (count >= m.at ? 1 : 0)).join('') + space;
  if (key !== pipKey) {
    pipKey = key;
    const pips = $('pips');
    pips.innerHTML = '';
    for (const m of list) {
      const li = document.createElement('li');
      li.className = count >= m.at ? 'is-reached' : m === next ? 'is-next' : '';
      li.title = `${m.name}: ${fmt(m.at, true)} toilets`;
      pips.append(li);
    }
  }

  const n = MILESTONES.filter(m => reached(S, m.id)).length;
  if (reachedCount >= 0 && n > reachedCount) {
    const m = MILESTONES.filter(x => reached(S, x.id)).pop();
    toast(`<strong>${m.name}.</strong> ${m.reward}`, 6000);
  }
  reachedCount = n;
}

// ---------- Door price ----------
$('door-dial').addEventListener('input', (e) => {
  const r = priceRange(S);
  S.price = Math.min(r.max, Math.max(r.min, Number(e.target.value) / 100));
  render();
});

function renderDoor(d) {
  const r = priceRange(S);
  $('door').hidden = r.min === 0 && r.max === 0;
  if ($('door').hidden) return;
  const dial = $('door-dial');
  dial.min = Math.round(r.min * 100);
  dial.max = Math.round(r.max * 100);
  if (document.activeElement !== dial) dial.value = Math.round(S.price * 100);

  const pct = Math.round(Math.abs(S.price) * 100);
  const foot = footfall(S.price);
  const flow = Math.min(d.messRate, d.cleanRate) * d.value * Math.abs(S.price);
  $('door-pct').textContent = S.price > 0 ? `Charge ${pct}%` : S.price < 0 ? `Pay ${pct}%` : 'Free';
  $('door-note').textContent =
    S.price > 0 ? `Visitors pay ${pct}% of the cleaning fee to get in. Footfall ×${foot.toFixed(2)}. Takings ${fmt(flow)}/s.`
    : S.price < 0 ? `We pay each visitor ${pct}% of the cleaning fee. Footfall ×${foot.toFixed(1)}. Costs ${fmt(flow)}/s.`
    : 'Free entry. People come anyway, out of necessity.';

  // Like unsold stock: a full queue means you could charge more, an idle staff means you charge too much.
  const hint = $('door-hint');
  if (d.messRate > d.cleanRate * 1.03) {
    hint.dataset.state = 'full';
    hint.textContent = S.price >= r.max ? 'The queue is out the door, and you are already charging the most you can.' : 'The queue is out the door. You could charge more.';
  } else if (d.messRate < d.cleanRate * 0.97) {
    hint.dataset.state = 'idle';
    hint.textContent = S.price <= r.min
      ? (S.flags.poo ? 'Your staff are waiting for customers, even at the biggest bounty.' : 'Your staff are waiting for customers. Pay-Per-Poo would let you pay people to come.')
      : 'Your staff are waiting for customers. Lower the price.';
  } else {
    hint.dataset.state = 'ok';
    hint.textContent = 'Visitors match what your staff can clean. This is the sweet spot, for now.';
  }
}

// ---------- Rendering ----------
function render() {
  const d = derive(S);
  const t = d.toilets;

  $('pennies').textContent = fmt(S.pennies, true);
  $('income').textContent = fmt(steadyIncome(S, d));

  const buffs = $('buffs');
  buffs.innerHTML = '';
  for (const b of S.buffs) {
    const li = document.createElement('li');
    li.textContent = `${b.name} · ${Math.ceil(b.until - S.time)}s`;
    buffs.append(li);
  }

  // Toilet look follows the backlog.
  const dirt = Math.min(1, S.messes / d.cap);
  $('grime').style.opacity = S.messes >= 1 ? Math.min(1, 0.25 + dirt * 1.5) : 0;
  $('stink').style.opacity = dirt > 0.35 ? 1 : 0;
  $('flies').style.opacity = dirt > 0.6 ? 1 : 0;
  $('sparkle').style.opacity = S.messes < 1 ? 1 : 0;

  const hint = $('toilet-hint');
  if (!hint.dataset.quipUntil || Date.now() > Number(hint.dataset.quipUntil)) {
    if (S.flags.space && !S.spaceToilets) hint.textContent = 'You have no toilets. You have a rocket, and a lot of staff.';
    else if (S.flags.space && S.spaceToilets === 1) hint.textContent = 'One toilet. In space. It has a fan.';
    else if (S.messes < 1) hint.textContent = 'Spotless. Waiting for the next customer.';
    else if (!d.scrubRate) hint.textContent = 'Click the toilet to scrub it.';
    else if (dirt > 0.9) hint.textContent = 'The queue is out the door. People are considering the bushes.';
    else hint.textContent = 'Your staff are on it. You can still help.';
  }

  $('scrub-bar').style.width = `${Math.min(100, (S.progress / SCRUB_PER_MESS) * 100)}%`;
  $('scrub-text').textContent = `${fmt(Math.min(S.progress, SCRUB_PER_MESS))} / ${SCRUB_PER_MESS} · ${fmt(d.clickPower)} per click`;
  $('backlog-bar').style.width = `${dirt * 100}%`;
  $('backlog-text').textContent = `${fmt(S.messes)} / ${fmt(d.cap)}`;

  $('mess-rate').textContent = `${fmt(d.messRate)}/s`;
  $('clean-rate').textContent = `${fmt(d.cleanRate)}/s`;
  $('value').textContent = `${fmt(d.value)}p`;
  $('royalty-row').hidden = !S.royalty;
  $('steve-row').hidden = !d.steveToilets;
  $('steve-flow').textContent = `${fmt(d.steveClean)} of ${fmt(d.steveMessRate)}/s`;
  $('contracts-intro').textContent = S.flags.space
    ? "Earth's toilets belong to Gary now. Everything out there is still up for grabs."
    : 'More toilets under contract means more messes, and more messes means more money.';
  $('royalty').textContent = `${fmt(S.royalty)}/s`;
  const v = $('verdict');
  if (!d.scrubRate) { v.dataset.state = 'solo'; v.textContent = 'It is just you and the brush. Hire some help.'; }
  else if (d.cleanRate < d.messRate * 0.9) { v.dataset.state = 'grime'; v.textContent = S.flags.coinslot ? 'The grime is winning. Hire more staff, or charge more at the door.' : 'The grime is winning. Hire more staff.'; }
  else if (d.messRate < d.cleanRate * 0.9) { v.dataset.state = 'idle'; v.textContent = S.flags.coinslot ? 'Your staff are standing around. Buy toilets or beans, or lower the door price.' : 'Your staff are standing around. They need more mess: buy toilets, or beans.'; }
  else { v.dataset.state = 'balanced'; v.textContent = 'Perfectly balanced, as all toilets should be.'; }

  renderTerritory();

  renderDoor(d);

  renderRows('staff', STAFF, d);
  renderRows('contracts', CONTRACTS, d);
  renderUpgrades();
  renderGarys(d);
  renderSteves(d);

  $('st-cleaned').textContent = fmt(S.cleaned);
  $('st-manual').textContent = fmt(S.manualCleaned);
  $('st-clicks').textContent = fmt(S.clicks);
  $('st-total').textContent = fmt(S.totalPennies);
  $('st-plungers').textContent = S.plungers ? `${S.plungers} (+${S.plungers * 100}% pennies)` : '0';
  $('st-time').textContent = fmtTime(S.time);
  $('flush-row').hidden = !S.flags.ended;
}

function renderGarys(d) {
  $('tab-garys').hidden = !S.flags.garydim;
  // The wall grout turns purple from a million Garys onward.
  const level = d.garyCount > 1e6 ? Math.min(1, Math.log10(d.garyCount / 1e6) / 12) : 0;
  document.documentElement.style.setProperty('--gary-level', level.toFixed(3));
  if (!S.flags.garydim) return;
  renderRows('garys', GARY_DIMENSIONS, d);
  const perSec = dimOutput(S, GARY_DIMENSIONS[0], d);
  const share = d.scrubRate ? Math.round(d.garyScrub / d.scrubRate * 100) : 0;
  $('gary-summary').innerHTML = `There are <strong>${fmt(d.garyCount, true)}</strong> Garys, and <strong>${fmt(perSec, true)}</strong> more every second. They do <strong>${share}%</strong> of your cleaning. Cupboard Garys bring their own brushes, so Supplies upgrades don't help them. Gary upgrades do.`;
}

function renderSteves(d) {
  $('tab-steves').hidden = !S.flags.garydim;
  if (!S.flags.garydim) return;
  const sum = $('steve-summary');
  if (S.flags.space) {
    $('steve-list').hidden = true;
    sum.innerHTML = `Uncle Steve stayed on Earth with Gary, with all <strong>${fmt(steves(S), true)}</strong> of him. He sends postcards. They are of toilets.`;
    return;
  }
  $('steve-list').hidden = false;
  renderRows('steves', [UNCLE_STEVE, ...STEVE_DIMENSIONS], d);
  const busy = d.garyClean ? Math.min(100, Math.round(d.steveClean / d.garyClean * 100)) : 0;
  const flood = d.steveMessRate > d.garyClean
    ? ' The Garys cannot keep up. Steve does not mind. Our own toilets do.'
    : '';
  const gate = S.earthToilets >= EARTH_TOILETS
    ? ` Gary will take Earth when there is a free Gary for every toilet: <strong>${Math.floor(garyCover(S) * 100)}%</strong> there.`
    : '';
  sum.innerHTML = `There are <strong>${fmt(steves(S), true)}</strong> Steves, each with a toilet. <strong>${busy}%</strong> of the Garys' cleaning goes on Steve.${flood}${gate}`;
}

function checkMemos() {
  for (const m of newMemos(S)) addMemo(m, true);
}

// ---------- Headlines ----------
// Past a million Garys, the news starts to slip.
function garyify(text) {
  const n = garys(S);
  if (n < 1e6 || /Gary/.test(text) || Math.random() > Math.min(0.6, Math.log10(n) / 25)) return text;
  const words = text.split(' ');
  const idx = words.map((w, i) => (/^[A-Za-z]{4,}/.test(w) ? i : -1)).filter(i => i >= 0);
  if (!idx.length) return text;
  const i = idx[Math.floor(Math.random() * idx.length)];
  words[i] = words[i].replace(/^[A-Za-z']+/, w => (w[0] === w[0].toUpperCase() ? 'Gary' : 'gary'));
  return words.join(' ');
}

let headline = HEADLINES[0].t;
function rotateHeadline() {
  const pool = HEADLINES.filter(h => (!h.when || h.when(S)) && h.t !== headline);
  // Favour headlines from later in the game; they're the ones that are new.
  const pick = pool[Math.floor(Math.pow(Math.random(), 0.6) * pool.length)];
  if (!pick) return;
  headline = garyify(pick.t);
  const el = $('ticker');
  el.classList.add('is-fading');
  setTimeout(() => { el.textContent = headline; el.classList.remove('is-fading'); }, 400);
}

// ---------- Golden Throne ----------
let throneAt = performance.now() + 90e3;
let throneEffect = null;
let throneHide = 0;

function maybeSpawnThrone(now) {
  const g = $('golden');
  if (!g.hidden || now < throneAt || !reached(S, 'flat')) return;
  throneEffect = pickThrone();
  g.style.left = `${8 + Math.random() * 80}vw`;
  g.style.top = `${12 + Math.random() * 70}vh`;
  g.hidden = false;
  clearTimeout(throneHide);
  throneHide = setTimeout(() => { g.hidden = true; scheduleThrone(); }, 13e3);
}

function scheduleThrone() {
  throneAt = performance.now() + (90 + Math.random() * 150) * 1000;
}

$('golden').addEventListener('click', () => {
  $('golden').hidden = true;
  clearTimeout(throneHide);
  const gain = claimThrone(S, throneEffect);
  toast(`<strong>${throneEffect.name}!</strong> ${throneEffect.text}${gain ? ` +${fmt(gain, true)} pennies.` : ''}`);
  scheduleThrone();
  render();
});

// ---------- Ending ----------
function showEnding() {
  $('modal-title').textContent = 'The Last Toilet Is Clean';
  const body = $('modal-body');
  body.innerHTML = '';
  const lines = [
    'Lee unlocks the door of the last toilet in the universe. Gary is sitting on it, reading a magazine.',
    '"Oh," says Gary. "You\'re here. I kept it clean for you." He stands, folds the magazine, and hands Lee the brush. It is a sock on a stick.',
    'Lee cleans the last toilet. It takes eleven seconds. Every toilet in the observable universe gleams. Somewhere, very far away, a fly lands on a rim, looks around, and leaves again, disappointed.',
    `You cleaned ${fmt(S.cleaned, true)} toilets, ${fmt(S.manualCleaned, true)} of them by hand, in ${fmtTime(S.time)}. You earned ${fmt(S.totalPennies, true)} pennies. You hired ${fmt(S.staff.gary || 0)} Garys. There are ${fmt(garys(S), true)}.${steves(S) >= 1 ? ` There are also ${fmt(steves(S), true)} Uncle Steves, on Earth, on no map.` : ''}`,
    'Memo · from Lee: "There is nothing left to clean. I find this unbearable. Gary says he knows a cupboard where we can start again."',
  ];
  for (const text of lines) {
    const p = document.createElement('p');
    p.textContent = text;
    body.append(p);
  }
  const actions = $('modal-actions');
  actions.innerHTML = '';
  const flush = document.createElement('button');
  flush.className = 'btn btn-primary';
  flush.type = 'button';
  flush.textContent = `The Great Flush (start over, +100% pennies forever)`;
  flush.addEventListener('click', greatFlush);
  const stay = document.createElement('button');
  stay.className = 'btn';
  stay.type = 'button';
  stay.textContent = 'Admire the clean universe';
  stay.addEventListener('click', () => { $('modal').hidden = true; });
  actions.append(flush, stay);
  $('modal').hidden = false;
  flush.focus();
}

function greatFlush() {
  S = restart(S);
  reachedCount = -1;
  $('modal').hidden = true;
  upgradeKey = '';
  renderAllMemos();
  checkMemos();
  save();
  render();
  toast(`<strong>The Great Flush.</strong> Everything is gone, except your Golden Plungers (${S.plungers}).`);
}

// ---------- Saving ----------
function save() {
  try {
    localStorage.setItem(SAVE_KEY, serialize(S));
    $('save-note').textContent = `Saved at ${new Date().toLocaleTimeString()}.`;
  } catch {
    $('save-note').textContent = 'Could not save: this browser is blocking storage. Use Export to keep a copy.';
  }
}

function load() {
  let text = null;
  try { text = localStorage.getItem(SAVE_KEY); } catch { /* storage blocked: start fresh */ }
  if (!text) return;
  try {
    S = deserialize(text);
  } catch (err) {
    toast(`Your save could not be loaded. ${err.message} Starting fresh.`);
    S = freshState();
    return;
  }
  const away = offlineProgress(S, (Date.now() - S.savedAt) / 1000);
  if (away) {
    const more = away.newGarys >= 1 ? ` The cupboards made <strong>${fmt(away.newGarys, true)}</strong> new Garys. Nobody saw them come out.` : '';
    toast(`While you were away for ${fmtTime(away.secs)}, your staff cleaned <strong>${fmt(away.cleans, true)}</strong> toilets and earned <strong>${fmt(away.gained, true)}</strong> pennies.${more}`, 8000);
  }
}

const exportText = () => btoa(unescape(encodeURIComponent(serialize(S))));
const importText = (t) => deserialize(decodeURIComponent(escape(atob(t.trim()))));

let ioMode = 'export';
function openIo(mode) {
  ioMode = mode;
  $('reset-panel').hidden = true;
  $('io-panel').hidden = false;
  $('io-msg').textContent = '';
  if (mode === 'export') {
    $('io-label').textContent = 'Your save. Copy it somewhere safe.';
    $('io-text').value = exportText();
    $('io-action').textContent = 'Copy';
  } else {
    $('io-label').textContent = 'Paste a save here';
    $('io-text').value = '';
    $('io-action').textContent = 'Load this save';
  }
  $('io-text').focus();
  if (mode === 'export') $('io-text').select();
}

$('btn-save').addEventListener('click', save);
$('btn-export').addEventListener('click', () => openIo('export'));
$('btn-import').addEventListener('click', () => openIo('import'));
$('io-close').addEventListener('click', () => { $('io-panel').hidden = true; });
$('io-action').addEventListener('click', () => {
  if (ioMode === 'export') {
    const text = $('io-text').value;
    navigator.clipboard.writeText(text)
      .then(() => { $('io-msg').textContent = 'Copied.'; })
      .catch(() => { $('io-text').select(); $('io-msg').textContent = 'Copying was blocked. The text is selected; copy it by hand.'; });
    return;
  }
  try {
    S = importText($('io-text').value);
    reachedCount = -1;
    upgradeKey = '';
    renderAllMemos();
    save();
    render();
    $('io-panel').hidden = true;
    toast('Save loaded.');
  } catch {
    $('io-msg').textContent = 'That does not look like a save from this game. Check you copied all of it.';
  }
});

$('btn-reset').addEventListener('click', () => { $('io-panel').hidden = true; $('reset-panel').hidden = false; });
$('reset-no').addEventListener('click', () => { $('reset-panel').hidden = true; });
$('reset-yes').addEventListener('click', () => {
  S = freshState();
  reachedCount = -1;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to remove */ }
  $('reset-panel').hidden = true;
  upgradeKey = '';
  renderAllMemos();
  checkMemos();
  render();
  toast('Wiped. Lee hands you a sock on a stick.');
});

// A Great Flush button in the filing cabinet, for when you closed the ending.
(() => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary';
  btn.id = 'flush-row';
  btn.textContent = 'The Great Flush';
  btn.hidden = true;
  btn.addEventListener('click', showEnding);
  document.querySelector('.office .admin').append(btn);
})();

// ---------- Main loop ----------
let last = performance.now();
let lastRender = 0;
let lastMemoCheck = 0;

function step() {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 60) {
    // The tab was asleep. Treat it like time away.
    const away = offlineProgress(S, dt);
    if (away) toast(`Back already? Your staff cleaned <strong>${fmt(away.cleans, true)}</strong> toilets while you were gone.`);
  } else if (dt > 0) {
    tick(S, dt);
  }
  if (now - lastMemoCheck > 1000) { lastMemoCheck = now; checkMemos(); }
  maybeSpawnThrone(now);
}

function frame(now) {
  if (now - lastRender > 100) { lastRender = now; render(); }
  requestAnimationFrame(frame);
}

load();
buildShop();
renderAllMemos();
checkMemos();
render();
setInterval(step, 100);
setInterval(rotateHeadline, 12e3);
setInterval(save, 15e3);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
