    // ═══════════════════════════════════════════════
    //  STATE & DATA MODEL
    // ═══════════════════════════════════════════════
    const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    let activeMobileDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    let S = {
      theme: 'cyber',
      mode: 'night',
      selectedProjectId: 1,
      projects: [
        {
          id: 1, name: 'Aureland', color: '#8ba888', notes: 'Core game loop and worldbuilding.',
          milestones: [{ id: 101, date: '2026-06-01', title: 'Vertical Slice Demo' }],
          categories: [
            {
              id: 10, name: 'Dewdrop Hamlet', color: '#8ba888',
              tasks: [
                { id: 100, text: 'Cottage interior sketches', done: false, priority: 'Med' },
                { id: 101, text: 'NPC dialogue logic', done: true, priority: 'High' }
              ]
            },
            {
              id: 11, name: 'Noir Stella', color: '#ff2271',
              tasks: [
                { id: 110, text: 'Lighting system setup', done: false, priority: 'High' }
              ]
            }
          ]
        }
      ],
      events: {},
      weekStart: getMonday(new Date()),
      collapsedProj: {},
      collapsedCat: {},
      nextId: 200,
    };
    let editingMilestone = null;

    // ═══════════════════════════════════════════════
    //  PERSISTENCE
    // ═══════════════════════════════════════════════
    function save() { localStorage.setItem('devquest_v3', JSON.stringify(S)); }
    function load() {
      const raw = localStorage.getItem('devquest_v3');
      if (raw) {
        const d = JSON.parse(raw);
        const theme = d.theme === 'dark' || d.theme === 'light' ? 'cyber' : d.theme;
        const mode = d.mode || 'night';
        S = { ...S, ...d, theme, mode, weekStart: new Date(d.weekStart || getMonday(new Date())) };
      }
      document.body.setAttribute('data-theme', S.theme || 'cyber');
      document.body.setAttribute('data-mode', S.mode || 'night');
      updateModeToggle();
    }

    // Date Utils
    function getMonday(d) { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0, 0, 0, 0); return r; }
    function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
    function fmtKey(d) { return d.toISOString().split('T')[0]; }
    function isToday(d) { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }
    function getEventSlot(time) {
      if (!time) return 'Anytime';
      const m = String(time).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return 'Anytime';
      let hour = parseInt(m[1], 10);
      const ampm = m[3] ? m[3].toLowerCase() : null;
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      if (hour >= 6 && hour < 12) return 'Morning';
      if (hour >= 12 && hour < 17) return 'Afternoon';
      if (hour >= 17 && hour < 21) return 'Evening';
      return 'Night';
    }

    // ═══════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════
    function render() {
      renderCalendar();
      renderTasks();
      renderProgress();
      save();
    }

    function parseEventHour(time) {
      if (!time) return null;
      const m = String(time).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return null;
      let hour = parseInt(m[1], 10);
      const ampm = m[3] ? m[3].toLowerCase() : null;
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      return hour;
    }
    function formatHour(h) {
      const label = h % 12 === 0 ? 12 : h % 12;
      return `${label}${h < 12 ? 'am' : 'pm'}`;
    }
    function renderCalendar() {
      const ws = S.weekStart;
      document.getElementById('weekLabel').textContent = `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${addDays(ws, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      const hours = Array.from({ length: 17 }, (_, idx) => idx + 6);
      let calHtml = '';
      let mobPickHtml = '';

      for (let i = 0; i < 7; i++) {
        const day = addDays(ws, i);
        const key = fmtKey(day);
        const evts = S.events[key] || [];
        const today = isToday(day);
        const isMobActive = i === activeMobileDay ? ' mobile-active' : '';
        const buckets = { all: [] };
        hours.forEach(h => buckets[h] = []);
        evts.forEach(ev => {
          const hour = parseEventHour(ev.time);
          if (hour !== null && hour >= 6 && hour <= 22) {
            buckets[hour].push(ev);
          } else {
            buckets.all.push(ev);
          }
        });

        const hourRows = [];
        if (buckets.all.length) {
          hourRows.push(`
        <div class="hour-row no-label" ondragover="allowDrop(event)" ondrop="dropTask(event, '${key}')" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)">
          <div class="hour-label"></div>
          <div class="hour-events untimed-events">${buckets.all.map(ev => `
            <div class="ev-chip" style="color:${ev.color}">
              <span style="flex:1; line-height:1.3;">${ev.time ? `<strong>${esc(ev.time)}</strong> ` : ''}${esc(ev.text)}</span>
              <button class="btn-ghost icon-btn dim" onclick="event.stopPropagation(); deleteEvent('${key}','${ev.id}')">×</button>
            </div>
          `).join('')}</div>
          <div class="slot-add-area" onclick="event.stopPropagation(); openAddEvent('${key}', null)">Add event</div>
        </div>`);
        }

        hours.forEach(hour => {
          hourRows.push(`
        <div class="hour-row" ondragover="allowDrop(event)" ondrop="dropTask(event, '${key}', ${hour})" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)">
          <div class="hour-label">${formatHour(hour)}</div>
          <div class="hour-events">${buckets[hour].map(ev => `
            <div class="ev-chip" style="color:${ev.color}">
              <span style="flex:1; line-height:1.3;">${ev.time ? `<strong>${esc(ev.time)}</strong> ` : ''}${esc(ev.text)}</span>
              <button class="btn-ghost icon-btn dim" onclick="event.stopPropagation(); deleteEvent('${key}','${ev.id}')">×</button>
            </div>
          `).join('')}</div>
          <div class="slot-add-area" onclick="event.stopPropagation(); openAddEvent('${key}', ${hour})">Add event</div>
        </div>`);
        });

        mobPickHtml += `<button class="mob-day-btn ${i === activeMobileDay ? 'active' : ''}" onclick="setMobileDay(${i})">${DAY_NAMES[i]} ${day.getDate()}</button>`;

        calHtml += `
      <div class="day-col${today ? ' day-today' : ''}${isMobActive}" 
           ondragover="allowDrop(event)" ondrop="dropTask(event, '${key}')" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)">
        <div class="day-hdr">
          <div class="day-name">${DAY_NAMES[i]}</div>
          <div class="day-num">${day.getDate()}</div>
        </div>
        <div class="day-events">
          ${hourRows.join('')}
        </div>
      </div>`;
      }
      document.getElementById('calGrid').innerHTML = calHtml;
      document.getElementById('mobileDayPicker').innerHTML = mobPickHtml;
    }

    function setMobileDay(idx) { activeMobileDay = idx; renderCalendar(); }

    function renderTasks() {
      let html = '';
      for (const proj of S.projects) {
        const pCol = S.collapsedProj[proj.id];
        const selectedClass = S.selectedProjectId === proj.id ? ' selected' : '';
        const [projDone, projTotal] = (proj.categories || []).reduce((acc, category) => {
          category.tasks.forEach(t => { acc[1]++; if (t.done) acc[0]++; });
          return acc;
        }, [0, 0]);
        const projPct = projTotal ? Math.round(projDone / projTotal * 100) : 0;

        html += `
      <div style="border-bottom:2px solid var(--border);">
        <div class="proj-hdr${selectedClass}" onclick="toggleProj(${proj.id})">
          <div style="width:12px;height:12px;border-radius:50%;background:${proj.color};"></div>
          <span class="vt" style="flex:1;font-size:20px;color:${proj.color}">${esc(proj.name)}</span>
          <button class="btn btn-ghost icon-btn" onclick="event.stopPropagation(); openEditProject(${proj.id})">✎</button>
        </div>`;

        if (!pCol) {
          html += `<div class="project-progress"><span class="proj-label">Progress for ${esc(proj.name)}</span><div class="prog-track"><div class="prog-fill" style="width:${projPct}%;"></div></div></div>`;
          if (proj.notes) html += `<div class="dim" style="padding: 10px 14px; font-size:14px; font-style:italic; border-bottom:1px dashed var(--border);">Sprint Note: ${esc(proj.notes)}</div>`;
          if (proj.milestones && proj.milestones.length > 0) {
            html += `<div style="padding: 6px 14px; border-bottom:1px solid rgba(128,128,128,.1);">
          <span class="dim" style="font-size:12px;">MILESTONES:</span> 
          ${proj.milestones.map(m => `<span style="color:var(--c3); font-size:13px; margin-left:8px;">★ ${m.date}: ${esc(m.title)}</span>`).join('')}
        </div>`;
          }

          for (const cat of (proj.categories || [])) {
            const cCol = S.collapsedCat[cat.id];
            html += `
          <div>
            <div class="cat-hdr" style="border-left-color:${cat.color || proj.color};">
              <span style="cursor:pointer; flex:1; color:${cat.color || proj.color};" onclick="toggleCat(${cat.id})">
                ${cCol ? '▶' : '▼'} <span style="display:inline-flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; border-radius:50%; background:${cat.color || proj.color}; display:inline-block;"></span>${esc(cat.name)}</span>
              </span>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-ghost icon-btn" onclick="event.stopPropagation(); openEditCategory(${proj.id}, ${cat.id})">✎</button>
                <button class="btn btn-ghost icon-btn" onclick="event.stopPropagation(); deleteCategory(${proj.id}, ${cat.id})">⌫</button>
              </div>
            </div>`;

            if (!cCol) {
              for (const t of cat.tasks) {
                const prioColor = t.priority === 'High' ? 'var(--c2)' : t.priority === 'Med' ? 'var(--c3)' : 'var(--c1)';
                html += `
              <div class="task-row${t.done ? ' done' : ''}" draggable="true" ondragstart="dragStart(event, '${esc(t.text)}', '${proj.color}')">
                <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${t.done ? 'checked' : ''} onchange="toggleTask(${proj.id}, ${cat.id}, ${t.id})">
                <span class="task-txt" style="flex:1;">${esc(t.text)}</span>
                <select class="priority-select" style="border-color:${prioColor}; color:${prioColor};" onchange="changeTaskPriority(${proj.id}, ${cat.id}, ${t.id}, event)">
                  <option value="High" ${t.priority === 'High' ? 'selected' : ''}>High</option>
                  <option value="Med" ${t.priority === 'Med' ? 'selected' : ''}>Med</option>
                  <option value="Low" ${t.priority === 'Low' ? 'selected' : ''}>Low</option>
                </select>
                <button class="btn btn-ghost icon-btn" onclick="deleteTask(${proj.id}, ${cat.id}, ${t.id})">×</button>
              </div>`;
              }
              html += `
            <div style="padding:8px 14px 8px 34px; display:flex; gap:8px; align-items:center;">
              <input class="inp" id="ti-${cat.id}" placeholder="+ new task [Enter]" style="flex:1; border-color:transparent; padding:4px;" 
                onkeydown="if(event.key==='Enter') addTask(${proj.id}, ${cat.id}, event)">
              <select class="priority-select" id="prio-${cat.id}">
                <option value="High">High</option>
                <option value="Med" selected>Med</option>
                <option value="Low">Low</option>
              </select>
            </div>`;
            }
            html += `</div>`;
          }
          html += `
        <div style="padding:10px; background:rgba(128,128,128,.02);">
          <button class="btn dim" style="width:100%; border-style:dashed;" onclick="openAddCategory(${proj.id})">+ ADD CATEGORY</button>
        </div>`;
        }
        html += `</div>`;
      }
      document.getElementById('tasksList').innerHTML = html;
    }

    function renderProgress() {
      if (!S.selectedProjectId && S.projects.length) S.selectedProjectId = S.projects[0].id;
      const project = S.projects.find(p => p.id === S.selectedProjectId) || S.projects[0] || { name: 'All Projects', categories: [] };
      let tDone = 0, tAll = 0;
      (project.categories || []).forEach(c => c.tasks.forEach(t => { tAll++; if (t.done) tDone++; }));
      const pct = tAll ? Math.round(tDone / tAll * 100) : 0;
      document.getElementById('bigPct').textContent = pct + '%';
      document.getElementById('overallBar').style.width = pct + '%';
      document.getElementById('taskCount').textContent = `${tDone} / ${tAll} tasks completed`;
      document.getElementById('projectLabel').textContent = `Project: ${project.name}`;
    }

    // ═══════════════════════════════════════════════
    //  DRAG & DROP TO CALENDAR
    // ═══════════════════════════════════════════════
    function dragStart(ev, text, color) {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ text, color }));
    }
    function allowDrop(ev) { ev.preventDefault(); }
    function dragEnter(ev) { ev.currentTarget.classList.add('drag-over'); }
    function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }
    function dropTask(ev, dateKey, hour = null) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.currentTarget.classList.remove('drag-over');
      try {
        const data = JSON.parse(ev.dataTransfer.getData("text/plain"));
        if (!S.events[dateKey]) S.events[dateKey] = [];
        const time = typeof hour === 'number' ? formatHour(hour) : '';
        S.events[dateKey].push({ id: String(S.nextId++), text: data.text, time, color: data.color });
        render();
      } catch (e) { }
    }

    function hourRowAdd(ev, dateKey, hour = null) {
      if (ev.target.closest('.ev-chip') || ev.target.closest('button') || ev.target.closest('select') || ev.target.closest('input')) return;
      openAddEvent(dateKey, hour);
    }

    // ═══════════════════════════════════════════════
    //  INTERACTIONS
    // ═══════════════════════════════════════════════
    function prevWeek() { S.weekStart = addDays(S.weekStart, -7); render(); }
    function nextWeek() { S.weekStart = addDays(S.weekStart, 7); render(); }
    function goToday() { S.weekStart = getMonday(new Date()); render(); }

    function toggleProj(id) { S.collapsedProj[id] = !S.collapsedProj[id]; S.selectedProjectId = id; render(); }
    function toggleCat(id) { S.collapsedCat[id] = !S.collapsedCat[id]; render(); }

    function addTask(pId, cId, ev) {
      const inp = ev.target;
      const text = inp.value.trim();
      if (!text) return;
      const priority = document.getElementById(`prio-${cId}`)?.value || 'Med';
      const proj = S.projects.find(p => p.id === pId);
      const cat = proj.categories.find(c => c.id === cId);
      cat.tasks.push({ id: S.nextId++, text, done: false, priority });
      render();
      setTimeout(() => document.getElementById(`ti-${cId}`)?.focus(), 10);
    }
    function changeTaskPriority(pId, cId, tId, ev) {
      const t = S.projects.find(p => p.id === pId).categories.find(c => c.id === cId).tasks.find(x => x.id === tId);
      t.priority = ev.target.value;
      render();
    }
    function toggleTask(pId, cId, tId) {
      const t = S.projects.find(p => p.id === pId).categories.find(c => c.id === cId).tasks.find(x => x.id === tId);
      t.done = !t.done; render();
    }
    function deleteTask(pId, cId, tId) {
      const cat = S.projects.find(p => p.id === pId).categories.find(c => c.id === cId);
      cat.tasks = cat.tasks.filter(x => x.id !== tId); render();
    }

    function openAddCategory(pId) {
      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">NEW CATEGORY</h2>
    <input class="inp" id="catName" placeholder="Category Name" style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="catColor" type="color" value="#8ba888" style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c2); border-color:var(--c2)" onclick="confirmAddCategory(${pId})">CREATE</button>
    </div>
  `;
      openModal();
    }
    function confirmAddCategory(pId) {
      const name = document.getElementById('catName').value.trim();
      const color = document.getElementById('catColor').value;
      if (name) {
        S.projects.find(p => p.id === pId).categories.push({ id: S.nextId++, name, color, tasks: [] });
        closeModal(); render();
      }
    }
    function openEditCategory(pId, cId) {
      const proj = S.projects.find(p => p.id === pId);
      const cat = proj.categories.find(c => c.id === cId);
      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">EDIT CATEGORY</h2>
    <input class="inp" id="catName" placeholder="Category Name" value="${esc(cat.name)}" style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="catColor" type="color" value="${cat.color || proj.color || '#8ba888'}" style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1)" onclick="saveCategoryEdits(${pId}, ${cId})">SAVE</button>
    </div>
  `;
      openModal();
    }
    function saveCategoryEdits(pId, cId) {
      const proj = S.projects.find(p => p.id === pId);
      const cat = proj.categories.find(c => c.id === cId);
      cat.name = document.getElementById('catName').value;
      cat.color = document.getElementById('catColor').value;
      closeModal(); render();
    }
    function deleteCategory(pId, cId) {
      if (confirm('Delete category and all its tasks?')) {
        const p = S.projects.find(p => p.id === pId);
        p.categories = p.categories.filter(c => c.id !== cId);
        render();
      }
    }

    function openAddProject() {
      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">NEW PROJECT</h2>
    <input class="inp" id="pjName" placeholder="Project Name" style="margin-bottom:16px;" autofocus>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Color</label>
      <input class="inp" id="pjColor" type="color" value="#ff2271" style="width:70px; padding:4px;">
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c2); border-color:var(--c2)" onclick="confirmAddProject()">CREATE</button>
    </div>
  `;
      openModal();
    }
    function confirmAddProject() {
      const name = document.getElementById('pjName').value.trim();
      const color = document.getElementById('pjColor')?.value || '#ff2271';
      if (name) {
        const newProject = { id: S.nextId++, name, color, categories: [], notes: '', milestones: [] };
        S.projects.push(newProject);
        S.selectedProjectId = newProject.id;
        closeModal(); render();
      }
    }

    function openAddEvent(key, hour = null) {
      const defaultTime = typeof hour === 'number' ? formatHour(hour) : '';
      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt teal" style="font-size:28px; margin-bottom:16px;">ADD EVENT: ${key}</h2>
    <input class="inp" id="evTxt" placeholder="Task description..." style="margin-bottom:10px;" autofocus>
    <input class="inp" id="evTime" placeholder="Time (optional)" value="${defaultTime}" style="margin-bottom:16px;">
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1)" onclick="confirmAddEvent('${key}')">ADD</button>
    </div>
  `;
      openModal();
    }
    function confirmAddEvent(key) {
      const text = document.getElementById('evTxt').value.trim();
      const time = document.getElementById('evTime').value.trim();
      if (text) {
        if (!S.events[key]) S.events[key] = [];
        S.events[key].push({ id: String(S.nextId++), text, time, color: 'var(--c1)' });
        closeModal(); render();
      }
    }
    function deleteEvent(key, id) {
      S.events[key] = S.events[key].filter(e => e.id !== id); render();
    }

    function openEditProject(pId) {
      editingMilestone = null;
      const p = S.projects.find(x => x.id === pId);
      const milestoneRows = (p.milestones || []).length ? p.milestones.map(m => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px;">
          <span style="flex:1; font-size:13px;">${m.date} – ${esc(m.title)}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost icon-btn" onclick="event.stopPropagation(); startEditMilestone(${pId}, ${m.id})">✎</button>
            <button class="btn btn-ghost icon-btn" onclick="event.stopPropagation(); deleteMilestone(${pId}, ${m.id})">×</button>
          </div>
        </div>`).join('') : '<div class="dim" style="font-size:13px; margin-top:8px;">No milestones yet.</div>';

      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt pink" style="font-size:28px; margin-bottom:16px;">EDIT: ${esc(p.name)}</h2>
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label class="dim" style="font-size:12px;">Project Color</label>
      <input class="inp" id="pjColor" type="color" value="${p.color || '#ff2271'}" style="width:70px; padding:4px;">
    </div>
    <label class="dim" style="font-size:12px; display:block; margin-bottom:6px;">Sprint Notes</label>
    <textarea class="inp" id="editNotes" style="height:80px; margin-bottom:16px;">${esc(p.notes || '')}</textarea>
    <label class="dim" style="font-size:12px; display:block; margin-bottom:8px;">Milestone (Date | Title)</label>
    <div style="display:flex; gap:8px; margin-bottom:8px;">
      <input class="inp" id="mDate" type="date" style="flex:1;">
      <input class="inp" id="mTitle" placeholder="Milestone Title" style="flex:2;">
    </div>
    ${milestoneRows}
    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
      <button class="btn" style="color:var(--c2)" onclick="if(confirm('Delete Project?')){ S.projects = S.projects.filter(x=>x.id!==${pId}); closeModal(); render(); }">DELETE PROJECT</button>
      <div style="flex:1"></div>
      <button class="btn dim" onclick="closeModal()">CANCEL</button>
      <button class="btn" style="color:var(--c1); border-color:var(--c1)" onclick="saveProjectEdits(${pId})">SAVE</button>
    </div>
  `;
      openModal();
    }
    function startEditMilestone(pId, mId) {
      const p = S.projects.find(x => x.id === pId);
      const milestone = p.milestones.find(m => m.id === mId);
      if (!milestone) return;
      editingMilestone = mId;
      document.getElementById('mDate').value = milestone.date;
      document.getElementById('mTitle').value = milestone.title;
    }
    function deleteMilestone(pId, mId) {
      const p = S.projects.find(x => x.id === pId);
      p.milestones = (p.milestones || []).filter(m => m.id !== mId);
      openEditProject(pId);
    }
    function saveProjectEdits(pId) {
      const p = S.projects.find(x => x.id === pId);
      p.notes = document.getElementById('editNotes').value;
      p.color = document.getElementById('pjColor')?.value || p.color;
      const d = document.getElementById('mDate').value;
      const t = document.getElementById('mTitle').value;
      if (d && t) {
        if (!p.milestones) p.milestones = [];
        if (editingMilestone) {
          const milestone = p.milestones.find(m => m.id === editingMilestone);
          if (milestone) {
            milestone.date = d;
            milestone.title = t;
          }
        } else {
          p.milestones.push({ id: S.nextId++, date: d, title: t });
        }
      }
      editingMilestone = null;
      closeModal(); render();
    }

    // ═══════════════════════════════════════════════
    //  SETTINGS & THEMES (IMPORT/EXPORT)
    // ═══════════════════════════════════════════════
    function openSettings() {
      document.getElementById('modalContent').innerHTML = `
    <h2 class="vt" style="font-size:28px; margin-bottom:16px; color:var(--text);">SETTINGS</h2>
    
    <div style="margin-bottom:20px;">
      <label class="dim" style="font-size:12px; display:block; margin-bottom:8px;">THEME</label>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn" onclick="setTheme('cyber')">Cyber</button>
        <button class="btn" onclick="setTheme('zen')">Zen</button>
        <button class="btn" onclick="setTheme('cottagecore')">Corragecore</button>
        <button class="btn" onclick="setTheme('y2k')">Y2K</button>
      </div>
    </div>

    <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; gap:10px;">
      <button class="btn" style="color:var(--c3); border-color:var(--c3); flex:1;" onclick="exportData()">EXPORT JSON</button>
      <button class="btn" style="color:var(--c4); border-color:var(--c4); flex:1;" onclick="importData()">IMPORT JSON</button>
    </div>
    <div style="text-align:right; margin-top:20px;"><button class="btn dim" onclick="closeModal()">CLOSE</button></div>
  `;
      openModal();
    }

    function setTheme(t) {
      S.theme = t;
      document.body.setAttribute('data-theme', t);
      document.body.setAttribute('data-mode', S.mode || 'night');
      updateModeToggle();
      save();
    }
    function toggleMode() {
      S.mode = S.mode === 'day' ? 'night' : 'day';
      document.body.setAttribute('data-mode', S.mode);
      updateModeToggle();
      save();
    }
    function updateModeToggle() {
      const btn = document.getElementById('modeToggle');
      if (!btn) return;
      btn.textContent = S.mode === 'day' ? '🌙' : '☀️';
      btn.title = S.mode === 'day' ? 'Switch to night mode' : 'Switch to day mode';
    }

    function exportData() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(S));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", "devquest_backup.json");
      dlAnchorElem.click();
    }

    function importData() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
          try {
            const d = JSON.parse(event.target.result);
            S = { ...d, weekStart: new Date(d.weekStart || getMonday(new Date())) };
            setTheme(S.theme || 'cyber');
            render(); closeModal();
          } catch (err) { alert('Invalid JSON file'); }
        }
        reader.readAsText(file);
      }
      input.click();
    }

    // Modal Utils
    function openModal() { document.getElementById('modal').style.display = 'flex'; }
    function closeModal() { document.getElementById('modal').style.display = 'none'; }
    function closeModalOverlay(e) { if (e.target === document.getElementById('modal')) closeModal(); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    // Init
    load();
    render();