// Server-side versions of the six live feeds. Every dataset id, field name,
// and filter value here was verified against the live NYC Open Data and
// data.ny.gov APIs on 2026-07-12 (real records inspected). The queries and
// the lead id construction MUST stay identical to the ones in index.html,
// because the "first seen" tracking joins server records to page records by
// source + id.
//
// Socrata gotchas that shaped these queries (all verified live):
// - Parameter NAMES like $where keep their raw dollar sign; VALUES are
//   percent-encoded. Encoding the $ makes Socrata silently ignore the param.
// - Unknown extra query parameters (cache busters) are rejected with 400.
// - Ordering by a date column DESC floats NULL dates first, and IS NOT NULL
//   can time out, so every date sort pairs with a rolling date floor.
// - The two SLA datasets spell their columns differently: the ACTIVE list
//   has no underscores (premisescounty), the PENDING list has them
//   (premises_county).

const isoDaysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

async function getJSON(url, fetchImpl, appToken){
  const headers = appToken ? {'X-App-Token': appToken} : {};
  const res = await fetchImpl(url, {headers, cache: 'no-store'});
  if(!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function snip(s, n){
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if(!t) return '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function dateMs(v){
  if(!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.getTime();
}

// DOB NOW: Build, Job Application Filings (w9ak-ipjd), Alt-CO only.
async function loadALTCO(fetchImpl, appToken){
  const base = 'https://data.cityofnewyork.us/resource/w9ak-ipjd.json';
  const url = base
    + '?$limit=150'
    + '&$where=' + encodeURIComponent(`job_type='Alteration CO' AND upper(borough)='MANHATTAN' AND filing_date > '${isoDaysAgo(270)}'`)
    + '&$order=' + encodeURIComponent('filing_date DESC');
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    if(/withdraw|terminat|abandon/i.test(d.filing_status || '')) continue;
    const job = d.job_filing_number || JSON.stringify([d.house_no, d.street_name, d.filing_date]);
    if(seen.has(job)) continue;
    seen.add(job);
    const addr = [d.house_no, d.street_name].filter(Boolean).join(' ');
    const owner = [d.owner_first_name, d.owner_last_name].filter(Boolean).join(' ');
    rows.push({
      id: job,
      source: 'altco',
      who: owner || d.applicant_business_name || 'Owner name not listed on filing',
      where: (addr || 'Address not listed') + (d.postcode ? ' ' + d.postcode : '') + ', Manhattan',
      tag: ['Alt-CO, change of use or occupancy', snip(d.job_description, 110), d.filing_status || ''].filter(Boolean).join(' · '),
      ts: dateMs(d.filing_date)
    });
    if(rows.length >= 80) break;
  }
  return rows;
}

// SLA Current Pending Licenses (f8i8-k2gm). Fields use underscores.
async function loadSLAPending(fetchImpl, appToken){
  const base = 'https://data.ny.gov/resource/f8i8-k2gm.json';
  const url = base
    + '?$limit=100'
    + '&$where=' + encodeURIComponent(`upper(premises_county)='NEW YORK' AND received_date > '${isoDaysAgo(180)}'`)
    + '&$order=' + encodeURIComponent('received_date DESC');
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    const name = (d.dba || '').trim() || (d.legalname || '').trim();
    const addr = (d.actual_address_of_premises || '').trim();
    const id = d.application_id || (name + '|' + addr);
    if(seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      source: 'slapending',
      who: name || 'Applicant name not listed',
      where: (addr || 'Address not listed') + (d.zip_code ? ' ' + d.zip_code : '') + ', Manhattan',
      tag: [(d.description || 'License application'), d.status || ''].filter(Boolean).join(' · '),
      ts: dateMs(d.received_date)
    });
    if(rows.length >= 60) break;
  }
  return rows;
}

// SLA Current Active Licenses (9s3h-dpkz). Fields have NO underscores.
async function loadSLA(fetchImpl, appToken){
  const base = 'https://data.ny.gov/resource/9s3h-dpkz.json';
  const url = base
    + '?$limit=100'
    + '&$where=' + encodeURIComponent(`upper(premisescounty)='NEW YORK' AND originalissuedate > '${isoDaysAgo(180)}'`)
    + '&$order=' + encodeURIComponent('originalissuedate DESC');
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    const name = (d.dba || '').trim() || (d.legalname || '').trim();
    const addr = (d.actualaddressofpremises || '').trim();
    const id = d.licensepermitid || (name + '|' + addr);
    if(seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      source: 'sla',
      who: name || 'Licensee name not listed',
      where: (addr || 'Address not listed') + (d.zipcode ? ' ' + d.zipcode : '') + ', Manhattan',
      tag: [(d.description || 'License'), 'Issued'].filter(Boolean).join(' · '),
      ts: dateMs(d.originalissuedate || d.effectivedate)
    });
    if(rows.length >= 60) break;
  }
  return rows;
}

