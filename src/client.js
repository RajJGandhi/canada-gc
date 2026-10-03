import {BUSINESS_PATH, isBusinessEntry} from './life-events/intent.js';
const $ = (id) => document.getElementById(id);
const state = { language: new URLSearchParams(location.search).get('lang') === 'fr' ? 'fr' : 'en', messages: [], busy: false, controller: null, context: null, locations: { provinces: [], municipalities: [] }, location: null, pending: null, recognition: null, voiceConsent: false, mode: 'home', modeTimer: null, requestId: 0, document: null, documentController: null, slide: 0, carouselPaused: false, contextRequest: 0, privateConversation: false };
const icons = {
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 1 5-8c2-1 3 1 2 4l-1 3h6c2 0 2 1 2 3l-2 6c0 1-1 2-3 2H7"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V3H3v11h4Zm0-1 5 8c2 1 3-1 2-4l-1-3h6c2 0 2-1 2-3l-2-6c0-1-1-2-3-2H7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>'
};
const text = {
  en: { sources: 'Sources', cited: 'Official pages cited in this answer.', consulted: 'Official pages consulted for this answer.', source: 'source', sourcesCount: 'sources', thinking: 'Finding a clear next step…', stopped: 'Response stopped.', error: 'We couldn’t finish that answer. Please try again.', empty: 'No official sources were returned.', new: 'New conversation', location: 'Choose your location', approximate: 'Use approximate location', provinceWide: 'Province-wide sources', canada: 'Canada', ask: 'Ask a government services question', placeholder: 'How do I renew my passport?', chatPlaceholder: 'Ask a follow-up question…', send: 'Send question', stop: 'Stop response', mic: 'Speak your question', copy: 'Copy answer', copied: 'Answer copied.', up: 'Helpful answer', down: 'Unhelpful answer', feedback: 'Thank you. Your feedback was sent.', feedbackError: 'Your feedback could not be sent. Please try again.', note: 'AI can make mistakes. Check the linked official sources.', voiceTitle: 'Speak your question', voice: 'Your browser’s speech recognition service turns your voice into text. Depending on your browser, audio may be processed by Google, Apple, or Microsoft. We receive the text of your question when you send it.', voiceStart: 'Start microphone', voiceError: 'Voice input is unavailable. You can type your question instead.', locationNote: 'Official sources. Clear next steps.', near: 'Nearby sources', unknownLocation: 'Approximate location unavailable; federal sources included.', close: 'Close', menuTitle: 'A simpler place to start', about: 'About', how: 'How it works', privacy: 'Privacy', export: 'Save as PDF', attach: 'Attach a PDF', removePdf: 'Remove PDF', findSource: 'Find an agency or page…', noSources: 'No matching sources.', foundPages: 'Found official pages', viewSources: 'Explore all sources', suggestionLabel: 'Try asking', documentNotice: 'The PDF stays on your device. Only extracted text is shared with the AI service when you send a question. It is not sent to web search.', pdfReading: 'Reading your PDF…', pdfCancel: 'Cancel', pdfPreview: 'Review extracted text', label: 'Gov · Build Canada', samples: ['How do I renew my passport?', 'What benefits could I qualify for?', 'How do I start a small business?'] },
  fr: { sources: 'Sources', cited: 'Pages officielles citées dans cette réponse.', consulted: 'Pages officielles consultées pour cette réponse.', source: 'source', sourcesCount: 'sources', thinking: 'À la recherche de la prochaine étape…', stopped: 'Réponse interrompue.', error: 'Impossible de terminer cette réponse. Veuillez réessayer.', empty: 'Aucune source officielle trouvée.', new: 'Nouvelle conversation', location: 'Choisir votre lieu', approximate: 'Utiliser le lieu approximatif', provinceWide: 'Sources de la province', canada: 'Canada', ask: 'Posez une question sur les services publics', placeholder: 'Comment renouveler mon passeport?', chatPlaceholder: 'Posez une autre question…', send: 'Envoyer la question', stop: 'Arrêter la réponse', mic: 'Dicter votre question', copy: 'Copier la réponse', copied: 'Réponse copiée.', up: 'Réponse utile', down: 'Réponse peu utile', feedback: 'Merci. Votre commentaire a été envoyé.', feedbackError: 'Votre avis n’a pas pu être envoyé. Veuillez réessayer.', note: 'L’IA peut se tromper. Vérifiez les sources officielles.', voiceTitle: 'Dicter votre question', voice: 'Le service de reconnaissance vocale de votre navigateur transforme votre voix en texte. Selon votre navigateur, Google, Apple ou Microsoft peut traiter le son. Nous recevons le texte de votre question lorsque vous l’envoyez.', voiceStart: 'Activer le microphone', voiceError: 'La saisie vocale est indisponible. Vous pouvez écrire votre question.', locationNote: 'Sources officielles. Prochaines étapes claires.', near: 'Sources à proximité', unknownLocation: 'Lieu approximatif indisponible; sources fédérales incluses.', close: 'Fermer', menuTitle: 'Un point de départ plus simple', about: 'À propos', how: 'Fonctionnement', privacy: 'Confidentialité', export: 'Enregistrer en PDF', attach: 'Joindre un PDF', removePdf: 'Retirer le PDF', findSource: 'Chercher un organisme ou une page…', noSources: 'Aucune source correspondante.', foundPages: 'Pages officielles trouvées', viewSources: 'Explorer toutes les sources', suggestionLabel: 'Essayez une question', documentNotice: 'Le PDF reste sur votre appareil. Seul le texte extrait est partagé avec le service d’IA lorsque vous envoyez une question. Il n’est pas envoyé à la recherche web.', pdfReading: 'Lecture de votre PDF…', pdfCancel: 'Annuler', pdfPreview: 'Vérifier le texte extrait', label: 'Gov · Build Canada', samples: ['Comment renouveler mon passeport?', 'À quelles prestations ai-je droit?', 'Comment démarrer une petite entreprise?'] }
};
const french = {
  'independent-banner': 'Un projet indépendant de Build Canada. Ce n’est pas un site du gouvernement du Canada.', eyebrow: 'Un peu de clarté. Une bonne prochaine étape.', greeting: 'Bonjour, Canada.', tagline: 'Pour vos démarches auprès du gouvernement, commencez ici.', 'hero-caption': 'D’un océan à l’autre, un chemin plus clair.', 'landscape-label': 'Photo : Chensiyuan · CC BY-SA 4.0', 'trust-heading': 'Les démarches peuvent être compliquées.<br>Commencer devrait être simple.', 'trust-description': 'Posez votre question avec vos mots. Trouvez une réponse claire, consultez les sources officielles et sachez quoi faire ensuite.', 'trust-source-title': 'Voyez d’où vient la réponse.', 'trust-source-text': 'Les réponses s’appuient sur des sites gouvernementaux approuvés. Chaque source est à portée de clic.', 'trust-simple-title': 'Sans compte. Sans publicité.', 'trust-simple-text': 'Un point de départ simple, sans nouvelle connexion ni argumentaire de vente.', 'trust-local-title': 'Un peu plus près de chez vous.', 'trust-local-text': 'Des sources fédérales, provinciales et municipales à proximité. Vous gardez le contrôle du lieu.', 'footer-disclaimer': 'L’IA peut se tromper. Vérifiez les sources officielles avant d’agir.', 'footer-credit': 'Un projet indépendant de Build Canada.', 'location-title': 'Un peu plus près de chez vous', 'location-explanation': 'Nous utilisons un lieu approximatif fourni par Cloudflare pour trouver les sources gouvernementales pertinentes. Votre question est prioritaire. Vous pouvez choisir un autre lieu.', 'province-label': 'Province ou territoire', 'municipality-label': 'Municipalité', 'location-help': 'Les sources fédérales sont toujours incluses. Les municipalités à proximité aident pour les services locaux.', 'location-save': 'Utiliser ce lieu', 'location-reset': 'Utiliser le lieu approximatif'
};
const english = Object.fromEntries(Object.keys(french).map((id) => [id, $(id).innerHTML]));
const info = {
  en: {
    about: '<p>Finding the right government service should feel a little simpler.</p><p>Gov is an independent project by <a href="https://buildcanada.com" target="_blank" rel="noopener noreferrer">Build Canada</a>. It is not operated by, or affiliated with, the Government of Canada.</p><h3>A clearer next step</h3><p>Ask about Canadian public services in English or French. We bring together approved official sources to explain the next steps and link you to the responsible agency.</p><p>This assistant does not submit applications, determine eligibility, or make decisions on behalf of a government agency. Always confirm important requirements, costs, and dates with the linked official sources.</p>',
    how: '<h3>Ask in your own words</h3><p>Tell us what you need to do. Include your province or municipality when it matters. You can change your location beside the question box.</p><h3>Search approved official sources</h3><p>The assistant uses Tavily to search an approved list of federal, provincial, territorial, and municipal government websites. Your question and approximate location help select relevant jurisdictions.</p><h3>See the sources</h3><p>Citation links open the official pages. The Sources button groups pages by the agency responsible, so you can see where an answer comes from.</p><h3>Keep going</h3><p>Ask a follow-up or start a new conversation. AI can make mistakes, miss a condition, or use an outdated page. The responsible government agency is the authority.</p>',
    privacy: '<h3>No account or saved conversation history</h3><p>Your conversation stays in this page’s memory. Reloading or starting a new conversation clears it. Do not include SINs, health card numbers, passwords, or other sensitive information. The server attempts to mask structured identifiers such as SINs, email addresses, and phone numbers; this is best effort and does not remove all personal information.</p><h3>Search and AI processing</h3><p>Your question and relevant conversation context are sent to our Cloudflare Worker and AI service. Search queries are sent to Tavily. We do not promise zero retention by service providers.</p><h3>Caching</h3><p>Search results and generated answers can be cached for up to two hours. Suggested follow-up questions can be cached for up to 30 days. Caching avoids repeated work; it is separate from chat history.</p><h3>Approximate location</h3><p>Cloudflare supplies an approximate location, such as your city and province. We use it to select government sources. You can override it, and your question takes priority. We do not request your device’s GPS location.</p><h3>Feedback and voice</h3><p>If you click a feedback button, we send that rating with the answer and its sources and retain it for up to one year. Browser voice recognition may send audio to your browser’s provider. This site has no ads or analytics trackers.</p>'
  },
  fr: {
    about: '<p>Trouver le bon service gouvernemental devrait être un peu plus simple.</p><p>Gov est un projet indépendant de <a href="https://buildcanada.com" target="_blank" rel="noopener noreferrer">Build Canada</a>. Il n’est ni exploité par le gouvernement du Canada, ni affilié à celui-ci.</p><h3>Une prochaine étape plus claire</h3><p>Posez vos questions sur les services publics canadiens en français ou en anglais. Nous rassemblons des sources officielles approuvées pour expliquer les démarches et vous diriger vers l’organisme responsable.</p><p>Cet assistant ne soumet pas de demande, ne détermine pas votre admissibilité et ne prend aucune décision au nom du gouvernement. Confirmez toujours les exigences, les coûts et les dates auprès des sources officielles.</p>',
    how: '<h3>Posez votre question avec vos mots</h3><p>Expliquez ce que vous voulez faire. Indiquez votre province ou municipalité si cela est pertinent. Vous pouvez modifier votre lieu à côté de la zone de saisie.</p><h3>Consultez les sources approuvées</h3><p>L’assistant utilise Tavily pour rechercher des sites gouvernementaux fédéraux, provinciaux, territoriaux et municipaux approuvés. Votre question et votre lieu approximatif aident à choisir les autorités pertinentes.</p><h3>Vérifiez les sources</h3><p>Les citations ouvrent les pages officielles. Le bouton Sources regroupe les pages par organisme responsable pour montrer d’où vient la réponse.</p><h3>Poursuivez la conversation</h3><p>Posez une autre question ou démarrez une nouvelle conversation. L’IA peut se tromper, oublier une condition ou consulter une page périmée. L’organisme gouvernemental responsable fait autorité.</p>',
    privacy: '<h3>Sans compte ni historique enregistré</h3><p>Votre conversation reste dans la mémoire de cette page. Recharger la page ou commencer une nouvelle conversation l’efface. N’indiquez pas de NAS, de numéro de carte santé, de mot de passe ou d’autre renseignement sensible. Le serveur tente de masquer certains identifiants structurés, comme les NAS, les courriels et les numéros de téléphone, sans garantie de supprimer tous les renseignements personnels.</p><h3>Recherche et traitement par l’IA</h3><p>Votre question et le contexte pertinent sont transmis à notre Worker Cloudflare et au service d’IA. Les requêtes de recherche sont envoyées à Tavily. Nous ne promettons pas une conservation nulle par les fournisseurs.</p><h3>Mise en cache</h3><p>Les résultats de recherche et les réponses peuvent être mis en cache pendant deux heures. Les questions de suivi peuvent l’être pendant 30 jours. Ce cache est distinct de l’historique de conversation.</p><h3>Lieu approximatif</h3><p>Cloudflare fournit un lieu approximatif, comme votre ville et votre province. Il aide à choisir les sources. Vous pouvez le modifier et votre question est prioritaire. Nous ne demandons pas la position GPS de votre appareil.</p><h3>Avis et saisie vocale</h3><p>Si vous cliquez sur un bouton d’avis, nous transmettons la note avec la réponse et ses sources et les conservons pendant un an au maximum. La reconnaissance vocale peut envoyer le son au fournisseur de votre navigateur. Ce site ne comporte ni publicité ni suivi analytique.</p>'
  }
};
function t(key) { return text[state.language][key]; }
function announce(value) { $('announcement').textContent = value; }
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function safeUrl(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
function localized(value) { return typeof value === 'object' && value ? value[state.language] || value.en || value.fr || '' : String(value || ''); }
function sourceLabel(source) {
  const label = source?.title || localized(source?.agencyName) || source?.domain || t('sources');
  return label.length > 76 ? label.slice(0, 73).replace(/\s+\S*$/, '') + '…' : label;
}
function inline(raw, sources) {
  const tokens = []; const seen = new Set();
  const token = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  const sourceLink = (id, label) => {
    const source = sources.find((item) => item.id === id); const url = safeUrl(source?.canonicalUrl);
    if (!url) return label ? escape(label) : '';
    if (!label && seen.has(id)) return ''; seen.add(id);
    return token(`<a class="official-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer" title="${escape(localized(source.agencyName) || source.domain)}">${escape(label || sourceLabel(source))}<span aria-hidden="true"> ↗</span></a>`);
  };
  let value = String(raw).replace(/`([^`]+)`/g, (_, code) => token(`<code>${escape(code)}</code>`));
  value = value.replace(/\[([^\]]+)\]\((S\d+)\)/g, (_, label, id) => sourceLink(id, label));
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g, (_, title, url) => { const safe = safeUrl(url); const approved = sources.some((source) => safeUrl(source.canonicalUrl) === safe); return safe && approved ? token(`<a href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${escape(title)} ↗</a>`) : title; });
  value = value.replace(/\[((?:S\d+)(?:\s*[,;]\s*S\d+)*)\]/g, (_, ids) => ids.split(/\s*[,;]\s*/).map((id) => sourceLink(id)).filter(Boolean).join(' · '));
  value = escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return value.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)] || '');
}
function reconcileChildren(target, incoming) {
  const next = [...incoming.childNodes];
  for (let index = 0; index < next.length; index++) {
    const current = target.childNodes[index]; const node = next[index];
    if (!current) { target.append(node.cloneNode(true)); continue; }
    if (current.nodeType !== node.nodeType || current.nodeName !== node.nodeName) { current.replaceWith(node.cloneNode(true)); continue; }
    if (node.nodeType === Node.TEXT_NODE) { if (current.data !== node.data) current.data = node.data; }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attribute of [...current.attributes]) if (!node.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
      for (const attribute of [...node.attributes]) if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
      reconcileChildren(current, node);
    }
  }
  while (target.childNodes.length > next.length) target.lastChild.remove();
}
function patchMarkdown(target, answer, sources, partial = false) {
  const fragment = document.createElement('template');
  const text = partial ? String(answer).replace(/\[(?:S\d*(?:\s*[,;]\s*S\d*)*|[^\]]*\]\(S\d*)$/, '') : answer;
  fragment.innerHTML = markdown(text, sources); reconcileChildren(target, fragment.content);
}

function markdown(answer, sources = []) {
  const lines = String(answer).replace(/\r/g, '').split('\n'); let html = ''; let paragraph = []; let list = ''; let code = null;
  const flush = () => { if (paragraph.length) { html += `<p>${inline(paragraph.join(' '), sources)}</p>`; paragraph = []; } if (list) { html += `</${list}>`; list = ''; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { flush(); if (code !== null) { html += `<pre><code>${escape(code.join('\n'))}</code></pre>`; code = null; } else code = []; continue; }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
      flush(); const cells = (s) => s.trim().replace(/^\||\|$/g, '').split('|'); html += '<div class="table-scroll"><table><thead><tr>' + cells(line).map((c) => `<th>${inline(c.trim(), sources)}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) { html += '<tr>' + cells(lines[i]).map((c) => `<td>${inline(c.trim(), sources)}</td>`).join('') + '</tr>'; i++; } html += '</tbody></table></div>'; i--; continue;
    }
    const heading = line.match(/^\s*(#{1,4})\s+(.+)$/); if (heading) { flush(); html += `<h${Math.min(Math.max(heading[1].length, 2), 3)}>${inline(heading[2], sources)}</h${Math.min(Math.max(heading[1].length, 2), 3)}>`; continue; }
    const item = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/); if (item) { if (paragraph.length) { html += `<p>${inline(paragraph.join(' '), sources)}</p>`; paragraph = []; } const kind = item[1] ? 'ul' : 'ol'; if (list && kind !== list) { html += `</${list}>`; list = ''; } if (!list) { list = kind; html += `<${list}>`; } html += `<li>${inline(item[2], sources)}</li>`; continue; }
    if (/^\s*>/.test(line)) { flush(); html += `<blockquote>${inline(line.replace(/^\s*>\s?/, ''), sources)}</blockquote>`; continue; }
    if (list) { html += `</${list}>`; list = ''; } paragraph.push(line);
  }
  flush(); if (code !== null) html += `<pre><code>${escape(code.join('\n'))}</code></pre>`; return html;
}
function createButton(className, label, onClick) { const button = document.createElement('button'); button.type = 'button'; button.className = className; button.textContent = label; button.addEventListener('click', onClick); return button; }
function agencyGroups(sources) {
  const groups = new Map(); const seen = new Set();
  for (const source of sources || []) { const url = safeUrl(source.canonicalUrl); if (!url || seen.has(url)) continue; seen.add(url); const key = source.agencyId || source.domain || new URL(url).hostname; if (!groups.has(key)) groups.set(key, { ...source, pages: [] }); groups.get(key).pages.push(source); }
  return [...groups.values()];
}
function badge(group) { const el = document.createElement('span'); el.className = 'agency-badge'; el.textContent = String(group.monogram || group.agencyId || group.domain || 'CA').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase(); el.setAttribute('aria-hidden', 'true'); return el; }
function showSources(sources) {
  const cited = sources.filter((source) => source.cited); const visible = cited.length ? cited : sources;
  $('sources-title').textContent = t('sources'); $('sources-description').textContent = t(cited.length ? 'cited' : 'consulted'); $('source-groups').replaceChildren(); $('source-search').value = ''; $('source-search').placeholder = t('findSource'); $('source-search-empty').textContent = t('noSources');
  for (const group of agencyGroups(visible)) {
    const details = document.createElement('details'); details.className = 'source-group'; details.dataset.filter = [localized(group.agencyName), group.domain, ...group.pages.map((page) => page.title)].join(' ').toLocaleLowerCase();
    const summary = document.createElement('summary'); summary.append(badge(group)); const name = document.createElement('span'); name.className = 'source-name'; const strong = document.createElement('strong'); strong.textContent = localized(group.agencyName) || group.domain || 'Canada'; const small = document.createElement('small'); small.textContent = `${group.domain || new URL(group.canonicalUrl).hostname} · ${group.pages.length} ${t(group.pages.length === 1 ? 'source' : 'sourcesCount')}`; name.append(strong, small); summary.append(name); details.append(summary);
    const links = document.createElement('div'); links.className = 'source-links';
    for (const source of group.pages) { const row = document.createElement('div'); const link = document.createElement('a'); link.href = safeUrl(source.canonicalUrl); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = (source.title || source.canonicalUrl) + ' ↗'; const domain = document.createElement('small'); domain.textContent = new URL(source.canonicalUrl).hostname; row.append(link, domain); links.append(row); } details.append(links); $('source-groups').append(details);
  }
  $('source-search-empty').hidden = true; if (!visible.length) $('source-groups').textContent = t('empty'); $('source-dialog').showModal();
}
function sourceCards(sources, consulted = false) {
  const cited = sources.filter((source) => source.cited); const visible = consulted || !cited.length ? sources : cited; const groups = agencyGroups(visible);
  if (!groups.length) return null;
  const section = document.createElement('section'); section.className = 'source-cards'; section.setAttribute('aria-label', t('sources'));
  for (const group of groups.slice(0, 3)) {
    const card = document.createElement('div'); card.className = 'source-card'; const head = document.createElement('div'); head.className = 'source-card-head'; head.append(badge(group)); const name = document.createElement('span'); name.textContent = localized(group.agencyName) || group.domain; head.append(name); card.append(head);
    for (const source of group.pages.slice(0, 2)) { const link = document.createElement('a'); link.href = safeUrl(source.canonicalUrl); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = (source.title || source.domain) + ' ↗'; card.append(link); }
    const domain = document.createElement('small'); domain.textContent = group.domain; card.append(domain); section.append(card);
  }
  return section;
}
function createSourcePreview(sources) {
  const details = document.createElement('details'); details.className = 'found-sources'; details.open = true;
  const summary = document.createElement('summary'); const stack = document.createElement('span'); stack.className = 'agency-stack'; for (const group of agencyGroups(sources).slice(0, 3)) stack.append(badge(group)); const label = document.createElement('span'); label.textContent = t('foundPages'); summary.append(stack, label); details.append(summary); const cards = sourceCards(sources, true); if (cards) details.append(cards); return details;
}
function exportAnswer(answer, sources, question) {
  const page = $('print-export'); page.replaceChildren(); const title = document.createElement('h1'); title.textContent = 'Gov · Build Canada'; const subtitle = document.createElement('p'); subtitle.textContent = state.language === 'fr' ? 'Un projet indépendant de Build Canada.' : 'An independent project by Build Canada.'; const heading = document.createElement('h2'); heading.textContent = question || t('sources'); const content = document.createElement('div'); content.className = 'answer-content'; content.innerHTML = markdown(answer, sources); const sourceHeading = document.createElement('h2'); sourceHeading.textContent = t('sources'); page.append(title, subtitle, heading, content, sourceHeading);
  for (const source of agencyGroups(sources).flatMap((group) => group.pages)) { const row = document.createElement('p'); row.textContent = `${source.title || localized(source.agencyName)} — ${source.canonicalUrl}`; row.className = 'print-source'; page.append(row); }
  const note = document.createElement('p'); note.textContent = t('note'); page.append(note); page.hidden = false; window.print();
}
function renderAnswer(element, data) {
  const answer = typeof data.answer === 'string' ? data.answer : String(data.answer?.answer || ''); const sources = Array.isArray(data.sources) ? data.sources : []; const privateAnswer = data.privateConversation === true || state.privateConversation;
  let content = element.querySelector('.answer-content'); if (!content) { content = document.createElement('div'); content.className = 'answer-content'; element.prepend(content); } content.hidden = false; content.setAttribute('aria-busy', 'false'); patchMarkdown(content, answer, sources);
  element.querySelectorAll('.status,.source-activity,.found-sources,.response-actions,.followups,.answer-note,.source-cards').forEach((node) => node.remove());
  const actions = document.createElement('div'); actions.className = 'response-actions'; const cited = sources.filter((source) => source.cited); const groups = agencyGroups(cited.length ? cited : sources);
  if (groups.length) { const sourceButton = createButton('sources-button', '', () => showSources(sources)); sourceButton.setAttribute('aria-haspopup', 'dialog'); const stack = document.createElement('span'); stack.className = 'agency-stack'; for (const group of groups.slice(0, 3)) stack.append(badge(group)); const label = document.createElement('span'); label.textContent = `${t('sources')} · ${groups.reduce((sum, group) => sum + group.pages.length, 0)}`; sourceButton.append(stack, label); actions.append(sourceButton); }
  for (const rating of privateAnswer ? [] : ['up', 'down']) { const button = createButton('action-button', '', async () => {
    if (button.getAttribute('aria-pressed') === 'true') return; button.disabled = true;
    try { const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, answer, sources, privateConversation: privateAnswer }) }); if (!response.ok) throw new Error(); actions.querySelectorAll('[data-rating]').forEach((node) => node.setAttribute('aria-pressed', String(node === button))); announce(t('feedback')); } catch { announce(t('feedbackError')); } finally { button.disabled = false; }
  }); button.innerHTML = icons[rating]; button.dataset.rating = rating; button.setAttribute('aria-label', t(rating)); button.title = t(rating); button.setAttribute('aria-pressed', 'false'); actions.append(button); }
  const copy = createButton('action-button', '', async () => { try { await navigator.clipboard.writeText(content.innerText); announce(t('copied')); copy.textContent = '✓'; setTimeout(() => { copy.innerHTML = icons.copy; }, 1800); } catch { announce(t('error')); } }); copy.innerHTML = icons.copy; copy.setAttribute('aria-label', t('copy')); copy.title = t('copy'); actions.append(copy);
  const save = createButton('action-button', '', () => exportAnswer(answer, sources, element.previousElementSibling?.innerText)); save.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"/></svg>'; save.setAttribute('aria-label', t('export')); save.title = t('export'); actions.append(save); element.append(actions);
  const cards = sourceCards(sources); if (cards) element.append(cards);
  if (Array.isArray(data.followups) && data.followups.length) { const followups = document.createElement('div'); followups.className = 'followups'; for (const question of data.followups.slice(0, 3)) if (typeof question === 'string') followups.append(createButton('followup', question, () => send(question))); element.append(followups); }
  const note = document.createElement('p'); note.className = 'answer-note'; note.textContent = !sources.length && state.document ? state.language === 'fr' ? 'Aucune source web officielle n’a été utilisée. L’IA peut se tromper; vérifiez le document original.' : 'No official web sources were used. AI can make mistakes; check the original document.' : t('note'); element.append(note); element.classList.add('answer-complete'); return answer;
}

