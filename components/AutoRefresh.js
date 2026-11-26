'use client';

export default function AutoRefresh({ onRefresh, refreshing = false, seconds = 5, views = 0 }) {
  return (
    <>
      <span className="pill live">
        ● Live · updates every {seconds}s
        <button className="refresh-btn" type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? '…' : '↻ Refresh'}
        </button>
      </span>
      <span className="pill">Views: {views}</span>
    </>
  );
}
