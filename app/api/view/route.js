import { NextResponse } from 'next/server';
import { recordView } from '../../../lib/store';

export const runtime = 'nodejs';

export async function POST(request) {
  let clientId;
  try {
    ({ clientId } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ok = await recordView(clientId);
  return NextResponse.json({ ok });
}
