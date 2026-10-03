# Life-event checklists

## London business prototype

Open `/life-events/start-business-london` after `npm ci && npm run dev`.
No API keys or additional environment variables are needed for the checklist.
The existing chat still needs its existing provider credentials. Do not add real
personal information to development fixtures.

This is an English prototype for a new resident-owned small service or retail
business in London, Ontario. The page says so explicitly; its French control
explains the limitation and links to the existing French question service.
Partnerships, non-resident ownership, charities and complete regulated-industry
application paths are outside the slice. Regulated activities, employment and
customs have clearly labelled additional-review steps, not an assertion that
every possible obligation has been enumerated.

## Existing architecture and the change

The repository is a vanilla ES-module browser client bundled with esbuild, served
by a Cloudflare Worker. The Worker exposes a streamed chat pipeline with Tavily
retrieval, official-domain validation, geolocation/manual jurisdictions, KV caches,
and OpenRouter or Workers AI generation. There was no life-event model, checklist
route, account system or saved checklist state. London already existed in the
jurisdiction registry. The existing shell is bilingual, with paper/green/navy
colours, serif display typography, native dialogs and mobile layouts. No AGENTS.md
was present in the cloned repository.

The change retains that architecture:

| File | Responsibility |
| --- | --- |
| `src/app.js` | Tiny route entry; lazy-load checklist or existing chat client |
| `src/life-events/london-business.js` | Reviewed source registry, questions and ordered steps |
| `src/life-events/engine.js` | Pure applicability, dependencies, state validation and local persistence |
| `src/life-events/intent.js` | Route constant and narrow business-entry invitation matcher |
| `src/checklist-client.js` | Checklist rendering, native controls, sources, filters, dialogs and progress |
| `public/checklist.css` | Scoped extension of the existing design system |
| `test/life-events.test.js` | Branching, integrity, dependency, persistence and intent tests |

The Worker already serves unknown non-API paths through its SPA asset fallback.
No new endpoint, dependency, framework, database, migration, secret or model call
is needed. The checklist does not load the chat client, call `/api/context`, or
send business choices to an API. Static page requests still reach the existing
hosting infrastructure. Links take users to agency sites; the prototype never
submits an application or creates an account.

A home-page card opens the guide. Narrow English phrases such as “How do I start
a small business?” offer an invitation dialog naming London explicitly. Users can
continue with ordinary chat. Specific questions, other cities, attached documents
and French chat retain their existing paths. Location is never inferred from the
business-entry matcher.

## Reusable schema (version 1)

