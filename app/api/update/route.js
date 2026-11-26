import { NextResponse } from 'next/server';
import { isAuthenticated, COOKIE } from '../../../lib/auth';
import { readState, writeState, clearViews } from '../../../lib/store';

export const runtime = 'nodejs';

function asCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function cleanVotes(votes = {}) {
  return {
    jsp: asCount(votes.jsp),
    tdp: asCount(votes.tdp),
    nota: asCount(votes.nota),
  };
}

function cleanName(value, fallback = '') {
  return String(value ?? fallback).trim().slice(0, 80) || fallback;
}

export async function POST(request) {
  if (!isAuthenticated(request.cookies.get(COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const { data, sha } = await readState();

    if (payload.mode === 'votes') {
      const round = Number(payload.round);
      if (!Number.isInteger(round) || round < 1 || round > 99) {
        return NextResponse.json({ error: 'Round must be between 1 and 99' }, { status: 400 });
      }
      if (!Array.isArray(payload.rows) || payload.rows.length !== data.wards.length) {
        return NextResponse.json({ error: 'Expected one row per ward' }, { status: 400 });
      }

      data.wards = data.wards.map((ward) => {
        const row = payload.rows.find((item) => Number(item.id) === Number(ward.id));
        if (!row) return ward;
        const rounds = (ward.rounds || []).filter((item) => Number(item.round) !== round);
        rounds.push({
          round,
          member: cleanVotes(row.member),
          president: cleanVotes(row.president),
        });
        rounds.sort((a, b) => Number(a.round) - Number(b.round));
        return { ...ward, rounds };
      });
      data.meta.lastUpdated = new Date().toISOString();
      await writeState(data, `Update counting round ${round}`, sha);
      return NextResponse.json({ ok: true, round });
    }

    if (payload.mode === 'reset') {
      data.wards = data.wards.map((ward) => ({ ...ward, rounds: [] }));
      data.meta.countingComplete = false;
      data.meta.lastUpdated = new Date().toISOString();
      await writeState(data, 'Reset all counting data', sha);
      return NextResponse.json({ ok: true });
    }

    if (payload.mode === 'reset-views') {
      const ok = await clearViews();
      if (!ok) throw new Error('Could not clear views');
      return NextResponse.json({ ok: true });
    }

    if (payload.mode === 'settings') {
      const names = payload.names || {};
      const incomingPresident = names.president || {};
      data.president = {
        candidates: {
          jsp: cleanName(incomingPresident.jsp, data.president.candidates.jsp),
          tdp: cleanName(incomingPresident.tdp, data.president.candidates.tdp),
        },
      };
      if (Array.isArray(names.wards)) {
        data.wards = data.wards.map((ward) => {
          const incoming = names.wards.find((item) => Number(item.id) === Number(ward.id));
          if (!incoming) return ward;
          return {
            ...ward,
            candidates: {
              member: {
                jsp: cleanName(incoming.member?.jsp, ward.candidates.member.jsp),
                tdp: cleanName(incoming.member?.tdp, ward.candidates.member.tdp),
              },
            },
          };
        });
      }
      data.meta.countingComplete = Boolean(payload.complete);
      data.meta.lastUpdated = new Date().toISOString();
      await writeState(data, 'Update candidate names and result status', sha);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not save' }, { status: 500 });
  }
}
