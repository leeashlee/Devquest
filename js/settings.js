// ════════════════════════════════════════
//  SETTINGS — Themes, mode, import/export
// ════════════════════════════════════════

function openSettings() {
  setModalContent(`
    <h2 class="vt" style="font-size:28px; margin-bottom:20px; color:var(--c1); letter-spacing:2px;">
      ⚙ SETTINGS
    </h2>

    <label class="dim type-caption" style="display:block; margin-bottom:8px; letter-spacing:2px;">
      THEME
    </label>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px;">
      <button class="btn" onclick="setTheme('cyber')"
        style="color:var(--dim); border-color:#0c73ff;">Cyber</button>
      <button class="btn" onclick="setTheme('y2k')"
        style="color:var(--dim); border-color:#f472b6;">Y2K</button>
      <button class="btn" onclick="setTheme('zen')"
        style="color:var(--dim); border-color:#607c64;">Zen</button>
      <button class="btn" onclick="setTheme('cottagecore')"
        style="color:var(--dim); border-color:#8a9a5b;">Cottagecore</button>
    </div>

    <label class="dim type-caption" style="display:block; margin-bottom:8px; letter-spacing:2px;">
      DATA
    </label>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:24px;">
      <button class="btn" style="color:var(--text); border-color:var(--text);"
        onclick="exportData()">
        <i data-lucide="download" style="width:13px; height:13px; margin-right:5px;"></i>
        EXPORT
      </button>
      <button class="btn" style="color:var(--text); border-color:var(--text);"
        onclick="importData()">
        <i data-lucide="upload" style="width:13px; height:13px; margin-right:5px;"></i>
        IMPORT
      </button>
    </div>

    <div style="display:flex; justify-content:flex-end;">
      <button class="btn btn-primary" onclick="closeModal()">DONE</button>
    </div>`);
}

// ── Theme ─────────────────────────────────────────────────
function setTheme(theme) {
  S.theme = theme;
  document.body.setAttribute('data-theme', theme);
  document.body.setAttribute('data-mode', S.mode || 'night');
  updateModeToggle();
  save();
}

// ── Day / Night toggle ────────────────────────────────────
function toggleMode() {
  S.mode = S.mode === 'day' ? 'night' : 'day';
  document.body.setAttribute('data-mode', S.mode);
  updateModeToggle();
  save();
}

function updateModeToggle() {
  const btn = document.getElementById('modeToggle');
  if (!btn) return;

  const isDay = S.mode === 'day';

  // 1. Change the HTML inside to a new icon placeholder
  // We use innerHTML here to put the <i> tag back in
  btn.innerHTML = `<i data-lucide="${isDay ? 'moon' : 'sun'}"></i>`;

  // 2. Update the title
  btn.title = isDay ? 'Switch to night mode' : 'Switch to day mode';

  // 3. IMPORTANT: Tell Lucide to find that new <i> tag and turn it into an SVG
  if (window.lucide) {
    lucide.createIcons();
  }
}

// ── Export / Import ───────────────────────────────────────
function exportData() {
  const json = JSON.stringify(S, null, 2);
  const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
  const anchor = Object.assign(document.createElement('a'), {
    href: url,
    download: 'devquest_backup.json',
  });
  anchor.click();
}

function importData() {
  const input = Object.assign(document.createElement('input'), {
    type: 'file',
    accept: '.json',
  });

  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const d = JSON.parse(event.target.result);
        S = { ...d, weekStart: new Date(d.weekStart || getMonday(new Date())) };
        setTheme(S.theme || 'cyber');
        render();
        closeModal();
      } catch {
        alert('Could not import: invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  input.click();
}
