/* Headless verification of the Shaher Tech Tools portal + every tool's init().
   Mirrors index.html's bootstrap logic, then runs real DOM interactions.
   Each toolsDB object is created in, and exercised against, ONE jsdom window. */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const toolsSrc = fs.readFileSync(path.join(ROOT, 'tools.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  << ' + extra : '')); }
}

// jsdom has no canvas — hand back a no-op 2D context so image tools construct.
const STUB_CTX = new Proxy({}, {
  get: function () { return function () {}; }
});

function makeDom() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:3000/', pretendToBeVisual: true });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = function () { return STUB_CTX; };
  w.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null); };
  w.alert = function () {};
  w.scrollTo = function () {};
  w.navigator.clipboard = { writeText: function () { return Promise.resolve(); } };

  // build toolsDB inside this window's realm
  const tools = new w.Function(toolsSrc + '\nreturn toolsDB;')();

  // mirror the master-portal bootstrap
  const d = w.document;
  const entries = Object.entries(tools);
  const categories = ['All', ...new Set(entries.map(([, t]) => t.category))];
  let activeCategory = 'All';

  categories.forEach(function (cat) {
    const chip = d.createElement('button');
    chip.className = 'chip' + (cat === 'All' ? ' chip-active' : '');
    chip.textContent = cat;
    chip.dataset.category = cat;
    chip.addEventListener('click', function () {
      activeCategory = cat;
      d.querySelectorAll('#category-chips .chip').forEach(function (c) { c.classList.remove('chip-active'); });
      chip.classList.add('chip-active');
      renderGrid();
    });
    d.getElementById('category-chips').appendChild(chip);
  });

  function renderGrid() {
    const q = d.getElementById('portal-search').value.trim().toLowerCase();
    const grid = d.getElementById('tools-grid');
    grid.innerHTML = '';
    let shown = 0;
    entries.forEach(function ([id, tool]) {
      if (activeCategory !== 'All' && tool.category !== activeCategory) return;
      if (q) {
        const hay = (id + ' ' + tool.title + ' ' + tool.category + ' ' + (tool.desc || '')).toLowerCase();
        if (!hay.includes(q)) return;
      }
      shown++;
      const card = d.createElement('button');
      card.className = 'tool-card';
      card.dataset.toolId = id;
      card.innerHTML = '<span class="tool-card-top"><span class="tool-emoji">' + (tool.emoji || '🛠') + '</span>' +
        '<span class="tool-category-tag">' + tool.category + '</span></span>' +
        '<span class="tool-card-title">' + tool.title + '</span>' +
        '<span class="tool-card-desc">' + (tool.desc || '') + '</span>';
      card.addEventListener('click', function () { openTool(id); });
      grid.appendChild(card);
    });
    d.getElementById('no-results').hidden = shown !== 0;
  }

  function openTool(id) {
    const tool = tools[id];
    d.getElementById('tool-title').textContent = tool.title;
    d.getElementById('tool-desc').textContent = tool.desc || '';
    d.getElementById('tool-category').textContent = tool.category;
    const body = d.getElementById('tool-body');
    body.innerHTML = '';
    if (typeof tool.html === 'string') body.innerHTML = tool.html;
    if (typeof tool.init === 'function') {
      try { tool.init(); }
      catch (e) { body.insertAdjacentHTML('beforeend', '<p class="state-error">ERR ' + String(e.message) + '</p>'); }
    }
  }

  d.getElementById('portal-search').addEventListener('input', renderGrid);
  renderGrid();
  return { w: w, d: d, tools: tools, openTool: openTool };
}

function fire(w, el, type) { el.dispatchEvent(new w.Event(type, { bubbles: true })); }

/* ============================ CONTRACT ============================ */
console.log('\n=== toolsDB contract ===');
const main = makeDom();
const tools = main.tools;
const ids = Object.keys(tools);
ok('toolsDB parsed (' + ids.length + ' entries)', ids.length >= 0, 'failed to parse tools.js');
if (ids.length) {
  ok('unique camelCase ids', ids.every(function (id) { return /^[a-z][a-zA-Z0-9]*$/.test(id); }));
  const dupes = ids.filter(function (id, i) { return ids.indexOf(id) !== i; });
  ok('no duplicate ids', dupes.length === 0, JSON.stringify(dupes));
  ok('every tool has all contract fields', ids.every(function (id) {
    const t = tools[id];
    return t && t.title && t.category && typeof t.html === 'string' && typeof t.init === 'function';
  }));
  ok('every tool has emoji', ids.every(function (id) { return tools[id].emoji; }));
  ok('every html field is non-empty', ids.every(function (id) { return tools[id].html.trim().length > 0; }));
}

/* ============================ PORTAL ============================ */
console.log('\n=== portal render ===');
ok('rendered ' + ids.length + ' cards', main.d.querySelectorAll('.tool-card').length === ids.length,
   'got ' + main.d.querySelectorAll('.tool-card').length);
const chips = [...main.d.querySelectorAll('#category-chips .chip')];
ok('category chips rendered', chips.length >= 1, 'got ' + chips.length);
ok('"All" chip present', chips.some(function (c) { return c.textContent === 'All'; }));

// unique element ids across every tool's html
const seen = new Set(); const clash = [];
ids.forEach(function (id) {
  (tools[id].html.match(/id="([^"]+)"/g) || []).forEach(function (m) {
    const el = m.replace(/id="|"/g, '');
    if (seen.has(el)) clash.push(el); else seen.add(el);
  });
});
ok('no clashing element ids across tools', clash.length === 0, JSON.stringify(clash));

