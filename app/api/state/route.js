import { NextResponse } from 'next/server';
import { readState, readViewCount, readLiveViewCount } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, source, updatedAt } = await readState();
    const views = await readViewCount();
    const liveViews = await readLiveViewCount();
    return NextResponse.json(
      { data, source, updatedAt, views, liveViews },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not load state' }, { status: 500 });
  }
}
