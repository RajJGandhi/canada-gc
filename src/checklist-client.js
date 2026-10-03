import {londonBusiness as event} from './life-events/london-business.js';
import {applies, defaultAnswers, readState, saveState, resolveChecklist, reconcileProgress, setComplete, storageKey} from './life-events/engine.js';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
let storage;
try { storage = window.localStorage; } catch { /* Private/blocked storage: usable in memory. */ }
let state = readState(event, storage);
let filter = 'all';
let sourceFilter = 'all';
const opened = new Set();
const announce = message => { $('announcement').textContent = message; };
const list = values => `<ul>${values.map(v => `<li>${escape(v)}</li>`).join('')}</ul>`;
const link = s => `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;
const ruleFields = rule => !rule ? [] : rule.field ? [rule.field] : (rule.all || rule.any || []).flatMap(ruleFields);
const requirementLabel = s => s.requirement === 'required' ? (s.kind === 'check' ? 'Required check' : 'Required') : s.requirement === 'optional' ? 'Recommended' : 'Conditional';
const levelLabel = {federal: 'Federal', provincial: 'Ontario', municipal: 'London'};
const allSources = [...new Map(event.steps.flatMap(s => s.sources).map(s => [s.url, s])).values()];

// Reuse the site shell, without initializing chat, retrieval, speech or PDF APIs.
document.documentElement.lang = 'en';
document.title = `${event.title} · Gov by Build Canada`;
document.body.classList.add('checklist-mode');
$('composer').hidden = true;
$('main').innerHTML = `
  <div class="le-wrap">
    <nav class="le-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Starting a business</span></nav>
    <section class="le-hero" aria-labelledby="le-title">
      <div><p class="le-eyebrow"><span class="le-dot" aria-hidden="true"></span> YOUR GOVERNMENT TO-DO LIST</p>
      <h1 id="le-title">Start a business<br><em>in London, Ontario.</em></h1>
      <p class="le-intro">From your first decision to your opening day.<br>One clear checklist, across three levels of government.</p>
      <div class="le-trust"><span>Official sources at every step</span><span>No account needed</span><span>Saved on this device</span></div></div>
      <aside class="le-hero-note"><span class="le-note-number" aria-hidden="true">01</span><p>A little less searching.<br>A lot more doing.</p><a href="#le-checklist">Explore your steps <span aria-hidden="true">↓</span></a></aside>
    </section>
    <div class="le-scope"><span class="le-pill">LONDON PILOT</span><p>For a new small service or retail business. Specialist industries and cross-border trade include a handoff for additional requirements. <button type="button" id="le-scope-button">See what’s covered</button></p></div>
    <div class="le-layout">
      <aside class="le-sidebar" aria-label="Business choices and progress">
        <section class="le-progress-box" aria-labelledby="le-progress-title"><p class="le-eyebrow" id="le-progress-title">YOUR PROGRESS</p><div id="le-progress-copy"></div><progress id="le-progress" max="100" value="0" aria-label="Checklist completion"></progress><p id="le-save-status" role="status"></p><button type="button" class="le-reset" id="le-reset">Reset checklist</button></section>
        <details class="le-profile" id="le-profile" open><summary><span>Your business choices<small id="le-profile-status">Start with an example</small></span><span aria-hidden="true">⌄</span></summary>
          <div class="le-profile-body"><p class="le-profile-intro">We’ve started with a sole proprietor working from home. Review these choices to make the plan yours. No names, addresses or identifiers are collected.</p><form id="le-profile-form">
          ${event.questions.map((q, index) => ` ${index === 5 ? '<details class="le-extra" id="le-extra"><summary>Permissions &amp; other activities <span>5 more choices</span></summary>' : ''}<div class="le-field ${index >= 5 ? 'le-extra-field' : ''}"><label for="le-q-${q.id}">${escape(q.label)}</label><select id="le-q-${q.id}" name="${q.id}" aria-describedby="le-help-${q.id}">${q.options.map(o => `<option value="${o.value}" ${state.answers[q.id] === o.value ? 'selected' : ''}>${escape(o.label)}</option>`).join('')}</select><p id="le-help-${q.id}">${escape(q.help)}</p></div>`).join('')}</details>
          <button type="submit" class="le-primary" id="le-confirm">Use these choices <span aria-hidden="true">→</span></button></form><p class="le-private">Choices stay in this browser. Changing them updates your steps.</p></div></details>
        <section class="le-help"><span class="le-help-icon" aria-hidden="true">?</span><h2>Not sure where you fit?</h2><p>London’s Business Hub can help you check your activity and location.</p><a href="${event.steps.find(s => s.id === 'location').sources[0].url}" target="_blank" rel="noopener noreferrer">Find the Business Hub ↗</a></section>
      </aside>
      <section class="le-checklist" id="le-checklist" aria-labelledby="le-checklist-title">
        <div class="le-checklist-header"><div><p class="le-eyebrow">YOUR PATH TO OPENING DAY</p><h2 id="le-checklist-title">A clear next step.</h2></div><button type="button" class="le-sources-button" id="le-sources">${allSources.length} official sources <span aria-hidden="true">↗</span></button></div>
        <div id="le-profile-notice"></div><div id="le-next"></div>
        <div class="le-filters"><div role="group" aria-label="Filter checklist status"><button type="button" data-filter="all" aria-pressed="true">All steps</button><button type="button" data-filter="remaining" aria-pressed="false">To do</button><button type="button" data-filter="complete" aria-pressed="false">Completed</button></div><label><span class="sr-only">Filter by government level</span><select id="le-level"><option value="all">All government levels</option><option value="federal">Federal</option><option value="provincial">Ontario</option><option value="municipal">London</option></select></label></div>
        <div id="le-steps"></div><details class="le-excluded" id="le-excluded"><summary id="le-excluded-title"></summary><p>Based on your current choices. Change a choice to include a step again.</p><div id="le-excluded-list"></div></details>
        <div class="le-endnote"><span aria-hidden="true">✓</span><p><strong>Your progress is a record, not an approval.</strong> Check off an application only when its completion criteria are met. Agencies make the final decisions.</p></div>
      </section>
    </div>
  </div>`;
$('footer-disclaimer').textContent = 'An independent checklist, not a government approval. Verify requirements with the linked agencies.';

function persist() {
  const saved = saveState(event, state, storage);
  if (!saved) state.warning = 'This browser is not saving progress. Your changes will last only in this tab.';
  return saved;
}
function showInfo(title, html) {
  $('info-title').textContent = title;
  $('info-content').innerHTML = html;
  $('info-dialog').showModal();
}
function viewStep(id) {
  filter = 'all'; sourceFilter = 'all'; $('le-level').value = 'all'; opened.add(id); render();
  const item = $(`le-step-${id}`);
  item?.scrollIntoView({behavior: 'instant', block: 'center'});
  item?.querySelector('summary')?.focus({preventScroll: true});
}
function stepCard(s, number) {
  const flags = s.ambiguityFlags.filter(f => !f.when || applies(f.when, state.answers) !== false);
  const done = s.status === 'complete';
  const disabled = !state.confirmed || !['ready', 'complete'].includes(s.status);
  const original = event.steps.find(x => x.id === s.id);
  const questionId = [...(s.confirmationFields || []), ...ruleFields(original.applicability.rule)].find(key => state.answers[key] === 'unknown');
  const readiness = s.status === 'needs-confirmation' ? 'Needs confirmation' : s.status === 'blocked' ? 'Earlier step needed' : done ? 'Completed' : '';
  return `<article class="le-card ${done ? 'is-complete' : ''}"><details id="le-step-${s.id}" ${opened.has(s.id) ? 'open' : ''}>
    <summary><span class="le-step-number" aria-hidden="true">${done ? '✓' : String(number).padStart(2, '0')}</span><span class="le-step-heading"><span class="le-badges"><span class="le-jurisdiction ${s.jurisdiction}">${levelLabel[s.jurisdiction]}</span><span class="le-requirement">${requirementLabel(s)}</span>${readiness ? `<span class="le-readiness ${done ? 'done' : ''}">${readiness}</span>` : ''}</span><span class="le-step-title">${escape(s.title)}</span><span class="le-step-description">${escape(s.description)}</span></span><span class="le-chevron" aria-hidden="true">+</span></summary>
    <div class="le-step-content"><p class="le-agency">${escape(s.agency)}</p><div class="le-detail-grid"><section><h3>Why this matters</h3><p>${escape(s.why)}</p></section><section><h3>When it applies</h3><p>${escape(event.steps.find(original => original.id === s.id).applicability.explanation)}</p></section></div>
      ${s.prerequisites.length ? `<h3>Before you start</h3>${list(s.prerequisites)}` : ''}
      ${s.dependencies.filter(d => resolveChecklist(event, state.answers, state.progress).find(p => p.id === d.stepId)?.applicability !== false).length ? `<div class="le-dependencies"><h3>Steps to do first</h3>${s.dependencies.filter(d => resolveChecklist(event, state.answers, state.progress).find(p => p.id === d.stepId)?.applicability !== false).map(d => `<p><button type="button" data-step-link="${d.stepId}">${escape(event.steps.find(p => p.id === d.stepId).title)} →</button><small>${escape(d.reason)}</small></p>`).join('')}</div>` : ''}
      <h3>Have these ready</h3>${list(s.documentsNeeded)}
      <dl class="le-facts"><div><dt>How to complete it</dt><dd>${escape(s.completionMethod.label)}<small>Online: ${escape({'yes':'Yes', 'partial':'Partly', 'information-only':'Guidance only', 'not-applicable':'No application'}[s.completionMethod.online])}</small></dd></div>${s.kind === 'application' ? `<div><dt>Cost</dt><dd>${escape(s.cost.label)}</dd></div><div><dt>Processing time</dt><dd>${escape(s.estimatedTime.label)}</dd></div>` : ''}</dl>
      ${s.notes.length ? `<div class="le-notes">${s.notes.map(n => `<p>${escape(n)}</p>`).join('')}</div>` : ''}
      ${flags.map(f => `<div class="le-ambiguity"><strong>${f.type === 'source-conflict' ? 'Official guidance differs' : f.type === 'scope-limit' ? 'Additional requirements to confirm' : 'Check with the agency'}</strong><p>${escape(f.message)}</p></div>`).join('')}
      <div class="le-step-sources"><h3>Official sources</h3>${s.sources.map(x => `<div>${link(x)}<small>${x.verification === 'indexed-evidence' ? 'Indexed official evidence; full-page access not verified' : 'Official page reviewed'} · ${x.lastVerified}</small></div>`).join('')}</div>
      <div class="le-completion"><label><input type="checkbox" data-complete="${s.id}" ${done ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-describedby="le-criteria-${s.id}"><span>Mark this step complete</span></label><p id="le-criteria-${s.id}">${escape(s.completionCriteria)}</p>${disabled ? `<p class="le-completion-help">${!state.confirmed ? 'Review and confirm your business choices first.' : s.status === 'needs-confirmation' ? 'Update the relevant “Not sure yet” choice before completing this step.' : 'Complete the prerequisite steps above first. You can still read this step now.'}</p>${questionId ? `<button type="button" class="le-edit-choice" data-edit-choice="${questionId}">Update this choice →</button>` : ''}` : ''}</div>
    </div></details></article>`;
}
function render() {
  const steps = resolveChecklist(event, state.answers, state.progress);
  const active = steps.filter(s => s.applicability !== false);
  const essentials = active.filter(s => s.requirement !== 'optional');
  const completed = essentials.filter(s => s.status === 'complete').length;
  const unresolved = essentials.filter(s => s.status === 'needs-confirmation').length;
  const percent = essentials.length ? Math.round(completed / essentials.length * 100) : 0;
  $('le-progress-copy').innerHTML = `<strong>${completed}<span> / ${essentials.length}</span></strong><p>applicable or possible steps complete</p>${unresolved ? `<p class="le-pending">${unresolved} ${unresolved === 1 ? 'step needs' : 'steps need'} confirmation</p>` : ''}`;
  $('le-progress').value = percent;
  $('le-progress').setAttribute('aria-valuetext', `${completed} of ${essentials.length} steps complete; ${unresolved} need confirmation`);
  $('le-save-status').textContent = state.warning || (state.confirmed ? '✓ Progress saved in this browser' : 'Example plan · confirm your choices to begin');
  $('le-save-status').classList.toggle('le-storage-warning', !!state.warning);
  $('le-profile-status').textContent = state.confirmed ? 'Your choices · edit anytime' : 'Example profile · please review';
  $('le-confirm').innerHTML = state.confirmed ? 'Update my checklist <span aria-hidden="true">→</span>' : 'Use these choices <span aria-hidden="true">→</span>';
  $('le-profile-notice').innerHTML = state.confirmed ? '' : '<div class="le-review-notice"><strong>Make sure this plan fits you.</strong><p>The steps below use example choices. Review the business choices, then select “Use these choices”.</p><button type="button" id="le-review">Review my choices →</button></div>';
  $('le-review')?.addEventListener('click', () => { $('le-profile').open = true; $('le-profile').scrollIntoView({block: 'start'}); $('le-q-structure').focus({preventScroll: true}); });
  const next = essentials.find(s => s.status === 'ready');
  const hasScopeLimit = active.some(s => s.ambiguityFlags.some(f => f.type === 'scope-limit'));
  $('le-next').innerHTML = !state.confirmed ? '' : completed === essentials.length ? `<div class="le-next-card"><span class="le-next-icon" aria-hidden="true">✓</span><div><small>CHECKLIST REVIEWED</small><strong>${hasScopeLimit ? 'Core steps reviewed. Follow your specialist checklists.' : 'Your listed steps are complete.'}</strong><p>Keep your records and revisit this plan when your business changes. This is not a legal clearance to open.</p></div></div>` : next ? `<div class="le-next-card"><span class="le-next-icon" aria-hidden="true">→</span><div><small>A GOOD PLACE TO CONTINUE</small><button type="button" data-step-link="${next.id}">${escape(next.title)}</button><p>You can review every step now, including those with prerequisites.</p></div></div>` : '<div class="le-review-notice">Resolve the remaining choices and prerequisites to continue.</div>';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  const visible = active.filter(s => (sourceFilter === 'all' || s.jurisdiction === sourceFilter) && (filter === 'all' || (filter === 'complete' ? s.status === 'complete' : s.status !== 'complete')));
  $('le-steps').innerHTML = visible.length ? event.phases.map((phase, index) => {
    const phaseSteps = visible.filter(s => s.phase === phase.id);
    if (!phaseSteps.length) return '';
    return `<section class="le-phase" aria-labelledby="le-phase-${phase.id}"><div class="le-phase-heading"><span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div><h3 id="le-phase-${phase.id}">${phase.title}</h3><p>${phase.description}</p></div></div>${phaseSteps.map(s => stepCard(s, active.indexOf(s) + 1)).join('')}</section>`;
  }).join('') : '<div class="le-empty"><h3>No steps in this view</h3><p>Try “All steps” or another government level.</p></div>';
  const excluded = steps.filter(s => s.applicability === false);
  $('le-excluded').hidden = !excluded.length;
  $('le-excluded-title').textContent = `${excluded.length} steps not included in your current plan`;
  $('le-excluded-list').innerHTML = excluded.map(s => `<div><strong>${escape(s.title)}</strong><p>${escape(event.steps.find(x => x.id === s.id).applicability.explanation)}</p>${link(s.sources[0])}</div>`).join('');
  document.querySelectorAll('[data-step-link]').forEach(b => b.addEventListener('click', () => viewStep(b.dataset.stepLink)));
  document.querySelectorAll('[data-edit-choice]').forEach(b => b.addEventListener('click', () => { $('le-profile').open = true; $('le-extra').open = true; const field = $(`le-q-${b.dataset.editChoice}`); field.scrollIntoView({block: 'center'}); field.focus({preventScroll: true}); }));
  document.querySelectorAll('.le-card details').forEach(d => d.addEventListener('toggle', () => { const id = d.id.replace('le-step-', ''); if (d.open) opened.add(id); else opened.delete(id); }));
  document.querySelectorAll('[data-complete]').forEach(input => input.addEventListener('change', () => {
    // Capture open state synchronously; toggle events may be queued during DOM replacement.
    document.querySelectorAll('.le-card details').forEach(d => { if (d.open) opened.add(d.id.replace('le-step-', '')); });
    state.progress = setComplete(event, state.answers, state.progress, input.dataset.complete, input.checked);
    const id = input.dataset.complete;
    persist(); render();
    document.querySelector(`[data-complete="${id}"]`)?.focus({preventScroll: true});
    if (!document.querySelector(`[data-complete="${id}"]`)) document.querySelector(`[data-filter="${filter}"]`)?.focus({preventScroll: true});
    announce(`Progress updated. ${resolveChecklist(event, state.answers, state.progress).filter(s => s.status === 'complete').length} steps complete.`);
  }));
}

$('le-profile-form').addEventListener('change', e => {
  if (!event.questions.some(q => q.id === e.target.name)) return;
  const before = Object.keys(state.progress).length;
  state.answers[e.target.name] = e.target.value;
  state.progress = reconcileProgress(event, state.answers, state.progress);
  persist(); render();
  const reset = before - Object.keys(state.progress).length;
  announce(`Checklist updated.${reset ? ` ${reset} affected completion marks cleared; review those steps again.` : ''}`);
});
$('le-profile-form').addEventListener('submit', e => {
  e.preventDefault(); state.confirmed = true; persist(); render();
  if (window.innerWidth <= 900) $('le-profile').open = false;
  $('le-checklist-title').tabIndex = -1; $('le-checklist-title').focus({preventScroll: true});
  $('le-checklist').scrollIntoView({block: 'start'});
  announce('Your choices are confirmed. Your checklist is ready.');
});
$('le-level').addEventListener('change', e => { sourceFilter = e.target.value; render(); announce('Government-level filter updated.'); });
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { filter = button.dataset.filter; render(); announce(`${button.textContent} selected.`); });
$('le-sources').addEventListener('click', () => showInfo('The evidence behind your checklist', `<p>Reviewed ${event.steps[0].lastVerified}. Dates describe this editorial review, not a live check. Some Ontario pages blocked full-page access; those entries use indexed official evidence and are labelled below.</p><div class="le-source-directory">${allSources.map(s => `<p>${link(s)}<small>${s.verification === 'indexed-evidence' ? 'Indexed evidence only' : 'Official page reviewed'} · ${s.lastVerified}</small></p>`).join('')}</div>`));
$('le-scope-button').addEventListener('click', () => showInfo('What this prototype covers', `<p>${escape(event.scope)}</p><p>Required checks apply to every plan; conditional steps depend on your choices. Recommended steps are optional and excluded from the main progress total.</p><p>Marking a check complete records your review. It does not certify that your business is legally ready to open. Regulated activities and customs processes need the additional agency checklists linked in those steps.</p><p>This prototype is currently in English. The existing question service supports English and French.</p>`));
$('le-reset').addEventListener('click', () => {
  showInfo('Reset your checklist?', '<p>This clears your business choices and completion marks for this checklist on this browser.</p><button type="button" class="le-primary" id="le-reset-confirm">Reset this checklist</button> <button type="button" class="text-button" id="le-reset-cancel">Keep my progress</button>');
  $('le-reset-cancel').addEventListener('click', () => $('info-dialog').close());
  $('le-reset-confirm').addEventListener('click', () => {
    state = {answers: defaultAnswers(event), progress: {}, confirmed: false, warning: ''};
    try { storage.removeItem(storageKey(event)); } catch { state.warning = 'Saved data could not be cleared. Browser storage is unavailable.'; }
    for (const q of event.questions) $(`le-q-${q.id}`).value = q.default;
    filter = 'all'; sourceFilter = 'all'; $('le-level').value = 'all'; opened.clear();
    $('info-dialog').close(); $('le-profile').open = true; render(); announce('Checklist reset.');
  });
});
const footerContent = {
  about: ['About this checklist', '<p>Gov is an independent project by Build Canada, not a Government of Canada service. This London pilot turns selected official guidance into a checklist you can work through.</p>'],
  how: ['How it works', '<p>Review your business choices. Open a step for its documents, dependencies, completion criteria and sources. Complete the action with the relevant agency, then mark it here.</p><p>No AI generation or web search runs on this checklist. An editor reviews its official sources. It does not submit forms or create accounts.</p>'],
  privacy: ['Your checklist privacy', '<p>Only the multiple-choice business profile and completion timestamps are saved in this browser’s local storage. They are not submitted to our server or AI providers. No identifiers or documents are requested.</p><p>People using the same browser profile can see this progress. Clearing site data removes it. Use Reset checklist to clear this plan. Following an official link takes you to that agency’s site and privacy policy. The separate chat service has its own privacy disclosure.</p>'],
};
for (const button of document.querySelectorAll('[data-info]')) button.addEventListener('click', () => showInfo(...footerContent[button.dataset.info]));
$('menu-button').addEventListener('click', () => showInfo('A clearer path forward', '<p><a href="/">Ask a government-services question →</a></p><p><a href="/?lang=fr">Poser une question en français →</a></p><p>This is the first guided life-event checklist.</p>'));
for (const button of document.querySelectorAll('[data-language]')) {
  button.setAttribute('aria-pressed', String(button.dataset.language === 'en'));
  button.addEventListener('click', () => { if (button.dataset.language === 'fr') showInfo('Prototype en anglais', '<p lang="fr">Cette liste de vérification est actuellement offerte en anglais. Vos progrès resteront enregistrés dans ce navigateur.</p><p><a href="/?lang=fr" lang="fr">Poser une question en français →</a></p>'); });
}
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
render();
if (window.innerWidth <= 900) $('le-profile').open = false;
if (new URLSearchParams(location.search).get('lang') === 'fr') document.querySelector('[data-language="fr"]').click();
