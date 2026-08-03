# Technical Briefing: Early-Signal Lead Feed (architecture codename SIGNAL)

Audience: a Claude instance rebuilding this architecture from scratch, possibly for a different territory or industry. Dense by design. No owner, employer, or prospect identifiers appear in this document; treat every value here as architecture, not data.

---

## 1. Purpose

A zero-cost, single-page web tool that surfaces businesses about to open in a target territory by mining the public paper trail they leave before opening day (construction filings, license applications, first inspections), ranked so a field sales rep can cold call them before competitors know the address exists. A thin optional serverless layer adds memory (what is genuinely new since yesterday) and a morning email digest.

## 2. Tech stack

| Layer | Choice | Version notes |
|---|---|---|
| Client | One static `index.html`, vanilla JS (ES2020), no framework, no build step | Deliberate constraint: owner deploys by drag-and-drop; keep it |
| Fonts | Barlow Condensed 600/700/800 (display), IBM Plex Sans (body), IBM Plex Mono (data) | Google Fonts, `display=swap` |
| Map | Leaflet 1.9.4 (unpkg, SRI-pinned) + OpenStreetMap tiles | Loaded with `defer`; all map code guards `typeof L === 'undefined'` |
| Charts | Chart.js 4.4.4 (cdnjs) | Same defer + guard pattern |
| Data APIs | Socrata SODA (city + state open-data portals) | Anonymous; optional app token raises rate limits |
| Geocoder | City-run GeoSearch v2 (`geosearch.planninglabs.nyc`), free, keyless | Backfill only; every answer cached |
| Serverless | Vercel Functions, Node >= 20, ESM (`"type":"module"`) | `api/*.js` auto-become functions; root serves statically because package.json has NO build script |
| State store | `@vercel/blob` ^2.6.1 (needs Node 20) | Single JSON blob, `addRandomSuffix:false`, `allowOverwrite:true`, `cacheControlMaxAge:60` |
| Cron | Vercel Cron via `vercel.json`, `30 11 * * 1-5` UTC | Hobby plan fires within ~1h of schedule, once/day max |
| Email | Resend HTTP API via raw `fetch`, no SDK | Default `onboarding@resend.dev` sender only delivers to the account owner's address |
| Hosting | Vercel, auto-deploy from GitHub default branch; previews per branch (SSO-protected), production public | Framework preset: none |

## 3. File map

```
index.html      Entire client app (~2000 lines): CSS, markup, six feed loaders, scoring,
                cross-feed overlap, map, charts, collapsible playbook, called-state, CSV export
lib/feeds.js    Server-side mirrors of the six feed queries; lead IDs constructed IDENTICALLY
                to the client's (first-seen tracking joins on source+id)
lib/scan-core.js  Storage-agnostic scan cycle: first-seen diff, 120-day pruning, digest HTML;
                  injectable loadState/saveState/fetchFeeds/now for unit testing
api/scan.js     Scan endpoint: fetch all feeds server-side, diff vs Blob state, persist,
                optionally email digest; 10-min public throttle; degrades VISIBLY without Blob
api/state.js    Read-only first-seen state; returns 404 when absent (client feature-detects)
vercel.json     Cron schedule only
package.json    type:module + @vercel/blob; deliberately no build script
README.md       Operator manual: feeds, ranking, setup steps, verification log, limitations
.gitignore      node_modules, .vercel
```

## 4. Data flow

