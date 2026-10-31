/* ==========================================================================
   Shaher Tech Tools — backend
   Express server that serves the static portal and proxies AI-heavy tools
   to Atria so API keys never reach the browser.
   Frontend contract:  POST /api/atria  { prompt, system?, maxTokens? }
   ========================================================================== */
'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// ---- static portal ------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders: function (res, filePath) {
    if (/\.js$/.test(filePath)) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
}));
// ---- Atria proxy --------------------------------------------------------
const ATRIA_URL = process.env.ATRIA_API_URL || 'https://api.atralabs.dev/v1/chat/completions';
const ATRIA_KEY = process.env.ATRIA_API_KEY;
const ATRIA_MODEL = process.env.ATRIA_MODEL || 'atria-default';

app.post('/api/atria', async function (req, res) {
  const { prompt, system, maxTokens } = req.body || {};

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing "prompt" in request body.' });
  }
  if (!ATRIA_KEY) {
    return res.status(503).json({
      error: 'Atria is not configured on the server. Set ATRIA_API_KEY in .env and restart.'
    });
  }

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt.slice(0, 24000) }); // hard cap

  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 55000);

  try {
    const upstream = await fetch(ATRIA_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ATRIA_KEY
      },
      body: JSON.stringify({
        model: ATRIA_MODEL,
        messages: messages,
        max_tokens: Math.min(4000, maxTokens || 1200),
        temperature: 0.7
      })
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const errText = await upstream.text().catch(function () { return 'upstream error'; });
      return res.status(502).json({ error: 'Atria API error: ' + upstream.status, detail: errText.slice(0, 600) });
    }

    const data = await upstream.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    return res.json({ text: content, usage: data.usage || null });

  } catch (err) {
    clearTimeout(timeout);
    const aborted = err && err.name === 'AbortError';
    return res.status(aborted ? 504 : 500).json({
      error: aborted ? 'Atria request timed out (55s).' : 'Atria request failed.',
      detail: String(err && err.message || err)
    });
  }
});

// ---- health -------------------------------------------------------------
app.get('/api/health', function (req, res) {
  res.json({
    ok: true,
    atriaConfigured: Boolean(ATRIA_KEY),
    uptime: process.uptime(),
    toolsBackend: 'v1'
  });
});