function setBusy(busy) { state.busy = busy; $('send-button').hidden = busy; $('stop-button').hidden = !busy; $('attach-button').disabled = busy; document.querySelectorAll('.followup,.suggestion').forEach((el) => { el.disabled = busy; }); }
function positionComposer() {
  const composer = $('composer'); const viewportHeight = window.visualViewport?.height || window.innerHeight;
  if (state.mode === 'chat') { const width = Math.min(760, window.innerWidth - (window.innerWidth <= 600 ? 24 : 64)); composer.style.width = width + 'px'; composer.style.top = Math.max(10, viewportHeight - composer.offsetHeight - (window.innerWidth <= 600 ? 14 : 22)) + 'px'; composer.classList.remove('composer-offscreen'); }
  else { const rect = $('home-composer-slot').getBoundingClientRect(); composer.style.width = rect.width + 'px'; composer.style.top = rect.top + 'px'; composer.classList.toggle('composer-offscreen', rect.bottom < -100 || rect.top > viewportHeight + 100); }
}
function enterChat() {
  if (state.mode === 'chat') return; state.mode = 'chat'; clearTimeout(state.modeTimer); $('home').classList.add('home-leaving'); $('home').inert = true; $('chat').hidden = false; $('chat-composer-slot').hidden = false; document.body.classList.add('chat-mode'); hideSuggestions(); window.scrollTo({ top: 0, behavior: 'instant' }); positionComposer(); $('question').placeholder = t('chatPlaceholder');
  state.modeTimer = setTimeout(() => { if (state.mode === 'chat') { $('home').hidden = true; $('home').classList.remove('home-leaving'); } }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
}
function nearBottom() { return document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 260; }
function scrollLatest(force = false) { if (force || nearBottom()) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); }
function handleEvent(event, data, pending) {
  if (state.pending !== pending) return;
  if (event === 'context') { state.context = data.context || data; updateLocationLabel(); }
  else if (event === 'status') { pending.statusText.textContent = data.message || t('thinking'); announce(pending.statusText.textContent); }
  else if (event === 'sources') { pending.sources = Array.isArray(data) ? data : data.sources || []; pending.activity.replaceChildren(); if (pending.sources.length) pending.activity.append(createSourcePreview(pending.sources)); }
  else if (event === 'answer.delta') {
    pending.text += data.text || data.delta || ''; pending.content.hidden = false;
    if (!pending.renderTimer) pending.renderTimer = setTimeout(() => { pending.renderTimer = null; if (state.pending === pending) { patchMarkdown(pending.content, pending.text, pending.sources, true); scrollLatest(); } }, 65);
  }
  else if (event === 'answer') { clearTimeout(pending.renderTimer); if (!data.sources) data.sources = pending.sources; const answer = renderAnswer(pending.element, data); state.messages.push({ role: 'assistant', content: answer }); pending.complete = true; announce(state.language === 'fr' ? 'Réponse prête.' : 'Answer ready.'); scrollLatest(); }
  else if (event === 'error') throw new Error(data.message || t('error'));
}
async function readSSE(response, pending) {
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  function dispatch(block) { let event = 'message'; const values = []; for (const line of block.split('\n')) { if (line.startsWith('event:')) event = line.slice(6).trim(); else if (line.startsWith('data:')) values.push(line.slice(5).trimStart()); } if (values.length) handleEvent(event, JSON.parse(values.join('\n')), pending); }
  while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n'); let end; while ((end = buffer.indexOf('\n\n')) >= 0) { const block = buffer.slice(0, end); buffer = buffer.slice(end + 2); dispatch(block); } } buffer += decoder.decode(); if (buffer.trim()) dispatch(buffer);
}
async function send(question, skipChecklist = false) {
  const value = String(question || '').trim(); if (!value || state.busy || state.documentController) return;
  if (!skipChecklist && !state.document && state.language === 'en' && isBusinessEntry(value)) {
    $('info-title').textContent = 'Turn your question into a plan';
    $('info-content').replaceChildren();
    const intro = document.createElement('p'); intro.textContent = 'Our first guided checklist covers starting a business in London, Ontario. Review the business choices, follow official sources, and save your progress on this device.';
    const link = document.createElement('a'); link.href = BUSINESS_PATH; link.className = 'le-primary'; link.textContent = 'Open the London checklist →';
    const other = createButton('text-button', 'Continue with my question', () => { $('info-dialog').close(); send(value, true); });
    $('info-content').append(intro, link, other); $('info-dialog').showModal(); return;
  }
  if (state.document) state.privateConversation = true; enterChat(); $('question').value = ''; resizeTextarea(); hideSuggestions(); state.messages.push({ role: 'user', content: value });
  const user = document.createElement('div'); user.className = 'user-message'; const bubble = document.createElement('div'); bubble.className = 'user-bubble'; bubble.textContent = value; user.append(bubble); if (state.document) { const attachment = document.createElement('span'); attachment.className = 'sent-document'; attachment.textContent = '▤ ' + state.document.name; user.append(attachment); } $('conversation').append(user);
  const element = document.createElement('article'); element.className = 'message assistant-message'; element.setAttribute('aria-label', state.language === 'fr' ? 'Réponse' : 'Answer'); const content = document.createElement('div'); content.className = 'answer-content'; content.hidden = true; content.setAttribute('aria-busy', 'true');
  const status = document.createElement('div'); status.className = 'status'; const dot = document.createElement('span'); dot.className = 'status-dot'; dot.setAttribute('aria-hidden', 'true'); const statusText = document.createElement('span'); statusText.textContent = t('thinking'); status.append(dot, statusText); const activity = document.createElement('div'); activity.className = 'source-activity'; element.append(content, status, activity); $('conversation').append(element);
  const pending = { element, content, statusText, activity, sources: [], text: '', complete: false, renderTimer: null, requestId: ++state.requestId }; state.pending = pending; const controller = new AbortController(); state.controller = controller; setBusy(true); scrollLatest(true); announce(t('thinking'));
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, signal: controller.signal, body: JSON.stringify({ messages: state.messages.slice(-20), language: state.language, location: state.location, privateConversation: state.privateConversation, ...(state.document ? { document: state.document } : {}) }) });
    if (!response.ok) { let data; try { data = await response.json(); } catch {} throw new Error(data?.error?.message || data?.error || data?.message || t('error')); }
    if (response.headers.get('content-type')?.includes('text/event-stream')) await readSSE(response, pending); else handleEvent('answer', await response.json(), pending);
    if (state.pending === pending && !pending.complete) throw new Error(t('error'));
  } catch (error) {
    if (state.pending === pending && !pending.complete) { clearTimeout(pending.renderTimer); const stopped = error.name === 'AbortError'; element.replaceChildren(); const message = document.createElement('div'); message.className = stopped ? 'status' : 'error-message'; message.textContent = stopped ? t('stopped') : error.message || t('error'); element.append(message); if (!stopped) { const retry = createButton('text-button', state.language === 'fr' ? 'Réessayer ↗' : 'Try again ↗', () => { $('question').value = value; resizeTextarea(); $('question').focus(); }); element.append(retry); } announce(message.textContent); }
  } finally { clearTimeout(pending.renderTimer); if (state.pending === pending) { setBusy(false); state.controller = null; state.pending = null; $('question').focus({ preventScroll: true }); } }
}
function resizeTextarea() { $('question').style.height = 'auto'; $('question').style.height = Math.min($('question').scrollHeight, 145) + 'px'; positionComposer(); }

