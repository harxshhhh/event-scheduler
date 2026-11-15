import { useState } from 'react';
import { apiRequest, setToken } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import './Auth.css';

function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
      }
      const loginData = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(loginData.token);
      onLoginSuccess(loginData.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-overlay" />
      </div>

      <div className="auth-panel">
        <div className="auth-eyebrow">{t('appName')}</div>
        <h1 className="auth-headline">{t('auth.headline')}</h1>
        <p className="auth-subtext">{t('auth.subtext')}</p>

        <div className="auth-welcome">
          {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
        </div>
        <div className="auth-welcome-sub">
          {mode === 'login' ? t('auth.loginToContinue') : t('auth.getStarted')}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.pleaseWait') : mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              {t('auth.noAccount')}
              <button onClick={() => setMode('register')}>{t('auth.signUp')}</button>
            </>
          ) : (
            <>
              {t('auth.haveAccount')}
              <button onClick={() => setMode('login')}>{t('auth.login')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;