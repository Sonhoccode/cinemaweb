import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const I18nContext = createContext({
  lang: 'vi',
  setLang: () => {},
  t: (key, vars) => key,
  locale: 'vi-VN'
});

const getNested = (obj, path) => {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const formatString = (value, vars) => {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
};

export const I18nProvider = ({ children }) => {
  const initial = (() => {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'vi' || saved === 'en') return saved;
      return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
    } catch {
      return 'vi';
    }
  })();

  const [lang, setLangState] = useState(initial);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem('lang', next);
    } catch {}
  };

  const t = (key, vars) => {
    const value =
      getNested(translations[lang], key) ??
      getNested(translations.en, key) ??
      key;
    if (typeof value === 'function') return value(vars);
    if (typeof value === 'string') return formatString(value, vars);
    return key;
  };

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

  const contextValue = useMemo(() => ({ lang, setLang, t, locale }), [lang]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
