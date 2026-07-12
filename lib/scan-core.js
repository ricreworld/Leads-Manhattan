// The memory behind the daily scan: which leads have been seen before,
// which are genuinely new, and what goes into the morning digest.
// Storage-agnostic so it can be unit tested without Vercel Blob.

import { SOURCE_LABEL } from './feeds.js';

const PRUNE_AFTER_MS = 120 * 86400000; // forget leads gone from the feeds for 120 days

export function leadStateKey(l){
  return l.source + ':' + l.id;
}

// Runs one scan cycle: fetch feeds, diff against remembered state, update
// the state. On the very first scan everything is technically "new", so
// newLeads is suppressed and isFirstScanEver is set instead; the digest
// sender skips that round rather than emailing hundreds of old leads.
export async function runScan({loadState, saveState, fetchFeeds, now = Date.now}){
  const state = (await loadState()) || {firstSeen: {}, lastScanAt: 0};
  if(!state.firstSeen) state.firstSeen = {};
  const {leads, counts, errors} = await fetchFeeds();
  const t = now();
  const isFirstScanEver = !state.lastScanAt;

  const newLeads = [];
  for(const l of leads){
    const k = leadStateKey(l);
    if(!state.firstSeen[k]){
      state.firstSeen[k] = t;
      newLeads.push(l);
    }
  }

  const live = new Set(leads.map(leadStateKey));
  for(const k of Object.keys(state.firstSeen)){
    if(!live.has(k) && t - state.firstSeen[k] > PRUNE_AFTER_MS) delete state.firstSeen[k];
  }

  state.lastScanAt = t;
  state.lastCounts = counts;
  state.lastErrors = errors;
  await saveState(state);

  return {
    state,
    leads,
    counts,
    errors,
    newLeads: isFirstScanEver ? [] : newLeads,
    isFirstScanEver
  };
}

function esc(s){
  return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

// Plain, phone-friendly HTML for the morning digest email.
export function buildDigestHtml(newLeads, counts){
  const bySource = {};
  for(const l of newLeads){
    (bySource[l.source] = bySource[l.source] || []).push(l);
  }
  const sections = Object.entries(bySource).map(([src, rows]) => {
    const items = rows.map(l =>
      `<li style="margin-bottom:10px"><strong>${esc(l.who)}</strong><br>${esc(l.where)}<br><span style="color:#666;font-size:13px">${esc(l.tag)}</span></li>`
    ).join('');
    return `<h3 style="margin:18px 0 6px">${esc(SOURCE_LABEL[src] || src)} (${rows.length})</h3><ul style="padding-left:18px;margin:0">${items}</ul>`;
  }).join('');
  const totals = Object.entries(counts).map(([k, v]) => `${SOURCE_LABEL[k] || k}: ${v}`).join(' · ');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">
      <h2 style="margin:0 0 4px">SIGNAL / Manhattan</h2>
      <p style="margin:0 0 16px;color:#666">${newLeads.length} new lead${newLeads.length === 1 ? '' : 's'} since the last scan.</p>
      ${sections}
      <p style="margin-top:22px;color:#999;font-size:12px">Feed totals this scan: ${esc(totals)}</p>
    </div>`;
}
