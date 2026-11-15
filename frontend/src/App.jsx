import { useState, useEffect } from 'react';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Availability from './pages/Availability';
import CreateEvent from './pages/CreateEvent';
import Settings from './pages/Settings';
import { apiRequest, getToken, clearToken } from './api/client';
import { useLanguage } from './i18n/LanguageContext';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useLanguage();

  const [themePref, setThemePref] = useState(() => localStorage.getItem('theme') || 'auto');
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange(e) {
      setSystemPrefersDark(e.matches);
    }
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = themePref === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : themePref;

  useEffect(() => {
    document.body.classList.toggle('theme-light', resolvedTheme === 'light');
    localStorage.setItem('theme', themePref);
  }, [themePref, resolvedTheme]);

  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      if (!token) {
        setCheckingSession(false);
        return;
      }
      try {
        const result = await apiRequest('/auth/me');
        setUser(result.user);
      } catch (err) {
        clearToken();
      } finally {
        setCheckingSession(false);
      }
    }
    restoreSession();
  }, []);

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  function handleEventCreated() {
    setRefreshKey((k) => k + 1);
    setPage('dashboard');
  }

  if (checkingSession) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={setUser} />;
  }

  const navItems = [
    { key: 'dashboard', label: t('nav.dashboard') },
    { key: 'availability', label: t('nav.availability') },
    { key: 'createEvent', label: t('nav.createEvent') },
    { key: 'settings', label: t('nav.settings') },
  ];

  const activeNavIndex = navItems.findIndex((item) => item.key === page);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-logo">{t('appName')}</div>

        <nav className="app-nav">
          <div
            className="app-nav-indicator"
            style={{ transform: `translateY(${activeNavIndex * 100}%)` }}
          />
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`app-nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="app-user">
          <div className="app-user-name">{user.name}</div>
          <div className="app-user-email">{user.email}</div>
          <button className="app-logout" onClick={handleLogout}>{t('nav.logout')}</button>
        </div>
      </aside>

      <main className="app-content">
        <div key={page} className="app-page-fade">
          {page === 'dashboard' && <Dashboard refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />}
          {page === 'availability' && <Availability />}
          {page === 'createEvent' && <CreateEvent onEventCreated={handleEventCreated} />}
          {page === 'settings' && (
            <Settings user={user} onUserUpdated={setUser} themePref={themePref} onThemeChange={setThemePref} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;