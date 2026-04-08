// ════════════════════════════════════════
//  DRAG — Drag & drop + timeline resize
// ════════════════════════════════════════

// ── Drag from task list → calendar ───────────────────────
function dragStart(ev, text, color, duration = 1) {
  ev.dataTransfer.setData('text/plain', JSON.stringify({ text, color, duration }));
}

// ── Drag existing calendar event to a new slot ────────────
function dragStartEvent(ev, dateKey, eventId) {
  ev.dataTransfer.setData('text/plain', JSON.stringify({ moveEvent: true, dateKey, eventId }));
}

// ── Drop target helpers ───────────────────────────────────
function allowDrop(ev)  { ev.preventDefault(); }
function dragEnter(ev)  { ev.currentTarget.classList.add('drag-over'); }
function dragLeave(ev)  { ev.currentTarget.classList.remove('drag-over'); }

// ── Drop handler (task from list OR moving an event) ──────
function dropTask(ev, dateKey, hour = null) {
  ev.preventDefault();
  ev.stopPropagation();
  ev.currentTarget.classList.remove('drag-over');

  let data;
  try {
    data = JSON.parse(ev.dataTransfer.getData('text/plain'));
  } catch {
    return;
  }

  if (!S.events[dateKey]) S.events[dateKey] = [];

  if (data.moveEvent) {
    // Move an existing event to a new day / hour
    const sourceEvts = S.events[data.dateKey] || [];
    const evIdx      = sourceEvts.findIndex(e => e.id === data.eventId);
    if (evIdx === -1) return;

    const [movedEv] = sourceEvts.splice(evIdx, 1);
    if (hour !== null) movedEv.time = formatHour(hour);
    S.events[dateKey].push(movedEv);
  } else {
    // Drop a task from the work log as a new calendar event
    S.events[dateKey].push({
      id:       String(S.nextId++),
      text:     data.text,
      color:    data.color,
      time:     hour !== null ? formatHour(hour) : '',
      duration: data.duration || 1,
    });
  }

  render();
}

// ── Timeline resize ───────────────────────────────────────
let resizingEvent       = null;
let resizeStartY        = 0;
let resizeInitialDuration = 1;

function startResizeEvent(ev, dateKey, eventId) {
  ev.preventDefault();
  ev.stopPropagation();

  const targetEv = (S.events[dateKey] || []).find(e => e.id === eventId);
  if (!targetEv) return;

  resizingEvent         = { dateKey, eventId };
  resizeStartY          = ev.clientY;
  resizeInitialDuration = getEventDuration(targetEv);

  window.addEventListener('pointermove', handleResizeMove);
  window.addEventListener('pointerup',   handleResizeEnd);
}

function handleResizeMove(ev) {
  if (!resizingEvent) return;

  const deltaY    = ev.clientY - resizeStartY;
  const deltaHours = Math.round(deltaY / HOUR_HEIGHT);
  const dayEvts   = S.events[resizingEvent.dateKey] || [];

  // Clamp so the event can't extend past 10pm
  const target      = dayEvts.find(e => e.id === resizingEvent.eventId);
  const startHour   = parseEventHour(target?.time) || 6;
  const maxDuration = 22 - startHour;
  const newDuration = Math.min(Math.max(1, resizeInitialDuration + deltaHours), maxDuration);

  if (target && getEventDuration(target) !== newDuration) {
    target.duration = newDuration;
    renderCalendar();
  }
}

function handleResizeEnd() {
  if (!resizingEvent) return;
  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup',   handleResizeEnd);
  resizingEvent = null;
  save();
}
