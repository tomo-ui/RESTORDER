'use strict';
/* Zamówienia – PWA do zamawiania u dostawców. Dane trzymane lokalnie (localStorage). */
const KEY = 'zamowienia.v1';
const UNITS = ['szt', 'kg', 'op.', 'karton', 'l', 'zgrz.', 'pęczek', 'worek'];
const COLORS = ['#d9531e', '#2e7d4f', '#3b6fb6', '#8e44ad', '#c0392b', '#b7791f', '#0e8a8a'];
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GEAR = '<svg class="gear" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const ico = (d, w = 2.4, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I_BACK = ico('<path d="M15.5 4.5 8 12l7.5 7.5"/>', 2.8, 26);
const I_EDIT = ico('<path d="M17 3.2a2.8 2.8 0 0 1 4 4L7.6 20.6 2.5 21.9l1.3-5.1L17 3.2z"/>', 2.1, 21);
const I_MORE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';
const I_X = ico('<path d="M6 6l12 12M18 6 6 18"/>', 2.4, 18);
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- dane ---------- */
function defaultUnit(cat) {
  return /mięs|wędl|warzyw|owoc|pieczark|mąk/i.test(cat) ? 'kg' : 'szt';
}
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const SPLIT_SPECIAL = {
  'Jajka L / pod carbonarę': ['Jajka L', 'Jajka pod carbonarę'],
  'Pomidorki datterino – żółte / czerwone': ['Pomidorki datterino – żółte', 'Pomidorki datterino – czerwone'],
  'Sól morska, sól drobna, pieprz mielony, pieprz w kulkach': ['Sól morska', 'Sól drobna', 'Pieprz mielony', 'Pieprz w kulkach'],
  'Rzeczy wkładka (salsa truflowa, ryż)': ['Salsa truflowa (wkładka)', 'Ryż (wkładka)'],
  'Łosoś / perliczka / policzek': ['Łosoś', 'Perliczka', 'Policzek']
};
// „A / B” = dwa osobne produkty
function splitName(name) {
  if (SPLIT_SPECIAL[name]) return SPLIT_SPECIAL[name];
  return name.split(/\s\/\s/).map(x => cap(x.trim())).filter(Boolean);
}
function seedState() {
  return {
    ver: 2,
    settings: { restaurant: 'Przypalona', signature: 'Dziękuję!' },
    suppliers: window.SEED.map((s, i) => ({
      id: uid(), name: s.name, phone: '', logo: s.logo || '', color: COLORS[i % COLORS.length], lastSent: 0,
      products: s.products.flatMap(([cat, name]) => splitName(name).map(n => ({ id: uid(), cat, name: n, unit: defaultUnit(cat), qty: 0, note: '' })))
    }))
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.suppliers) {
        // odśwież wbudowane loga (zapisane wcześniej ścieżki lub brak logo)
        s.suppliers.forEach(x => {
          const d = window.SEED.find(z => z.name.toLowerCase() === x.name.toLowerCase());
          if (d && d.logo && (!x.logo || x.logo.startsWith('icons/logos/'))) x.logo = d.logo;
        });
        if (!s.ver || s.ver < 2) { // jednorazowo: rozdziel pozycje „A / B”
          s.suppliers.forEach(x => {
            x.products = x.products.flatMap(p => {
              const parts = splitName(p.name);
              if (parts.length < 2) return [p];
              return parts.map((n, i) => ({ ...p, id: i ? uid() : p.id, name: n, qty: i ? 0 : p.qty, note: i ? '' : p.note }));
            });
          });
          s.ver = 2;
        }
        return s;
      }
    }
  } catch (e) { /* tryb prywatny itp. */ }
  return seedState();
}
let S = load();
try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* brak miejsca */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Nie można zapisać danych!'); } }
const sup = id => S.suppliers.find(s => s.id === id);
const ordered = s => s.products.filter(p => p.qty > 0);
const fmt = q => String(Math.round(q * 100) / 100).replace('.', ',');
const stepOf = () => 1; // ułamki wpisuje się dotykając ilości

