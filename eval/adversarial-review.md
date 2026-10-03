# Adversarial review — 2026-09-30

Candidate: live `gov.buildcanada.com`, deployment `a9f5444b`. Independent code and live browser review. Browser actions used `cua_repl` exclusively. Source-level probes used Node without browser automation. App source was not edited by reviewer.

## Findings and resolution

1. **Medium — Unseparated SIN bypasses masking and sensitive cache bypass.** `src/cache.js:36` masks only nine digits separated into groups by spaces/hyphens. A synthetic probe of `privacyFilter([{role:'user',content:'My SIN is 123456789'}])` returns the identifier unchanged and `cacheable:true`. It can therefore reach Tavily/model and shared caches. The privacy notice correctly says best effort, but this is a common structured identifier format worth covering. Mask standalone nine-digit identifiers or contextual SIN/NAS forms and add a regression test. **Status: fixed and verified on deployment `8f6de354-bc37-4cbc-b090-4bfeab044fe2`; see verification below.**

2. **Medium — Document summaries can be retained through ordinary feedback.** `src/client.js:137–140` offers thumbs on every answer, including the locally extracted document summary verified live in French. Feedback sends full answer text; `src/index.js` writes it without privacy filtering with `TTL.feedback = 31536000`. Document conversation cache bypass does not prevent this one-year retention. Global privacy copy discloses feedback storage, but the document flow tells users that extracted text is shared with the AI service and never says the resulting summary can be stored by a thumbs click. Prefer suppressing content-bearing feedback for private conversations, or collect rating only without answer/source text. **Status: fixed and verified on deployment `8f6de354-bc37-4cbc-b090-4bfeab044fe2`; see verification below.**

3. **Low — Autocomplete Escape and arrow navigation are incomplete.** Live repro: type `passport`, press ArrowDown, then Escape. Suggestion retains focus and stays open. Only textarea handles Escape/ArrowDown (`src/client.js`, keydown handler); suggestion buttons do not handle arrows/Escape. Enter does correctly copy a chosen suggestion into the composer without submitting. **Status: fixed and verified live on deployment `8f6de354-bc37-4cbc-b090-4bfeab044fe2`.**

## Additional polish observations

- PDF preview's `Attach this text to my next question` is not a commitment boundary: Escape/X closes the dialog with text already attached. This was confirmed live. The chip clearly remains visible and sending still requires the question action, but a `Done` label or explicit attach/cancel semantics would be clearer.
- French model-generated followup `De quel organisme ou programme gouvernemental ce document provient-il ?` asks the user a clarification but becomes a button that submits the same question back to the assistant. Prefer followups phrased as useful user requests, and leave requests for missing user information in answer prose.
- At 390px, typography is readable and the bottom composer fits, but the floating composer plus tall white fade obscures a substantial portion of the lower viewport. The two location controls in chat are redundant. A smaller fade would leave more answer visible.
- Desktop composition has a strong serif headline, coherent navy accents, generous space and good local photography. The hero and search are convincing; answer layout is more utilitarian. Sources remain below the answer with descriptive links and cards, as requested. Long official titles can repeat between inline links and cards; keep inline labels action-oriented.
- Small text remains in photo attribution, independence banner and composer helper. These are not primary tasks but would benefit from slightly stronger contrast and size.
- Tables have `width:100%` but no dedicated overflow wrapper in current CSS. This is a source-inspection risk for multi-column model output; the actual tested text/list answers had no horizontal overflow.

## Verified live

- Desktop landing page, real photo carousel, search focus and selection.
- Repeated Enter while a request is running yields one user turn; no duplicate answer was observed.
- Stop followed immediately by New conversation restores an empty home view; no late response repopulated it. Request identity and AbortController guards also reviewed in source.
- New passport response has descriptive official links, source button and source cards at bottom; no visible numbered citations. Answer is readable at desktop and 390 × 844.
- At 390px, `document.documentElement.scrollWidth === innerWidth === 390` in the tested conversation.
- Source modal opens, Escape closes it and focus returns to the source trigger.
- French home, composer, PDF preview, extraction state and summary render correctly.
- Synthetic `government-letter.pdf` extracts locally and displays all 255 characters in preview. Scanned PDF produces an explicit OCR-needed message. Corrupt PDF produces a recoverable read error. Attachment removal removes its chip.
- French pure-summary question returns a document-attributed summary, states no official verification was done, and has no invented official sources.
- No exact latency claim is made from manual browser sampling. Dedicated performance records should establish first-token and completion times. A sampled screenshot cannot certify absence of every animation flash.

