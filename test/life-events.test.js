import test from 'node:test';
import assert from 'node:assert/strict';
import {londonBusiness as event} from '../src/life-events/london-business.js';
import {applies, defaultAnswers, resolveChecklist, setComplete, reconcileProgress, readState, saveState, validateEvent, storageKey} from '../src/life-events/engine.js';
import {isBusinessEntry} from '../src/life-events/intent.js';
import {isAllowedUrl} from '../src/jurisdictions.js';

const answers = changes => ({...defaultAnswers(event), ...changes});
const step = (id, a, progress = {}) => resolveChecklist(event, a, progress).find(s => s.id === id);
const completeInOrder = a => {
  let progress = {};
  for (const s of event.steps) progress = setComplete(event, a, progress, s.id, true);
  return progress;
};

test('the dataset has ordered, noncyclic dependencies and official evidence for every step', () => {
  assert.equal(validateEvent(event), true);
  for (const s of event.steps) {
    for (const evidence of s.sources) assert.ok(isAllowedUrl(evidence.url, ['canada.ca','ontario.ca','gov.on.ca','london.ca','wsib.ca']), evidence.url);
    assert.ok(s.description && s.why && s.completionCriteria && s.documentsNeeded.length);
  }
  const broken = structuredClone(event); broken.steps[0].dependencies = [{stepId: 'structure'}];
  assert.throws(() => validateEvent(broken), /dependency/);
});

test('three-valued branching never hides an unknown requirement', () => {
  const r = {field: 'hire', in: ['yes']};
  assert.equal(applies(r, {hire:'unknown'}), null);
  assert.equal(applies({all:[r, {field:'name', in:['other']}]}, {name:'legal'}), false);
  assert.equal(applies({any:[r, {field:'name', in:['other']}]}, {name:'other'}), true);
  assert.equal(step('licence-application', answers()).status, 'needs-confirmation');
  assert.equal(step('licence-check', answers()).status, 'needs-confirmation');
});

test('ordinary sole proprietor, exact name, no employees avoids unnecessary registrations', () => {
  const a = answers({name:'legal', licence:'no'});
  for (const id of ['incorporate-on','incorporate-fed','federal-ontario','initial-return','register-name','payroll','wsib','gst-register','trade','licence-application']) assert.equal(step(id,a).applicability,false,id);
  assert.equal(step('home',a).applicability,true);
  assert.equal(step('records',a).applicability,true);
  const progress=completeInOrder(a);
  assert.ok(resolveChecklist(event,a,progress).filter(s=>s.applicability===true).every(s=>s.status==='complete'));
});

test('federal and Ontario routes remain distinct and trade names work for corporations', () => {
  const on=answers({structure:'ontario-corporation',name:'legal'});
  assert.equal(step('incorporate-on',on).applicability,true);
  assert.equal(step('initial-return',on).applicability,true);
  assert.equal(step('incorporate-fed',on).applicability,false);
  assert.equal(step('register-name',on).applicability,false);
  const fed=answers({structure:'federal-corporation',name:'different'});
  assert.equal(step('federal-ontario',fed).applicability,true);
  assert.equal(step('register-name',fed).applicability,true);
  assert.equal(step('initial-return',fed).applicability,false);
});

test('GST cases distinguish threshold, exempt, unknown and voluntary registration', () => {
  for(const gst of ['below','exempt']) assert.equal(step('gst-register',answers({gst})).applicability,false);
  for(const gst of ['single','multiple','voluntary']) assert.equal(step('gst-register',answers({gst})).applicability,true);
  assert.equal(step('gst-register',answers({gst:'unknown'})).applicability,null);
  assert.equal(step('gst-review',answers({gst:'unknown'})).status,'needs-confirmation');
});

