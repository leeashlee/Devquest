// ════════════════════════════════════════
//  RENDER — All DOM rendering functions
// ════════════════════════════════════════

// ── Shared utility ───────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Root render ──────────────────────────────────────────
function render() {
  renderCalendar();
  renderTasks();
  renderProgress();
  save();
  lucide.createIcons();
}

// ════════════════════════════════════════
//  CALENDAR
// ════════════════════════════════════════

/** Parse "9am", "14:00", "2pm" → integer hour (24h), or null if untimed. */
function parseEventHour(time) {
  if (!time) return null;
  const m = String(time).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const ampm = m[3]?.toLowerCase() ?? null;
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return hour;
}

/** Format an integer hour as "9am" / "12pm" etc. */
function formatHour(h) {
  const label = h % 12 === 0 ? 12 : h % 12;
  return `${label}${h < 12 ? 'am' : 'pm'}`;
}

/** Return the duration of an event in hours (minimum 0.25 = 15 min). */
function getEventDuration(ev) {
  return Math.max(0.25, Number(ev.duration) || 0.25);
}

/**
 * Assign timed events to non-overlapping lanes for side-by-side rendering.
 * Returns an array of { ev, start, duration, end, lane }.
 */
function computeTimedLayout(evts) {
  const timed = evts
    .filter(ev => {
      const h = parseEventHour(ev.time);
      return h !== null && h >= 6 && h <= 22;
    })
    .sort((a, b) => (parseEventHour(a.time) || 6) - (parseEventHour(b.time) || 6));

  const columns = []; // tracks the end-hour of each lane
  return timed.map(ev => {
    const start = parseEventHour(ev.time) || 6;
    const duration = getEventDuration(ev);
    const end = start + duration;

    let lane = columns.findIndex(lastEnd => start >= lastEnd);
    if (lane === -1) {
      lane = columns.length;
      columns.push(end);
    } else {
      columns[lane] = end;
    }

    return { ev, start, duration, end, lane };
  });
}

