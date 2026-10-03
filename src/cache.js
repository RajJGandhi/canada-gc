export const CACHE_VERSION = 'gov-cache-v1';
export const TTL = {answer:7200, search:7200, followups:2592000, feedback:31536000};

export async function hashKey(kind, value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `${CACHE_VERSION}:${kind}:${Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('')}`;
}

// KV TTL and an embedded deadline both enforce expiry, including in local tests.
export async function readCache(kv, key, now = Date.now()) {
  if (!kv) return null;
  try {
    const record = await kv.get(key, 'json');
    return record && record.expiresAt > now ? record.value : null;
  } catch { return null; }
}

export async function writeCache(kv, key, value, ttl) {
  if (!kv) return;
  await kv.put(key, JSON.stringify({expiresAt:Date.now()+ttl*1000,value}), {expirationTtl:ttl});
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 20) throw new Error('Supply between 1 and 20 conversation messages.');
  const output = messages.map(m=> {
    if (!m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length>6000) throw new Error('A message is empty or too long.');
    return {role:m.role,content:m.content.trim().normalize('NFC')};
  });
  if (output.at(-1).role !== 'user') throw new Error('The last message must be your question.');
  if (output.reduce((n,m)=>n+m.content.length,0)>24000) throw new Error('This conversation is too long. Please start a new question.');
  return output;
}

export function privacyFilter(messages) {
  let sensitive=false;
  const patterns = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[EMAIL]'],
    [/\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/g,'[GOVERNMENT_ID]'],
    [/(?<!\d)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(?!\d)/g,'[PHONE]'],
    [/\b(?:\d[ -]?){13,19}\b/g,'[ACCOUNT_NUMBER]']
  ];
  const filtered=messages.map(m=> {
    let content=m.content;
    for(const [re,replacement] of patterns) content=content.replace(re,()=>{sensitive=true;return replacement;});
    if (/\[(?:EMAIL|PHONE|GOVERNMENT_ID|ACCOUNT_NUMBER|NAME|ADDRESS)[_\d]*\]/.test(content)) sensitive=true;
    return {...m,content};
  });
  return {messages:filtered,cacheable:!sensitive};
}

// Only locally extracted text is accepted. Files, URLs and base64 payloads are not.
export function normalizeDocument(document) {
  if (document == null) return null;
  if (!document || typeof document !== 'object' || Array.isArray(document) || typeof document.text !== 'string' || !document.text.trim() || document.text.length > 24000 || typeof document.name !== 'string' || !document.name.trim() || document.name.length > 180 || !Number.isInteger(document.pages) || document.pages < 1 || document.pages > 25) throw new Error('The PDF text is invalid or too large. Please attach it again.');
  const filtered = privacyFilter([{role:'user',content:document.text},{role:'user',content:document.name}]).messages;
  return {name:filtered[1].content.replace(/[\u0000-\u001f]/g,''),pages:document.pages,text:filtered[0].content.normalize('NFC'),truncated:document.truncated === true};
}
