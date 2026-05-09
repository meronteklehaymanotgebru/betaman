// File: client/src/components/VoiceNarration.tsx
'use client';

import { useState } from 'react';

interface VoiceNarrationProps {
  text: string;
  language?: 'en' | 'am';
}

export default function VoiceNarration({ text, language = 'en' }: VoiceNarrationProps) {
  const [playing, setPlaying] = useState(false);

  // Check if browser supports speech synthesis
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null; // Hide button if not supported or during SSR
  }

  const handlePlay = () => {
    if (playing) return;
    
    setPlaying(true);
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'am' ? 'am-ET' : 'en-US';
    utterance.rate = 0.9;
    
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={handlePlay}
      disabled={playing}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
      title={language === 'am' ? 'Listen in Amharic' : 'Listen in English'}
      aria-label={`Listen to analysis in ${language === 'am' ? 'Amharic' : 'English'}`}
      type="button"
    >
      {playing ? '🔊' : '🔈'} {playing ? 'Playing' : 'Listen'}
    </button>
  );
}