function renderCalendar() {
  const ws = S.weekStart;
  const isMobile = window.innerWidth <= 900;
  const currentHourHeight = isMobile ? 60 : 50; // Match your CSS height
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

  document.getElementById('weekLabel').textContent =
    `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ` +
    `${addDays(ws, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  let calHtml = '';
  let mobPickHtml = '';

  for (let i = 0; i < 7; i++) {
    const day = addDays(ws, i);
    const key = fmtKey(day);
    const evts = S.events[key] || [];
    const today = isToday(day);

    const timedLayout = computeTimedLayout(evts);
    const untimedEvts = evts.filter(ev => parseEventHour(ev.time) === null);
    const columnCount = Math.max(1, ...timedLayout.map(item => item.lane + 1));

    // Absolutely-positioned timed blocks
    const eventBlocks = timedLayout.map(item => {
      // Use the dynamic height for positioning
      const top    = (item.start - 6) * currentHourHeight + 4;
      const height = Math.max(20, item.duration * currentHourHeight - 4);
      const left = isMobile ? `calc(36px + ${item.lane * 10}px)` : `calc(44px + ${item.lane * 10}px)`;
      const width = isMobile
        ? `calc(${100 / columnCount}% - 44px - ${item.lane * 10}px)`
        : `calc(${100 / columnCount}% - 52px - ${item.lane * 10}px)`;
      const ev = item.ev;
      const prioDot = ev.priority
        ? `<span style="width:6px; height:6px; border-radius:50%; flex-shrink:0; display:inline-block;
            background:${ev.priority === 'High' ? '#ef4444' : ev.priority === 'Med' ? '#eab308' : '#22c55e'};
            margin-right:3px;" title="${ev.priority} priority"></span>`
        : '';

      return `
        <div class="ev-block"
          style="top:${top}px; height:${height}px; left:${left}; width:${width}; color:${ev.color};"
          draggable="true"
          ondragstart="dragStartEvent(event, '${key}', '${ev.id}')">
          <div class="ev-header">
            ${prioDot}
            <span class="ev-title" title="${esc(ev.text)}">${esc(ev.text)}</span>
            <button class="icon-btn dim"
              onclick="event.stopPropagation(); deleteEvent('${key}', '${ev.id}')">×</button>
          </div>
          <div class="resize-handle"
            onpointerdown="startResizeEvent(event, '${key}', '${ev.id}')"
            title="Drag to resize"></div>
        </div>`;
    }).join('');

    // Untimed (anytime) chips
    const untimedHtml = untimedEvts.map(ev => {
      const prioDot = ev.priority
        ? `<span style="width:6px; height:6px; border-radius:50%; flex-shrink:0; display:inline-block;
            background:${ev.priority === 'High' ? '#ef4444' : ev.priority === 'Med' ? '#eab308' : '#22c55e'};
            margin-right:3px;" title="${ev.priority} priority"></span>`
        : '';

      return `
      <div class="ev-chip" style="color:${ev.color}">
        <div class="ev-header">
          ${prioDot}
          <span class="ev-title" title="${esc(ev.text)}">${esc(ev.text)}</span>
          <button class="icon-btn dim" 
            onclick="event.stopPropagation(); deleteEvent('${key}', '${ev.id}')">×</button>
        </div>
      </div>`;
    }).join('');

    // Background hour rows
    const hourRows = hours.map(hour => {
      const occupied = timedLayout.some(item => hour >= item.start && hour < item.end);
      return `
        <div class="hour-row"
          ondragover="allowDrop(event)"
          ondrop="dropTask(event, '${key}', ${hour})"
          ondragenter="dragEnter(event)"
          ondragleave="dragLeave(event)">
          <div class="hour-label">${formatHour(hour)}</div>
          ${occupied ? '' : `<button class="slot-add-btn icon-btn"
            onclick="event.stopPropagation(); openAddEvent('${key}', ${hour})"
            title="Add event at ${formatHour(hour)}">
            <i data-lucide="calendar-plus" style="width:14px;height:14px;"></i>
          </button>`}
        </div>`;
    }).join('');

    // Mobile picker button
    mobPickHtml += `
      <button class="mob-day-btn ${i === activeMobileDay ? 'active' : ''}"
        onclick="setMobileDay(${i})">${DAY_NAMES[i]} ${day.getDate()}</button>`;

    // Full day column
    calHtml += `
      <div class="day-col${today ? ' day-today' : ''}${i === activeMobileDay ? ' mobile-active' : ''}"
        ondragover="allowDrop(event)"
        ondrop="dropTask(event, '${key}')"
        ondragenter="dragEnter(event)"
        ondragleave="dragLeave(event)">
        <div class="day-hdr">
          <div class="day-name">${DAY_NAMES[i]}</div>
          <div class="day-num">${day.getDate()}</div>
        </div>
        <div class="day-events">
          <div class="slot-section anytime-section">
            <div class="slot-label">Anytime</div>
            ${untimedHtml}
            <button class="slot-add-btn icon-btn"
              onclick="event.stopPropagation(); openAddEvent('${key}', null)"
              title="Add anytime event">
              <i data-lucide="calendar-plus" style="width:14px;height:14px;"></i>
            </button>
          </div>
          <div class="timeline">
            ${hourRows}
            ${eventBlocks}
          </div>
        </div>
      </div>`;
  }

  document.getElementById('calGrid').innerHTML = calHtml;
  document.getElementById('mobileDayPicker').innerHTML = mobPickHtml;

  // Re-hydrate lucide icons — renderCalendar is called directly during resize
  // without going through render(), so icons must be created here too.
  if (window.lucide) lucide.createIcons();
}

// ════════════════════════════════════════
//  TASKS / WORK LOG
// ════════════════════════════════════════

