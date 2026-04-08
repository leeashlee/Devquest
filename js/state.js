// ════════════════════════════════════════
//  STATE — Constants, data model, persistence & date utils
// ════════════════════════════════════════

const DAY_NAMES   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOUR_HEIGHT = 50;
const STORAGE_KEY = 'devquest_v3';

// Active mobile day (0 = Mon … 6 = Sun)
let activeMobileDay = (() => {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
})();

// ── Default / seed data ──────────────────────────────────
let S = {
  theme: 'cyber',
  mode:  'night',
  selectedProjectId: 1,
  projects: [
    {
      id: 1,
      name: 'Aureland',
      color: '#8ba888',
      notes: 'Core game loop and worldbuilding.',
      milestones: [
        { id: 101, date: '2026-06-01', title: 'Vertical Slice Demo' }
      ],
      categories: [
        {
          id: 10,
          name: 'Gameplay',
          color: '#8ba888',
          tasks: [
            { id: 100, text: 'Player movement controller', done: false, priority: 'High', duration: 2 },
            { id: 101, text: 'Collision detection',        done: false, priority: 'Med',  duration: 2 },
            { id: 102, text: 'Camera system',              done: true,  priority: 'Med',  duration: 1 },
          ],
        },
        {
          id: 11,
          name: 'Art & Assets',
          color: '#ff2271',
          tasks: [
            { id: 110, text: 'Character sprite sheet', done: false, priority: 'High', duration: 3 },
            { id: 111, text: 'Tilemap design',         done: false, priority: 'Med',  duration: 2 },
          ],
        },
      ],
    },
  ],
  events:        {},
  weekStart:     null,   // set after getMonday is defined
  collapsedProj: {},
  collapsedCat:  {},
  nextId:        200,
};

// ── Persistence ──────────────────────────────────────────
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch (e) {
    console.warn('DevQuest: could not save to localStorage', e);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const d = JSON.parse(raw);

    // Migrate old theme names
    const theme = (d.theme === 'dark' || d.theme === 'light') ? 'cyber' : (d.theme || 'cyber');
    const mode  = d.mode || 'night';

    S = { ...S, ...d, theme, mode, weekStart: new Date(d.weekStart || getMonday(new Date())) };
  } catch (e) {
    console.warn('DevQuest: could not load saved data', e);
  }

  document.body.setAttribute('data-theme', S.theme);
  document.body.setAttribute('data-mode',  S.mode);
  updateModeToggle();
}

// ── Date utilities ───────────────────────────────────────
function getMonday(d) {
  const r   = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtKey(d) {
  return d.toISOString().split('T')[0];
}

function isToday(d) {
  const t = new Date();
  return (
    d.getDate()     === t.getDate()  &&
    d.getMonth()    === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
}

// Set default weekStart now that getMonday is defined
S.weekStart = getMonday(new Date());

// ── Lookup helpers ───────────────────────────────────────
// Reduces repetitive find chains across action files.

function findProject(pId) {
  return S.projects.find(p => p.id === pId);
}

function findCategory(pId, cId) {
  return findProject(pId)?.categories.find(c => c.id === cId);
}

function findTask(pId, cId, tId) {
  return findCategory(pId, cId)?.tasks.find(t => t.id === tId);
}