function updateLocationLabel() { const label = localized(state.context?.label) || t('canada'); $('composer-location').textContent = `⌖ ${label}`; $('chat-location-button').querySelector('span').textContent = label; const title = state.context?.basis ? localized(state.context.basis) : state.context ? t('near') : t('unknownLocation'); $('composer-location').title = title; $('chat-location-button').title = title; }
function populateMunicipalities() { const province = $('province').value; $('municipality').replaceChildren(new Option(t('provinceWide'), '')); for (const city of state.locations.municipalities.filter((m) => !province || m.province === province || m.provinceCode === province).sort((a, b) => localized(a.name).localeCompare(localized(b.name)))) $('municipality').add(new Option(localized(city.name), city.id)); $('municipality').disabled = !province; }
function populateLocations() { $('province').replaceChildren(new Option(t('approximate'), '')); for (const province of state.locations.provinces) $('province').add(new Option(localized(province.name), province.code)); $('province').value = state.location?.province || ''; populateMunicipalities(); $('municipality').value = state.location?.municipality || ''; }
function showLocation() { populateLocations(); $('location-dialog').showModal(); }
async function refreshContext() { const requestId = ++state.contextRequest; try { const query = new URLSearchParams({ language: state.language }); if (state.location?.province) query.set('province', state.location.province); if (state.location?.municipality) query.set('municipality', state.location.municipality); const response = await fetch('/api/context?' + query); if (!response.ok) throw new Error(); const data = await response.json(); if (requestId !== state.contextRequest) return; state.context = data.context || data; if (data.locations) state.locations = data.locations; updateLocationLabel(); } catch { if (requestId === state.contextRequest) updateLocationLabel(); } }