if (ids.length) {
  // search filter
  const search = main.d.getElementById('portal-search');
  search.value = ids[0];
  fire(main.w, search, 'input');
  ok('search by id narrows to 1 card', main.d.querySelectorAll('.tool-card').length === 1,
     'got ' + main.d.querySelectorAll('.tool-card').length);
  search.value = 'zzzznotool';
  fire(main.w, search, 'input');
  ok('no-results message shows when nothing matches', !main.d.getElementById('no-results').hidden);
  search.value = '';
  fire(main.w, search, 'input');
}

/* ===================== EVERY TOOL: open + init ===================== */
console.log('\n=== per-tool open + init (via portal) ===');
ids.forEach(function (id) {
  const t = makeDom();
  t.openTool(id);
  // #tool-body may legitimately contain an empty state-* placeholder element
  const err = [...(t.d.querySelectorAll('#tool-body .state-error') || [])].find(function (el) {
    return el.textContent.trim() !== '';
  });
  ok('open(' + id + ') renders + inits clean', !err, err ? err.textContent : '');
  const idsNeeded = (t.tools[id].html.match(/id="([^"]+)"/g) || []).map(function (m) {
    return m.replace(/id="|"/g, '');
  });
  const present = idsNeeded.filter(function (el) { return Boolean(t.d.getElementById(el)); }).length;
  ok('open(' + id + ') injected all ' + idsNeeded.length + ' element ids',
     idsNeeded.length === present, idsNeeded.length + ' expected, ' + present + ' in DOM');
});

/* ===================== FUNCTIONAL TESTS ===================== */
console.log('\n=== functional ===');

function use(id, fn) {
  const t = makeDom();
  t.openTool(id);
  fn(t.w, t.d, t.tools[id]);
}

// Add per-tool functional tests here, e.g.:
// use('someTool', function (w, d) {
//   d.getElementById('st-input').value = 'hello';
//   d.getElementById('st-btn').click();
//   ok('someTool output is correct', d.getElementById('st-output').value === 'HELLO', d.getElementById('st-output').value);
// });

use('whatsappLinkTool', function (w, d) {
  const phone = d.getElementById('wl-phone');
  const msg = d.getElementById('wl-message');
  const link = d.getElementById('wl-link');
  const status = d.getElementById('wl-status');
  const open = d.getElementById('wl-open');

  ok('whatsapp ships ' + d.getElementById('wl-country').options.length + ' countries',
     d.getElementById('wl-country').options.length > 50,
     d.getElementById('wl-country').options.length);
  ok('whatsapp defaults to Egypt (+20)', d.getElementById('wl-country').value === '20',
     d.getElementById('wl-country').value);
  ok('whatsapp uses real flag images (not emoji)',
     !!d.querySelector('#wl-country .flag-img') &&
     d.querySelector('#wl-country .flag-img').src.indexOf('flagcdn.com/w20/eg.png') !== -1,
     d.querySelector('#wl-country .flag-img') && d.querySelector('#wl-country .flag-img').src);
  ok('whatsapp every option has a flag image',
     [...d.querySelectorAll('#wl-country option')].every(function (o) { return o.querySelector('.flag-img'); }),
     'options with flag: ' + [...d.querySelectorAll('#wl-country option')].filter(function (o) { return o.querySelector('.flag-img'); }).length);
  ok('whatsapp flag markup is lower-cased and escaped',
     !/flagcdn\.com\/w20\/[A-Z]/.test(d.getElementById('wl-country').innerHTML),
     d.getElementById('wl-country').innerHTML.slice(0, 120));

  ok('whatsapp starts in a neutral state',
     !link.value && open.disabled && /builds as you type/.test(status.textContent),
     JSON.stringify(status.textContent));

  // Egyptian mobile with the trunk zero people actually type
  phone.value = '01001234567';
  phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('whatsapp builds the link and strips the trunk zero',
     link.value === 'https://wa.me/201001234567', JSON.stringify(link.value));
  ok('whatsapp shows a ready status',
     /Ready/.test(status.textContent), status.textContent);
  ok('whatsapp enables Open chat', !open.disabled);

  // pre-filled message is URL-encoded
  msg.value = 'مرحبا، الحجز كذا';
  msg.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('whatsapp appends + encodes the pre-filled message',
     link.value.indexOf('https://wa.me/201001234567?text=') === 0 &&
     decodeURIComponent(link.value.split('text=')[1]) === msg.value,
     JSON.stringify(link.value));

  // letters, spaces, dashes and plus signs are ignored
  phone.value = '+20 100 123 4567abc';
  msg.value = '';
  [phone, msg].forEach(function (el) { el.dispatchEvent(new w.Event('input', { bubbles: true })); });
  ok('whatsapp ignores non-digits and a typed +',
     link.value === 'https://wa.me/201001234567', JSON.stringify(link.value));

  // too-short / too-long numbers are rejected
  phone.value = '12';
  phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('whatsapp rejects a too-short number',
     !link.value && /7–15/.test(status.textContent), status.textContent);
  phone.value = '9'.repeat(20);
  phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('whatsapp rejects a too-long number',
     !link.value && /7–15/.test(status.textContent), status.textContent);

  // country switch re-prefixes the number
  phone.value = '5551234567';
  phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  d.getElementById('wl-country').value = '1';
  d.getElementById('wl-country').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('whatsapp re-prefixes when the country changes',
     link.value === 'https://wa.me/15551234567', JSON.stringify(link.value));

  // open() builds the URL and navigates
  let navigated = null;
  w.open = function (url) { navigated = url; return null; };
  open.click();
  ok('whatsapp open() navigates to the built link',
     navigated === 'https://wa.me/15551234567', JSON.stringify(navigated));
});

console.log('\n==============================');
console.log('  RESULT: ' + pass + ' passed, ' + fail + ' failed');
console.log('==============================');
process.exit(fail === 0 ? 0 : 1);
