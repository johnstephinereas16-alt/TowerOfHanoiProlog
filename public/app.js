// Tower of Hanoi - click a peg to pick up a disk, click another peg to drop it.
// Wrong move = not allowed (the disk goes back). "Auto Solve" asks the server and animates the answer.

const TOWER_IDS = ['a', 'b', 'c'];
const DISK_UNIT = 26;   // same as --disk-unit
const BASE_H = 14;      // same as --base-height
const PEG_HEIGHT = 260; // same as --peg-height
const NORMAL_MS = 350;
const LIFT_Y = BASE_H + PEG_HEIGHT;

const COLORS = ['#e63946', '#f77f00', '#f4c430', '#4caf50', '#00b894',
                '#00b4d8', '#4361ee', '#7b61ff', '#d63384', '#8d6e63'];

const boardEl = document.getElementById('board');
const disksInput = document.getElementById('disks');
const newBtn = document.getElementById('newBtn');
const solveBtn = document.getElementById('solveBtn');
const skipBtn = document.getElementById('skipBtn');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const traceEl = document.getElementById('trace');

let towers = { a: [], b: [], c: [] };
let diskEls = new Map();
let diskCount = 3;
let moves = 0;
let selected = null;
let busy = false;
let locked = false;

const stepMs = NORMAL_MS;  // time of one animation step
let skipping = false;    // true when the user pressed Skip

const wait = ms => new Promise(r => setTimeout(r, ms));
const sizeOf = id => parseInt(id.slice(1), 10);
const topOf = t => towers[t][towers[t].length - 1];
const minMoves = n => Math.pow(2, n) - 1;
const towerEl = id => document.querySelector(`[data-tower="${id}"]`);
const say = text => { statusEl.textContent = text; };

// ---------- move tracer ----------
function clearTrace() { traceEl.innerHTML = ''; }

function addTrace(from, to, bad) {
  const prev = traceEl.querySelector('.now');
  if (prev) prev.classList.remove('now');
  const li = document.createElement('li');
  li.textContent = `${from.toUpperCase()} \u2192 ${to.toUpperCase()}` + (bad ? '  (wrong)' : '');
  li.className = bad ? 'bad' : 'now';
  traceEl.appendChild(li);
  traceEl.scrollTop = traceEl.scrollHeight;
}

function setDuration(ms) {
  document.documentElement.style.setProperty('--move-duration', ms + 'ms');
}

function pegCenterX(t) {
  const tr = towerEl(t).getBoundingClientRect();
  const br = boardEl.getBoundingClientRect();
  return tr.left - br.left + tr.width / 2;
}

function positionFor(t, diskId, index) {
  const width = parseFloat(diskEls.get(diskId).style.width);
  return { left: pegCenterX(t) - width / 2, bottom: BASE_H + index * DISK_UNIT };
}

function applyWidths() {
  const towerW = towerEl('a').getBoundingClientRect().width;
  const minW = towerW < 120 ? 30 : 50;
  const step = diskCount > 1 ? Math.min(14, (towerW - 10 - minW) / (diskCount - 1)) : 0;
  for (const [id, el] of diskEls) {
    el.style.width = (minW + (sizeOf(id) - 1) * step) + 'px';
  }
}

function updateHud() {
  movesEl.textContent = moves;
  bestEl.textContent = minMoves(diskCount);
}

function setupTowers(n) {
  document.querySelectorAll('.disk').forEach(el => el.remove());
  towers = { a: [], b: [], c: [] };
  diskEls = new Map();
  diskCount = n;
  for (let size = n; size >= 1; size--) {
    const id = 'd' + size;
    const el = document.createElement('div');
    el.className = 'disk';
    el.style.background = COLORS[(size - 1) % COLORS.length];
    boardEl.appendChild(el);
    diskEls.set(id, el);
    towers.a.push(id);
  }
  applyWidths();
  renderAll();
}

function renderAll() {
  for (const t of TOWER_IDS) {
    towers[t].forEach((id, idx) => {
      const { left, bottom } = positionFor(t, id, idx);
      const el = diskEls.get(id);
      el.style.left = left + 'px';
      el.style.bottom = (selected === t && idx === towers[t].length - 1 ? LIFT_Y : bottom) + 'px';
    });
  }
}

function clearSelection() {
  document.querySelectorAll('.tower.selected').forEach(t => t.classList.remove('selected'));
  selected = null;
}

function readDiskCount() {
  let n = parseInt(disksInput.value, 10);
  if (!n || n < 1) n = 3;
  if (n > 10) n = 10;
  disksInput.value = n;
  return n;
}

function startGame(n = readDiskCount()) {
  disksInput.value = n;
  clearSelection();
  overlayEl.classList.add('hidden');
  overlayEl.innerHTML = '';
  moves = 0;
  busy = false;
  locked = false;
  setDuration(NORMAL_MS);
  clearTrace();
  setupTowers(n);
  updateHud();
  say('Move all disks to peg 3.');
}