let ui = { view: 'home', sid: null, only: false, edit: false, q: '' };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- logo / awatar ---------- */
function logoHtml(s, cls = '') {
  if (s.logo) return `<div class="logo ${cls}"><img src="${esc(s.logo)}" alt="" onerror="this.parentNode.outerHTML=window.avatar(${JSON.stringify(s.id)},'${cls}')"></div>`;
  return avatar(s.id, cls);
}
function avatar(id, cls) {
  const s = sup(id);
  return `<div class="logo ph ${cls}" style="background:${s.color}">${esc(s.name.trim().slice(0, 2).toUpperCase())}</div>`;
}
window.avatar = avatar;

/* ---------- widoki ---------- */
const scr = () => $('#app > .screen.cur');
function render(dir) {
  document.title = ui.view === 'home' ? 'RESTORDER' : sup(ui.sid).name;
  const app = $('#app'), old = scr();
  const el = document.createElement('div');
  el.className = 'screen cur';
  if (old) {
    old.classList.remove('cur', 'in-fwd', 'in-back');
    if (dir) { // stary ekran zostaje na czas animacji (bez id, nieklikalny)
      old.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      old.setAttribute('inert', '');
    } else old.remove();
  }
  app.appendChild(el);
  if (ui.view === 'home') renderHome(el); else renderSupplier(el);
  if (dir && old) {
    old.classList.add(dir === 'fwd' ? 'out-fwd' : 'out-back');
    el.classList.add(dir === 'fwd' ? 'in-fwd' : 'in-back');
    setTimeout(() => old.remove(), 420);
  }
}

function renderHome(el) {
  const cards = S.suppliers.map(s => {
    const n = ordered(s).length;
    const sent = s.lastSent ? ` · wysłano ${new Date(s.lastSent).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}` : '';
    return `<div class="sup ${n ? 'has' : ''}" data-act="open" data-id="${s.id}">
      ${logoHtml(s)}
      <div class="name">${esc(s.name)}</div>
      <div class="meta">${n ? `<b>${n}</b> do zamówienia` : `${s.products.length} produktów`}${n ? '' : esc(sent)}</div>
      <button class="sms-btn" data-act="sms" data-id="${s.id}" ${n ? '' : 'disabled'}>✉ SMS${n ? ` (${n})` : ''}</button>
    </div>`;
  }).join('');
  el.innerHTML = `
    <div class="topbar"><img class="brand" src="icons/logo.svg" alt="">
      <h1 class="wm">RESTORDER<small>${esc(S.settings.restaurant)}</small></h1>
      <button class="icon-btn" data-act="settings" aria-label="Ustawienia">${GEAR}</button></div>
    <div class="scroll"><div class="grid">${cards}
      <div class="sup add" data-act="addsup"><div class="plus">＋</div>Dodaj dostawcę</div></div></div>`;
}

