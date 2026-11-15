import { useState } from 'react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import './Settings.css';

const THEME_OPTIONS = ['light', 'dark', 'auto'];

function Settings({ user, onUserUpdated, themePref, onThemeChange }) {
  const [name, setName] = useState(user.name);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { t, lang, setLang } = useLanguage();

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const result = await apiRequest('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      onUserUpdated(result.user);
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordLoading(true);
    try {
      await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  }

  const activeIndex = THEME_OPTIONS.indexOf(themePref);

  return (
    <div>
      <h1 className="settings-header">{t('settings.title')}</h1>

      <div className="settings-section">
        <h2 className="settings-section-title">{t('settings.profileTitle')}</h2>
        <p className="settings-section-desc">{t('settings.profileDesc')}</p>

        <form onSubmit={handleProfileSubmit}>
          <div className="settings-field">
            <label>{t('auth.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="settings-field">
            <label>{t('auth.email')}</label>
            <input type="email" value={user.email} disabled />
          </div>
          <button className="settings-btn" disabled={profileLoading}>
            {profileLoading ? t('settings.saving') : t('settings.saveChanges')}
          </button>
          {profileMsg && <p className={`settings-msg ${profileMsg.type}`}>{profileMsg.text}</p>}
        </form>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">{t('settings.passwordTitle')}</h2>
        <p className="settings-section-desc">{t('settings.passwordDesc')}</p>

        <form onSubmit={handlePasswordSubmit}>
          <div className="settings-field">
            <label>{t('settings.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="settings-field">
            <label>{t('settings.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="settings-btn" disabled={passwordLoading}>
            {passwordLoading ? t('settings.updating') : t('settings.changePassword')}
          </button>
          {passwordMsg && <p className={`settings-msg ${passwordMsg.type}`}>{passwordMsg.text}</p>}
        </form>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">{t('settings.appearanceTitle')}</h2>
        <p className="settings-section-desc">{t('settings.appearanceDesc')}</p>

        <div className="settings-theme-slider-track">
          <div
            className="settings-theme-slider-thumb"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {THEME_OPTIONS.map((option) => (
            <button
              key={option}
              className={`settings-theme-slider-option ${themePref === option ? 'active' : ''}`}
              onClick={() => onThemeChange(option)}
            >
              {t(`settings.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">{t('settings.languageTitle')}</h2>
        <p className="settings-section-desc">{t('settings.languageDesc')}</p>

        <div className="settings-field">
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Settings;