// ---- per-route SEO meta --------------------------------------------------
// Serves tool routes with title/description/canonical/OG already set in the
// RAW HTML (mirrors the client-side updateMeta in public/index.html), so
// crawlers and link previews get per-tool metadata without executing JS.
// When adding a tool: add it here AND to toolsDB AND TOOL_ROUTES AND sitemap.
const SITE_ORIGIN = 'https://shaher-tech.vercel.app';
const ROUTE_META = {
  'video-story': { title: "تجهيز الفيديو للستوري والريلز 9:16", desc: "حوّل أي فيديو لمقاس الستوري والريلز الرأسي 9:16 بخلفية ضبابية من غير حواف سودا، مع الاحتفاظ بالصوت. مجانًا من متصفحك من غير رفع الملف ولا تسجيل." },
  'frames-to-video': { title: "تحويل الصور لفيديو", desc: "حوّل صور مترقمة بالترتيب أو ملف ZIP صور لفيديو MP4 واحد بسرعة فريمات تختارها. مجانًا من متصفحك من غير رفع الملفات ولا تسجيل." },
  'video-frames': { title: "تحويل الفيديو لصور", desc: "استخرج كل فريم من الفيديو كصورة مرقّمة بالترتيب، وحمّلها ZIP. مجانًا من متصفحك من غير رفع الملف ولا تسجيل." },
  'video-trim': { title: "قص الفيديو أونلاين", desc: "قصّ الجزء اللي محتاجه من الفيديو بدقة بالثانية، وحمّله MP4 جاهز للمشاركة. مجانًا من متصفحك من غير رفع الملف ولا تسجيل." },
  'video-audio': { title: "استخراج الصوت من الفيديو وكتم الفيديو أونلاين", desc: "استخرج صوت الفيديو في ملف مستقل أو احفظ نسخة صامتة من غير إعادة ضغط. أداة مجانية تعمل داخل متصفحك بدون رفع الملف، مع دعم MP4 وMOV وWebM حسب الترميز." },
  'combine-images': { title: "دمج الصور في صورة واحدة أونلاين", desc: "اجمع عدة صور أو لقطات شاشة في صورة واحدة طويلة أو جنب بعض. رتّب الصور واحذف الزائد وحمّل PNG أو JPG مجانًا من المتصفح بدون رفع الصور." },
  'pdf-to-text': { title: "استخراج النص من PDF مجانًا", desc: "استخرج النص العربي والإنجليزي من PDF كامل أو صفحات محددة، وانسخه أو حمّله TXT مجانًا داخل المتصفح بدون رفع الملف. للملفات النصية وليس صور السكانر." },
  'audio-cutter': { title: 'قص الصوت أونلاين - MP3 وWAV', desc: 'قص جزء من تسجيل أو أغنية، اسمع المقطع وحمّله MP3 أو WAV مجانًا من المتصفح بدون رفع الملف.' },
  'remove-background': { title: 'إزالة خلفية الصور مجانًا', desc: 'احذف خلفية صورة تلقائيًا على جهازك، وصحّح الحواف بفرشاة، وحمّل PNG شفافة أو JPG بخلفية بيضاء مجانًا بدون حساب.' },
  'pdf-to-images': { title: 'تحويل PDF إلى صور JPG وPNG', desc: 'حوّل صفحات PDF إلى صور JPG أو PNG، وحدد الصفحات المطلوبة وحمّل الصور منفردة أو في ZIP مجانًا من متصفحك بدون رفع الملف.' },
  'pdf-pages': { title: 'اختيار وحذف صفحات PDF', desc: 'محتاج صفحتين بس من ملف كبير؟ اختار الصفحات اللي هتحتفظ بيها أو اللي هتحذفها، وحمّل نسخة PDF جديدة من متصفحك بدون رفع الملف.' },
  'resize-images': { title: 'تغيير مقاس الصور دفعة واحدة (Batch Image Resize)', desc: 'غيّر أبعاد عدة صور مرة واحدة للمواقع والمتاجر: احتواء بدون قص، أو مقاس ثابت بخلفية أو قص من المنتصف، وحمّل النتائج في ZIP من متصفحك.' },
  'whatsapp': { title: 'رابط واتساب مباشر (WhatsApp Direct Link)', desc: 'افتح محادثة واتساب مع أي رقم بدون ما تحفظه في جهات اتصالك — اكتب الرقم وابدأ الشات فوراً.' },
  'prompt': { title: 'Multi-AI Prompt Architect', desc: 'حوّل فكرتك البسيطة إلى برومبت احترافي جاهز للنسخ إلى ChatGPT أو Gemini أو Claude.' },
  'qeteya': { title: 'مُقسم الفواتير الذكي', desc: 'احسب نصيب كل فرد في فاتورة الأكل أو القهوة، وولد رسالة واتساب شيك بإنستاباي وفودافون كاش فوراً.' },
  'pdf': { title: 'دمج ملفات الـ PDF', desc: 'اجمع ورتب عدة ملفات PDF في ملف واحد بضغطة زر وبخصوصية 100% بدون رفعها لأي سيرفر.' },
  'compress': { title: 'مُصغر الصور الذكي (Image Compressor)', desc: 'حل مشكلة "حجم الملف كبير جداً": قلل حجم أي صورة لأقل من 2MB أو الحجم المطلوب بضغطة زر مع الحفاظ على أعلى جودة وخصوصية 100%.' },
  'video-compress': { title: 'مصغّر الفيديو (Video Compressor)', desc: 'قلّل حجم الفيديو من متصفحك مباشرة — بدون رفع لأي سيرفر. اختر الحجم المستهدف أو وضع الجودة العالية.' },
  'images-to-pdf': { title: 'تحويل الصور إلى ملف PDF (Images to PDF)', desc: 'حوّل صور الأوراق والمستندات لملف PDF واحد جاهز للإرسال — رتّب واحذف بضغطة، وكل المعالجة في متصفحك بدون رفع لأي سيرفر.' },
  'qr': { title: 'إنشاء رمز QR (QR Code)', desc: 'حوّل أي لينك أو نص لرمز QR واضح جاهز للتحميل والمشاركة — بضغطة واحدة، وبدون رفع أي حاجة لأي سيرفر.' },
  'percentage': { title: 'حاسبة النسبة والخصم (Percentage Calculator)', desc: 'احسب قيمة أي نسبة من رقم، أو نسبة رقم من رقم، أو سعر منتج بعد الخصم — بضغطة واحدة ومن غير أي حسابات.' }
};
const ALIAS_TO_SLUG = {
  'story-video': 'video-story', 'reels-video': 'video-story', 'video-9-16': 'video-story', '21': 'video-story',
  'images-to-video': 'frames-to-video', 'photos-to-video': 'frames-to-video', '20': 'frames-to-video',
  'video-to-images': 'video-frames', 'extract-frames': 'video-frames', '19': 'video-frames',
  'trim-video': 'video-trim', 'cut-video': 'video-trim', '18': 'video-trim',
  'extract-audio': 'video-audio', 'mute-video': 'video-audio', '17': 'video-audio',
  'join-images': 'combine-images', '16': 'combine-images',
  'extract-pdf-text': 'pdf-to-text', '15': 'pdf-to-text',
  'trim-audio': 'audio-cutter', 'mp3-cutter': 'audio-cutter', '14': 'audio-cutter',
  'background-remover': 'remove-background', 'remove-bg': 'remove-background', '13': 'remove-background',
  'pdf-to-jpg': 'pdf-to-images', 'pdf-to-png': 'pdf-to-images', '12': 'pdf-to-images',
  'extract-pdf': 'pdf-pages', 'remove-pdf-pages': 'pdf-pages', '11': 'pdf-pages',
  'batch-resize': 'resize-images', '10': 'resize-images',
  'wa': 'whatsapp', '1': 'whatsapp',
  'prompts': 'prompt', 'ai': 'prompt', '2': 'prompt',
  'split': 'qeteya', 'bill': 'qeteya', 'hesab': 'qeteya', 'qsmha': 'qeteya', '3': 'qeteya',
  'merge': 'pdf', 'pdfmerge': 'pdf', 'pdf-merge': 'pdf', '4': 'pdf',
  'image': 'compress', 'img': 'compress', 'resize': 'compress',
  'video': 'video-compress', 'vcomp': 'video-compress', 'compress-video': 'video-compress', 'mp4': 'video-compress',
  'img2pdf': 'images-to-pdf', 'topdf': 'images-to-pdf', 'scan': 'images-to-pdf', '7': 'images-to-pdf',
  'qrcode': 'qr', 'barcode': 'qr', '8': 'qr',
  'percent': 'percentage', 'nesba': 'percentage', 'khasm': 'percentage', 'discount': 'percentage', '9': 'percentage'
};
let INDEX_HTML_CACHE = null;
function escapeHtmlAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function setTagAttr(html, id, attr, val) {
  const re = new RegExp('(<(?:meta|link)\\b[^>]*id="' + id + '"[^>]*\\b' + attr + '=")[^"]*(")');
  return html.replace(re, function (m, p1, p2) { return p1 + val + p2; });
}
function servedIndexHtml(slug) {
  if (!INDEX_HTML_CACHE) {
    try {
      INDEX_HTML_CACHE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    } catch (e) {
      return null;
    }
  }
  const meta = slug ? ROUTE_META[slug] : null;
  if (!meta) return INDEX_HTML_CACHE;
  const title = escapeHtmlAttr(meta.title + ' — Shaher Tech | شاهر تك');
  const desc = escapeHtmlAttr(meta.desc);
  const url = SITE_ORIGIN + '/' + slug;
  let html = INDEX_HTML_CACHE;
  html = html.replace(/<title>[\s\S]*?<\/title>/, function () { return '<title>' + title + '</title>'; });
  html = setTagAttr(html, 'meta-description', 'content', desc);
  html = setTagAttr(html, 'meta-og-title', 'content', title);
  html = setTagAttr(html, 'meta-og-description', 'content', desc);
  html = setTagAttr(html, 'meta-og-url', 'content', url);
  html = setTagAttr(html, 'meta-canonical', 'href', url);
  // Per-tool JSON-LD so each tool page identifies its own entity to crawlers
  // (the homepage WebSite/ItemList graph stays as-is on every route).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': meta.title,
    'description': meta.desc,
    'url': url,
    'inLanguage': 'ar',
    'applicationCategory': 'UtilitiesApplication',
    'operatingSystem': 'Any',
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
    'isPartOf': { '@type': 'WebSite', 'name': 'Shaher Tech', 'alternateName': 'شاهر تك', 'url': SITE_ORIGIN + '/' }
  };
  // Initial tool content is present without waiting for JavaScript rendering.
  const initialTool = require('./tool-prerender.json')[slug];
  if (initialTool) {
    html = html.replace(/<section aria-label="Active tool"[\s\S]*?<\/section>/, function () { return initialTool.html; });
    html = html.replace('<body>', '<body class="tool-open">');
  }
  const jsonLdTag = '<script type="application/ld+json">' + JSON.stringify(jsonLd).replace(/<\//g, '<\\/') + '</' + 'script>';
  html = html.replace('</head>', '  ' + jsonLdTag + '\n</head>');
  return html;
}