function renderSupplier(el) {
  const s = sup(ui.sid);
  el.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" data-act="home" aria-label="Wróć">${I_BACK}</button>
      ${logoHtml(s, 'sm')}
      <h1>${esc(s.name)}</h1>
      <button class="icon-btn ${ui.edit ? 'on' : ''}" data-act="toggleedit" aria-label="Edytuj listę">${I_EDIT}</button>
      <button class="icon-btn" data-act="editsup" aria-label="Dostawca">${I_MORE}</button>
    </div>
    <div class="search">
      <input id="q" type="search" placeholder="Szukaj produktu…" value="${esc(ui.q)}" autocomplete="off">
      <button class="chip ${ui.only ? 'on' : ''}" data-act="only">Zamówione</button>
      <button class="add-top" data-act="addprod" aria-label="Dodaj produkt">＋</button>
    </div>
    <div class="scroll"><div id="list"></div></div>
    <div class="bar" id="bar"></div>`;
  el.querySelector('#q').addEventListener('input', e => { ui.q = e.target.value; renderList(); });
  renderList(); renderBar();
}

function visibleProducts(s) {
  const q = ui.q.trim().toLowerCase();
  return s.products.filter(p => (!ui.only || p.qty > 0) && (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)));
}

function rowHtml(p) {
  const on = p.qty > 0;
  const right = ui.edit
    ? `<button class="edit-btn" data-act="editprod" data-pid="${p.id}" aria-label="Edytuj">${I_EDIT}</button>`
    : `<div class="step">
        <button class="b" data-act="dec" data-pid="${p.id}" ${on ? '' : 'disabled'} aria-label="Mniej">−</button>
        <button class="q ${on ? '' : 'zero'}" data-act="qty" data-pid="${p.id}"><span class="v">${on ? fmt(p.qty) : '0'}</span><span class="u">${esc(p.unit)}</span></button>
        <button class="b plus" data-act="inc" data-pid="${p.id}" aria-label="Więcej">+</button>
      </div>`;
  const grip = ui.edit && !ui.q.trim() && !ui.only ? `<div class="grip" data-pid="${p.id}" aria-label="Przeciągnij">⋮⋮</div>` : '';
  return `<div class="row ${on && !ui.edit ? 'on' : ''}" data-pid="${p.id}">${grip}
    <div class="pn"><div class="t">${esc(p.name)}</div>${p.note ? `<div class="n">${esc(p.note)}</div>` : ''}</div>${right}</div>`;
}

function renderList() {
  const s = sup(ui.sid);
  const prods = visibleProducts(s);
  const groups = [];
  prods.forEach(p => {
    let g = groups.find(g => g.cat === p.cat);
    if (!g) groups.push(g = { cat: p.cat, items: [] });
    g.items.push(p);
  });
  let html = groups.map(g => {
    const n = g.items.filter(p => p.qty > 0).length;
    return `<div class="cat"><span>${esc(g.cat)}</span><span class="cnt">${n ? n + ' zam.' : ''}</span></div>
      <div class="rows">${g.items.map(rowHtml).join('')}</div>`;
  }).join('');
  if (!prods.length) html = `<div class="empty">${ui.only ? 'Nic jeszcze nie zamówiono.' : 'Brak produktów.'}</div>`;
  $('#list').innerHTML = html;
}

function renderBar() {
  const s = sup(ui.sid), n = ordered(s).length;
  $('#bar').innerHTML = `<button class="main" data-act="sms" data-id="${s.id}" ${n ? '' : 'disabled'}>${n ? `✉ Generuj SMS (${n})` : 'Dodaj ilości, aby wygenerować SMS'}</button>`;
}

function patchRow(pid) {
  const s = sup(ui.sid), p = s.products.find(x => x.id === pid);
  const el = scr().querySelector(`.row[data-pid="${pid}"]`);
  if (!el) return;
  if (ui.only && p.qty <= 0) { renderList(); } else {
    el.outerHTML = rowHtml(p);
    // licznik w nagłówku kategorii
    const rows = scr().querySelector(`.row[data-pid="${pid}"]`).closest('.rows');
    const cnt = rows.previousElementSibling.querySelector('.cnt');
    const n = s.products.filter(x => x.cat === p.cat && x.qty > 0).length;
    cnt.textContent = n ? n + ' zam.' : '';
  }
  renderBar();
}

/* ---------- arkusze ---------- */
function openSheet(html, mount) {
  closeSheet(true);
  const b = document.createElement('div');
  b.className = 'backdrop';
  b.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  b.addEventListener('click', e => { if (e.target === b) closeSheet(); });
  $('#sheet-root').appendChild(b);
  document.documentElement.classList.add('sheet-open');
  attachSwipe(b);
  if (mount) mount(b.firstElementChild);
}
function closeSheet(instant) {
  const root = $('#sheet-root'), b = root.firstElementChild;
  document.documentElement.classList.remove('sheet-open');
  if (!b) return;
  if (instant === true) { root.innerHTML = ''; return; }
  if (b.classList.contains('closing')) return;
  b.classList.add('closing');
  setTimeout(() => b.remove(), 240);
}
// przesunięcie palcem w dół zamyka panel (jak w iOS)
function attachSwipe(b) {
  const sh = b.firstElementChild;
  let st = null;
  b.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('textarea') || b.classList.contains('closing')) return;
    const p = e.touches[0];
    st = { x: p.clientX, y: p.clientY, t: Date.now(), on: false, dy: 0, ok: sh.scrollTop <= 0 || !!e.target.closest('.grab,h2') };
  }, { passive: true });
  b.addEventListener('touchmove', e => {
    if (!st) return;
    const p = e.touches[0], dy = p.clientY - st.y, dx = p.clientX - st.x;
    if (!st.on) {
      if (st.ok && dy > 8 && dy > Math.abs(dx) * 1.2) { st.on = true; sh.style.transition = 'none'; sh.style.animation = 'none'; }
      else { if (Math.abs(dx) > 12 || dy < -6) st = null; return; }
    }
    if (e.cancelable) e.preventDefault();
    st.dy = Math.max(0, dy);
    sh.style.transform = `translateY(${st.dy}px)`;
    b.style.background = `rgba(20,10,5,${0.5 * Math.max(0, 1 - st.dy / 450)})`;
  }, { passive: false });
  const end = cancel => {
    if (!st) return;
    const s0 = st; st = null;
    if (!s0.on) return;
    const v = s0.dy / Math.max(1, Date.now() - s0.t);
    if (!cancel && (s0.dy > sh.offsetHeight * 0.3 || (v > 0.6 && s0.dy > 40))) {
      document.documentElement.classList.remove('sheet-open');
      b.classList.add('closing');
      b.style.animation = 'none';
      sh.style.transition = 'transform .24s cubic-bezier(.4,0,1,1)';
      sh.style.transform = 'translateY(100%)';
      b.style.transition = 'background .24s';
      b.style.background = 'rgba(20,10,5,0)';
      setTimeout(() => b.remove(), 250);
    } else {
      sh.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.2)';
      sh.style.transform = '';
      b.style.transition = 'background .3s';
      b.style.background = '';
    }
  };
  b.addEventListener('touchend', () => end(false));
  b.addEventListener('touchcancel', () => end(true));
}
const sheetHead = t => `<h2>${t}<button class="x" data-act="close" aria-label="Zamknij">${I_X}</button></h2>`;

function qtySheet(pid) {
  const s = sup(ui.sid), p = s.products.find(x => x.id === pid);
  let unit = p.unit;
  openSheet(`${sheetHead(esc(p.name))}
    <label>Ilość</label>
    <input id="f-qty" class="big-in" inputmode="decimal" value="${p.qty ? fmt(p.qty) : ''}" placeholder="0" autocomplete="off">
    <label>Jednostka</label>
    <div class="units" id="f-units">${UNITS.map(u => `<button class="chip ${u === unit ? 'on' : ''}" data-u="${u}">${u}</button>`).join('')}</div>
    <label>Uwaga do dostawcy (opcjonalnie)</label>
    <input id="f-note" value="${esc(p.note)}" placeholder="np. dojrzałe, krojone, na piątek" autocomplete="off">
    <div class="btns"><button class="btn" data-act="close">Anuluj</button><button class="btn pri" id="f-ok">Zapisz</button></div>`,
  sh => {
    sh.querySelector('#f-units').addEventListener('click', e => {
      const u = e.target.dataset.u; if (!u) return; unit = u;
      sh.querySelectorAll('#f-units .chip').forEach(c => c.classList.toggle('on', c.dataset.u === u));
    });
    sh.querySelector('#f-ok').onclick = () => {
      const v = parseFloat(sh.querySelector('#f-qty').value.replace(',', '.'));
      p.qty = isNaN(v) || v < 0 ? 0 : v; p.unit = unit; p.note = sh.querySelector('#f-note').value.trim();
      save(); closeSheet(); patchRow(pid);
    };
    const i = sh.querySelector('#f-qty'); i.focus(); i.select();
  });
}

function catList(s) { return [...new Set(s.products.map(p => p.cat))]; }

function prodSheet(pid) {
  const s = sup(ui.sid), p = pid ? s.products.find(x => x.id === pid) : null;
  const cats = catList(s);
  const others = S.suppliers.filter(x => x.id !== s.id);
  openSheet(`${sheetHead(p ? 'Edytuj / zamień produkt' : 'Nowy produkt')}
    <label>Nazwa produktu</label><input id="f-name" value="${esc(p?.name || '')}" placeholder="np. Mozzarella" autocomplete="off">
    <label>Kategoria</label><input id="f-cat" list="cats" value="${esc(p?.cat || ui.lastCat || cats[0] || '')}" placeholder="np. Sery / nabiał" autocomplete="off">
    <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <label>Jednostka domyślna</label>
    <select id="f-unit">${UNITS.map(u => `<option ${u === (p?.unit || 'szt') ? 'selected' : ''}>${u}</option>`).join('')}</select>
    ${p && others.length ? `<label>Przenieś do innego dostawcy</label>
      <select id="f-move"><option value="">— zostaw u ${esc(s.name)} —</option>${others.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>` : ''}
    <div class="btns">${p ? '<button class="btn danger" id="f-del">Usuń</button>' : ''}<button class="btn pri" id="f-ok">Zapisz</button></div>
    ${p ? '<div class="hint">Zamiana produktu = zmień nazwę i zapisz (ilość zostaje, możesz ją wyzerować).</div>' : ''}`,
  sh => {
    sh.querySelector('#f-ok').onclick = () => {
      const name = sh.querySelector('#f-name').value.trim(), cat = sh.querySelector('#f-cat').value.trim() || 'Inne';
      if (!name) return toast('Podaj nazwę produktu');
      const unit = sh.querySelector('#f-unit').value;
      ui.lastCat = cat;
      if (p) {
        Object.assign(p, { name, cat, unit });
        const mv = sh.querySelector('#f-move')?.value;
        if (mv) {
          s.products = s.products.filter(x => x !== p);
          addProduct(sup(mv), p);
          toast(`Przeniesiono do: ${sup(mv).name}`);
        }
      } else addProduct(s, { id: uid(), cat, name, unit, qty: 0, note: '' });
      save(); closeSheet(); render();
    };
    const del = sh.querySelector('#f-del');
    if (del) del.onclick = () => {
      if (!confirm(`Usunąć „${p.name}” u dostawcy ${s.name}?`)) return;
      s.products = s.products.filter(x => x !== p); save(); closeSheet(); render();
    };
    if (!p) sh.querySelector('#f-name').focus();
  });
}
// nowy produkt ląduje na końcu swojej kategorii
function addProduct(s, p) {
  let idx = -1;
  s.products.forEach((x, i) => { if (x.cat === p.cat) idx = i; });
  if (idx < 0) s.products.push(p); else s.products.splice(idx + 1, 0, p);
}

function supSheet(id) {
  const s = id ? sup(id) : { name: '', phone: '', logo: '', color: COLORS[S.suppliers.length % COLORS.length] };
  let logo = s.logo;
  openSheet(`${sheetHead(id ? 'Dostawca' : 'Nowy dostawca')}
    <label>Nazwa</label><input id="f-name" value="${esc(s.name)}" autocomplete="off">
    <label>Numer telefonu (do SMS)</label><input id="f-phone" type="tel" inputmode="tel" value="${esc(s.phone)}" placeholder="+48 600 000 000" autocomplete="off">
    <label>Logo</label>
    <div class="logo-edit"><div id="f-prev"></div>
      <div style="flex:1"><label class="btn" style="margin:0;display:block;color:var(--text);font-size:15px">Wybierz zdjęcie / logo
        <input id="f-file" type="file" accept="image/*" hidden></label>
      <button class="btn" id="f-nologo" style="margin-top:8px;width:100%">Usuń logo</button></div></div>
    <div class="btns">${id ? '<button class="btn danger" id="f-del">Usuń dostawcę</button>' : ''}<button class="btn pri" id="f-ok">Zapisz</button></div>`,
  sh => {
    const prev = () => { sh.querySelector('#f-prev').innerHTML = logo ? logoHtml({ ...s, logo, id: id || 'x' }) : `<div class="logo ph" style="background:${s.color}">${esc((sh.querySelector('#f-name').value || '?').slice(0, 2).toUpperCase())}</div>`; };
    prev();
    sh.querySelector('#f-name').addEventListener('input', () => { if (!logo) prev(); });
    sh.querySelector('#f-nologo').onclick = () => { logo = ''; prev(); };
    sh.querySelector('#f-file').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image(); img.onload = () => {
        const k = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        logo = c.toDataURL('image/png'); prev();
      };
      img.src = URL.createObjectURL(f);
    };
    sh.querySelector('#f-ok').onclick = () => {
      const name = sh.querySelector('#f-name').value.trim(); if (!name) return toast('Podaj nazwę');
      const phone = sh.querySelector('#f-phone').value.trim();
      if (id) Object.assign(s, { name, phone, logo });
      else S.suppliers.push({ id: uid(), name, phone, logo, color: s.color, lastSent: 0, products: [] });
      save(); closeSheet(); render();
    };
    const del = sh.querySelector('#f-del');
    if (del) del.onclick = () => {
      if (!confirm(`Usunąć dostawcę ${s.name} wraz z listą produktów?`)) return;
      S.suppliers = S.suppliers.filter(x => x.id !== id); save(); closeSheet(); ui.view = 'home'; render();
    };
  });
}

/* ---------- SMS ---------- */
const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };

function buildSms(s, o) {
  let head = `Dzień dobry, zamówienie ${S.settings.restaurant}`;
  if (o.date) { const [y, m, d] = o.date.split('-'); head += ` na ${d}.${m}`; }
  const lines = ordered(s).map(p => `- ${p.name} - ${fmt(p.qty)} ${p.unit}${p.note ? ` (${p.note})` : ''}`);
  return `${head}:\n${lines.join('\n')}\n${S.settings.signature}`.trim();
}

function smsSheet(id) {
  const s = sup(id);
  const o = { date: tomorrow() };
  openSheet(`${sheetHead(`SMS do: ${esc(s.name)}`)}
    <label>Telefon dostawcy</label><input id="f-phone" type="tel" inputmode="tel" value="${esc(s.phone)}" placeholder="+48 600 000 000" autocomplete="off">
    <label>Dostawa na dzień (opcjonalnie)</label><input id="f-date" type="date" value="${o.date}">
    <label>Treść wiadomości (możesz poprawić)</label><textarea id="f-text"></textarea>
    <div class="btns">
      <button class="btn pri" id="b-sms">✉ Otwórz w SMS</button>
      <button class="btn" id="b-copy">Kopiuj</button>
      <button class="btn" id="b-share">Udostępnij</button>
    </div>
    <div class="sep"></div>
    <div class="btns"><button class="btn danger" id="b-clear">Wyczyść ilości tego dostawcy</button></div>`,
  sh => {
    const ta = sh.querySelector('#f-text');
    const regen = () => { o.date = sh.querySelector('#f-date').value; ta.value = buildSms(s, o); };
    sh.querySelector('#f-date').oninput = regen;
    regen();
    const phone = () => { const v = sh.querySelector('#f-phone').value.trim(); if (v !== s.phone) { s.phone = v; save(); } return v.replace(/[^\d+]/g, ''); };
    sh.querySelector('#b-sms').onclick = () => {
      const ph = phone();
      s.lastSent = Date.now(); save();
      location.href = `sms:${ph}${isIOS ? '&' : '?'}body=${encodeURIComponent(ta.value)}`;
    };
    sh.querySelector('#b-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(ta.value); toast('Skopiowano'); }
      catch (e) { ta.select(); document.execCommand('copy'); toast('Skopiowano'); }
    };
    const shareBtn = sh.querySelector('#b-share');
    if (!navigator.share) shareBtn.style.display = 'none';
    shareBtn.onclick = () => navigator.share({ text: ta.value }).catch(() => {});
    sh.querySelector('#b-clear').onclick = () => {
      if (!confirm(`Wyzerować wszystkie ilości u dostawcy ${s.name}?`)) return;
      s.products.forEach(p => p.qty = 0); save(); closeSheet(); render(); toast('Ilości wyczyszczone');
    };
  });
}

/* ---------- ustawienia ---------- */
function settingsSheet() {
  openSheet(`${sheetHead('Ustawienia')}
    <label>Nazwa restauracji (w SMS)</label><input id="f-rest" value="${esc(S.settings.restaurant)}" autocomplete="off">
    <label>Podpis na końcu SMS</label><input id="f-sig" value="${esc(S.settings.signature)}" autocomplete="off">
    <div class="btns"><button class="btn pri" id="f-ok">Zapisz</button></div>
    <div class="sep"></div>
    <div class="btns">
      <button class="btn" id="b-export">Eksport kopii (JSON)</button>
      <button class="btn" id="b-import">Import kopii</button>
      <input type="file" id="f-imp" accept="application/json,.json" hidden>
    </div>
    <div class="btns"><button class="btn" id="b-clearall">Wyczyść wszystkie ilości</button></div>
    <div class="btns"><button class="btn danger" id="b-reset">Przywróć dane startowe z pliku</button></div>
    <div class="hint">Dane są zapisane tylko na tym telefonie. Robiąc kopię JSON możesz przenieść listy na inne urządzenie.</div>
    <div class="hint" id="diag"></div>`,
  sh => {
    // diagnostyka pełnego ekranu
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
    sh.querySelector('#diag').textContent = `Ekran: ${innerWidth}×${innerHeight} (urządzenie ${screen.width}×${screen.height}) · safe-area góra/dół ${cs.paddingTop}/${cs.paddingBottom} · ${standalone ? 'aplikacja zainstalowana' : 'w przeglądarce'}`;
    probe.remove();
    sh.querySelector('#f-ok').onclick = () => {
      S.settings.restaurant = sh.querySelector('#f-rest').value.trim() || 'Restauracja';
      S.settings.signature = sh.querySelector('#f-sig').value.trim();
      save(); closeSheet(); render();
    };
    sh.querySelector('#b-export').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
      a.download = `zamowienia-kopia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    };
    sh.querySelector('#b-import').onclick = () => sh.querySelector('#f-imp').click();
    sh.querySelector('#f-imp').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        const d = JSON.parse(t); if (!d.suppliers) throw 0;
        if (!confirm('Zastąpić obecne dane kopią z pliku?')) return;
        S = d; save(); closeSheet(); ui = { view: 'home', sid: null, only: false, edit: false, q: '' }; render(); toast('Zaimportowano');
      }).catch(() => toast('Nieprawidłowy plik'));
    };
    sh.querySelector('#b-clearall').onclick = () => {
      if (!confirm('Wyzerować ilości u wszystkich dostawców?')) return;
      S.suppliers.forEach(s => s.products.forEach(p => p.qty = 0)); save(); closeSheet(); render();
    };
    sh.querySelector('#b-reset').onclick = () => {
      if (!confirm('Zastąpić WSZYSTKIE dane (dostawców, produkty, telefony) listą startową?')) return;
      S = seedState(); save(); closeSheet(); ui = { view: 'home', sid: null, only: false, edit: false, q: '' }; render();
    };
  });
}

