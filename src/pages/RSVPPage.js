import React, { useState, useRef, useCallback } from 'react';
import BotanicalDivider from '../components/BotanicalDivider';
import styles from './RSVPPage.module.css';

// ── State machine ──────────────────────────────────────────────────
// idle → searching → results → confirming → submitting → done | error

const API = process.env.REACT_APP_API_BASE || '/api';

export default function RSVPPage() {
  const [phase, setPhase] = useState('idle');    // idle | searching | results | confirming | submitting | done | error
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // guest object | null (self-identified)
  const [form, setForm] = useState({
    displayName: '',
    lastName: '',
    email: '',
    phone: '',
    rsvpStatus: '',
    guestCount: '1',
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const searchTimer = useRef(null);

  // ── Search ────────────────────────────────────────────────────────
  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setFieldErrors((prev) => ({ ...prev, query: '' }));
    clearTimeout(searchTimer.current);

    if (val.trim().length < 2) {
      setResults([]);
      setPhase('idle');
      return;
    }

    setPhase('searching');
    searchTimer.current = setTimeout(() => doSearch(val.trim()), 400);
  }

  async function doSearch(q) {
    try {
      const res = await fetch(`${API}/guest-lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.guests || []);
      setPhase('results');
    } catch {
      setResults([]);
      setPhase('results');
    }
  }

  // ── Guest selection ───────────────────────────────────────────────
  function selectGuest(guest) {
    setSelected(guest);
    setForm({
      displayName: guest.displayName,
      lastName: guest.lastName,
      email: '',
      phone: '',
      rsvpStatus: guest.rsvpStatus === 'No Status' ? '' : guest.rsvpStatus,
      guestCount: guest.guestCount || '1',
      notes: '',
    });
    setFieldErrors({});
    setPhase('confirming');
  }

  function selectSelf() {
    setSelected(null);
    setForm({
      displayName: query,
      lastName: '',
      email: '',
      phone: '',
      rsvpStatus: '',
      guestCount: '1',
      notes: '',
    });
    setFieldErrors({});
    setPhase('confirming');
  }

  // ── Form field updates ────────────────────────────────────────────
  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError('');
  }

  // ── Validation ────────────────────────────────────────────────────
  function validate() {
    const errors = {};
    if (!form.displayName.trim()) errors.displayName = 'Please enter your name.';
    if (!form.rsvpStatus) errors.rsvpStatus = 'Please select Attending or Declining.';
    const count = parseInt(form.guestCount, 10);
    if (!count || count < 1 || count > 20) errors.guestCount = 'Enter a number between 1 and 20.';
    return errors;
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPhase('submitting');
    setSubmitError('');

    try {
      const payload = {
        rowIndex: selected?.rowIndex || null,
        displayName: form.displayName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        rsvpStatus: form.rsvpStatus,
        guestCount: form.guestCount,
        notes: form.notes,
        category: selected ? undefined : 'Self-Identified',
      };

      const res = await fetch(`${API}/rsvp-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Submission failed.');
      }

      setPhase('done');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setPhase('confirming');
    }
  }

  function startOver() {
    setPhase('idle');
    setQuery('');
    setResults([]);
    setSelected(null);
    setForm({ displayName: '', lastName: '', email: '', phone: '', rsvpStatus: '', guestCount: '1', notes: '' });
    setFieldErrors({});
    setSubmitError('');
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Celebration of Life</p>
        <h1 className={styles.name}>Norma Clark</h1>
        <p className={styles.dates}>1942 – 2025</p>
        <p className={styles.eventInfo}>
          Please join us as we gather to remember, celebrate, and share in the warmth she gave us all.
        </p>
      </header>

      <BotanicalDivider style={{ margin: '0 auto 2.5rem' }} />

      <section className={styles.card}>
        {/* ── IDLE / SEARCH ── */}
        {(phase === 'idle' || phase === 'searching' || phase === 'results') && (
          <div>
            <h2 className={styles.cardTitle}>Find your name</h2>
            <p className={styles.cardHint}>Type your last name or first name to get started.</p>

            <div className={styles.searchRow}>
              <input
                className={styles.searchInput}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="e.g. Clark, Santos, Fowler…"
                autoFocus
                aria-label="Search for your name"
              />
              {phase === 'searching' && (
                <span className={styles.spinner} aria-label="Searching…" />
              )}
            </div>
            {fieldErrors.query && <p className={styles.fieldError}>{fieldErrors.query}</p>}

            {phase === 'results' && (
              <div className={styles.results}>
                {results.length > 0 ? (
                  <>
                    <p className={styles.resultsHint}>Select your name below:</p>
                    <ul className={styles.resultList}>
                      {results.map((g) => (
                        <li key={g.rowIndex}>
                          <button className={styles.resultItem} onClick={() => selectGuest(g)}>
                            <span className={styles.resultName}>{g.displayName} {g.lastName}</span>
                            <span className={styles.resultCategory}>{g.category}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className={styles.noResults}>No matches for "{query}".</p>
                )}
                <button className={styles.selfLink} onClick={selectSelf}>
                  I don't see my name — add me
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRMING ── */}
        {phase === 'confirming' && (
          <div>
            <h2 className={styles.cardTitle}>
              {selected ? `Hi, ${selected.displayName.split(' ')[0]}!` : 'Welcome!'}
            </h2>
            <p className={styles.cardHint}>Confirm your details below.</p>

            {!selected && (
              <div className={styles.fieldRow}>
                <label className={styles.label}>Your name <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${fieldErrors.displayName ? styles.inputError : ''}`}
                  value={form.displayName}
                  onChange={(e) => handleFormChange('displayName', e.target.value)}
                  placeholder="First and last name"
                />
                {fieldErrors.displayName && <p className={styles.fieldError}>{fieldErrors.displayName}</p>}
              </div>
            )}

            <div className={styles.fieldRow}>
              <label className={styles.label}>Email (optional)</label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="For any updates from the family"
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label}>
                Will you be attending? <span className={styles.required}>*</span>
              </label>
              <div className={styles.rsvpButtons}>
                <button
                  className={`${styles.rsvpBtn} ${form.rsvpStatus === 'Attending' ? styles.rsvpActive : ''}`}
                  onClick={() => handleFormChange('rsvpStatus', 'Attending')}
                  aria-pressed={form.rsvpStatus === 'Attending'}
                >
                  ✓ Attending
                </button>
                <button
                  className={`${styles.rsvpBtn} ${form.rsvpStatus === 'Declined' ? styles.rsvpDeclined : ''}`}
                  onClick={() => handleFormChange('rsvpStatus', 'Declined')}
                  aria-pressed={form.rsvpStatus === 'Declined'}
                >
                  Unable to attend
                </button>
              </div>
              {fieldErrors.rsvpStatus && <p className={styles.fieldError}>{fieldErrors.rsvpStatus}</p>}
            </div>

            {form.rsvpStatus === 'Attending' && (
              <div className={styles.fieldRow}>
                <label className={styles.label}>
                  Number of guests (including yourself) <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${styles.inputNarrow} ${fieldErrors.guestCount ? styles.inputError : ''}`}
                  type="number"
                  min="1"
                  max="20"
                  value={form.guestCount}
                  onChange={(e) => handleFormChange('guestCount', e.target.value)}
                />
                {fieldErrors.guestCount && <p className={styles.fieldError}>{fieldErrors.guestCount}</p>}
              </div>
            )}

            <div className={styles.fieldRow}>
              <label className={styles.label}>Message for the family (optional)</label>
              <textarea
                className={styles.textarea}
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
                placeholder="Share a memory, a kind word, anything you'd like the family to know…"
              />
            </div>

            {submitError && <p className={styles.submitError}>{submitError}</p>}

            <div className={styles.formActions}>
              <button className={styles.backLink} onClick={startOver}>← Search again</button>
              <button className={styles.submitBtn} onClick={handleSubmit}>
                Send RSVP
              </button>
            </div>
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {phase === 'submitting' && (
          <div className={styles.centered}>
            <div className={styles.spinnerLg} aria-label="Saving…" />
            <p className={styles.cardHint}>Saving your RSVP…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <div className={styles.centered}>
            <div className={styles.doneIcon} aria-hidden="true">✦</div>
            <h2 className={styles.cardTitle}>
              {form.rsvpStatus === 'Attending' ? 'We'll see you there.' : 'Thank you for letting us know.'}
            </h2>
            <p className={styles.cardHint}>
              {form.rsvpStatus === 'Attending'
                ? 'Your RSVP has been received. We look forward to celebrating Norma together.'
                : 'Your response has been saved. Norma will be remembered with love.'}
            </p>
            {form.rsvpStatus === 'Attending' && (
              <p className={styles.sharePrompt}>
                Would you like to{' '}
                <a href="/share">share a photo or memory</a> for the slideshow?
              </p>
            )}
            <button className={styles.backLink} onClick={startOver} style={{ marginTop: '1.5rem' }}>
              Submit another RSVP
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
