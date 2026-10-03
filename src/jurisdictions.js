/** Curated official sources; coordinates/population are routing hints, not boundaries.
 * See ../data-provenance.md. Never accept model/user supplied domains into this registry. */
export const REGISTRY_VERSION = '2026-09-29.1';
export const FEDERAL_DOMAINS = Object.freeze(['canada.ca', 'gc.ca', 'parl.ca', 'ourcommons.ca', 'sencanada.ca', 'bankofcanada.ca']);
const provinceRows = [
  ['AB', 'Alberta', 'Alberta', ['alberta.ca', 'albertahealthservices.ca']],
  ['BC', 'British Columbia', 'Colombie-Britannique', ['gov.bc.ca', 'icbc.com']],
  ['MB', 'Manitoba', 'Manitoba', ['gov.mb.ca', 'manitoba.ca']],
  ['NB', 'New Brunswick', 'Nouveau-Brunswick', ['gnb.ca', 'snb.ca']],
  ['NL', 'Newfoundland and Labrador', 'Terre-Neuve-et-Labrador', ['gov.nl.ca']],
  ['NS', 'Nova Scotia', 'Nouvelle-Écosse', ['novascotia.ca', 'nshealth.ca']],
  ['NT', 'Northwest Territories', 'Territoires du Nord-Ouest', ['gov.nt.ca', 'gnwt.ca']],
  ['NU', 'Nunavut', 'Nunavut', ['gov.nu.ca']],
  ['ON', 'Ontario', 'Ontario', ['ontario.ca', 'ontariocourts.ca', 'tribunalsontario.ca']],
  ['PE', 'Prince Edward Island', 'Île-du-Prince-Édouard', ['princeedwardisland.ca']],
  ['QC', 'Quebec', 'Québec', ['quebec.ca', 'gouv.qc.ca', 'revenuquebec.ca']],
  ['SK', 'Saskatchewan', 'Saskatchewan', ['saskatchewan.ca', 'saskhealthauthority.ca']],
  ['YT', 'Yukon', 'Yukon', ['yukon.ca']],
];
export const PROVINCES = Object.freeze(provinceRows.map(([code, en, fr, domains]) => Object.freeze({id: code.toLowerCase(), code, name: en, en, fr, domains: Object.freeze(domains)})));
// Rounded 2021 census-order population weights, approximate city-centre coordinates.
const cityRows = [
 ['Toronto','ON',43.65,-79.38,2794000,'toronto.ca'],
 ['Mississauga','ON',43.59,-79.64,718000,'mississauga.ca'],
 ['Brampton','ON',43.73,-79.76,656000,'brampton.ca'],
 ['Ottawa','ON',45.42,-75.70,1017000,'ottawa.ca'],
 ['Hamilton','ON',43.26,-79.87,569000,'hamilton.ca'],
 ['London','ON',42.98,-81.25,422000,'london.ca'],
 ['Markham','ON',43.86,-79.34,339000,'markham.ca'],
 ['Vaughan','ON',43.84,-79.50,323000,'vaughan.ca'],
 ['Kitchener','ON',43.45,-80.49,257000,'kitchener.ca'],
 ['Windsor','ON',42.31,-83.04,230000,'citywindsor.ca'],
 ['Richmond Hill','ON',43.88,-79.44,202000,'richmondhill.ca'],
 ['Oakville','ON',43.45,-79.68,214000,'oakville.ca'],
 ['Burlington','ON',43.33,-79.80,187000,'burlington.ca'],
 ['Oshawa','ON',43.90,-78.86,175000,'oshawa.ca'],
 ['Greater Sudbury','ON',46.49,-80.99,166000,'greatersudbury.ca','Sudbury'],
 ['Barrie','ON',44.39,-79.69,147000,'barrie.ca'],
 ['Whitby','ON',43.90,-78.94,138000,'whitby.ca'],
 ['Cambridge','ON',43.36,-80.31,138000,'cambridge.ca'],
 ['Guelph','ON',43.55,-80.25,144000,'guelph.ca'],
 ['St. Catharines','ON',43.16,-79.25,137000,'stcatharines.ca','Saint Catharines'],
 ['Kingston','ON',44.23,-76.49,132000,'cityofkingston.ca'],
 ['Milton','ON',43.52,-79.88,133000,'milton.ca'],
 ['Ajax','ON',43.85,-79.02,127000,'ajax.ca'],
 ['Waterloo','ON',43.47,-80.52,121000,'waterloo.ca'],
 ['Thunder Bay','ON',48.38,-89.25,109000,'thunderbay.ca'],
 ['Brantford','ON',43.14,-80.26,105000,'brantford.ca'],
 ['Pickering','ON',43.84,-79.09,99000,'pickering.ca'],
 ['Niagara Falls','ON',43.09,-79.08,94000,'niagarafalls.ca'],
 ['Newmarket','ON',44.05,-79.46,88000,'newmarket.ca'],
 ['Peterborough','ON',44.31,-78.32,84000,'peterborough.ca'],
 ['Sault Ste. Marie','ON',46.52,-84.34,72000,'saultstemarie.ca','Sault Sainte Marie'],
 ['North Bay','ON',46.31,-79.46,53000,'northbay.ca'],
 ['Timmins','ON',48.48,-81.33,41000,'timmins.ca'],
 ['Montréal','QC',45.50,-73.57,1762000,'montreal.ca','Montreal'],
 ['Québec City','QC',46.81,-71.21,549000,'ville.quebec.qc.ca','Quebec City|Ville de Québec|Ville de Quebec'],
 ['Laval','QC',45.61,-73.71,438000,'laval.ca'],
 ['Gatineau','QC',45.48,-75.70,291000,'gatineau.ca'],
 ['Longueuil','QC',45.53,-73.52,254000,'longueuil.quebec'],
 ['Sherbrooke','QC',45.40,-71.90,173000,'sherbrooke.ca'],
 ['Saguenay','QC',48.43,-71.06,145000,'saguenay.ca'],
 ['Lévis','QC',46.80,-71.18,149000,'levis.ca|ville.levis.qc.ca','Levis'],
 ['Trois-Rivières','QC',46.34,-72.54,140000,'v3r.net','Trois Rivieres'],
 ['Terrebonne','QC',45.70,-73.65,119000,'terrebonne.ca|ville.terrebonne.qc.ca'],
 ['Saint-Jean-sur-Richelieu','QC',45.31,-73.26,98000,'sjsr.ca','Saint Jean sur Richelieu'],
 ['Brossard','QC',45.45,-73.46,91000,'brossard.ca'],
 ['Repentigny','QC',45.74,-73.45,86000,'repentigny.ca'],
 ['Drummondville','QC',45.88,-72.48,79000,'drummondville.ca'],
 ['Saint-Jérôme','QC',45.78,-74.00,80000,'vsj.ca','Saint Jerome'],
 ['Granby','QC',45.40,-72.73,69000,'granby.ca'],
 ['Blainville','QC',45.67,-73.88,60000,'blainville.ca'],
 ['Rimouski','QC',48.45,-68.52,49000,'rimouski.ca'],
 ['Rouyn-Noranda','QC',48.24,-79.02,42000,'rouyn-noranda.ca','Rouyn Noranda'],
 ['Calgary','AB',51.05,-114.07,1307000,'calgary.ca'],
 ['Edmonton','AB',53.55,-113.49,1011000,'edmonton.ca'],
 ['Red Deer','AB',52.27,-113.81,101000,'reddeer.ca'],
 ['Lethbridge','AB',49.69,-112.84,98000,'lethbridge.ca'],
 ['St. Albert','AB',53.63,-113.63,68000,'stalbert.ca','Saint Albert'],
 ['Airdrie','AB',51.29,-114.01,74000,'airdrie.ca'],
 ['Medicine Hat','AB',50.04,-110.68,63000,'medicinehat.ca'],
 ['Grande Prairie','AB',55.17,-118.80,64000,'cityofgp.com'],
 ['Strathcona County','AB',53.53,-113.30,99000,'strathcona.ca','Sherwood Park'],
 ['Wood Buffalo','AB',56.73,-111.38,73000,'rmwb.ca','Fort McMurray|Regional Municipality of Wood Buffalo'],
 ['Spruce Grove','AB',53.55,-113.90,38000,'sprucegrove.org'],
 ['Leduc','AB',53.26,-113.55,34000,'leduc.ca'],
 ['Cochrane','AB',51.19,-114.47,32000,'cochrane.ca'],
 ['Okotoks','AB',50.73,-113.98,30000,'okotoks.ca'],
 ['Vancouver','BC',49.28,-123.12,662000,'vancouver.ca'],
 ['Surrey','BC',49.19,-122.85,568000,'surrey.ca'],
 ['Burnaby','BC',49.25,-122.98,249000,'burnaby.ca'],
 ['Richmond','BC',49.17,-123.14,210000,'richmond.ca'],
 ['Abbotsford','BC',49.05,-122.33,154000,'abbotsford.ca'],
 ['Coquitlam','BC',49.28,-122.79,149000,'coquitlam.ca'],
 ['Kelowna','BC',49.89,-119.50,145000,'kelowna.ca'],
 ['Saanich','BC',48.46,-123.38,118000,'saanich.ca'],
 ['Langley Township','BC',49.10,-122.66,132000,'tol.ca','Township of Langley'],
 ['Langley City','BC',49.10,-122.66,29000,'langleycity.ca','City of Langley'],
 ['Delta','BC',49.08,-123.06,108000,'delta.ca'],
 ['Nanaimo','BC',49.17,-123.94,100000,'nanaimo.ca'],
 ['Kamloops','BC',50.67,-120.33,98000,'kamloops.ca'],
 ['Victoria','BC',48.43,-123.37,92000,'victoria.ca'],
 ['Chilliwack','BC',49.16,-121.95,93000,'chilliwack.com'],
 ['Maple Ridge','BC',49.22,-122.60,91000,'mapleridge.ca'],
 ['North Vancouver','BC',49.32,-123.07,58000,'cnv.org'],
 ['North Vancouver District','BC',49.36,-123.07,88000,'dnv.org','District of North Vancouver'],
 ['New Westminster','BC',49.21,-122.91,79000,'newwestcity.ca'],
 ['Prince George','BC',53.92,-122.75,77000,'princegeorge.ca'],
 ['Port Coquitlam','BC',49.26,-122.78,61000,'portcoquitlam.ca'],
 ['Penticton','BC',49.50,-119.59,37000,'penticton.ca'],
 ['Winnipeg','MB',49.90,-97.14,750000,'winnipeg.ca'],
 ['Brandon','MB',49.85,-99.95,51000,'brandon.ca'],
 ['Steinbach','MB',49.53,-96.69,18000,'steinbach.ca'],
 ['Thompson','MB',55.74,-97.86,13000,'thompson.ca'],
 ['Saskatoon','SK',52.13,-106.67,266000,'saskatoon.ca'],
 ['Regina','SK',50.45,-104.62,226000,'regina.ca'],
 ['Prince Albert','SK',53.20,-105.75,38000,'citypa.ca'],
 ['Moose Jaw','SK',50.39,-105.55,34000,'moosejaw.ca'],
 ['Lloydminster','AB',53.28,-110.01,31000,'lloydminster.ca'],
 ['Halifax','NS',44.65,-63.58,440000,'halifax.ca'],
 ['Cape Breton','NS',46.14,-60.19,94000,'cbrm.ns.ca','Sydney|Cape Breton Regional Municipality'],
 ['Truro','NS',45.37,-63.28,13000,'truro.ca'],
 ['Moncton','NB',46.09,-64.78,79000,'moncton.ca'],
 ['Saint John','NB',45.27,-66.06,70000,'saintjohn.ca'],
 ['Fredericton','NB',45.96,-66.64,63000,'fredericton.ca'],
 ['Dieppe','NB',46.10,-64.69,28000,'dieppe.ca'],
 ["St. John's",'NL',47.56,-52.71,111000,'stjohns.ca',"Saint Johns|St Johns"],
 ['Mount Pearl','NL',47.52,-52.81,23000,'mountpearl.ca'],
 ['Corner Brook','NL',48.95,-57.95,19000,'cornerbrook.com'],
 ['Happy Valley-Goose Bay','NL',53.30,-60.41,8000,'townhvgb.com','Happy Valley Goose Bay|Goose Bay'],
 ['Charlottetown','PE',46.24,-63.13,39000,'charlottetown.ca'],
 ['Summerside','PE',46.39,-63.79,16000,'summerside.ca'],
 ['Whitehorse','YT',60.72,-135.06,28000,'whitehorse.ca'],
 ['Dawson City','YT',64.06,-139.43,1600,'cityofdawson.ca','Dawson'],
 ['Yellowknife','NT',62.45,-114.38,20000,'yellowknife.ca'],
 ['Hay River','NT',60.82,-115.79,3200,'hayriver.com'],
 ['Inuvik','NT',68.36,-133.72,3100,'inuvik.ca'],
 ['Iqaluit','NU',63.75,-68.52,7400,'iqaluit.ca'],
 ['Rankin Inlet','NU',62.81,-92.09,3000,'rankininlet.ca'],
 ['Arviat','NU',61.11,-94.06,2900,'arviat.ca'],
];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const slug = value => normalize(value).replace(/ /g, '-');
export const MUNICIPALITIES = Object.freeze(cityRows.map(([name, province, lat, lon, population, domain, aliases='']) => Object.freeze({id: `${slug(name)}-${province.toLowerCase()}`, name, province, lat, lon, population, domains: Object.freeze(domain.split('|')), aliases: Object.freeze([name, ...aliases.split('|').filter(Boolean)])})));
const provincesByCode = new Map(PROVINCES.map(p => [p.code, p]));
const citiesById = new Map(MUNICIPALITIES.map(c => [c.id, c]));
const unique = values => [...new Set(values)];
const mentions = (text, term) => (` ${normalize(text)} `).includes(` ${normalize(term)} `);
const provinceAliases = {BC:['Colombie Britannique'], NL:['Newfoundland', 'Labrador', 'Terre Neuve', 'Terre Neuve et Labrador'], NT:['NWT', 'Northwest Territory', 'Territoires du Nord Ouest'], NS:['Nouvelle Ecosse'], NB:['Nouveau Brunswick'], PE:['PEI', 'P.E.I.', 'Ile du Prince Edouard'], QC:['Québec', 'Quebec'], YT:['Yukon Territory']};
function provinceMentions(text) {
  return PROVINCES.filter(p => mentions(text, p.en) || mentions(text, p.fr) || (provinceAliases[p.code] || []).some(alias => mentions(text, alias)) || new RegExp(`(?:\\b(?:in|en|au|province|territory|territoire)\\s*:?\\s+|,\\s*)${p.code}\\b`, 'i').test(text) || new RegExp(`^\\s*${p.code}\\s*$`, 'i').test(text)).map(p => p.code);
}
function explicitContext(text) {
  const cities = MUNICIPALITIES.filter(c => c.aliases.some(alias => mentions(text, alias))).sort((a,b) => b.name.length - a.name.length);
  // Suppress shorter nested names (Vancouver inside North Vancouver, Richmond inside Richmond Hill).
  let destinationChosen = false;
  let filtered = cities.filter(c => !cities.some(other => other !== c && normalize(other.name).includes(normalize(c.name))));
  const plain = normalize(text);
  const lastPosition = c => Math.max(...c.aliases.map(alias => plain.lastIndexOf(normalize(alias))));
  filtered.sort((a,b) => lastPosition(b)-lastPosition(a));
  // A stated destination controls services there, rather than the user's previous home.
  if (/\b(?:mov(?:e|ing)|relocat(?:e|ing)|demenag\w*)\b/.test(plain) && filtered.length > 1) {
    const destination = filtered.find(c => c.aliases.some(alias => new RegExp(`(?:to|a|vers) ${normalize(alias)}(?: |$)`).test(plain)));
    if (destination) {filtered = [destination]; destinationChosen = true;}
  }
  const codes = unique([...filtered.map(c => c.province), ...(destinationChosen ? [] : provinceMentions(text))]);
  if (filtered.some(c => c.id === 'lloydminster-ab')) codes.push('SK');
  return {cities: filtered, codes: unique(codes)};
}
function geoProvince(cf) {
  const code = String(cf.regionCode || '').toUpperCase().replace(/^CA-/, '');
  if (provincesByCode.has(code)) return code;
  return PROVINCES.find(p => normalize(p.en) === normalize(cf.region) || normalize(p.fr) === normalize(cf.region))?.code || null;
}
function manualContext(location) {
  if (!location || typeof location !== 'object') return null;
  const code = String(location.provinceCode || location.province || '').toUpperCase();
  const cityKey = location.municipalityId || location.cityId || location.municipality || location.id;
  const city = citiesById.get(cityKey) || MUNICIPALITIES.find(c => slug(c.name)===cityKey && (!code || c.province===code));
  if (city) return {cities:[city], codes: city.id === 'lloydminster-ab' ? ['AB','SK'] : [city.province]};
  if (provincesByCode.has(code)) return {cities:[], codes:[code]};
  return null;
}
export function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = n => n * Math.PI / 180;
  const dLat = radians(lat2 - lat1), dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLon/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function nearby(lat, lon, codes, anchors=[]) {
  const distances = MUNICIPALITIES.map(c => ({...c, distanceKm: Math.round(distanceKm(lat,lon,c.lat,c.lon)), score: c.population**0.35 / (distanceKm(lat,lon,c.lat,c.lon)+25)**1.7}));
  const local = distances.filter(c => codes.includes(c.province) ? c.distanceKm <= 300 : c.distanceKm <= 100);
  // Always include the actual matching city; nearby larger municipalities are suggestions only.
  const ordered = local.sort((a,b) => b.score-a.score);
  const nearestSameProvince = distances.filter(c => codes.includes(c.province)).sort((a,b) => a.distanceKm-b.distanceKm);
  const prioritized = [...anchors.map(a => distances.find(c => c.id===a.id)), ...ordered];
  if (!local.length) prioritized.push(...nearestSameProvince.slice(0,3));
  return [...new Map(prioritized.filter(Boolean).map(c => [c.id,c])).values()].slice(0,8).map(({score, aliases, ...c}) => c);
}
/** Location is an approximate routing hint. An explicit question location outranks a manual selection.
 * History is considered newest-first and user messages only, so assistant/source text cannot alter scope. */
