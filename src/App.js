import React, { useState, useEffect } from 'react';
import RSVPPage from './pages/RSVPPage';
import MediaPage from './pages/MediaPage';
import AdminPage from './pages/AdminPage';
import styles from './App.module.css';

function getPage() {
  const path = window.location.pathname;
  if (path.startsWith('/share')) return 'share';
  if (path.startsWith('/admin')) return 'admin';
  return 'rsvp';
}

export default function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const handlePop = () => setPage(getPage());
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function navigate(to) {
    window.history.pushState({}, '', to);
    setPage(getPage());
    window.scrollTo(0, 0);
  }

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <button
          className={page === 'rsvp' ? styles.navActive : styles.navLink}
          onClick={() => navigate('/')}
        >
          RSVP
        </button>
        <span className={styles.navDivider}>·</span>
        <button
          className={page === 'share' ? styles.navActive : styles.navLink}
          onClick={() => navigate('/share')}
        >
          Share a Memory
        </button>
      </nav>

      {page === 'rsvp' && <RSVPPage />}
      {page === 'share' && <MediaPage />}
      {page === 'admin' && <AdminPage />}

      <footer className={styles.footer}>
        <p>With love, the Clark family</p>
      </footer>
    </div>
  );
}
