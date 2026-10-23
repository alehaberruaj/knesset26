// Partidos y promedio de encuestas (MEF Poll of Polls, octubre 2026).
const PARTIES = [
  { id: 'likud',   name: 'Likud',                   leader: 'Benjamin Netanyahu', color: '#1f6fd6', poll: 22 },
  { id: 'yashar',  name: 'Yashar!',                 leader: 'Gadi Eisenkot',      color: '#00a6a6', poll: 22 },
  { id: 'beyahad', name: 'Beyajad (Juntos)',        leader: 'Naftali Bennett',    color: '#2b3a8f', poll: 13 },
  { id: 'dems',    name: 'Los Demócratas',          leader: 'Yair Golan',         color: '#e0313b', poll: 10 },
  { id: 'otzma',   name: 'Otzmá Yehudit',           leader: 'Itamar Ben-Gvir',    color: '#f28c18', poll: 8 },
  { id: 'shas',    name: 'Shas',                    leader: 'Aryeh Deri',         color: '#5b6577', poll: 8 },
  { id: 'utj',     name: 'Yahadut HaTorá',          leader: 'Yaakov Asher',       color: '#6b4f2a', poll: 8 },
  { id: 'ib',      name: 'Israel Beitenu',          leader: 'Avigdor Liberman',   color: '#5bc0eb', poll: 8 },
  { id: 'joint',   name: 'Lista Conjunta',          leader: 'Yousef Jabareen',    color: '#2e9e44', poll: 8 },
  { id: 'rz',      name: 'Sionismo Religioso',      leader: 'Bezalel Smotrich',   color: '#8a6dd8', poll: 7 },
  { id: 'raam',    name: "Ra'am",                   leader: 'Mansour Abbas',      color: '#7cbf3a', poll: 6 },
  { id: 'reserv',  name: 'Reservistas',             leader: 'Yoaz Hendel',        color: '#8c9aa8', poll: 0 },
  { id: 'amcha',   name: 'Amchá Israel',            leader: 'Ofer Winter',        color: '#c9a227', poll: 0 },
];
const TOTAL = 120, MAJORITY = 61, MIN_SEATS = 4, MAX_SEATS = 45;
const byId = Object.fromEntries(PARTIES.map(p => [p.id, p]));

const state = { seats: {}, coalition: new Set(), pm: null };
PARTIES.forEach(p => (state.seats[p.id] = 0));

const $ = s => document.querySelector(s);
const sum = ids => ids.reduce((a, id) => a + state.seats[id], 0);
const total = () => sum(PARTIES.map(p => p.id));
const coalSeats = () => sum([...state.coalition]);

// Umbral: 0 o al menos 4 bancas.
function snap(v, prev) {
  v = Math.max(0, Math.min(MAX_SEATS, Math.round(v)));
  if (v > 0 && v < MIN_SEATS) return prev >= MIN_SEATS ? 0 : MIN_SEATS;
  return v;
}

// Nunca más de 120 en total: el máximo de un partido es lo suyo más lo que queda libre.
function clampSeats(id, v) {
  const cur = state.seats[id], max = cur + TOTAL - total();
  const next = snap(Math.min(v, max), cur);
  return next <= max ? next : cur;
}

// ---------- UI ----------
function buildList() {
  const ul = $('#parties');
  ul.innerHTML = '';
  for (const p of PARTIES) {
    const li = document.createElement('li');
    li.className = 'party';
    li.style.setProperty('--c', p.color);
    li.dataset.id = p.id;
    li.innerHTML = `
      <div class="top">
        <div><h3>${p.name}</h3><div class="leader">${p.leader}</div></div>
        <div class="poll">Encuestas: ${p.poll || '<4'}</div>
      </div>
      <div class="stepper">
        <button class="minus" aria-label="Restar banca">−</button>
        <span class="seats">0</span>
        <button class="plus" aria-label="Sumar banca">+</button>
        <input type="range" min="0" max="${MAX_SEATS}" value="0" aria-label="Bancas de ${p.name}">
      </div>
      <button class="coalbtn">+ Coalición</button>`;
    const set = v => { state.seats[p.id] = clampSeats(p.id, v); render(); };
    li.querySelector('.minus').onclick = () => {
      const s = state.seats[p.id];
      set(s === MIN_SEATS ? 0 : s - 1);
    };
    li.querySelector('.plus').onclick = () => {
      const s = state.seats[p.id];
      set(s === 0 ? MIN_SEATS : s + 1);
    };
    li.querySelector('input').oninput = e => set(+e.target.value);
    li.querySelector('.coalbtn').onclick = () => {
      if (state.coalition.has(p.id)) state.coalition.delete(p.id);
      else if (state.seats[p.id] > 0) state.coalition.add(p.id);
      render();
    };
    ul.appendChild(li);
  }
}

