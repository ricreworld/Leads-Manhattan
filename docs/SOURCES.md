# Market Watch — Additional Lead Sources (Deep-Search Catalog)

Research run 2026-07-09: 107 agents, 25 primary sources fetched, every claim below
adversarially verified by a 3-judge panel unless marked otherwise.
Confidence marks: ✅ verified 3-0 · 🔶 primary source read but verification pass was
rate-limited (treat as very likely, confirm on first use) · ❌ refuted (listed so
nobody re-chases it).

The catalog covers only sources **not already** in scan.js / index.html.

---

## 1. APHIS regulated garbage & HPAI (bird flu)

### ✅ APHIS HPAI detections — commercial & backyard flocks
- **URL:** https://www.aphis.usda.gov/livestock-poultry-disease/avian/avian-influenza/hpai-detections/commercial-backyard-flocks
- **Coverage:** national, broken down by state and county — filter to NY/NJ/CT/MA
- **Signal:** confirmed HPAI detections in commercial/backyard flocks → depopulation and carcass/litter disposal events. APHIS-regulated material routes per facility rules (Hempstead, Essex/Union/Camden, SECONN — never Babylon)
- **Format:** HTML page with an underlying dataset (page states "confirmations and dataset")
- **Fetch:** overnight scanner (scrape/dataset download); replaces the old tool's single NYSDAM page scrape with the authoritative national feed
- **Updates:** as detections are confirmed; APHIS states daily updating on the livestock page

### ✅ APHIS HPAI detections — mammals & livestock (dairy cattle)
- **URL:** https://www.aphis.usda.gov/livestock-poultry-disease/avian/avian-influenza/hpai-detections/mammals
- **Signal:** H5N1 in mammals incl. dairy cattle, state-by-state, daily updates with new/cumulative 30-day counts — early warning for large depopulation/disposal events
- **Format/Fetch:** HTML → overnight scanner

### ✅ APHIS Regulated Garbage program (standing-target intel, not a feed)
- **URLs:** https://www.aphis.usda.gov/regulated-garbage · compliance manual PDF: https://www.aphis.usda.gov/sites/default/files/ppq519a.pdf
- **Verified facts for the pitch:**
  - Regulated garbage = all waste derived from fruits/vegetables/meats/plant/animal (incl. poultry) material + associated refuse from international conveyances
  - Applies to conveyances that touched any port outside US/Canada in the prior 2 years (1 year for Hawaii/territories)
  - APHIS/CBP jointly enforce it, and **APHIS has historically mandated incineration or sterilization of all regulated garbage** — the demand driver
  - Handlers must keep spill/disinfection logs 3 years and notify CBP/APHIS on contamination — compliance pain to sell against
- **Use:** watchlist section on every territory page: ports & airports receiving international arrivals (regulated-garbage caterers, haulers, vessel agents)
- ❌ **Refuted:** APHIS does *not* publish a public list of compliance-agreement holders — there is no feed of handler companies to scrape; prospect them manually

### ✅ APHIS Spongy Moth quarantine map (invasive plant-material adjacent)
- **URL:** https://www.aphis.usda.gov/plant-pests-diseases/spongy-moth/spongy-moth-quarantine-map
- **Signal:** quarantine covers the entire Northeast; county additions are announced as they happen — regulated movement of plant material/articles
- **Format:** interactive map; program uses ArcGIS (Field Maps) so a REST FeatureServer likely backs it — probe from the scanner
- **Fetch:** overnight

---

## 2. Environmental bids & RFPs

