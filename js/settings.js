// ════════════════════════════════════════
//  SETTINGS — Themes, mode, import/export
// ════════════════════════════════════════

function openSettings() {
  setModalContent(`
    <h2 class="vt" style="font-size:28px; margin-bottom:16px; color:var(--text);">SETTINGS</h2>

    <div style="margin-bottom:20px;">
      <label class="dim" style="font-size:12px; display:block; margin-bottom:8px;">THEME</label>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn" onclick="setTheme('cyber')">Cyber</button>
        <button class="btn" onclick="setTheme('y2k')">Y2K</button>
        <button class="btn" onclick="setTheme('zen')">Zen</button>
        <button class="btn" onclick="setTheme('cottagecore')">Cottagecore</button>
      </div>
    </div>

    <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; gap:10px;">
      <button class="btn" style="color:var(--c3); border-color:var(--c3); flex:1;"
        onclick="exportData()">EXPORT JSON</button>
      <button class="btn" style="color:var(--c4); border-color:var(--c4); flex:1;"
        onclick="importData()">IMPORT JSON</button>
    </div>

    <div style="text-align:right; margin-top:20px;">
      <button class="btn dim" onclick="closeModal()">CLOSE</button>
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
  const json   = JSON.stringify(S, null, 2);
  const url    = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
  const anchor = Object.assign(document.createElement('a'), {
    href:     url,
    download: 'devquest_backup.json',
  });
  anchor.click();
}

function importData() {
  const input  = Object.assign(document.createElement('input'), {
    type:   'file',
    accept: '.json',
  });

  input.onchange = e => {
    const file   = e.target.files[0];
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