All content is plain serializable JavaScript data; no embedded functions or dynamic
evaluation. A life event contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion`, `version`, `id`, `locale` | Model version, content/state version, stable identity and language |
| `title`, `scope`, `jurisdiction` | Human title, explicit coverage and country/province/municipality identifiers |
| `phases[]` | Ordered group IDs, titles and descriptions |
| `questions[]` | Stable ID, label, help, explicit default, enumerated value/label options |
| `steps[]` | Ordered checklist items, dependency parents before their children |

Each step contains:

| Field | Meaning |
| --- | --- |
| `id`, `title`, `description`, `phase` | Stable identity and task content |
| `jurisdiction`, `agency` | Government level and responsible agency |
| `kind` | `check` or `application`; a required review is not a universal filing obligation |
| `requirement` | `required`, `conditional` or `optional` |
| `applicability` | Serializable rule plus a plain-language explanation |
| `why`, `prerequisites`, `documentsNeeded` | Rationale, preparation and information to have ready; never collected here |
| `dependencies[]` | `stepId`, `kind` (`required` or `recommended`) and explanation |
| `profileKeys[]` | Answers that invalidate this step's completion when changed |
| `confirmationFields[]` | Optional answers that must be resolved before a review can be marked complete |
| `estimatedTime` | `status` and `label`; published service standard or explicitly unknown |
| `cost` | `status`, `label`, optional `amount`/`currency`; unknown never means free |
| `completionMethod` | `online`: yes, partial, information-only or not-applicable; explanatory label |
| `completionCriteria` | What the user is acknowledging, distinguishing submission from issuance |
| `sources[]` | Required nonempty evidence list; each has `url`, `title`, `lastVerified`, `verification` |
| `lastVerified` | Editorial review date; never a date stamped at runtime |
| `notes[]`, `ambiguityFlags[]` | Qualifications, missing evidence, disagreements and scope limits |

A source array replaces singular `sourceUrl` / `sourceTitle` fields so an item can
cite both a requirement and separate fee/instruction pages. Every item must have
at least one authoritative URL. Source provenance is shown in each expanded step
and in the full source directory.

Flags have `type` and `message`, optional supporting `sourceUrls`, and an optional
`when` rule. Types include `source-conflict`, `source-gap`, `verification-limit`,
`site-specific`, and `scope-limit`.

Rules are a small expression tree:

```js
// A missing answer or the reserved value "unknown" evaluates to null.
{ field: 'employees', in: ['yes'] }
{ any: [{ field: 'employees', in: ['yes'] }, { field: 'regulated', in: ['yes'] }] }
{ all: [{ field: 'structure', in: ['sole'] }, { field: 'name', in: ['legal'] }] }
```

`null` rule means applies to all. False removes the item from the active plan and
puts it in the explained exclusions section. Unknown keeps the item visible and
not completable. All/any use three-valued logic, not truthiness. No `eval`.

Dependencies are navigation/sequence constraints in this checklist, not a claim
that government systems technically enforce the same workflow. Legal or
administrative dependencies must be supported by the step's sources. Inactive
parents are ignored, so mutually exclusive incorporation routes do not deadlock.
Unknown required parents block completion. Every step remains readable, including
blocked ones. Application-specific evidence gaps are displayed, not guessed.

## Progress and storage

Key: `gov:life-event:start-business-london`. Stored JSON contains content version,
validated enumerated answers, a profile-confirmation flag and progress records.
Each completion record has a timestamp and a fingerprint of the content version
and relevant answers. No free text, address, name, identifier or document is stored.

The initial plan is visibly labelled an example. The user must review and confirm
choices before completion controls are enabled. `unknown` remains a useful answer:
it preserves unresolved steps instead of acting as a no.

Every answer change reconciles progress. A changed fingerprint drops that
completion; descendants with incomplete required parents also lose completion.
Unchecking a parent behaves the same way. Unrelated work survives. Hidden steps do
not count toward progress and their old completions are removed. Optional steps
are shown but excluded from the primary completion denominator. Unknown steps are
included and counted as unresolved. Completion describes the listed actions, not
legal permission to operate or completeness of specialist obligations.

Storage parsing, enum validation, corrupt JSON, version mismatch, denied access
and failed writes are handled. A blocked browser remains usable in memory and
shows that progress will not persist. Reset affects only this event's key, with
an in-product confirmation. A version bump deliberately resets the saved plan;
there is no migration service. Concurrent tabs are not synchronized; the last
saved tab wins. Do not use two tabs to edit the same checklist concurrently.

## Research and uncertainty

Editorial review: 2026-10-03 UTC. Official pages, official PDF instructions and
indexed evidence from official sites were consulted. Some Ontario HTML pages
returned access errors. Their entries say `indexed-evidence`; successful official
PDF/page reads say `page-reviewed`. Neither a checked URL nor a review date is a
claim of government endorsement or a live compliance check.

Key cases retained in the data:

- Ontario name registration depends on using another name, including a corporation's
  operating name. The general Ontario startup page is broader than its detailed
  Business Names Act notice; the detailed notice establishes this branch.
- London asks for a “Master Business Licence” or incorporation documents. Its page
  does not explain how a sole proprietor using a full personal name satisfies that
  requirement. The applicable step asks the user to confirm acceptable evidence.
- GST/HST uses actual taxable worldwide supplies, associated businesses and the
  single-quarter versus consecutive-quarter distinction. It does not turn a
  forecast into an immediate registration requirement. Special activities require
  separate review. The ordinary threshold is **over**, not equal to, $30,000.
- Ontario's HST overview uses broader shorthand. CRA's detailed timing guide is the
  evidence used here for the threshold and effective date.
- WSIB's public guide and operational policy describe different stages of the
  registration deadline. Both links are preserved with an explicit conflict flag.
- London premises, inspections and regulated-sector permits cannot be established
  from an industry toggle alone. Unknowns remain visible. The product does not
  calculate a total startup cost or completion time from missing evidence.

Fees are limited to verified Ontario filing fees. Other application fees and
processing estimates remain unknown or variable. A business-plan advice step is
recommended, not represented as a compulsory government application.

## Add another life event

1. Establish its jurisdiction, target user and explicit exclusions. Read the
   controlling agency guidance and record source/verification metadata.
2. Add a serializable dataset beside `london-business.js` using the schema above.
   Use stable IDs. Include `unknown` for questions that affect obligations.
3. Keep requirements separate from applicability and progress. Add only supported
   documents, fees, deadlines and dependencies. Describe unresolved evidence in
   flags. Do not backfill from model memory.
4. Add data/engine tests and run `validateEvent`. Ensure every dependency points to
   an earlier item, every source is authoritative, and every fully answered
   supported path can complete. Test realistic excluded and unknown paths.
5. Add a route to `app.js` and pass/import the dataset into the checklist renderer.
   The current renderer intentionally has London-specific intro and help copy;
   move that copy to event metadata when adding a second event. Do not duplicate
   the applicability or persistence engine.
6. Add an explicit entry link and conservative chat invitation if useful. Never
   silently replace an explicitly requested jurisdiction.
7. Review at mobile widths and by keyboard. Check source labels, progress updates,
   focus after filters, denied storage, reload, reset and changed answers.
8. Bump `version` when a content/rule change should require saved work to be
   reviewed. Change `schemaVersion` only for an incompatible model change.

## Validation

- `npm test`: original tests plus life-event tests.
- `node test/life-events.test.js`: detailed output for the 11 new tests, including
  360 fully answered profile combinations.
- `npm run check`: browser build and Wrangler deployment **dry run**, no deployment.
- Browser QA should use the real Worker dev server (`npm run dev`) so deep links,
  CSP and SPA fallback are exercised. The checklist itself needs no AI credentials.

Prototype verification completed on 2026-10-03: all six test files passed,
including the 11 new life-event tests; the production build and Wrangler dry run
passed. Chromium browser checks covered confirmation, branching, prerequisite
gates, invalidated completions, reload, reset, denied storage, filters, source
dialogs and the chat invitation. No checklist API requests or browser JavaScript
errors occurred. Layouts at 320, 390, 768 and 1440 pixels had no horizontal
overflow. Desktop expanded steps and the mobile flow had zero axe-core violations
for WCAG 2 A/AA and 2.1 AA rules. Automated checks do not replace user testing or
a full screen-reader/accessibility audit. Other browser engines are not yet tested.

No changes to production Worker bindings, credentials or deployment automation
are part of this feature. A push to `main` triggers the existing production
workflow; review this work on its feature branch first.
