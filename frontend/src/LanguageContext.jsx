import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './i18n/english.json';
import hi from './i18n/hindi.json';
import te from './i18n/telugu.json';
import kn from './i18n/kannada.json';
import es from './i18n/spanish.json';

const LanguageContext = createContext();

const translations = {
  en,
  hi,
  te,
  kn,
  es
};

export const LanguageProvider = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('driverpulse_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('driverpulse_language', selectedLanguage);
  }, [selectedLanguage]);

  const t = useCallback((key) => {
    const langObj = translations[selectedLanguage] || translations['en'];
    // Return translation if exists, fallback to English, or finally the key itself
    return langObj[key] || translations['en'][key] || key;
  }, [selectedLanguage]);

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
