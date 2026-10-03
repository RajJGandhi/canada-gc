# Retrieval and streaming performance checks

Measured September 29–30, 2026. These are small local integration samples calling live Tavily and OpenRouter services, not regional production percentiles or a quantified America.gov speed comparison. Gemini 3.8 Flash remained the answer model throughout.

## Implemented decisions

- Stream only the JSON answer field as provider text arrives; final JSON and every referenced source ID are still validated. Never emit hidden reasoning or followups as answer text. Propagate client cancellation to search, link checks and answer streaming.
- Check official URLs concurrently with one 1-second deadline per complete redirect chain. Every redirect destination must remain on the selected whitelist. Reject known 404/410 destinations. Timeout or blocked HEAD retains an approved indexed source with `urlChecked:false`; this is not a fresh-link guarantee.
- Use Tavily fast search for simple SIN navigation and a narrowly matched domestic passport-renewal navigation question. Complex requirements, dates, eligibility, fees, urgent travel, explicit abroad locations and municipal services retain advanced search. Domestic passport fast routing requires a Canadian, non-national location hint; foreign or missing location remains advanced.
- Budget simple fast answers to four pages. Prefer the SIN program's own pages and exclude US/abroad passport tangents only on the domestic navigation route. Advanced and limited fallback answers retain up to eight pages.
- Bound the primary search to 6 seconds. Timeout or 5xx permits one 5-second fast, snippet-only retry with the identical strict whitelist. A 429, client cancellation or other 4xx does not retry. The fallback is marked `retrievalLimited:true`, reports its actual depth and emits an explicit limited-search status; the model must disclose incomplete evidence. A failed primary may still incur provider charges beyond the fallback usage returned by Tavily.
- Preserve normal raw markdown: fresh paired checks did not show a snippet-only search latency improvement. Use snippets only on the explicit bounded reliability fallback.
- Uploaded text stays untrusted model context and bypasses shared caches. Pure document summaries can skip search through the parent pipeline; verification requests still retrieve official sources. Require issuer identification before authenticating an unnamed letter, and do not generalize one agency's policy to all government communications.

## Observations

| Question / configuration | Search | Links | First visible answer | Completion | Input tokens |
|---|---:|---:|---:|---:|---:|
| Simple SIN, first streaming probe, prior 1.8-second link budget | 0.691 s | 1.804 s | 4.001 s | 6.305 s | 8,903 |
| Simple SIN, four-page budget, prior 1.8-second link budget | 0.439 s | 1.807 s | 4.090 s | 7.653 s | 6,131 |
| Simple domestic passport navigation, cold app cache, final 1-second link budget | 0.718 s | 1.034 s | **3.580 s** | 6.314 s | 5,074 |
| Passport with six-month-expiry detail, advanced, prior 1.8-second budget | 7.083 s | 1.835 s | 10.926 s | 13.888 s | 8,744 |
| Montréal restaurant permits, advanced | 4.711 s | 0.870 s | 7.524 s | 10.627 s | 9,474 |
| Unnamed letter verification, final budgets, advanced succeeded | 2.858 s | 1.036 s | 6.144 s | 9.285 s | 11,913 |

The advanced passport measurement predates the new 6-second fallback deadline and is historical, not the expected final timeout behaviour. The parent reported an initial cold SIN completion of 19.03 seconds with roughly 13 seconds in serial retrieval; our samples above are separate runs, not a controlled regional comparison. One measured simple cold passport request reached the desired 3–5-second first-text range. Complex queries remain slower and variable.

Four-page SIN budgeting cut input tokens by 31%, but that sample generated more output, so completion time did not improve. Source-pack reduction should not be described as a demonstrated universal latency win.

### Raw markdown versus snippets

Fresh rephrased advanced requests, same domains and query within each pair:

| Query | Raw markdown | Snippets only | Source-pack characters, raw / snippets |
|---|---:|---:|---:|
| Passport renewal | 3.728 s | 4.221 s | 27,715 / 7,652 |
| Montréal restaurant | 4.753 s | 5.688 s | 39,703 / 16,755 |

The earlier original-query raw comparison was confounded by upstream Tavily caching. The fresh pairs show smaller source packs, not faster search; their order and sample size cannot establish a general ranking. Fast/basic restaurant searches missed important MAPAQ and municipal occupancy material, so local service queries were not moved to fast search.

## Quality and tests

- Passport, CPP/QPP and sparse EI saved-evidence replays under descriptive-link prompt v3 passed 3/3 deterministic rules, answer rubric and exact evidence-quote checks. These replays verify answer changes and do not measure cold retrieval.
- The cold simple passport sample received a 4/4 rubric but failed one exact judge-quote check because the judge collapsed list text. Manual review also identified an overly sufficient eligibility opening. Prompt v4 now says partial necessary conditions do not establish eligibility; its saved-packet replay used “may be able” and an official eligibility link.
- The v4 passport replay and live letter verification passed 2/2 strict automated checks. Manual letter review additionally caught overgeneralization of CRA policies to all federal communications; the explicit issuer/agency-scope guard was added and checked separately. A judge pass alone is not proof of all claims.
- Tests cover split JSON escapes and Unicode, SSE boundaries and reasoning exclusion, final usage, ID links, external-link removal, approved redirects, known error pages, one chain deadline, narrow fast routing, timeout fallback with unchanged domains, one 5xx retry, no 429 retry, and cancellation without retry. The complete integrated test suite passed 45/45 in the final run.

Artifacts are generated under ignored `eval/results/`: `retrieval-profile-before.json`, `performance-after-local.json`, `performance-sin-budget.json`, `retrieval-raw-fresh-profile.json`, `gemini-v3-stream-targeted-quality.json`, `fast-passport-cold.json`, `final-bounded-retrieval-quality.json`, and `pdf-issuer-guard-replay.json`. They contain synthetic questions and evidence, not credentials. App cache bypass does not imply upstream Tavily caches were cold.

## Bounded fallback verification

A live synthetic letter probe intentionally set the primary deadline to **1 ms** to exercise the fallback, retaining the normal 5-second fallback budget. It returned eight approved-domain snippet sources in 0.823 seconds and explicitly disclosed limited official evidence. First text arrived at 2.920 seconds and completion at 5.672 seconds. This direct helper probe skipped link HEAD checks and does **not** represent production timing with its normal 6-second primary budget. The answer attributed the letter, requested its issuing agency/program, and did not present a complete verification process. Artifact: `eval/results/pdf-bounded-fallback-probe.json`.

## Final production smoke check — September 30

Deployment `8f6de354-bc37-4cbc-b090-4bfeab044fe2`, public SSE endpoint, “How do I renew my Canadian passport?”:

| Run | First answer text | Complete response | Search cache | Answer cache |
|---|---:|---:|---|---|
| New answer using cached search | 2.049 s | 4.634 s | hit | miss |
| Repeated identical question | complete answer delivered | 0.123 s | not needed | hit |

Four sources returned. The repeated answer used zero search credits and zero model tokens. This is a warm-search production smoke check, not a cold-search benchmark or a direct America.gov comparison.

## September 30 default-depth update

Fast search is now the default for all requests. Advanced/basic remain explicit server configuration overrides. Four-page narrowing and domestic passport filtering are still restricted to simple navigation; detailed/local/foreign queries retain eight-page coverage. Retrieval version v6 invalidates prior answer/search cache keys. The advanced-mode timings above describe the earlier configuration.
