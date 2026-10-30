import {Input,BlobSource,ALL_FORMATS,CanvasSink} from './mediabunny.min.mjs';
function crc32(a){let c=0xffffffff;for(const b of a){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function makeZip(entries){const pieces=[],central=[];let offset=0,cs=0;const enc=new TextEncoder();for(const e of entries){const name=enc.encode(e.name),data=e.bytes,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);pieces.push(h,data);const c=new Uint8Array(46+name.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);c.set(name,46);central.push(c);cs+=c.length;offset+=h.length+data.length;}const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,cs,true);v.setUint32(16,offset,true);return new Blob([...pieces,...central,end],{type:'application/zip'});}
const PART_BYTES=120*1048576,PART_FRAMES=2000;
self.onmessage=async({data:d})=>{let input;try{
input=new Input({source:new BlobSource(d.file),formats:ALL_FORMATS});
const video=await input.getPrimaryVideoTrack();
if(!video)throw Error('video');
const duration=await input.computeDuration();
if(!Number.isFinite(duration)||duration<=0||duration>1800)throw Error('duration');
const decodable=await video.canDecode().catch(()=>false);
if(!decodable)throw Error('codec');
if(d.mode==='inspect'){
 let est=0,rate=0;
 try{const stats=await video.computePacketStats(100);est=stats.packetCount||0;rate=stats.averagePacketRate||0;}catch(_){}
 if(!est&&rate>0)est=Math.round(rate*duration);
 self.postMessage({meta:{duration,decodable:true,width:video.codedWidth||0,height:video.codedHeight||0,frames:est,fps:rate}});
 return;
}
const format=d.format==='png'?'image/png':'image/jpeg';
const ext=d.format==='png'?'png':'jpg';
const quality=d.format==='png'?undefined:0.85;
let entries=[],entryBytes=0,total=0,part=0,firstInPart=1;
const sinkFor=new CanvasSink(video);
for await (const wc of sinkFor.canvases()){
 const w=wc.canvas.width,h=wc.canvas.height;
 const c=new OffscreenCanvas(w,h);
 const ctx=c.getContext('2d');
 ctx.drawImage(wc.canvas,0,0);
 wc.close&&wc.close();
 const blob=await c.convertToBlob({type:format,quality});
 const buf=new Uint8Array(await blob.arrayBuffer());
 entries.push({name:'frame-'+String(total+1).padStart(5,'0')+'.'+ext,bytes:buf});
 entryBytes+=buf.length;total++;
 if(total%25===0)self.postMessage({progress:{done:total}});
 if(entryBytes>=PART_BYTES||entries.length>=PART_FRAMES){
  part++;
  self.postMessage({part,blob:makeZip(entries),first:firstInPart,last:total,count:entries.length});
  entries=[];entryBytes=0;firstInPart=total+1;
  await new Promise(r=>setTimeout(r,0));
 }
}
if(entries.length){part++;self.postMessage({part,blob:makeZip(entries),first:firstInPart,last:total,count:entries.length});}
if(!total)throw Error('empty');
self.postMessage({done:true,total,parts:part});
}catch(e){self.postMessage({error:['video','duration','codec','empty'].includes(e.message)?e.message:'invalid'})}finally{try{input?.dispose()}catch(_){}}};
