import {TTL,hashKey,readCache,writeCache,normalizeMessages,privacyFilter,normalizeDocument} from './cache.js';
import {selectJurisdictions,REGISTRY_VERSION,publicContext} from './jurisdictions.js';
import {generateAnswer,PROMPT_VERSION,ANSWER_FORMAT_VERSION} from './model.js';
import {retrieve,publicSources,RETRIEVAL_VERSION} from './retrieval.js';

export function isDocumentSummaryQuestion(question) {
  const value=question.trim().normalize('NFC');
  return /^(?:please\s+)?(?:summari[sz]e|explain|help me understand)\s+(?:this|the|my)\s+(?:pdf|document|letter)[.!?]*$/i.test(value)
    || /^what does (?:this|the|my) (?:pdf|document|letter) (?:say|ask me to do)[.!?]*$/i.test(value)
    || /^(?:s'il vous plaît,?\s+)?(?:résume[rz]?|explique[rz]?) (?:ce|cette|mon|ma) (?:pdf|document|lettre)[.!?]*$/i.test(value)
    || /^que (?:dit|demande|me demande) (?:ce|cette|mon|ma) (?:pdf|document|lettre)[.!?]*$/i.test(value);
}

export async function answerQuestion(env,{messages,query,geo={},language='en',location=null,model=env.MODEL,provider=env.MODEL_PROVIDER,fresh=false,sourceFixtures,document:documentInput,privateConversation=false,signal,evalMode=false,emit=()=>{}}) {
  const started=Date.now();
  const original=normalizeMessages(messages??[{role:'user',content:query}]);
  const filtered=privacyFilter(original);
  const history=filtered.messages;
  const document=normalizeDocument(documentInput);
  const documentSummaryOnly=!!document&&!sourceFixtures&&isDocumentSummaryQuestion(history.at(-1).content);
  const cacheable=filtered.cacheable&&!sourceFixtures&&!document&&!privateConversation;
  signal?.throwIfAborted();
  const selection=selectJurisdictions(geo,{query:history.at(-1).content,messages:history,location});
  const context={...publicContext(selection),domains:selection.domains};
  emit('context',context);
  const key=await hashKey('answer',{registry:REGISTRY_VERSION,prompt:PROMPT_VERSION,format:ANSWER_FORMAT_VERSION,retrieval:RETRIEVAL_VERSION,model,provider,language,date:new Date().toISOString().slice(0,10),messages:history,domains:[...context.domains].sort(),label:context.label,basis:context.basis});
  const followupKey=await hashKey('followups',{answerKey:key});
  const cached=cacheable&&!fresh?await readCache(env.CACHE,key):null;
  if(cached) {
    const followups=await readCache(env.CACHE,followupKey)??cached.followups??[];
    emit('sources',cached.sources);
    return {...cached,followups,context,metrics:{...cached.metrics,latencyMs:Date.now()-started,firstAnswerLatencyMs:Date.now()-started,modelLatencyMs:0,firstTokenMs:0,firstAnswerMs:0,searchMs:0,linkCheckMs:0,retrievalMs:0,costUsd:0,searchCredits:0,inputTokens:0,outputTokens:0},cache:{answer:'hit',search:'not-needed',followups:'hit'}};
  }
  if(documentSummaryOnly)emit('status',{stage:'document',message:language==='fr'?'Résumé du texte de votre document…':'Summarizing your document text…'});
  const retrieval=documentSummaryOnly?{sources:[],searchCache:'bypass',searchCredits:0,metrics:{searchMs:0,linkCheckMs:0,retrievalMs:0,searchDepth:'document-summary'}}:await retrieve(env,{messages:history,context,language,cacheable,sourceFixtures,emit,signal});
  emit('sources',publicSources(retrieval.sources));
  emit('status',{stage:'answering',message:documentSummaryOnly?(language==='fr'?'Préparation du résumé de votre document…':'Preparing your document summary…'):(language==='fr'?'Préparation d’une réponse à partir des sources…':'Preparing an answer from the official sources…')});
  signal?.throwIfAborted();
  let firstAnswerLatencyMs=null;
  const generated=await generateAnswer(env,{messages:history,language,context,sources:retrieval.sources,model,provider,document,documentSummaryOnly,retrievalLimited:retrieval.retrievalLimited===true,signal,onAnswerDelta:text=>{firstAnswerLatencyMs??=Date.now()-started;emit('answer.delta',{text});}});
  const sources=publicSources(retrieval.sources,generated.answer);
  const storedFollowups=cacheable?await readCache(env.CACHE,followupKey):null;
  const result={...generated,privateConversation:!!document||privateConversation||!filtered.cacheable,followups:storedFollowups??generated.followups,sources,context,metrics:{...generated.metrics,...retrieval.metrics,firstAnswerLatencyMs:firstAnswerLatencyMs??Date.now()-started,searchCredits:retrieval.searchCredits,latencyMs:Date.now()-started},cache:{answer:cacheable?'miss':'bypass',search:retrieval.searchCache,followups:storedFollowups?'hit':cacheable?'miss':'bypass'}};
  if(cacheable) {
    signal?.throwIfAborted();
    await Promise.all([
      writeCache(env.CACHE,key,result,Number(env.ANSWER_TTL_SECONDS)||TTL.answer),
      storedFollowups?Promise.resolve():writeCache(env.CACHE,followupKey,generated.followups,Number(env.FOLLOWUP_TTL_SECONDS)||TTL.followups)
    ]);
  }
  if(evalMode)result.evidence=retrieval.sources.map(s=>({sourceId:s.id,text:s.content}));
  return result;
}
