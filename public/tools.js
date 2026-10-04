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
    for (; ;) {
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
    for (; ;) {
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
  },

  /* ───────────────────────── BILL SPLITTER & EL-QETEYA ───────────────────────── */

  billSplitterTool: {
    emoji: '🍕',
    title: 'مُقسم الفواتير الذكي',
    slug: 'qeteya',
    aliases: ['split', 'bill', 'hesab', 'qsmha', '3'],
    category: 'Utilities',
    desc: 'احسب نصيب كل فرد في فاتورة الأكل أو القهوة، وولد رسالة واتساب شيك بإنستاباي وفودافون كاش فوراً.',
    html: `
      <style>
        .qs-wrap {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Highlight Banner ── */
        .qs-banner {
          background: linear-gradient(135deg, rgba(26, 74, 66, 0.5) 0%, rgba(200, 149, 46, 0.15) 100%);
          border: 1px solid rgba(200, 149, 46, 0.35);
          border-radius: var(--radius);
          padding: 20px 22px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(230, 184, 77, 0.2);
          position: relative;
          overflow: hidden;
        }
        .qs-banner::before {
          content: '';
          position: absolute;
          top: -40px;
          left: -40px;
          width: 140px;
          height: 140px;
          background: radial-gradient(circle, rgba(200, 149, 46, 0.2), transparent 70%);
          pointer-events: none;
        }
        .qs-banner-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .qs-banner-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: var(--gold);
          background: rgba(200, 149, 46, 0.12);
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(200, 149, 46, 0.25);
        }
        .qs-banner-share {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-top: 4px;
          margin-bottom: 12px;
        }
        .qs-share-val {
          font-family: var(--font-headline);
          font-size: 46px;
          font-weight: 800;
          color: var(--gold-bright);
          line-height: 1;
          letter-spacing: -0.5px;
          text-shadow: 0 0 25px rgba(230, 184, 77, 0.35);
        }
        .qs-share-unit {
          font-size: 19px;
          font-weight: 700;
          color: var(--beige);
        }
        .qs-banner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .qs-grid-cell {
          background: rgba(0, 0, 0, 0.28);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .qs-cell-label {
          font-size: 11.5px;
          color: var(--beige-muted);
          margin-bottom: 2px;
        }
        .qs-cell-val {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          font-family: var(--mono);
        }

        /* ── Tabs ── */
        .qs-tabs {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          padding: 5px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .qs-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--beige-soft);
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .qs-tab.active {
          background: var(--teal);
          color: #fff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(200, 149, 46, 0.35);
        }

        /* ── Form Card ── */
        .qs-box {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .qs-box-head {
          font-size: 14px;
          font-weight: 700;
          color: var(--gold);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Stepper ── */
        .qs-stepper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qs-step-btn {
          width: 44px;
          height: 44px;
          background: var(--teal-dark);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--beige);
          font-size: 22px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          user-select: none;
        }
        .qs-step-btn:hover {
          background: var(--teal);
          color: #fff;
          border-color: var(--gold);
        }
        .qs-step-input {
          width: 80px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          font-family: var(--mono);
          color: #fff;
        }

        /* ── Chips / Pills ── */
        .qs-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .qs-chip-pill {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          color: var(--beige-soft);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          font-family: var(--mono);
          transition: all 0.15s ease;
        }
        .qs-chip-pill:hover {
          background: rgba(200, 149, 46, 0.15);
          border-color: var(--gold);
          color: #fff;
        }

        /* ── Radio Cards ── */
        .qs-radio-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
        }
        .qs-rcard {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.18s ease;
          font-size: 13px;
          color: var(--beige);
          user-select: none;
        }
        .qs-rcard:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--teal-light, #2a5a52);
        }
        .qs-rcard input[type="radio"] {
          accent-color: var(--gold);
          cursor: pointer;
        }
        .qs-rcard:has(input[type="radio"]:checked) {
          background: rgba(200, 149, 46, 0.12);
          border-color: var(--gold);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 0 10px rgba(200, 149, 46, 0.15);
        }

        /* ── WhatsApp Message Bubble ── */
        .qs-wa-preview {
          background: #0d2820;
          border: 1px solid rgba(37, 211, 102, 0.3);
          border-radius: 14px 14px 2px 14px;
          padding: 16px 18px;
          color: #e9edef;
          font-size: 14px;
          line-height: 1.7;
          position: relative;
          white-space: pre-wrap;
          word-break: break-word;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
          font-family: var(--font-ar);
        }
        .qs-wa-preview strong {
          color: #53bdeb;
          font-weight: 700;
        }
        .qs-wa-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
          color: #25d366;
          font-weight: 600;
        }

        /* ── Itemized Table ── */
        .qs-item-row {
          display: grid;
          grid-template-columns: 1.2fr 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .qs-del-btn {
          width: 38px;
          height: 38px;
          background: rgba(199, 90, 90, 0.15);
          border: 1px solid rgba(199, 90, 90, 0.3);
          color: #e07070;
          border-radius: var(--radius-sm);
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .qs-del-btn:hover {
          background: rgba(199, 90, 90, 0.3);
          color: #fff;
        }
      </style>

      <div class="qs-wrap">

        <!-- 1. Highlight Share Banner -->
        <div class="qs-banner">
          <div class="qs-banner-top">
            <span class="qs-banner-badge">✨ الحسبة الذكية</span>
            <span id="qs-occasion-badge" style="font-size:13px; color:var(--beige-soft); font-weight:600;">فاتورة الأكل</span>
          </div>
          <div class="qs-banner-share">
            <span id="qs-hl-share" class="qs-share-val">0</span>
            <span class="qs-share-unit">ج.م / للفرد</span>
          </div>

          <div class="qs-banner-grid">
            <div class="qs-grid-cell">
              <div class="qs-cell-label">إجمالي الفاتورة</div>
              <div id="qs-cell-total" class="qs-cell-val">0 ج.م</div>
            </div>
            <div class="qs-grid-cell">
              <div class="qs-cell-label">عدد الأفراد</div>
              <div id="qs-cell-people" class="qs-cell-val">4 أفراد</div>
            </div>
            <div class="qs-grid-cell">
              <div class="qs-cell-label">المستحق استلامه</div>
              <div id="qs-cell-collect" class="qs-cell-val">0 ج.م</div>
            </div>
            <div class="qs-grid-cell">
              <div class="qs-cell-label">التقريب وتظبيط الفكة</div>
              <div id="qs-cell-round" class="qs-cell-val">بدون تقريب</div>
            </div>
          </div>
        </div>

        <!-- 2. Mode Selector Tabs -->
        <div class="qs-tabs">
          <button id="qs-tab-equal" class="qs-tab active" type="button">
            <span>🍕</span>
            <span>تقسيم متساوي (الكل زي بعض)</span>
          </button>
          <button id="qs-tab-items" class="qs-tab" type="button">
            <span>🧾</span>
            <span>حساب كل واحد بطلبه (مخصص)</span>
          </button>
        </div>

        <!-- 3. Equal Split Controls -->
        <div id="qs-equal-section" class="qs-box">
          <div class="qs-box-head">
            <span>💵 1. قيمة الفاتورة</span>
          </div>

          <!-- Total input mode selector -->
          <div style="display:flex; gap:12px; margin-bottom:4px; font-size:13px;">
            <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <input type="radio" name="qs-calc-mode" value="direct" checked>
              <span>المبلغ النهائي بالفاتورة مباشرة</span>
            </label>
            <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <input type="radio" name="qs-calc-mode" value="breakdown">
              <span>حساب تفصيلي (طلبات + ضريبة + خدمة + دليفري)</span>
            </label>
          </div>

          <!-- Direct total -->
          <div id="qs-direct-wrap">
            <input id="qs-total-input" class="form-control mono" type="number" min="0" step="any" placeholder="اكتب إجمالي الفاتورة (مثال: 560)" style="font-size:18px; font-weight:700;">
            <div class="qs-chips-row" style="margin-top:8px;">
              <span style="font-size:11.5px; color:var(--beige-muted); align-self:center;">زيادة سريعة:</span>
              <button class="qs-chip-pill qs-add-val" data-add="50" type="button">+50 ج.م</button>
              <button class="qs-chip-pill qs-add-val" data-add="100" type="button">+100 ج.م</button>
              <button class="qs-chip-pill qs-add-val" data-add="200" type="button">+200 ج.م</button>
              <button class="qs-chip-pill qs-add-val" data-add="500" type="button">+500 ج.م</button>
              <button id="qs-clear-val" class="qs-chip-pill" style="color:var(--error);" type="button">مسح</button>
            </div>
          </div>

          <!-- Breakdown breakdown inputs -->
          <div id="qs-breakdown-wrap" style="display:none; gap:10px; flex-direction:column; background:rgba(0,0,0,0.2); padding:12px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05);">
            <div>
              <label class="label-hint">قيمة الطلبات الأساسية (قبل الضريبة والخدمة)</label>
              <input id="qs-subtotal" class="form-control mono" type="number" placeholder="مثال: 450">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="label-hint">ضريبة القيمة المضافة (%)</label>
                <input id="qs-vat" class="form-control mono" type="number" value="14" placeholder="14">
              </div>
              <div>
                <label class="label-hint">الخدمة / Service (%)</label>
                <input id="qs-service" class="form-control mono" type="number" value="12" placeholder="12">
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="label-hint">مصاريف توصيل / دليفري (ج.م)</label>
                <input id="qs-delivery" class="form-control mono" type="number" value="0" placeholder="0">
              </div>
              <div>
                <label class="label-hint">خصم أو بروموكود (ج.م)</label>
                <input id="qs-discount" class="form-control mono" type="number" value="0" placeholder="0">
              </div>
            </div>
          </div>

          <!-- People count stepper -->
          <div style="margin-top:6px;">
            <label class="label-hint" style="font-weight:600; color:var(--gold);">👥 2. عدد الأفراد المشاركين</label>
            <div class="qs-stepper">
              <button id="qs-people-minus" class="qs-step-btn" type="button">−</button>
              <input id="qs-people-input" class="form-control qs-step-input" type="number" min="2" max="100" value="4">
              <button id="qs-people-plus" class="qs-step-btn" type="button">+</button>
              <span style="font-size:13px; color:var(--beige-soft); margin-right:4px;">أشخاص</span>
            </div>
          </div>

          <!-- Payer included toggle -->
          <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:var(--beige);">
            <input id="qs-payer-included" type="checkbox" checked style="accent-color:var(--gold); width:16px; height:16px;">
            <span>أنا مشمول في التقسيم (هيدفعوا لي نصيبهم فقط)</span>
          </label>

          <!-- Occasion title -->
          <div>
            <label class="label-hint">🏷️ اسم المكان أو المناسبة (اختياري)</label>
            <input id="qs-venue" class="form-control" type="text" placeholder="مثال: غدا الشغل، قهوة بلبن، عشا زايد...">
          </div>

          <!-- Rounding options -->
          <div>
            <label class="label-hint" style="font-weight:600; color:var(--gold);">🪙 3. تظبيط الكسور والفكة</label>
            <div class="qs-radio-cards">
              <label class="qs-rcard">
                <input type="radio" name="qs-round" value="none" checked>
                <span>بدون تقريب (دقيق)</span>
              </label>
              <label class="qs-rcard">
                <input type="radio" name="qs-round" value="round5">
                <span>لأقرب 5 ج.م للأعلى</span>
              </label>
              <label class="qs-rcard">
                <input type="radio" name="qs-round" value="round10">
                <span>لأقرب 10 ج.م للأعلى</span>
              </label>
            </div>
            <p id="qs-round-diff-note" class="label-hint" style="font-size:12px; margin-top:4px; display:none; color:var(--gold);"></p>
          </div>
        </div>

        <!-- 4. Itemized Split Controls (Hidden by default) -->
        <div id="qs-items-section" class="qs-box" style="display:none;">
          <div class="qs-box-head">
            <span>📝 طلبات الأفراد بالتفصيل</span>
          </div>
          <p class="label-hint" style="margin-top:-6px;">اكتب طلب كل شخص، والأداة هتوزع الضريبة والخدمة بنسبة عادلة والدليفري بالتساوي!</p>

          <div id="qs-items-list" style="display:flex; flex-direction:column; gap:8px;"></div>

          <button id="qs-add-person" class="btn-ghost" type="button" style="margin-top:6px; font-size:13px; align-self:flex-start;">➕ إضافة شخص آخر</button>

          <!-- Extra fees for itemized mode -->
          <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05); margin-top:6px; display:flex; flex-direction:column; gap:8px;">
            <span style="font-size:13px; font-weight:700; color:var(--gold);">الرسوم العامة المشتركة:</span>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
              <div>
                <label class="label-hint">الضريبة (%)</label>
                <input id="qs-item-vat" class="form-control mono" type="number" value="14">
              </div>
              <div>
                <label class="label-hint">الخدمة (%)</label>
                <input id="qs-item-service" class="form-control mono" type="number" value="12">
              </div>
              <div>
                <label class="label-hint">دليفري (ج.م)</label>
                <input id="qs-item-deliv" class="form-control mono" type="number" value="0">
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Payment Method & Details -->
        <div class="qs-box">
          <div class="qs-box-head">
            <span>💳 طريقة استقبال الفلوس</span>
          </div>

          <div class="qs-radio-cards">
            <label class="qs-rcard">
              <input type="radio" name="qs-pay-method" value="instapay" checked>
              <span>🟣 إنستاباي (InstaPay)</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-pay-method" value="voda">
              <span>🔴 فودافون كاش / محفظة</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-pay-method" value="bank">
              <span>🏦 تحويل بنكي</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-pay-method" value="cash">
              <span>💵 كاش يدوي</span>
            </label>
          </div>

          <div>
            <label id="qs-acc-label" class="label-hint" style="font-weight:600;">رابط أو عنوان إنستاباي (IPA / Username أو رقم الهاتف):</label>
            <input id="qs-acc-input" class="form-control mono" type="text" placeholder="مثال: name@instapay أو رقم التليفون المسجل">
            <span class="label-hint" style="font-size:11.5px; margin-top:3px; display:block;">💾 يتم حفظ بيانات الدفع تلقائياً في جهازك لاستخدامها في المرات القادمة.</span>
          </div>
        </div>

        <!-- 6. Message Tone & WhatsApp Output -->
        <div class="qs-box">
          <div class="qs-box-head">
            <span>💬 شكل ونبرة رسالة الواتساب</span>
          </div>

          <div class="qs-radio-cards">
            <label class="qs-rcard">
              <input type="radio" name="qs-tone" value="friends" checked>
              <span>😎 هزار وقفشات</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-tone" value="polite">
              <span>✨ شياكة وذوق</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-tone" value="short">
              <span>⚡ سريع ومباشر</span>
            </label>
            <label class="qs-rcard">
              <input type="radio" name="qs-tone" value="corp">
              <span>💼 رسمي وعمل</span>
            </label>
          </div>

          <!-- Live WhatsApp Preview Box -->
          <div style="margin-top:6px;">
            <div class="qs-wa-bar">
              <span>🟢 معاينة رسالة الواتساب الجاهزة للإرسال:</span>
              <span style="color:var(--beige-muted); font-size:11px;">الآن</span>
            </div>
            <div id="qs-wa-preview" class="qs-wa-preview"></div>
          </div>

          <!-- Action Buttons -->
          <div class="row" style="margin-top:8px;">
            <a id="qs-send-whatsapp" class="btn-action" href="#" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px;">
              <span>📲 إرسال على واتساب (فتح التطبيق)</span>
            </a>
            <button id="qs-copy-msg" class="btn-ghost" type="button">📋 نسخ الرسالة</button>
            <button id="qs-share-link" class="btn-ghost" type="button">🔗 نسخ رابط الحسبة المباشر</button>
          </div>
        </div>

      </div>
    `,
    init: function () {
      // Elements
      const totalInput = document.getElementById('qs-total-input');
      const directWrap = document.getElementById('qs-direct-wrap');
      const breakdownWrap = document.getElementById('qs-breakdown-wrap');
      const subtotalInput = document.getElementById('qs-subtotal');
      const vatInput = document.getElementById('qs-vat');
      const serviceInput = document.getElementById('qs-service');
      const deliveryInput = document.getElementById('qs-delivery');
      const discountInput = document.getElementById('qs-discount');

      const peopleInput = document.getElementById('qs-people-input');
      const peopleMinus = document.getElementById('qs-people-minus');
      const peoplePlus = document.getElementById('qs-people-plus');
      const payerIncluded = document.getElementById('qs-payer-included');
      const venueInput = document.getElementById('qs-venue');

      const hlShare = document.getElementById('qs-hl-share');
      const cellTotal = document.getElementById('qs-cell-total');
      const cellPeople = document.getElementById('qs-cell-people');
      const cellCollect = document.getElementById('qs-cell-collect');
      const cellRound = document.getElementById('qs-cell-round');
      const occasionBadge = document.getElementById('qs-occasion-badge');
      const roundDiffNote = document.getElementById('qs-round-diff-note');

      const tabEqual = document.getElementById('qs-tab-equal');
      const tabItems = document.getElementById('qs-tab-items');
      const equalSection = document.getElementById('qs-equal-section');
      const itemsSection = document.getElementById('qs-items-section');
      const itemsList = document.getElementById('qs-items-list');
      const addPersonBtn = document.getElementById('qs-add-person');
      const itemVat = document.getElementById('qs-item-vat');
      const itemService = document.getElementById('qs-item-service');
      const itemDeliv = document.getElementById('qs-item-deliv');

      const accLabel = document.getElementById('qs-acc-label');
      const accInput = document.getElementById('qs-acc-input');
      const waPreview = document.getElementById('qs-wa-preview');
      const sendWaBtn = document.getElementById('qs-send-whatsapp');
      const copyMsgBtn = document.getElementById('qs-copy-msg');
      const shareLinkBtn = document.getElementById('qs-share-link');

      let currentMode = 'equal'; // 'equal' | 'items'

      // Initial itemized list state
      let customItems = [
        { name: 'أنا', amount: 150 },
        { name: 'صديق 1', amount: 180 },
        { name: 'صديق 2', amount: 130 }
      ];

      // Restore saved payment data from localStorage
      try {
        const savedMethod = localStorage.getItem('shaher_qeteya_method');
        const savedAcc = localStorage.getItem('shaher_qeteya_account');
        if (savedMethod) {
          const radio = document.querySelector('input[name="qs-pay-method"][value="' + savedMethod + '"]');
          if (radio) radio.checked = true;
        }
        if (savedAcc && accInput) {
          accInput.value = savedAcc;
        }
      } catch (e) { }

      // Handle deep links from URL query parameters
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('total')) totalInput.value = urlParams.get('total');
        if (urlParams.has('people')) peopleInput.value = urlParams.get('people');
        if (urlParams.has('venue')) venueInput.value = urlParams.get('venue');
        if (urlParams.has('method')) {
          const r = document.querySelector('input[name="qs-pay-method"][value="' + urlParams.get('method') + '"]');
          if (r) r.checked = true;
        }
        if (urlParams.has('acc')) accInput.value = urlParams.get('acc');
      } catch (e) { }

      function getSelectedRadio(name, fallback) {
        const radios = document.getElementsByName(name);
        for (let i = 0; i < radios.length; i++) {
          if (radios[i].checked) return radios[i].value;
        }
        return fallback;
      }

      function updateMethodPlaceholder() {
        const method = getSelectedRadio('qs-pay-method', 'instapay');
        if (method === 'instapay') {
          accLabel.textContent = 'رابط أو عنوان إنستاباي (IPA / Username أو رقم الهاتف):';
          accInput.placeholder = 'مثال: name@instapay أو 01012345678';
          accInput.parentElement.style.display = 'block';
        } else if (method === 'voda') {
          accLabel.textContent = 'رقم فودافون كاش أو المحفظة الإلكترونية:';
          accInput.placeholder = 'مثال: 01012345678 أو 011... أو 012...';
          accInput.parentElement.style.display = 'block';
        } else if (method === 'bank') {
          accLabel.textContent = 'بيانات التحويل البنكي (اسم البنك ورقم الحساب / الـ IBAN):';
          accInput.placeholder = 'مثال: بنك مصر - رقم الحساب: 123456789...';
          accInput.parentElement.style.display = 'block';
        } else {
          accLabel.textContent = 'ملاحظة الكاش:';
          accInput.placeholder = 'مثال: الدفع كاش عند المقابلة في القهوة';
          accInput.parentElement.style.display = 'block';
        }
      }

      function renderCustomItems() {
        itemsList.innerHTML = '';
        customItems.forEach(function (item, idx) {
          const row = document.createElement('div');
          row.className = 'qs-item-row';
          row.innerHTML =
            '<input class="form-control qs-item-name" type="text" placeholder="اسم الشخص" value="' + (item.name || '') + '">' +
            '<input class="form-control mono qs-item-amt" type="number" min="0" placeholder="قيمة الأكل (ج.م)" value="' + (item.amount || '') + '">' +
            '<button class="qs-del-btn" type="button" title="حذف">✕</button>';

          const nameIn = row.querySelector('.qs-item-name');
          const amtIn = row.querySelector('.qs-item-amt');
          const delBtn = row.querySelector('.qs-del-btn');

          nameIn.addEventListener('input', function () {
            customItems[idx].name = nameIn.value;
            calculate();
          });
          amtIn.addEventListener('input', function () {
            customItems[idx].amount = parseFloat(amtIn.value) || 0;
            calculate();
          });
          delBtn.addEventListener('click', function () {
            if (customItems.length <= 1) return;
            customItems.splice(idx, 1);
            renderCustomItems();
            calculate();
          });

          itemsList.appendChild(row);
        });
      }

      function calculate() {
        const venue = (venueInput.value || '').trim() || 'فاتورة الخروجة';
        occasionBadge.textContent = venue;

        const roundType = getSelectedRadio('qs-round', 'none');
        const method = getSelectedRadio('qs-pay-method', 'instapay');
        const tone = getSelectedRadio('qs-tone', 'friends');
        const account = (accInput.value || '').trim();

        // Save payment to localStorage
        try {
          localStorage.setItem('shaher_qeteya_method', method);
          if (account) localStorage.setItem('shaher_qeteya_account', account);
        } catch (e) { }

        let total = 0;
        let people = 4;
        let sharePerPerson = 0;
        let totalCollected = 0;
        let messageText = '';
        let roundDiff = 0;

        if (currentMode === 'equal') {
          const calcMode = getSelectedRadio('qs-calc-mode', 'direct');
          if (calcMode === 'direct') {
            total = parseFloat(totalInput.value) || 0;
          } else {
            const sub = parseFloat(subtotalInput.value) || 0;
            const vat = parseFloat(vatInput.value) || 0;
            const srv = parseFloat(serviceInput.value) || 0;
            const deliv = parseFloat(deliveryInput.value) || 0;
            const disc = parseFloat(discountInput.value) || 0;
            total = sub + (sub * (vat / 100)) + (sub * (srv / 100)) + deliv - disc;
            if (total < 0) total = 0;
          }

          people = parseInt(peopleInput.value, 10) || 4;
          if (people < 1) people = 1;

          let rawShare = total > 0 ? (total / people) : 0;
          sharePerPerson = rawShare;

          if (roundType === 'round5' && rawShare > 0) {
            sharePerPerson = Math.ceil(rawShare / 5) * 5;
            roundDiff = (sharePerPerson * people) - total;
          } else if (roundType === 'round10' && rawShare > 0) {
            sharePerPerson = Math.ceil(rawShare / 10) * 10;
            roundDiff = (sharePerPerson * people) - total;
          }

          const isPayerInc = payerIncluded.checked;
          const othersCount = isPayerInc ? (people - 1) : people;
          totalCollected = sharePerPerson * Math.max(0, othersCount);

          // Update banner numbers
          hlShare.textContent = sharePerPerson % 1 === 0 ? sharePerPerson : sharePerPerson.toFixed(2);
          cellTotal.textContent = (total % 1 === 0 ? total : total.toFixed(2)) + ' ج.م';
          cellPeople.textContent = people + ' أفراد' + (isPayerInc ? ' (شاملك)' : '');
          cellCollect.textContent = (totalCollected % 1 === 0 ? totalCollected : totalCollected.toFixed(2)) + ' ج.م' + ' (من ' + othersCount + ' أفراد)';

          if (roundType === 'none') {
            cellRound.textContent = 'بدون تقريب';
            roundDiffNote.style.display = 'none';
          } else {
            const roundLabel = roundType === 'round5' ? 'أقرب 5 ج.م للأعلى' : 'أقرب 10 ج.م للأعلى';
            cellRound.textContent = roundLabel;
            roundDiffNote.style.display = 'block';
            roundDiffNote.textContent = '💡 فرق التقريب لصالح الدافع: +' + (roundDiff % 1 === 0 ? roundDiff : roundDiff.toFixed(2)) + ' ج.م لتغطية الفكة.';
          }

          // Build message
          const shareFormatted = sharePerPerson % 1 === 0 ? sharePerPerson : sharePerPerson.toFixed(2);
          const totalFormatted = total % 1 === 0 ? total : total.toFixed(2);
          let payDesc = '';
          if (method === 'instapay') payDesc = 'إنستاباي (InstaPay): ' + (account || 'رابط الحساب');
          else if (method === 'voda') payDesc = 'فودافون كاش: ' + (account || 'رقم المحفظة');
          else if (method === 'bank') payDesc = 'تحويل بنكي: ' + (account || 'رقم الحساب');
          else payDesc = 'كاش: ' + (account || 'عند المقابلة');

          if (tone === 'friends') {
            messageText = 'يا شباب.. بطونكم اتملت والضحكة على وشوشكم؟ جه وقت الحساب ومحدش يعمل نفسه نايم أو الموبايل فاصل 😂🏃‍♂️\n\n' +
              '🧾 تفاصيل الفاتورة: ' + venue + '\n' +
              '👥 الإجمالي: ' + totalFormatted + ' ج.م على ' + people + ' أفراد\n' +
              '💰 نصيب الواحد: *' + shareFormatted + ' ج.م* بالظبط\n\n' +
              '📲 ابعتوا نصيبكم على ' + payDesc + '\n\n' +
              'يلا بسرعة عشان اللي دفع اتخرب بيته 💸';
          } else if (tone === 'polite') {
            messageText = 'يا شباب اتبسطت جداً بالخروجة والقعدة الحلوة النهاردة 🤍\n\n' +
              'حبيت أشارككم حسبة الفاتورة بالتفصيل:\n' +
              '🧾 المناسبة: ' + venue + '\n' +
              '👥 إجمالي المبلغ: ' + totalFormatted + ' ج.م مقسوم على ' + people + ' أفراد\n' +
              '💸 نصيب كل واحد: *' + shareFormatted + ' ج.م*\n\n' +
              '💳 للدفع والتحويل عن طريق ' + payDesc + '\n\n' +
              'تسلموا مقدماً ومنتظر الخروجة الجاية على خير إن شاء الله ✨';
          } else if (tone === 'short') {
            messageText = 'حساب الفاتورة (' + venue + '):\n' +
              '💰 نصيب الفرد: *' + shareFormatted + ' ج.م*\n' +
              '👥 الإجمالي: ' + totalFormatted + ' ج.م (' + people + ' أفراد)\n' +
              '💳 التحويل عبر ' + payDesc + '\n\n' +
              'شكراً يا شباب 🙏';
          } else {
            messageText = 'السادة الزملاء الأعزاء، تحية طيبة،\n\n' +
              'مرفق تفاصيل تسوية فاتورة ' + venue + ':\n' +
              '• إجمالي الفاتورة: ' + totalFormatted + ' ج.م\n' +
              '• عدد المشاركين: ' + people + ' أفراد\n' +
              '• نصيب الفرد المستحق: *' + shareFormatted + ' ج.م*\n\n' +
              'يرجى التكرم بالتحويل عبر ' + payDesc + '.\n\n' +
              'شاكر لكم حسن التعاون.';
          }

        } else {
          // Custom itemized mode
          people = customItems.length;
          const vat = parseFloat(itemVat.value) || 0;
          const srv = parseFloat(itemService.value) || 0;
          const deliv = parseFloat(itemDeliv.value) || 0;

          const baseTotal = customItems.reduce(function (sum, item) { return sum + (item.amount || 0); }, 0);
          const taxAndServiceRate = (vat + srv) / 100;
          const delivPerPerson = people > 0 ? (deliv / people) : 0;

          total = baseTotal + (baseTotal * taxAndServiceRate) + deliv;

          hlShare.textContent = 'مُفصّل';
          cellTotal.textContent = (total % 1 === 0 ? total : total.toFixed(2)) + ' ج.م';
          cellPeople.textContent = people + ' أفراد (بالطلب)';
          cellCollect.textContent = 'حسب كل فرد';
          cellRound.textContent = 'بالطلب + الضريبة';

          let payDesc = '';
          if (method === 'instapay') payDesc = 'إنستاباي (InstaPay): ' + (account || 'رابط الحساب');
          else if (method === 'voda') payDesc = 'فودافون كاش: ' + (account || 'رقم المحفظة');
          else if (method === 'bank') payDesc = 'تحويل بنكي: ' + (account || 'رقم الحساب');
          else payDesc = 'كاش: ' + (account || 'عند المقابلة');

          let itemsBreakdown = '';
          customItems.forEach(function (it) {
            const itBase = it.amount || 0;
            let itTotal = itBase + (itBase * taxAndServiceRate) + delivPerPerson;
            if (roundType === 'round5') itTotal = Math.ceil(itTotal / 5) * 5;
            else if (roundType === 'round10') itTotal = Math.ceil(itTotal / 10) * 10;
            const itFormatted = itTotal % 1 === 0 ? itTotal : itTotal.toFixed(2);
            itemsBreakdown += '• ' + (it.name || 'شخص') + ': *' + itFormatted + ' ج.م* (طلبه: ' + itBase + ' ج.م + نسبته من الخدمة والضريبة)\n';
          });

          messageText = 'يا شباب، دي حسبة فاتورة ' + venue + ' بالتفصيل وكل واحد بطلبه العادل بالضريبة والخدمة 🧾:\n\n' +
            itemsBreakdown + '\n' +
            '👥 الإجمالي الكلي: ' + (total % 1 === 0 ? total : total.toFixed(2)) + ' ج.م\n' +
            '💳 التحويل عبر ' + payDesc + '\n\n' +
            'تسلموا يا رجالة 🙏';
        }

        // Update preview
        waPreview.textContent = messageText;

        // Update WhatsApp button link
        const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(messageText);
        sendWaBtn.href = waUrl;
      }

      // Event Listeners
      totalInput.addEventListener('input', calculate);
      subtotalInput.addEventListener('input', calculate);
      vatInput.addEventListener('input', calculate);
      serviceInput.addEventListener('input', calculate);
      deliveryInput.addEventListener('input', calculate);
      discountInput.addEventListener('input', calculate);
      venueInput.addEventListener('input', calculate);
      accInput.addEventListener('input', calculate);
      payerIncluded.addEventListener('change', calculate);
      itemVat.addEventListener('input', calculate);
      itemService.addEventListener('input', calculate);
      itemDeliv.addEventListener('input', calculate);

      peopleInput.addEventListener('input', calculate);
      peopleMinus.addEventListener('click', function () {
        let val = parseInt(peopleInput.value, 10) || 4;
        if (val > 1) {
          peopleInput.value = val - 1;
          calculate();
        }
      });
      peoplePlus.addEventListener('click', function () {
        let val = parseInt(peopleInput.value, 10) || 4;
        peopleInput.value = val + 1;
        calculate();
      });

      // Quick amount chips
      document.querySelectorAll('.qs-add-val').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const add = parseFloat(btn.dataset.add) || 0;
          const cur = parseFloat(totalInput.value) || 0;
          totalInput.value = cur + add;
          calculate();
        });
      });
      document.getElementById('qs-clear-val').addEventListener('click', function () {
        totalInput.value = '';
        calculate();
      });

      // Direct vs Breakdown toggle
      document.querySelectorAll('input[name="qs-calc-mode"]').forEach(function (r) {
        r.addEventListener('change', function () {
          if (this.value === 'direct') {
            directWrap.style.display = 'block';
            breakdownWrap.style.display = 'none';
          } else {
            directWrap.style.display = 'none';
            breakdownWrap.style.display = 'flex';
          }
          calculate();
        });
      });

      // Rounding options
      document.querySelectorAll('input[name="qs-round"]').forEach(function (r) {
        r.addEventListener('change', calculate);
      });

      // Payment method
      document.querySelectorAll('input[name="qs-pay-method"]').forEach(function (r) {
        r.addEventListener('change', function () {
          updateMethodPlaceholder();
          calculate();
        });
      });

      // Message tone
      document.querySelectorAll('input[name="qs-tone"]').forEach(function (r) {
        r.addEventListener('change', calculate);
      });

      // Tab switcher
      tabEqual.addEventListener('click', function () {
        currentMode = 'equal';
        tabEqual.classList.add('active');
        tabItems.classList.remove('active');
        equalSection.style.display = 'flex';
        itemsSection.style.display = 'none';
        calculate();
      });
      tabItems.addEventListener('click', function () {
        currentMode = 'items';
        tabItems.classList.add('active');
        tabEqual.classList.remove('active');
        equalSection.style.display = 'none';
        itemsSection.style.display = 'flex';
        renderCustomItems();
        calculate();
      });

      addPersonBtn.addEventListener('click', function () {
        customItems.push({ name: 'شخص ' + (customItems.length + 1), amount: 100 });
        renderCustomItems();
        calculate();
      });

      // Copy message button
      copyMsgBtn.addEventListener('click', function () {
        const text = waPreview.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text).then(function () {
          const orig = copyMsgBtn.textContent;
          copyMsgBtn.textContent = '✓ تم نسخ الرسالة!';
          setTimeout(function () { copyMsgBtn.textContent = orig; }, 2000);
        }).catch(function () {
          prompt('انسخ الرسالة:', text);
        });
      });

      // Share Link button
      shareLinkBtn.addEventListener('click', function () {
        const total = totalInput.value || '0';
        const people = peopleInput.value || '4';
        const venue = encodeURIComponent(venueInput.value || '');
        const method = getSelectedRadio('qs-pay-method', 'instapay');
        const acc = encodeURIComponent(accInput.value || '');
        const shareUrl = window.location.origin + '/qeteya?total=' + total + '&people=' + people + '&venue=' + venue + '&method=' + method + '&acc=' + acc;

        navigator.clipboard.writeText(shareUrl).then(function () {
          const orig = shareLinkBtn.textContent;
          shareLinkBtn.textContent = '✓ تم نسخ رابط الحسبة!';
          setTimeout(function () { shareLinkBtn.textContent = orig; }, 2000);
        }).catch(function () {
          prompt('رابط الحسبة المباشر:', shareUrl);
        });
      });

      // Init setup
      updateMethodPlaceholder();
      calculate();
    }
  },

  /* ───────────────────────── PDF MERGE TOOL ───────────────────────── */

  pdfMergeTool: {
    emoji: '📑',
    title: 'دمج ملفات الـ PDF',
    slug: 'pdf',
    aliases: ['merge', 'pdfmerge', 'pdf-merge', '4'],
    category: 'PDF',
    desc: 'اجمع ورتب عدة ملفات PDF في ملف واحد بضغطة زر وبخصوصية 100% بدون رفعها لأي سيرفر.',
    html: `
      <style>
        .pm-wrap {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Dropzone ── */
        .pm-dropzone {
          border: 2px dashed rgba(200, 149, 46, 0.45);
          border-radius: var(--radius);
          padding: 34px 20px;
          text-align: center;
          background: rgba(22, 27, 24, 0.6);
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }
        .pm-dropzone:hover, .pm-dropzone.dragover {
          border-color: var(--gold-bright);
          background: rgba(200, 149, 46, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(200, 149, 46, 0.18);
        }
        .pm-drop-icon {
          font-size: 42px;
          line-height: 1;
          filter: drop-shadow(0 4px 12px rgba(200, 149, 46, 0.3));
        }
        .pm-drop-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }
        .pm-drop-subtitle {
          font-size: 12.5px;
          color: var(--beige-soft);
        }

        /* ── Summary Bar ── */
        .pm-summary-bar {
          background: rgba(26, 74, 66, 0.35);
          border: 1px solid rgba(200, 149, 46, 0.3);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pm-summary-info {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--gold-bright);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── File Cards List ── */
        .pm-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pm-file-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          transition: all 0.18s ease;
        }
        .pm-file-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(200, 149, 46, 0.35);
        }
        .pm-file-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .pm-file-num {
          background: rgba(200, 149, 46, 0.15);
          color: var(--gold-bright);
          border: 1px solid rgba(200, 149, 46, 0.3);
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          font-family: var(--mono);
          flex-shrink: 0;
        }
        .pm-file-meta {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pm-file-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pm-file-details {
          font-size: 11.5px;
          color: var(--beige-muted);
          display: flex;
          gap: 8px;
        }
        .pm-file-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .pm-act-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          color: var(--beige);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s ease;
        }
        .pm-act-btn:hover:not(:disabled) {
          background: rgba(200, 149, 46, 0.2);
          border-color: var(--gold);
          color: #fff;
        }
        .pm-act-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .pm-act-del:hover {
          background: rgba(199, 90, 90, 0.25) !important;
          border-color: var(--error) !important;
          color: #fff !important;
        }

        /* ── Progress Box ── */
        .pm-progress-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          display: none;
          flex-direction: column;
          gap: 8px;
        }
        .pm-progress-bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .pm-progress-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, var(--teal), var(--gold-bright));
          transition: width 0.2s ease;
        }

        /* ── Success Box ── */
        .pm-success-box {
          background: linear-gradient(135deg, rgba(26, 74, 66, 0.4) 0%, rgba(200, 149, 46, 0.15) 100%);
          border: 1px solid rgba(200, 149, 46, 0.4);
          border-radius: var(--radius);
          padding: 20px;
          display: none;
          flex-direction: column;
          gap: 12px;
          text-align: center;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        }
      </style>

      <div class="pm-wrap">

        <!-- Hidden input for file selection -->
        <input id="pm-file-input" type="file" multiple accept=".pdf,application/pdf" style="display:none;">

        <!-- Dropzone Area -->
        <div id="pm-dropzone" class="pm-dropzone">
          <div class="pm-drop-icon">📑</div>
          <div class="pm-drop-title">اسحب وأفلت ملفات الـ PDF هنا</div>
          <div class="pm-drop-subtitle">أو اضغط لاختيار الملفات من جهازك (يمكنك اختيار عدة ملفات معاً)</div>
          <button id="pm-browse-btn" class="btn-ghost" type="button" style="margin-top:6px; font-size:13px; pointer-events:none;">📂 تصفح الملفات</button>
        </div>

        <!-- Privacy Assurance Banner -->
        <div class="sticky-note" style="margin-top:0;">
          <div class="sticky-note-title">🔒 أمان وخصوصية 100%</div>
          كل عمليات المعالجة والدمج تتم محلياً داخل متصفحك مباشرة — لا يتم رفع أي ورقة أو بايت لأي سيرفر خارجي إطلاقاً.
        </div>

        <!-- Control Bar & File List (Shown after files selected) -->
        <div id="pm-files-section" style="display:none; flex-direction:column; gap:12px;">
          
          <div class="pm-summary-bar">
            <div id="pm-summary-text" class="pm-summary-info">
              <span>0 ملفات مختارة</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="pm-add-more-btn" class="btn-ghost" type="button" style="font-size:12.5px; padding:6px 12px;">➕ إضافة ملفات أخرى</button>
              <button id="pm-clear-all-btn" class="btn-ghost" type="button" style="font-size:12.5px; padding:6px 12px; color:var(--error);">🗑️ مسح الكل</button>
            </div>
          </div>

          <label class="label-hint" style="color:var(--gold); font-weight:600;">ترتيب الملفات (استخدم الأسهم لتحديد ترتيب الصفحات في الملف النهائي):</label>
          <div id="pm-file-list" class="pm-file-list"></div>

          <!-- Output filename -->
          <div style="margin-top:6px;">
            <label class="label-hint">اسم ملف الـ PDF الناتج بعد الدمج:</label>
            <input id="pm-output-name" class="form-control" type="text" value="Shaher_TECH_Merged.pdf" placeholder="Shaher_TECH_Merged.pdf">
          </div>

          <!-- Merge Action Button -->
          <div style="margin-top:4px;">
            <button id="pm-merge-btn" class="btn-action" type="button" style="font-size:15px; padding:13px 22px; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>⚡ دمج ملفات الـ PDF الآن</span>
            </button>
          </div>

        </div>

        <!-- Progress Box -->
        <div id="pm-progress-box" class="pm-progress-box">
          <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
            <span id="pm-progress-text" style="color:var(--gold);">جاري تحضير الملفات...</span>
            <span id="pm-progress-pct" style="color:#fff; font-family:var(--mono);">0%</span>
          </div>
          <div class="pm-progress-bar-bg">
            <div id="pm-progress-bar" class="pm-progress-bar-fill"></div>
          </div>
        </div>

        <!-- Success Result Box -->
        <div id="pm-success-box" class="pm-success-box">
          <div style="font-size:36px; line-height:1;">🎉</div>
          <div style="font-size:17px; font-weight:700; color:#fff;">تم دمج ملفات الـ PDF بنجاح!</div>
          <p id="pm-success-details" class="label-hint" style="margin:0; color:var(--beige-soft);"></p>

          <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top:8px;">
            <a id="pm-download-link" class="btn-action" href="#" download="Shaher_TECH_Merged.pdf" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; font-size:14px; padding:11px 20px;">
              <span>📥 تحميل الملف المدمج</span>
            </a>
            <a id="pm-preview-link" class="btn-ghost" href="#" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; font-size:13px; padding:11px 18px;">
              <span>👁️ معاينة في المتصفح</span>
            </a>
            <button id="pm-reset-btn" class="btn-ghost" type="button" style="font-size:13px; padding:11px 18px;">
              <span>🔄 دمج ملفات جديدة</span>
            </button>
          </div>
        </div>

        <p id="pm-status-msg" class="state-error" style="display:none; margin-top:4px;"></p>

      </div>
    `,
    init: function () {
      const dropzone = document.getElementById('pm-dropzone');
      const fileInput = document.getElementById('pm-file-input');
      const filesSection = document.getElementById('pm-files-section');
      const fileListEl = document.getElementById('pm-file-list');
      const summaryText = document.getElementById('pm-summary-text');
      const addMoreBtn = document.getElementById('pm-add-more-btn');
      const clearAllBtn = document.getElementById('pm-clear-all-btn');
      const outputNameInput = document.getElementById('pm-output-name');
      const mergeBtn = document.getElementById('pm-merge-btn');
      const progressBox = document.getElementById('pm-progress-box');
      const progressText = document.getElementById('pm-progress-text');
      const progressPct = document.getElementById('pm-progress-pct');
      const progressBar = document.getElementById('pm-progress-bar');
      const successBox = document.getElementById('pm-success-box');
      const successDetails = document.getElementById('pm-success-details');
      const downloadLink = document.getElementById('pm-download-link');
      const previewLink = document.getElementById('pm-preview-link');
      const resetBtn = document.getElementById('pm-reset-btn');
      const statusMsg = document.getElementById('pm-status-msg');

      let selectedFiles = []; // Array of { file: File, pages: number, size: string }
      let mergedBlobUrl = null;

      function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 بايت';
        const k = 1024;
        const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }

      function showStatus(msg, isError) {
        if (!msg) {
          statusMsg.style.display = 'none';
          statusMsg.textContent = '';
          return;
        }
        statusMsg.style.display = 'block';
        statusMsg.className = isError ? 'state-error' : 'state-success';
        statusMsg.textContent = msg;
      }

      // Load pdf-lib on-demand from local or CDN fallback
      function ensurePdfLib(cb) {
        if (window.PDFLib) {
          cb(null);
          return;
        }
        const script = document.createElement('script');
        script.src = 'pdf-lib.min.js';
        script.onload = function () { cb(null); };
        script.onerror = function () {
          const cdnScript = document.createElement('script');
          cdnScript.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.9/dist/pdf-lib.min.js';
          cdnScript.onload = function () { cb(null); };
          cdnScript.onerror = function (err) { cb(err); };
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      }

      async function processNewFiles(files) {
        showStatus('', false);
        const validPdfs = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
            validPdfs.push(f);
          }
        }

        if (validPdfs.length === 0) {
          showStatus('يرجى اختيار ملفات PDF صالحة فقط.', true);
          return;
        }

        // Try getting page counts if pdf-lib is already loaded or load it
        ensurePdfLib(async function () {
          for (const file of validPdfs) {
            let pageCount = 0;
            if (window.PDFLib) {
              try {
                const buf = await file.arrayBuffer();
                const doc = await window.PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                pageCount = doc.getPageCount();
              } catch (e) {
                pageCount = 0;
              }
            }
            selectedFiles.push({
              file: file,
              pages: pageCount,
              size: formatBytes(file.size)
            });
          }
          renderFileList();
        });
      }

      function renderFileList() {
        if (selectedFiles.length === 0) {
          filesSection.style.display = 'none';
          return;
        }

        filesSection.style.display = 'flex';
        fileListEl.innerHTML = '';

        let totalPages = 0;
        let totalBytes = 0;

        selectedFiles.forEach(function (item, idx) {
          totalPages += (item.pages || 0);
          totalBytes += item.file.size;

          const card = document.createElement('div');
          card.className = 'pm-file-card';
          card.innerHTML =
            '<div class="pm-file-main">' +
            '<span class="pm-file-num">#' + (idx + 1) + '</span>' +
            '<div class="pm-file-meta">' +
            '<span class="pm-file-name" title="' + item.file.name + '">' + item.file.name + '</span>' +
            '<span class="pm-file-details">' +
            '<span>' + item.size + '</span>' +
            (item.pages > 0 ? '<span>• ' + item.pages + ' صفحة</span>' : '') +
            '</span>' +
            '</div>' +
            '</div>' +
            '<div class="pm-file-actions">' +
            '<button class="pm-act-btn pm-move-up" title="نقل لأعلى" ' + (idx === 0 ? 'disabled' : '') + ' type="button">▲</button>' +
            '<button class="pm-act-btn pm-move-down" title="نقل لأسفل" ' + (idx === selectedFiles.length - 1 ? 'disabled' : '') + ' type="button">▼</button>' +
            '<button class="pm-act-btn pm-act-del" title="حذف الملف" type="button">✕</button>' +
            '</div>';

          // Up
          card.querySelector('.pm-move-up').addEventListener('click', function () {
            if (idx > 0) {
              const temp = selectedFiles[idx];
              selectedFiles[idx] = selectedFiles[idx - 1];
              selectedFiles[idx - 1] = temp;
              renderFileList();
            }
          });

          // Down
          card.querySelector('.pm-move-down').addEventListener('click', function () {
            if (idx < selectedFiles.length - 1) {
              const temp = selectedFiles[idx];
              selectedFiles[idx] = selectedFiles[idx + 1];
              selectedFiles[idx + 1] = temp;
              renderFileList();
            }
          });

          // Remove
          card.querySelector('.pm-act-del').addEventListener('click', function () {
            selectedFiles.splice(idx, 1);
            renderFileList();
          });

          fileListEl.appendChild(card);
        });

        // Summary text
        let summaryMsg = selectedFiles.length + ' ملفات مختارة (' + formatBytes(totalBytes);
        if (totalPages > 0) summaryMsg += ' • حوالي ' + totalPages + ' صفحة';
        summaryMsg += ')';
        summaryText.innerHTML = '<span>' + summaryMsg + '</span>';
      }

      // Drag and Drop
      dropzone.addEventListener('click', function () {
        fileInput.click();
      });

      ['dragenter', 'dragover'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(function (evt) {
        dropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', function (e) {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          processNewFiles(dt.files);
        }
      });

      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length > 0) {
          processNewFiles(fileInput.files);
          fileInput.value = ''; // Reset for re-selection
        }
      });

      addMoreBtn.addEventListener('click', function () {
        fileInput.click();
      });

      clearAllBtn.addEventListener('click', function () {
        selectedFiles = [];
        renderFileList();
        successBox.style.display = 'none';
        showStatus('', false);
      });

      resetBtn.addEventListener('click', function () {
        selectedFiles = [];
        renderFileList();
        successBox.style.display = 'none';
        showStatus('', false);
      });

      // Merge PDFs logic
      mergeBtn.addEventListener('click', function () {
        if (selectedFiles.length < 2) {
          showStatus('يرجى اختيار ملفين PDF على الأقل للدمج.', true);
          return;
        }

        showStatus('', false);
        successBox.style.display = 'none';
        progressBox.style.display = 'flex';
        mergeBtn.disabled = true;
        mergeBtn.style.opacity = '0.5';

        ensurePdfLib(async function (err) {
          if (err || !window.PDFLib) {
            progressBox.style.display = 'none';
            mergeBtn.disabled = false;
            mergeBtn.style.opacity = '1';
            showStatus('تعذر تحميل مكتبة معالجة الـ PDF. يرجى التحقق من اتصالك بالإنترنت.', true);
            return;
          }

          try {
            const { PDFDocument } = window.PDFLib;
            const mergedPdf = await PDFDocument.create();
            const totalCount = selectedFiles.length;

            for (let i = 0; i < totalCount; i++) {
              const item = selectedFiles[i];
              const pct = Math.round(((i + 0.5) / totalCount) * 100);
              progressText.textContent = 'جاري دمج ملف (' + (i + 1) + ' من ' + totalCount + '): ' + item.file.name;
              progressPct.textContent = pct + '%';
              progressBar.style.width = pct + '%';

              const arrayBuffer = await item.file.arrayBuffer();
              let pdfDoc;
              try {
                pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
              } catch (loadErr) {
                throw new Error('الملف "' + item.file.name + '" محمي بكلمة مرور أو تالف. يرجى إزالته أولاً.');
              }

              const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
              copiedPages.forEach(function (page) {
                mergedPdf.addPage(page);
              });
            }

            progressText.textContent = 'جاري حفظ وضغط الملف المدمج...';
            progressPct.textContent = '95%';
            progressBar.style.width = '95%';

            const mergedPdfBytes = await mergedPdf.save();
            const finalBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

            if (mergedBlobUrl) {
              URL.revokeObjectURL(mergedBlobUrl);
            }
            mergedBlobUrl = URL.createObjectURL(finalBlob);

            let outName = (outputNameInput.value || '').trim() || 'Shaher_TECH_Merged.pdf';
            if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

            downloadLink.href = mergedBlobUrl;
            downloadLink.download = outName;
            previewLink.href = mergedBlobUrl;

            const finalPages = mergedPdf.getPageCount();
            successDetails.textContent = 'تم دمج ' + totalCount + ' ملفات بنجاح • إجمالي الصفحات: ' + finalPages + ' صفحة • حجم الملف: ' + formatBytes(finalBlob.size);

            progressBar.style.width = '100%';
            progressPct.textContent = '100%';

            setTimeout(function () {
              progressBox.style.display = 'none';
              successBox.style.display = 'flex';
              mergeBtn.disabled = false;
              mergeBtn.style.opacity = '1';
              if (typeof successBox.scrollIntoView === 'function') {
                successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 400);

          } catch (mergeErr) {
            progressBox.style.display = 'none';
            mergeBtn.disabled = false;
            mergeBtn.style.opacity = '1';
            showStatus(String(mergeErr && mergeErr.message || mergeErr), true);
          }
        });
      });

      // Pre-load pdf-lib silently in background so user doesn't wait
      ensurePdfLib(function () { });
    }
  }

};



