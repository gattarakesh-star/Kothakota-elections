import fs from 'node:fs';
import path from 'node:path';

const REPO = process.env.GITHUB_REPO || 'gattarakesh-star/Kothakota-elections';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = 'data/results.json';
const API = 'https://api.github.com';

function localPath() {
  return path.join(process.cwd(), FILE_PATH);
}

function apiHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'kothakota-elections',
  };
}

export async function readState() {
  if (!process.env.GITHUB_TOKEN) {
    return { data: JSON.parse(fs.readFileSync(localPath(), 'utf8')), sha: null };
  }

  const response = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
    headers: apiHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub read failed (${response.status})`);

  const json = await response.json();
  const text = Buffer.from(String(json.content).replace(/\s/g, ''), 'base64').toString('utf8');
  return { data: JSON.parse(text), sha: json.sha };
}

export async function writeState(data, message, sha) {
  const content = `${JSON.stringify(data, null, 2)}\n`;

  if (!process.env.GITHUB_TOKEN) {
    fs.writeFileSync(localPath(), content, 'utf8');
    return { local: true };
  }

  const body = { message, content, branch: BRANCH };
  if (sha) body.sha = sha;

  const response = await fetch(`${API}/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub write failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}