// ---- SPA fallback -------------------------------------------------------
// Known client-side tool routes (slugs + aliases from public/tools.js).
// Unknown paths must return a REAL 404, not the SPA (soft-404 harms SEO).
const TOOL_ROUTES = new Set([
  'video-story', 'story-video', 'reels-video', 'video-9-16', '21',
  'frames-to-video', 'images-to-video', 'photos-to-video', '20',
  'video-frames', 'video-to-images', 'extract-frames', '19',
  'video-trim', 'trim-video', 'cut-video', '18',
  'video-audio', 'extract-audio', 'mute-video', '17',
  'combine-images', 'join-images', '16',
  'pdf-to-text', 'extract-pdf-text', '15',
  'audio-cutter', 'trim-audio', 'mp3-cutter', '14',
  'remove-background', 'background-remover', 'remove-bg', '13',
  'pdf-to-images', 'pdf-to-jpg', 'pdf-to-png', '12',
  'pdf-pages', 'extract-pdf', 'remove-pdf-pages', '11',
  'resize-images', 'batch-resize', '10',
  'whatsapp', 'wa', '1',
  'prompt', 'prompts', 'ai', '2',
  'qeteya', 'split', 'bill', 'hesab', 'qsmha', '3',
  'pdf', 'merge', 'pdfmerge', 'pdf-merge', '4',
  'compress', 'image', 'img', 'resize',
  'video-compress', 'video', 'vcomp', 'compress-video', 'mp4',
  'images-to-pdf', 'img2pdf', 'topdf', 'scan', '7',
  'qr', 'qrcode', 'barcode', '8',
  'percentage', 'percent', 'nesba', 'khasm', 'discount', '9'
]);
app.get('*', function (req, res) {
  const publicCandidate = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
    return res.sendFile(publicCandidate);
  }
  const seg = req.path.replace(/^\/+|\/+$/g, '');
  if (seg === '' || TOOL_ROUTES.has(seg)) {
    const slug = seg === '' ? null : (ROUTE_META[seg] ? seg : (ALIAS_TO_SLUG[seg] || null));
    const injected = servedIndexHtml(slug);
    if (injected) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(injected);
    }
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(publicIndex)) {
      return res.sendFile(publicIndex);
    }
    return res.status(404).send('Page not found');
  }
  res.status(404).send('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>404 — الصفحة مش موجودة | Shaher Tech</title></head><body style="font-family:sans-serif;background:#0a0b0b;color:#e8e6e3;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center"><div><h1>404</h1><p>الصفحة دي مش موجودة.</p><p><a href="/" style="color:#d4af37">ارجع لكل الأدوات</a></p></div></body></html>');
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, function () {
    console.log('Shaher Tech Tools running at http://localhost:' + PORT);
    console.log('Atria proxy ' + (ATRIA_KEY ? 'CONFIGURED' : 'NOT configured (set ATRIA_API_KEY in .env)'));
  });
}

module.exports = app;
