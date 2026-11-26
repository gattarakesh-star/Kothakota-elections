'use client';

import { useCallback, useEffect, useState } from 'react';
import seed from '../data/results.json';
import AutoRefresh from '../components/AutoRefresh';
import {
  KEYS,
  LABELS,
  contestTotals,
  presidentTotals,
  outcome,
  totalVotes,
  maxRound,
  roundsHistory,
  seatCounts,
} from '../lib/calc';

function Bar({ option, value, total }) {
  const width = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className="bar-track" aria-hidden="true">
      <div className={`bar-fill bar-${option}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function Home() {
  const [results, setResults] = useState(seed);
  const [source, setSource] = useState('loading');
  const [serverUpdatedAt, setServerUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error('State unavailable');
      const json = await response.json();
      if (json.data?.wards?.length) setResults(json.data);
      setSource(json.source || 'unknown');
      setServerUpdatedAt(json.updatedAt || null);
    } catch {
      setSource('offline');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const { meta, president, wards } = results;
  const complete = Boolean(meta.countingComplete);
  const presTotals = presidentTotals(wards);
  const presResult = outcome(presTotals, complete);
  const seats = seatCounts(wards, complete);
  const rounds = maxRound(wards);
  const history = roundsHistory(wards);
  const presTotalVotes = totalVotes(presTotals);
  const margin = Math.abs(presTotals.jsp - presTotals.tdp);

  const seatLeader =
    seats.jsp === seats.tdp
      ? 'Seats are level'
      : `${LABELS[seats.jsp > seats.tdp ? 'jsp' : 'tdp']} ${complete ? 'won' : 'leading'} by ${Math.abs(seats.jsp - seats.tdp)}`;

  const stamp = serverUpdatedAt || meta.lastUpdated;
  const updated = stamp
    ? new Date(stamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not updated yet';

  return (
    <>
      <header className="hero">
        <div className="shell">
          <div className="hero-top">
            <div>
              <div className="eyebrow">Election counting centre</div>
              <h1>{meta.title}</h1>
              <p>{wards.length} wards · 1 ward member per ward · Sarpanch (president) vote</p>
            </div>
            <AutoRefresh onRefresh={load} refreshing={refreshing} seconds={5} />
          </div>
          <div className="pills">
            <span className="pill">Counting from {meta.countingStartTime}</span>
            <span className="pill">Rounds counted: {rounds}</span>
            <span className="pill">Last update: {updated}</span>
            <span className="pill">Source: {source === 'supabase' ? 'Supabase (instant)' : source}</span>
            <span className={`pill badge ${presResult.cls}`}>President: {presResult.text}</span>
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="summary">
          <div className="card">
            <h3>Ward member seats</h3>
            <div className="big">
              <span className="jsp-text">{seats.jsp}</span>
              <span className="muted"> – </span>
              <span className="tdp-text">{seats.tdp}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <span className={`badge ${seats.jsp === seats.tdp ? 'tie' : complete ? 'won' : 'leading'} ${seats.jsp > seats.tdp ? 'jsp' : 'tdp'}`}>
                {seatLeader}
              </span>
            </div>
            <div className="seat-row"><span>JSP + YCP</span><strong className="jsp-text">{seats.jsp}</strong></div>
            <div className="seat-row"><span>TDP</span><strong className="tdp-text">{seats.tdp}</strong></div>
            <div className="seat-row"><span>Not decided / NOTA</span><strong>{seats.undecided + seats.nota}</strong></div>
          </div>

          <div className="card">
            <h3>President · total votes</h3>
            <div className="big">
              <span className="jsp-text">{presTotals.jsp}</span>
              <span className="muted"> – </span>
              <span className="tdp-text">{presTotals.tdp}</span>
            </div>
            <div className="muted">JSP + YCP vs TDP · margin {margin}</div>
            <Bar option="jsp" value={presTotals.jsp} total={presTotalVotes} />
            <Bar option="tdp" value={presTotals.tdp} total={presTotalVotes} />
            <Bar option="nota" value={presTotals.nota} total={presTotalVotes} />
            <div className="seat-row"><span>NOTA votes</span><strong>{presTotals.nota}</strong></div>
            <div className="seat-row"><span>Total votes</span><strong>{presTotalVotes}</strong></div>
          </div>

          <div className="card">
            <h3>Status</h3>
            <div className={`badge ${presResult.cls}`}>{presResult.text}</div>
            <div className="seat-row"><span>Counting</span><strong>{complete ? 'Completed' : 'In progress'}</strong></div>
            <div className="seat-row"><span>Rounds counted</span><strong>{rounds}</strong></div>
            <div className="seat-row"><span>Last update</span><strong>{updated}</strong></div>
          </div>
        </section>

        <div className="section-title">
          <h2>President (Sarpanch) race</h2>
          <small>All {wards.length} wards combined</small>
        </div>
        <section className="president-grid">
          {['jsp', 'tdp', 'nota'].map((option) => (
            <div className="candidate-box" key={option}>
              <div className="party">{LABELS[option]}</div>
              <div className="name">
                {option === 'nota' ? 'None of the above' : president.candidates[option]}
              </div>
              <div className={`votes ${option}-text`}>{presTotals[option]}</div>
              <Bar option={option} value={presTotals[option]} total={presTotalVotes} />
            </div>
          ))}
        </section>

        <div className="section-title">
          <h2>Ward results</h2>
          <small>Member votes and president votes per ward</small>
        </div>
        <section className="ward-grid">
          {wards.map((ward) => {
            const totals = contestTotals(ward.rounds, 'member');
            const result = outcome(totals, complete);
            const total = totalVotes(totals);
            const pres = contestTotals(ward.rounds, 'president');
            return (
              <article className="card" key={ward.id}>
                <div className="ward-head">
                  <div>
                    <span className="ward-no">{String(ward.id).padStart(2, '0')}</span>
                    <div className="ward-name">{ward.name}</div>
                  </div>
                  <span className={`badge ${result.cls}`}>{result.text}</span>
                </div>

                <div className="mini-title">Ward member</div>
                {KEYS.map((option) => (
                  <div key={option}>
                    <div className="vote-line">
                      <span>
                        <span className={`${option}-text`}>{LABELS[option]}</span>
                        <span className="muted">
                          {' '}· {option === 'nota' ? 'NOTA' : ward.candidates.member[option]}
                        </span>
                      </span>
                      <strong>{totals[option]}</strong>
                    </div>
                    <Bar option={option} value={totals[option]} total={total} />
                  </div>
                ))}

                <div className="mini-title">President vote in this ward</div>
                <div className="pres-mini">
                  <span><span className="jsp-text">JSP+YCP</span> <strong>{pres.jsp}</strong></span>
                  <span><span className="tdp-text">TDP</span> <strong>{pres.tdp}</strong></span>
                  <span>NOTA <strong>{pres.nota}</strong></span>
                </div>
              </article>
            );
          })}
        </section>

        <div className="section-title">
          <h2>Round by round</h2>
          <small>Totals across all wards for each round</small>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Round</th>
                {KEYS.map((key) => <th key={`m-${key}`}>Member {LABELS[key]}</th>)}
                {KEYS.map((key) => <th key={`p-${key}`}>President {LABELS[key]}</th>)}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={7} className="muted">No rounds entered yet.</td></tr>
              )}
              {history.map((item) => (
                <tr key={item.round}>
                  <td><strong>{item.round}</strong></td>
                  {KEYS.map((key) => <td key={`m-${key}`}>{item.member[key]}</td>)}
                  {KEYS.map((key) => <td key={`p-${key}`}>{item.president[key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <footer>
        <a href="/admin">Admin</a> · Placeholder candidate names will be replaced before counting.
      </footer>
    </>
  );
}