function showInfo(kind) { $('info-title').textContent = t(kind); $('info-content').innerHTML = info[state.language][kind]; $('info-dialog').showModal(); }
function showMenu() { $('info-title').textContent = t('menuTitle'); $('info-content').replaceChildren(); const intro = document.createElement('p'); intro.textContent = state.language === 'fr' ? 'Des réponses claires, des sources officielles et une bonne prochaine étape.' : 'Clear answers, official sources, and a useful next step.'; const links = document.createElement('div'); links.className = 'info-links'; for (const key of ['about', 'how', 'privacy']) links.append(createButton('', t(key) + ' ↗', () => { $('info-dialog').close(); showInfo(key); })); links.append(createButton('', t('new') + ' ↶', () => { $('info-dialog').close(); restart(); })); $('info-content').append(intro, links); $('info-dialog').showModal(); }
function setLanguage(language) { state.language = language; document.documentElement.lang = language; document.title = t('label'); for (const [id, value] of Object.entries(language === 'fr' ? french : english)) $(id).innerHTML = value; document.querySelectorAll('[data-language]').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.language === language))); $('question').placeholder = t($('home').hidden ? 'chatPlaceholder' : 'placeholder'); $('question').setAttribute('aria-label', t('ask')); $('home-suggestions').setAttribute('aria-label', language === 'fr' ? 'Exemples de questions' : 'Example questions'); $('chat').setAttribute('aria-label', language === 'fr' ? 'Conversation' : 'Conversation'); document.querySelector('.skip-link').textContent = language === 'fr' ? 'Aller au contenu' : 'Skip to content'; for (const [id, key] of [['send-button', 'send'], ['stop-button', 'stop'], ['mic-button', 'mic'], ['location-button', 'location']]) { $(id).setAttribute('aria-label', t(key)); $(id).title = t(key); } document.querySelectorAll('[data-close]').forEach((el) => el.setAttribute('aria-label', t('close'))); $('restart-button').querySelector('span').textContent = t('new'); $('composer-note').firstChild.textContent = t('locationNote') + ' '; document.querySelectorAll('[data-info]').forEach((el) => { el.textContent = t(el.dataset.info); }); $('home-suggestions').replaceChildren(); for (const sample of t('samples')) { const button = createButton('suggestion', sample, () => send(sample)); const arrow = document.createElement('span'); arrow.textContent = '↗'; button.append(arrow); $('home-suggestions').append(button); } const url = new URL(location.href); if (language === 'fr') url.searchParams.set('lang', 'fr'); else url.searchParams.delete('lang'); history.replaceState(null, '', url); updateLocationLabel(); setBusy(state.busy); renderHero(); updateDocumentChip(); $('source-search').placeholder = t('findSource'); $('source-search-label').textContent = t('findSource'); $('attach-button').setAttribute('aria-label', t('attach')); $('attach-button').title = t('attach'); $('document-remove').setAttribute('aria-label', t('removePdf')); positionComposer(); }
function restart() {
  state.controller?.abort(); state.documentController?.abort(); clearTimeout(state.pending?.renderTimer); clearTimeout(state.modeTimer); state.requestId++; state.pending = null; state.controller = null; setBusy(false); state.messages = []; state.document = null; state.privateConversation = false; updateDocumentChip(); $('conversation').replaceChildren(); state.mode = 'home'; $('home').hidden = false; $('home').inert = false; $('home').classList.remove('home-leaving'); $('chat').hidden = true; $('chat-composer-slot').hidden = true; document.body.classList.remove('chat-mode'); $('question').value = ''; $('question').placeholder = t('placeholder'); window.scrollTo({ top: 0, behavior: 'instant' }); resizeTextarea(); $('question').focus({ preventScroll: true }); hideSuggestions();
}

