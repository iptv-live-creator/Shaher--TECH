# شاهر إسماعيل | TECH — Shaher Tech Tools
> **بورتال أدوات تقنية سريعة وعملية بهوية سينمائية دافئة وملموسة.**

---

## 🎯 1. دليل التسليم للمساعد القادم (Hermes Handoff Guide)

مرحباً **Hermes**! هذا الدليل مفصّل لك بالكامل حتى تتولى قيادة وتطوير المشروع بسلاسة واحترافية بدون كسر أي جزء من الهوية البصرية أو البنية البرمجية.

---

## 🏛️ 2. الهيكلية المعمارية للمشروع (Architecture & File Tree)

```text
Shaher--TECH/
├── public/                 # ⭐️ المجلد الأساسي لـ Vercel (الملفات الثابتة العامة)
│   ├── index.html          # الهيكل الرئيسي للبورتال والمحرك البرمجي لعرض الأدوات
│   ├── style.css           # نظام التصميم والهوية البصرية السينمائية الكاملة
│   └── tools.js            # سجل الأدوات البرمجية (toolsDB)
├── api/
│   └── index.js            # مدخل الـ Serverless Function على Vercel لربط Express
├── server.js               # سيرفر Express المحلي + معالجة الـ AI عبر Atria
├── vercel.json             # ملف إعدادات التوجيه والنشر على منصة Vercel
├── package.json            # الاعتماديات (Express, dotenv, jsdom)
├── .gitignore              # حظر node_modules و .env من الرفع
└── README.md               # دليل التشغيل والتسليم
```

> ⚠️ **ملاحظة ذهبية لـ Hermes:**
> عند تعديل أي ملف فرونت إند (`index.html` أو `style.css` أو `tools.js`)، تأكد دائماً أن النسخة المحدّثة موجودة داخل مجلد **`public/`**، لأن منصة Vercel تخدم زوار الموقع مباشرة من مجلد `public`.

---

## 🎨 3. الهوية البصرية ونظام التصميم (Visual Identity & Design System)

المشروع مبني على فلسفة سينمائية صارمة تكسر النمط الرقمي المسطح (Anti-Flat Digital) وتحوله إلى **مشهد مادي، دافئ، في استوديو تصوير فوتوغرافي ليلي**.

### 🎨 باليتة الألوان (Color Palette):
* **Dark Teal (`#1a4a42`, `#0d2e28`):** التيل الفخم للأزرار والشرائط.
* **Matte Black (`#0a0b0b`, `#111111`):** الأسود المطفي للأرضية والخلفيات.
* **Olive (`#4a4a30`):** الزيتي الترابي الداكن للتاجات والحدود.
* **Warm Beige (`#d4c5a9`, `#b8a88e`):** البيج الدافئ لجميع النصوص والخامات.
* **Warm Gold / Amber (`#c8952e`, `#e6b84d`):** الإبراز، التوهج، مفاتيح التركيز والأزرار الرئيسية.

### 💡 الإضاءة والتأثيرات (Atmosphere & Lighting):
* **Tungsten Key & Rim Light:** محاكاة إضاءة تنجستن جانبية بـ `radial-gradient` تخلق ظلالاً دافئة.
* **Film Grain:** تأثير حبيبات الفيلم الكلاسيكية بـ SVG noise ناعم.
* **Dust Particles:** ذرات غبار ميكروسكوبية متحركة في مسار الضوء.
* **Bokeh Circles:** دوائر ضبابية ناعمة في العمق لتعزيز العمق الميداني (Depth of Field).
* **Golden Geometric Frame:** إطار ذهبي هندسي دقيق يحيط بكامل الواجهة.
* **3D Keycaps:** جميع أيقونات الأدوات تظهر كمفاتيح كيبورد ميكانيكية بارزة ثلاثية الأبعاد بظلال ملموسة.

### 🔤 الخطوط (Typography):
* **العناوين والشعار:** خط **Changa** (ExtraBold 800) مع تأثير بارز (Embossed) يتفاعل مع الضوء.
* **النصوص العربية:** خط **Cairo** للمقروئية العالية والأناقة.
* **اللغة الإنجليزية:** خط **Inter**.
* **الكود والأرقام:** خط **JetBrains Mono**.