function renderTasks() {
  let html = '';

  for (const proj of S.projects) {
    const isCollapsed = S.collapsedProj[proj.id];
    const isSelected = S.selectedProjectId === proj.id;

    // Compute project completion
    let projDone = 0, projTotal = 0;
    for (const cat of proj.categories || []) {
      projTotal += cat.tasks.length;
      projDone += cat.tasks.filter(t => t.done).length;
    }
    const projPct = projTotal ? Math.round(projDone / projTotal * 100) : 0;

    html += `
      <div style="border-bottom: 2px solid var(--border);">
        <div class="proj-hdr${isSelected ? ' selected' : ''}" onclick="toggleProj(${proj.id})">
          <div style="width:12px; height:12px; border-radius:50%; background:${proj.color};"></div>
          <span class="vt" style="flex:1; font-size:20px; color:${proj.color};">${esc(proj.name)}</span>
          <button class="btn btn-ghost icon-btn"
            onclick="event.stopPropagation(); openEditProject(${proj.id})"><i data-lucide="pencil" style="width:16px; height:16px;"></i></button>
        </div>`;

    if (!isCollapsed) {
      // Progress bar
      html += `
        <div class="project-progress">
          <span class="proj-label">Progress for ${esc(proj.name)}</span>
          <div class="prog-track">
            <div class="prog-fill" style="width:${projPct}%;"></div>
          </div>
        </div>`;

      // Sprint notes
      if (proj.notes) {
        html += `
          <div class="dim" style="padding:10px 12px; font-size:12px; font-style:italic;
            border-bottom:1px dashed var(--border);">
            Sprint Note: ${esc(proj.notes)}
          </div>`;
      }

      // Milestones
      if (proj.milestones?.length) {
        const mHtml = proj.milestones.map(m =>
          `<span style="color:var(--c3); font-size:13px; margin-left:8px;">★ ${m.date}: ${esc(m.title)}</span>`
        ).join('');
        html += `
          <div style="padding:6px 14px; border-bottom:1px solid rgba(128,128,128,.1);">
            <span class="dim" style="font-size:12px;">MILESTONES:</span>${mHtml}
          </div>`;
      }

      // Categories
      for (const cat of proj.categories || []) {
        const catCollapsed = S.collapsedCat[cat.id];
        const catColor = cat.color || proj.color;

        html += `
          <div>
            <div class="cat-hdr" style="border-left-color:${catColor};">
              <span style="cursor:pointer; flex:1; color:${catColor};"
                onclick="toggleCat(${cat.id})">
                ${catCollapsed ? '▶' : '▼'}
                <span style="display:inline-flex; align-items:center; gap:6px;">
                  <span style="width:10px; height:10px; border-radius:50%;
                    background:${catColor}; display:inline-block;"></span>
                  ${esc(cat.name)}
                </span>
              </span>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-ghost icon-btn"
                  onclick="event.stopPropagation(); openEditCategory(${proj.id}, ${cat.id})"><i data-lucide="pencil" style="width:16px; height:16px;"></i></button>
                <button class="btn btn-ghost icon-btn"
                  onclick="event.stopPropagation(); deleteCategory(${proj.id}, ${cat.id})"><i data-lucide="delete" style="width:16px; height:16px;"></i></button>
              </div>
            </div>`;

        if (!catCollapsed) {
          for (const t of cat.tasks) {
            const prioColor = t.priority === 'High' ? '#ef4444'
              : t.priority === 'Med' ? '#eab308'
                : '#22c55e';
            html += `
              <div class="task-row${t.done ? ' done' : ''}"
                  draggable="true"
                  ondragstart="dragStart(event, '${esc(t.text)}', '${catColor}', ${t.duration || 1}, '${t.priority || 'Med'}', ${proj.id}, ${cat.id}, ${t.id})">
                  <input type="checkbox" style="width:16px; height:16px; cursor:pointer;"
                    ${t.done ? 'checked' : ''}
                    onchange="toggleTask(${proj.id}, ${cat.id}, ${t.id})">
                  <span
                    onclick="event.stopPropagation(); cycleTaskPriority(${proj.id}, ${cat.id}, ${t.id})"
                    style="width:10px; height:10px; border-radius:50%; background:${prioColor};
                      flex-shrink:0; display:inline-block; cursor:pointer;
                      transition:transform .1s, box-shadow .1s;"
                    onmouseover="this.style.transform='scale(1.35)'; this.style.boxShadow='0 0 6px ${prioColor}'"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                    title="Priority: ${t.priority} — click to change"></span>
                  <span class="task-txt" style="flex:1;">${esc(t.text)}</span>
                  
                  <div style="display: flex; align-items: center;">
                    <button class="btn btn-ghost icon-btn task-action-btn mobile-only-btn"
                      onclick="event.stopPropagation(); prepareMobileDrop('${esc(t.text)}', '${catColor}', ${t.duration || 1}, '${t.priority || 'Med'}', ${proj.id}, ${cat.id}, ${t.id})"
                      title="Schedule task">
                      <i data-lucide="calendar-plus" style="width:13px; height:13px;"></i>
                    </button>
                    <button class="btn btn-ghost icon-btn task-action-btn"
                      onclick="event.stopPropagation(); openEditTask(${proj.id}, ${cat.id}, ${t.id})"
                      title="Edit task">
                      <i data-lucide="pencil" style="width:13px; height:13px;"></i>
                    </button>
                    <button class="btn btn-ghost icon-btn task-action-btn"
                      onclick="deleteTask(${proj.id}, ${cat.id}, ${t.id})"
                      title="Delete task">
                      <i data-lucide="x" style="width:13px; height:13px;"></i>
                    </button>
                  </div>
              </div>`;
          }

          // New task input row
          html += `
            <div style="padding:8px 14px 8px 34px; display:flex; gap:8px; align-items:center;">
              <input class="inp" id="ti-${cat.id}"
                placeholder="+ new task [Enter]"
                style="flex:1; border-color:transparent; padding:4px;"
                onkeydown="if(event.key==='Enter') addTask(${proj.id}, ${cat.id}, event)">
              <select class="priority-select" id="prio-${cat.id}">
                <option value="High">High</option>
                <option value="Med" selected>Med</option>
                <option value="Low">Low</option>
              </select>
            </div>`;
        }

        html += `</div>`; // close category
      }

      // Add category button
      html += `
        <div style="padding:10px; background:rgba(128,128,128,.02);">
          <button class="btn dim" style="width:100%; border-style:dashed;"
            onclick="openAddCategory(${proj.id})">+ ADD CATEGORY</button>
        </div>`;
    }

    html += `</div>`; // close project
  }

  document.getElementById('tasksList').innerHTML = html;
}