const slides = [
  { photo: 'lake', place: { en: 'Lake Louise, Alberta', fr: 'Lac Louise, Alberta' }, question: { en: 'How do I renew my Canadian passport?', fr: 'Comment renouveler mon passeport canadien?' } },
  { photo: 'city', place: { en: 'Toronto, Ontario', fr: 'Toronto, Ontario' }, question: { en: 'What permits do I need to start a small business?', fr: 'Quels permis faut-il pour démarrer une petite entreprise?' } },
  { photo: 'lake', place: { en: 'Lake Louise, Alberta', fr: 'Lac Louise, Alberta' }, question: { en: 'What benefits could I qualify for?', fr: 'À quelles prestations pourrais-je avoir droit?' } },
  { photo: 'city', place: { en: 'Toronto, Ontario', fr: 'Toronto, Ontario' }, question: { en: 'Which government services should I update when I move?', fr: 'Quels services gouvernementaux mettre à jour après un déménagement?' } }
];
function renderHero() {
  const slide = slides[state.slide]; if (slide.photo === 'city' && !$('hero-photo-city').getAttribute('src')) $('hero-photo-city').src = $('hero-photo-city').dataset.src;
  $('hero-photo-lake').classList.toggle('active', slide.photo === 'lake'); $('hero-photo-city').classList.toggle('active', slide.photo === 'city'); $('hero-caption').textContent = localized(slide.place);
  $('landscape-label').textContent = slide.photo === 'lake' ? `${state.language === 'fr' ? 'Photo :' : 'Photo:'} Chensiyuan · CC BY-SA 4.0` : `${state.language === 'fr' ? 'Photo :' : 'Photo:'} Raysonho · CC0`;
  $('hero-photo-lake').alt = state.language === 'fr' ? 'Le lac Louise turquoise entouré des Rocheuses canadiennes' : 'Turquoise Lake Louise surrounded by the Canadian Rockies'; $('hero-photo-city').alt = state.language === 'fr' ? 'Le panorama de Toronto depuis le lac Ontario' : 'Toronto skyline across Lake Ontario';
  $('hero-previous').setAttribute('aria-label', state.language === 'fr' ? 'Exemple précédent' : 'Previous example'); $('hero-next').setAttribute('aria-label', state.language === 'fr' ? 'Exemple suivant' : 'Next example'); $('hero-pause').setAttribute('aria-label', state.language === 'fr' ? state.carouselPaused ? 'Reprendre les exemples' : 'Mettre les exemples en pause' : state.carouselPaused ? 'Play examples' : 'Pause examples'); $('hero-pause').textContent = state.carouselPaused ? '▷' : 'Ⅱ'; $('hero-count').textContent = state.language === 'fr' ? `Exemple ${state.slide + 1} sur ${slides.length}` : `Example ${state.slide + 1} of ${slides.length}`;
  if (state.mode === 'home' && !$('question').value) $('question').placeholder = window.innerWidth <= 600 ? state.language === 'fr' ? 'Posez votre question…' : 'Ask a question…' : localized(slide.question);
}
function suggestionCatalog() {
  const location = localized(state.context?.label) || t('canada');
  const documentQuestions = state.document ? state.language === 'fr' ? ['Résumez ce PDF', 'Que me demande cette lettre?'] : ['Summarize this PDF', 'What does this letter ask me to do?'] : [];
  return documentQuestions.concat(state.language === 'fr' ? [
    'Comment renouveler mon passeport canadien?', 'Comment demander l’assurance-emploi?', 'Comment produire ma déclaration de revenus?', `Quels permis faut-il pour ouvrir un café à ${location}?`, 'Quelles prestations sont offertes aux familles?', 'Comment changer mon adresse auprès du gouvernement?', 'Comment obtenir une aide financière pour mes études?', 'Comment remplacer un permis de conduire perdu?'
  ] : [
    'How do I renew my Canadian passport?', 'How do I apply for Employment Insurance?', 'How do I file my income tax return?', `What permits do I need to open a café in ${location}?`, 'What benefits are available for families?', 'How do I update my address with government?', 'How do I apply for student financial aid?', 'How do I replace a lost driver’s licence?'
  ]);
}
function hideSuggestions() { $('composer-suggestions').hidden = true; $('question').setAttribute('aria-expanded', 'false'); }
function updateSuggestions() {
  const query = $('question').value.trim(); const panel = $('composer-suggestions');
  if (state.busy || (state.mode === 'chat' && query.length < 3 && !state.document)) { hideSuggestions(); return; }
  const normalize = (value) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const words = normalize(query).split(/\W+/).filter((word) => word.length > 3); const catalog = suggestionCatalog();
  const matches = query.length < 3 ? catalog.slice(0, 3) : catalog.map((question) => ({ question, score: words.reduce((sum, word) => sum + Number(normalize(question).includes(word)), 0) })).filter((item) => item.score).sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.question);
  if (!matches.length) { hideSuggestions(); return; }
  panel.replaceChildren(); const heading = document.createElement('span'); heading.className = 'suggestion-label'; heading.textContent = t('suggestionLabel'); panel.append(heading);
  for (const question of matches) { const button = createButton('autocomplete-question', question + ' ↗', () => { $('question').value = question; resizeTextarea(); $('question').focus({ preventScroll: true }); hideSuggestions(); }); panel.append(button); }
  panel.hidden = false; $('question').setAttribute('aria-expanded', 'true');
}
function updateDocumentChip() {
  const visible = state.document || state.documentController; $('document-chip').hidden = !visible; $('document-preview-button').textContent = state.documentController ? t('pdfReading') : state.document ? `${state.document.name} · ${state.document.pages} ${state.document.pages === 1 ? 'page' : 'pages'}` : ''; $('document-remove').setAttribute('aria-label', t('removePdf')); positionComposer();
}
function showDocument() {
  if (!state.document) return; $('document-title').textContent = t('pdfPreview'); $('document-content').replaceChildren(); const name = document.createElement('h3'); name.textContent = state.document.name; const notice = document.createElement('p'); notice.className = 'document-notice'; notice.textContent = t('documentNotice'); const preview = document.createElement('pre'); preview.className = 'document-text'; preview.textContent = state.document.text; const meta = document.createElement('p'); meta.className = 'document-meta'; meta.textContent = `${state.document.pages} ${state.document.pages === 1 ? 'page' : 'pages'} · ${state.document.text.length.toLocaleString(state.language === 'fr' ? 'fr-CA' : 'en-CA')} ${state.language === 'fr' ? 'caractères extraits' : 'characters extracted'}` + (state.document.truncated ? state.language === 'fr' ? ' · Texte limité pour cette conversation.' : ' · Text limited for this conversation.' : ''); const done = createButton('primary-button', state.language === 'fr' ? 'Terminé' : 'Done', () => $('document-dialog').close()); $('document-content').append(name, notice, meta, preview, done); if (!$('document-dialog').open) $('document-dialog').showModal();
}
async function readDocument(file) {
  state.documentController?.abort(); const controller = new AbortController(); state.documentController = controller; $('document-title').textContent = t('attach'); $('document-content').replaceChildren(); const message = document.createElement('p'); message.textContent = t('pdfReading'); const notice = document.createElement('p'); notice.className = 'document-notice'; notice.textContent = t('documentNotice'); const cancel = createButton('primary-button', t('pdfCancel'), () => { controller.abort(); $('document-dialog').close(); }); $('document-content').append(message, notice, cancel); if (!$('document-dialog').open) $('document-dialog').showModal(); updateDocumentChip();
  try {
    const { extractPdf } = await import('./pdf.js'); const document = await extractPdf(file, { signal: controller.signal, onProgress: ({ page, total }) => { message.textContent = state.language === 'fr' ? `Lecture de la page ${page} sur ${total}…` : `Reading page ${page} of ${total}…`; } });
    if (controller.signal.aborted || state.documentController !== controller) return; state.document = document; state.documentController = null; updateDocumentChip(); showDocument();
  } catch (error) {
    if (state.documentController !== controller) return; state.documentController = null; updateDocumentChip(); if (error.name === 'AbortError') return;
    const messages = { 'too-large': ['Please choose a PDF smaller than 10 MB.', 'Choisissez un PDF de moins de 10 Mo.'], 'too-many-pages': ['Please choose a PDF with at most 25 pages.', 'Choisissez un PDF de 25 pages maximum.'], 'no-text': ['This PDF has no readable text. Scanned pages need OCR; please paste the relevant text instead.', 'Ce PDF ne contient pas de texte lisible. Les pages numérisées nécessitent une reconnaissance de caractères. Collez le texte pertinent.'], password: ['This PDF is password protected. Choose an unlocked copy.', 'Ce PDF est protégé par mot de passe. Choisissez une copie déverrouillée.'] };
    message.textContent = messages[error.code]?.[state.language === 'fr' ? 1 : 0] || (state.language === 'fr' ? 'Impossible de lire ce PDF. Essayez un autre fichier.' : 'We couldn’t read this PDF. Please try another file.'); cancel.textContent = t('close'); announce(message.textContent);
  } finally { if (state.documentController === controller) { state.documentController = null; updateDocumentChip(); } $('pdf-input').value = ''; }
}
function initPolish() {
  $('question').setAttribute('aria-controls', 'composer-suggestions'); $('question').setAttribute('aria-expanded', 'false');
  $('composer-suggestions').setAttribute('role', 'group');
  $('composer-suggestions').addEventListener('keydown', (event) => {
    const buttons = [...$('composer-suggestions').querySelectorAll('button')];
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      $('question').focus({ preventScroll: true }); hideSuggestions();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) $('question').focus({ preventScroll: true });
      else buttons[index - 1].focus({ preventScroll: true });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault(); buttons[Math.min(index + 1, buttons.length - 1)].focus({ preventScroll: true });
    }
  });
  $('hero-previous').addEventListener('click', () => { state.slide = (state.slide + slides.length - 1) % slides.length; renderHero(); }); $('hero-next').addEventListener('click', () => { state.slide = (state.slide + 1) % slides.length; renderHero(); }); $('hero-pause').addEventListener('click', () => { state.carouselPaused = !state.carouselPaused; renderHero(); });
  setInterval(() => { if (state.mode === 'home' && !state.carouselPaused && !$('question').value && !document.hidden && document.activeElement !== $('question') && !matchMedia('(prefers-reduced-motion: reduce)').matches) { state.slide = (state.slide + 1) % slides.length; renderHero(); } }, 7000);
  $('landscape-label').addEventListener('click', () => { $('info-title').textContent = state.language === 'fr' ? 'Crédits photographiques' : 'Photo credits'; $('info-content').innerHTML = '<p><strong>Lake Louise, Alberta</strong><br>Chensiyuan · <a href="https://commons.wikimedia.org/wiki/File:1_lake_louise_pano_2019.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a><br><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0 ↗</a></p><p><strong>Toronto, Ontario</strong><br>Raysonho @ Open Grid Scheduler / Grid Engine · <a href="https://commons.wikimedia.org/wiki/File:SkylineToronto.jpg" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a><br><a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0 ↗</a></p><p>' + (state.language === 'fr' ? 'Photos servies localement. Recadrage visuel pour la mise en page; aucune autre modification.' : 'Photos served locally. Cropped in the layout; otherwise unchanged.') + '</p>'; $('info-dialog').showModal(); });
  $('source-search').addEventListener('input', () => { const query = $('source-search').value.trim().toLocaleLowerCase(); let visible = 0; for (const group of $('source-groups').querySelectorAll('.source-group')) { group.hidden = !group.dataset.filter.includes(query); if (!group.hidden) { visible++; if (query) group.open = true; } } $('source-search-empty').hidden = !!visible; });
  $('attach-button').addEventListener('click', () => { if (!state.busy) $('pdf-input').click(); }); $('pdf-input').addEventListener('change', () => { const file = $('pdf-input').files[0]; if (file) readDocument(file); }); $('document-preview-button').addEventListener('click', showDocument); $('document-remove').addEventListener('click', () => { state.documentController?.abort(); state.documentController = null; state.document = null; updateDocumentChip(); }); $('document-dialog').addEventListener('close', () => state.documentController?.abort());
  window.addEventListener('resize', positionComposer); window.visualViewport?.addEventListener('resize', positionComposer); window.addEventListener('scroll', () => { if (state.mode === 'home') positionComposer(); }, { passive: true }); window.addEventListener('afterprint', () => { $('print-export').hidden = true; });
  requestAnimationFrame(() => { positionComposer(); $('composer').classList.add('composer-positioned'); }); const preloadCity = () => { if (!$('hero-photo-city').getAttribute('src')) $('hero-photo-city').src = $('hero-photo-city').dataset.src; }; $('hero-photo-lake').addEventListener('load', () => setTimeout(preloadCity, 1800), { once: true }); if ($('hero-photo-lake').complete) setTimeout(preloadCity, 1800);
}
function startVoice() { const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Recognition) { announce(t('voiceError')); return; } const recognition = new Recognition(); state.recognition = recognition; recognition.lang = state.language === 'fr' ? 'fr-CA' : 'en-CA'; recognition.interimResults = true; const before = $('question').value.trim(); recognition.onresult = (event) => { let transcript = ''; for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript; $('question').value = [before, transcript].filter(Boolean).join(' '); resizeTextarea(); }; recognition.onstart = () => { $('mic-button').classList.add('listening'); $('mic-button').setAttribute('aria-pressed', 'true'); }; recognition.onend = () => { $('mic-button').classList.remove('listening'); $('mic-button').setAttribute('aria-pressed', 'false'); state.recognition = null; }; recognition.onerror = () => announce(t('voiceError')); try { recognition.start(); } catch { announce(t('voiceError')); } }
$('composer').classList.add('composer-floating');
$('composer-form').addEventListener('submit', (event) => { event.preventDefault(); send($('question').value); });
$('question').addEventListener('input', () => { resizeTextarea(); updateSuggestions(); }); $('question').addEventListener('focus', updateSuggestions); $('composer').addEventListener('focusout', () => setTimeout(() => { if (!$('composer').contains(document.activeElement)) hideSuggestions(); }, 100));
$('question').addEventListener('keydown', (event) => { if (event.key === 'Escape') hideSuggestions(); if (['ArrowDown', 'ArrowUp'].includes(event.key) && !$('composer-suggestions').hidden) { event.preventDefault(); const buttons = [...$('composer-suggestions').querySelectorAll('button')]; (event.key === 'ArrowDown' ? buttons[0] : buttons.at(-1))?.focus({ preventScroll: true }); return; } if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!state.busy) send($('question').value); } });
$('stop-button').addEventListener('click', () => state.controller?.abort());
$('restart-button').addEventListener('click', restart);
$('brand').addEventListener('click', (event) => { event.preventDefault(); restart(); });
$('menu-button').addEventListener('click', showMenu);
document.querySelectorAll('[data-info]').forEach((el) => el.addEventListener('click', () => showInfo(el.dataset.info)));
document.querySelectorAll('[data-language]').forEach((el) => el.addEventListener('click', () => { setLanguage(el.dataset.language); refreshContext(); }));
for (const id of ['location-button', 'composer-location', 'chat-location-button']) $(id).addEventListener('click', showLocation);
$('province').addEventListener('change', populateMunicipalities);
$('location-form').addEventListener('submit', (event) => { event.preventDefault(); state.location = $('province').value ? { province: $('province').value, municipality: $('municipality').value } : null; $('location-dialog').close(); refreshContext(); });
$('location-reset').addEventListener('click', () => { state.location = null; $('location-dialog').close(); refreshContext(); });
document.querySelectorAll('dialog').forEach((dialog) => { dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!Recognition) $('mic-button').hidden = true;
$('mic-button').addEventListener('click', () => { if (state.recognition) { state.recognition.stop(); return; } if (state.voiceConsent) { startVoice(); return; } $('info-title').textContent = t('voiceTitle'); $('info-content').replaceChildren(); const p = document.createElement('p'); p.textContent = t('voice'); const button = createButton('primary-button', t('voiceStart'), () => { state.voiceConsent = true; $('info-dialog').close(); startVoice(); }); $('info-content').append(p, button); $('info-dialog').showModal(); });
initPolish(); setLanguage(state.language); refreshContext(); resizeTextarea();
