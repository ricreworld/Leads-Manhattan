# SIGNAL / Manhattan

A live, zero-cost early-warning feed of new businesses opening in Manhattan, built for waste management and recycling sales prospecting.

Every new business leaves a paper trail before opening day. A liquor license gets posted, a building permit gets approved, a health inspection gets scheduled. This page pulls those trails live from free public APIs, so you can call a prospect weeks or months before every other hauler in the borough has the address.

## What it pulls, live

The page fetches six public data feeds. No API key, no login, no cost. A "Scan all signals now" button at the top of the feed section pulls fresh data from all six at once and reports how many leads it found in each; each tab also has its own smaller Refresh button if you just want to recheck one.

1. **DOB NOW Job Application Filings** (NYC Open Data, dataset w9ak-ipjd), the earliest and strongest signal. DOB NOW classifies any filing that changes a building's use, occupancy, or egress as an "Alteration CO" (Alt-CO, formerly Alt 1). The page filters on the exact job_type value "Alteration CO", verified against the live API. If the city ever renames that value, the page asks the dataset for its current list of job types, adopts the one that looks like Alt-CO, and tells you it did so in a yellow notice; if it can't find one it shows an error instead of quietly showing wrong records. Withdrawn filings are removed, each lead shows the filing's own job description, and the dataset's first_permit_date column shows whether a permit has issued yet. Filings from the past 9 months.

2. **SLA pending license applications** (data.ny.gov, dataset f8i8-k2gm, updated daily), filtered to New York County, newest received date first. This is the moment a bar or restaurant's liquor application lands at the state, weeks to months before the license issues. Past 6 months.

3. NYS Liquor Authority current active licenses (data.ny.gov, dataset 9s3h-dpkz), filtered to New York County, sorted by original issue date so genuinely new licenses come first rather than renewals of old bars. Past 6 months. If this dataset is unavailable the page falls back to the daily active license list (wg8y-fzsj) automatically, and says so in a notice when it does.

4. DOB NOW approved permits (NYC Open Data, dataset rbx6-tga4), filtered to Manhattan, past 4 months. Permit renewals are removed, since a renewal is an old job resurfacing, not a new buildout. A "Likely buildouts only" checkbox (on by default) hides scaffolds, sidewalk sheds, plumbing-only and similar maintenance permits unless the job description reads like a new tenant fit-out; a note tells you how many were hidden. If DOB NOW fails, the page falls back to the legacy BIS permit dataset (ipu4-2q9a) automatically, and says so.

5. **DCWP license applications** (NYC Open Data, dataset ptev-4hud), new applications only, at Manhattan premises, past year. This catches the non-food storefronts the other feeds miss: secondhand dealers, salons, laundromats, garages, newsstands and so on, at the moment they apply for their operating license.

6. DOHMH restaurant inspections (NYC Open Data, dataset 43nn-pn8j), filtered to Manhattan establishments whose inspection date is the 1900-01-01 placeholder. That placeholder is literally how the city flags a brand-new restaurant that has a permit but has not been inspected yet. These are the closest to opening.

## How leads are ranked and worked

Leads no longer just sort newest first. Each lead gets a priority number from a simple points system: earlier-stage feeds start higher, fresher dates add points, and real buildout markers (general construction work, a six-figure job cost, an on-premises liquor type) add a bonus. The number shows under each lead's date so the ranking is never a mystery.

The strongest signal of all is overlap. After a full scan, the page compares addresses across all four feeds, and any storefront that shows up in more than one feed gets a "multiple signals" flag, the biggest scoring bonus, and an orange edge on its row. That's the lead to call first.

Each lead has a Copy button (tab-separated, pastes clean into a spreadsheet row) and a "Mark called" button. Called leads disappear from the list and stay hidden on this device, even across scans; uncheck "Hide called" to review or un-mark them. Export CSV downloads whatever is currently visible with your filters applied, including the priority number and called status, ready for Salesforce import.

The map plots every lead it can. All six feeds publish coordinates on most records (verified against the live APIs), and the few addresses that arrive without them are located through the city's own free GeoSearch service (geosearch.planninglabs.nyc, no key needed), a few at a time, with every answer cached in your browser so repeat scans cost zero lookups.

## How to publish this on GitHub Pages

You only need to do this once. Five steps.

1. Go to github.com and create a new repository. Name it whatever you like, for example signal-manhattan. Set it to Public. Do not add any starter files.

2. On the new empty repository page, click the link that says "uploading an existing file."

3. Drag in the two files from this folder: index.html and README.md. Write anything in the commit message box and click Commit changes.

4. In the repository, go to Settings, then Pages in the left sidebar. Under Branch, choose main and the root folder, then Save.

5. Wait about one minute, then refresh the Pages settings screen. GitHub shows you the live URL, which will look like yourusername.github.io/signal-manhattan. That link works on your phone, your Chromebook, anywhere.

To update the page later, just upload a new index.html the same way. GitHub Pages republishes automatically.

## Design decisions worth knowing

Every feed now uses explicit column names verified against the live APIs instead of guessing at the schema. The page still re-checks those names at runtime against the records it receives: if the city or state renames a column, a yellow notice appears above the list saying exactly which columns went missing, instead of the data quietly degrading. The rule everywhere is fail visibly, never silently.

Query strings are built raw rather than with URLSearchParams, because Socrata silently ignores $where and $order parameters when the dollar sign gets URL-encoded. Parameter values (not names) are percent-encoded, which Socrata accepts. Related trap: never append extra made-up query parameters like a "_=123" cache buster, because Socrata rejects unrecognized parameters with an error. The page relies on the browser's no-store fetch mode instead.

Results are cached in the browser session, so switching tabs is instant. The Refresh button forces a fresh pull. Called leads and geocoded addresses persist in localStorage on your device.

If you ever hit rate limits from scanning a lot, a free Socrata app token raises them substantially. You can create one with a free account at data.cityofnewyork.us and add it to the request URLs, but the page works fine without one.

## Verification status

Every dataset id, field name, and filter value in this version was verified against the live NYC Open Data and data.ny.gov APIs on July 12, 2026: real records were fetched and inspected for all six feeds, including confirming the exact "Alteration CO" job type value, the exact county value on both liquor datasets, and which feeds carry coordinates. The whole pipeline (loading, filtering, ranking, cross-feed matching, geocoding, error states) was also exercised end to end in a browser. The page still re-verifies each feed's schema at runtime and reports anything unexpected in plain language, because government datasets change without notice; if a feed's yellow notice or error message ever appears, that message is the ground truth.

Two live-verified traps worth recording: the two SLA datasets spell their columns differently (the active list has no underscores, like originalissuedate, while the pending list does, like received_date), and sorting any dataset by a date column puts blank dates first, so every date sort here is paired with a rolling date window like "past 6 months", which also keeps the lists fresh by construction.

## Honest limitations

The earliest signal of all, the 30-day community board liquor notice, has no API. It lives in PDF agendas on Manhattan community board websites. Checking CB1, CB2, CB4, and CB5 agendas takes about ten minutes a week by hand and is worth it.

The buildout classifier is keyword-based. It will occasionally hide a real lead whose job description is vague, and occasionally show a renovation that isn't a new tenant. The note above the list always says how many permits were hidden, and one click shows everything.

These are anonymous public API requests, which are occasionally rate-limited. If a feed fails to load, the Refresh button a minute later almost always fixes it.

## Data sources

NYC Open Data: https://opendata.cityofnewyork.us
New York State Open Data: https://data.ny.gov
NYC GeoSearch (geocoding): https://geosearch.planninglabs.nyc

All data is public record published by the City and State of New York.
