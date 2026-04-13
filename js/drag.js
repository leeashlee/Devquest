// ════════════════════════════════════════
//  DRAG — Drag & drop + timeline resize
// ════════════════════════════════════════

// ── Drag from task list → calendar ───────────────────────
function dragStart(ev, text, color, duration = 1, priority = null, pId = null, cId = null, tId = null) {
  ev.dataTransfer.setData('text/plain', JSON.stringify({ text, color, duration, priority, pId, cId, tId }));
}

// ── Drag existing calendar event to a new slot ────────────
function dragStartEvent(ev, dateKey, eventId) {
  ev.dataTransfer.setData('text/plain', JSON.stringify({ moveEvent: true, dateKey, eventId }));
}

// ── Drop target helpers ───────────────────────────────────
function allowDrop(ev) { ev.preventDefault(); }
function dragEnter(ev) { ev.currentTarget.classList.add('drag-over'); }
function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }

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
    // Move an existing event
    const sourceEvts = S.events[data.dateKey] || [];
    const evIdx = sourceEvts.findIndex(e => e.id === data.eventId);
    if (evIdx === -1) return;

    const movedEv = sourceEvts[evIdx];
    
    if (hour !== null) {
      // Find exact available start time (e.g., 10.5 if 10.0 is taken)
      const newStart = getFreeStart(dateKey, hour, getEventDuration(movedEv), data.eventId);
      if (newStart === null) return; // Abort drop if no space fits the duration
      movedEv.time = formatHour(newStart);
    }

    sourceEvts.splice(evIdx, 1);
    S.events[dateKey].push(movedEv);

  } else {
    // Drop a new task
    const duration = data.duration || 1;
    let newStart = null;

    if (hour !== null) {
      newStart = getFreeStart(dateKey, hour, duration, null);
      if (newStart === null) return; // Abort drop if no space
    }

    S.events[dateKey].push({
      id: String(S.nextId++),
      text: data.text,
      color: data.color,
      time: newStart !== null ? formatHour(newStart) : '',
      duration: duration,
      priority: data.priority || null,
      taskRef: (data.pId != null) ? { pId: data.pId, cId: data.cId, tId: data.tId } : null,
    });
  }

  render();
}

// ── Timeline resize ───────────────────────────────────────
let resizingEvent = null;
let resizeStartY = 0;
let resizeInitialDuration = 1;

function startResizeEvent(ev, dateKey, eventId) {
  ev.preventDefault();
  ev.stopPropagation();

  const targetEv = (S.events[dateKey] || []).find(e => e.id === eventId);
  if (!targetEv) return;

  // ─── ADD THIS LINE ───
  // Disable scrolling/gestures on the whole page during the resize
  document.body.style.touchAction = 'none';

  ev.target.setPointerCapture(ev.pointerId);

  resizingEvent = { dateKey, eventId };
  resizeStartY = ev.clientY;
  resizeInitialDuration = getEventDuration(targetEv);

  window.addEventListener('pointermove', handleResizeMove, { passive: false });
  window.addEventListener('pointerup', handleResizeEnd);
  document.querySelector('.cal-wrapper').classList.add('is-interacting');
}

function handleResizeMove(ev) {
  if (!resizingEvent) return;

  ev.preventDefault();

  const isMobile = window.innerWidth <= 900;
  const currentHourH = isMobile ? 60 : 50;
  const deltaY = ev.clientY - resizeStartY;

  // Snap to 15-min (0.25h) increments
  const deltaHours = Math.round((deltaY / currentHourH) * 4) / 4;
  const dayEvts = S.events[resizingEvent.dateKey] || [];
  const target = dayEvts.find(e => e.id === resizingEvent.eventId);
  const startHour = parseEventHour(target?.time) || 6;

  // Hard cap: can't resize past 10pm OR into the next event's start hour
  const nextStart = nextOccupiedHour(resizingEvent.dateKey, startHour, resizingEvent.eventId);
  const maxDuration = Math.min(22 - startHour, nextStart - startHour);
  const newDuration = Math.min(Math.max(0.25, resizeInitialDuration + deltaHours), maxDuration);

  if (target && getEventDuration(target) !== newDuration) {
    target.duration = newDuration;
    renderCalendar();
  }
}

function handleResizeEnd() {
  if (!resizingEvent) return;

  // ─── ADD THIS LINE ───
  // Restore default scrolling behavior
  document.body.style.touchAction = '';

  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup', handleResizeEnd);
  document.querySelector('.cal-wrapper').classList.remove('is-interacting');
  resizingEvent = null;
  save();
}
