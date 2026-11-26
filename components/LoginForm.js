'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error('Wrong password');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-wrap">
      <form className="admin-card login-card" onSubmit={handleSubmit}>
        <h2>Admin login</h2>
        <p className="hint">Enter the admin password to update counting rounds.</p>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          required
        />
        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Login'}
          </button>
          <a href="/" className="btn secondary">Back to results</a>
        </div>
        {error && <p className="msg err">{error}</p>}
      </form>
    </main>
  );
}