// ════════════════════════════════════════
//  PROGRESS BAR (top panel)
// ════════════════════════════════════════

function renderProgress() {
  if (!S.selectedProjectId && S.projects.length) {
    S.selectedProjectId = S.projects[0].id;
  }

  const project = S.projects.find(p => p.id === S.selectedProjectId)
    ?? S.projects[0]
    ?? { name: 'No project', categories: [] };

  let tDone = 0, tAll = 0;
  for (const cat of project.categories || []) {
    tAll += cat.tasks.length;
    tDone += cat.tasks.filter(t => t.done).length;
  }

  const pct = tAll ? Math.round(tDone / tAll * 100) : 0;

  document.getElementById('bigPct').textContent = `${pct}%`;
  document.getElementById('overallBar').style.width = `${pct}%`;
  document.getElementById('taskCount').textContent = `${tDone} / ${tAll} tasks completed`;
  document.getElementById('projectLabel').textContent = `Project: ${project.name}`;
}

let lastWidth = window.innerWidth;

window.addEventListener('resize', () => {
  // Only trigger a full re-render if we cross the mobile/desktop threshold
  // or if the width changed significantly (more than 50px)
  const currentWidth = window.innerWidth;
  const crossedBreakpoint = (lastWidth > 900 && currentWidth <= 900) ||
    (lastWidth <= 900 && currentWidth > 900);

  if (crossedBreakpoint || Math.abs(currentWidth - lastWidth) > 50) {
    render();
    lastWidth = currentWidth;
  }
});