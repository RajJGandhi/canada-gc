import test from 'node:test';
import assert from 'node:assert/strict';
import {PROVINCES,MUNICIPALITIES,selectJurisdictions,isAllowedUrl,canonicalUrl,agencyForUrl,publicContext} from '../src/jurisdictions.js';
const toronto={country:'CA',regionCode:'ON',city:'Toronto',latitude:'43.65',longitude:'-79.38'};
test('registry includes every province and territory and nationwide municipal coverage',()=>{
 assert.equal(PROVINCES.length,13); assert.ok(MUNICIPALITIES.length>=100);
 assert.equal(new Set(MUNICIPALITIES.map(c=>c.id)).size,MUNICIPALITIES.length);
 for(const province of PROVINCES) assert.ok(MUNICIPALITIES.some(c=>c.province===province.code));
 for(const p of [...PROVINCES,...MUNICIPALITIES]) for(const d of p.domains) assert.ok(isAllowedUrl(`https://${d}/`,[d]));
});
test('Toronto geolocation includes large nearby suburbs without unrelated far-away cities',()=>{
 const s=selectJurisdictions(toronto);
 assert.equal(s.basis,'geolocation'); assert.equal(s.inferred,true);
 assert.ok(s.domains.includes('toronto.ca')); assert.ok(s.domains.includes('mississauga.ca'));
 assert.ok(s.domains.includes('brampton.ca')); assert.ok(!s.domains.includes('ottawa.ca'));
 assert.ok(s.domains.length<=300);
});
test('Ottawa and Gatineau cross-provincial government sources are considered',()=>{
 const s=selectJurisdictions({country:'CA',regionCode:'ON',city:'Ottawa',latitude:45.42,longitude:-75.70});
 assert.ok(s.provinceCodes.includes('ON')); assert.ok(s.provinceCodes.includes('QC'));
 assert.ok(s.domains.includes('gatineau.ca')); assert.ok(s.domains.includes('quebec.ca'));
});
test('explicit Edmonton question overrides Toronto geolocation',()=>{
 const s=selectJurisdictions(toronto,{query:'How do I open a bakery in Edmonton?'});
 assert.equal(s.basis,'explicit'); assert.equal(s.inferred,false);
 assert.equal(s.municipalities[0].id,'edmonton-ab'); assert.deepEqual(s.provinceCodes,['AB']);
 assert.ok(!s.domains.includes('toronto.ca'));
});
test('moving destination takes precedence over former home',()=>{
 const s=selectJurisdictions(toronto,{query:'I live in Edmonton but want to move to Toronto. How do I register my car?'});
 assert.equal(s.municipalities[0].id,'toronto-on'); assert.deepEqual(s.provinceCodes,['ON']);
});
test('French municipality names and accents are recognized',()=>{
 assert.equal(selectJurisdictions(toronto,{query:'Quels permis faut-il pour ouvrir un café à Montréal ?'}).municipalities[0].id,'montreal-qc');
 assert.equal(selectJurisdictions(toronto,{query:'Je veux un permis à Lévis.'}).municipalities[0].id,'levis-qc');
});
test('province abbreviations do not match arbitrary embedded strings or ordinary on',()=>{
 assert.equal(selectJurisdictions({}, {query:'What is an ABC tax? How much tax on dividends?'}).basis,'national');
 assert.deepEqual(selectJurisdictions({}, {query:'What permits are needed in BC?'}).provinceCodes,['BC']);
});
test('manual location accepts validated frontend IDs, rejects unapproved domain injection',()=>{
 const s=selectJurisdictions(toronto,{location:{province:'AB',municipality:'edmonton'}});
 assert.equal(s.basis,'selected'); assert.equal(s.municipalities[0].id,'edmonton-ab');
 const invalid=selectJurisdictions(toronto,{location:{province:'evil.example',municipality:'https://evil.example'}});
 assert.equal(invalid.basis,'geolocation'); assert.ok(!invalid.domains.includes('evil.example'));
});
test('history only reads user locations and current explicit question wins',()=>{
 const messages=[{role:'user',content:'I live in Edmonton.'},{role:'assistant',content:'Toronto is in Ontario.'}];
 assert.equal(selectJurisdictions(toronto,{query:'What next?',messages}).municipalities[0].id,'edmonton-ab');
 assert.equal(selectJurisdictions(toronto,{query:'What about Vancouver?',messages}).municipalities[0].id,'vancouver-bc');
});
test('remote and rural locations stay within relevant territory or province',()=>{
 const inuvik=selectJurisdictions({country:'CA',regionCode:'NT',city:'Inuvik',latitude:68.36,longitude:-133.72});
 assert.equal(inuvik.municipalities[0].id,'inuvik-nt'); assert.ok(inuvik.domains.includes('gov.nt.ca'));
 const remote=selectJurisdictions({country:'CA',regionCode:'NU',city:'Resolute',latitude:74.7,longitude:-94.8});
 assert.ok(remote.municipalities.every(c=>c.province==='NU')); assert.ok(remote.domains.includes('gov.nu.ca'));
 const rural=selectJurisdictions({country:'CA',regionCode:'SK',city:'La Ronge',latitude:55.1,longitude:-105.3});
 assert.ok(rural.provinceCodes.includes('SK')); assert.ok(!rural.domains.includes('toronto.ca'));
});
test('non-Canada and missing geolocation use national fallback rather than guessing a city',()=>{
 for(const cf of [{},{country:'US',regionCode:'ON',city:'Toronto'}]) {
 const s=selectJurisdictions(cf); assert.equal(s.basis,'national'); assert.equal(s.municipalities.length,0); assert.equal(s.provinceCodes.length,13);
 }
});
test('Lloydminster includes both provincial jurisdictions',()=>{
 const s=selectJurisdictions({}, {query:'I am opening a store in Lloydminster.'});
 assert.ok(s.provinceCodes.includes('AB')); assert.ok(s.provinceCodes.includes('SK'));
});
test('hostname allowlist rejects suffix abuse, credentials, non-HTTPS and local hosts',()=>{
 const domains=['canada.ca','gc.ca'];
 assert.ok(isAllowedUrl('https://www.canada.ca/en.html',domains)); assert.ok(isAllowedUrl('https://laws-lois.justice.gc.ca/eng/',domains));
 for(const value of ['https://evilcanada.ca','https://canada.ca.evil.example/','https://canada.ca@evil.example','https://x:secret@canada.ca','http://canada.ca','https://127.0.0.1','https://[::1]/','https://canada.ca:8443','https://canada.ca./']) assert.equal(isAllowedUrl(value,domains),false,value);
 assert.equal(isAllowedUrl('https://canada.ca',[]),false);
});
test('canonicalization preserves important resource query parameters and removes tracking aliases',()=>{
 assert.equal(canonicalUrl('https://www.canada.ca/en/test?utm_source=x&Lang=F#section'),'https://www.canada.ca/en/test?Lang=F');
 assert.equal(canonicalUrl('not a url'),null);
});
test('shared canada.ca paths have separate agency identities and bilingual labels',()=>{
 assert.equal(agencyForUrl('https://www.canada.ca/en/revenue-agency/services/tax.html').id,'cra');
 assert.equal(agencyForUrl('https://www.canada.ca/fr/immigration-refugies-citoyennete/services/passeports.html').id,'ircc');
 assert.equal(agencyForUrl('https://www.canada.ca/en/services/benefits/ei.html').id,'esdc');
 assert.equal(agencyForUrl('https://laws-lois.justice.gc.ca/eng/acts/').id,'justice');
 assert.equal(agencyForUrl('https://www.toronto.ca/services/').jurisdiction,'municipal');
 const context=publicContext(selectJurisdictions(toronto)); assert.equal(context.municipalities[0].lat,undefined);
});

test('official replacement domains and validated hostnames stay usable',()=>{
 const levis=selectJurisdictions({}, {query:'Permis à Lévis'});
 assert.ok(levis.domains.includes('levis.ca')); assert.ok(levis.domains.includes('ville.levis.qc.ca'));
 assert.ok(selectJurisdictions({}, {query:'Saint-Jérôme'}).domains.includes('vsj.ca'));
 assert.ok(!selectJurisdictions({}, {query:'Saint-Jérôme'}).domains.includes('villesaintjerome.ca'));
 assert.equal(canonicalUrl('https://www.cornerbrook.com/a?utm_source=x'),'https://www.cornerbrook.com/a');
 assert.equal(isAllowedUrl('https://company.bc.ca',['gov.bc.ca']),false);
});
