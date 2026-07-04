# SIGNAL / Manhattan

A live, zero-cost early-warning feed of new businesses opening in Manhattan, built for waste management and recycling sales prospecting.

Every new business leaves a paper trail before opening day. A liquor license gets posted, a building permit gets approved, a health inspection gets scheduled. This page pulls those trails live from free public APIs, so you can call a prospect weeks or months before every other hauler in the borough has the address.

## What it pulls, live

The page fetches four public data feeds. No API key, no login, no cost. A "Scan all signals now" button at the top of the feed section pulls fresh data from all four at once and reports how many leads it found in each; each tab also has its own smaller Refresh button if you just want to recheck one.

1. **DOB NOW Job Application Filings** (NYC Open Data, dataset w9ak-ipjd) — the earliest and strongest signal. DOB NOW classifies any filing that changes a building's use, occupancy, or egress as an "Alt-CO." That means someone is legally converting a space into a different kind of business, and it appears the moment the filing is submitted, months before a permit is even approved. This is marked experimental in the app: I could confirm the dataset and most of its fields, but not the exact column that holds the Alt-CO classification, so the page detects it adaptively and falls back to showing all Manhattan filings if it can't find a clean match. Verify this tab against the raw dataset link before relying on it for real calls.

2. NYS Liquor Authority current active licenses (data.ny.gov, dataset 9s3h-dpkz), filtered to New York County, newest first. A fresh license or temporary operating permit means a bar or restaurant is weeks from opening. If this dataset is unavailable the page falls back to the daily active license list (wg8y-fzsj) automatically.

3. DOB NOW approved permits (NYC Open Data, dataset rbx6-tga4), filtered to Manhattan, newest first. This is the confirmation step after an Alt-CO filing, and also where simpler renovation permits show up. If DOB NOW fails, the page falls back to the legacy BIS permit dataset (ipu4-2q9a) automatically.

4. DOHMH restaurant inspections (NYC Open Data, dataset 43nn-pn8j), filtered to Manhattan establishments whose inspection date is the 1900-01-01 placeholder. That placeholder is literally how the city flags a brand-new restaurant that has a permit but has not been inspected yet. These are the closest to opening.

Each lead has a copy button (tab-separated, pastes clean into a spreadsheet row) and every feed has an Export CSV button for bulk import into Salesforce.

## How to publish this on GitHub Pages

You only need to do this once. Five steps.

1. Go to github.com and create a new repository. Name it whatever you like, for example signal-manhattan. Set it to Public. Do not add any starter files.

2. On the new empty repository page, click the link that says "uploading an existing file."

3. Drag in the two files from this folder: index.html and README.md. Write anything in the commit message box and click Commit changes.

4. In the repository, go to Settings, then Pages in the left sidebar. Under Branch, choose main and the root folder, then Save.

5. Wait about one minute, then refresh the Pages settings screen. GitHub shows you the live URL, which will look like yourusername.github.io/signal-manhattan. That link works on your phone, your Chromebook, anywhere.

To update the page later, just upload a new index.html the same way. GitHub Pages republishes automatically.

## Design decisions worth knowing

Field names on government datasets change without warning. Instead of hardcoding every column name, the page probes each feed with a one-record request, detects which fields hold the name, address, county, and date, and builds its query from what it finds. If the state renames a column tomorrow the page degrades gracefully instead of going blank.

Query strings are built raw rather than with URLSearchParams, because Socrata silently ignores $where and $order parameters when the dollar sign gets URL-encoded. This is a known trap.

Results are cached in the browser session, so switching tabs is instant. The Refresh button forces a fresh pull.

## Honest limitations

The earliest signal of all, the 30-day community board liquor notice, has no API. It lives in PDF agendas on Manhattan community board websites. Checking CB1, CB2, CB4, and CB5 agendas takes about ten minutes a week by hand and is worth it.

The permit feed includes renovations that are not new tenants. Expect noise until you develop an eye for which work types mean a real buildout.

These are anonymous public API requests, which are occasionally rate-limited. If a feed fails to load, the Refresh button a minute later almost always fixes it.

## Data sources

NYC Open Data: https://opendata.cityofnewyork.us
New York State Open Data: https://data.ny.gov

All data is public record published by the City and State of New York.
