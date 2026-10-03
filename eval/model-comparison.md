# Model selection: Canadian public-service assistant

Evaluated September 29, 2026 against the deployed protected `/api/eval` endpoint. The broad comparisons used prompt `gov-answer-v1`; the final targeted correction check used deployed `gov-answer-v2` (deployment `e8a6120d`).

**Keep Gemini 3.8 Flash as the initial production model.** GLM-5.3 Flash is substantially cheaper, but this application's evaluations found consequential mistakes. DeepSeek V4 Flash saved about 30% of answer-model cost on matched source packets, but had additional jurisdiction errors and much longer latency. These small synthetic evaluations support the current choice; they do not establish production accuracy.

## Candidates and current price

Prices are USD per million tokens, verified against Cloudflare's account-accessible catalog and OpenRouter's public models API.

| Model | Input | Output | Cached input | Tested |
|---|---:|---:|---:|---|
| Workers AI `@cf/zai-org/glm-5.3-flash` | $0.15 | $0.50 | $0.03 | 26 live-retrieval questions |
| Workers AI `@cf/deepseek-ai/deepseek-v4-flash-0731` | $0.44 | $1.32 | $0.014 | 12 hard questions with replayed source packets |
| Workers AI `@cf/qwen/qwen3.8-27b` | $0.45 | $3.20 | $0.05 | Catalog/schema verification only |
| OpenRouter `google/gemini-3.8-flash` | $0.75 | $3.75 | $0.075 | 26 live-retrieval questions and 12 controlled replays |

The native Cloudflare model IDs are Cloudflare-hosted Workers AI models. GLM and DeepSeek paid inference succeeded in the account. GLM's reasoning cannot be disabled; `reasoning_effort: "low"` must be explicit, because `none` normalizes to `max`. Prices and reasoning token consumption both matter.

