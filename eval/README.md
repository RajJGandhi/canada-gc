# Canadian government assistant evaluations

`queries.json` contains 26 synthetic questions spanning all provinces and territories, English/French, cross-border municipalities, explicit locations overriding IP location, provincial and federal services, ambiguous local requirements, scope refusal, and two controlled source-injection/missing-evidence fixtures.

The suite avoids hardcoded fees or processing deadlines that can go stale. Its expectations instead require the answer to establish current consequential claims from the official evidence actually retrieved.

## Run

From `gov/`, with Node 22 or newer:

```sh
node scripts/eval.mjs --base https://gov.buildcanada.com --model @cf/zai-org/glm-5.3-flash --provider cloudflare --judge --out eval/results/glm.json
node scripts/eval.mjs --base https://gov.buildcanada.com --model google/gemini-3.8-flash --provider openrouter --judge --out eval/results/gemini.json
```

The protected `/api/eval` route requires `GOV_EVAL_TOKEN` in the process environment, or `EVAL_TOKEN` in the ignored `gov/.secrets.json`. The optional quality judge requires `OPENROUTER_API_KEY` in the environment or that ignored secrets file. Never put credentials in command arguments or generated reports.

Answer generation is fresh by default, while the backend can reuse its two-hour search cache. Run competing models consecutively to compare the same cached source packets. Verify `evidence` matches between reports before attributing differences entirely to the model. Use `--cached-answers` only when explicitly testing cache reuse.

For a controlled model comparison without repeated search, replay the exact source excerpts from a previous report:

```sh
node scripts/eval.mjs --model @cf/deepseek-ai/deepseek-v4-flash-0731 --provider cloudflare --sources-report eval/results/gemini-final.json --sources-fallback eval/results/glm-final.json --ids passport-renewal-en,ei-record-of-employment-fr --judge
```

`--sources-fallback` supplies evidence for questions where the preferred report had a generation error. Replayed live pages are marked separately from adversarial fixtures, do not consume Tavily credits, and include expected/actual evidence fingerprints. A changed fingerprint means the comparison is not identical and needs inspection. Run both candidates from the same report for a controlled comparison; simultaneous cold search can return different source packets.

Useful subsets:

```sh
node scripts/eval.mjs --limit 6 --judge
node scripts/eval.mjs --ids explicit-location-overrides-ip,ei-record-of-employment-fr --judge
node scripts/eval.mjs --fixtures-only --judge
node scripts/eval.mjs --review eval/results/glm.json --judge --out eval/results/glm-reviewed.json
```

Fixtures must be injected only through the protected eval endpoint, URL-validated against the registry, and explicitly marked `fixture: true` in the result. They must never be cached as real search results or accepted by the public chat route. The harness marks a fixture run inconclusive/failing if the endpoint does not confirm that it used the fixture.

## What is measured

**Rule checks:** answer presence, at most 300 selected domains, HTTPS sources within the selected allowlist, unique source IDs/canonical URLs, citation IDs resolving to supplied sources, expected province/municipality/domain coverage, approximate French-language detection, and obvious injected destination leakage. These checks measure application invariants and retrieval routing, not factual accuracy.

**Grounded answer quality:** the optional independent model judge sees the question, behavioural rubric, answer, source metadata and the exact evidence excerpts passed to the answering model. It scores correctness, claim support, jurisdiction, usefulness and language on a 0–4 scale; extracts supported/unsupported consequential claims; and flags critical failures. Passing requires every dimension >=3, no critical failures or unsupported consequential claims, and quoted supporting evidence actually present in the supplied excerpts. The harness validates the judge's evidence quotes after removing Markdown formatting and normalizing whitespace/typographic punctuation. A quote-validation failure marks the judgement unreliable; manually distinguish it from an actual unsupported answer claim. A run without a judge is explicitly marked unreviewed. Reports distinguish `answerQualityPass` (rubric and unsupported-claim checks) from `qualityPass` (also requiring valid judge evidence quotes), and count quote-validation warnings separately.

The default judge is `google/gemini-3.8-flash`; choose another through `--judge-model`. When Gemini is the answer model, a Gemini judge is not independent by model family and may have correlated errors. Judge results assist human review, not substitute for it. Review every unsupported consequential claim, every low-confidence judgement, and a sample of passed answers before making a deployment decision. These small synthetic runs do not establish broad production accuracy.

**Operational metrics:** answer-model token cost, search credits, median/p95 end-to-end latency, response/search/follow-up cache metadata. Judge costs are separate and available in individual judgement usage. Model cost estimates should use reported billable tokens, including reasoning tokens, rather than visible answer length.

JSON reports include answers, source metadata, evidence, rule checks and judge assessments; matching Markdown reports make review easier. Files under `eval/results/` are generated and ignored. They contain synthetic questions and retrieved public-source text, not credentials.

## Current candidate pricing

Verified September 29, 2026 against Cloudflare's account-accessible model catalog and OpenRouter's models API:

| Model | Input / million tokens | Output / million tokens | Cached input / million tokens |
|---|---:|---:|---:|
| Cloudflare GLM-5.3 Flash | $0.15 | $0.50 | $0.03 |
| Cloudflare DeepSeek V4 Flash 0731 | $0.44 | $1.32 | $0.014 |
| Cloudflare Qwen 3.8 27B | $0.45 | $3.20 | $0.05 |
| OpenRouter Gemini 3.8 Flash | $0.75 | $3.75 | $0.075 |

GLM and DeepSeek require Workers Paid or prepaid AI Gateway credits; paid inference succeeded in this account. GLM reasoning is mandatory: explicitly set `reasoning_effort: "low"` for this workload. Its default is `max`, and requesting `none` also normalizes to `max`. Both return OpenAI-style `choices[0].message.content` and `usage` when called through Workers AI.

A two-model synthetic French EI prompt with an injected malicious source instruction produced accurate cited French JSON from both. GLM used 159 input/87 completion tokens; DeepSeek used 155 input/1,027 completion tokens (reasoning included). That smoke test establishes parameter compatibility, not production answer quality. Prefer the full grounded suite for selection.

Sources: [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Workers AI releases](https://developers.cloudflare.com/changelog/product/workers-ai/), [DeepSeek V4 Flash](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/), [Gemini 3.8 Flash on OpenRouter](https://openrouter.ai/google/gemini-3.8-flash).
