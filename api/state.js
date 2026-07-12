// GET /api/state
// Read-only view of the scan memory. The page calls this to decide which
// leads deserve a NEW pill: anything the server first saw in the last two
// days, or has never seen at all, is new. Returns 404 when no scan has run
// yet (or no Blob store is connected), and the page just leaves the
// feature off.

import { list } from '@vercel/blob';

const STATE_PATH = 'signal/state.json';

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  try{
    if(!process.env.BLOB_READ_WRITE_TOKEN){
      return res.status(404).json({ ok: false, error: 'No Blob store connected.' });
    }
    const { blobs } = await list({ prefix: STATE_PATH, limit: 1 });
    if(!blobs.length){
      return res.status(404).json({ ok: false, error: 'No scan has run yet.' });
    }
    const blobRes = await fetch(blobs[0].url, { cache: 'no-store' });
    if(!blobRes.ok){
      return res.status(404).json({ ok: false, error: 'Scan state unreadable.' });
    }
    const state = await blobRes.json();
    return res.status(200).json({
      ok: true,
      lastScanAt: state.lastScanAt || 0,
      lastCounts: state.lastCounts || {},
      firstSeen: state.firstSeen || {}
    });
  }catch(err){
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}