test('hiring, commercial premises, specialist and border activity activate appropriate branches', () => {
  const a=answers({employees:'yes',premises:'commercial',regulated:'yes',trade:'import',sign:'yes',licence:'yes'});
  for(const id of ['payroll','employment','wsib','building','specialist','trade','sign-permit','licence-application']) assert.equal(step(id,a).applicability,true,id);
  assert.equal(step('home',a).applicability,false);
  assert.equal(step('wsib',answers({regulated:'yes',employees:'no'})).applicability,true);
  assert.equal(step('building',answers({premises:'home',renovations:'yes'})).applicability,true);
});

test('unresolved applicability and prerequisites cannot be marked complete', () => {
  assert.deepEqual(setComplete(event,answers(),{},'licence-application',true),{});
  assert.deepEqual(setComplete(event,answers(),{},'register-name',true),{});
  assert.deepEqual(setComplete(event,answers({structure:'unknown'}),{},'structure',true),{});
  let progress=setComplete(event,answers(),{},'structure',true);
  progress=setComplete(event,answers(),progress,'register-name',true);
  assert.equal(step('register-name',answers(),progress).status,'complete');
  progress=setComplete(event,answers(),progress,'structure',false);
  assert.equal(step('register-name',answers(),progress).status,'blocked');
  assert.equal(progress['register-name'],undefined);
});

test('changing a profile clears affected completion and descendants but preserves unrelated work', () => {
  const a=answers({licence:'yes'});const progress=completeInOrder(a);
  assert.equal(step('licence-application',a,progress).status,'complete');
  const changed={...a,name:'legal'};
  const next=reconcileProgress(event,changed,progress);
  assert.equal(next['register-name'],undefined);
  assert.equal(next['licence-application'],undefined);
  assert.ok(next.location);
  const switched={...a,structure:'federal-corporation'};
  const fresh=reconcileProgress(event,switched,progress);
  assert.equal(fresh.structure,undefined);
  assert.equal(fresh['register-name'],undefined);
  assert.equal(fresh['business-number'],undefined);
  assert.ok(fresh.location);
});

test('all fully answered branch combinations can complete without hidden dependency deadlocks', () => {
  for (const structure of ['sole','ontario-corporation','federal-corporation'])
  for (const name of ['legal','different'])
  for (const premises of ['home','commercial','mobile'])
  for (const employees of ['yes','no'])
  for (const gst of ['below','single','multiple','voluntary','exempt'])
  for (const licence of ['yes','no']) {
    const a=answers({structure,name,premises,employees,gst,licence,regulated:'yes',trade:'both',sign:'yes'});
    const progress=completeInOrder(a);
    assert.ok(resolveChecklist(event,a,progress).filter(s=>s.applicability===true).every(s=>s.status==='complete'),JSON.stringify(a));
  }
});

test('saved progress survives reload, rejects corrupt state and handles unavailable storage', () => {
  const records=new Map();const storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
  const a=answers({licence:'no'});
  const original={answers:a,confirmed:true,progress:completeInOrder(a)};
  assert.equal(saveState(event,original,storage),true);
  assert.deepEqual(readState(event,storage).progress,original.progress);
  records.set(storageKey(event),'{broken');assert.match(readState(event,storage).warning,/could not be read/);
  records.set(storageKey(event),JSON.stringify({version:0,...original}));assert.equal(readState(event,storage).confirmed,false);
  records.set(storageKey(event),JSON.stringify({version:event.version,...original,answers:{...a,structure:'<script>'}}));assert.equal(readState(event,storage).confirmed,false);
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
  assert.equal(saveState(event,original,blocked),false);
  assert.match(readState(event,blocked).warning,/could not be read/);
});

test('chat offers only a narrow business-entry invitation without hijacking other cities or specific questions', () => {
  for(const q of ['How do I start a small business?','I want to start a business. What exactly do I need to do?','Start a business in London, Ontario','I want to open a business']) assert.equal(isBusinessEntry(q),true,q);
  for(const q of ['How do I start a business in Toronto?','How do I start a business in London, UK?','What are the GST rules for my business?','How do I close a business?','I do not want to start a business']) assert.equal(isBusinessEntry(q),false,q);
});
