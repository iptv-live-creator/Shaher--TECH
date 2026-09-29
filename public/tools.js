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
    desc: 'حوّل فكرتك البسيطة إلى برومبت احترافي جاهز للنسخ إلى ChatGPT أو Gemini أو Claude.',
    html: `
      <style>
        .pa-simple-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .pa-card-opt {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          font-size: 13.5px;
          color: var(--beige);
          transition: all 0.18s ease;
          user-select: none;
        }
        .pa-card-opt:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--teal-light);
          transform: translateY(-1px);
        }
        .pa-card-opt input[type="radio"] {
          accent-color: var(--gold);
          cursor: pointer;
        }
        .pa-card-opt:has(input[type="radio"]:checked) {
          background: rgba(200, 149, 46, 0.14);
          border-color: var(--gold);
          color: #fff;
          box-shadow: 0 0 12px rgba(200, 149, 46, 0.2);
          font-weight: 600;
        }
      </style>

      <label class="label-hint" style="font-weight:600; color:var(--gold);">1. هتتكلم مع مين؟</label>
      <div class="pa-simple-group">
        <label class="pa-card-opt">
          <input type="radio" name="pa-model" value="chatgpt" checked>
          <span>🟢 <b>ChatGPT</b></span>
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-model" value="gemini">
          <span>🔵 <b>Google Gemini</b></span>
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-model" value="claude">
          <span>🟣 <b>Claude</b></span>
        </label>
      </div>

      <label class="label-hint" style="font-weight:600; color:var(--gold);">2. عاوزه يساعدك في إيه؟</label>
      <div class="pa-simple-group" id="pa-tasks-group">
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="powerpoint" checked>
          📊 عمل عرض بوربوينت كامل
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="image_gen">
          🎨 رسم وتوليد صورة بالذكاء الاصطناعي
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="excel">
          📈 حل معادلة أو جدول في إكسيل
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="cv">
          📄 كتابة أو تظبيط سيرة ذاتية (CV)
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="email">
          📧 كتابة إيميل رسمي أو شكوى أو اعتذار
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="content">
          🎬 سيناريو فيديو تيك توك أو ريلز
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="education">
          💡 شرح حاجة صعبة بأسلوب سهل وبسيط
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="research">
          📝 تلخيص كتاب أو بحث أو مقال
        </label>
        <label class="pa-card-opt">
          <input type="radio" name="pa-cat" value="image_enhance">
          ✨ تحسين جودة وتعديل صورة
        </label>
      </div>

      <label class="label-hint" style="font-weight:600; color:var(--gold);">3. اكتب طلبك هنا ببساطة (بالعامية أو الفصحى):</label>
      <textarea id="pa-idea" class="form-control" rows="3" placeholder="مثال: عاوز عرض بوربوينت من 5 شرائح عن أهمية الذكاء الاصطناعي في الشركات..."></textarea>

      <div class="row" style="margin-top:10px;">
        <button id="pa-generate" class="btn-action" type="button" style="font-size:15px; padding:12px 20px;">⚡ جهّز لي البرومبت الاحترافي</button>
        <button id="pa-copy" class="btn-ghost" type="button" style="font-size:14px;">📋 نسخ البرومبت</button>
      </div>

      <div id="pa-output-wrap" style="display:none; margin-top:14px;">
        <label class="label-hint" style="color:var(--gold); font-size:13px; font-weight:600;">جاهز! انسخ البرومبت وضعه في المنصة:</label>
        <div id="pa-output" class="result-box mono" style="max-height:360px; overflow-y:auto; line-height:1.6; user-select:all;"></div>
        
        <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <span style="font-size:12.5px; color:var(--beige-muted);">افتح المنصة بضغطة واحدة:</span>
          <a id="pa-link-chatgpt" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:6px 12px; font-size:12.5px;">🟢 فتح ChatGPT</a>
          <a id="pa-link-gemini" href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:6px 12px; font-size:12.5px;">🔵 فتح Gemini</a>
          <a id="pa-link-claude" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="text-decoration:none; padding:6px 12px; font-size:12.5px;">🟣 فتح Claude</a>
        </div>
        
        <p id="pa-tip" class="state-success" style="margin-top:10px; font-size:13px;"></p>
      </div>
    `,
    init: function () {
      const ideaEl = document.getElementById('pa-idea');
      const genBtn = document.getElementById('pa-generate');
      const copyBtn = document.getElementById('pa-copy');
      const outWrap = document.getElementById('pa-output-wrap');
      const outEl = document.getElementById('pa-output');
      const tipEl = document.getElementById('pa-tip');

      const placeholders = {
        powerpoint: 'مثال: عاوز عرض بوربوينت من 5 شرائح عن أهمية الذكاء الاصطناعي في تحسين خدمة العملاء وزيادة المبيعات...',
        image_gen: 'مثال: قطة رائد فضاء جالسة على مكتب خشبي عتيق محاطة بكتب قديمة ونجوم في الخلفية...',
        excel: 'مثال: عندي جدول بمبيعات المناديب، عاوز معادلة تجمع إجمالي مبيعات المندوب (أحمد) لو كانت في شهر مارس...',
        cv: 'مثال: أنا محاسب خبرة 4 سنين، اشتغلت في إعداد القوائم المالية، وعاوز أكتب ملخص مهني قوي متوافق مع أنظمة الـ ATS...',
        email: 'مثال: عاوز إيميل رسمي للمدير بطلب فيه إجازة سنوية لمدة أسبوع، مع توضيح تسليم المهام لزميلي...',
        content: 'مثال: سكريبت فيديو تيك توك مدته 40 ثانية عن 3 حيل مخفية في الآيفون الموظفين بيحتاجوها كل يوم...',
        education: 'مثال: اشرح لي الحوسبة السحابية (Cloud Computing) بأسلوب مبسط جداً زي ما أكون بشرح لطفل...',
        research: 'مثال: لخص لي أهم الأفكار والخطوات العملية في كتاب العادات الذرية وكيفية تطبيقها يومياً...',
        image_enhance: 'مثال: عندي صورة قديمة باهتة فيها تشويش، عاوز خطوات وأوامر لتحسين الحدة وتعديل ألوان البشرة والإضاءة...'
      };

      // Dynamic placeholder when task changes
      const taskRadios = document.getElementsByName('pa-cat');
      for (let i = 0; i < taskRadios.length; i++) {
        taskRadios[i].addEventListener('change', function () {
          if (placeholders[this.value] && (!ideaEl.value || Object.values(placeholders).includes(ideaEl.value))) {
            ideaEl.placeholder = placeholders[this.value];
          }
        });
      }

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
          powerpoint: 'Executive Presentation Designer & Slide Architect',
          image_gen: 'World-Class AI Art Director & Cinematic Prompt Engineer',
          image_enhance: 'Master Photo Retoucher & Digital Restoration Specialist',
          excel: 'Advanced Excel & Data Analytics Specialist',
          cv: 'Certified Executive Career Coach & ATS Resume Strategist',
          email: 'Corporate Communications Director & Professional Copywriter',
          content: 'Senior Viral Content Producer & Short-Form Video Strategist',
          education: 'Master Educator (Feynman Simplification Method)',
          research: 'Lead Research Analyst & Document Synthesis Specialist'
        };
        const roleTitle = roleMap[cat] || 'Elite Domain Expert';

        // Pre-configured optimal recipes based on category
        let recipeDirectives = '';
        let targetFormat = 'منظم ومباشر بدون حشو';

        if (cat === 'powerpoint') {
          targetFormat = 'شرائح بوربوينت كاملة (Slide by Slide) + كود VBA لإنشائها تلقائياً في ثواني';
          recipeDirectives = '\n1. قسّم المحتوى إلى شرائح واضحة: [الشريحة 1: العنوان الرئيسي والهوك]، ثم الشرائح التالية مدعومة بنقاط مركزة وملاحظات للمتحدث (Speaker Notes).\n2. في نهاية الإجابة، اكتب كود VBA كامل جاهز للنسخ في PowerPoint ليقوم بإنشاء هذه الشرائح تلقائياً وتلوينها بضغطة زر واحدة.';
        } else if (cat === 'image_gen') {
          targetFormat = 'برومبت صورة سينمائي فائق الدقة بالإنجليزية (Photorealistic Prompt - 1:1 Square)';
          recipeDirectives = '\n1. اكتب برومبت مفصل بالإنجليزية يتضمن: الموضوع الرئيسي بدقة، زاوية الكاميرا ونوع العدسة (35mm f/1.8)، أسلوب الإضاءة السينمائي، لوحة الألوان.\n2. أضف المعاملات القياسية: --ar 1:1 --v 6.0 --style raw --q 2 photorealistic, 8k resolution.\n3. أضف ترجمة عربية موجزة تشرح المشهد.';
        } else if (cat === 'excel') {
          targetFormat = 'المعادلة الدقيقة + شرح كل جزء + جدول بيانات توضيحي';
          recipeDirectives = '\n1. أعطني الصيغة المباشرة للمعادلة (Excel Formula) جاهزة للنسخ.\n2. اشرح وظيفة كل خانة في المعادلة بأسلوب مبسط جداً للمبتدئين.\n3. أضف نصيحة لحماية المعادلة من الأخطاء مثل استخدام دالة IFERROR.';
        } else if (cat === 'cv') {
          targetFormat = 'سيرة ذاتية متوافقة 100% مع أنظمة الـ ATS';
          recipeDirectives = '\n1. استخدم أفعال حركة قوية وإنجازات رقمية قابلة للقياس (Action Verbs + Metrics).\n2. رتب الأقسام: نبذة مهنية ملهمة، الخبرات العملية، المهارات الأساسية، الكلمات المفتاحية للوظيفة.\n3. اجعل النص خالياً تماماً من الجداول المعقدة لضمان قراءته بسهولة بواسطة برامج التوظيف.';
        } else if (cat === 'email') {
          targetFormat = 'إيميل مهني جاهز للإرسال الفوري';
          recipeDirectives = '\n1. اقترح 3 خيارات لعنوان الإيميل (Subject Line) جذابة وواضحة.\n2. اكتب نص الإيميل بأسلوب مهني محترم ومباشر يبدأ بالموضوع دون مقدمات طويلة.\n3. ضع طلباً واضحاً للخطوة التالية (Call to Action) وخاتمة رسمية مناسبة.';
        } else if (cat === 'content') {
          targetFormat = 'سيناريو فيديو كامل ومفصل بالثواني (Hook + Visuals + CTA)';
          recipeDirectives = '\n1. هوك قوي في أول 3 ثواني يوقف التمرير فوراً (Scroll-Stopper Hook).\n2. عمود أو توضيح للتوجيهات البصرية (ماذا يظهر على الشاشة) وما يقال صوتياً (Voiceover).\n3. إيقاع سريع وممتع مدته أقل من 60 ثانية مع دعوة واضحة للتفاعل في النهاية (CTA).';
        } else if (cat === 'education') {
          targetFormat = 'شرح مبسط جداً (تقنية فاينمان) بأمثلة من الحياة اليومية';
          recipeDirectives = '\n1. اشرح المفهوم وكأنك تشرحه لشخص ذكي بعمر 10 سنوات بدون أي مصطلحات معقدة أو إنجليزية غير مفهومة.\n2. استخدم تشبيهاً واقعياً من الحياة اليومية لتقريب الفكرة.\n3. اختم بملخص في سطرين يلخص كل شيء.';
        } else if (cat === 'research') {
          targetFormat = 'ملخص تنفيذي فائق التركيز';
          recipeDirectives = '\n1. ابدأ بملخص شامل في فقرة واحدة فقط.\n2. استخرج أهم 5 نقاط ودروس عملية مستفادة قابلة للتطبيق فوراً.\n3. احذف أي حشو أو كلام نظري غير مفيد.';
        } else if (cat === 'image_enhance') {
          targetFormat = 'خطوات عملية واضحة لتعديل وتحسين الصورة';
          recipeDirectives = '\n1. أوامر دقيقة لتصحيح الألوان ودرجات التباين والظلال.\n2. كيفية إزالة التشويش وتوضيح الملامح والحدة دون إفساد التفاصيل.\n3. أفضل الأدوات أو الإعدادات المجانية لإنجاز ذلك.';
        }

        let prompt = '';
        let tip = '';

        if (model === 'claude') {
          prompt = `<role>\n` +
            `You are an elite ${roleTitle}. You deliver concise, exceptionally high-signal results without conversational filler or apologies.\n` +
            `</role>\n\n` +
            `<user_request>\n` +
            `${idea}\n` +
            `</user_request>\n\n` +
            `<task_specifications>\n` +
            `• Domain: ${catText}\n` +
            `• Target Output Format: ${targetFormat}\n` +
            `• Execution Guidelines:${recipeDirectives}\n` +
            `• Tone: أسلوب عربي واضح ومباشر وعملي بدون فزلكة\n` +
            `</task_specifications>\n\n` +
            `<instructions>\n` +
            `Deliver the solution immediately, beautifully structured, and completely ready to use.\n` +
            `</instructions>`;
          tip = '💡 سر كلود (Claude): يفهم التفاصيل المنطقية بدقة فائقة ويخرج لك نتائج مرتبة بدون كلام زايد.';

        } else if (model === 'gemini') {
          prompt = `[SYSTEM: HIGH-SIGNAL EXPERT]\n` +
            `ACT AS: Elite ${roleTitle}\n\n` +
            `MISSION:\n` +
            `${idea}\n\n` +
            `BLUEPRINT & DELIVERABLE:\n` +
            `• المجال: ${catText}\n` +
            `• شكل النتيجة المطلوبة: ${targetFormat}\n` +
            `• توجيهات التنفيذ:${recipeDirectives}\n` +
            `• النبرة: أسلوب عربي سهل، مباشر، وخالٍ تماماً من الحشو والمقدمات الإنشائية.\n\n` +
            `ابدأ بالإجابة فوراً:`;
          tip = '💡 سر جوجل جيميناي (Gemini): يتألق في الاستجابة المباشرة للمهمة والأفكار المنظمة.';

        } else {
          prompt = `# الدور المطلوب (Role)\n` +
            `تصرف كخبير ومستشار محترف: ${roleTitle}.\n\n` +
            `## المهمة والطلب (Task)\n` +
            `${idea}\n\n` +
            `## متطلبات الإجابة والتنفيذ (Guidelines)\n` +
            `1. **المجال:** ${catText}\n` +
            `2. **شكل النتيجة:** ${targetFormat}\n` +
            `3. **القواعد العملية:**${recipeDirectives}\n` +
            `4. **الأسلوب:** عربي مبسط، عملي، بدون مقدمات ترحيبية أو فزلكة.\n\n` +
            `## الإجابة المباشرة:`;
          tip = '💡 سر شات جي بي تي (ChatGPT): تنظيم العناوين يجعله ينفذ لك كود الـ VBA أو الشرائح أو المعادلات بنسبة دقة 100%.';
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