```
SOURCES (all Socrata unless noted; IDs are for the original NYC build)
  A. Buildings dept job filings   w9ak-ipjd   filter job_type='Alteration CO' = change of use
  B. Liquor PENDING applications  f8i8-k2gm   earliest license signal, daily
  C. Liquor ACTIVE licenses       9s3h-dpkz   sorted by ORIGINAL issue date (not renewal)
  D. Approved building permits    rbx6-tga4   renewals + scaffold noise removed
  E. Consumer-affairs license apps ptev-4hud  application_type='New' = non-food storefronts
  F. Health inspections           43nn-pn8j   inspection_date = 1900-01-01 placeholder
                                              = permitted but never inspected = brand new

CLIENT PATH (runs on every page load / Scan click)
  browser --raw $-param GET--> Socrata
    -> per-feed transform: territory filter (server-side $where) -> drop dead records
       (withdrawn/terminated filings, permit renewals) -> dedupe by natural key ->
       cap rows (60-80) -> build lead {id, source, who, where, tag, when, ts, coords,
       addr, bonus, buildout}
    -> score (Sec. 5) -> sort score desc, ts desc
    -> AFTER full scan only: cross-feed overlap on normalized address -> multi flag ->
       re-score -> re-sort
    -> render list; leads w/o coords -> GeoSearch backfill (sequential, capped, cached)
    -> map pins + ZIP bar chart + scan-history line chart

SERVER PATH (cron weekday mornings, or GET /api/scan)
  function --fetch (X-App-Token if set)--> same six queries via lib/feeds.js
    -> runScan: newLeads = leads whose source:id key absent from state.firstSeen
       -> stamp firstSeen[key]=now -> prune keys gone from feeds >120 days
       -> save state -> if cron/authorized and newLeads>0 and not first scan ever:
          Resend digest grouped by feed

STORAGE
  sessionStorage  sig3_<feed>        per-tab result cache (fast tab switching)
  localStorage    sig_called         lead-key -> timestamp (worked leads, permanent)
                  sig_geo            addrKey -> {lat,lng}|null (geocode cache incl. misses)
                  sig_scan_history   last 30 scan totals (line chart)
                  sig_playbook       playbook open/closed
  Vercel Blob     signal/state.json  {firstSeen:{key:ts}, lastScanAt, lastCounts, lastErrors}

DISPLAY LINKAGE
  client GET /api/state -> lead is NEW if key absent from firstSeen (appeared after last
  cron) OR firstSeen < 48h ago -> green pill. 404 => feature silently off (static hosting).
```

## 5. Scoring logic, complete

Score computed per lead by `scoreLead()`, re-computed whenever `multi` changes.

**Base by feed (earlier signal = higher):**
`{altco:40, slapending:38, dcwp:34, sla:30, dob:30, doh:24}`; unknown source falls back to 20.

