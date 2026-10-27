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
      .pct-out { margin-top:12px; padding:14px; border-radius:var(--radius); background:linear-gradient(135deg, rgba(200,149,46,0.16), rgba(200,149,46,0.05)); border:1px solid rgba(200,149,46,0.35); font-weight:700; font-size:17px; display:none; }
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

/* Batch image resize. Local canvas processing and uncompressed ZIP output. */
toolsDB.batchResizeTool = {
 emoji:'📐', title:'تغيير مقاس الصور دفعة واحدة (Batch Image Resize)', slug:'resize-images',aliases:['batch-resize','10'],category:'Image',
 desc:'غيّر أبعاد عدة صور مرة واحدة للمواقع والمتاجر: احتواء بدون قص، أو مقاس ثابت بخلفية أو قص من المنتصف، وحمّل النتائج في ZIP من متصفحك.',
 html:`<style>.br-wrap{direction:rtl}.br-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.br-wrap label{display:block;margin:10px 0 5px}.br-preview{width:100%;height:140px;object-fit:contain;background:repeating-conic-gradient(#222 0% 25%,#333 0% 50%) 50% / 18px 18px;border-radius:12px}.br-card{padding:12px;border:1px solid var(--border);border-radius:14px;min-width:0}.br-card p{overflow-wrap:anywhere;margin:6px 0}.br-card a{display:inline-block;color:var(--gold-bright);padding:10px}.br-note{font-size:14px;line-height:1.9;color:var(--beige-muted)}.br-actions{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.br-actions button{padding:13px;border:1px solid var(--border);border-radius:12px;background:rgba(200,149,46,.16);color:var(--gold-bright);cursor:pointer}.br-actions button:disabled{opacity:.45;cursor:default}#br-status{white-space:pre-line;overflow-wrap:anywhere}@media(max-width:540px){.br-grid{grid-template-columns:1fr}}</style>
 <div class="br-wrap"><p class="br-note">صور منتجات بمقاس موحّد أو مجموعة صور كبيرة؟ اختارها مرة واحدة وحدد المقاس، بدل ما تعدّل كل صورة لوحدها. الصور لا تُرفع إلى خادم.</p>
 <label for="br-files">صور JPG أو PNG أو WebP (حتى ٢٠ صورة)</label><input id="br-files" type="file" multiple accept="image/jpeg,image/png,image/webp" class="form-control">
 <div class="br-grid"><div><label for="br-width">العرض بالبكسل</label><input id="br-width" type="number" class="form-control" min="32" max="4096" value="1200" dir="ltr"></div><div><label for="br-height">الارتفاع بالبكسل</label><input id="br-height" type="number" class="form-control" min="32" max="4096" value="1200" dir="ltr"></div></div>
 <label for="br-fit">طريقة ضبط المقاس</label><select id="br-fit" class="form-control"><option value="fit">احتواء داخل الحدود - بدون قص أو تمديد</option><option value="pad">مقاس ثابت - خلفية بيضاء بدون قص</option><option value="crop">مقاس ثابت - قص من المنتصف</option></select>
 <label for="br-format">صيغة الناتج</label><select id="br-format" class="form-control"><option value="image/jpeg">JPG - خلفية بيضاء</option><option value="image/png">PNG - يحفظ الشفافية في وضع الاحتواء أو القص</option><option value="image/webp">WebP - يحفظ الشفافية في وضع الاحتواء أو القص</option></select>
 <label><input id="br-upscale" type="checkbox"> اسمح بتكبير الصور الصغيرة (لا يضيف تفاصيل جديدة)</label>
 <p class="br-note">افتراضيًا لا نكبّر الصورة: لو كان المقاس الثابت المطلوب أكبر من الأصل، تُترك هوامش بدل شد الصورة. القص قد يزيل أجزاء عند الأطراف. تغيير الأبعاد لا يضمن ملفًا أصغر أو جودة أفضل. يتم تصدير صورة جديدة وقد تُحذف بيانات الكاميرا والموقع. الحد ٢٠ ميجا للصورة و١٠٠ ميجا للمجموعة؛ HEIC غير مدعومة، والصورة المتحركة تُصدّر كلقطة ثابتة فقط.</p>
 <div class="br-actions"><button id="br-start" type="button">تغيير المقاس ومعاينة النتائج</button><button id="br-zip" type="button" disabled>تحميل كل الصور ZIP</button><button id="br-clear" type="button">مسح الصور والنتائج</button></div>
 <p id="br-status" role="status" aria-live="polite"></p><div id="br-results" class="br-grid"></div>
 <div class="tool-info"><h3>إزاي تستخدمها؟</h3><ol><li>اختار مجموعة صور، وحدد العرض والارتفاع المطلوبين.</li><li>اختار احتواء لو مش عاوز قص، أو خلفية بيضاء لمقاس ثابت، أو قص مركزي لو الأطراف مش مهمة.</li><li>راجع المقاس والمعاينة لكل صورة، ثم حمّلها منفردة أو في ملف ZIP.</li></ol><details><summary>هل الاحتواء يطلع نفس المقاس بالضبط؟</summary><p>لا، هو حد أقصى للطول والعرض مع الحفاظ على النسبة. للمقاس الثابت اختار الخلفية البيضاء أو القص.</p></details><details><summary>هل الصور بتترفع؟</summary><p>المعالجة والتجميع داخل متصفحك. لا نرسل ملفات الصور إلى أي خادم.</p></details></div></div>`,
 init:function(){
 const $=id=>document.getElementById('br-'+id), input=$('files'),results=$('results'),status=$('status');let files=[],out=[],busy=false,urls=[];
 function reset(){urls.forEach(URL.revokeObjectURL);urls=[];out=[];results.replaceChildren();$('zip').disabled=true;}
 input.addEventListener('change',()=>{reset();files=Array.from(input.files||[]);status.textContent=files.length?'تم اختيار '+files.length+' صورة. حدد المقاس ثم ابدأ.':'';});
 $('clear').onclick=()=>{if(busy)return;reset();files=[];input.value='';status.textContent='تم مسح الصور والنتائج.';};
 function num(id){const s=$(id).value.trim();return /^\d+$/.test(s)?Number(s):NaN;}
 function crc32(a){let c=0xffffffff;for(const b of a){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 function zip(entries){const pieces=[],central=[];let offset=0,cs=0;const enc=new TextEncoder();for(const e of entries){const name=enc.encode(e.name),data=e.bytes,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);pieces.push(h,data);const c=new Uint8Array(46+name.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);c.set(name,46);central.push(c);cs+=c.length;offset+=h.length+data.length;}const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,cs,true);v.setUint32(16,offset,true);return new Blob([...pieces,...central,end],{type:'application/zip'});}
 $('start').onclick=async()=>{if(busy)return;const w=num('width'),h=num('height');if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w>4096||h>4096){status.textContent='اكتب عرض وارتفاع صحيحين بين 32 و4096 بكسل.';return;}if(!files.length||files.length>20||files.reduce((n,f)=>n+f.size,0)>100*1024*1024){status.textContent='اختار من صورة إلى ٢٠ صورة، بإجمالي لا يزيد عن ١٠٠ ميجا.';return;}
 reset();busy=true;const settings=['files','width','height','fit','format','upscale','start','clear'];settings.forEach(id=>$(id).disabled=true);const mode=$('fit').value,mime=$('format').value,up=$('upscale').checked;let errors=0;
 try{for(let i=0;i<files.length;i++){const f=files[i];status.textContent='جاري معالجة '+(i+1)+' من '+files.length;let src,im;try{
 if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>20*1024*1024)throw Error('صيغة غير مدعومة أو أكبر من ٢٠ ميجا');
 src=URL.createObjectURL(f);im=new Image();im.src=src;try{await im.decode();}catch(_){throw Error('تعذرت قراءة الصورة؛ تأكد أن الملف سليم وبصيغة مدعومة');}const iw=im.naturalWidth,ih=im.naturalHeight;if(!iw||!ih||iw*ih>40000000)throw Error('الصورة غير قابلة للقراءة أو تتجاوز ٤٠ مليون بكسل');
 let scale=mode==='crop'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);if(!up)scale=Math.min(1,scale);const dw=Math.max(1,Math.round(iw*scale)),dh=Math.max(1,Math.round(ih*scale));const cw=mode==='fit'?dw:w,ch=mode==='fit'?dh:h;const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d');if(mime==='image/jpeg'||mode==='pad'){ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);}ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(im,Math.round((cw-dw)/2),Math.round((ch-dh)/2),dw,dh);
 const blob=await new Promise(r=>canvas.toBlob(r,mime,.9));if(!blob||blob.type!==mime)throw Error('المتصفح لا يدعم تصدير الصيغة المختارة');const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime],stem=f.name.replace(/\.[^.]*$/,'').replace(/[^a-zA-Z0-9\u0600-\u06ff_-]/g,'_').slice(0,70)||'image',name=String(i+1).padStart(2,'0')+'_'+stem+'_'+cw+'x'+ch+'.'+ext;out.push({name,bytes:new Uint8Array(await blob.arrayBuffer())});const u=URL.createObjectURL(blob);urls.push(u);const card=document.createElement('div');card.className='br-card';const img=document.createElement('img');img.className='br-preview';img.src=u;img.alt='معاينة '+f.name;const label=document.createElement('p');label.textContent=f.name;const meta=document.createElement('p');meta.dir='ltr';meta.textContent=iw+'×'+ih+' → '+cw+'×'+ch+' | '+(blob.size/1024).toFixed(1)+' KB';const a=document.createElement('a');a.href=u;a.download=name;a.textContent='تحميل الصورة';card.append(img,label,meta,a);results.append(card);canvas.width=canvas.height=1;
 }catch(e){errors++;const p=document.createElement('p');p.className='state-error';p.textContent=f.name+': '+(e.message||'تعذرت المعالجة');results.append(p);}finally{if(src)URL.revokeObjectURL(src);if(im)im.src='';}await new Promise(r=>setTimeout(r,0));}
 status.textContent='جاهز: '+out.length+' صورة. '+(errors?'تعذر تجهيز '+errors+' صورة؛ راجع السبب بجانبها.':'راجع المعاينات قبل التحميل.');$('zip').disabled=!out.length;
 }finally{busy=false;settings.forEach(id=>$(id).disabled=false);}};
 $('zip').onclick=()=>{if(!out.length||busy)return;const b=zip(out),u=URL.createObjectURL(b);urls.push(u);const a=document.createElement('a');a.href=u;a.download='shaher-tech-resized-images.zip';a.click();};
 }
};
