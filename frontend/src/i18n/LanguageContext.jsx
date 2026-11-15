import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  // t('dashboard.title') -> looks up translations[lang].dashboard.title,
  // falling back to English if a key is missing in the chosen language.
  function t(path) {
    const keys = path.split('.');
    let value = translations[lang];
    let fallback = translations.en;

    for (const key of keys) {
      value = value?.[key];
      fallback = fallback?.[key];
    }

    return value ?? fallback ?? path;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}