import test from 'node:test';
import assert from 'node:assert/strict';
import {AnswerFieldDecoder,consumeModelStream,parseAnswer} from '../src/model.js';
import {checkRedirects,selectSearchDepth,isSimpleNavigation,publicSources,searchOfficialSources} from '../src/retrieval.js';

test('incremental answer decoder handles escapes, split Unicode and excludes followups',()=>{
  const expected='Bonjour\n"quoted" \\ 😀 [apply online](S1)';
  const raw=JSON.stringify({answer:expected,followups:['Never expose this followup early']});
  const deltas=[];const decoder=new AnswerFieldDecoder(delta=>deltas.push(delta));
  for(let i=0;i<raw.length;i++)decoder.push(raw[i]);
  assert.equal(deltas.join(''),expected);
  assert(!deltas.some(delta=>delta.includes('followup')));
  const escaped=[];const second=new AnswerFieldDecoder(delta=>escaped.push(delta));
  for(const piece of ['{"ans','wer":"A\\u','D83D','\\uDE','00\\nB','","followups":[]}'])second.push(piece);
  assert.equal(escaped.join(''),'A😀\nB');
});
test('SSE parser ignores reasoning and captures final usage despite network boundaries',async()=>{
  const json='{"answer":"Hello [apply](S1)","followups":[]}';
  const wire=[': keepalive\n\n',`data: ${JSON.stringify({choices:[{delta:{reasoning:'PRIVATE',content:json.slice(0,12)}}]})}\r\n\r\n`,`data: ${JSON.stringify({choices:[{delta:{content:json.slice(12)},finish_reason:'stop'}]})}\n\n`,`data: ${JSON.stringify({choices:[],usage:{prompt_tokens:17,completion_tokens:9}})}\n\n`,'data: [DONE]\n\n'].join('');
  const bytes=new TextEncoder().encode(wire);let index=0;
  const stream=new ReadableStream({pull(controller){if(index>=bytes.length)controller.close();else controller.enqueue(bytes.slice(index,index+=7));}});
  const seen=[];const response=await consumeModelStream(stream,{onContent:chunk=>seen.push(chunk)});
  assert.equal(seen.join(''),json);assert(!seen.join('').includes('PRIVATE'));
  assert.equal(response.usage.prompt_tokens,17);assert.equal(response.choices[0].finish_reason,'stop');
});
test('descriptive links validate source IDs, raw external destinations are removed',()=>{
  const sources=[{id:'S1',content:'official'}];
  const parsed=parseAnswer(JSON.stringify({answer:'Use [apply online](S1), not [evil](https://evil.example). [S1]',followups:[]}),sources);
  assert(parsed.answer.includes('[apply online](S1)'));assert(!parsed.answer.includes('evil.example'));
  assert.throws(()=>parseAnswer(JSON.stringify({answer:'Use [apply](S9)',followups:[]}),sources));
  assert.equal(publicSources(sources,parsed.answer)[0].cited,true);
});
test('manual redirects remain allowlisted and known error destinations are rejected',async()=>{
  let fetched=0;
  const blocked=await checkRedirects('https://www.canada.ca/start',['canada.ca'],async()=>{fetched++;return new Response(null,{status:302,headers:{Location:'https://evil.example'}});});
  assert.equal(blocked,null);assert.equal(fetched,1);
  const error=await checkRedirects('https://www.canada.ca/errors/404.html',['canada.ca'],async()=>new Response(null,{status:200}));
  assert.equal(error,null);
});
test('one deadline bounds an entire multi-hop redirect chain',async()=>{
  const signals=[];
  const fetcher=async(url,{signal})=>{signals.push(signal);await new Promise(resolve=>setTimeout(resolve,8));if(signal.aborted)throw signal.reason;return new Response(null,{status:302,headers:{Location:new URL(url).href+'/next'}});};
  const result=await checkRedirects('https://www.canada.ca/start',['canada.ca'],fetcher,{timeoutMs:12});
  assert.equal(result.checked,false);assert(signals.length>=1&&signals.length<=2);assert(signals.every(signal=>signal===signals[0]));
});
test('fast search is the default for simple, detailed, local and foreign questions',()=>{
  const domestic={country:'CA',basis:'geolocation',provinceCodes:['AB']};
  for(const query of ['How do I apply for a Social Insurance Number? Canada','What documents are required for a SIN?','Je veux ouvrir un restaurant à Montréal','How do I renew my passport?','How do I renew my Canadian passport in Boston? Canada']) {
    assert.equal(selectSearchDepth(query,undefined,domestic),'fast');
  }
  assert.equal(selectSearchDepth('query','advanced'),'advanced');
  assert.equal(selectSearchDepth('query','basic'),'basic');
  assert.equal(selectSearchDepth('query','invalid'),'fast');
});
test('fast default does not narrow detailed, local or foreign source coverage',()=>{
  const domestic={country:'CA',basis:'geolocation',provinceCodes:['AB']};
  assert.equal(isSimpleNavigation('How can I renew my Canadian passport? Canada',domestic),true);
  assert.equal(isSimpleNavigation('How do I apply for a Social Insurance Number? Canada',domestic),true);
  for(const query of ['What documents are required for a SIN?','Je veux ouvrir un restaurant à Montréal','How do I renew a Canadian passport that expires in six months? Canada','How do I renew my Canadian passport in Boston? Canada'])assert.equal(isSimpleNavigation(query,domestic),false);
  assert.equal(isSimpleNavigation('How can I renew my Canadian passport? Canada',{...domestic,country:'US'}),false);
  assert.equal(isSimpleNavigation('How can I renew my Canadian passport? Canada',{...domestic,basis:'national'}),false);
});
test('search timeout falls back once with the identical allowlist and thinner evidence',async()=>{
  const requests=[];
  const fetcher=async(url,options)=>{
    requests.push(JSON.parse(options.body));
    if(requests.length===1){await new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});setTimeout(resolve,25);});options.signal.throwIfAborted();}
    return Response.json({results:[{url:'https://www.canada.ca/page',content:'Official excerpt'}],usage:{credits:1}});
  };
  const result=await searchOfficialSources({TAVILY_API_KEY:'synthetic'},'letter verification',['canada.ca'],'advanced',{fetcher,primaryMs:5,fallbackMs:100});
  assert.equal(result.fallback,true);assert.equal(result.depth,'fast');assert.equal(requests.length,2);
  assert.deepEqual(requests[0].include_domains,requests[1].include_domains);
  assert.equal(requests[1].include_domains_mode,'restrict');assert.equal(requests[1].include_raw_content,false);
});
test('search rate limits and client cancellation do not trigger fallback',async()=>{
  let calls=0;
  await assert.rejects(searchOfficialSources({TAVILY_API_KEY:'synthetic'},'query',['canada.ca'],'advanced',{fetcher:async()=>{calls++;return new Response(null,{status:429});}}),/429/);
  assert.equal(calls,1);
  const controller=new AbortController();
  await assert.rejects(searchOfficialSources({TAVILY_API_KEY:'synthetic'},'query',['canada.ca'],'advanced',{signal:controller.signal,fetcher:async()=>{calls++;controller.abort(new Error('Cancelled'));throw controller.signal.reason;}}),/Cancelled/);
  assert.equal(calls,2);
});
test('search retries one server failure and stops after the fallback fails',async()=>{
  let calls=0;
  await assert.rejects(searchOfficialSources({TAVILY_API_KEY:'synthetic'},'query',['canada.ca'],'advanced',{fetcher:async()=>{calls++;return new Response(null,{status:503});}}),/503/);
  assert.equal(calls,2);
});
