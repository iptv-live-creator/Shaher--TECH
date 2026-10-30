import {Input,BlobSource,ALL_FORMATS,Output,BufferTarget,Conversion,Mp4OutputFormat,canEncode,canEncodeAudio} from './mediabunny.min.mjs';
import {registerAacEncoder} from './mediabunny-aac-encoder.min.mjs';
let aacReady=false;
async function ensureAac(){if(aacReady)return true;let ok=await canEncodeAudio('aac').catch(()=>false);if(!ok){try{registerAacEncoder()}catch(e){}ok=await canEncodeAudio('aac').catch(()=>false)}aacReady=ok;return ok}
self.onmessage=async({data:d})=>{let input;try{
input=new Input({source:new BlobSource(d.file),formats:ALL_FORMATS});
const video=await input.getPrimaryVideoTrack();
if(!video)throw Error('video');
const audio=await input.getPrimaryAudioTrack();
const duration=await input.computeDuration();
if(!Number.isFinite(duration)||duration<=0||duration>1800)throw Error('duration');
if(d.mode==='inspect'){
 const vdec=await video.canDecode().catch(()=>false);
 const adec=audio?await audio.canDecode().catch(()=>false):true;
 const venc=await canEncode('avc').catch(()=>false);
 const aenc=audio?await ensureAac():true;
 self.postMessage({meta:{duration,hasAudio:!!audio,decodable:!!(vdec&&adec),encodable:!!(venc&&aenc),width:video.codedWidth||0,height:video.codedHeight||0}});
 return;
}
if(audio&&!(await ensureAac()))throw Error('audio');
const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat(),target});
const conversion=await Conversion.init({input,output,tracks:'primary',trim:{start:d.start,end:d.end},copy:false,video:{codec:'avc'},audio:{codec:'aac'}});
if(!conversion.isValid||conversion.discardedTracks.some(x=>x.track===video))throw Error('codec');
if(audio&&conversion.discardedTracks.some(x=>x.track===audio))throw Error('audio');
conversion.onProgress=p=>self.postMessage({progress:p});
await conversion.execute();
if(!target.buffer||!target.buffer.byteLength)throw Error('empty');
self.postMessage({done:true,blob:new Blob([target.buffer],{type:'video/mp4'}),ext:'mp4'});
}catch(e){self.postMessage({error:['video','duration','codec','audio','empty'].includes(e.message)?e.message:'invalid'})}finally{try{input?.dispose()}catch(_){}}};