// ---------- playing ----------
async function onTowerClick(id) {
  if (busy || locked) return;

  if (selected === null) {
    if (!towers[id].length) { say('That peg is empty.'); return; }
    selected = id;
    diskEls.get(topOf(id)).style.bottom = LIFT_Y + 'px';
    towerEl(id).classList.add('selected');
    say('Now click where to drop it.');
    return;
  }

  if (selected === id) {
    diskEls.get(topOf(id)).style.bottom = (BASE_H + (towers[id].length - 1) * DISK_UNIT) + 'px';
    clearSelection();
    say('');
    return;
  }

  await tryMove(selected, id);
}

async function tryMove(from, to) {
  busy = true;
  const diskId = topOf(from);
  const diskEl = diskEls.get(diskId);
  const destTop = topOf(to);

  if (destTop && sizeOf(diskId) > sizeOf(destTop)) {
    addTrace(from, to, true);
    diskEl.classList.add('shake');
    towerEl(to).classList.add('wrong');
    say('Wrong move! Big disk cannot go on a small disk.');
    await wait(450);
    diskEl.classList.remove('shake');
    towerEl(to).classList.remove('wrong');
    diskEl.style.bottom = (BASE_H + (towers[from].length - 1) * DISK_UNIT) + 'px';
    clearSelection();
    await wait(NORMAL_MS);
    busy = false;
    return;
  }

  towers[from].pop();
  towerEl(from).classList.remove('selected');
  selected = null;

  const { left, bottom } = positionFor(to, diskId, towers[to].length);
  diskEl.style.left = left + 'px';
  await wait(NORMAL_MS);
  towers[to].push(diskId);
  diskEl.style.bottom = bottom + 'px';
  await wait(NORMAL_MS);

  moves++;
  updateHud();
  addTrace(from, to, false);
  say('Good move!');
  if (towers.c.length === diskCount) win();
  busy = false;
}

function showOverlay(html) {
  overlayEl.innerHTML = html;
  overlayEl.classList.remove('hidden');
}

function win() {
  locked = true;
  say('You solved it!');
  showOverlay('<div class="card"><h2>You Win!</h2>' +
    `<p>${moves} moves (best: ${minMoves(diskCount)})</p>` +
    '<button data-action="again">Play Again</button>' +
    (diskCount < 10 ? '<button data-action="next">Next Level</button>' : '') +
    '</div>');
}

// ---------- Prolog solver ----------
async function animateMove(from, to) {
  const diskId = towers[from].pop();
  const diskEl = diskEls.get(diskId);
  const { left, bottom } = positionFor(to, diskId, towers[to].length);

  diskEl.style.bottom = LIFT_Y + 'px';   // lift
  await wait(stepMs);
  diskEl.style.left = left + 'px';       // slide
  await wait(stepMs);
  towers[to].push(diskId);
  diskEl.style.bottom = bottom + 'px';   // drop
  await wait(stepMs);
}

async function solve() {
  if (busy) return;
  const n = readDiskCount();
  startGame(n);
  busy = true;
  locked = true;
  skipping = false;
  newBtn.disabled = true;
  solveBtn.disabled = true;
  disksInput.disabled = true;
  skipBtn.disabled = false;
  setDuration(stepMs);
  say('Asking Prolog...');

  try {
    const res = await fetch('/solve?disks=' + n);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const list = data.moves;
    const total = list.length;
    let i = 0;

    for (; i < total && !skipping; i++) {
      await animateMove(list[i].from, list[i].to);
      moves = i + 1;
      updateHud();
      addTrace(list[i].from, list[i].to, false);
      say(`Prolog is solving: ${moves} / ${total}`);
    }

    // Skip pressed: finish the rest instantly
    if (skipping && i < total) {
      for (; i < total; i++) {
        towers[list[i].to].push(towers[list[i].from].pop());
        addTrace(list[i].from, list[i].to, false);
      }
      moves = total;
      updateHud();
      boardEl.classList.add('no-anim');
      renderAll();
      void boardEl.offsetWidth;
      boardEl.classList.remove('no-anim');
    }
    say(`Prolog solved it in ${total} moves. Press New Game to play.`);
  } catch (err) {
    say('Error: ' + err.message);
    console.error(err);
  } finally {
    busy = false;
    setDuration(NORMAL_MS);
    newBtn.disabled = false;
    solveBtn.disabled = false;
    disksInput.disabled = false;
    skipBtn.disabled = true;
  }
}

// ---------- events ----------
document.querySelectorAll('.tower').forEach(t => {
  t.addEventListener('click', () => onTowerClick(t.dataset.tower));
});

overlayEl.addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'again') startGame(diskCount);
  if (action === 'next') startGame(Math.min(10, diskCount + 1));
});

skipBtn.addEventListener('click', () => { skipping = true; });
newBtn.addEventListener('click', () => { if (!busy) startGame(); });
solveBtn.addEventListener('click', solve);
disksInput.addEventListener('change', () => { if (!busy) startGame(); });

window.addEventListener('keydown', e => {
  if (e.target === disksInput) return;
  const map = { '1': 'a', '2': 'b', '3': 'c' };
  if (map[e.key]) onTowerClick(map[e.key]);
});

window.addEventListener('resize', () => { applyWidths(); renderAll(); });

startGame(3);
