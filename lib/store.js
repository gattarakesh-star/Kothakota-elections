import { readState as readGithubState, writeState as writeGithubState } from './github';
import seed from '../data/results.json';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

function readKey() {
  return SERVICE_KEY || ANON_KEY;
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'kothakota-elections',
  };
}

function supabaseReadConfigured() {
  return Boolean(SUPABASE_URL && readKey());
}

function supabaseWriteConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

export async function readState() {
  if (supabaseReadConfigured()) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/election_state?id=eq.1&select=data,updated_at`,
        { headers: headers(readKey()), cache: 'no-store' },
      );
      if (response.ok) {
        const rows = await response.json();
        const row = rows[0];
        if (row?.data && Object.keys(row.data).length > 0) {
          return {
            data: row.data,
            sha: null,
            source: 'supabase',
            updatedAt: row.updated_at,
          };
        }
      }
    } catch {
      // Fall back to GitHub / bundled seed.
    }
  }

  const fallback = await readGithubState();
  return { ...fallback, source: fallback.source || 'file', updatedAt: null };
}

export async function writeState(data, message, sha) {
  if (supabaseWriteConfigured()) {
    const body = { data, updated_at: new Date().toISOString() };

    let response = await fetch(`${SUPABASE_URL}/rest/v1/election_state?id=eq.1`, {
      method: 'PATCH',
      headers: { ...headers(SERVICE_KEY), Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const rows = await response.json();
      if (rows.length > 0) {
        return { source: 'supabase', updatedAt: rows[0].updated_at };
      }
    }

    response = await fetch(`${SUPABASE_URL}/rest/v1/election_state`, {
      method: 'POST',
      headers: {
        ...headers(SERVICE_KEY),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ id: 1, ...body }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase write failed (${response.status}): ${detail.slice(0, 200)}`);
    }
    const rows = await response.json();
    return { source: 'supabase', updatedAt: rows[0]?.updated_at };
  }

  return writeGithubState(data, message, sha);
}

export function seedState() {
  return JSON.parse(JSON.stringify(seed));
}

const VIEWS_TABLE = 'election_views';
const VIEW_TIMEOUT_MS = 30000;

async function countViews(filter = '') {
  if (!SUPABASE_URL || !readKey()) return 0;
  try {
    const url = `${SUPABASE_URL}/rest/v1/${VIEWS_TABLE}?select=id${filter}`;
    const response = await fetch(url, {
      headers: { ...headers(readKey()), Prefer: 'count=exact', Range: '0-0' },
      cache: 'no-store',
    });
    const range = response.headers.get('content-range');
    const total = range ? Number(range.split('/')[1]) : 0;
    return Number.isFinite(total) ? total : 0;
  } catch {
    return 0;
  }
}

export async function readViewCount() {
  return countViews();
}

export async function readLiveViewCount() {
  const cutoff = new Date(Date.now() - VIEW_TIMEOUT_MS).toISOString();
  return countViews(`&last_seen=gte.${encodeURIComponent(cutoff)}`);
}

export async function recordView(clientId) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const id = String(clientId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!id) return false;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${VIEWS_TABLE}`, {
    method: 'POST',
    headers: { ...headers(SERVICE_KEY), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, last_seen: new Date().toISOString() }),
  });
  return response.ok;
}

export async function clearViews() {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const cutoff = new Date(Date.now() + 60 * 1000).toISOString();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${VIEWS_TABLE}?last_seen=lte.${encodeURIComponent(cutoff)}`,
    {
      method: 'DELETE',
      headers: headers(SERVICE_KEY),
    },
  );
  return response.ok;
}
