/* =========================================================================
   SHAHER TECH TOOLS — TOOL REGISTRY (toolsDB)
   Contract (never change):
     id       : unique camelCase key
     emoji    : single glyph shown on the card
     title    : card + workspace title
     category : Text | Developer | Image | SEO | Social Media | Utilities | AI | Video | PDF
     desc     : one-line description
     html     : markup injected into #tool-body
     init()   : runs after injection; wires events
   IMPORTANT: tool bodies are template literals. Inside them every backslash
   must be doubled (\\n, \\d, \\s) — the literal is parsed when this file loads,
   so a single backslash is consumed before the browser ever sees it.
   ========================================================================= */

/* Minimal recursive-descent JSON scanner: reports the exact line/column where
   a document breaks. Recent V8 error messages dropped the character position. */
const locateJsonError = function (str) {
  let i = 0, line = 1, col = 1;
  function step() { if (str[i] === '\n') { line++; col = 1; } else { col++; } i++; }
  function skipWs() { while (i < str.length && ' \t\n\r'.indexOf(str[i]) !== -1) step(); }
  function err(msg) { return { msg: msg, line: line, col: col, pos: i }; }
  function parseString() {
    step(); // opening quote
    while (i < str.length && str[i] !== '"') {
      if (str[i] === '\\') { step(); if (i >= str.length) break; }
      if (str[i] === '\n') return err('Unterminated string');
      step();
    }
    if (i >= str.length) return err('Unterminated string');
    step(); // closing quote
    return null;
  }
  function parseNumber() {
    if (str[i] === '-') step();
    while (i < str.length && '0123456789.eE+-'.indexOf(str[i]) !== -1) step();
    return null;
  }
  function parseValue() {
    skipWs();
    if (i >= str.length) return err('Unexpected end of input');
    const c = str[i];
    if (c === '"') return parseString();
    if (c === '{') return parseObject();
    if (c === '[') return parseArray();
    if ('-0123456789'.indexOf(c) !== -1) return parseNumber();
    if (str.substr(i, 4) === 'true' || str.substr(i, 4) === 'null') { i += 4; col += 4; return null; }
    if (str.substr(i, 5) === 'false') { i += 5; col += 5; return null; }
    return err('Unexpected token "' + c + '"');
  }
  function parseObject() {
    step(); // {
    skipWs();
    if (i < str.length && str[i] === '}') { step(); return null; }
    for (;;) {
      skipWs();
      if (i >= str.length) return err('Unexpected end of input');
      if (str[i] !== '"') return err('Expected a string key');
      const key = parseString();
      if (key) return key;
      skipWs();
      if (i >= str.length || str[i] !== ':') return err('Expected ":"');
      step(); // :
      const v = parseValue();
      if (v) return v;
      skipWs();
      if (i >= str.length) return err('Unexpected end of input');
      if (str[i] === ',') { step(); continue; }
      if (str[i] === '}') { step(); return null; }
      return err('Expected "," or "}"');
    }
  }
  function parseArray() {
    step(); // [
    skipWs();
    if (i < str.length && str[i] === ']') { step(); return null; }
    for (;;) {
      const v = parseValue();
      if (v) return v;
      skipWs();
      if (i >= str.length) return err('Unexpected end of input');
      if (str[i] === ',') { step(); continue; }
      if (str[i] === ']') { step(); return null; }
      return err('Expected "," or "]"');
    }
  }
  const result = parseValue();
  if (result) return result;
  skipWs();
  if (i < str.length) return err('Unexpected trailing data');
  return null;
};