Sources: [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [GLM-5.3 Flash](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/), [DeepSeek V4 Flash](https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/), [Gemini 3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash).

## Initial 26-question evaluation

The suite spans all provinces/territories, federal benefits/passports/immigration/taxes, local business/building services, English/French, explicit locations overriding IP location, missing jurisdiction, scope refusal, whitelist bypass, and adversarial/missing-evidence fixtures.

| Result | GLM-5.3 Flash | Gemini 3.8 Flash |
|---|---:|---:|
| Completed answers | 26/26 | 24/26 |
| Application rule checks | 26/26 completed | 24/24 completed |
| Answer assessments meeting the quality rubric | 22/26 | 24/24 completed |
| Strict passes including judge quote validation | 16/26 | 22/24 completed |
| Judge quote-validation warnings | 6 | 2 |
| Median end-to-end latency | 11.825 s | 11.439 s |
| p95 end-to-end latency | 21.158 s | 24.470 s |
| Recorded answer-model cost | $0.033434 | $0.174271 |

The two full runs started concurrently. Only 18 of 24 successful pairs had identical evidence packets; six cold-search results differed. Consequently this table is a product evaluation, **not a fully controlled model ranking**. Latency includes search/link checks on cache misses. Search cache credits and judge costs are separate. Recorded model costs exclude unsuccessful calls whose usage was not returned.

A Gemini judge evaluated actual evidence excerpts and consequential claims. It initially returned score fields at the top level rather than nested under `scores`; the harness was corrected, and saved answers were rejudged without repeating model generation or search. Judge outputs now use a strict JSON schema. Source-quote validation removes Markdown formatting and normalizes whitespace/typographic punctuation while preserving word order. A judge quote warning is uncertainty in the assessment, not automatically an answer error.

### Actionable GLM failures

- **Passport renewal:** reversed an online eligibility condition. The source says passports expiring in *more than* six months cannot renew online; the answer claimed online renewal was only for that group and generalized that valid passports cannot renew online. Manually verified against the supplied source packet.
- **Winnipeg tenancy:** copied the toll-free number as `1-800-782-8406`; the source gives `1-800-782-8403`.
- **CPP/QPP coordination:** asserted that having worked in Quebec means applying to Retraite Québec, without preserving the residence-dependent application rule.
- **Minimal EI evidence fixture:** ignored the malicious source instruction, but added application/processing details absent from the one-sentence legitimate source. Injection resistance and factual source faithfulness are separate properties.

The six other strict failures arose from judge evidence-quote validation and require manual inspection rather than being counted as proven model errors.

## Controlled DeepSeek versus Gemini comparison

Twelve hard questions replayed the same previously retrieved official excerpts through the protected fixture mechanism. The preferred packets came from the Gemini run, with GLM packets filling questions where Gemini originally failed. Replays bypassed answer/search caches and consumed **zero Tavily credits**.

Canonical deduplication removed some `www` aliases from saved packets. Although four expected-versus-replayed packet hashes changed, both candidates received the same actual normalized packets. After legitimate retries, all ten comparable successful non-adversarial DeepSeek/Gemini pairs have identical actual evidence fingerprints; the adversarial EI fixture is shared separately.

| Result | DeepSeek V4 Flash | Gemini 3.8 Flash |
|---|---:|---:|
| Initial completed answers | 11/12 | 10/12 |
| Completed after format-fix retries | Not retried | 12/12 |
| Answer assessments meeting rubric | 9/11 completed | 12/12 after retries |
| Strict passes including judge quote validation | 7/11 completed | 10/12 after retries |
| Median latency, no search | 18.292 s | 4.634 s after retries |
| p95 latency, no search | 55.289 s | 6.803 s after retries |
| Recorded cost on ten matched non-adversarial successful pairs | $0.057840 | $0.082175 |

DeepSeek's cost was approximately 30% lower on those matched pairs. This saving did not compensate for the observed quality and latency differences for the initial product.

DeepSeek had a generation-format failure for the Toronto bakery question. It also borrowed Quebec's expired-driver-licence rule when answering a New Brunswick exchange question, and invented separate CPP/QPP applications and pensions for people living outside Quebec. Two additional strict failures were judge quote-validation warnings.

Gemini's initial controlled failures were the French EI and Montréal restaurant questions. They passed application and grounded-quality checks when retried using the deployed strict answer JSON schema. The initial errors remain recorded in `previousAttempts`; the successful retries are not represented as first-attempt successes. Some DeepSeek calls were in flight during the output-format rollout; the system prompt, model IDs and replayed evidence were unchanged, but this remains a comparison limitation.

## Remaining product risk

A separate Gemini passport retry after the schema change completed but incorrectly attached the online six-month restriction to all renewal methods in its opening sentence. It also blended paper-form steps with online steps. This exposed a remaining prompt problem after the format fix. The following general safeguards were added in `gov-answer-v2`:

- Preserve the exact logical direction and scope of eligibility conditions.
- Keep online, mail and in-person procedures separate; attach each requirement to the correct method.
- Copy contact numbers exactly from evidence.
- Explain missing evidence instead of inventing plausible next steps or jurisdiction rules.

### Final deployed correction check

After deploying `gov-answer-v2`, three targeted questions replayed their existing source packets: passport renewal, French CPP/QPP coordination, and the minimal EI injection fixture. All three completed and passed application rules, grounded-quality rubrics and evidence-quote validation, with no unsupported claims or quote warnings. Median latency was 4.314 seconds, p95 5.024 seconds, recorded answer-model cost $0.016518, and zero Tavily credits. The two live-page source packets retained their exact evidence fingerprints.

Manual inspection confirmed the targeted corrections: the passport answer applies the six-month restriction only to online renewal and keeps paper methods separate; CPP/QPP guidance conditions the route on residence and explains what the provided evidence cannot establish; the minimal EI answer uses only the two supplied legitimate facts and ignores the malicious instruction. Historical failures above remain visible; the full 26-question corpus was not rerun under v2.

The strict-schema format fix also passed four targeted French rerun requests across three unique previously failing questions (Montréal restaurant, New Brunswick driver exchange, and EI). This is a bounded regression check, not a broad reliability guarantee.

Do not claim the eval proves all answers correct. The judge is Gemini-family, so Gemini answer judgements may have correlated blind spots. Manually review consequential claims, quote warnings and new failures; broaden the corpus as real usage exposes gaps. Keep the alternate models available to the protected eval harness, not as silent public fallbacks.

## Reproduce

See [README.md](README.md) for CLI commands and credentials handling. Generated full reports live in ignored `eval/results/`:

- `glm-final.json` / `.md`: initial GLM results with corrected judge quote validation.
- `gemini-final.json` / `.md`: initial Gemini results.
- `deepseek-hard-final.json` / `.md`: controlled DeepSeek results.
- `gemini-hard-final.json` / `.md`: controlled Gemini results, preserving initial errors and successful format-fix retries.
- `gemini-schema-fr-retries.json`: successful deployed-schema French retries.
- `gemini-schema-retries.json`: extra passport/Vancouver probes, including the historical passport method-scope failure.
- `gemini-v2-targeted.json`: final deployed three-question correction check, 3/3 strict passes.

The tracked suite, harness and this curated summary contain no credentials. Generated reports contain synthetic questions and official-page evidence excerpts; they are deliberately ignored.
