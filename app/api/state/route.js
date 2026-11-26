import { NextResponse } from 'next/server';
import { readState } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, source, updatedAt } = await readState();
    return NextResponse.json(
      { data, source, updatedAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not load state' }, { status: 500 });
  }
}
