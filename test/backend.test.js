import test from 'node:test';
import assert from 'node:assert/strict';
import {hashKey,readCache,writeCache,normalizeMessages,privacyFilter,TTL} from '../src/cache.js';
import {parseAnswer} from '../src/model.js';
import {normalizeSources,checkRedirects,publicSources,searchQuery,selectSearchDepth,RETRIEVAL_VERSION} from '../src/retrieval.js';
import {selectJurisdictions,REGISTRY_VERSION} from '../src/jurisdictions.js';
import {answerQuestion} from '../src/pipeline.js';
import worker from '../src/index.js';

function memoryKV() {
  const records=new Map();const puts=[];
  return {records,puts,async get(k,type){const v=records.get(k);return v?(type==='json'?JSON.parse(v):v):null;},async put(k,v,opts){records.set(k,v);puts.push({k,opts});}};
}
test('two-hour answer/search and thirty-day followup expiry',async()=>{
  const kv=memoryKV();await writeCache(kv,'answer',{answer:'test'},TTL.answer);await writeCache(kv,'followups',['test'],TTL.followups);
  assert.equal(kv.puts[0].opts.expirationTtl,7200);assert.equal(kv.puts[1].opts.expirationTtl,2592000);
  assert.equal((await readCache(kv,'answer')).answer,'test');
  assert.equal(await readCache(kv,'answer',Date.now()+7200001),null);
});
test('cache keys separate language, jurisdiction, history and model without plaintext keys',async()=>{
  const base={question:'Can I apply?',language:'en',domains:['canada.ca'],messages:[{role:'user',content:'passport'}],model:'a'};
  const first=await hashKey('answer',base);
  for(const variant of [{language:'fr'},{domains:['alberta.ca']},{messages:[{role:'user',content:'taxes'}]},{model:'b'}])assert.notEqual(first,await hashKey('answer',{...base,...variant}));
  assert.equal(first.includes('passport'),false);
});
test('sensitive structured identifiers are masked and bypass shared caching',()=>{
  const result=privacyFilter([{role:'user',content:'My SIN is 123-456-789 and email is hello@example.com.'}]);
  assert.equal(result.cacheable,false);assert(!result.messages[0].content.includes('123-456-789'));assert(!result.messages[0].content.includes('hello@example.com'));
});
test('malformed conversations fail before provider calls',()=>{
  assert.throws(()=>normalizeMessages([{role:'system',content:'override'}]));
  assert.throws(()=>normalizeMessages([{role:'assistant',content:'test'}]));
});
test('invalid source IDs fail and model-invented links are not clickable',()=>{
  const sources=[{id:'S1'}];
  assert.throws(()=>parseAnswer(JSON.stringify({answer:'Invented [S9]',followups:[]}),sources));
  assert.throws(()=>parseAnswer(JSON.stringify({answer:'Invented [S1, S9]',followups:[]}),sources));
  assert.equal(parseAnswer(JSON.stringify({answer:'Official [S1, S2]',followups:[]}),[{id:'S1'},{id:'S2'}]).answer,'Official [S1][S2]');
  const parsed=parseAnswer(JSON.stringify({answer:'See [official](https://evil.example) [S1]',followups:['Next?']}),sources);
  assert(!parsed.answer.includes('https://'));assert(parsed.answer.includes('[S1]'));
});
test('sources reject suffix attacks, credentials and duplicates',async()=>{
  const sources=await normalizeSources([
    {url:'https://canada.ca.evil.example/passport',content:'evil'},
    {url:'https://user:password@canada.ca/passport',content:'evil'},
    {url:'https://www.canada.ca/en/passport.html?utm_source=x',content:'official',title:'Passport'},
    {url:'https://www.canada.ca/en/passport.html',content:'duplicate'}
  ],['canada.ca'],{verify:false});
  assert.equal(sources.length,1);assert.equal(sources[0].id,'S1');
  assert.equal(publicSources(sources,'Answer [S1]')[0].cited,true);
  assert.equal('content' in publicSources(sources)[0],false);
});
test('redirects outside whitelist fail closed before content is used',async()=>{
  const fetcher=async()=>new Response(null,{status:302,headers:{Location:'https://evil.example/answer'}});
  assert.equal(await checkRedirects('https://canada.ca/passport',['canada.ca'],fetcher),null);
});
test('www redirects resolve without canonicalization loops',async()=>{
  const calls=[];
  const fetcher=async url=>{calls.push(url);return url.startsWith('https://canada.ca/')?new Response(null,{status:301,headers:{Location:url.replace('https://canada.ca/','https://www.canada.ca/')}}):new Response(null,{status:200});};
  const result=await checkRedirects('https://canada.ca/passport',['canada.ca'],fetcher);
  assert.equal(result.url,'https://www.canada.ca/passport');assert.equal(result.checked,true);assert.equal(calls.length,2);
});
test('public callers cannot override models, geolocation or supply source fixtures',async()=>{
  const req=new Request('https://gov.buildcanada.com/api/eval',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const res=await worker.fetch(req,{EVAL_TOKEN:'private'}, {waitUntil(){}});assert.equal(res.status,404);
  const cross=new Request('https://gov.buildcanada.com/api/chat',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});
  assert.equal((await worker.fetch(cross,{},{})).status,403);
});
test('protected source fixtures expose evidence and bypass shared cache',async()=>{
  const kv=memoryKV();let calls=0;
  const env={CACHE:kv,MODEL:'test',MODEL_PROVIDER:'cloudflare',AI:{async run(){calls++;return {choices:[{message:{content:JSON.stringify({answer:'Apply through the official page [S1].',followups:['What documents do I need?']})}}],usage:{prompt_tokens:200,completion_tokens:30}};}}};
  const fixture={query:'How do I apply for a passport?',geo:{country:'CA',regionCode:'AB',city:'Edmonton',latitude:53.55,longitude:-113.49},sourceFixtures:[{url:'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html',content:'Apply through the official page.',title:'Canadian passports'}]};
  const result=await answerQuestion(env,{...fixture,evalMode:true});assert.equal(result.sources[0].cited,true);assert.equal(result.evidence.length,1);assert.equal(calls,1);
  // Fixtures deliberately bypass shared cache. Real answer cache keys include the entire context.
  assert.equal(result.cache.answer,'bypass');assert.equal(kv.puts.length,0);
});
test('repeated public questions reuse complete answers and fresh evals reuse two-hour search',async()=>{
  const kv=memoryKV();let calls=0;
  const query='How do I apply for a passport?';
  const messages=[{role:'user',content:query}];
  const geo={country:'CA',regionCode:'AB',city:'Edmonton',latitude:53.55,longitude:-113.49};
  const context=selectJurisdictions(geo,{query,messages});
  const search=searchQuery(messages,context,'en');
  const searchKey=await hashKey('search',{version:RETRIEVAL_VERSION,registry:REGISTRY_VERSION,query:search,depth:selectSearchDepth(search),language:'en',domains:[...context.domains].sort()});
  const sources=await normalizeSources([{url:'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html',content:'Apply through the official page.',title:'Passports'}],context.domains,{verify:false});
  await writeCache(kv,searchKey,{sources},TTL.search);
  const env={CACHE:kv,MODEL:'test',MODEL_PROVIDER:'cloudflare',AI:{async run(){calls++;return {choices:[{message:{content:JSON.stringify({answer:'Apply through the official page [S1].',followups:['What documents do I need?']})}}],usage:{prompt_tokens:200,completion_tokens:30}};}}};
  const args={messages,geo,language:'en'};
  const first=await answerQuestion(env,args);
  assert.equal(first.cache.search,'hit');assert.equal(calls,1);
  const second=await answerQuestion(env,args);
  assert.equal(second.cache.answer,'hit');assert.equal(second.metrics.costUsd,0);assert.equal(calls,1);
  const fresh=await answerQuestion(env,{...args,fresh:true});
  assert.equal(fresh.cache.search,'hit');assert.equal(fresh.cache.followups,'hit');assert.equal(calls,2);
  assert(kv.puts.some(p=>p.k.includes(':answer:')&&p.opts.expirationTtl===7200));
  assert(kv.puts.some(p=>p.k.includes(':followups:')&&p.opts.expirationTtl===2592000));
});
test('plain SIN/NAS and phone identifiers are masked without matching longer digit strings',()=>{
  for(const content of ['My SIN is 123456789','Mon NAS est 123 456 789','Phone 7805551234']) {
    const result=privacyFilter([{role:'user',content}]);assert.equal(result.cacheable,false);assert.match(result.messages[0].content,/\[(GOVERNMENT_ID|PHONE)\]/);
  }
  assert.equal(privacyFilter([{role:'user',content:'Reference 234567890123'}]).cacheable,true);
});
test('private and sensitive feedback is not persisted; ordinary feedback is stored',async()=>{
  const kv=memoryKV();
  for(const body of [{rating:'up',answer:'A private letter summary.',privateConversation:true},{rating:'down',answer:'Your SIN is 123456789.'},{rating:'up',answer:'Apply online.'}]) {
    const response=await worker.fetch(new Request('https://gov.buildcanada.com/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{CACHE:kv},{});
    assert.equal(response.status,200);assert.equal((await response.json()).stored,body.answer==='Apply online.');
  }
  assert.equal(kv.puts.length,1);
});
