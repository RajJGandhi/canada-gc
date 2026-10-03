# Jurisdiction routing registry

Registry version: `2026-09-29.1`. The application includes all 13 Canadian provinces/territories and 118 curated municipalities or municipal equivalents. It is a starting registry, not a complete Canadian municipal directory or a municipal boundary dataset.

## Data interpretation

- Municipal coordinates are manually curated approximate city-centre coordinates. They must not establish residence, municipal boundaries, service eligibility, Indigenous jurisdiction, or legal jurisdiction.
- `population` values are manually rounded **2021 census-order routing weights**. They are not current population estimates or exact published census counts. Some municipal equivalents cover much larger areas than their listed centre. The product does not display these weights as population facts.
- Nearby ranking is `population ** 0.35 / (distanceKm + 25) ** 1.7`. It favours reasonably large centres nearby without allowing the largest distant city to dominate. Up to eight municipal candidates are selected. Same-province candidates must be within 300 km, and cross-provincial candidates within 100 km. If no such candidate exists, up to three nearest registry municipalities in the known province/territory are used as fallback sources. Those are candidates, not a claim that the user lives there.
- Cloudflare IP geolocation is approximate. Only city/province hints reach the answer context; raw IP and precise latitude/longitude are not exposed by `publicContext`.
- Explicit locations in the current question override manual selection, recent user-message locations, and Cloudflare hints, in that order. Only user messages influence history-based location. A recognized moving destination takes precedence over the former home. This is deterministic name matching, not a full natural-language geocoder; ambiguous names and missing local coverage still require a clarifying question.
- A manual location accepts registered municipality IDs/slugs or province codes. It cannot add domains. A non-Canadian or missing location uses federal and all province/territory sources without guessing a municipality.
- The federal `gc.ca` namespace includes official dedicated departments such as Justice, Statistics Canada, Job Bank, and legacy CRA/IRCC sites. `canada.ca` page paths distinguish departments in source display.
- Domains are curated official government/municipal/agency websites. Only HTTPS and exact approved hosts or their subdomains are accepted. Credentials, unexpected ports, local IP addresses, and suffix impersonation are rejected. HTTPS alone does not establish authority: inclusion in this registry is required.

## Primary reference sources

The following official sources informed the administrative coverage and census-order routing weights. The registry is hand-curated; it is not represented as an exact export from these datasets.

- Statistics Canada, 2021 Census population and dwelling count tables, census subdivisions: https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/hlt-fst/pd-pl/Table.cfm?Lang=Eng&T=301&S=3&O=D
- Statistics Canada, 2021 municipalities population analysis: https://www12.statcan.gc.ca/census-recensement/2021/as-sa/98-200-x/2021001/98-200-x2021001-eng.pdf
- Ontario municipal list: https://www.ontario.ca/page/list-ontario-municipalities
- Ontario municipal data catalogue (validated June 3, 2026): https://data.ontario.ca/dataset/municipalities
- Québec official municipal directory (updated August 20, 2026): https://www.quebec.ca/gouvernement/portrait-quebec/repertoire-municipalites
- Alberta municipal profiles: https://www.alberta.ca/municipal-profiles
- British Columbia municipal framework: https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities
- Yukon local government directory: https://yukon.ca/sites/default/files/cs/cs-local-government-directory_0_0.pdf
- Nunavut official community directory confirms Rankin Inlet and Arviat municipal URLs: https://www.gov.nu.ca/en/communities/rankin-inlet and https://www.gov.nu.ca/en/communities/arviat
- Municipal sites themselves establish official identity, including https://www.v3r.net/, https://www.cityofdawson.ca/, and https://townhvgb.com/town-hall/.

## Updating coverage

Adding a municipal domain requires verifying it against its official government directory or the municipality's official website, adding a stable ID and approximate routing coordinates, then incrementing `REGISTRY_VERSION`. Source-cache keys must include this version. Do not add arbitrary suggested URLs from a model or a user. Additional regional districts, counties, Indigenous governments, health agencies, transit agencies, and municipal service portals should be curated explicitly as coverage expands.

## Launch link verification (September 29, 2026)

A read-only HEAD audit used ten concurrent requests and a 12-second per-request limit across the initial 142 municipal/provincial domain entries. 123 resolved successfully inside their approved domain. It found and corrected a dead Saint-Jérôme hostname (`vsj.ca` is the official site) and added verified current aliases `terrebonne.ca` and `levis.ca` alongside the old official hosts. See https://www.vsj.ca/, https://terrebonne.ca/a-propos-de-la-ville/, and https://levis.ca/fr/ville/decouvrir-levis/presentation-de-la-ville.

Some valid official sites reject HEAD requests or automated access with 403/405. `gov.nt.ca` and `gouv.qc.ca` are namespaces whose apex need not resolve; valid government subdomains remain approved. Separate checks confirmed the `www` hosts of Corner Brook, Nanaimo, the Northwest Territories, and Saskatchewan respond successfully despite apex-host errors. Canonicalization therefore preserves a checked `www` hostname instead of inventing an apex alias. The PEI site's redirect to a third-party anti-bot vendor is deliberately not approved. No TLS checks or anti-bot controls were bypassed. Homepage reachability does not guarantee every individual government page can be fetched; retrieval must report missing usable evidence rather than inventing it.
