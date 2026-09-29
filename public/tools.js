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
  },

  /* ───────────────────────── AI & PROMPT ENGINEERING ───────────────────────── */

  aiPromptArchitectTool: {
    emoji: '🪄',
    title: 'Multi-AI Prompt Architect',
    slug: 'prompt',
    aliases: ['prompts', 'ai', '2'],
    category: 'AI',
    desc: 'أنشئ برومبتات هندسية فائقة الدقة مخصصة لخوارزمية ChatGPT، Claude، أو Google Gemini.',
    html: `
      <style>
        .pa-pill-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .pa-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          font-size: 13px;
          color: var(--beige);
          transition: all 0.18s ease;
          user-select: none;
        }
        .pa-pill:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: var(--teal-light);
          transform: translateY(-1px);
        }
        .pa-pill input[type="radio"] {
          accent-color: var(--gold);
          cursor: pointer;
        }
        .pa-pill:has(input[type="radio"]:checked) {
          background: rgba(200, 149, 46, 0.12);
          border-color: var(--gold);
          color: #fff;
          box-shadow: 0 0 10px rgba(200, 149, 46, 0.15);
        }
      </style>

      <label class="label-hint">1. اختر الذكاء الاصطناعي المستهدف (Target AI Engine)</label>
      <div class="pa-pill-group">
        <label class="pa-pill">
          <input type="radio" name="pa-model" value="chatgpt" checked>
          <b>🟢 ChatGPT</b> <span style="font-size:11px; opacity:0.7;">(OpenAI)</span>
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-model" value="claude">
          <b>🟣 Claude</b> <span style="font-size:11px; opacity:0.7;">(Anthropic / XML)</span>
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-model" value="gemini">
          <b>🔵 Google Gemini</b> <span style="font-size:11px; opacity:0.7;">(Direct Blueprint)</span>
        </label>
      </div>

      <label class="label-hint">2. اختر نوع ومجال المهمة (Task Category)</label>
      <div class="pa-pill-group" id="pa-cat-group">
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="powerpoint" checked>
          📊 عرض بوربوينت كامل (+ كود VBA)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="image_gen">
          🎨 إنشاء صور بالذكاء الاصطناعي (1:1)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="image_enhance">
          ✨ تحسين وتعديل وتوضيح الصور
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="excel">
          📈 معادلات وحيل إكسيل وجداول
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="cv">
          📄 سيرة ذاتية وخطاب تقديم (CV & ATS)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="email">
          📧 إيميل رسمي ومراسلات مهنية
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="content">
          🎬 سيناريو فيديو وريلز (Hook + CTA)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="business">
          🚀 خطة تسويق ومشروع ناشئ
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="education">
          💡 شرح وتبسيط فكرة صعبة (Feynman)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="research">
          📝 تلخيص أبحاث وكتب و PDF
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-cat" value="code">
          💻 برمجة وأكواد وحلول برمجية
        </label>
      </div>

      <label class="label-hint">3. فكرتك أو طلبك (اكتبه بالعامية أو الفصحى براحتك)</label>
      <textarea id="pa-idea" class="form-control" rows="3" placeholder="مثال: عاوز عرض بوربوينت 6 شرائح عن استخدام الذكاء الاصطناعي في خدمة العملاء... أو: برومبت لصورة رائد فضاء داخل مكتبة عتيقة..."></textarea>

      <label class="label-hint">4. شكل وتنسيق النتيجة المطلوبة (Output Format)</label>
      <div class="pa-pill-group" id="pa-format-group">
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="slides" checked>
          📑 شرائح مفصلة + كود VBA
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="image_prompt">
          🖼️ برومبت صورة سينمائي (1:1 Square)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="script">
          🎬 سيناريو فيديو (Hook + Visuals + CTA)
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="steps">
          🔢 خطوات عملية خطوة بخطوة
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="table">
          📊 جدول مقارنة منظم
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="ready">
          ✍️ نص كامل جاهز للاستخدام فوراً
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="code">
          💻 معادلة / كود مع التعليقات
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-format" value="plan">
          🎯 خطة عمل استراتيجية
        </label>
      </div>

      <label class="label-hint">5. النبرة واللغة (Tone & Language)</label>
      <div class="pa-pill-group" id="pa-tone-group">
        <label class="pa-pill">
          <input type="radio" name="pa-tone" value="ar-simple" checked>
          💬 عربي مبسط ومباشر بدون فزلكة
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-tone" value="ar-pro">
          👔 عربي فصيح رسمي واحترافي
        </label>
        <label class="pa-pill">
          <input type="radio" name="pa-tone" value="en-tech">
          🌐 English (High-Signal, Concise)
        </label>
      </div>

      <label class="label-hint">6. شروط أو استثناءات إضافية (اختياري)</label>
      <input id="pa-constraints" class="form-control" placeholder="مثال: بدون مقدمات ترحيبية، اذكر أمثلة واقعية، المدة 45 ثانية...">

      <div class="row" style="margin-top:6px;">
        <button id="pa-generate" class="btn-action" type="button">⚡ توليد البرومبت الهندسي</button>
        <button id="pa-copy" class="btn-ghost" type="button">📋 نسخ البرومبت</button>
      </div>

      <div id="pa-output-wrap" style="display:none; margin-top:12px;">
        <label class="label-hint" style="color:var(--gold);">البرومبت الهندسي الجاهز (Master Prompt) — انسخه وضعه في الذكاء الاصطناعي:</label>
        <div id="pa-output" class="result-box mono" style="max-height:360px; overflow-y:auto; line-height:1.6; user-select:all;"></div>
        
        <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <span style="font-size:12px; color:var(--beige-muted);">فتح المنصة مباشرة:</span>
          <a id="pa-link-chatgpt" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:5px 10px; font-size:12px;">🟢 فتح ChatGPT</a>
          <a id="pa-link-claude" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:5px 10px; font-size:12px;">🟣 فتح Claude</a>
          <a id="pa-link-gemini" href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:5px 10px; font-size:12px;">🔵 فتح Gemini</a>
        </div>
        
        <p id="pa-tip" class="state-success" style="margin-top:8px;"></p>
      </div>
    `,
    init: function () {
      const ideaEl = document.getElementById('pa-idea');
      const constrEl = document.getElementById('pa-constraints');
      const genBtn = document.getElementById('pa-generate');
      const copyBtn = document.getElementById('pa-copy');
      const outWrap = document.getElementById('pa-output-wrap');
      const outEl = document.getElementById('pa-output');
      const tipEl = document.getElementById('pa-tip');

      function getRadioVal(name, fallback) {
        const radios = document.getElementsByName(name);
        for (let i = 0; i < radios.length; i++) {
          if (radios[i].checked) {
            const labelText = radios[i].parentElement ? radios[i].parentElement.textContent.trim() : '';
            return { value: radios[i].value, text: labelText };
          }
        }
        return { value: fallback, text: fallback };
      }

      function buildPrompt() {
        const modelData = getRadioVal('pa-model', 'chatgpt');
        const model = modelData.value;
        const idea = (ideaEl && ideaEl.value.trim()) || 'ساعدني في إنجاز هذه المهمة بأعلى جودة واحترافية ممكنة.';
        
        const catData = getRadioVal('pa-cat', 'powerpoint');
        const cat = catData.value;
        const catText = catData.text;

        const roleMap = {
          powerpoint: 'Executive Presentation Designer & Slide Architecture Specialist',
          image_gen: 'World-Class AI Art Director & Cinematic Prompt Engineer',
          image_enhance: 'Master Photo Retoucher, Colorist & Digital Restoration Expert',
          excel: 'Advanced Excel & Data Analytics Guru',
          cv: 'Certified Executive Career Coach & ATS Resume Strategist',
          email: 'Corporate Communications Director & Professional Copywriter',
          content: 'Senior Content Strategist & Viral Short-Form Video Producer',
          business: 'Growth Strategist & Startup Business Consultant',
          education: 'Master Technical Educator (Feynman Simplification Method)',
          research: 'Lead Research Analyst & Document Synthesis Specialist',
          code: 'Principal Software Engineer & Solutions Architect'
        };
        const roleTitle = roleMap[cat] || 'Elite Domain Expert';

        const formatData = getRadioVal('pa-format', 'slides');
        const formatText = formatData.text;

        const toneData = getRadioVal('pa-tone', 'ar-simple');
        const toneText = toneData.text;

        const constraints = constrEl ? constrEl.value.trim() : '';

        let extraDirectives = '';
        if (cat === 'powerpoint') {
          extraDirectives = '\n• For PowerPoint: Structure output as distinct slides [Slide 1: Title & Hook], [Slide 2...], include speaker notes, visual cues, and a copy-pasteable VBA script to auto-generate the slides inside PowerPoint.';
        } else if (cat === 'image_gen') {
          extraDirectives = '\n• For Image Generation: Format as a rich visual prompt specifying Subject, Camera & Lens (35mm f/1.8), Lighting style, Color palette, and parameters (--ar 1:1, photorealistic, 8k, cinematic lighting).';
        } else if (cat === 'image_enhance') {
          extraDirectives = '\n• For Photo Retouch: Specify detailed enhancement steps: noise reduction, clarity, color grading curves, shadow recovery, and texture preservation.';
        } else if (cat === 'excel') {
          extraDirectives = '\n• For Excel: Give the exact formula, explanation of every parameter, sample data table, and error-handling (e.g. IFERROR).';
        } else if (cat === 'cv') {
          extraDirectives = '\n• For CV/Resume: Ensure 100% ATS compliance, quantifiable achievements, and strong action verbs.';
        } else if (cat === 'email') {
          extraDirectives = '\n• For Professional Emails: Include 2-3 subject line options, direct opening, clear call to action, and professional closing.';
        } else if (cat === 'content') {
          extraDirectives = '\n• For Viral Video Scripts: Include a compelling 3-second hook (Scroll-Stopper), timestamped visual cues, voiceover lines, on-screen text, and a strong Call-To-Action (CTA).';
        } else if (cat === 'business') {
          extraDirectives = '\n• For Business & Marketing: Provide target persona, unique value proposition (UVP), customer acquisition strategy, and a 30-day tactical roadmap.';
        } else if (cat === 'education') {
          extraDirectives = '\n• For Education: Use the Feynman technique. Explain as if speaking to an intelligent 10-year-old using real-world analogies, zero jargon, and an everyday practical example.';
        } else if (cat === 'research') {
          extraDirectives = '\n• For Summarization: Provide a 1-paragraph Executive Summary, 5 key actionable takeaways, and a bulleted list of essential concepts without filler.';
        } else if (cat === 'code') {
          extraDirectives = '\n• For Code: Write clean, documented, modern code with error handling, explanations of key lines, and sample usage.';
        }

        let prompt = '';
        let tip = '';

        if (model === 'claude') {
          // Anthropic Claude Architecture: XML Tags with strict reasoning
          prompt = `<role>\n` +
            `You are an elite ${roleTitle}. You possess deep domain expertise, prioritize high-signal insight, and eliminate all fluff.\n` +
            `</role>\n\n` +
            `<context>\n` +
            `Domain: ${catText}\n` +
            `Primary Goal: The user needs a comprehensive, actionable execution for the following request.\n` +
            `</context>\n\n` +
            `<request>\n` +
            `${idea}\n` +
            `</request>\n\n` +
            `<instructions>\n` +
            `1. Think carefully step-by-step before formulating your response to ensure maximum thoroughness.\n` +
            `2. Deliver the final output strictly formatted as: ${formatText}.\n` +
            `3. Language & Tone: ${toneText}.\n` +
            (extraDirectives ? `4. Domain Best Practices:${extraDirectives}\n` : '') +
            (constraints ? `5. Mandatory Constraints: ${constraints}\n` : `5. Avoid generic introductions, filler text, or apologies.\n`) +
            `6. Provide practical, high-value examples wherever applicable.\n` +
            `</instructions>\n\n` +
            `<output_format>\n` +
            `Present your final response directly, adhering precisely to the specifications above.\n` +
            `</output_format>`;
          tip = '💡 سر كلود (Claude): يعالج وسوم الـ XML بأعلى كفاءة منطقية. ستلاحظ أنه يفكر خطوة بخطوة ويعطيك إجابة خالية من الحشو.';

        } else if (model === 'gemini') {
          // Google Gemini Architecture: Multimodal Context & Direct Objective
          prompt = `[SYSTEM INSTRUCTION: HIGH-SIGNAL EXPERT]\n` +
            `ACT AS: Elite ${roleTitle}\n\n` +
            `MISSION OBJECTIVE:\n` +
            `${idea}\n\n` +
            `EXECUTION BLUEPRINT:\n` +
            `• Domain: ${catText}\n` +
            `• Target Output Format: ${formatText}\n` +
            `• Tone of Voice: ${toneText}\n` +
            (extraDirectives ? `• Domain Standards:${extraDirectives}\n` : '') +
            (constraints ? `• Special Constraints: ${constraints}\n` : `• Special Constraints: Direct, practical, zero filler.\n`) +
            `\nQUALITY BENCHMARK:\n` +
            `Deliver a rich, well-organized response that directly answers the core challenge with actionable clarity and structure.`;
          tip = '💡 سر جيميناي (Google Gemini): يعشق توجيهات الأهداف الصريحة (Mission Objectives) والاستجابة المنظمة بالأقسام.';

        } else {
          // OpenAI ChatGPT Architecture: Role / Context / Task / Framework
          prompt = `# ROLE & PERSONA\n` +
            `Act as an elite ${roleTitle}.\n\n` +
            `## CORE TASK\n` +
            `${idea}\n\n` +
            `## REQUIREMENTS & GUIDELINES\n` +
            `1. **Domain:** ${catText}\n` +
            `2. **Tone & Style:** ${toneText}\n` +
            `3. **Format:** Output strictly as ${formatText}\n` +
            (extraDirectives ? `4. **Domain Standards:**${extraDirectives}\n` : '') +
            (constraints ? `5. **Constraints:** ${constraints}\n` : `5. **Constraints:** No conversational fluff. Go straight to the solution.\n`) +
            `6. Make the answer immediately applicable, structured, and insightful.\n\n` +
            `## BEGIN RESPONSE:`;
          tip = '💡 سر شات جي بي تي (ChatGPT): تنسيق الماركداون المنظم برؤوس واضحة يجعله يلتزم بالقواعد بدقة 100%.';
        }

        outEl.textContent = prompt;
        tipEl.textContent = tip;
        outWrap.style.display = 'block';
        outWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      genBtn.addEventListener('click', buildPrompt);

      copyBtn.addEventListener('click', function () {
        const text = outEl.textContent;
        if (!text) {
          buildPrompt();
        }
        const toCopy = outEl.textContent;
        if (toCopy) {
          navigator.clipboard.writeText(toCopy).then(function () {
            const orig = copyBtn.textContent;
            copyBtn.textContent = '✓ تم نسخ البرومبت!';
            setTimeout(function () { copyBtn.textContent = orig; }, 2000);
          }).catch(function () {
            prompt('انسخ البرومبت الهندسي:', toCopy);
          });
        }
      });
    }
  }

};

