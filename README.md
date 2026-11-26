# Kothakota Panchayat Election Results

Public results site + password-protected admin updater for 16 wards.

## Local run

```bash
npm install
npm run dev
```

- Public: http://localhost:3000
- Admin: http://localhost:3000/admin (default password `admin123`)

Without `GITHUB_TOKEN`, admin saves write to `data/results.json` on local disk.

## Vercel setup

1. Import this GitHub repo into Vercel (framework: Next.js, no build overrides needed).
2. Add these Environment Variables in Vercel → Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | `admin123` (change anytime) |
| `SESSION_SECRET` | a long random string |
| `GITHUB_TOKEN` | a GitHub PAT with write access to this repo |
| `GITHUB_REPO` | `gattarakesh-star/Kothakota-elections` |
| `GITHUB_BRANCH` | `main` |

3. Redeploy after adding variables.

Admin saves commit `data/results.json` to GitHub, which triggers a fresh Vercel deployment with the new numbers.

## Data model

`data/results.json` holds everything:

- `meta` — title, last update, `countingComplete` flag, party colours.
- `president.candidates` — the two village-wide sarpanch candidates.
- `wards[]` — ward number, ward name, member candidate names, and `rounds[]`.
- Each round has `member: {jsp, tdp, nota}` and `president: {jsp, tdp, nota}` votes.

Leading/won status is calculated automatically. Tick **Counting complete** in admin to switch from "leading" to "won".

## Troubleshooting

- **`EROFS: read-only file system`** — `GITHUB_TOKEN` was missing, so the app tried to write to Vercel's read-only filesystem. Add `GITHUB_TOKEN` in Vercel env vars and redeploy. Newer builds show a clear warning on `/admin` instead.
- **`GitHub write failed (403)`** — the PAT needs write access to this repo (fine-grained PAT: Contents = read and write).
- **`GitHub write failed (409)`** — another save happened first; reload `/admin` and re-enter the round.

## Security note

The PAT that was shared in chat should be revoked and replaced with a fresh token stored only in Vercel environment variables.