export function selectJurisdictions(cf={}, {query='', messages=[], location=null}={}) {
  let ctx = explicitContext(query), basis='explicit', inferred=false;
  if (!ctx.codes.length) {
    const manual = manualContext(location);
    if (manual) {ctx=manual; basis='selected';}
    else {
      const recent = [...messages].reverse().filter(m => m.role==='user').map(m => explicitContext(typeof m.content==='string' ? m.content : '')).find(c => c.codes.length);
      if (recent) ctx=recent;
      else {
        const code = geoProvince(cf);
        if (cf.country === 'CA' && code) {
          const city = MUNICIPALITIES.find(c => c.province===code && c.aliases.some(alias => normalize(alias)===normalize(cf.city)));
          ctx={cities:city?[city]:[], codes:city?.id==='lloydminster-ab'?['AB','SK']:[code]}; basis='geolocation'; inferred=true;
        } else {ctx={cities:[], codes:PROVINCES.map(p=>p.code)}; basis='national';}
      }
    }
  }
  let municipalities=[];
  if (basis!=='national') {
    const anchor=ctx.cities[0];
    const lat=anchor?.lat ?? (basis==='geolocation' ? Number(cf.latitude) : NaN);
    const lon=anchor?.lon ?? (basis==='geolocation' ? Number(cf.longitude) : NaN);
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat>=40 && lat<=84 && lon>=-142 && lon<=-50) {
      municipalities=nearby(lat,lon,ctx.codes,ctx.cities);
      ctx.codes=unique([...ctx.codes,...municipalities.filter(c=>c.distanceKm<=100).map(c=>c.province)]);
    } else if (ctx.cities.length) municipalities=ctx.cities.map(({aliases,...c})=>({...c,distanceKm:0}));
    else municipalities=MUNICIPALITIES.filter(c=>ctx.codes.includes(c.province)).sort((a,b)=>b.population-a.population).slice(0,6).map(({aliases,...c})=>({...c,distanceKm:null}));
  }
  const domains=unique([...FEDERAL_DOMAINS,...ctx.codes.flatMap(code=>provincesByCode.get(code)?.domains||[]),...municipalities.flatMap(c=>c.domains)]).slice(0,300);
  const names=ctx.codes.map(code=>provincesByCode.get(code)?.en).filter(Boolean);
  const label=basis==='national'?'Canada':ctx.cities.length?unique(ctx.cities.map(c=>c.name)).join(', '):basis==='geolocation'&&cf.city?`${cf.city}, ${names[0]}`:names.join(' / ');
  return {country:'CA', provinceCodes:ctx.codes, municipalities, domains, label, basis, inferred};
}
export function publicContext(selection) {
  return {country:selection.country, provinceCodes:selection.provinceCodes, municipalities:selection.municipalities.map(({id,name,province,distanceKm})=>({id,name,province,distanceKm})), label:selection.label,basis:selection.basis,inferred:selection.inferred};
}
/** Exact host or its subdomain only; never a string suffix without a dot boundary. */
export function isAllowedUrl(value, domains=[]) {
  try {
    const url=new URL(value);
    if (url.protocol!=='https:' || url.username || url.password || (url.port && url.port!=='443')) return false;
    const host=url.hostname.toLowerCase();
    if (host.endsWith('.') || /^\d+(?:\.\d+){3}$/.test(host) || host.includes(':') || host==='localhost') return false;
    return domains.some(d=>typeof d==='string' && /^[a-z0-9.-]+$/.test(d) && (host===d || host.endsWith(`.${d}`)));
  } catch {return false;}
}
export function canonicalUrl(value) {
  try {
    const url=new URL(value); url.hash='';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_.+|gclid|fbclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    // Preserve the checked hostname: some official hosts have TLS only on www.
    // Redirect validation establishes a working alias; guessing one can break links.
    return url.toString();
  } catch {return null;}
}
const federalAgencies = [
 ['cra','Canada Revenue Agency','Agence du revenu du Canada', /\/(?:en\/revenue-agency|fr\/agence-revenu)(?:\/|$)/],
 ['ircc','Immigration, Refugees and Citizenship Canada','Immigration, Réfugiés et Citoyenneté Canada', /\/(?:en\/immigration-refugees-citizenship|fr\/immigration-refugies-citoyennete)(?:\/|$)/],
 ['esdc','Employment and Social Development Canada','Emploi et Développement social Canada', /\/(?:en\/(?:employment-social-development|services\/(?:benefits|jobs))|fr\/(?:emploi-developpement-social|services\/(?:prestations|emplois)))(?:\/|$)/],
 ['health','Health Canada','Santé Canada', /\/(?:en\/(?:health-canada|services\/health)|fr\/(?:sante-canada|services\/sante))(?:\/|$)/],
 ['transport','Transport Canada','Transports Canada', /\/(?:en\/transport-canada|fr\/transports-canada)(?:\/|$)/],
 ['service-canada','Service Canada','Service Canada', /\/(?:en\/employment-social-development\/corporate\/portfolio\/service-canada|fr\/emploi-developpement-social\/ministere\/portefeuille\/service-canada)(?:\/|$)/],
];
function agency(id,en,fr,jurisdiction,domain) {return {id,name:{en,fr},jurisdiction,domain,monogram:en.split(/[\s,-]+/).filter(Boolean).slice(0,3).map(s=>s[0]).join('').toUpperCase()};}
export function agencyForUrl(value) {
  try {
    const url=new URL(value), host=url.hostname.toLowerCase().replace(/^www\./,'');
    if (host==='canada.ca' || host.endsWith('.canada.ca')) {
      const match=[...federalAgencies].reverse().find(([, , ,pattern])=>pattern.test(url.pathname));
      return match?agency(...match.slice(0,3),'federal','canada.ca'):agency('canada','Government of Canada','Gouvernement du Canada','federal','canada.ca');
    }
    const dedicated=[['cra',['cra-arc.gc.ca'],'Canada Revenue Agency','Agence du revenu du Canada'],['ircc',['cic.gc.ca'],'Immigration, Refugees and Citizenship Canada','Immigration, Réfugiés et Citoyenneté Canada'],['justice',['justice.gc.ca'],'Department of Justice Canada','Ministère de la Justice Canada'],['statcan',['statcan.gc.ca'],'Statistics Canada','Statistique Canada'],['service-canada',['servicecanada.gc.ca'],'Service Canada','Service Canada'],['job-bank',['jobbank.gc.ca','guichetemplois.gc.ca'],'Job Bank','Guichet-Emplois'],['parliament',['parl.ca','ourcommons.ca','sencanada.ca'],'Parliament of Canada','Parlement du Canada'],['bank-of-canada',['bankofcanada.ca'],'Bank of Canada','Banque du Canada']];
    for (const [id,domains,en,fr] of dedicated) if (domains.some(d=>host===d||host.endsWith(`.${d}`))) return agency(id,en,fr,'federal',domains[0]);
    const city=MUNICIPALITIES.find(c=>c.domains.some(d=>host===d||host.endsWith(`.${d}`)));
    if (city) return agency(city.id,city.name,city.name,'municipal',city.domains[0]);
    const province=PROVINCES.find(p=>p.domains.some(d=>host===d||host.endsWith(`.${d}`)));
    if (province) return agency(province.id,`Government of ${province.en}`,`Gouvernement — ${province.fr}`,['NT','NU','YT'].includes(province.code)?'territorial':'provincial',province.domains[0]);
    if (host==='gc.ca'||host.endsWith('.gc.ca')) return agency('canada','Government of Canada','Gouvernement du Canada','federal','gc.ca');
    return agency(host,host,host,'unknown',host);
  } catch {return agency('unknown','Official source','Source officielle','unknown','');}
}