---

## 🛠️ 4. ميثاق إضافة أداة جديدة (The Tool Contract)

كل أداة في البورتال تُسجّل ككائن داخل `toolsDB` في ملف [tools.js](file:///c:/Users/shaher/Desktop/New%20folder%20(2)/tools.js).

### عقد الأداة (Tool Schema):
```javascript
myNewToolId: {
  emoji: '🛠️',           // أيقونة الأداة (تتحول تلقائياً لمفتاح كيبورد 3D Keycap)
  title: 'اسم الأداة',     // عنوان الأداة
  category: 'Utilities',  // التصنيف (Text | Developer | Social Media | Utilities | AI | Image | SEO)
  desc: 'وصف في سطر واحد لوظيفة الأداة',
  html: `
    <!-- واجهة الأداة باستخدام كلاسات التصميم الموحدة -->
    <label class="label-hint">المدخلات</label>
    <textarea id="tool-input" class="form-control" placeholder="اكتب هنا..."></textarea>
    
    <div class="row">
      <button id="tool-run" class="btn-action" type="button">تنفيذ</button>
      <button id="tool-copy" class="btn-ghost" type="button">نسخ</button>
    </div>

    <div id="tool-output" class="result-box mono">النتيجة ستظهر هنا...</div>
  `,
  init: function () {
    // تشغيل وبرمجة الأداة بعد حقن الـ HTML في الصفحة
    const input = document.getElementById('tool-input');
    const run = document.getElementById('tool-run');
    const output = document.getElementById('tool-output');

    run.addEventListener('click', function () {
      // المنطق البرمجي للأداة
    });
  }
}
```

### ⚠️ قواعد إلزامية لـ Hermes عند كتابة الأدوات:
1. **ممنوع تغيير اسم `toolsDB` مطلقاً.**
2. **مضاعفة علامة الـ Backslash في الـ Regular Expressions:** لأن الـ HTML مكتوب داخل Template Literal، يجب كتابة `\\d` و `\\s` و `\\n` بعلامتين `\\`.
3. **الأزرار الخارجية:** إذا كانت الأداة تفتح رابط خارجي (مثل WhatsApp أو مواقع خارجية)، استخدم دائماً وسم الرابط الأصلي `<a class="btn-action" target="_blank" rel="noopener noreferrer">` وتجنب `window.open` لمنع حظر المتصفحات (Popup Blocker).
4. **استخدم الكلاسات الموحدة:**
   * `.form-control`: للحقول والنصوص والقوائم المنسدلة.
   * `.btn-action`: للأزرار الذهبية الأساسية ذات المظهر ثلاثي الأبعاد.
   * `.btn-ghost`: للأزرار الفرعية (نسخ، مسح، إعادة ضبط).
   * `.result-box` و `.result-box.mono`: لعرض النتائج والكود.
   * `.stat-grid` و `.stat`: لبطاقات الإحصائيات والأرقام.
   * `.sticky-note`: لإضافة ورقة ملاحظات صفراء ممزقة كنصيحة أو "سر خفي".
   * `.keycap`: لعرض اختصارات الكيبورد كمفاتيح فيزيائية.
   * `.state-success` و `.state-error`: لرسائل الحالة.

---

## 💻 5. التشغيل المحلي والنشر (Run & Deploy)

### التشغيل محلياً:
```bash
# تثبيت الاعتماديات (أول مرة فقط)
npm install

# تشغيل السيرفر المحلي
npm run dev
# أو: node server.js
```
* الرابط المحلي: `http://localhost:3000`

### النشر والتحديث على Vercel:
المشروع مربوط مباشرة بمستودع GitHub:
1. اعمل أي تعديل في الملفات داخل `public/`.
2. افتح **GitHub Desktop**.
3. اكتب عنوان التعديل واضغط **Commit to main**.
4. اضغط **Push origin**.
5. سيقوم Vercel تلقائياً بإعادة النشر وتحديث الموقع الحي في أقل من 20 ثانية على الدومين الرسمي الدائم.

---
**جاهز للتسليم — رحلة موفقة لـ Hermes! 🚀**