## Code/security review

- PDF module is lazy, same-origin PDF.js worker/assets; file bytes go to PDF.js locally. Only normalized extracted text is included in chat JSON. 10 MB / 25 pages / 24k characters enforced. Scripts/annotations are not rendered. Document context bypasses shared caches, and browser `privateConversation` survives removal until restart.
- Pure-summary routing is narrow. Broader verification questions use official retrieval without sending the document object to Tavily. Search uses user turns, not assistant summaries.
- Model/source/document content is treated as untrusted in prompts. This is a model behavior control, not a proof against semantic injection; existing fixture evals should remain the quality gate.
- HTML is escaped by frontend rendering. Independent probes for raw `<img onerror>`, SVG inside source-link labels, javascript/data URLs and attacker HTTPS links produced escaped text or non-clickable labels. Unknown source IDs fail final parsing. Stream URL links only become clickable if their exact URL maps to retrieved source metadata.
- HTTPS whitelist checks enforce host boundary, disallow credentials/ports/trailing-dot hosts and recheck each redirect. Max domain list is 300. HEAD timeout falls back to indexed evidence rather than inventing a verified fetch.
- Request body is bounded while streaming, not merely by Content-Length. Message/document size validation reviewed. Public callers cannot supply evaluation fixture/model override via chat args.
- Search budgets, retry on timeout/5xx only, cancellation propagation and final-answer cache cancellation check reviewed. Cloudflare model binding lacks an explicit signal argument, though deployed OpenRouter requests do carry signal/timeout.
- Reduced-motion CSS disables animations and transitions; carousel interval checks preference. This was source-reviewed, not tested by changing OS accessibility settings.

## Review limits

No real personal files, credentials or sensitive user data were submitted. No feedback was sent. Protected eval token was not read. No browser-network interception or OS motion preference changes were used. Mobile means responsive desktop browser viewport; native iOS keyboard behavior was not tested. Findings above should be rechecked after the next deployment.


## Focused fix verification — 2026-09-30

Deployment `8f6de354-bc37-4cbc-b090-4bfeab044fe2`: all three actionable findings are closed. No new blocking regression was observed in this focused pass.

- **Identifier protection:** reviewed the optional-separator nine-digit mask and bare-phone mask. Ran four focused backend/document tests: plain SIN/NAS/phone masking, existing structured identifiers, normalized document identifiers, and actual worker feedback route behavior. All four passed. Tests verify cache bypass and avoid matching a longer 12-digit reference.
- **Private feedback retention:** pipeline tags private answers; frontend suppresses rating controls based on that tag or persistent private-conversation state. Live synthetic PDF summary showed only Copy and Save as PDF actions, with no thumbs controls. Worker route test verifies flagged private summaries and sensitive answers cause no KV write, while ordinary feedback still stores. No feedback was submitted to production.
- **Autocomplete:** live `passport` → ArrowDown → Escape now closes suggestions and returns focus to the textarea. With the empty-query catalog open, ArrowDown advances from the first to second suggestion; ArrowUp returns through the first suggestion to the textarea.
- **PDF wording:** live preview now says `Done`, accurately describing its close action. Summary remained document-attributed with explicit no-verification wording and no official source links.
- **Followup wording:** the sampled summary now offers user-perspective requests (“What documents typically serve as proof of residency?” and “How can I find out which department sent this letter?”). This verifies the sample, not a universal model guarantee.
- **Additional polish:** source inspection confirms a shorter composer fade, scrollable table wrapper, larger helper text and hidden redundant upper location. Live chat confirms the upper location is absent. These supersede the corresponding original-candidate observations above; no fresh mobile campaign was needed for the three focused fixes.