function render() {
  // Un partido sin bancas no puede estar en la coalición.
  for (const id of [...state.coalition]) if (!state.seats[id]) state.coalition.delete(id);

  for (const li of document.querySelectorAll('.party')) {
    const id = li.dataset.id, s = state.seats[id], inC = state.coalition.has(id);
    li.querySelector('.seats').textContent = s;
    li.querySelector('input').value = s;
    li.classList.toggle('in', inC);
    const cb = li.querySelector('.coalbtn');
    cb.textContent = inC ? '✓ En la coalición' : '+ Coalición';
    cb.disabled = !s;
    li.querySelector('.plus').disabled = clampSeats(id, s === 0 ? MIN_SEATS : s + 1) === s;
  }

  const t = total(), c = coalSeats();
  $('#total').textContent = t;
  $('#coal').textContent = c;
  $('#totalBox').className = 'counter ' + (t === TOTAL ? 'ok' : '');
  $('#coalBox').className = 'counter ' + (c >= MAJORITY ? 'ok' : '');

  // Primer ministro: por defecto, el líder del partido más grande de la coalición.
  const coal = coalitionSorted();
  const pmSel = $('#pm');
  pmSel.innerHTML = coal.map(id => `<option value="${id}">${byId[id].leader} (${byId[id].name})</option>`).join('');
  if (!state.coalition.has(state.pm)) state.pm = coal[0] || null;
  if (state.pm) pmSel.value = state.pm;
  $('#pmWrap').hidden = coal.length === 0;

  let msg, ok = t === TOTAL;
  if (t < TOTAL) msg = `Te faltan repartir ${TOTAL - t} bancas.`;
  else if (c >= MAJORITY) msg = `✅ Tu coalición suma ${c} bancas: hay gobierno.`;
  else msg = `Tu coalición suma ${c}: le faltan ${MAJORITY - c} para llegar a 61. Sumá socios o pronosticá nuevas elecciones.`;
  $('#status').textContent = msg;
  $('#goGov').disabled = !(ok && c >= MAJORITY);
  $('#goElections').disabled = !ok;

  drawMini();
  saveHash();
}

function coalitionSorted() {
  return [...state.coalition].sort((a, b) => state.seats[b] - state.seats[a]);
}

// Orden de la herradura: coalición a la izquierda, oposición a la derecha.
function seatOrder() {
  const coal = coalitionSorted();
  const rest = PARTIES.map(p => p.id).filter(id => !state.coalition.has(id) && state.seats[id] > 0)
    .sort((a, b) => state.seats[b] - state.seats[a]);
  return [...coal, ...rest];
}

// ---------- Hemiciclo ----------
let seatPositions = null;
function layoutSeats() {
  if (seatPositions) return seatPositions;
  const rows = 7, r0 = 0.42, r1 = 1;
  const radii = Array.from({ length: rows }, (_, i) => r0 + (r1 - r0) * i / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  let counts = radii.map(r => Math.floor(TOTAL * r / sumR));
  let left = TOTAL - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; left > 0; i--, left--) counts[i]++;
  const pts = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let k = 0; k < n; k++) {
      const a = Math.PI - Math.PI * k / (n - 1);
      pts.push({ x: Math.cos(a) * r, y: -Math.sin(a) * r, a, r });
    }
  });
  pts.sort((p, q) => q.a - p.a || p.r - q.r);
  seatPositions = pts;
  return pts;
}

