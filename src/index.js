import {answerQuestion} from './pipeline.js';
import {selectJurisdictions,PROVINCES,MUNICIPALITIES,publicContext} from './jurisdictions.js';
import {TTL,writeCache,hashKey,privacyFilter} from './cache.js';

const SECURITY_HEADERS = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains'
};

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...SECURITY_HEADERS,'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});

async function bodyJson(request,max=200000) {
  if(!request.headers.get('Content-Type')?.includes('application/json')) throw new Error('Send JSON.');
  if(Number(request.headers.get('Content-Length'))>max) throw new Error('The request is too large.');
  if(!request.body)throw new Error('The request is not valid JSON.');
  const reader=request.body.getReader();const chunks=[];let size=0;
  try {
    while(true) {
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>max){await reader.cancel();throw new Error('The request is too large.');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const text=new TextDecoder().decode(bytes);
  try{return JSON.parse(text);}catch{throw new Error('The request is not valid JSON.');}
}

function eventStream(run,ctx,requestSignal) {
  const {readable,writable}=new TransformStream();
  const writer=writable.getWriter();
  const encoder=new TextEncoder();
  let cancelled=false;
  const controller=new AbortController();
  const cancel=()=>{cancelled=true;controller.abort();};
  requestSignal?.addEventListener('abort',cancel,{once:true});
  if(requestSignal?.aborted)cancel();
  writer.closed.catch(cancel);
  let queue=Promise.resolve();
  const emit=(event,data)=>{
    if(cancelled)return;
    queue=queue.then(()=>writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))).catch(cancel);
  };
  const task=(async()=>{
    try {
      const result=await run(emit,controller.signal);
      emit('answer',result);emit('done',{});
    } catch(error) {emit('error',{message:error.message||'Something went wrong. Please try again.'});}
    await queue;
    try{await writer.close();}catch{}
    requestSignal?.removeEventListener('abort',cancel);
  })();
  ctx.waitUntil(task);
  return new Response(readable,{headers:{...SECURITY_HEADERS,'Content-Type':'text/event-stream;charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
}

export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) {
      const response=await env.ASSETS.fetch(request);
      const secured=new Response(response.body,response);
      for(const [k,v] of Object.entries(SECURITY_HEADERS))secured.headers.set(k,v);
      return secured;
    }
    if(url.pathname==='/api/health'&&request.method==='GET')return json({ok:true,model:env.MODEL,provider:env.MODEL_PROVIDER,cache:{answerSeconds:TTL.answer,searchSeconds:TTL.search,followupSeconds:TTL.followups}});
    if(url.pathname==='/api/context'&&request.method==='GET') {
      const location=url.searchParams.has('province')||url.searchParams.has('municipality')?{province:url.searchParams.get('province'),municipality:url.searchParams.get('municipality')}:null;
      const selected=selectJurisdictions(request.cf??{},{location});
      return json({context:{...publicContext(selected),domains:selected.domains},locations:{provinces:PROVINCES.map(({code,id,en,fr})=>({code,id,name:{en,fr}})),municipalities:MUNICIPALITIES.map(({id,name,province})=>({id,name,province}))}});
    }
    const evalMode=url.pathname==='/api/eval';
    if(evalMode) {
      if(!env.EVAL_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.EVAL_TOKEN}`)return json({error:'Not found'},404);
    } else {
      const origin=request.headers.get('Origin');
      if(origin&&origin!==url.origin)return json({error:'This endpoint accepts requests from this site.'},403);
      if(env.RATE_LIMITER) {
        const limit=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')??'unknown'});
        if(!limit.success)return json({error:'Please wait a minute before asking another question.'},429);
      }
    }
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    try {
      const body=await bodyJson(request);
      if(url.pathname==='/api/feedback') {
        if(!['up','down'].includes(body.rating)||typeof body.answer!=='string'||body.answer.length>16000)return json({error:'Invalid feedback'},400);
        const feedbackText=[body.answer,typeof body.comment==='string'?body.comment:''].map(content=>({role:'user',content}));
        if(body.privateConversation===true||!privacyFilter(feedbackText).cacheable)return json({ok:true,stored:false});
        const feedback={rating:body.rating,answer:body.answer,sources:Array.isArray(body.sources)?body.sources.slice(0,10).map(s=>({id:s.id,canonicalUrl:s.canonicalUrl,title:s.title})):[],comment:typeof body.comment==='string'?body.comment.slice(0,1000):'',createdAt:new Date().toISOString()};
        await writeCache(env.CACHE,await hashKey('feedback',{id:crypto.randomUUID()}),feedback,TTL.feedback);
        return json({ok:true,stored:true});
      }
      if(!['/api/chat','/api/eval'].includes(url.pathname))return json({error:'Not found'},404);
      const args={messages:body.messages,query:body.query,geo:evalMode?body.geo??{}:request.cf??{},language:body.language==='fr'?'fr':'en',location:body.location??null,document:body.document,privateConversation:body.privateConversation===true,evalMode};
      if(evalMode)Object.assign(args,{model:body.model??env.MODEL,provider:body.provider??env.MODEL_PROVIDER,fresh:!!body.fresh,sourceFixtures:body.sourceFixtures});
      if(evalMode||request.headers.get('Accept')?.includes('application/json'))return json(await answerQuestion(env,{...args,signal:request.signal}));
      return eventStream((emit,signal)=>answerQuestion(env,{...args,emit,signal}),ctx,request.signal);
    } catch(error){return json({error:error.message||'Please try again.',...(evalMode&&error.diagnostics?{diagnostics:error.diagnostics}:{})},400);}
  }
};
