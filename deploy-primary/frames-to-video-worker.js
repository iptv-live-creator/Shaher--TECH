import {Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,CanvasSource,QUALITY_HIGH,getFirstEncodableVideoCodec} from './mediabunny.min.mjs';
const IMG_RE=/\.(jpe?g|png|webp)$/i, ZIP_RE=/\.zip$/i;
const MAX_IMAGES=20000, MAX_ZIP=500*1048576;
const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
const base=n=>{const i=Math.max(n.lastIndexOf('/'),n.lastIndexOf('\\'));return i>=0?n.slice(i+1):n};
async function zipList(file){
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-66000)).arrayBuffer());
 let eocd=-1;
 for(let i=tail.length-22;i>=0;i--){if(tail[i]===0x50&&tail[i+1]===0x4b&&tail[i+2]===5&&tail[i+3]===6){eocd=i;break}}
 if(eocd<0)throw Error('zip:'+file.name);
 const dv=new DataView(tail.buffer,tail.byteOffset);
 const count=dv.getUint16(eocd+10,true),cdSize=dv.getUint32(eocd+12,true),cdOff=dv.getUint32(eocd+16,true);
 if(count>65535)throw Error('zip:'+file.name);
 const cd=new Uint8Array(await file.slice(cdOff,cdOff+cdSize).arrayBuffer());
 const cv=new DataView(cd.buffer);const dec=new TextDecoder();const out=[];let p=0;
 for(let i=0;i<count;i++){
  if(cv.getUint32(p,true)!==0x02014b50)throw Error('zip:'+file.name);
  const method=cv.getUint16(p+10,true),cs=cv.getUint32(p+20,true),us=cv.getUint32(p+24,true);
  const nl=cv.getUint16(p+28,true),el=cv.getUint16(p+30,true),cl=cv.getUint16(p+32,true);
  const lh=cv.getUint32(p+42,true);
  const name=dec.decode(cd.subarray(p+46,p+46+nl));
  if(!name.endsWith('/')&&!name.startsWith('__MACOSX')&&IMG_RE.test(name))out.push({name,method,cs,us,lh,file});
  p+=46+nl+el+cl;
 }
 return out;
}
async function zipBlob(e){
 const lh=new Uint8Array(await e.file.slice(e.lh,e.lh+30).arrayBuffer());
 const lv=new DataView(lh.buffer);
 if(lv.getUint32(0,true)!==0x04034b50)throw Error('zip:'+e.file.name);
 const nl=lv.getUint16(26,true),el=lv.getUint16(28,true);
 const start=e.lh+30+nl+el;
 const raw=new Uint8Array(await e.file.slice(start,start+e.cs).arrayBuffer());
 let bytes=raw;
 if(e.method===8){
  const ds=new DecompressionStream('deflate-raw');
  const stream=new Blob([raw]).stream().pipeThrough(ds);
  bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 }else if(e.method!==0)throw Error('zipmethod:'+e.file.name);
 const ext=e.name.split('.').pop().toLowerCase();
 return new Blob([bytes],{type:MIME[ext]||'image/jpeg'});
}
function firstGap(items){
 const groups={};
 for(const it of items){const m=base(it.name).match(/^(.*?)(\d+)(\.[a-z0-9]+)$/i);if(!m)continue;const k=m[1]+'|'+m[3]+'|'+(m[2].length);(groups[k]=groups[k]||[]).push(parseInt(m[2],10))}
 let best=null;
 for(const k in groups){const g=[...new Set(groups[k])].sort((a,b)=>a-b);if(g.length<2)continue;
  for(let i=1;i<g.length;i++){if(g[i]>g[i-1]+1){const prefix=k.split('|')[0];if(!best||g.length>best.count)best={from:g[i-1],to:g[i],count:g.length,prefix};break}}}
 return best;
}
async function buildSources(d){
 const files=d.files||[];
 const zips=files.filter(f=>ZIP_RE.test(f.name)),imgs=files.filter(f=>!ZIP_RE.test(f.name)&&(IMG_RE.test(f.name)||/^image\/(jpeg|png|webp)$/.test(f.type)));
 for(const z of zips){if(z.size>MAX_ZIP||z.size===0)throw Error('zipsize:'+z.name)}
 let items=[];
 for(const z of zips)items=items.concat(await zipList(z));
 items=items.concat(imgs.map(f=>({name:f.name,file:f,loose:true})));
 if(!items.length)throw Error('images');
 items.sort((a,b)=>collator.compare(base(a.name),base(b.name)));
 if(items.length>MAX_IMAGES)throw Error('toomany');
 const seen=new Set(),kept=[],dupes=[];
 for(const it of items){const b=base(it.name);if(seen.has(b.toLowerCase())){dupes.push(b);continue}seen.add(b.toLowerCase());kept.push(it)}
 if(!kept.length)throw Error('images');
 const gap=firstGap(kept);
 const label=zips.length&&imgs.length?(zips.length+' ZIP + '+imgs.length+' صورة'):zips.length>1?(zips.length+' ملفات ZIP'):zips.length?zips[0].name:(imgs.length===1?imgs[0].name:imgs.length+' صورة');
 return {count:kept.length,get:i=>kept[i].loose?Promise.resolve(kept[i].file):zipBlob(kept[i]),label,names:kept.map(it=>base(it.name)),dupes,gap,zips:zips.length};
}
self.onmessage=async({data:d})=>{let output;try{
 const src=await buildSources(d);
 const first=await src.get(0);
 const bmp0=await createImageBitmap(first).catch(()=>null);
 if(!bmp0)throw Error('decode:'+src.names[0]);
 let W=bmp0.width,H=bmp0.height;bmp0.close();
 if(W>8192||H>8192||W<2||H<2)throw Error('dims');
 if(W%2)W++;if(H%2)H++;
 const warn={dupes:src.dupes.slice(0,3),dupeCount:src.dupes.length,gap:src.gap};
 if(d.mode==='inspect'){self.postMessage({meta:{count:src.count,width:W,height:H,label:src.label,warn}});return}
 const fps=Math.min(120,Math.max(1,Math.round(d.fps)||30));
 const codec=await getFirstEncodableVideoCodec(['avc','vp9'],{width:W,height:H,bitrate:QUALITY_HIGH});
 if(!codec)throw Error('codec');
 const isAvc=codec==='avc';
 const target=new BufferTarget();
 output=new Output({format:isAvc?new Mp4OutputFormat():new WebMOutputFormat(),target});
 const canvas=new OffscreenCanvas(W,H);
 const ctx=canvas.getContext('2d');
 const source=new CanvasSource(canvas,{codec,bitrate:QUALITY_HIGH});
 output.addVideoTrack(source);
 await output.start();
 for(let i=0;i<src.count;i++){
  const blob=await src.get(i);
  const bmp=await createImageBitmap(blob).catch(()=>null);
  if(!bmp)throw Error('decode:'+src.names[i]);
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const s=Math.min(W/bmp.width,H/bmp.height),dw=bmp.width*s,dh=bmp.height*s;
  ctx.drawImage(bmp,(W-dw)/2,(H-dh)/2,dw,dh);
  bmp.close();
  await source.add(i/fps,1/fps);
  if((i+1)%10===0)self.postMessage({progress:{done:i+1}});
  await new Promise(r=>setTimeout(r,0));
 }
 source.close();
 await output.finalize();
 const blob=new Blob([target.buffer],{type:isAvc?'video/mp4':'video/webm'});
 self.postMessage({done:{blob,ext:isAvc?'mp4':'webm',frames:src.count,fps,width:W,height:H}});
}catch(e){const m=e&&e.message||'';const i=m.indexOf(':');if(i>0){const code=m.slice(0,i),arg=m.slice(i+1);if(['zip','zipmethod','zipsize','decode'].includes(code))self.postMessage({error:code,file:arg});else self.postMessage({error:'invalid'});}else self.postMessage({error:['images','toomany','dims','codec'].includes(m)?m:'invalid'})}};
