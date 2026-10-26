/* Extra tools — registry additions loaded after tools.js.
   Contract: tools are declared in tools.js as `toolsDB`; extra tools append here.
   When adding a tool here: add it to server.js ROUTE_META + TOOL_ROUTES + sitemap too. */

toolsDB.percentageTool = {
  emoji: '🧮',
  title: 'حاسبة النسبة والخصم (Percentage Calculator)',
  slug: 'percentage',
  aliases: ['percent', 'nesba', 'khasm', 'discount', '9'],
  category: 'Utilities',
  desc: 'احسب قيمة أي نسبة من رقم، أو نسبة رقم من رقم، أو سعر منتج بعد الخصم — بضغطة واحدة ومن غير أي حسابات.',
  html: `
    <style>
      .pct-box { border:1px solid var(--border); border-radius:var(--radius); padding:16px; margin-top:14px; background:rgba(255,255,255,0.02); }
      .pct-box h3 { font-family:var(--font-headline); color:var(--gold-bright); font-size:17px; margin-bottom:10px; }
      .pct-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .pct-grid .full { grid-column:1/-1; }
      .pct-out { margin-top:12px; padding:14px; border-radius:var(--radius); background:linear-gradient(135deg, rgba(26,74,66,0.5), rgba(200,149,46,0.12)); border:1px solid rgba(200,149,46,0.35); font-weight:700; font-size:17px; display:none; }
      .pct-out b { color:var(--gold-bright); }
      .pct-out small { display:block; color:var(--beige-muted); font-weight:600; font-size:12px; margin-top:4px; }
      @media(max-width:600px){ .pct-grid { grid-template-columns:1fr; } }
    </style>

    <div class="pct-box">
      <h3>١) قيمة النسبة من رقم</h3>
      <div class="pct-grid">
        <div><label class="label-hint" for="pct1-p">النسبة ٪</label><input id="pct1-p" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="20"></div>
        <div><label class="label-hint" for="pct1-n">من الرقم</label><input id="pct1-n" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="350"></div>
      </div>
      <div id="pct1-out" class="pct-out"></div>
    </div>

    <div class="pct-box">
      <h3>٢) نسبة رقم من رقم</h3>
      <div class="pct-grid">
        <div><label class="label-hint" for="pct2-a">الرقم</label><input id="pct2-a" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="45"></div>
        <div><label class="label-hint" for="pct2-b">من الرقم الكلي</label><input id="pct2-b" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="180"></div>
      </div>
      <div id="pct2-out" class="pct-out"></div>
    </div>

    <div class="pct-box">
      <h3>٣) حاسبة الخصم</h3>
      <div class="pct-grid">
        <div><label class="label-hint" for="pct3-price">السعر قبل الخصم</label><input id="pct3-price" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="500"></div>
        <div><label class="label-hint" for="pct3-d">نسبة الخصم ٪</label><input id="pct3-d" class="form-control" type="text" inputmode="decimal" dir="ltr" placeholder="25"></div>
      </div>
      <div id="pct3-out" class="pct-out"></div>
    </div>

    <p class="label-hint" style="margin-top:14px;">بتكتب الأرقام عربي أو إنجليزي زي ما يريحك — والحساب بيتم على جهازك مباشرة.</p>
  `,
  _calc: {
    // Accepts western, Arabic-Indic (٠-٩) and Persian (۰-۹) digits, . or , or ٫ decimal.
    parseNum: function (raw) {
      if (raw === null || typeof raw === 'undefined') return null;
      var s = String(raw).trim();
      if (!s) return null;
      s = s.replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
           .replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
           .replace(/[٫,]/g, '.')
           .replace(/[^0-9.\-]/g, '');
      if (s === '' || s === '-' || s === '.') return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    },
    fmt: function (n) {
      var r = Math.round(n * 100) / 100;
      return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
    },
    pctOf: function (p, n) { return (p / 100) * n; },
    pctFrom: function (a, b) { return b === 0 ? null : (a / b) * 100; },
    discount: function (price, d) {
      var cut = (d / 100) * price;
      return { cut: cut, final: price - cut };
    }
  },
  init: function () {
    var C = toolsDB.percentageTool._calc;
    function out(el, html) {
      if (!html) { el.style.display = 'none'; el.innerHTML = ''; return; }
      el.innerHTML = html; el.style.display = 'block';
    }
    function calc1() {
      var p = C.parseNum(document.getElementById('pct1-p').value);
      var n = C.parseNum(document.getElementById('pct1-n').value);
      if (p === null || n === null) return out(document.getElementById('pct1-out'), null);
      out(document.getElementById('pct1-out'),
        '<b>' + C.fmt(p) + '٪</b> من <b>' + C.fmt(n) + '</b> = <b>' + C.fmt(C.pctOf(p, n)) + '</b>');
    }
    function calc2() {
      var a = C.parseNum(document.getElementById('pct2-a').value);
      var b = C.parseNum(document.getElementById('pct2-b').value);
      if (a === null || b === null) return out(document.getElementById('pct2-out'), null);
      if (b === 0) return out(document.getElementById('pct2-out'), 'الرقم الكلي مش ممكن يكون صفر.');
      out(document.getElementById('pct2-out'),
        '<b>' + C.fmt(a) + '</b> تساوي <b>' + C.fmt(C.pctFrom(a, b)) + '٪</b> من <b>' + C.fmt(b) + '</b>');
    }
    function calc3() {
      var price = C.parseNum(document.getElementById('pct3-price').value);
      var d = C.parseNum(document.getElementById('pct3-d').value);
      if (price === null || d === null) return out(document.getElementById('pct3-out'), null);
      var r = C.discount(price, d);
      out(document.getElementById('pct3-out'),
        'هتدفع: <b>' + C.fmt(r.final) + '</b><small>قيمة الخصم: ' + C.fmt(r.cut) + ' (' + C.fmt(d) + '٪ من ' + C.fmt(price) + ')</small>');
    }
    [['pct1-p', calc1], ['pct1-n', calc1], ['pct2-a', calc2], ['pct2-b', calc2], ['pct3-price', calc3], ['pct3-d', calc3]]
      .forEach(function (pair) { document.getElementById(pair[0]).addEventListener('input', pair[1]); });
  }
};
