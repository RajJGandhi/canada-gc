/**
 * A life event is curated content, not a model response. Rules are serializable
 * and evaluated with three-valued logic: an unanswered question is never false.
 * See docs/life-events.md for the schema and its review contract.
 * @typedef {{field:string, in:string[]}|{all:Rule[]}|{any:Rule[]}} Rule
 */
export function applies(rule, answers) {
  if (!rule) return true;
  if (rule.all) {
    const values = rule.all.map(r => applies(r, answers));
    return values.includes(false) ? false : values.includes(null) ? null : true;
  }
  if (rule.any) {
    const values = rule.any.map(r => applies(r, answers));
    return values.includes(true) ? true : values.includes(null) ? null : false;
  }
  const value = answers[rule.field];
  return value == null || value === 'unknown' ? null : rule.in.includes(value);
}

export function defaultAnswers(event) {
  return Object.fromEntries(event.questions.map(q => [q.id, q.default]));
}

export function cleanAnswers(event, input = {}) {
  return Object.fromEntries(event.questions.map(q => [q.id,
    q.options.some(o => o.value === input?.[q.id]) ? input[q.id] : q.default]));
}

export function fingerprint(event, step, answers) {
  return JSON.stringify([event.version, ...step.profileKeys.map(key => answers[key])]);
}

export function resolveChecklist(event, answers, progress = {}) {
  const resolved = [];
  for (const step of event.steps) {
    const applicability = applies(step.applicability.rule, answers);
    const dependencies = step.dependencies.map(d => ({...d, step: resolved.find(s => s.id === d.stepId)}));
    const blockedBy = dependencies.filter(d => d.kind === 'required' && d.step?.applicability !== false && d.step?.status !== 'complete');
    const needsAnswer = step.confirmationFields?.some(key => answers[key] === 'unknown');
    const complete = applicability === true && !needsAnswer && !blockedBy.length && progress[step.id]?.fingerprint === fingerprint(event, step, answers);
    resolved.push({...step, applicability, blockedBy,
      status: applicability === false ? 'not-applicable' : applicability === null || needsAnswer ? 'needs-confirmation' : complete ? 'complete' : blockedBy.length ? 'blocked' : 'ready'});
  }
  return resolved;
}

/** Remove stale completions, including downstream dependencies, on every change. */
export function reconcileProgress(event, answers, progress) {
  return Object.fromEntries(resolveChecklist(event, answers, progress)
    .filter(s => s.status === 'complete').map(s => [s.id, progress[s.id]]));
}

export function setComplete(event, answers, progress, id, complete) {
  const step = resolveChecklist(event, answers, progress).find(s => s.id === id);
  if (!step) return progress;
  const next = {...progress};
  if (!complete) delete next[id];
  else if (step.status === 'ready') next[id] = {fingerprint: fingerprint(event, step, answers), completedAt: new Date().toISOString()};
  return reconcileProgress(event, answers, next);
}

export const storageKey = event => `gov:life-event:${event.id}`;

export function readState(event, storage) {
  const empty = {answers: defaultAnswers(event), progress: {}, confirmed: false, warning: ''};
  try {
    const raw = storage.getItem(storageKey(event));
    if (!raw) return empty;
    const saved = JSON.parse(raw);
    if (saved?.version !== event.version) return {...empty, warning: 'This checklist has been updated. Please review your choices and check the steps again.'};
    const answers = cleanAnswers(event, saved.answers);
    const validAnswers = event.questions.every(q => saved.answers?.[q.id] === answers[q.id]);
    return {answers, progress: reconcileProgress(event, answers, saved.progress && typeof saved.progress === 'object' ? saved.progress : {}), confirmed: saved.confirmed === true && validAnswers, warning: ''};
  } catch { return {...empty, warning: 'Saved progress could not be read. You can still use the checklist in this tab.'}; }
}

export function saveState(event, state, storage) {
  try {
    storage.setItem(storageKey(event), JSON.stringify({version: event.version, answers: cleanAnswers(event, state.answers), progress: reconcileProgress(event, state.answers, state.progress), confirmed: state.confirmed}));
    return true;
  } catch { return false; }
}

export function validateEvent(event) {
  const ids = new Set();
  const questions = new Map(event.questions.map(q => [q.id, q]));
  const validateRule = rule => {
    if (!rule) return;
    if (rule.all || rule.any) return (rule.all || rule.any).forEach(validateRule);
    if (!questions.has(rule.field) || !rule.in?.length || rule.in.some(v => !questions.get(rule.field).options.some(o => o.value === v))) throw new Error('Invalid applicability rule');
  };
  for (const step of event.steps) {
    if (ids.has(step.id)) throw new Error(`Duplicate step: ${step.id}`);
    for (const d of step.dependencies) if (!ids.has(d.stepId)) throw new Error(`Missing or out-of-order dependency: ${d.stepId}`);
    for (const key of step.profileKeys) if (!questions.has(key)) throw new Error(`Unknown profile key: ${key}`);
    validateRule(step.applicability.rule);
    if (!step.sources.length || step.sources.some(s => !/^https:\/\//.test(s.url) || !s.title || !s.lastVerified)) throw new Error(`Missing evidence: ${step.id}`);
    if (!['required', 'conditional', 'optional'].includes(step.requirement)) throw new Error(`Invalid requirement: ${step.id}`);
    ids.add(step.id);
  }
  return true;
}
