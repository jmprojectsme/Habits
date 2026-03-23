// ═══════════════════════════════════════════════════════
//  Habits — app.js  v1.0.0
//  Daily habit tracker with streaks, heatmap, localStorage
// ═══════════════════════════════════════════════════════

const EMOJIS  = ['💪','🏃','📚','💧','🧘','🥗','😴','✍️','🎯','🎵','🌿','💊','🚴','🧠','🙏','⚡'];
const COLORS  = ['#7c6aff','#22d17a','#ff5f5f','#ffc94a','#06b6d4','#f97316','#ec4899','#a855f7'];
const MOTIVES = [
  'Keep the streak alive 🔥',
  'Small steps, big changes 💪',
  'Consistency is key ✨',
  'You got this today! 🎯',
  'Build the life you want 🌱',
  'One day at a time 🌅',
  'Progress over perfection 🚀'
];

let habits   = JSON.parse(localStorage.getItem('habits_v2')   || '[]');
let todayLog = JSON.parse(localStorage.getItem('habitLog_v2') || '{}');
let selEmoji = EMOJIS[0];
let selColor = COLORS[0];

const todayKey = () => new Date().toISOString().slice(0, 10);

function save() {
  localStorage.setItem('habits_v2',   JSON.stringify(habits));
  localStorage.setItem('habitLog_v2', JSON.stringify(todayLog));
}

// ── Init ───────────────────────────────────────────────
function init() {
  const now = new Date();
  document.getElementById('dayNum').textContent    = now.getDate();
  document.getElementById('monthName').textContent = now.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
  document.getElementById('dateLabel').textContent = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('motiveLine').textContent = MOTIVES[now.getDay() % MOTIVES.length];

  buildEmojiPicker();
  buildColorPicker();
  render();

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(r  => console.log('SW registered:', r.scope))
        .catch(e => console.warn('SW failed:', e));
    });
  }
}

// ── Render ─────────────────────────────────────────────
function render() {
  renderHabits();
  renderStats();
  renderHeatmap();
}

function renderHabits() {
  const list  = document.getElementById('habitsList');
  if (!habits.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🌱</div><p>No habits yet.<br>Tap <strong>+</strong> to add your first habit.</p></div>`;
    return;
  }

  const today = todayKey();
  const done  = todayLog[today] || [];

  list.innerHTML = habits.map(h => {
    const isDone   = done.includes(h.id);
    const streak   = getStreak(h.id);
    const weekDots = getWeekDots(h.id);
    return `
      <div class="habit-card ${isDone ? 'done' : ''}" onclick="toggleHabit('${h.id}')" style="--habit-color:${h.color}">
        <div class="check">${isDone ? '✓' : ''}</div>
        <div class="habit-info">
          <div class="habit-name">${h.emoji} ${h.name}</div>
          <div class="habit-meta">
            <span class="habit-time">${h.time}</span>
            ${streak > 0 ? `<span class="habit-streak">🔥 ${streak} day${streak > 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        <div class="habit-right">
          <div class="week-dots">${weekDots}</div>
          <button class="del-btn" onclick="deleteHabit(event,'${h.id}')">✕</button>
        </div>
      </div>`;
  }).join('');
}

function renderStats() {
  const today = todayKey();
  const done  = (todayLog[today] || []).length;
  const total = habits.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const best  = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);

  document.getElementById('statDone').textContent    = done;
  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statStreak').textContent  = best;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
}

function renderHeatmap() {
  const grid  = document.getElementById('heatmap');
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now   = new Date();
  const total = habits.length;
  let html    = '';

  for (let i = 6; i >= 0; i--) {
    const d    = new Date(now);
    d.setDate(d.getDate() - i);
    const key  = d.toISOString().slice(0, 10);
    const done = (todayLog[key] || []).length;
    const cls  = done === 0 ? '' : (done >= total && total > 0 ? 'full' : 'has-data');
    html += `<div class="hm-day ${cls}"><span class="hm-lbl">${days[d.getDay()]}</span><span class="hm-count">${done || ''}</span></div>`;
  }
  grid.innerHTML = html;
}

// ── Streak ─────────────────────────────────────────────
function getStreak(id) {
  let streak = 0;
  const now  = new Date();
  for (let i = 0; i < 365; i++) {
    const d   = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if ((todayLog[key] || []).includes(id)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function getWeekDots(id) {
  const now = new Date();
  let html  = '';
  for (let i = 6; i >= 0; i--) {
    const d       = new Date(now);
    d.setDate(d.getDate() - i);
    const key     = d.toISOString().slice(0, 10);
    const done    = (todayLog[key] || []).includes(id);
    const isToday = i === 0;
    html += `<div class="dot ${done ? 'done' : ''} ${isToday ? 'today' : ''}"></div>`;
  }
  return html;
}

// ── Toggle Habit ───────────────────────────────────────
function toggleHabit(id) {
  const today = todayKey();
  if (!todayLog[today]) todayLog[today] = [];
  const idx = todayLog[today].indexOf(id);
  if (idx === -1) {
    todayLog[today].push(id);
    const h = habits.find(h => h.id === id);
    showToast(h.emoji + ' ' + h.name + ' done! 🎉');
  } else {
    todayLog[today].splice(idx, 1);
  }
  save();
  render();
}

// ── Delete Habit ───────────────────────────────────────
function deleteHabit(e, id) {
  e.stopPropagation();
  if (!confirm('Remove this habit?')) return;
  habits = habits.filter(h => h.id !== id);
  save();
  render();
}

// ── Add Habit ──────────────────────────────────────────
function addHabit() {
  const name = document.getElementById('fName').value.trim();
  const time = document.getElementById('fTime').value;
  if (!name) { document.getElementById('fName').focus(); return; }

  const habit = {
    id:      Date.now().toString(),
    name:    name,
    emoji:   selEmoji,
    color:   selColor,
    time:    time,
    created: todayKey()
  };
  habits.push(habit);
  save();
  closeModal();
  render();
  showToast(selEmoji + ' ' + name + ' added!');
}

// ── Modal ──────────────────────────────────────────────
function openModal() {
  document.getElementById('fName').value = '';
  document.getElementById('modalBg').classList.add('open');
  setTimeout(function() { document.getElementById('fName').focus(); }, 100);
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open');
}

document.getElementById('modalBg').addEventListener('click', function(e) {
  if (e.target === document.getElementById('modalBg')) closeModal();
});

document.getElementById('fName').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addHabit();
});

// ── Pickers ────────────────────────────────────────────
function buildEmojiPicker() {
  document.getElementById('emojiPicker').innerHTML = EMOJIS.map(function(em) {
    return '<button class="emoji-opt ' + (em === selEmoji ? 'selected' : '') + '" onclick="pickEmoji(\'' + em + '\')">' + em + '</button>';
  }).join('');
}

function buildColorPicker() {
  document.getElementById('colorPicker').innerHTML = COLORS.map(function(c) {
    return '<div class="color-opt ' + (c === selColor ? 'selected' : '') + '" style="background:' + c + '" onclick="pickColor(\'' + c + '\')"></div>';
  }).join('');
}

function pickEmoji(em) {
  selEmoji = em;
  document.querySelectorAll('.emoji-opt').forEach(function(b) {
    b.classList.toggle('selected', b.textContent === em);
  });
}

function pickColor(c) {
  selColor = c;
  document.querySelectorAll('.color-opt').forEach(function(b) {
    b.classList.toggle('selected', b.style.background === c);
  });
}

// ── Toast ──────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

// ── Start ──────────────────────────────────────────────
init();
