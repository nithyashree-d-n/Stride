// src/components/FlashcardSet.jsx
import React, { useState } from 'react';

export function FlashcardSet({ flashcards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) return null;

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const toggleFlip = () => setIsFlipped(!isFlipped);

  return (
    <div className="flashcard-container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 text-primary fw-medium">
          <i className="bi bi-card-text me-2"></i> Review Flashcards
        </h5>
        <div className="text-muted small">
          {currentIndex + 1} of {flashcards.length}
        </div>
      </div>

      <div 
        className="card bento-panel flashcard-scene position-relative"
        style={{ height: '280px', perspective: '1000px', cursor: 'pointer' }}
        onClick={toggleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleFlip();
          if (e.key === 'ArrowRight') handleNext();
          if (e.key === 'ArrowLeft') handlePrev();
        }}
        aria-label={isFlipped ? "Showing answer. Press Enter to flip back." : "Showing question. Press enter to flip."}
      >
        <div 
           className="flashcard-inner w-100 h-100 position-absolute"
           style={{
             transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
             transformStyle: 'preserve-3d',
             transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
           }}
        >
          {/* FRONT */}
          <div className="flashcard-face bg-surface-1 p-4 d-flex flex-column justify-content-center align-items-center w-100 h-100 position-absolute rounded" style={{ backfaceVisibility: 'hidden' }}>
            <span className="badge bg-secondary mb-3">Question</span>
            <p className="fs-5 text-center readable-text mb-0 fw-medium">{currentCard.question}</p>
            <div className="position-absolute bottom-0 mb-3 text-muted small">
              <i className="bi bi-arrow-repeat me-1"></i> Click to flip
            </div>
          </div>

          {/* BACK */}
          <div className="flashcard-face bg-surface-2 p-4 d-flex flex-column justify-content-center align-items-center w-100 h-100 position-absolute rounded border-primary" style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)', border: '2px solid' }}>
            <span className="badge bg-primary mb-3">Answer</span>
            <p className="fs-6 text-center readable-text mb-0 text-white">{currentCard.answer}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <button 
          className="btn btn-outline-secondary rounded-circle p-2 lh-1" 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          aria-label="Previous card"
        >
          <i className="bi bi-chevron-left"></i>
        </button>
        
        <div className="d-flex gap-2">
          {flashcards.map((_, idx) => (
            <div 
              key={idx} 
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: idx === currentIndex ? 'var(--bs-primary)' : 'var(--border-color)',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </div>

        <button 
          className="btn btn-outline-secondary rounded-circle p-2 lh-1" 
          onClick={handleNext} 
          disabled={currentIndex === flashcards.length - 1}
          aria-label="Next card"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
