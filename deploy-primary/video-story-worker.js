import {Input,BlobSource,ALL_FORMATS,Output,BufferTarget,Mp4OutputFormat,WebMOutputFormat,CanvasSource,CanvasSink,AudioSampleSink,AudioSampleSource,QUALITY_HIGH,getFirstEncodableVideoCodec,canEncodeAudio} from './mediabunny.min.mjs';
import {registerAacEncoder} from './mediabunny-aac-encoder.min.mjs';
let aacReady=false;
async function ensureAac(){if(aacReady)return true;let ok=await canEncodeAudio('aac').catch(()=>false);if(!ok){try{registerAacEncoder()}catch(e){}ok=await canEncodeAudio('aac').catch(()=>false)}aacReady=ok;return ok}
const MAX_DUR=180;
self.onmessage=async e=>{
 const d=e.data;
 try{
  const input=new Input({source:new BlobSource(d.file),formats:ALL_FORMATS});
  const video=await input.getPrimaryVideoTrack();
  if(!video){self.postMessage({error:'video'});return}
  const duration=await video.computeDuration().catch(()=>0);
  if(!duration||duration>MAX_DUR+0.5){self.postMessage({error:'duration'});return}
  const vdec=await video.canDecode().catch(()=>false);
  const audio=await input.getPrimaryAudioTrack();
  let adec=false;
  if(audio)adec=await audio.canDecode().catch(()=>false);
  const rot=video.rotation||0;
  const iw=video.codedWidth||0,ih=video.codedHeight||0;
  const dw=(rot%180!==0)?ih:iw,dh=(rot%180!==0)?iw:ih;
  if(d.mode==='inspect'){
   self.postMessage({meta:{duration,hasAudio:!!audio,decodable:!!vdec,audioDecodable:!!adec,width:dw,height:dh,rotation:rot}});
   return}
  if(!vdec){self.postMessage({error:'codec'});return}
  // output canvas 9:16
  const A=9/16;
  let H=Math.max(dh,dw/A,480);H=Math.min(H,1920);H=Math.round(H/2)*2;
  let W=Math.round(H*A/2)*2;
  const vcodec=await getFirstEncodableVideoCodec(['avc','vp9'],{width:W,height:H,bitrate:QUALITY_HIGH});
  if(!vcodec){self.postMessage({error:'codec'});return}
  const isAvc=vcodec==='avc';
  let acodec=null;
  if(audio&&adec){
   if(isAvc){if(await ensureAac())acodec='aac'}
   else if(await canEncodeAudio('opus').catch(()=>false))acodec='opus'}
  const target=new BufferTarget();
  const output=new Output({format:isAvc?new Mp4OutputFormat():new WebMOutputFormat(),target});
  const canvas=new OffscreenCanvas(W,H);
  const ctx=canvas.getContext('2d');
  const src=new CanvasSource(canvas,{codec:vcodec,bitrate:QUALITY_HIGH});
  output.addVideoTrack(src);
  let aSrc=null,aIt=null,aNext=null;
  if(acodec){
   aSrc=new AudioSampleSource({codec:acodec,bitrate:128000});
   output.addAudioTrack(aSrc);
   const aSink=new AudioSampleSink(audio);
   aIt=aSink.samples()[Symbol.asyncIterator]();
   aNext=await aIt.next()}
  await output.start();
  const blur=d.bg!=='black';
  const sink=new CanvasSink(video);
  const vIt=sink.canvases()[Symbol.asyncIterator]();
  let vNext=await vIt.next();
  let frames=0;
  while(!vNext.done||(aNext&&!aNext.done)){
   if(aNext&&!aNext.done&&(vNext.done||aNext.value.timestamp<vNext.value.timestamp)){
    await aSrc.add(aNext.value);aNext.value.close();aNext=await aIt.next()}
   else{
    const f=vNext.value,c=f.canvas;
    const cw=c.width,ch=c.height;
    if(blur){
     const s=Math.max(W/cw,H/ch)*1.15,bw=cw*s,bh=ch*s;
     ctx.filter='blur(30px) brightness(0.65)';
     ctx.drawImage(c,(W-bw)/2,(H-bh)/2,bw,bh);
     ctx.filter='none'}
    else{ctx.fillStyle='#000';ctx.fillRect(0,0,W,H)}
    const s2=Math.min(W/cw,H/ch),fw=cw*s2,fh=ch*s2;
    ctx.drawImage(c,(W-fw)/2,(H-fh)/2,fw,fh);
    await src.add(f.timestamp,f.duration);
    frames++;
    if(frames%30===0)self.postMessage({progress:{done:frames}});
    if(c.close)c.close();
    vNext=await vIt.next()}}
  self.postMessage({progress:{done:frames}});
  src.close();if(aSrc)aSrc.close();
  await output.finalize();
  const buf=target.buffer;
  self.postMessage({done:{blob:new Blob([buf],{type:isAvc?'video/mp4':'video/webm'}),ext:isAvc?'mp4':'webm',width:W,height:H,frames,audio:!!acodec,duration}},[buf]);
 }catch(err){self.postMessage({error:'invalid',detail:String(err&&err.message||err)})}
};
