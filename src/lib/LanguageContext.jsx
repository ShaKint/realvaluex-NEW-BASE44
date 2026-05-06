import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('rvx_lang') || 'he';
  });

  useEffect(() => {
    localStorage.setItem('rvx_lang', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang(prev => prev === 'he' ? 'en' : 'he');

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, isRTL: lang === 'he' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
};