const toolsDB = {

  /* ───────────────────────── SOCIAL MEDIA ───────────────────────── */

  whatsappLinkTool: {
    emoji: '💬',
    title: 'WhatsApp Direct Link',
    slug: 'whatsapp',
    aliases: ['wa', '1'],
    category: 'Social Media',
    desc: 'Open a WhatsApp chat with any number without saving it to your contacts.',
    html: `
      <label class="label-hint">Country code</label>
      <select id="wl-country" class="form-control"></select>
      <label class="label-hint">Phone number <b>(without</b> the country code)</label>
      <input id="wl-phone" class="form-control" inputmode="numeric" autocomplete="off" placeholder="e.g. 1001234567">
      <label class="label-hint">Pre-filled message (optional)</label>
      <textarea id="wl-message" class="form-control" rows="2" placeholder="Hi! I'm reaching out about…"></textarea>
      <div class="row">
        <a id="wl-open" class="btn-action" href="#" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">فتح المحادثة (Open chat)</a>
        <button id="wl-copy" class="btn-ghost" type="button">نسخ الرابط (Copy link)</button>
      </div>
      <p id="wl-status" class="state-error"></p>
      <input id="wl-link" class="form-control mono" readonly placeholder="https://wa.me/…">
      <p class="label-hint">The link builds as you type. Opening it launches WhatsApp straight to the chat — the number is never saved to your phone.</p>
    `,
    init: function () {
      const sel = document.getElementById('wl-country');
      const phone = document.getElementById('wl-phone');
      const msg = document.getElementById('wl-message');
      const status = document.getElementById('wl-status');
      const linkEl = document.getElementById('wl-link');
      const openBtn = document.getElementById('wl-open');
      const copyBtn = document.getElementById('wl-copy');

      const COUNTRIES = [
        ['EG', 20, 'Egypt'], ['SA', 966, 'Saudi Arabia'], ['AE', 971, 'United Arab Emirates'],
        ['KW', 965, 'Kuwait'], ['QA', 974, 'Qatar'], ['BH', 973, 'Bahrain'], ['OM', 968, 'Oman'],
        ['JO', 962, 'Jordan'], ['LB', 961, 'Lebanon'], ['PS', 970, 'Palestine'], ['IQ', 964, 'Iraq'],
        ['SY', 963, 'Syria'], ['YE', 967, 'Yemen'], ['MA', 212, 'Morocco'], ['DZ', 213, 'Algeria'],
        ['TN', 216, 'Tunisia'], ['LY', 218, 'Libya'], ['SD', 249, 'Sudan'], ['TR', 90, 'Turkey'],
        ['US', 1, 'United States'], ['GB', 44, 'United Kingdom'], ['CA', 1, 'Canada'],
        ['DE', 49, 'Germany'], ['FR', 33, 'France'], ['ES', 34, 'Spain'], ['IT', 39, 'Italy'],
        ['NL', 31, 'Netherlands'], ['BE', 32, 'Belgium'], ['CH', 41, 'Switzerland'], ['AT', 43, 'Austria'],
        ['SE', 46, 'Sweden'], ['NO', 47, 'Norway'], ['DK', 45, 'Denmark'], ['PL', 48, 'Poland'],
        ['RU', 7, 'Russia'], ['UA', 380, 'Ukraine'], ['IN', 91, 'India'], ['PK', 92, 'Pakistan'],
        ['BD', 880, 'Bangladesh'], ['LK', 94, 'Sri Lanka'], ['NP', 977, 'Nepal'], ['ID', 62, 'Indonesia'],
        ['MY', 60, 'Malaysia'], ['SG', 65, 'Singapore'], ['PH', 63, 'Philippines'], ['TH', 66, 'Thailand'],
        ['VN', 84, 'Vietnam'], ['CN', 86, 'China'], ['HK', 852, 'Hong Kong'], ['JP', 81, 'Japan'],
        ['KR', 82, 'South Korea'], ['AU', 61, 'Australia'], ['NZ', 64, 'New Zealand'],
        ['BR', 55, 'Brazil'], ['MX', 52, 'Mexico'], ['AR', 54, 'Argentina'], ['CL', 56, 'Chile'],
        ['CO', 57, 'Colombia'], ['PE', 51, 'Peru'], ['ZA', 27, 'South Africa'], ['NG', 234, 'Nigeria'],
        ['KE', 254, 'Kenya'], ['GH', 233, 'Ghana'], ['ET', 251, 'Ethiopia']
      ];

      // Windows does not render flag emoji — it shows "EG" as text instead.
      // Use real flag images from flagcdn, falling back to a code badge.
      const FLAG = '<img src="https://flagcdn.com/w20/CC.png" alt="" class="flag-img" ' +
        'onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;inline-flex&quot;">' +
        '<span class="flag-fallback">CC</span>';

      function flag(cc) {
        return FLAG.replace(/CC/g, cc.toLowerCase());
      }

      COUNTRIES.forEach(function (c) {
        const o = document.createElement('option');
        o.value = String(c[1]);
        o.innerHTML = flag(c[0]) + '&nbsp;&nbsp;' + c[2] + ' (+' + c[1] + ')';
        sel.appendChild(o);
      });
      sel.value = '20'; // Egypt first by default

      function build() {
        const dial = String(sel.value);
        // accept anything the user pastes: strip +, spaces, dashes, letters,
        // then drop a leading dial code they may have typed alongside it
        let digits = phone.value.replace(/[^0-9]/g, '');
        if (digits.indexOf(dial) === 0) digits = digits.slice(dial.length);
        digits = digits.replace(/^0+/, '');
        const text = msg.value.trim();

        if (!digits) {
          linkEl.value = '';
          status.className = 'label-hint';
          status.textContent = 'الرابط يُبنى تلقائياً أثناء كتابة الرقم.';
          openBtn.removeAttribute('href');
          openBtn.style.pointerEvents = 'none';
          openBtn.style.opacity = '0.5';
          return null;
        }

        const full = dial + digits;
        if (full.length < 7 || full.length > 15) {
          linkEl.value = '';
          status.className = 'state-error';
          status.textContent = '✗ رقم غير صالح — تم إدخال ' + full.length +
            ' أرقام؛ المطلوب بين 7 و 15 رقم بما فيها كود الدولة.';
          openBtn.removeAttribute('href');
          openBtn.style.pointerEvents = 'none';
          openBtn.style.opacity = '0.5';
          return null;
        }

        let link = 'https://wa.me/' + full;
        if (text) link += '?text=' + encodeURIComponent(text);
        linkEl.value = link;
        status.className = 'state-success';
        status.textContent = '✓ جاهز — +' + full;
        openBtn.href = link;
        openBtn.style.pointerEvents = 'auto';
        openBtn.style.opacity = '1';
        return link;
      }

      phone.addEventListener('input', build);
      msg.addEventListener('input', build);
      sel.addEventListener('change', build);

      openBtn.addEventListener('click', function (e) {
        const link = build();
        if (!link) {
          e.preventDefault();
          return;
        }
      });

      copyBtn.addEventListener('click', function () {
        if (linkEl.value) {
          linkEl.select();
          navigator.clipboard.writeText(linkEl.value).then(function () {
            const orig = copyBtn.textContent;
            copyBtn.textContent = '✓ تم النسخ!';
            setTimeout(function () { copyBtn.textContent = orig; }, 2000);
          }).catch(function () {
            document.execCommand('copy');
            const orig = copyBtn.textContent;
            copyBtn.textContent = '✓ تم النسخ!';
            setTimeout(function () { copyBtn.textContent = orig; }, 2000);
          });
        }
      });

      build();
    }
  }

};
