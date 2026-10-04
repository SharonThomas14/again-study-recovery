import { iso, addDays, dateLabel } from './planner.js';
import { projectScheduleEvents } from './schedule-events.js';
import { studyAvailability } from './calendar-availability.js';

const KEY = 'again.workspace-ui.v1';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const kinds = ['Study session', 'Exam', 'Class', 'Task', 'Other'];
const colors = { 'Study session': '#bcebed', Exam: '#f6a5aa', Class: '#bed7fa', Task: '#bdeca0', Other: '#dfc8f4' };
let data = { name: '', picture: '', theme: 'light', font: 'medium', events: [], feeds: [] };
try {
  const stored = JSON.parse(localStorage.getItem(KEY));
  if (stored && typeof stored === 'object') data = { ...data, ...stored, events: Array.isArray(stored.events) ? stored.events : [], feeds: Array.isArray(stored.feeds) ? stored.feeds : [] };
} catch {}
let api;
let calendarMode = 'week';
let homeMode = 'week';
let anchor = iso();
let eventType = 'Study session';
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { api.toast('Could not save your settings on this device.'); } };
const dayDate = (s) => new Date(s + 'T12:00:00');
const weekStart = (s) => { const d = dayDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const monthStart = (s) => s.slice(0, 7) + '-01';
const shift = (s, mode, n) => {
  if (mode === 'month') { const d = dayDate(monthStart(s)); d.setMonth(d.getMonth() + n); return iso(d); }
  return addDays(s, n * (mode === 'week' ? 7 : 1));
};
const allEvents = () => [...data.events, ...data.events.filter((e) => e.type === 'Task' && e.deadline && e.deadline !== e.date).map((e) => ({ date: e.deadline, title: e.title + ' deadline', type: 'Task', start: '', deadlineOnly: true })), ...data.feeds.flatMap((f) => f.events || [])];
export const calendarStudyAvailability = (start, deadline) => studyAvailability(allEvents(), start, deadline);
const eventsOn = (date) => allEvents().filter((e) => (e.date <= date && date <= (e.endDate || e.date)) || (e.repeat && e.date < date && (!e.repeatUntil || date <= e.repeatUntil) && (Math.round((dayDate(date) - dayDate(e.date)) / 86400000) % 7 === 0))).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
const dateRange = (mode, value) => {
  const start = mode === 'day' ? value : mode === 'week' ? weekStart(value) : weekStart(monthStart(value));
  const count = mode === 'day' ? 1 : mode === 'week' ? 7 : 42;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
};
const eventLine = (e) => {
  const tag = e.projectId || data.events.some((item) => item.id === e.id) ? 'button' : 'div';
  const target = e.projectId ? ` data-project-id="${esc(e.projectId)}"` : tag === 'button' ? ` data-event-id="${esc(e.id)}"` : '';
  const detail = e.minutes ? `${e.minutes} min · ${e.project}` : e.start || e.source || 'All day';
  return `<${tag} class="calendar-event"${target} style="--event-color:${/^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : (colors[e.type] || colors.Other)}" title="${esc(e.title)}"><span>${esc(detail)}</span><strong>${esc(e.title)}</strong></${tag}>`;
};
export function applyPreferences() {
  document.documentElement.dataset.theme = data.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.font = ['small', 'medium', 'large'].includes(data.font) ? data.font : 'medium';
  document.querySelectorAll('.avatar').forEach((el) => { el.innerHTML = data.picture ? `<img src="${esc(data.picture)}" alt="">` : esc((data.name || 'U').charAt(0).toUpperCase()); });
}
export function profileScreen() {
  return `<div class="eyebrow">YOUR SPACE</div><h1 class="large-heading">Profile</h1><div class="feature-grid"><section class="feature-card"><h2>About you</h2><div class="profile-preview">${data.picture ? `<img src="${esc(data.picture)}" alt="Your profile picture">` : `<span>${esc((data.name || 'U').charAt(0).toUpperCase())}</span>`}<div><strong>${esc(data.name || 'Your name')}</strong><p>Your study desk, your pace.</p></div></div><form id="profile-form"><label class="field">Name<input name="name" maxlength="80" value="${esc(data.name)}" placeholder="Your name"></label><label class="field">Profile picture<input name="picture" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="primary" type="submit">Save profile <span>↗</span></button></form></section><section class="feature-card"><h2>Settings</h2><label class="field">Appearance<select id="theme-select"><option value="light" ${data.theme === 'light' ? 'selected' : ''}>Day mode</option><option value="dark" ${data.theme === 'dark' ? 'selected' : ''}>Night mode</option></select></label><label class="field">Font Size<select id="font-select">${['small', 'medium', 'large'].map((x) => `<option value="${x}" ${data.font === x ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}</select></label><p class="hint">These settings are saved on this device.</p></section></div>`;
}
export function homeScreen(projects, courseDates = []) {
  const today = iso();
  const planned = projectScheduleEvents(projects);
  const tasks = [...planned, ...courseDates.map((e) => ({ ...e, project: e.source })), ...allEvents().filter((e) => e.type === 'Task' || e.type === 'Study session').map((e) => ({ ...e, project: e.source || e.type }))].sort((a,b) => a.date.localeCompare(b.date));
  const todayItems = tasks.filter((t) => t.date === today);
  const upcoming = tasks.filter((t) => t.date > today && t.date <= addDays(today, homeMode === 'week' ? 7 : 1));
  const row = (t) => `<div class="home-task"><span class="home-task-date">${dateLabel(t.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><div><strong>${esc(t.title)}</strong><small>${esc(t.project)}${t.minutes ? ` · ${t.minutes} min` : ''}</small></div></div>`;
  return `<div class="eyebrow">YOUR STUDY DESK</div><h1 class="large-heading">${data.name ? `Welcome back, ${esc(data.name.split(' ')[0])}.` : 'Home'}</h1><p class="subtext">See what needs your attention and what comes next.</p><div class="feature-grid"><section class="feature-card"><div class="section-title"><h2>Today’s tasks</h2><span class="tag">${dateLabel(today)}</span></div>${todayItems.length ? todayItems.map(row).join('') : '<p class="subtext">No tasks planned for today.</p>'}<button class="text-button" data-view="calendar">Open calendar ↗</button></section><section class="feature-card"><div class="section-title"><h2>Upcoming tasks</h2><div class="segmented"><button data-home-mode="day" class="${homeMode === 'day' ? 'selected' : ''}">Day</button><button data-home-mode="week" class="${homeMode === 'week' ? 'selected' : ''}">Week</button></div></div>${upcoming.length ? upcoming.slice(0, 12).map(row).join('') : '<p class="subtext">Nothing coming up in this view.</p>'}<button class="text-button" data-view="calendar">See all dates ↗</button></section></div><div class="plan-toolbar"><button class="secondary" data-action="new">+ New assignment</button><button class="secondary" data-view="library">Browse courses ↗</button></div>`;
}
export function calendarScreen(projects, courseDates = []) {
  const days = dateRange(calendarMode, anchor);
  const first = days[0], last = days.at(-1);
  const planned = projectScheduleEvents(projects).filter((e) => e.date >= first && e.date <= last);
  const deadlines = projects.filter((p) => p.deadline >= first && p.deadline <= last).map((p) => ({ date: p.deadline, title: p.title + ' deadline', type: 'Task', start: '', source: p.course || 'Assignment', projectId: p.projectId }));
  const day = (d) => {
    const items = [...eventsOn(d), ...planned.filter((x) => x.date === d), ...deadlines.filter((x) => x.date === d), ...courseDates.filter((x) => x.date === d)];
    return `<div class="calendar-day ${d === iso() ? 'is-today' : ''} ${calendarMode === 'month' && d.slice(0,7) !== anchor.slice(0,7) ? 'outside-month' : ''}"><div class="calendar-day-head"><b>${dateLabel(d, { weekday: 'short', day: 'numeric' })}</b><button data-add-date="${d}" aria-label="Add event on ${d}">+</button></div>${items.length ? items.map(eventLine).join('') : '<span class="calendar-empty">No events</span>'}</div>`;
  };
  const label = calendarMode === 'month' ? dateLabel(monthStart(anchor), { month: 'long', year: 'numeric' }) : `${dateLabel(first, { day: 'numeric', month: 'short' })} – ${dateLabel(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return `<div class="eyebrow">TIME IN VIEW</div><h1 class="large-heading">Calendar</h1><div class="calendar-toolbar"><div><button class="secondary" data-cal-nav="today">Today</button><button class="secondary" data-cal-nav="prev" aria-label="Previous period">←</button><button class="secondary" data-cal-nav="next" aria-label="Next period">→</button><strong>${esc(label)}</strong></div><div><div class="segmented">${['day','week','month'].map((x) => `<button data-cal-mode="${x}" class="${calendarMode === x ? 'selected' : ''}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div><button class="primary" data-workspace="add-event">+ Add event</button></div></div><div class="calendar-grid ${calendarMode}">${days.map(day).join('')}</div><section class="feature-card calendar-connect"><h2>Connect a calendar</h2><p class="subtext">Import an iCalendar (.ics) export from Google Calendar or your Canvas Calendar feed. Imported events appear here alongside your own events.</p><div class="button-row"><button class="secondary" data-workspace="import-google">Import Google Calendar</button><button class="secondary" data-workspace="import-canvas">Import Canvas Calendar</button></div>${data.feeds.length ? `<p class="hint">Imported: ${data.feeds.map((f) => esc(f.name)).join(', ')}</p>` : ''}</section>`;
}
function eventForm(date = iso()) {
  api.modal(`${api.header(`New ${eventType === 'Other' ? 'event' : eventType.toLowerCase()}`)}<div class="segmented event-tabs">${kinds.map((x) => `<button type="button" data-event-type="${x}" class="${x === eventType ? 'selected' : ''}">${x}</button>`).join('')}</div><form id="event-form"><label class="field">${eventType === 'Class' ? 'Class name' : eventType === 'Exam' ? 'Exam name' : 'Title'}<input name="title" maxlength="120" required placeholder="${eventType === 'Class' ? 'e.g. Organic Chemistry' : eventType === 'Exam' ? 'e.g. Chapter 4 midterm' : 'What are you planning?'}"></label><div class="form-row"><label class="field">Date<input name="date" type="date" required value="${date}"></label><label class="field">Course (optional)<input name="course" maxlength="100" placeholder="Course or study set"></label></div><div class="form-row"><label class="field">Start<input name="start" type="time" value="18:00"></label><label class="field">End<input name="end" type="time" value="19:00"></label></div>${eventType === 'Task' ? '<label class="field">Deadline (optional)<input name="deadline" type="date"></label>' : ''}<fieldset class="color-field"><legend>Event color</legend>${['#bcebed','#bdeca0','#f5ec85','#facb9f','#f6a5aa','#dfc8f4','#ad7af6','#bed7fa','#c9b59f'].map((color) => `<label title="${color}"><input type="radio" name="color" value="${color}" ${color === colors[eventType] ? 'checked' : ''}><span style="background:${color}"></span></label>`).join('')}</fieldset><label class="field">Details<textarea name="details" rows="3" maxlength="1000" placeholder="Add details"></textarea></label><label class="choice"><input name="repeat" type="checkbox"><span>Repeat weekly</span></label><p id="event-error" class="error" role="alert"></p><div class="button-row"><button type="button" class="secondary" data-action="close">Cancel</button><button type="submit" class="primary">Create <span>↗</span></button></div></form>`);
}
function importForm(source) {
  api.modal(`${api.header(`Import ${source} Calendar`)}<p class="subtext">Export or download an .ics calendar file from ${source}, then choose it below. You can import a newer file later to replace this source’s events.</p><form id="calendar-import-form" data-source="${source}"><label class="field">Calendar file<input name="calendar" type="file" accept=".ics,text/calendar" required></label><p id="calendar-import-error" class="error" role="alert"></p><button type="submit" class="primary">Import events <span>↗</span></button></form>`);
}
function icsStamp(raw) {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(raw || '');
  if (!match) return null;
  if (match[7]) {
    const local = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0)));
    return { date: iso(local), time: `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}` };
  }
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: match[4] ? `${match[4]}:${match[5]}` : '' };
}
function parseICS(text) {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events = []; let item = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { item = {}; continue; }
    if (line === 'END:VEVENT') {
      if (item?.DTSTART && item.SUMMARY) {
        const start = icsStamp(item.DTSTART), end = icsStamp(item.DTEND);
        const until = /UNTIL=(\d{4})(\d{2})(\d{2})/.exec(item.RRULE || '');
        if (start) events.push({ id: item.UID || crypto.randomUUID(), date: start.date, endDate: end?.date > start.date ? (start.time ? end.date : addDays(end.date, -1)) : start.date, start: start.time, end: end?.time || '', repeat: /(?:^|;)FREQ=WEEKLY(?:;|$)/.test(item.RRULE || ''), repeatUntil: until ? `${until[1]}-${until[2]}-${until[3]}` : '', title: item.SUMMARY.replace(/\\([,;\\n])/g, (_, x) => x === 'n' ? ' ' : x), type: 'Other' });
      }
      item = null; continue;
    }
    if (item && line.includes(':')) { const i = line.indexOf(':'); const key = line.slice(0,i).split(';')[0]; if (['DTSTART','DTEND','SUMMARY','UID','RRULE'].includes(key)) item[key] = line.slice(i+1); }
  }
  return events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).slice(0,2000);
}
export function initWorkspace(callbacks) {
  api = callbacks; applyPreferences();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-event-id')) {
      const item = data.events.find((x) => x.id === b.dataset.eventId);
      if (item) api.modal(`${api.header(esc(item.title))}<p class="subtext">${esc(item.type)} · ${dateLabel(item.date)}${item.start ? ` at ${esc(item.start)}` : ''}${item.repeat ? ' · repeats weekly' : ''}</p>${item.course ? `<p class="subtext">${esc(item.course)}</p>` : ''}${item.details ? `<p>${esc(item.details)}</p>` : ''}<div class="button-row"><button class="secondary" data-workspace="delete-event" data-id="${esc(item.id)}">Delete event</button></div>`);
      return;
    }
    if (b.dataset.workspace === 'delete-event') { data.events = data.events.filter((x) => x.id !== b.dataset.id); persist(); api.close(); api.render(); api.toast('Event deleted.'); return; }
    if (b.dataset.homeMode) { homeMode = b.dataset.homeMode; api.render(); return; }
    if (b.dataset.calMode) { calendarMode = b.dataset.calMode; api.render(); return; }
    if (b.dataset.calNav) { anchor = b.dataset.calNav === 'today' ? iso() : shift(anchor, calendarMode, b.dataset.calNav === 'prev' ? -1 : 1); api.render(); return; }
    if (b.dataset.addDate) { eventType = 'Study session'; eventForm(b.dataset.addDate); return; }
    if (b.dataset.eventType) { const date = document.querySelector('#event-form [name=date]')?.value || iso(); eventType = b.dataset.eventType; eventForm(date); return; }
    if (b.dataset.workspace === 'add-event') { eventType = 'Study session'; eventForm(); }
    if (b.dataset.workspace === 'import-google') importForm('Google');
    if (b.dataset.workspace === 'import-canvas') importForm('Canvas');
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'theme-select') { data.theme = e.target.value; persist(); applyPreferences(); }
    if (e.target.id === 'font-select') { data.font = e.target.value; persist(); applyPreferences(); }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target;
    if (f.id === 'profile-form') {
      e.preventDefault(); data.name = f.elements.name.value.trim();
      const file = f.elements.picture.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { api.toast('Choose a picture under 5 MB.'); return; }
        try {
          const bitmap = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 160;
          const context = canvas.getContext('2d'); const size = Math.min(bitmap.width, bitmap.height); context.drawImage(bitmap, (bitmap.width-size)/2, (bitmap.height-size)/2, size, size, 0, 0, 160, 160);
          data.picture = canvas.toDataURL('image/jpeg', .8); bitmap.close();
        } catch { api.toast('Could not read that picture.'); return; }
      }
      persist(); applyPreferences(); api.render(); api.toast('Profile saved.'); return;
    }
    if (f.id === 'event-form') {
      e.preventDefault(); const d = new FormData(f); const start = String(d.get('start')), end = String(d.get('end'));
      if (start && end && end <= start) { f.querySelector('#event-error').textContent = 'End time must be after start time.'; return; }
      data.events.push({ id: crypto.randomUUID(), type: eventType, color: String(d.get('color') || colors[eventType]), title: String(d.get('title')).trim(), date: String(d.get('date')), start, end, course: String(d.get('course')).trim(), deadline: String(d.get('deadline') || ''), details: String(d.get('details')).trim(), repeat: d.has('repeat') });
      persist(); api.close(); api.render(); api.toast(`${eventType} added to your calendar.`); return;
    }
    if (f.id === 'calendar-import-form') {
      e.preventDefault();
      try { const file = f.elements.calendar.files[0]; if (file.size > 5 * 1024 * 1024) throw Error('Choose a calendar file under 5 MB.'); const events = parseICS(await file.text()); if (!events.length) throw Error('No dated events found in this calendar file.'); const source = f.dataset.source; data.feeds = data.feeds.filter((x) => x.name !== source); data.feeds.push({ name: source, events }); persist(); api.close(); api.render(); api.toast(`${events.length} ${source} events imported.`); }
      catch (err) { f.querySelector('#calendar-import-error').textContent = err.message; }
    }
  });
}
export function workspaceExport() { return data; }
export function workspaceRestore(value) { if (!value || !Array.isArray(value.events) || !Array.isArray(value.feeds)) return; data = value; persist(); applyPreferences(); }
export function clearWorkspace() { data = { name: '', picture: '', theme: 'light', font: 'medium', events: [], feeds: [] }; localStorage.removeItem(KEY); applyPreferences(); }
