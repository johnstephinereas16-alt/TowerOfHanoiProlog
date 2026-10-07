// ============================================================
//  Tower of Hanoi — frontend animation
//  All positions are computed in BOARD-space.
//  Base sits at bottom: 0 inside .board.
//  Disks sit at  bottom: BASE_H + index * DISK_UNIT.
// ============================================================

const TOWER_IDS  = ['a', 'b', 'c'];
const DISK_UNIT  = 28;   // must match --disk-unit
const BASE_H     = 18;   // must match --base-height
const PEG_HEIGHT = 260;  // must match --peg-height
const MOVE_MS    = 350;  // must match --move-duration
const LIFT_Y     = BASE_H + PEG_HEIGHT;  // top of the peg

const boardEl    = document.querySelector('.board');
const disksInput = document.getElementById('disks');
const solveBtn   = document.getElementById('solveBtn');
const statusEl   = document.getElementById('status');

let towers  = { a: [], b: [], c: [] };
let diskEls = new Map();
let animating = false;

// Neon arcade palette — one per disk size (index 0 = smallest disk)
const DISK_STYLES = [
  { fill: 'linear-gradient(180deg, #ff8a8a 0%, #e63946 100%)', glow: 'rgba(230,57,70,0.55)'  },
  { fill: 'linear-gradient(180deg, #ffb26b 0%, #f77f00 100%)', glow: 'rgba(247,127,0,0.55)'  },
  { fill: 'linear-gradient(180deg, #ffe066 0%, #f4c430 100%)', glow: 'rgba(244,196,48,0.55)' },
  { fill: 'linear-gradient(180deg, #b7f07a 0%, #4caf50 100%)', glow: 'rgba(76,175,80,0.55)'  },
  { fill: 'linear-gradient(180deg, #7ff0c6 0%, #00b894 100%)', glow: 'rgba(0,184,148,0.55)'  },
  { fill: 'linear-gradient(180deg, #7ad7f0 0%, #00b4d8 100%)', glow: 'rgba(0,180,216,0.55)'  },
  { fill: 'linear-gradient(180deg, #8ab6ff 0%, #4361ee 100%)', glow: 'rgba(67,97,238,0.55)'  },
  { fill: 'linear-gradient(180deg, #b8a1ff 0%, #7b61ff 100%)', glow: 'rgba(123,97,255,0.55)' },
  { fill: 'linear-gradient(180deg, #ff9bd9 0%, #d63384 100%)', glow: 'rgba(214,51,132,0.55)' },
  { fill: 'linear-gradient(180deg, #ff9ec7 0%, #ff2d95 100%)', glow: 'rgba(255,45,149,0.55)' },
];

function towerEl(id) {
  return document.querySelector(`[data-tower="${id}"]`);
}

// Center of a tower's base, in board-relative coordinates.
function pegCenterX(towerId) {
  const towerRect = towerEl(towerId).getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  return (towerRect.left - boardRect.left) + towerRect.width / 2;
}

function positionFor(towerId, diskId, index) {
  const el    = diskEls.get(diskId);
  const width = parseFloat(el.style.width);
  const left   = pegCenterX(towerId) - width / 2;
  const bottom = BASE_H + index * DISK_UNIT;
  return { left, bottom };
}

function setupTowers(n) {
  document.querySelectorAll('.disk').forEach(el => el.remove());
  towers  = { a: [], b: [], c: [] };
  diskEls = new Map();

  for (let size = n; size >= 1; size--) {
    const id    = `d${size}`;
    const style = DISK_STYLES[(size - 1) % DISK_STYLES.length];

    const el = document.createElement('div');
    el.className = 'disk';
    el.style.width      = `${60 + size * 18}px`;
    el.style.background = style.fill;
    el.style.setProperty('--glow', style.glow);
    el.dataset.disk = id;

    boardEl.appendChild(el);
    diskEls.set(id, el);
    towers.a.push(id);
  }
  renderAll();
}

function renderAll() {
  for (const t of TOWER_IDS) {
    towers[t].forEach((id, idx) => {
      const { left, bottom } = positionFor(t, id, idx);
      const el = diskEls.get(id);
      el.style.left   = `${left}px`;
      el.style.bottom = `${bottom}px`;
    });
  }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function animateMove(from, to) {
  const diskId = towers[from].pop();
  const diskEl = diskEls.get(diskId);

  // 1. Lift straight up to just above the peg
  diskEl.style.bottom = `${LIFT_Y}px`;
  await wait(MOVE_MS);

  // 2. Slide horizontally to the destination peg's center
  const targetIndex = towers[to].length;
  const { left: targetLeft, bottom: targetBottom } =
        positionFor(to, diskId, targetIndex);
  diskEl.style.left = `${targetLeft}px`;
  await wait(MOVE_MS);

  // 3. Drop onto the stack
  towers[to].push(diskId);
  diskEl.style.bottom = `${targetBottom}px`;
  await wait(MOVE_MS);
}

async function solve() {
  if (animating) return;
  const n = parseInt(disksInput.value, 10);
  if (!n || n < 1 || n > 10) return;

  animating = true;
  solveBtn.disabled = true;
  statusEl.textContent = 'Querying Prolog…';

  setupTowers(n);
  await wait(30);

  try {
    const res  = await fetch(`/solve?disks=${n}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const total = data.moves.length;
    let done = 0;
    statusEl.textContent = `0 / ${total} moves`;

    for (const mv of data.moves) {
      await animateMove(mv.from, mv.to);
      done++;
      statusEl.textContent = `${done} / ${total} moves`;
    }
    statusEl.textContent = `✔ Solved in ${total} moves`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    console.error(err);
  } finally {
    animating = false;
    solveBtn.disabled = false;
  }
}

solveBtn.addEventListener('click', solve);
window.addEventListener('resize', renderAll);
setupTowers(3);