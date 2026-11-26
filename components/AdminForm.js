'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CONTESTS = ['member', 'president'];
const OPTIONS = ['jsp', 'tdp', 'nota'];
const LABELS = { jsp: 'JSP+YCP', tdp: 'TDP', nota: 'NOTA' };

function blankVotes() {
  return { jsp: '', tdp: '', nota: '' };
}

function blankRows(wards) {
  return wards.map((ward) => ({ id: ward.id, member: blankVotes(), president: blankVotes() }));
}

export default function AdminForm({ initial }) {
  const router = useRouter();
  const startingRound = initial.wards.reduce((max, ward) => {
    return Math.max(max, ...ward.rounds.map((round) => Number(round.round) || 0));
  }, 0) + 1;

  const [round, setRound] = useState(startingRound);
  const [rows, setRows] = useState(() => blankRows(initial.wards));
  const [names, setNames] = useState(() => ({
    president: { ...initial.president.candidates },
    wards: initial.wards.map((ward) => ({
      id: ward.id,
      name: ward.name,
      member: { ...ward.candidates.member },
    })),
  }));
  const [complete, setComplete] = useState(Boolean(initial.meta.countingComplete));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function updateVote(index, contest, option, value) {
    setRows((previous) =>
      previous.map((row, i) =>
        i === index ? { ...row, [contest]: { ...row[contest], [option]: value } } : row,
      ),
    );
  }

  function updateName(index, option, value) {
    setNames((previous) => ({
      ...previous,
      wards: previous.wards.map((ward, i) =>
        i === index ? { ...ward, member: { ...ward.member, [option]: value } } : ward,
      ),
    }));
  }

  function updateWardName(index, value) {
    setNames((previous) => ({
      ...previous,
      wards: previous.wards.map((ward, i) => (i === index ? { ...ward, name: value } : ward)),
    }));
  }

  async function save(mode) {
    setBusy(true);
    setMessage('');
    setIsError(false);
    const payload =
      mode === 'votes'
        ? { mode, round: Number(round), rows }
        : { mode: 'settings', names, complete };

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');

      if (mode === 'votes') {
        setRows(blankRows(initial.wards));
        setRound((value) => Number(value) + 1);
        setMessage(`Round ${payload.round} saved.`);
      } else {
        setMessage('Names and status saved.');
      }
      router.refresh();
    } catch (error) {
      setMessage(error.message || 'Save failed');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <main className="admin-wrap">
      <div className="admin-card">
        <h2>Counting control</h2>
        <p className="hint">
          Enter the votes for one round in every ward. Each ward has a member vote and a president
          vote. Saving the same round number again replaces that round.
        </p>
        <div className="btn-row">
          <label htmlFor="round" style={{ margin: 0 }}>Round number</label>
          <input
            id="round"
            type="number"
            min="1"
            max="99"
            value={round}
            onChange={(event) => setRound(event.target.value)}
            style={{ width: 100 }}
          />
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ward</th>
                {CONTESTS.map((contest) =>
                  OPTIONS.map((option) => (
                    <th key={`${contest}-${option}`}>
                      {contest === 'member' ? 'M' : 'P'} · {LABELS[option]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="ward-label">
                    {String(row.id).padStart(2, '0')} · {names.wards[index]?.name || ''}
                  </td>
                  {CONTESTS.map((contest) =>
                    OPTIONS.map((option) => (
                      <td key={`${contest}-${option}`}>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          aria-label={`Ward ${row.id} ${contest} ${LABELS[option]}`}
                          value={row[contest][option]}
                          onChange={(event) => updateVote(index, contest, option, event.target.value)}
                        />
                      </td>
                    )),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>M = ward member vote, P = president vote.</p>

        <div className="btn-row">
          <button className="btn" onClick={() => save('votes')} disabled={busy}>
            {busy ? 'Saving…' : `Save round ${round}`}
          </button>
          <button className="btn danger" onClick={logout} disabled={busy}>Logout</button>
          <a href="/" className="btn secondary">View public results</a>
        </div>
        {message && <p className={`msg ${isError ? 'err' : 'ok'}`}>{message}</p>}
      </div>

      <div className="admin-card">
        <h2>Names &amp; result status</h2>
        <p className="hint">Replace placeholder names, then declare the result when counting is over.</p>

        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={complete}
            onChange={(event) => setComplete(event.target.checked)}
          />
          Counting complete — show winners instead of “leading”
        </label>

        <details>
          <summary>Edit candidate and ward names</summary>
          <div className="names-grid">
            {['jsp', 'tdp'].map((option) => (
              <div className="name-item" key={`president-${option}`}>
                <label>President · {LABELS[option]}</label>
                <input
                  type="text"
                  maxLength={80}
                  value={names.president[option]}
                  onChange={(event) =>
                    setNames((previous) => ({
                      ...previous,
                      president: { ...previous.president, [option]: event.target.value },
                    }))
                  }
                />
              </div>
            ))}
            {names.wards.map((ward, index) => (
              <div className="name-item" key={ward.id}>
                <label>Ward {String(ward.id).padStart(2, '0')}</label>
                <input
                  type="text"
                  maxLength={80}
                  value={ward.name}
                  onChange={(event) => updateWardName(index, event.target.value)}
                  style={{ marginBottom: 6 }}
                />
                {['jsp', 'tdp'].map((option) => (
                  <div key={option} style={{ marginBottom: 5 }}>
                    <label style={{ fontSize: '0.66rem' }}>Member · {LABELS[option]}</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={ward.member[option]}
                      onChange={(event) => updateName(index, option, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>

        <div className="btn-row">
          <button className="btn" onClick={() => save('settings')} disabled={busy}>
            {busy ? 'Saving…' : 'Save names / status'}
          </button>
        </div>
      </div>
    </main>
  );
}