/* ---------- przeciąganie pozycji (tryb edycji) ---------- */
let drag = null;
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('.grip'); if (!g || drag) return;
  e.preventDefault();
  const row = g.closest('.row'), r = row.getBoundingClientRect();
  const clone = row.cloneNode(true);
  clone.classList.add('drag-clone');
  Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
  document.body.appendChild(clone);
  row.classList.add('ghost');
  try { g.setPointerCapture(e.pointerId); } catch (err) { /* pointer nieaktywny */ }
  drag = { pid: g.dataset.pid, row, clone, off: e.clientY - r.top, y: e.clientY, x: e.clientX, target: null, after: false, id: e.pointerId };
  const tick = () => {
    if (!drag) return;
    const sc = scr().querySelector('.scroll'), b = sc.getBoundingClientRect();
    if (drag.y < b.top + 70) sc.scrollTop -= 10; else if (drag.y > b.bottom - 150) sc.scrollTop += 10;
    markDrop();
    drag.raf = requestAnimationFrame(tick);
  };
  drag.raf = requestAnimationFrame(tick);
});
function markDrop() {
  document.querySelectorAll('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
  drag.clone.style.top = (drag.y - drag.off) + 'px';
  const el = document.elementFromPoint(drag.x, drag.y);
  const tr = el && el.closest('.row');
  if (!tr || tr === drag.row) { drag.target = null; return; }
  const b = tr.getBoundingClientRect();
  drag.target = tr.dataset.pid; drag.after = drag.y > b.top + b.height / 2;
  tr.classList.add(drag.after ? 'drop-after' : 'drop-before');
}
document.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { drag.x = e.clientX; drag.y = e.clientY; markDrop(); } });
function endDrag(apply) {
  if (!drag) return;
  cancelAnimationFrame(drag.raf);
  const d = drag; drag = null;
  document.querySelectorAll('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
  const root = scr();
  // pozycje przed zmianą (FLIP)
  const before = new Map([...root.querySelectorAll('.row')].map(r => [r.dataset.pid, r.getBoundingClientRect().top]));
  if (apply && d.target) {
    const s = sup(ui.sid), p = s.products.find(x => x.id === d.pid), t = s.products.find(x => x.id === d.target);
    s.products = s.products.filter(x => x !== p);
    p.cat = t.cat;
    s.products.splice(s.products.indexOf(t) + (d.after ? 1 : 0), 0, p);
    save();
  }
  renderList();
  const landed = root.querySelector(`.row[data-pid="${d.pid}"]`);
  if (landed) landed.style.visibility = 'hidden';
  const moved = [];
  root.querySelectorAll('.row').forEach(r => {
    if (r === landed) return;
    const dy = (before.get(r.dataset.pid) ?? 0) - r.getBoundingClientRect().top;
    if (dy) { r.style.transition = 'none'; r.style.transform = `translateY(${dy}px)`; moved.push(r); }
  });
  void root.offsetWidth;
  moved.forEach(r => { r.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)'; r.style.transform = ''; });
  // klon „wpada” płynnie na swoje miejsce
  if (landed) {
    const b = landed.getBoundingClientRect(), c = d.clone;
    c.style.transition = 'top .26s cubic-bezier(.2,.8,.2,1), left .26s, transform .26s, box-shadow .26s, opacity .26s';
    c.style.top = b.top + 'px'; c.style.left = b.left + 'px';
    c.style.transform = 'none'; c.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
    setTimeout(() => { c.remove(); landed.style.visibility = ''; moved.forEach(r => { r.style.transition = ''; }); }, 290);
  } else d.clone.remove();
}
document.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) { drag.x = e.clientX; drag.y = e.clientY; markDrop(); endDrag(true); } });
document.addEventListener('pointercancel', () => endDrag(false));

