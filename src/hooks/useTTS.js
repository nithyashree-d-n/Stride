// src/hooks/useTTS.js — Stride Adaptive
// Web Speech API + Indian Language TTS + highlighting state

import { useState, useEffect, useRef, useCallback } from 'react';

export const INDIAN_LANGUAGES = [
  { code: 'en-IN',  name: 'English (India)',  flag: '🇮🇳' },
  { code: 'hi-IN',  name: 'Hindi',            flag: '🇮🇳' },
  { code: 'ta-IN',  name: 'Tamil',            flag: '🇮🇳' },
  { code: 'te-IN',  name: 'Telugu',           flag: '🇮🇳' },
  { code: 'kn-IN',  name: 'Kannada',          flag: '🇮🇳' },
  { code: 'ml-IN',  name: 'Malayalam',        flag: '🇮🇳' },
  { code: 'bn-IN',  name: 'Bengali',          flag: '🇮🇳' },
  { code: 'mr-IN',  name: 'Marathi',          flag: '🇮🇳' },
  { code: 'gu-IN',  name: 'Gujarati',         flag: '🇮🇳' },
  { code: 'pa-IN',  name: 'Punjabi',          flag: '🇮🇳' },
  { code: 'or-IN',  name: 'Odia',             flag: '🇮🇳' },
  { code: 'en-US',  name: 'English (US)',     flag: '🇺🇸' },
];

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRateState] = useState(0.9);
  const [langCode, setLangCode] = useState('en-IN');
  const [voiceGender, setVoiceGender] = useState('female'); // 'male' | 'female'
  const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState(-1);

  const synthRef = useRef(window.speechSynthesis);
  const utterancesRef = useRef([]);
  const currentIndexRef = useRef(0);

  // Stop on component unmount
  useEffect(() => {
    return () => { synthRef.current.cancel(); };
  }, []);

  // Pick best available voice for lang + gender
  const pickVoice = useCallback((lang, gender) => {
    const voices = synthRef.current.getVoices();
    if (!voices.length) return null;
    const genderHint = gender === 'female' ? ['female', 'woman', 'zira', 'heera', 'veena', 'samantha'] : ['male', 'man', 'ravi', 'david', 'mark'];

    // Priority: exact lang + gender hint
    const byLang = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    const gendered = byLang.find(v => genderHint.some(h => v.name.toLowerCase().includes(h)));
    if (gendered) return gendered;
    // Fallback: any voice for that lang
    if (byLang.length) return byLang[0];
    // Fallback: any voice
    return voices[0] || null;
  }, []);

  /**
   * speak(text) — splits into sentences, speaks each, fires highlight events
   */
  const speak = useCallback((text) => {
    if (!text) return;
    synthRef.current.cancel();
    utterancesRef.current = [];
    currentIndexRef.current = 0;
    setHighlightedSentenceIndex(-1);

    // Split on sentence boundaries
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

    const speakNext = (idx) => {
      if (idx >= sentences.length) {
        setIsSpeaking(false);
        setHighlightedSentenceIndex(-1);
        return;
      }
      const sentence = sentences[idx].trim();
      if (!sentence) { speakNext(idx + 1); return; }

      const utter = new SpeechSynthesisUtterance(sentence);
      utter.rate = rate;
      utter.lang = langCode;
      const voice = pickVoice(langCode, voiceGender);
      if (voice) utter.voice = voice;

      utter.onstart = () => {
        setHighlightedSentenceIndex(idx);
        currentIndexRef.current = idx;
      };
      utter.onend = () => speakNext(idx + 1);
      utter.onerror = (e) => {
        if (e.error !== 'interrupted') console.warn('[TTS] error:', e.error);
        setIsSpeaking(false);
        setHighlightedSentenceIndex(-1);
      };

      utterancesRef.current.push(utter);
      synthRef.current.speak(utter);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    speakNext(0);
  }, [rate, langCode, voiceGender, pickVoice]);

  const stop = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightedSentenceIndex(-1);
  }, []);

  const pause = useCallback(() => {
    synthRef.current.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    synthRef.current.resume();
    setIsPaused(false);
  }, []);

  const setRate = useCallback((r) => setRateState(parseFloat(r)), []);

  return {
    isSpeaking, isPaused,
    rate, setRate,
    langCode, setLangCode,
    voiceGender, setVoiceGender,
    highlightedSentenceIndex,
    speak, stop, pause, resume,
  };
}