// DOB NOW: Build, Approved Permits (rbx6-tga4), renewals removed.
async function loadDOB(fetchImpl, appToken){
  const base = 'https://data.cityofnewyork.us/resource/rbx6-tga4.json';
  const url = base
    + '?$limit=250'
    + '&$where=' + encodeURIComponent(`upper(borough)='MANHATTAN' AND approved_date > '${isoDaysAgo(120)}'`)
    + '&$order=' + encodeURIComponent('approved_date DESC');
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    if(/renewal/i.test(d.filing_reason || '')) continue;
    const job = d.job_filing_number || '';
    const work = d.work_type || '';
    const dedupeKey = job + ':' + work;
    if(job && seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const addr = [d.house_no, d.street_name].filter(Boolean).join(' ');
    rows.push({
      id: dedupeKey,
      source: 'dob',
      who: d.applicant_business_name || d.owner_business_name || d.owner_name || 'Business name not listed on permit',
      where: (addr || 'Address not listed') + (d.zip_code ? ' ' + d.zip_code : '') + ', Manhattan',
      tag: [work, snip(d.job_description, 90)].filter(Boolean).join(' · '),
      ts: dateMs(d.approved_date || d.issued_date)
    });
    if(rows.length >= 80) break;
  }
  return rows;
}

// DCWP License Applications (ptev-4hud), new applications only.
async function loadDCWP(fetchImpl, appToken){
  const base = 'https://data.cityofnewyork.us/resource/ptev-4hud.json';
  const url = base
    + '?$limit=100'
    + '&$where=' + encodeURIComponent(`borough='Manhattan' AND application_type='New' AND submission_date > '${isoDaysAgo(365)}'`)
    + '&$order=' + encodeURIComponent('submission_date DESC');
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    const id = d.application_id || (d.business_name + '|' + d.submission_date);
    if(seen.has(id)) continue;
    seen.add(id);
    const addr = [d.building_number, d.street].filter(Boolean).join(' ');
    rows.push({
      id,
      source: 'dcwp',
      who: (d.dba_trade_name || '').trim() || d.business_name || 'Business name not listed',
      where: (addr || 'Address not listed') + (d.zip ? ' ' + d.zip : '') + ', Manhattan',
      tag: [(d.business_category || 'License'), 'New license application'].filter(Boolean).join(' · '),
      ts: dateMs(d.submission_date)
    });
    if(rows.length >= 60) break;
  }
  return rows;
}

// DOHMH Restaurant Inspections (43nn-pn8j), 1900-01-01 placeholder rows.
async function loadDOH(fetchImpl, appToken){
  const url = 'https://data.cityofnewyork.us/resource/43nn-pn8j.json'
    + '?$where=' + encodeURIComponent("upper(boro)='MANHATTAN' AND inspection_date='1900-01-01T00:00:00.000'")
    + '&$limit=300';
  const data = await getJSON(url, fetchImpl, appToken);
  const seen = new Set();
  const rows = [];
  for(const d of data){
    if(seen.has(d.camis)) continue;
    seen.add(d.camis);
    const addr = [d.building, d.street].filter(Boolean).join(' ');
    rows.push({
      id: d.camis,
      source: 'doh',
      who: d.dba || 'Unnamed establishment',
      where: (addr || 'Address not listed') + (d.zipcode ? ' ' + d.zipcode : '') + ', Manhattan',
      tag: [(d.cuisine_description || ''), 'Not yet inspected, brand new'].filter(Boolean).join(' · '),
      ts: null
    });
    if(rows.length >= 60) break;
  }
  return rows;
}

export const FEED_LOADERS = {
  altco: loadALTCO,
  slapending: loadSLAPending,
  sla: loadSLA,
  dob: loadDOB,
  dcwp: loadDCWP,
  doh: loadDOH
};

export const SOURCE_LABEL = {
  altco: 'Buildout filings (Alt-CO)',
  slapending: 'Liquor applications pending',
  sla: 'Liquor licenses issued',
  dob: 'Approved permits',
  dcwp: 'Business license applications',
  doh: 'New restaurants'
};

// Fetches all six feeds in parallel. A failed feed never sinks the scan;
// it lands in `errors` so the caller can report it visibly.
export async function fetchAllFeeds(fetchImpl = fetch, appToken = ''){
  const names = Object.keys(FEED_LOADERS);
  const settled = await Promise.allSettled(names.map(n => FEED_LOADERS[n](fetchImpl, appToken)));
  const leads = [];
  const counts = {};
  const errors = {};
  settled.forEach((r, i) => {
    const n = names[i];
    if(r.status === 'fulfilled'){
      counts[n] = r.value.length;
      leads.push(...r.value);
    } else {
      counts[n] = 0;
      errors[n] = String(r.reason && r.reason.message || r.reason);
    }
  });
  return {leads, counts, errors};
}
