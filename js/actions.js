// ════════════════════════════════════════
//  ACTIONS — User interactions & modals
// ════════════════════════════════════════

// ── Modal helpers ────────────────────────────────────────
function openModal()  { document.getElementById('modal').style.display = 'flex'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function setModalContent(html) {
  document.getElementById('modalContent').innerHTML = html;
  openModal();
}

// ── Delete confirmation modal ─────────────────────────────
/**
 * Opens a styled confirmation modal before any deletion.
 *
 * @param {object} opts
 *   label      - short name of what's being deleted (e.g. "task")
 *   name       - the actual item name shown in the modal
 *   detail     - optional warning line (e.g. "All tasks inside will be lost.")
 *   onConfirm  - function called if the user confirms
 *   danger     - true = red accent (destructive), false = softer yellow
 */
function openDeleteConfirm({ label, name, detail = '', onConfirm, danger = true }) {
  const accent     = danger ? 'var(--c2)' : 'var(--c3)';
  const icon       = danger ? '⚠️' : '✕';
  const detailHtml = detail
    ? `<div class="dim type-caption" style="margin-top:6px; font-size:12px;">${detail}</div>`
    : '';

  setModalContent(`
    <div style="text-align:center; padding:8px 0 22px;">
      <div style="font-size:18px; margin-bottom:0px;">${icon}</div>
      <div class="vt" style="font-size:18px; color:${accent}; letter-spacing:2px; margin-bottom:16px;">
        DELETE ${label.toUpperCase()}?
      </div>
      <div style="color:var(--text); margin-bottom:6px; font-size:22px;">
        <strong>${esc(name)}</strong>
      </div>
      ${detailHtml}
    </div>
    <div style="display:flex; gap:16px; justify-content:center;">
      <button class="btn dim" style="color:var(--dim)" onclick="closeModal()">CANCEL</button>
      <button class="btn btn-danger" style="--btn-accent:${accent};"
        onclick="(${onConfirm.toString()})(); closeModal();">DELETE</button>
    </div>`);
}

// ── Navigation ───────────────────────────────────────────
function prevWeek() { S.weekStart = addDays(S.weekStart, -7); render(); }
function nextWeek() { S.weekStart = addDays(S.weekStart,  7); render(); }
function goToday()  { S.weekStart = getMonday(new Date());    render(); }

function setMobileDay(idx) { activeMobileDay = idx; renderCalendar(); }

// ── Project collapse / selection ─────────────────────────
function toggleProj(id) {
  S.collapsedProj[id] = !S.collapsedProj[id];
  S.selectedProjectId = id;
  render();
}

function toggleCat(id) {
  S.collapsedCat[id] = !S.collapsedCat[id];
  render();
}

// ── Tasks ────────────────────────────────────────────────
function addTask(pId, cId, ev) {
  const text = ev.target.value.trim();
  if (!text) return;

  const priority = document.getElementById(`prio-${cId}`)?.value || 'Med';
  const duration = Math.max(1, Number(document.getElementById(`dur-${cId}`)?.value) || 1);

  findCategory(pId, cId).tasks.push({ id: S.nextId++, text, done: false, priority, duration });
  render();
  setTimeout(() => document.getElementById(`ti-${cId}`)?.focus(), 10);
}

function toggleTask(pId, cId, tId) {
  const t = findTask(pId, cId, tId);
  t.done = !t.done;
  render();
}

function deleteTask(pId, cId, tId) {
  const t = findTask(pId, cId, tId);
  openDeleteConfirm({
    label:     'task',
    name:      t?.text || 'this task',
    danger:    false,
    onConfirm: () => {
      const cat = findCategory(pId, cId);
      cat.tasks = cat.tasks.filter(t => t.id !== tId);
      render();
    },
  });
}

function changeTaskDuration(pId, cId, tId, ev) {
  findTask(pId, cId, tId).duration = Math.max(1, Number(ev.target.value) || 1);
  render();
}

function cycleTaskPriority(pId, cId, tId) {
  const t = findTask(pId, cId, tId);
  if (!t) return;

  const order = ['High', 'Med', 'Low'];
  t.priority  = order[(order.indexOf(t.priority) + 1) % order.length];

  // Sync linked calendar events — Number() guards against string/number mismatches
  for (const dayEvents of Object.values(S.events)) {
    for (const calEv of dayEvents) {
      if (calEv.taskRef &&
          Number(calEv.taskRef.pId) === Number(pId) &&
          Number(calEv.taskRef.cId) === Number(cId) &&
          Number(calEv.taskRef.tId) === Number(tId)) {
        calEv.priority = t.priority;
      }
    }
  }

  render();
}

// ── Categories ───────────────────────────────────────────
function openAddCategory(pId) {
  setModalContent(`
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">NEW CATEGORY</h2>
    <input class="inp" id="catName" placeholder="Category Name"
      style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="catColor" type="color" value="#8ba888"
        style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c2); border-color:var(--c2)"
        onclick="confirmAddCategory(${pId})">CREATE</button>
    </div>`);
}

function confirmAddCategory(pId) {
  const name  = document.getElementById('catName').value.trim();
  const color = document.getElementById('catColor').value;
  if (!name) return;

  findProject(pId).categories.push({ id: S.nextId++, name, color, tasks: [] });
  closeModal();
  render();
}

function openEditCategory(pId, cId) {
  const proj = findProject(pId);
  const cat  = findCategory(pId, cId);

  setModalContent(`
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">EDIT CATEGORY</h2>
    <input class="inp" id="catName" value="${esc(cat.name)}"
      placeholder="Category Name" style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="catColor" type="color"
        value="${cat.color || proj.color || '#8ba888'}" style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1)"
        onclick="saveCategoryEdits(${pId}, ${cId})">SAVE</button>
    </div>`);
}

function saveCategoryEdits(pId, cId) {
  const cat = findCategory(pId, cId);
  cat.name  = document.getElementById('catName').value;
  cat.color = document.getElementById('catColor').value;
  closeModal();
  render();
}

function deleteCategory(pId, cId) {
  const cat = findCategory(pId, cId);
  openDeleteConfirm({
    label:     'category',
    name:      cat?.name || 'this category',
    detail:    'All tasks inside will be permanently lost.',
    onConfirm: () => {
      const proj      = findProject(pId);
      proj.categories = proj.categories.filter(c => c.id !== cId);
      render();
    },
  });
}

// ── Projects ─────────────────────────────────────────────
function openAddProject() {
  setModalContent(`
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">NEW PROJECT</h2>
    <input class="inp" id="pjName" placeholder="Project Name"
      style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="pjColor" type="color" value="#ff2271"
        style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c2); border-color:var(--c2)"
        onclick="confirmAddProject()">CREATE</button>
    </div>`);
}

function confirmAddProject() {
  const name  = document.getElementById('pjName').value.trim();
  const color = document.getElementById('pjColor')?.value || '#ff2271';
  if (!name) return;

  const newProject = { id: S.nextId++, name, color, categories: [], notes: '', milestones: [] };
  S.projects.push(newProject);
  S.selectedProjectId = newProject.id;
  closeModal();
  render();
}

function deleteProject(pId) {
  const proj = findProject(pId);
  openDeleteConfirm({
    label:     'project',
    name:      proj?.name || 'this project',
    detail:    'All categories, tasks and milestones will be permanently lost.',
    onConfirm: () => {
      S.projects = S.projects.filter(p => p.id !== pId);
      if (S.selectedProjectId === pId) {
        S.selectedProjectId = S.projects[0]?.id ?? null;
      }
      render();
    },
  });
}

// ── Project editing & milestones ─────────────────────────
let editingMilestoneId = null;

function openEditProject(pId) {
  editingMilestoneId = null;
  const p = findProject(pId);

  const milestoneRows = (p.milestones || []).length
    ? p.milestones.map(m => `
        <div style="display:flex; align-items:center; justify-content:space-between;
          gap:8px; margin-top:8px;">
          <span style="flex:1; font-size:13px;">${m.date} – ${esc(m.title)}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost icon-btn"
              onclick="event.stopPropagation(); startEditMilestone(${pId}, ${m.id})">✎</button>
            <button class="btn btn-ghost icon-btn"
              onclick="event.stopPropagation(); deleteMilestone(${pId}, ${m.id})">×</button>
          </div>
        </div>`).join('')
    : '<div class="dim" style="font-size:13px; margin-top:8px;">No milestones yet.</div>';

  setModalContent(`
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">EDIT: ${esc(p.name)}</h2>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Project Color</label>
      <input class="inp" id="pjColor" type="color"
        value="${p.color || '#ff2271'}" style="width:70px; padding:4px;">
    </div>
    <label class="dim" style="font-size:12px; display:block; margin-bottom:6px;">Sprint Notes</label>
    <textarea class="inp" id="editNotes"
      style="height:80px; margin-bottom:16px;">${esc(p.notes || '')}</textarea>
    <label class="dim" style="font-size:12px; display:block; margin-bottom:8px;">
      Add / Edit Milestone</label>
    <div style="display:flex; gap:8px; margin-bottom:8px;">
      <input class="inp" id="mDate" type="date" style="flex:1;">
      <input class="inp" id="mTitle" placeholder="Milestone title" style="flex:2;">
    </div>
    ${milestoneRows}
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn" style="color:var(--c2);"
        onclick="deleteProject(${pId})">DELETE PROJECT</button>
      <div style="flex:1;"></div>
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1);"
        onclick="saveProjectEdits(${pId})">SAVE</button>
    </div>`);
}

function startEditMilestone(pId, mId) {
  const milestone = findProject(pId).milestones?.find(m => m.id === mId);
  if (!milestone) return;
  editingMilestoneId = mId;
  document.getElementById('mDate').value  = milestone.date;
  document.getElementById('mTitle').value = milestone.title;
}

function deleteMilestone(pId, mId) {
  const proj      = findProject(pId);
  const milestone = proj.milestones?.find(m => m.id === mId);
  openDeleteConfirm({
    label:     'milestone',
    name:      milestone?.title || 'this milestone',
    danger:    false,
    onConfirm: () => {
      proj.milestones = (proj.milestones || []).filter(m => m.id !== mId);
      openEditProject(pId);
    },
  });
}

function saveProjectEdits(pId) {
  const p     = findProject(pId);
  p.notes     = document.getElementById('editNotes').value;
  p.color     = document.getElementById('pjColor')?.value || p.color;

  const date  = document.getElementById('mDate').value;
  const title = document.getElementById('mTitle').value;

  if (date && title) {
    if (!p.milestones) p.milestones = [];
    if (editingMilestoneId) {
      const m = p.milestones.find(m => m.id === editingMilestoneId);
      if (m) { m.date = date; m.title = title; }
    } else {
      p.milestones.push({ id: S.nextId++, date, title });
    }
  }

  editingMilestoneId = null;
  closeModal();
  render();
}

// ── Calendar events ──────────────────────────────────────
function openAddEvent(key, hour = null) {
  const defaultTime = typeof hour === 'number' ? formatHour(hour) : '';

  const swatches = [
    '#00f5d4', '#ff2271', '#ffe566', '#a855f7',
    '#3b82f6', '#f97316', '#10b981', '#f472b6',
  ];
  const swatchHtml = swatches.map(c => `
    <div onclick="selectEventColor('${c}', this)"
      style="width:22px; height:22px; border-radius:50%; background:${c};
        cursor:pointer; border:2px solid transparent; flex-shrink:0;
        transition:transform .1s, border-color .1s;"
      onmouseover="this.style.transform='scale(1.2)'"
      onmouseout="this.style.transform='scale(1)'">
    </div>`).join('');

  setModalContent(`
    <h2 class="vt teal" style="font-size:28px; margin-bottom:16px;">
      ADD EVENT: ${key}</h2>
    <input class="inp" id="evTxt" placeholder="What are you working on?"
      style="margin-bottom:10px;" autofocus>
    <input class="inp" id="evTime" placeholder="Time (optional, e.g. 9am or 14:00)"
      value="${defaultTime}" style="margin-bottom:10px;">
    <input class="inp" id="evDuration" type="number" min="1" max="12" value="1"
      style="margin-bottom:14px;" placeholder="Duration (hours)">
    <div style="margin-bottom:16px;">
      <div class="dim" style="font-size:12px; letter-spacing:1px; margin-bottom:8px;">
        EVENT COLOUR</div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${swatchHtml}
        <input type="color" id="evColorCustom" value="${swatches[0]}"
          oninput="selectEventColor(this.value, null)"
          style="width:26px; height:26px; border:none; background:none;
            cursor:pointer; padding:0; border-radius:50%;"
          title="Custom colour">
      </div>
      <input type="hidden" id="evColor" value="${swatches[0]}">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1);"
        onclick="confirmAddEvent('${key}')">ADD</button>
    </div>`);

  const firstSwatch = document.querySelector('#modalContent [onclick^="selectEventColor"]');
  if (firstSwatch) firstSwatch.style.borderColor = '#fff';
}

function selectEventColor(hex, swatchEl) {
  document.getElementById('evColor').value       = hex;
  document.getElementById('evColorCustom').value = hex;
  document.querySelectorAll('#modalContent [onclick^="selectEventColor"]')
    .forEach(el => el.style.borderColor = 'transparent');
  if (swatchEl) swatchEl.style.borderColor = '#fff';
}

function confirmAddEvent(key) {
  const text     = document.getElementById('evTxt').value.trim();
  const time     = document.getElementById('evTime').value.trim();
  const duration = Math.max(1, Number(document.getElementById('evDuration')?.value) || 1);
  const color    = document.getElementById('evColor')?.value || 'var(--c1)';
  if (!text) return;

  if (!S.events[key]) S.events[key] = [];
  S.events[key].push({ id: String(S.nextId++), text, time, color, duration });
  closeModal();
  render();
}

function deleteEvent(key, id) {
  const ev = S.events[key]?.find(e => e.id === id);
  openDeleteConfirm({
    label:     'event',
    name:      ev?.text || 'this event',
    danger:    false,
    onConfirm: () => {
      if (S.events[key]) {
        S.events[key] = S.events[key].filter(e => e.id !== id);
      }
      render();
    },
  });
}
