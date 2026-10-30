const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STORAGE = { user: 'classly-user', assignments: 'classly-assignments', classes: 'classly-classes' };
const palettes = ['#8e75df', '#53ad8c', '#e3a267', '#e17e8a', '#5c9ed3'];
const $ = (selector) => document.querySelector(selector);
const today = new Date();
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays = (date, amount) => { const next = new Date(date); next.setDate(next.getDate()+amount); return next; };
const dayIndex = (date) => (date.getDay() + 6) % 7;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let user = read(STORAGE.user, '');
let assignments = read(STORAGE.assignments, null);
let classes = read(STORAGE.classes, null);
let activeFilter = 'all';
let selectedDay = dayIndex(today);
let showAllAssignments = false;

function seedData() {
  if (!Array.isArray(assignments)) {
    const daysUntilSunday = 6 - dayIndex(today);
    assignments = [
      { id: crypto.randomUUID(), title: 'Read chapter 4 & answer questions', subject: 'Biology', due: localDate(addDays(today, Math.min(1, daysUntilSunday))), priority: 'Normal', done: false },
      { id: crypto.randomUUID(), title: 'Practice quadratic equations', subject: 'Mathematics', due: localDate(addDays(today, Math.min(2, daysUntilSunday))), priority: 'High', done: false },
      { id: crypto.randomUUID(), title: 'Write a short story draft', subject: 'English', due: localDate(addDays(today, Math.min(4, daysUntilSunday))), priority: 'Low', done: false },
      { id: crypto.randomUUID(), title: 'Label the cell diagram', subject: 'Biology', due: localDate(addDays(today, -1)), priority: 'Normal', done: true },
    ];
    save(STORAGE.assignments, assignments);
  }
  if (!Array.isArray(classes)) {
    classes = [
      { id: crypto.randomUUID(), name: 'Mathematics', day: 0, start: '08:00', end: '09:00', room: 'Room 14' },
      { id: crypto.randomUUID(), name: 'English Language', day: 0, start: '09:30', end: '10:30', room: 'Room 08' },
      { id: crypto.randomUUID(), name: 'Biology', day: 1, start: '10:00', end: '11:00', room: 'Science Lab' },
      { id: crypto.randomUUID(), name: 'History', day: 2, start: '08:30', end: '09:30', room: 'Room 12' },
      { id: crypto.randomUUID(), name: 'Chemistry', day: 3, start: '11:00', end: '12:00', room: 'Science Lab' },
      { id: crypto.randomUUID(), name: 'Computer Studies', day: 4, start: '09:00', end: '10:00', room: 'ICT Room' },
    ];
    save(STORAGE.classes, classes);
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function setIdentity(name) {
  const trimmed = name.trim();
  user = trimmed;
  save(STORAGE.user, user);
  $('#profile-name').textContent = user;
  $('#welcome-name').textContent = user.split(/\s+/)[0];
  const initial = user.charAt(0).toUpperCase();
  $('#avatar').textContent = initial;
  $('#top-avatar').textContent = initial;
}

function renderLogin() {
  $('#login-view').hidden = Boolean(user);
  $('#dashboard-view').hidden = !user;
  if (user) { setIdentity(user); seedData(); renderDashboard(); }
}

function startOfWeek(date) { const result = new Date(date); result.setDate(result.getDate() - dayIndex(result)); result.setHours(0,0,0,0); return result; }
function formatDue(value) {
  const date = new Date(`${value}T00:00:00`);
  const delta = Math.round((date - new Date(`${localDate(today)}T00:00:00`)) / 86400000);
  if (delta === 0) return 'Due today';
  if (delta === 1) return 'Due tomorrow';
  if (delta === -1) return '1 day overdue';
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
function renderAssignments() {
  const list = $('#assignment-list');
  const filtered = assignments.filter(item => activeFilter === 'all' || (activeFilter === 'open' ? !item.done : item.done))
    .sort((a,b) => Number(a.done)-Number(b.done) || a.due.localeCompare(b.due));
  const visible = showAllAssignments ? filtered : filtered.slice(0, 4);
  $('#open-count').textContent = assignments.filter(item => !item.done).length;
  $('#nav-task-count').textContent = assignments.filter(item => !item.done).length;
  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><span>✦</span>${activeFilter === 'done' ? 'Nothing completed yet — your first check-off is waiting.' : 'All clear! Add an assignment whenever one comes up.'}</div>`;
    return;
  }
  list.innerHTML = visible.map(item => {
    const index = Math.abs([...item.subject].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palettes.length;
    const urgent = !item.done && item.due <= localDate(today);
    return `<article class="assignment-item ${item.done ? 'is-done' : ''}">
      <button class="check-button ${item.done ? 'checked' : ''}" data-action="toggle" data-id="${item.id}" aria-label="${item.done ? 'Mark incomplete' : 'Mark complete'} ${escapeHtml(item.title)}">${item.done ? '✓' : ''}</button>
      <div class="assignment-info"><div class="assignment-title">${escapeHtml(item.title)}</div><div class="assignment-subtitle"><span class="subject-dot" style="background:${palettes[index]}"></span>${escapeHtml(item.subject)}</div></div>
      ${item.priority !== 'Normal' && !item.done ? `<span class="priority ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span>` : ''}
      <span class="due-label ${urgent ? 'urgent' : ''}">${formatDue(item.due)}</span>
      <button class="sign-out" data-action="delete-assignment" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.title)}">×</button>
    </article>`;
  }).join('');
}

function renderWeek() {
  const strip = $('#week-strip');
  const monday = startOfWeek(today);
  strip.innerHTML = DAYS.map((day, index) => {
    const date = addDays(monday, index);
    return `<button class="day-button ${index === selectedDay ? 'selected' : ''} ${index === dayIndex(today) ? 'today' : ''}" data-day="${index}" aria-label="${day} ${date.getDate()}"><span>${day.slice(0,3)}</span><span>${date.getDate()}</span></button>`;
  }).join('');
  const chosen = addDays(monday, selectedDay);
  $('#selected-day-label').textContent = DAYS[selectedDay].toUpperCase();
  $('#class-day').innerHTML = DAYS.map((day,index) => `<option value="${index}" ${index === selectedDay ? 'selected' : ''}>${day}</option>`).join('');
  const dayClasses = classes.filter(item => Number(item.day) === selectedDay).sort((a,b) => a.start.localeCompare(b.start));
  $('#class-count-label').textContent = `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}`;
  $('#class-list').innerHTML = dayClasses.length ? dayClasses.map(item => `<article class="class-item"><span class="class-time">${item.start}</span><span class="class-color"></span><div class="class-details"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.room || 'Room not set')} · ${item.start}–${item.end}</span></div><button class="sign-out" data-action="delete-class" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button></article>`).join('') : `<div class="empty-state">No classes on ${DAYS[selectedDay]} yet.</div>`;
  updateNextClass(chosen, dayClasses);
}

function updateNextClass(chosenDate, visibleClasses) {
  const currentDay = dayIndex(today);
  let upcoming = null;
  if (selectedDay === currentDay) upcoming = visibleClasses.find(item => item.start > `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`);
  if (selectedDay !== currentDay || !upcoming) {
    for (let offset = 0; offset < 7 && !upcoming; offset++) {
      const index = (currentDay + offset) % 7;
      const candidates = classes.filter(item => Number(item.day) === index).sort((a,b) => a.start.localeCompare(b.start));
      const next = offset === 0 ? candidates.find(item => item.start > `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`) : candidates[0];
      if (next) { upcoming = next; break; }
    }
  }
  $('#next-class').textContent = upcoming ? upcoming.name : 'All clear';
  $('#next-class-sub').textContent = upcoming ? `${DAYS[Number(upcoming.day)].slice(0,3)} · ${upcoming.start} · ${upcoming.room || 'Room to be set'}` : 'Add a class to your timetable';
}

function renderDashboard() {
  $('#today-label').textContent = today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const monday = startOfWeek(today), sunday = addDays(monday, 6);
  const weekTasks = assignments.filter(item => item.due >= localDate(monday) && item.due <= localDate(sunday) && !item.done);
  $('#due-week-count').textContent = weekTasks.length;
  $('#completed-count').textContent = assignments.filter(item => item.done).length;
  renderAssignments();
  renderWeek();
}

function openDialog(id) { const dialog = document.getElementById(id); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open',''); }
function closeDialog(id) { const dialog = document.getElementById(id); if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); }

$('#login-form').addEventListener('submit', event => { event.preventDefault(); setIdentity($('#student-name').value); renderLogin(); showToast(`Welcome to CampusDay, ${user.split(/\s+/)[0]}!`); });
$('#sign-out').addEventListener('click', () => { user = ''; localStorage.removeItem(STORAGE.user); renderLogin(); });
$('#add-assignment-top').addEventListener('click', () => { $('#assignment-due').value = localDate(today); openDialog('assignment-dialog'); });
$('#add-class').addEventListener('click', () => openDialog('class-dialog'));
$('#view-all').addEventListener('click', () => { showAllAssignments = !showAllAssignments; $('#view-all').innerHTML = showAllAssignments ? 'Show less <span>↑</span>' : 'View all <span>→</span>'; renderAssignments(); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(chip => chip.classList.toggle('selected', chip === button));
  showAllAssignments = false;
  $('#view-all').innerHTML = 'View all <span>→</span>';
  renderAssignments();
}));
$('#week-strip').addEventListener('click', event => { const button = event.target.closest('[data-day]'); if (!button) return; selectedDay = Number(button.dataset.day); renderWeek(); });
$('#assignment-list').addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const item = assignments.find(task => task.id === button.dataset.id); if (!item) return;
  if (button.dataset.action === 'toggle') { item.done = !item.done; showToast(item.done ? 'Assignment marked complete. Nice work!' : 'Assignment moved back to your list.'); }
  if (button.dataset.action === 'delete-assignment') { assignments = assignments.filter(task => task.id !== item.id); showToast('Assignment removed.'); }
  save(STORAGE.assignments, assignments); renderDashboard();
});
$('#class-list').addEventListener('click', event => {
  const button = event.target.closest('[data-action="delete-class"]'); if (!button) return;
  classes = classes.filter(item => item.id !== button.dataset.id); save(STORAGE.classes, classes); renderDashboard(); showToast('Class removed from your timetable.');
});

$('#assignment-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  assignments.push({ id: crypto.randomUUID(), title: data.get('title').trim(), subject: data.get('subject').trim(), due: data.get('due'), priority: data.get('priority'), done: false });
  save(STORAGE.assignments, assignments); event.currentTarget.reset(); closeDialog('assignment-dialog'); activeFilter = 'all';
  document.querySelectorAll('[data-filter]').forEach(chip => chip.classList.toggle('selected', chip.dataset.filter === 'all'));
  showAllAssignments = true; $('#view-all').innerHTML = 'Show less <span>↑</span>'; renderDashboard(); showToast('Assignment added to your planner.');
});
$('#class-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget);
  if (data.get('end') <= data.get('start')) { showToast('End time should be after the start time.'); return; }
  classes.push({ id: crypto.randomUUID(), name: data.get('name').trim(), day: Number(data.get('day')), start: data.get('start'), end: data.get('end'), room: data.get('room').trim() });
  selectedDay = Number(data.get('day')); save(STORAGE.classes, classes); event.currentTarget.reset(); closeDialog('class-dialog'); renderDashboard(); showToast('Class added to your timetable.');
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog.id); }));

renderLogin();
