import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Plus,
  Trash2,
  Shuffle,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ subjectId, subjectName, onClose }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');

  useEffect(() => {
    loadCards();
  }, [subjectId]);

  // Keyboard navigation for power-studying
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdding) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('hard');
        if (e.key === '2') handleRate('medium');
        if (e.key === '3') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, isFlipped, currentIndex, cards]);

  const loadCards = async () => {
    const list = await StorageService.getFlashcards(subjectId);
    setCards(list);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const card: Flashcard = {
      id: `fc-${Date.now()}`,
      subjectId,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      createdAt: Date.now(),
    };
    await StorageService.saveFlashcard(card);
    setNewQuestion('');
    setNewAnswer('');
    setIsAdding(false);
    await loadCards();
  };

  const handleDeleteCurrent = async () => {
    if (cards.length === 0) return;
    const current = cards[currentIndex];
    if (confirm('Delete this flashcard?')) {
      await StorageService.deleteFlashcard(current.id);
      const updated = cards.filter((c) => c.id !== current.id);
      setCards(updated);
      if (currentIndex >= updated.length && updated.length > 0) {
        setCurrentIndex(updated.length - 1);
      }
      setIsFlipped(false);
    }
  };

  const handleRate = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (cards.length === 0) return;
    const current = cards[currentIndex];
    const updated: Flashcard = {
      ...current,
      difficulty,
      lastReviewed: Date.now(),
    };
    await StorageService.saveFlashcard(updated);

    // Update in local state
    const newCards = [...cards];
    newCards[currentIndex] = updated;
    setCards(newCards);

    // Move to next
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevCard = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(cards.length - 1);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const generateSampleCards = async () => {
    const samples: Omit<Flashcard, 'id' | 'subjectId' | 'createdAt'>[] = [
      {
        question: 'What is the primary difference between Time Complexity and Space Complexity?',
        answer: 'Time complexity measures how runtime scales with input size (O(n)), while Space complexity measures additional memory used.',
      },
      {
        question: 'What is the Spaced Repetition effect in cognitive science?',
        answer: 'The phenomenon where learning is greater when studying is spread out over increasing intervals of time rather than crammed.',
      },
      {
        question: 'What is the Active Recall testing effect?',
        answer: 'Retrieving information from memory actively produces significantly stronger and longer-lasting retention than passive reading.',
      },
    ];

    for (const sample of samples) {
      const card: Flashcard = {
        id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId,
        question: sample.question,
        answer: sample.answer,
        createdAt: Date.now(),
      };
      await StorageService.saveFlashcard(card);
    }
    await loadCards();
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#090c13]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Active Recall Flashcards</h2>
              <p className="text-xs text-slate-400">{subjectName} • Spaced Repetition Deck</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all border border-indigo-500/30 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Card
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col justify-center overflow-y-auto">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-slate-800 text-indigo-400 mb-4">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">No flashcards in this deck yet</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                Active recall testing accelerates memorization by 200%. Add your first card or start with sample cards.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" /> Create First Card
                </button>
                <button
                  onClick={generateSampleCards}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/[0.08]"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" /> Load High-Yield Samples
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Progress & Actions */}
              <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-200 font-mono">
                  Card {currentIndex + 1} of {cards.length}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={shuffleCards}
                    className="hover:text-slate-200 flex items-center gap-1 transition-colors"
                    title="Shuffle cards"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Shuffle
                  </button>
                  <button
                    onClick={handleDeleteCurrent}
                    className="hover:text-rose-400 flex items-center gap-1 transition-colors"
                    title="Delete card"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden mb-6">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                />
              </div>

              {/* Luxury 3D Flashcard */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] cursor-pointer rounded-2xl bg-gradient-to-b from-[#141a27] to-[#0c1017] border border-white/[0.08] hover:border-indigo-500/40 p-8 flex flex-col justify-between relative shadow-2xl transition-all duration-300 group select-none"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isFlipped
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-indigo-300 transition-colors font-mono">
                    <RotateCw className="w-3 h-3" /> Space or click to flip
                  </span>
                </div>

                <div className="my-auto py-6 text-center">
                  <p className="text-xl font-medium text-slate-100 leading-relaxed tracking-tight">
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-3">
                  <span className="capitalize">
                    {currentCard.difficulty ? `Last rated: ${currentCard.difficulty}` : 'Not yet reviewed'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Press 1, 2, or 3 to rate</span>
                </div>
              </div>

              {/* Navigation & Rating buttons */}
              <div className="w-full mt-6 flex flex-col gap-3">
                {isFlipped ? (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleRate('hard')}
                      className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>1</span> Hard (Soon)
                    </button>
                    <button
                      onClick={() => handleRate('medium')}
                      className="py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>2</span> Good (Normal)
                    </button>
                    <button
                      onClick={() => handleRate('easy')}
                      className="py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>3</span> Easy (Mastered)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={prevCard}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/[0.06] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(99,102,241,0.35)] transition-all"
                    >
                      Show Answer (Space)
                    </button>
                    <button
                      onClick={nextCard}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/[0.06] transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Card Modal */}
        {isAdding && (
          <div className="absolute inset-0 bg-[#0e121a]/95 backdrop-blur-xl z-10 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Add New Flashcard
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Question / Concept (Front)
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. What is the time complexity of QuickSort in the worst case?"
                  className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-24"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Answer / Deep Explanation (Back)
                </label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="e.g. O(n^2), which occurs when the chosen pivot is always an extreme element."
                  className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-24"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
