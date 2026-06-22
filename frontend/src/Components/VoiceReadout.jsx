import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const VoiceReadout = ({ text }) => {
  const { selectedLanguage, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }
  }, []);

  const getVoiceLang = () => {
    switch (selectedLanguage) {
      case 'hi': return 'hi-IN';
      case 'te': return 'te-IN';
      case 'kn': return 'kn-IN';
      case 'es': return 'es-ES';
      default: return 'en-US';
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (!text) return;
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLang();
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-full transition-colors flex items-center gap-2 ${isPlaying ? 'bg-primary text-white' : 'hover:bg-primary/10 text-primary'}`}
      title={isPlaying ? t('Stop') : t('Listen')}
    >
      {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
      <span className="text-sm font-medium pr-1">{isPlaying ? t('Stop') : t('Listen')}</span>
    </button>
  );
};

export default VoiceReadout;