**Recency (from the lead's own date, ms epoch `ts`):**
age <= 7 days +20; <= 30 days +12; <= 90 days +5; older +0; `ts === null` (health feed has no usable date) skips recency entirely.

**Per-feed bonuses (additive, stored on lead as `bonus` at build time):**
- Permits (dob): work_type matches `/general construction/i` +8; `estimated_job_costs >= 100000` +6.
- Filings (altco): no `first_permit_date` yet (earliest stage) +4; `initial_cost >= 100000` +6.
- Liquor both (sla, slapending): license description matches `/restaurant|tavern|club|hotel|catering|eating|bar\b/i` +6 (on-premises = high waste volume).
- dcwp, doh: 0.

**Cross-feed overlap:** after a full scan, addresses normalized by `addrKey()` (uppercase; strip `.,#`; STREET->ST, AVENUE->AVE, BOULEVARD->BLVD, PLACE->PL, ROAD->RD, WEST->W etc.; strip ordinal suffixes `1ST->1`; collapse whitespace). Same key in >= 2 feeds sets `multi=true` = **+25** and an orange "multiple signals" row treatment. This is the single biggest bonus by design: two independent government trails at one address is the strongest possible signal.

**Ordering:** score desc, tiebreak `ts` desc. Score is displayed on the row as "priority N" so the ranking is never a black box.

**Pre-score exclusions (never scored, never shown):** filing_status matching `/withdraw|terminat|abandon/i`; permit filing_reason matching `/renewal/i` (a renewal is an old job resurfacing). Display-layer (not score): `buildout` boolean gates the "Likely buildouts only" checkbox on the permits tab — `NEVER_BUILDOUT_WORK` regex (sidewalk shed, scaffold, protection, fence, sign) always false; `general construction` always true; else description keyword regex (tenant, fit-out, restaurant, retail, salon, gym, clinic, office, change of use, ...).

**Bugs actually fixed in this codebase (verified against live APIs on 2026-07-12):**
1. **Cache-buster 400s.** Original code appended `_=<timestamp>` to every Socrata URL. Socrata rejects unrecognized query params with HTTP 400, so likely every feed failed on every request. Fix: remove the param; `fetch(..., {cache:'no-store'})` handles staleness. Related trap kept from the original: `$where`/`$order`/`$limit` param NAMES must keep a raw `$` (never URLSearchParams); VALUES may be percent-encoded.
2. **NULL dates sort first.** `$order=<date_col> DESC` floats null-dated rows to the top (the "newest permits" list opened with a 2019 sidewalk shed), and `IS NOT NULL` can time out on large datasets. Fix: every date sort pairs with a rolling date-floor `$where` (`col > 'YYYY-MM-DD'` computed client-side), which also enforces freshness by construction.
3. **Guessed schema was wrong.** The active-liquor dataset spells fields with NO underscores (`premisescounty`, `originalissuedate`, `actualaddressofpremises`) while its sibling pending dataset USES underscores (`premises_county`, `received_date`). The documentation-derived loader 400ed into its fallback. Fix: live-verify every field name against real API records, then keep a runtime `missingFields()` check across all returned rows that surfaces renamed columns in a visible yellow notice instead of silently degrading.
   Also fixed in the same spirit: a silent "show ALL filings unfiltered" fallback when the change-of-use filter didn't match (replaced by an exact live-verified `job_type` value + a group-by self-discovery query + a hard visible error, in that order); a cross-dataset permit lookup keyed on legacy job numbers that could never match the new system's IDs (replaced by the dataset's own `first_permit_date` column); and a map palette pair indistinguishable under protanopia (replaced with a validated 6-slot categorical palette).

**IMPORTANT — do not import phantom bugs.** The owner's brief for this document mentioned three fixes ("negative Days Old", "revenue correlation", "account flags"). Those do NOT exist in this codebase or its history: there is no Days Old field (age is computed from timestamps at score time and cannot go negative without a future-dated record, which would simply get +20), and no revenue or account-flag inputs anywhere. They almost certainly belong to a different tracker (likely a spreadsheet-based one). If rebuilding THIS architecture, implement the three real fixes above; if the reader is handed the other tracker, ask the owner for that artifact rather than inventing behavior.

## 6. Automation vs manual

**Automated:** feed fetching, filtering, dedupe, scoring, overlap detection, geocode backfill (cached), map/chart rendering, weekday-morning server scan, first-seen diffing and pruning, NEW pills, digest email, deploy on merge to the default branch (host auto-build).

**Manual (owner):** pressing Scan (client-side refresh; one/morning suffices, sources update daily), marking leads called, CSV export into CRM, merging PRs, one-time setup (connect a Blob store; optional env vars `RESEND_API_KEY`, `DIGEST_TO`, `SOCRATA_APP_TOKEN`, `CRON_SECRET`; redeploy after env changes). Permanently manual by nature: community-board PDF agendas and corporate-registry lookups — no API exists; documented in-app as "manual watch" rungs rather than pretended coverage.

## 7. Fragile points and hardcoded values

- **Dataset IDs and field names** are hardcoded per loader (correct approach — adaptive guessing was the original sin), protected by runtime `missingFields()` notices; a government rename still requires a code edit. The exact filter literals: `job_type='Alteration CO'`, county value `'NEW YORK'` via `upper()`, `application_type='New'`, placeholder `inspection_date='1900-01-01T00:00:00.000'`, `boro` (not borough) on the health feed.
- **Self-heal regex** for the change-of-use category: `/alt/i && /(co\b|c\.o\.|occupancy)/i` over a `$select=job_type,count(*)&$group` probe; if it mismatches a future rename, tab shows a hard error (by design).
- **Rolling windows:** filings 270d, liquor both 180d, permits 120d, consumer-affairs apps 365d. Row caps 60–80/feed. `GEO_MAX=60` lookups/scan, 150ms spacing.
- **Geo sanity box:** lat 40.4–40.95, lng -74.3–-73.65 (NYC); wrong for any other metro.
- **addrKey abbreviation table** is US-street-suffix specific and minimal; overlap detection quality depends on it.
- **Score weights/thresholds** (Sec. 5) are opinion, not calibration; documented so they can be argued with.
- **Server/client ID contract:** `source + ':' + id` must match EXACTLY between `lib/feeds.js` and index.html or first-seen tracking silently marks everything new. This is the most dangerous invariant in the system; it is stated in comments in both files.
- **Blob semantics:** single JSON at fixed path `signal/state.json`; public URL (fine: public-record data only); 60s CDN staleness on overwrite; no locking (cron + 10-min throttle make races unlikely, not impossible).
- **Cron drift:** schedule is UTC (no DST awareness; morning email shifts an hour in winter); hobby tier fires within ~1h.
- **Digest suppression on first scan ever** (`lastScanAt==0`) — deleting the blob resets memory and re-suppresses one digest.
- **Third-party availability:** unpkg + cdnjs CDNs (SRI-pinned Leaflet; deferred so page works without them), Google Fonts, city geocoder, anonymous Socrata rate limits (~throttled occasionally; Refresh usually fixes; app token env raises limits).
- **Single-file client** (~90KB HTML) is a merge-conflict magnet; any two branches touching it will conflict. Keep one working branch.
- **localStorage keys:** `sig_called`, `sig_geo`, `sig_scan_history`, `sig_playbook`, sessionStorage prefix `sig3_` (bump the prefix when the cached row shape changes).
- **House style rules:** fail visibly, never silently (every fallback announces itself in a yellow notice; every dead feed shows a plain-language error); no en/em dashes, no emojis in user-facing copy; all motion behind `prefers-reduced-motion`; scripts-blocked load must render fully (reveal animations gated behind an `html.js` class).

## 8. Rebuild recipe (generic hauler in a new metro, or any industry)

Substitute the signal set per industry; architecture is invariant. Generic example: a hauler rep in Metro X wants businesses before opening day.

**Step 0 — signal discovery (research, not code).**
Prompt: "List every free public dataset for {metro/state} that fires BEFORE a business opens: building change-of-use filings, building permits, liquor/alcohol license applications AND issued licenses, general business license applications, health/food first inspections or new-establishment flags. Prefer Socrata/ArcGIS/CKAN portals with JSON APIs and daily updates. For each: dataset ID, update cadence, how early it fires (days before opening), and the exact column that distinguishes 'new' from 'renewal/inspection of existing'. Rank by earliness."

**Step 1 — live schema verification (non-negotiable, do first).**
Prompt: "For each candidate dataset, fetch 2 real records from the live API and record: exact field names (never trust docs — sibling datasets from the same agency spell fields differently), the exact filter literal values (case, punctuation), which datasets carry coordinates natively, and whether date-DESC sorting floats NULLs first. Use small `$limit`s and date-range filters, never IS NOT NULL. If your environment blocks these hosts, find a proxy/fetch tool that works before writing any code — a runtime self-check in the page is the fallback, not a substitute."

**Step 2 — static client, fail-visible.**
Prompt: "Build a single-file index.html, no framework, no build step: dark editorial theme, one tab per feed, each loader using explicit verified field names with (a) territory + rolling date-floor `$where`, (b) dead-record exclusions, (c) natural-key dedupe, (d) a runtime check that reports renamed columns across all returned rows in a visible notice, (e) a plain-language error state — never silent fallback, never unfiltered data. Socrata rules: raw `$` in param names, encode values only, no extra query params ever. Cache per-tab in sessionStorage. Copy-per-lead (tab-separated) and CSV export."

**Step 3 — scoring + overlap.**
Prompt: "Add an explainable points score per lead: base by feed ordered by signal earliness (40 down to 24), recency steps (+20/+12/+5 at 7/30/90 days), 2-3 per-feed quality bonuses (work type, job cost threshold, license class), and a +25 cross-feed bonus when a normalized address appears in 2+ feeds after a full scan (write an addrKey normalizer for local street conventions). Sort score desc then date desc; print the score on the row."

**Step 4 — rep workflow state.**
Prompt: "localStorage 'mark called' (source:naturalId key) with a default-on hide toggle and visible hidden-count note; a 'likely {industry-relevant} only' noise checkbox for the noisiest feed with visible hidden-count; CSV exports what is visible and includes score + called."

**Step 5 — map + charts.**
Prompt: "Leaflet map (deferred script, typeof-guarded), one validated colorblind-safe categorical color per feed (run a palette validator against the dark surface; labels everywhere so identity is never color-alone), native coordinates first, free keyless geocoder as backfill only — sequential, capped per scan, localStorage-cached including misses, hard lat/lng sanity box for the metro. Chart.js ZIP bar chart + localStorage scan-history line."

**Step 6 — serverless memory (the only thing statics can't do).**
Prompt: "Vercel: `lib/feeds.js` mirroring the client queries with IDENTICAL lead IDs; `lib/scan-core.js` pure first-seen diff + N-day prune + digest HTML, dependency-injected for tests; `api/scan.js` (Blob state, cron-triggered digest via Resend raw fetch, first-scan-ever suppression, 10-min public throttle, visible degradation when Blob missing); `api/state.js` read-only 404-when-absent; `vercel.json` weekday-morning UTC cron; package.json type:module with NO build script so the root stays static. Client: fetch /api/state, mark leads NEW if unknown-to-server or first seen <48h; 404 = feature off silently."

**Step 7 — design + playbook.**
Prompt: "Elevate: film grain, single accent glow, oversized condensed display type, crop-mark corners, IntersectionObserver reveals gated behind an html.js class, everything off under prefers-reduced-motion. Add a collapsed-by-default 'playbook' between hero and content: pipeline strip of the paper trail with CALL HERE badges on the earliest stages, five numbered steps for the daily route, animated open via grid-template-rows 0fr->1fr (no height measuring), chevron rotation, staggered step fade, localStorage-persisted, aria-expanded synced."

**Step 8 — mobile.**
Prompt: "Defer heavy libs + window.load re-render; 44px measured tap targets on all working controls; hover effects become :active press states under (hover:none); full-width primary actions; swipe affordance on the tab row (hidden scrollbar, third tab peeking); body overflow-x clip; theme-color meta; verify at 390px touch viewport: zero horizontal scroll in every state, screenshot every section."

**Step 9 — verification harness (used at every step above).**
Prompt: "Playwright against the real file over localhost with route-stubbed APIs whose stubs ONLY answer when the request contains the exact verified filter strings (this catches query regressions, not just render bugs). Test: happy path per feed, self-heal path, hard-error path, fallback-with-notice path, called persistence, overlap flagging across differently-formatted addresses, playbook geometry (collapsed height ~= bar, open > content) and persistence. Unit-test scan-core with injected clock/storage: seed, diff, prune, digest content, per-feed failure isolation. After deploy, curl the production /api/scan and read its JSON as ground truth."

Order matters: 0-1 before any code (the original build inverted this and shipped four latent query bugs); 9 continuously; 6 only after 2-5 are verified, because the ID contract freezes there.