function drawHemicycle(ctx, cx, cy, R, dot, { dimOpposition = false, empty = '#2a3f74' } = {}) {
  const pts = layoutSeats();
  const colors = [];
  for (const id of seatOrder()) {
    const dim = dimOpposition && !state.coalition.has(id);
    for (let i = 0; i < state.seats[id]; i++) colors.push({ c: byId[id].color, dim });
  }
  pts.forEach((p, i) => {
    const col = colors[i];
    ctx.globalAlpha = col ? (col.dim ? 0.28 : 1) : 1;
    ctx.fillStyle = col ? col.c : empty;
    ctx.beginPath();
    ctx.arc(cx + p.x * R, cy + p.y * R, dot, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawMini() {
  const cv = $('#mini'), ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawHemicycle(ctx, cv.width / 2, cv.height - 8, 150, 5.2, { dimOpposition: state.coalition.size > 0 });
}

// ---------- Imagen final ----------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawCard(mode) {
  try { await document.fonts.load('900 40px Heebo'); await document.fonts.load('500 20px Heebo'); } catch {}
  const cv = $('#card'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  const F = (w, s) => `${w} ${s}px Heebo, system-ui, sans-serif`;
  const gov = mode === 'gov';

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e1d42'); g.addColorStop(1, '#070f24');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.fillStyle = '#a9b6d8';
  ctx.font = F(700, 28);
  ctx.fillText('ELECCIONES EN ISRAEL · KNÉSET 26 · 27/10/2026', W / 2, 70);
  ctx.fillStyle = '#eef2ff'; ctx.font = F(900, 64);
  const author = $('#author').value.trim();
  ctx.fillText(author ? `El pronóstico de ${author}` : 'Mi pronóstico', W / 2, 145);

  // Hemiciclo
  const cx = W / 2, cy = 600, R = 390;
  drawHemicycle(ctx, cx, cy, R, 15, { dimOpposition: gov, empty: '#22335f' });
  ctx.fillStyle = '#eef2ff';
  if (gov) {
    ctx.font = F(900, 110); ctx.fillText(coalSeats(), cx, cy - 40);
    ctx.font = F(500, 28); ctx.fillStyle = '#a9b6d8'; ctx.fillText('bancas de la coalición', cx, cy);
  } else {
    ctx.font = F(900, 96); ctx.fillText('¿61?', cx, cy - 30);
  }

  // Veredicto
  const by = 650, bh = 150;
  roundRect(ctx, 60, by, W - 120, bh, 24);
  ctx.fillStyle = gov ? '#4aa3ff' : '#ffcc4d'; ctx.fill();
  ctx.fillStyle = gov ? '#04122e' : '#2a1d00';
  if (gov) {
    const pm = byId[state.pm];
    ctx.font = F(700, 30); ctx.fillText('HAY GOBIERNO · PRIMER MINISTRO/A', cx, by + 55);
    ctx.font = F(900, 56); ctx.fillText(pm.leader, cx, by + 118);
  } else {
    ctx.font = F(900, 58); ctx.fillText('¡NUEVAS ELECCIONES!', cx, by + 75);
    ctx.font = F(500, 30); ctx.fillText('Nadie logra armar una coalición de 61', cx, by + 120);
  }

  // Lista de partidos
  const list = seatOrder();
  const coalList = list.filter(id => gov && state.coalition.has(id));
  const restList = list.filter(id => !(gov && state.coalition.has(id)));
  const top = by + bh + 50;
  const drawCol = (title, ids, x, w) => {
    ctx.textAlign = 'left'; ctx.fillStyle = '#a9b6d8'; ctx.font = F(700, 26);
    ctx.fillText(title, x, top);
    const rowH = Math.min(52, (H - top - 110) / Math.max(ids.length, 1));
    ids.forEach((id, i) => {
      const p = byId[id], y = top + 30 + i * rowH;
      roundRect(ctx, x, y, 10, rowH - 12, 4); ctx.fillStyle = p.color; ctx.fill();
      ctx.fillStyle = '#eef2ff'; ctx.font = F(500, Math.min(32, rowH * 0.62));
      ctx.textAlign = 'left'; ctx.fillText(p.name, x + 26, y + rowH * 0.62);
      ctx.textAlign = 'right'; ctx.font = F(900, Math.min(34, rowH * 0.66));
      ctx.fillText(state.seats[id], x + w, y + rowH * 0.62);
    });
  };
  if (gov) {
    drawCol(`COALICIÓN · ${coalSeats()}`, coalList, 70, 440);
    drawCol(`OPOSICIÓN · ${TOTAL - coalSeats()}`, restList, 570, 440);
  } else {
    const half = Math.ceil(list.length / 2);
    drawCol('BANCAS', list.slice(0, half), 70, 440);
    drawCol('', list.slice(half), 570, 440);
  }

  // Pie
  ctx.textAlign = 'center'; ctx.fillStyle = '#6f7fa8'; ctx.font = F(500, 26);
  ctx.fillText(`¿Y vos qué pronosticás? · ${location.host || 'knesset26'}`, W / 2, H - 40);
}

let lastMode = 'gov';
async function openCard(mode) {
  lastMode = mode;
  await drawCard(mode);
  $('#modal').hidden = false;
}

function cardBlob() {
  return new Promise(res => $('#card').toBlob(res, 'image/png'));
}
const fileName = () => `pronostico-knesset26-${lastMode === 'gov' ? 'gobierno' : 'elecciones'}.png`;

async function download() {
  const blob = await cardBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function share() {
  const blob = await cardBlob();
  const file = new File([blob], fileName(), { type: 'image/png' });
  const text = lastMode === 'gov'
    ? `Mi pronóstico para la Knéset 26: gobierno de ${coalSeats()} bancas con ${byId[state.pm].leader} como PM. ¿Y el tuyo?`
    : 'Mi pronóstico para la Knéset 26: ¡nuevas elecciones! ¿Y el tuyo?';
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text} ${location.href}` }); } catch {}
  } else {
    await download();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${location.href}`)}`, '_blank');
  }
}

// ---------- Estado en el link ----------
function saveHash() {
  const s = PARTIES.filter(p => state.seats[p.id]).map(p => `${p.id}.${state.seats[p.id]}`).join(',');
  const c = coalitionSorted().join(',');
  const h = new URLSearchParams();
  if (s) h.set('b', s);
  if (c) h.set('c', c);
  if (state.pm) h.set('pm', state.pm);
  history.replaceState(null, '', h.toString() ? '#' + h.toString() : location.pathname);
}

function loadHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.has('b')) return false;
  for (const pair of h.get('b').split(',')) {
    const [id, n] = pair.split('.');
    if (byId[id]) state.seats[id] = clampSeats(id, +n || 0);
  }
  for (const id of (h.get('c') || '').split(',')) if (byId[id] && state.seats[id]) state.coalition.add(id);
  if (byId[h.get('pm')]) state.pm = h.get('pm');
  return true;
}

// ---------- Init ----------
buildList();
loadHash();
render();

$('#loadPolls').onclick = () => { PARTIES.forEach(p => (state.seats[p.id] = p.poll)); render(); };
$('#clearAll').onclick = () => { PARTIES.forEach(p => (state.seats[p.id] = 0)); state.coalition.clear(); render(); };
$('#pm').onchange = e => { state.pm = e.target.value; saveHash(); };
$('#goGov').onclick = () => openCard('gov');
$('#goElections').onclick = () => openCard('elections');
$('#closeModal').onclick = () => ($('#modal').hidden = true);
$('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').hidden = true; };
$('#download').onclick = download;
$('#share').onclick = share;
$('#copyLink').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); $('#copyLink').textContent = '¡Link copiado!'; }
  catch { prompt('Copiá este link:', location.href); }
  setTimeout(() => ($('#copyLink').textContent = 'Copiar link'), 1800);
};
