// src/hooks/useAdaptiveUI.js
import { useState, useEffect } from 'react';

// Maps user string choice to internal system tag
const CHOICE_TO_TAG = {
  'Text feels hard to read': 'dyslexic',
  'I lose focus easily': 'adhd',
  'Bright screens hurt my eyes': 'sensory-sensitive',
  'I prefer pictures over words': 'visual-learner',
  'I like things calm and predictable': 'autism-comfort',
  'I read at my own pace': 'slow-reader'
};

const TAG_TO_CLASS = {
  'dyslexic': 'profile-dyslexic',
  'adhd': 'profile-adhd',
  'sensory-sensitive': 'profile-sensory',
  'visual-learner': 'profile-visual',
  'autism-comfort': 'profile-autism',
  'slow-reader': 'profile-slow-reader'
};

export function useAdaptiveUI() {
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [comfortTags, setComfortTags] = useState([]);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stride_comfort_tags');
      if (saved) {
        const parsed = JSON.parse(saved);
        setComfortTags(parsed);
        // Reverse map to strings for the UI 
        const choices = Object.entries(CHOICE_TO_TAG)
          .filter(([_, tag]) => parsed.includes(tag))
          .map(([choice, _]) => choice);
        setSelectedChoices(choices);
      }
    } catch(e) { /* ignore */ }
  }, []);

  // Update body classes when tags or focus mode changes
  useEffect(() => {
    const body = document.body;
    
    // Clean old
    Object.values(TAG_TO_CLASS).forEach(cls => body.classList.remove(cls));
    body.classList.remove('focus-mode-active');

    // Apply new
    comfortTags.forEach(tag => {
      const cls = TAG_TO_CLASS[tag];
      if (cls) body.classList.add(cls);
    });

    if (isFocusMode || comfortTags.includes('adhd')) {
       // Only strictly enforce focus overlay if isFocusMode is true,
       // but applies base ADHD styles if tag is present.
       if (isFocusMode) body.classList.add('focus-mode-active');
    }

    // Persist to local storage
    if (comfortTags.length > 0) {
      localStorage.setItem('stride_comfort_tags', JSON.stringify(comfortTags));
    }
  }, [comfortTags, isFocusMode]);

  const toggleChoice = (choiceStr) => {
    setSelectedChoices(prev => {
      if (prev.includes(choiceStr)) return prev.filter(c => c !== choiceStr);
      return [...prev, choiceStr];
    });
  };

  // Convert string choices to internal tags
  const applySelections = () => {
    const tags = selectedChoices.map(c => CHOICE_TO_TAG[c]).filter(Boolean);
    setComfortTags(tags);
    return tags;
  };

  const clearProfile = () => {
    setSelectedChoices([]);
    setComfortTags([]);
    setIsFocusMode(false);
    localStorage.removeItem('stride_comfort_tags');
  };

  return {
    selectedChoices,
    toggleChoice,
    applySelections,
    clearProfile,
    comfortTags,
    isFocusMode,
    setIsFocusMode
  };
}
