// GET /api/scan
// Fetches all six feeds server-side, diffs them against the remembered
// state in Vercel Blob, and (when invoked by the Vercel cron, or manually
// with ?digest=1) emails the new leads via Resend.
//
// Environment variables, all optional:
//   BLOB_READ_WRITE_TOKEN  added automatically when a Blob store is
//                          connected to the project; without it the scan
//                          still returns leads but cannot remember anything.
//   SOCRATA_APP_TOKEN      raises the city/state API rate limits.
//   RESEND_API_KEY + DIGEST_TO   enable the morning email digest.
//   CRON_SECRET            when set, digest sends are limited to callers
//                          bearing it (Vercel's cron sends it automatically).

import { put, list } from '@vercel/blob';
import { fetchAllFeeds } from '../lib/feeds.js';
import { runScan, buildDigestHtml } from '../lib/scan-core.js';

const STATE_PATH = 'signal/state.json';
const RESCAN_COOLDOWN_MS = 10 * 60 * 1000;

async function loadState(){
  const { blobs } = await list({ prefix: STATE_PATH, limit: 1 });
  if(!blobs.length) return null;
  const res = await fetch(blobs[0].url, { cache: 'no-store' });
  if(!res.ok) return null;
  return res.json();
}

async function saveState(state){
  await put(STATE_PATH, JSON.stringify(state), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });
}

async function sendDigest(newLeads, counts){
  const key = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO;
  if(!key || !to) return { sent: false, reason: 'RESEND_API_KEY or DIGEST_TO not configured' };
  if(!newLeads.length) return { sent: false, reason: 'no new leads this scan' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SIGNAL Manhattan <onboarding@resend.dev>',
      to: [to],
      subject: `SIGNAL Manhattan: ${newLeads.length} new lead${newLeads.length === 1 ? '' : 's'} this morning`,
      html: buildDigestHtml(newLeads, counts)
    })
  });
  if(!res.ok){
    const body = await res.text().catch(() => '');
    return { sent: false, reason: `Resend answered HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  return { sent: true };
}

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  try{
    const url = new URL(req.url, 'http://localhost');
    const userAgent = String(req.headers['user-agent'] || '');
    const auth = String(req.headers['authorization'] || '');
    const isCron = userAgent.includes('vercel-cron');
    const cronSecretOk = !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`;
    const wantDigest = (isCron || url.searchParams.get('digest') === '1') && cronSecretOk;

    const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    const appToken = process.env.SOCRATA_APP_TOKEN || '';

    if(!hasBlob){
      // No storage connected yet: still useful, just memoryless. Say so.
      const {leads, counts, errors} = await fetchAllFeeds(fetch, appToken);
      return res.status(200).json({
        ok: true,
        scannedAt: Date.now(),
        counts,
        errors,
        totalLeads: leads.length,
        firstSeenTracking: false,
        warning: 'No Blob store is connected to this project, so the scan cannot remember what it has seen. Connect one in the Vercel dashboard under Storage to enable new-lead detection and the email digest.'
      });
    }

    // Cheap throttle so a public endpoint cannot hammer the city APIs:
    // inside the cooldown window, report the stored state instead.
    const prior = await loadState().catch(() => null);
    if(prior && !isCron && Date.now() - prior.lastScanAt < RESCAN_COOLDOWN_MS){
      return res.status(200).json({
        ok: true,
        scannedAt: prior.lastScanAt,
        counts: prior.lastCounts || {},
        errors: prior.lastErrors || {},
        firstSeenTracking: true,
        throttled: true,
        note: 'A scan ran less than 10 minutes ago; returning its result.'
      });
    }

    const result = await runScan({
      loadState: async () => prior,
      saveState,
      fetchFeeds: () => fetchAllFeeds(fetch, appToken)
    });

    let digest = { sent: false, reason: 'digest not requested' };
    if(wantDigest){
      digest = result.isFirstScanEver
        ? { sent: false, reason: 'first scan ever seeds the memory; digest starts next scan' }
        : await sendDigest(result.newLeads, result.counts);
    }

    return res.status(200).json({
      ok: true,
      scannedAt: result.state.lastScanAt,
      counts: result.counts,
      errors: result.errors,
      totalLeads: result.leads.length,
      newLeads: result.newLeads.length,
      isFirstScanEver: result.isFirstScanEver,
      firstSeenTracking: true,
      digest
    });
  }catch(err){
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}
