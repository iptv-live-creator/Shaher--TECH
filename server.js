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
app.use(express.static(path.join(__dirname), {
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

// ---- SPA fallback -------------------------------------------------------
// Known client-side tool routes (slugs + aliases from public/tools.js).
// Unknown paths must return a REAL 404, not the SPA (soft-404 harms SEO).
const TOOL_ROUTES = new Set([
  'whatsapp', 'wa', '1',
  'prompt', 'prompts', 'ai', '2',
  'qeteya', 'split', 'bill', 'hesab', 'qsmha', '3',
  'pdf', 'merge', 'pdfmerge', 'pdf-merge', '4',
  'compress', 'image', 'img', 'resize',
  'video-compress', 'video', 'vcomp', 'compress-video', 'mp4',
  'images-to-pdf', 'img2pdf', 'topdf', 'scan', '7',
  'qr', 'qrcode', 'barcode', '8'
]);
app.get('*', function (req, res) {
  const publicCandidate = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
    return res.sendFile(publicCandidate);
  }
  const candidate = path.join(__dirname, req.path);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return res.sendFile(candidate);
  }
  const seg = req.path.replace(/^\/+|\/+$/g, '');
  if (seg === '' || TOOL_ROUTES.has(seg)) {
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(publicIndex)) {
      return res.sendFile(publicIndex);
    }
    return res.sendFile(path.join(__dirname, 'index.html'));
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
