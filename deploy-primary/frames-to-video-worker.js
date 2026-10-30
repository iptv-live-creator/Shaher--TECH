import {Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,CanvasSource,QUALITY_HIGH,getFirstEncodableVideoCodec} from './mediabunny.min.mjs';
const IMG_RE=/\.(jpe?g|png|webp)$/i;
const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const MIME={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
async function zipList(file){
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-66000)).arrayBuffer());
 let eocd=-1;
 for(let i=tail.length-22;i>=0;i--){if(tail[i]===0x50&&tail[i+1]===0x4b&&tail[i+2]===5&&tail[i+3]===6){eocd=i;break}}
 if(eocd<0)throw Error('zip');
 const dv=new DataView(tail.buffer,tail.byteOffset);
 const count=dv.getUint16(eocd+10,true),cdSize=dv.getUint32(eocd+12,true),cdOff=dv.getUint32(eocd+16,true);
 if(count>10000)throw Error('toomany');
 const cd=new Uint8Array(await file.slice(cdOff,cdOff+cdSize).arrayBuffer());
 const cv=new DataView(cd.buffer);const dec=new TextDecoder();const out=[];let p=0;
 for(let i=0;i<count;i++){
  if(cv.getUint32(p,true)!==0x02014b50)throw Error('zip');
  const method=cv.getUint16(p+10,true),cs=cv.getUint32(p+20,true),us=cv.getUint32(p+24,true);
  const nl=cv.getUint16(p+28,true),el=cv.getUint16(p+30,true),cl=cv.getUint16(p+32,true);
  const lh=cv.getUint32(p+42,true);
  const name=dec.decode(cd.subarray(p+46,p+46+nl));
  if(!name.endsWith('/')&&!name.startsWith('__MACOSX')&&IMG_RE.test(name))out.push({name,method,cs,us,lh});
  p+=46+nl+el+cl;
 }
 if(!out.length)throw Error('images');
 out.sort((a,b)=>collator.compare(a.name,b.name));
 return out;
}
async function zipBlob(file,e){
 const lh=new Uint8Array(await file.slice(e.lh,e.lh+30).arrayBuffer());
 const lv=new DataView(lh.buffer);
 if(lv.getUint32(0,true)!==0x04034b50)throw Error('zip');
 const nl=lv.getUint16(26,true),el=lv.getUint16(28,true);
 const start=e.lh+30+nl+el;
 const raw=new Uint8Array(await file.slice(start,start+e.cs).arrayBuffer());
 let bytes=raw;
 if(e.method===8){
  const ds=new DecompressionStream('deflate-raw');
  const stream=new Blob([raw]).stream().pipeThrough(ds);
  bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 }else if(e.method!==0)throw Error('zipmethod');
 const ext=e.name.split('.').pop().toLowerCase();
 return new Blob([bytes],{type:MIME[ext]||'image/jpeg'});
}
async function buildSources(d){
 if(d.zip){
  const entries=await zipList(d.file);
  return {count:entries.length,get:i=>zipBlob(d.file,entries[i]),label:d.file.name,names:entries.map(e=>e.name)};
 }
 const files=d.files.filter(f=>IMG_RE.test(f.name)||/^image\//.test(f.type));
 if(!files.length)throw Error('images');
 files.sort((a,b)=>collator.compare(a.name,b.name));
 if(files.length>10000)throw Error('toomany');
 return {count:files.length,get:i=>Promise.resolve(files[i]),label:files.length===1?files[0].name:files.length+' ملف',names:files.map(f=>f.name)};
}
self.onmessage=async({data:d})=>{let output;try{
 const src=await buildSources(d);
 const first=await src.get(0);
 const bmp0=await createImageBitmap(first).catch(()=>null);
 if(!bmp0)throw Error('decode:'+src.names[0]);
 let W=bmp0.width,H=bmp0.height;bmp0.close();
 if(W>8192||H>8192||W<2||H<2)throw Error('dims');
 if(W%2)W++;if(H%2)H++;
 if(d.mode==='inspect'){self.postMessage({meta:{count:src.count,width:W,height:H,label:src.label}});return}
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
}catch(e){const m=e&&e.message||'';if(m.startsWith('decode:'))self.postMessage({error:'decode',file:m.slice(7)});else self.postMessage({error:['zip','zipmethod','images','toomany','dims','codec'].includes(m)?m:'invalid'})}};
