import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
  const { selectedLanguage, setSelectedLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'hi', label: '🇮🇳 हिन्दी' },
    { code: 'te', label: '🇮🇳 తెలుగు' },
    { code: 'kn', label: '🇮🇳 ಕನ್ನಡ' },
    { code: 'es', label: '🇪🇸 Español' },
  ];

  return (
    <div className="flex flex-col mb-4">
      <label className="text-xs text-textLight/50 uppercase font-bold tracking-wider mb-2 flex items-center gap-1 px-2">
        <Globe size={14} />
        {t('Select Language')}
      </label>
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className="w-full bg-bgDark border border-white/10 rounded-lg px-3 py-2 text-sm text-textLight focus:outline-none focus:border-primary mx-2"
        style={{ width: 'calc(100% - 16px)' }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