### ✅ SAM.gov Get Opportunities Public API — the big one
- **Endpoint:** `https://api.sam.gov/opportunities/v2/search` (JSON REST; docs: https://open.gsa.gov/api/get-opportunities-public-api/)
- **Coverage:** all federal solicitations — remediation RFPs, AFFF/PFAS disposal, DoD site work, disaster debris
- **Query:** requires `postedFrom`/`postedTo` (MM/dd/yyyy, ≤1-year window); filter by NAICS (`ncode=562910` remediation, `562211` haz-waste disposal), place-of-performance state, keyword
- **Access:** free personal API key from a SAM.gov account (Account Details page) — **key expires every 90 days** (rotate), and **non-federal accounts get ~10 requests/day**, so batch: one call per state per night = 4 calls, well inside the cap
- **Fetch:** overnight scanner (server-side key). Proven pattern: MIT-licensed github.com/MindPetal/sam-search polls it daily from GitHub Actions
- **Action needed from Ricardo:** create the SAM.gov account + API key, add as `SAM_API_KEY` secret in the repo's Actions settings

### ✅ CTsource Bid Board (Connecticut state)
- **URLs:** https://portal.ct.gov/das/ctsource/bidboard → actual app: https://webprocure.proactiscloud.com/wp-web-public/ (Proactis WebProcure; per-solicitation docs under `/MainBidBoard/solicitation…`)
- **Coverage:** all State of Connecticut goods/services solicitations
- **Access:** public, **no registration needed to view**
- **Format/Fetch:** HTML/JS app → overnight scanner scrape of the WebProcure public board, keyword-filter environmental/remediation/waste/PFAS

### ✅ COMMBUYS (Massachusetts state)
- **URLs:** https://www.commbuys.com/bso/external/publicBids.sdo (public bid search) · how-to: https://www.mass.gov/how-to/search-for-procurements-in-commbuys
- **Coverage:** MA executive agencies + many municipalities
- **Access:** public, free, no account to read
- **Format:** HTML search interface — **no JSON API or CSV feed exists**, so it's a server-side scrape (same approach as NJSTART). Fallback push channel: a free "Seller" account emails new-posting notifications
- **Fetch:** overnight scanner

### ✅ BidNet Direct — Connecticut Purchasing Group (municipal aggregation)
- **URL:** https://www.bidnetdirect.com/connecticut
- **Coverage:** state + local CT agencies (municipal landfill closures, water utilities)
- **Caveat (verified):** anonymous HTTP fetches return **403 bot-protection** — not scanner-friendly. Use the free "Limited Access" registration tier, which emails matching-solicitation alerts instead
- **Fetch:** human/email channel, not the scanner

---

## 3. Invasive species

### ✅ NY iMapInvasives
- **URL:** https://www.nyimapinvasives.org/ (administered by NY Natural Heritage Program)
- **Coverage:** New York statewide; 235,000+ invasive species location records incl. documented management/treatment efforts
- **Signal:** active treatment/management sites = invasive plant biomass that must be hauled & destroyed (can't compost knotweed/phragmites)
- **Format:** exports + WMS web services; bulk programmatic path: NY records published to **GBIF via a NatureServe Darwin Core Archive** — no login needed for that route
- **Fetch:** overnight scanner (GBIF/DwC-A download); the web app itself is login-gated
- Note: CT/MA equivalents exist in the same iMapInvasives network (imapinvasives.natureserve.org ArcGIS REST returned unreliable in this run — re-probe from the scanner)

---

## 4. PFAS / AFFF (incineration-only)

### 🔶 MassDEP AFFF Take-Back Program
- **URL:** https://www.mass.gov/info-details/afff-takeback-program
- **Verified-source facts:** statewide collection of PFAS AFFF since 2018 (with Mass. Dept. of Fire Services); expanded to modern AFFF; **420,000+ lbs (~49,400 gal) collected through June 2025**; currently destroyed **out of state (Ohio) via fuel-blending/RDF incineration**
- **Signal:** the destruction contract itself is a competitive target for ReAssure (in-region, >1,100°C, COD) — plus every participating fire department is a mapped AFFF holder
- **Fetch:** program page, not a feed → Dan's MA watchlist + a direct BD pursuit

### 🔶 NJDEP AFFF Collection & Disposal Program
- **URL:** https://dep.nj.gov/pfas/afff/
- **Verified-source facts:** statewide program mandated by 2024 law (P.L. 2023 c.243), **$16.6M appropriation**, free to fire departments; the NJ deadline to stop using PFAS foams was **extended to January 1, 2027**
- **Signal:** every NJ fire department/facility that missed registration still holds AFFF and faces a hard deadline — direct call list for Doug and Howard; the state disposal contract is a competitive target
- **Fetch:** watchlist + program monitoring

### UCMR5 / SDWA PFAS occurrence data (known, fetch-blocked this run)
- https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule (quarterly CSV of PFAS results by water system) and https://echo.epa.gov/trends/pfas-tools — fetches returned unreliable through this session's proxy; both are established EPA datasets. Re-probe from the GitHub Actions scanner (which has direct egress) before writing them off.

---

## 5. Hazardous waste manifests, RCRA, USTs/LUST

### ✅ RCRAInfo Hazardous Waste Information Platform (HWIP)
- **URLs:** https://rcrapublic.epa.gov/rcra-hwip/ · CSV downloads: https://rcrapublic.epa.gov/rcra-hwip/data-access/csv-downloads
- **Coverage:** national (NY/NJ/CT/MA) hazardous waste generation, management, transportation
- **Format:** CSV; **most data refreshed nightly from RCRAInfo** — ideal cadence for the scanner
- **Signal:** who generates what, in what volume — richer than the ECHO generator feed the tool uses today

### ✅ EPA e-Manifest REST API
- **Endpoint:** `https://rcrainfo.epa.gov/rcrainfoprod/rest` (JSON; docs: https://usepa.github.io/e-manifest/)
- **Killer query:** `POST /api/v1/emanifest/search` filterable by `stateCode` (NY/NJ/CT/MA), `siteType` (Generator/Transporter/Tsdf), status, date — i.e., **see which generators are shipping which waste to which competitor TSDFs**
- **Access:** API ID/key generated inside RCRAInfo by a user with **Site Manager permission for an EPA-registered site** — Reworld's facilities qualify; ask EH&S to generate credentials. Public no-credential route exists but delayed 90 days after manifest completion: https://rcrapublic.epa.gov/rcrainfoweb/action/main-menu/view
- **Tooling:** EPA maintains an official **npm package `emanifest`** — drops straight into the Node scanner

### ✅ Connecticut UST/LUST registry — browser-fetchable today
- **Endpoint:** `https://data.ct.gov/resource/utni-rddb.json` (Socrata, same CORS-open portal as the CT feeds already in the page)
- **Coverage:** CT underground storage tanks — facility + tank details; companion datasets: contacts, compliance, enforcement, and Active UST Facilities map (dataset `6ff4-znmw`)
- **Updates:** maintained (last update June 2026); refreshed as notification forms are filed
- **Signal:** petroleum/LUST sites → contaminated soil & oily debris leads
- **Fetch:** can go straight into index.html's live CT scan — no scanner needed

### ✅ EPA UST Finder (backfill, not a feed)
- **Format:** ArcGIS hosted feature layer "UST Finder Feature Layer 2021" (EPA org on ArcGIS Hub), standard FeatureServer REST/JSON, exportable
- **Coverage:** national UST + LUST with release date, cleanup status, substance released
- **Caveat (verified):** static snapshot — state data is 2018–2019 vintage. Use once to **backfill an MA LUST inventory** (MA has no live LUST feed in the tool), not as a nightly poll

---

### ✅ Port Authority of NY & NJ — Solicitations Advertised (added 2026-07-09)
- **URLs:** https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html → boards: `goods-services.html`, `Construction.html`, `professional-services.html` · e-bidding: https://panynj.bonfirehub.com/portal/?tab=openOpportunities
- **Why it matters:** PANYNJ is a bi-state agency **exempt from the NYS Contract Reporter and absent from NJSTART** — its contracts appear nowhere else the tool watches. It owns JFK, LGA, EWR, Stewart, the marine ports, tunnels/bridges, WTC. Confirmed live example: *"Refuse Removal, Disposal and Recycling Service For John F. Kennedy International Airport - Two (2) Year Contract"* (sibling: Jersey City facilities refuse contract #5752827, $5M–$10M estimate range).
- **Signal:** refuse removal/recycling, hazardous-material handling, remediation, asbestos abatement, demolition debris across all PA facilities — recurring 2–3 year service contracts, big volumes
- **Access/format:** advertisement pages are public HTML on panynj.gov (Akamai — needs browser-like UA headers). Bonfire portal is Cloudflare-walled, **not scanner-friendly**; it's the human bidding path (free vendor registration)
- **Fetch:** `paBidsScan()` in scan.js — scrapes all three boards nightly, keyword-filters, routes NY-side ads → NY tab, NJ-side ads → North Jersey tab, unhinted → both

## Recommended wiring order

| Priority | Source | Where it goes | Blocker |
|---|---|---|---|
| 1 | CT UST/LUST (`utni-rddb`) | index.html live scan, CT tab | none — same portal as existing feeds |
| 2 | APHIS HPAI flocks + mammals | scan.js overnight, all tabs | none |
| 3 | SAM.gov Opportunities API | scan.js overnight, bids sections | Ricardo creates free API key → repo secret |
| 4 | CTsource/WebProcure scrape | scan.js overnight, CT bids | none |
| 5 | COMMBUYS scrape | scan.js overnight, MA bids | none |
| 6 | RCRA HWIP nightly CSV | scan.js overnight, all tabs | none |
| 7 | iMapInvasives via GBIF | scan.js overnight, NY (then CT/MA) | none |
| ✔ wired | PANYNJ Solicitations Advertised | scan.js overnight, NY + North Jersey bids | none — verify parse on first live run |
| 8 | e-Manifest API | scan.js overnight | EH&S generates RCRAInfo API credentials |
| 9 | UST Finder ArcGIS | one-time MA/CT backfill script | none |
| — | MassDEP + NJDEP AFFF programs | watchlist cards + BD pursuit | none (not feeds) |
| — | BidNet CT | email alerts to Dan | free registration |
