import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDocument} from '../src/cache.js';
import {answerQuestion,isDocumentSummaryQuestion} from '../src/pipeline.js';
import worker from '../src/index.js';

test('document context rejects oversized text, binary-like payloads and invalid page counts',()=>{
  for(const document of [{name:'file.pdf',pages:1,text:'x'.repeat(24001)},{name:'file.pdf',pages:26,text:'text'},{name:'file.pdf',pages:1,base64:'JVBERi0='},{name:'file.pdf',pages:1,text:' '}])assert.throws(()=>normalizeDocument(document));
  assert.equal(normalizeDocument(null),null);
});

test('extracted document identifiers and filenames receive best-effort masking',()=>{
  const result=normalizeDocument({name:'hello@example.com.pdf',pages:2,text:'My SIN is 123-456-789. Application pending.',truncated:true});
  assert(!result.text.includes('123-456-789'));
  assert(!result.name.includes('hello@example.com'));
  assert.equal(result.truncated,true);
});

test('chunked oversized bodies are rejected before provider processing',async()=>{
  const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(200001));controller.close();}});
  const request=new Request('https://gov.buildcanada.com/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body,duplex:'half'});
  const response=await worker.fetch(request,{},{});
  assert.equal(response.status,400);assert.match((await response.json()).error,/too large/);
});

test('document context goes only to the answer model and bypasses all shared caches',async(t)=>{
  const originalFetch=globalThis.fetch; t.after(()=>{globalThis.fetch=originalFetch;});
  const canary='PRIVATE_DOCUMENT_CANARY';let modelCalls=0;let searchCalls=0;let cacheCalls=0;
  globalThis.fetch=async(url,options)=>{
    if(String(url).includes('api.tavily.com')) {
      searchCalls++;assert(!options.body.includes(canary));
      return new Response(JSON.stringify({results:[{url:'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html',title:'Passports',content:'Read the official passport requirements.'}],usage:{credits:2}}),{headers:{'Content-Type':'application/json'}});
    }
    return new Response(null,{status:200});
  };
  const env={TAVILY_API_KEY:'synthetic',MODEL:'test',MODEL_PROVIDER:'cloudflare',CACHE:{async get(){cacheCalls++;return null;},async put(){cacheCalls++;}},AI:{async run(model,args){modelCalls++;assert(args.messages.some(m=>m.content.includes(canary)));return {choices:[{message:{content:JSON.stringify({answer:'Read the official passport requirements [S1].',followups:[]})}}]};}}};
  const result=await answerQuestion(env,{query:'Where can I read the passport requirements?',document:{name:'letter.pdf',pages:1,text:canary},geo:{country:'CA',regionCode:'AB'}});
  assert.equal(searchCalls,1);assert.equal(modelCalls,1);assert.equal(cacheCalls,0);
  assert.equal(result.cache.answer,'bypass');assert.equal(result.cache.search,'bypass');
  assert(!JSON.stringify(result).includes(canary));
  const later=await answerQuestion(env,{messages:[{role:'user',content:'Where can I read the passport requirements?'},{role:'assistant',content:`Your document includes ${canary}.`},{role:'user',content:'Where can I read the passport requirements?'}],privateConversation:true,geo:{country:'CA',regionCode:'AB'}});
  assert.equal(later.cache.answer,'bypass');assert.equal(later.cache.search,'bypass');
  assert.equal(searchCalls,2);assert.equal(modelCalls,2);assert.equal(cacheCalls,0);
});

test('pure document summaries are narrowly separated from government verification',()=>{
  for(const query of ['Summarize this PDF.','What does this letter ask me to do?','Résume ce document.','Que me demande cette lettre?'])assert.equal(isDocumentSummaryQuestion(query),true);
  for(const query of ['Summarize this PDF and tell me if I qualify.','What does this letter ask me to do, and how can I verify it?','Explain the CPP eligibility requirements.','Résume ce document et confirme mon admissibilité.'])assert.equal(isDocumentSummaryQuestion(query),false);
});

test('a pure PDF summary never invokes search or cache and is explicitly labelled to the model',async()=>{
  const env={MODEL:'test',MODEL_PROVIDER:'cloudflare',CACHE:{async get(){assert.fail('private context read cache');},async put(){assert.fail('private context wrote cache');}},AI:{async run(model,args){const input=JSON.parse(args.messages[1].content);assert.equal(input.documentSummaryOnly,true);assert.deepEqual(input.officialSources,[]);return {choices:[{message:{content:JSON.stringify({answer:'Your document asks for proof of residency within 30 days. This is a summary of its contents, not verification of a government requirement.',followups:[]})}}]};}}};
  const result=await answerQuestion(env,{query:'What does this letter ask me to do?',document:{name:'letter.pdf',pages:1,text:'Provide proof of residency within 30 days.'}});
  assert.equal(result.metrics.searchCredits,0);assert.equal(result.metrics.searchDepth,'document-summary');
  assert.deepEqual(result.sources,[]);
});