/* ---------- gest „wstecz” od lewej krawędzi ---------- */
let edge = null;
document.addEventListener('touchstart', e => {
  const p = e.touches[0];
  edge = ui.view === 'sup' && e.touches.length === 1 && p.clientX < 26 && !$('#sheet-root').firstElementChild && !drag
    ? { x: p.clientX, y: p.clientY } : null;
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!edge) return;
  const p = e.touches[0], dx = p.clientX - edge.x, dy = Math.abs(p.clientY - edge.y);
  if (dx > 70 && dx > dy * 1.5) { edge = null; ui.view = 'home'; render('back'); }
  else if (dy > dx + 20) edge = null;
}, { passive: true });

/* ---------- zdarzenia ---------- */
function bump(pid, dir) {
  const p = sup(ui.sid).products.find(x => x.id === pid), st = stepOf(p.unit);
  p.qty = Math.max(0, Math.round((p.qty + dir * st) * 100) / 100);
  save(); patchRow(pid);
  if (navigator.vibrate) navigator.vibrate(8);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'sms') { e.stopPropagation(); return smsSheet(el.dataset.id); }
  if (a === 'open') { ui = { view: 'sup', sid: el.dataset.id, only: false, edit: false, q: '' }; return render('fwd'); }
  if (a === 'home') { ui.view = 'home'; return render('back'); }
  if (a === 'close') return closeSheet();
  if (a === 'inc') return bump(el.dataset.pid, 1);
  if (a === 'dec') return bump(el.dataset.pid, -1);
  if (a === 'qty') return qtySheet(el.dataset.pid);
  if (a === 'only') { ui.only = !ui.only; el.classList.toggle('on', ui.only); return renderList(); }
  if (a === 'toggleedit') { ui.edit = !ui.edit; el.classList.toggle('on', ui.edit); return renderList(); }
  if (a === 'editprod') return prodSheet(el.dataset.pid);
  if (a === 'addprod') return prodSheet(null);
  if (a === 'editsup') return supSheet(ui.sid);
  if (a === 'addsup') return supSheet(null);
  if (a === 'settings') return settingsSheet();
});

render();
// bez zoomu: pinch (iOS); podwójne stuknięcie blokuje touch-action: manipulation
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
setTimeout(() => $('#splash').classList.add('hide'), 2400);
setTimeout(() => $('#splash').remove(), 2900);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
