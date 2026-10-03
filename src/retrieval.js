import {hashKey, readCache, writeCache, TTL} from './cache.js';
import {agencyForUrl, canonicalUrl, isAllowedUrl, REGISTRY_VERSION} from './jurisdictions.js';

export const RETRIEVAL_VERSION = 'gov-search-v6';
export const REDIRECT_BUDGET_MS = 1000;
export const SEARCH_PRIMARY_BUDGET_MS = 6000;
export const SEARCH_FALLBACK_BUDGET_MS = 5000;

export async function searchOfficialSources(env,query,domains,depth,{signal,fetcher=fetch,primaryMs=SEARCH_PRIMARY_BUDGET_MS,fallbackMs=SEARCH_FALLBACK_BUDGET_MS,onFallback=()=>{}}={}) {
  const request=async(searchDepth,raw,timeoutMs)=>{
    const budget=AbortSignal.timeout(timeoutMs);
    const requestSignal=signal?AbortSignal.any([signal,budget]):budget;
    try {
      const response=await fetcher('https://api.tavily.com/search',{
        method:'POST',headers:{Authorization:`Bearer ${env.TAVILY_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({query,search_depth:searchDepth,chunks_per_source:3,max_results:10,include_domains:domains,include_domains_mode:'restrict',include_answer:false,include_raw_content:raw,include_published_date:true,include_usage:true,auto_parameters:false,topic:'general'}),signal:requestSignal
      });
      if(!response.ok){const error=new Error(`Official-source search returned ${response.status}. Please try again shortly.`);error.retryable=response.status>=500&&response.status<=599;throw error;}
      return await response.json();
    } catch(error) {
      if(signal?.aborted)throw signal.reason??new DOMException('Aborted','AbortError');
      if(budget.aborted)error.retryable=true;
      throw error;
    }
  };
  try{return {result:await request(depth,'markdown',primaryMs),depth,fallback:false};}
  catch(error) {
    if(signal?.aborted||!error.retryable)throw error;
    onFallback();
    return {result:await request('fast',false,fallbackMs),depth:'fast',fallback:true};
  }
}

export function searchQuery(messages, context, language) {
  const question=messages.at(-1).content;
  const previous=messages.filter(m=>m.role==='user').slice(-3,-1).map(m=>m.content);
  // Preserve the topic for followups without sending assistant prose or a full transcript to search.
  const topic=previous.length && question.length<140 ? previous.at(-1)+' — ' : '';
  const subject=topic+question;
  const municipal=/\b(?:permit|permis|bakery|boulangerie|business|entreprise|zoning|zonage|garbage|recycl|property tax|taxes fonci|parking|stationnement|building|construction|licen[cs]e|licence|bylaw|reglement)\b/i.test(subject);
  const provincial=/health card|carte.*(?:sante|santé)|driver|conduire|tenant|tenancy|landlord|locataire|bail|rent|loyer/i.test(subject);
  const local=municipal?context.municipalities?.[0]?.name:null;
  const province=municipal||provincial?context.provinceCodes?.join(' '):null;
  return `${topic}${question} ${local??province??''} Canada ${language==='fr'?'services gouvernementaux':''}`.trim().slice(0,1200);
}

export async function checkRedirects(url,domains, fetcher=fetch, {timeoutMs=REDIRECT_BUDGET_MS,signal}={}) {
  let current;
  try {current=new URL(url).href;} catch {return null;}
  if(!isAllowedUrl(current,domains)) return null;
  const budget=AbortSignal.timeout(timeoutMs);
  const requestSignal=signal?AbortSignal.any([budget,signal]):budget;
  try {
    for(let hop=0;hop<5;hop++) {
      const response=await fetcher(current,{method:'HEAD',redirect:'manual',signal:requestSignal,headers:{'User-Agent':'BuildCanadaGov/0.1 (+https://gov.buildcanada.com/about)'}});
      if([301,302,303,307,308].includes(response.status)) {
        const next=new URL(response.headers.get('Location')??'',current).href;
        if(!response.headers.get('Location')||!isAllowedUrl(next,domains)) return null;
        current=next;
        continue;
      }
      if(response.status===404||response.status===410||/\/(?:errors?\/(?:404|not-found)|404)(?:\.html)?(?:[/?#]|$)/i.test(new URL(current).pathname))return null;
      // Some agencies block HEAD/bots. Indexed material stays labelled as indexed, not a fresh fetch.
      return {url:canonicalUrl(current),checked:response.ok};
    }
    return null;
  } catch { if(signal?.aborted)throw signal.reason??new DOMException('Aborted','AbortError');return {url:canonicalUrl(current),checked:false}; }
}

export async function normalizeSources(results,domains,{verify=true,fetcher=fetch,signal,maxSources=8}={}) {
  const candidates=[];const seen=new Set();
  for(const result of results??[]) {
    if(!result || typeof result.url!=='string'||!isAllowedUrl(result.url,domains)) continue;
    const url=canonicalUrl(result.url);
    const dedupKey=url.replace(/^https:\/\/www\./,'https://');
    if(seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const snippet=String(result.content||'').trim();
    const raw=String(result.raw_content||'').trim();
    const content=(snippet+(raw&&raw!==snippet?'\n\nOfficial page text:\n'+raw:'')).trim();
    if(!content) continue;
    candidates.push({...result,url,content});
    if(candidates.length>=Math.min(10,maxSources+2)) break;
  }
  const checked=await Promise.all(candidates.map(async r=> {
    const verified=verify?await checkRedirects(r.url,domains,fetcher,{signal}):{url:r.url,checked:false};
    if(!verified)return null;
    const agency=agencyForUrl(verified.url);
    return {canonicalUrl:verified.url,title:String(r.title||new URL(verified.url).hostname).slice(0,250),agencyId:agency.id,agencyName:agency.name,jurisdiction:agency.jurisdiction,domain:agency.domain,monogram:agency.monogram,content:r.content.slice(0,5000),retrievedAt:new Date().toISOString(),urlChecked:verified.checked,cited:false};
  }));
  const final=[];const unique=new Set();
  for(const source of checked) if(source&&!unique.has(source.canonicalUrl.replace(/^https:\/\/www\./,'https://'))){unique.add(source.canonicalUrl.replace(/^https:\/\/www\./,'https://'));final.push({...source,id:`S${final.length+1}`});}
  return final.slice(0,maxSources);
}

export function publicSources(sources,answer='') {
  const cited=new Set([...answer.matchAll(/\[(S\d+)\]|\]\((S\d+)\)/g)].map(m=>m[1]??m[2]));
  return sources.map(({content,...s})=>({...s,cited:cited.has(s.id)}));
}

function sinProgramPage(url) {try{const parsed=new URL(url);return Number((parsed.hostname==='canada.ca'||parsed.hostname==='www.canada.ca')&&/^(?:\/en\/employment-social-development\/services\/sin|\/fr\/emploi-developpement-social\/services\/numero-assurance-sociale)(?:[/.?]|$)/i.test(parsed.pathname)||parsed.hostname==='sin-nas.canada.ca');}catch{return 0;}}

export function selectSearchDepth(query,override) {
  return ['advanced','basic','fast'].includes(override)?override:'fast';
}

// Source narrowing is independent of search speed: detailed/local/foreign requests
// keep eight pages, and overseas passport pages remain eligible when relevant.
export function isSimpleNavigation(query,context) {
  const sin=/\b(?:sin|social insurance number|num[eé]ro d.assurance sociale)\b/i.test(query);
  const complex=/document|required|requirement|eligib|temporary|immigra|international|lost|vol[eé]|perdu|remplac|admissib|preuve|proof/i.test(query);
  const navigation=query.replace(/ Canada(?: services gouvernementaux)?$/i,'').trim().replace(/[?!.,]+$/g,'');
  const passportNavigation=/^(?:(?:how|where) (?:do|can) i renew (?:(?:my|a|the) )?(?:canadian )?passport|comment (?:puis-je )?renouveler (?:mon|un|le) passeport(?: canadien)?)$/i.test(navigation);
  const domesticHint=context?.country==='CA'&&context?.basis&&context.basis!=='national'&&context?.provinceCodes?.length;
  return !!(sin&&!complex||passportNavigation&&domesticHint);
}

export async function retrieve(env,{messages,context,language,cacheable=true,sourceFixtures,emit=()=>{},signal}) {
  const started=Date.now();
  const query=searchQuery(messages,context,language);
  let depth=selectSearchDepth(query,env.SEARCH_DEPTH,context);
  const key=await hashKey('search',{version:RETRIEVAL_VERSION,registry:REGISTRY_VERSION,query,depth,language,domains:[...context.domains].sort()});
  if(sourceFixtures) return {sources:await normalizeSources(sourceFixtures,context.domains,{verify:false}),retrievalLimited:false,searchCache:'fixture',searchCredits:0,metrics:{searchMs:0,linkCheckMs:0,retrievalMs:Date.now()-started,searchDepth:'fixture',searchFallback:false}};
  const cached=cacheable?await readCache(env.CACHE,key):null;
  if(cached) return {...cached,searchCache:'hit',searchCredits:0,metrics:{searchMs:0,linkCheckMs:0,retrievalMs:Date.now()-started,searchDepth:cached.retrievalLimited?'fast':depth,searchFallback:!!cached.retrievalLimited}};
  if(!env.TAVILY_API_KEY) throw new Error('The search service is not configured.');
  if(!context.domains?.length||context.domains.length>300) throw new Error('No valid official source list is available for this location.');
  emit('status',{stage:'search',message:language==='fr'?'Recherche dans les sources gouvernementales…':'Searching official government sources…'});
  const searchStarted=Date.now();
  const searched=await searchOfficialSources(env,query,context.domains,depth,{signal,onFallback:()=>emit('status',{stage:'search',message:language==='fr'?'La recherche complète est lente. Recherche limitée dans les mêmes sources officielles…':'Full-page search is slow. Trying a limited search of the same official sources…'})});
  const result=searched.result;depth=searched.depth;
  const searchMs=Date.now()-searchStarted;
  emit('status',{stage:'checking',message:language==='fr'?'Vérification des liens et des organismes…':'Checking source links and agencies…'});
  const checkingStarted=Date.now();
  // For simple SIN navigation prefer the program's own pages over payroll/IRCC tangents.
  const simpleNavigation=isSimpleNavigation(query,context);
  const passportNavigation=!searched.fallback&&depth==='fast'&&simpleNavigation&&/passport|passeport/i.test(query);
  const relevant=passportNavigation?(result.results??[]).filter(r=>!/canadian-passports-(?:usa|abroad)|renew-abroad/i.test(r.url)):result.results;
  const results=depth==='fast'?[...(relevant??[])].sort((a,b)=>sinProgramPage(b.url)-sinProgramPage(a.url)):relevant;
  const sources=await normalizeSources(results,context.domains,{signal,maxSources:depth==='fast'&&!searched.fallback&&simpleNavigation?4:8});
  const linkCheckMs=Date.now()-checkingStarted;
  const value={sources,retrievalLimited:searched.fallback};
  if(cacheable) await writeCache(env.CACHE,key,value,Number(env.SEARCH_TTL_SECONDS)||TTL.search);
  return {...value,searchCache:cacheable?'miss':'bypass',searchCredits:result.usage?.credits??(depth==='advanced'?2:1),metrics:{searchMs,linkCheckMs,retrievalMs:Date.now()-started,searchDepth:depth,searchFallback:searched.fallback}};
}
