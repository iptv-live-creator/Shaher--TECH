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
      <label class="label-hint">1. اختر النموذج المستهدف (Target AI Engine)</label>
      <div class="row" style="gap:8px; margin-bottom:6px;">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; background:rgba(255,255,255,0.03); padding:8px 14px; border-radius:8px; border:1px solid var(--border);">
          <input type="radio" name="pa-model" value="chatgpt" checked>
          <b>ChatGPT</b> <span style="font-size:11px; color:var(--beige-muted);">(OpenAI)</span>
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; background:rgba(255,255,255,0.03); padding:8px 14px; border-radius:8px; border:1px solid var(--border);">
          <input type="radio" name="pa-model" value="claude">
          <b>Claude</b> <span style="font-size:11px; color:var(--beige-muted);">(Anthropic / XML)</span>
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; background:rgba(255,255,255,0.03); padding:8px 14px; border-radius:8px; border:1px solid var(--border);">
          <input type="radio" name="pa-model" value="gemini">
          <b>Google</b> <span style="font-size:11px; color:var(--beige-muted);">(Gemini)</span>
        </label>
      </div>

      <div class="row">
        <div style="flex:1 1 100%;">
          <label class="label-hint">2. مجال ومجمل المهمة (Task Category)</label>
          <select id="pa-category" class="form-control">
            <option value="content">✍️ صناعة محتوى وسكريبتات (Content & Scripts)</option>
            <option value="code">💻 برمجة وتطوير برمجيات (Coding & Architecture)</option>
            <option value="research">📊 تحليل بيانات ودراسة (Research & Analysis)</option>
            <option value="business">🎯 تسويق وأعمال وبيزنس (Marketing & Business)</option>
            <option value="education">🎓 تعليم وشرح مبسط (Simplifying & Education)</option>
          </select>
        </div>
      </div>

      <label class="label-hint">3. فكرتك أو طلبك (اكتبه براحتك بدون تعقيد)</label>
      <textarea id="pa-idea" class="form-control" rows="3" placeholder="مثال: فكرة تطبيق ذكاء اصطناعي يساعد الموظفين في كتابة تقارير العمل اليومية وتلخيص الإيميلات في ثواني..."></textarea>

      <div class="row">
        <div>
          <label class="label-hint">4. شكل النتيجة المطلوبة (Format)</label>
          <select id="pa-format" class="form-control">
            <option value="steps">خطوات مرقمة خطوة بخطوة (Step-by-Step Guide)</option>
            <option value="table">جدول مقارنة منظم ومقسم (Comparison Table)</option>
            <option value="ready">نص كامل جاهز للنشر والاستخدام الفوري (Ready-to-use Deliverable)</option>
            <option value="code">كود برمجي كامل ونظيف مع شرح التعليقات (Clean Code)</option>
            <option value="plan">خطة عمل استراتيجية تنفيذية (Action Plan)</option>
          </select>
        </div>
        <div>
          <label class="label-hint">5. النبرة واللغة (Tone & Language)</label>
          <select id="pa-tone" class="form-control">
            <option value="ar-simple">عربي مبسط، مباشر بدون فزلكة أو حشو</option>
            <option value="ar-pro">عربي فصيح، احترافي ورسمي</option>
            <option value="en-tech">English (Concise, High-Signal, Technical)</option>
          </select>
        </div>
      </div>

      <label class="label-hint">6. شروط أو استثناءات إضافية (اختياري)</label>
      <input id="pa-constraints" class="form-control" placeholder="مثال: بدون مقدمات ترحيبية، اذكر أمثلة حقيقية واقعية...">

      <div class="row" style="margin-top:4px;">
        <button id="pa-generate" class="btn-action" type="button">⚡ توليد البرومبت الهندسي</button>
        <button id="pa-copy" class="btn-ghost" type="button">📋 نسخ البرومبت</button>
      </div>

      <div id="pa-output-wrap" style="display:none; margin-top:8px;">
        <label class="label-hint">البرومبت الهندسي الجاهز (Master Prompt) — انسخه وضعه في النموذج المختار:</label>
        <div id="pa-output" class="result-box mono" style="max-height:360px; overflow-y:auto; line-height:1.6;"></div>
        <p id="pa-tip" class="state-success" style="margin-top:8px;"></p>
      </div>
    `,
    init: function () {
      const ideaEl = document.getElementById('pa-idea');
      const catEl = document.getElementById('pa-category');
      const formatEl = document.getElementById('pa-format');
      const toneEl = document.getElementById('pa-tone');
      const constrEl = document.getElementById('pa-constraints');
      const genBtn = document.getElementById('pa-generate');
      const copyBtn = document.getElementById('pa-copy');
      const outWrap = document.getElementById('pa-output-wrap');
      const outEl = document.getElementById('pa-output');
      const tipEl = document.getElementById('pa-tip');

      function getSelectedModel() {
        const radios = document.getElementsByName('pa-model');
        for (let i = 0; i < radios.length; i++) {
          if (radios[i].checked) return radios[i].value;
        }
        return 'chatgpt';
      }

      function buildPrompt() {
        const model = getSelectedModel();
        const idea = ideaEl.value.trim() || 'ساعدني في إنجاز هذه المهمة بأعلى جودة واحترافية ممكنة.';
        const cat = catEl.value;
        const catText = catEl.options[catEl.selectedIndex].text;
        const roleMap = {
          content: 'Senior Content Strategist & Viral Scriptwriter',
          code: 'Principal Software Engineer & Solutions Architect',
          research: 'Lead Research Analyst & Data Specialist',
          business: 'Executive Business Consultant & Growth Strategist',
          education: 'Master Technical Educator & Practical Explainer'
        };
        const roleTitle = roleMap[cat] || 'Elite Domain Expert';
        const formatText = formatEl.options[formatEl.selectedIndex].text;
        const toneText = toneEl.options[toneEl.selectedIndex].text;
        const constraints = constrEl.value.trim();

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
            (constraints ? `4. Mandatory Constraints: ${constraints}\n` : `4. Avoid generic introductions, filler text, or apologies.\n`) +
            `5. Provide practical, high-value examples wherever applicable.\n` +
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
            (constraints ? `4. **Constraints:** ${constraints}\n` : `4. **Constraints:** No conversational fluff. Go straight to the solution.\n`) +
            `5. Make the answer immediately applicable, structured, and insightful.\n\n` +
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

