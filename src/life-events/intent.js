export const BUSINESS_PATH = '/life-events/start-business-london';
// Deliberately narrow. Specific questions and other locations retain normal chat.
// Generic entry is a labelled invitation, never an inferred London location.
export function isBusinessEntry(value) {
  return /^(?:(?:how (?:do|can) i|i (?:want|would like) to|help me|what (?:do i|steps do i) need to) (?:start|open|launch|set up)(?: a| my)?(?: small)? business(?: in London(?:,? Ontario)?)?(?:[.!?]|\. What exactly do I need to do\?)?|start a business(?: in London(?:,? Ontario)?)?[.!?]?)$/i.test(value.trim());
}
