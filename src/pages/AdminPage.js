import React, { useState } from 'react';
import styles from './AdminPage.module.css';

const API = process.env.REACT_APP_API_BASE || '/api';

const STATUS_ORDER = ['Attending', 'Declined', 'No Status'];

export default function AdminPage() {
  const [pw, setPw] = useState('');
  const [phase, setPhase] = useState('login'); // login | loading | loaded | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  async function handleLogin() {
    if (!pw.trim()) return;
    setPhase('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/admin-data?pw=${encodeURIComponent(pw)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unauthorized');
      }
      setData(json);
      setPhase('loaded');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('login');
    }
  }

  if (phase === 'login' || phase === 'loading') {
    return (
      <main className={styles.loginPage}>
        <div className={styles.loginCard}>
          <h2 className={styles.loginTitle}>Admin Access</h2>
          <input
            className={styles.input}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            autoFocus
          />
          {errorMsg && <p className={styles.error}>{errorMsg}</p>}
          <button
            className={styles.loginBtn}
            onClick={handleLogin}
            disabled={phase === 'loading'}
          >
            {phase === 'loading' ? 'Loading…' : 'View Dashboard'}
          </button>
        </div>
      </main>
    );
  }

  const { summary, guests, media } = data;

  const categories = ['All', ...new Set(guests.map((g) => g.category).filter(Boolean))];

  const filtered = guests.filter((g) => {
    const statusMatch = filter === 'All' || g.rsvpStatus === filter;
    const catMatch = categoryFilter === 'All' || g.category === categoryFilter;
    return statusMatch && catMatch;
  });

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>RSVP Dashboard</h1>
      <p className={styles.subtitle}>Celebration of Life — Norma Clark</p>

      {/* Summary tiles */}
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.tileNum}>{summary.totalAttendingCount}</span>
          <span className={styles.tileLabel}>Attending</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileNum}>{summary.attending}</span>
          <span className={styles.tileLabel}>Parties attending</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileNum}>{summary.declined}</span>
          <span className={styles.tileLabel}>Declined</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileNum}>{summary.pending}</span>
          <span className={styles.tileLabel}>No response</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileNum}>{media.length}</span>
          <span className={styles.tileLabel}>Memories shared</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status:</span>
          {['All', ...STATUS_ORDER].map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ''}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Group:</span>
          <select
            className={styles.select}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <p className={styles.count}>{filtered.length} guests shown</p>

      {/* Guest table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Status</th>
              <th>#</th>
              <th>Email</th>
              <th>Notes</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g, i) => (
              <tr key={g.id || i} className={styles[`row${g.rsvpStatus?.replace(/\s/g, '') || ''}`]}>
                <td>{g.displayName} {g.lastName}</td>
                <td>{g.category}</td>
                <td>
                  <span className={`${styles.badge} ${styles[`badge${g.rsvpStatus?.replace(/\s/g, '') || ''}`]}`}>
                    {g.rsvpStatus}
                  </span>
                </td>
                <td>{g.guestCount}</td>
                <td className={styles.email}>{g.email}</td>
                <td className={styles.notes}>{g.notes}</td>
                <td className={styles.date}>
                  {g.submittedAt ? new Date(g.submittedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Media uploads */}
      {media.length > 0 && (
        <section className={styles.mediaSection}>
          <h2 className={styles.sectionTitle}>Shared Memories ({media.length})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>File</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {media.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td className={styles.notes}>{m.fileName}</td>
                    <td>{m.mimeType?.split('/')[0]}</td>
                    <td className={styles.notes}>{m.message}</td>
                    <td className={styles.date}>
                      {m.uploadedAt ? new Date(m.uploadedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
