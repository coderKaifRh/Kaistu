import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Plus,
  Trash2,
  Shuffle,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  FileText,
  Loader2,
  Key,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { GeminiChatService } from '../../services/geminiChatService';
import { GeminiKeyService } from '../../services/geminiKeyService';
import { DocumentTextExtractor } from '../../services/documentTextExtractor';
import type { Flashcard, StudyItem } from '../../types';

interface FlashcardDeckProps {
  subjectId: string;
  subjectName: string;
  item?: StudyItem;
  onJumpToPage?: (page: number) => void;
  onClose: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  subjectId,
  subjectName,
  item,
  onJumpToPage,
  onClose,
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState<string>('');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [cardCountChoice, setCardCountChoice] = useState<number>(8);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, [subjectId]);

  // Keyboard navigation for power-studying
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdding || showConfigModal || showApiKeyModal || isGenerating) return;
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
  }, [isAdding, isFlipped, currentIndex, cards, showConfigModal, showApiKeyModal, isGenerating]);

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
      sourceTitle: item?.title,
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

  const handleClearDeck = async () => {
    if (cards.length === 0) return;
    if (confirm('Clear all flashcards in this subject deck? You can auto-generate fresh cards anytime from your document.')) {
      await StorageService.clearFlashcards(subjectId);
      setCards([]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSuccessBanner('Deck cleared. You can now auto-generate fresh cards from your document.');
      setTimeout(() => setSuccessBanner(null), 3500);
    }
  };

  // Trigger AI auto-generation
  const handleStartAiGeneration = () => {
    setGenerationError(null);
    const key = GeminiKeyService.getKey();
    if (!key) {
      setShowApiKeyModal(true);
      return;
    }
    setShowConfigModal(true);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 20) {
      setApiKeyError('Please enter a valid Google Gemini API key.');
      return;
    }
    GeminiKeyService.saveKey(apiKeyInput.trim());
    setShowApiKeyModal(false);
    setApiKeyError(null);
    setShowConfigModal(true);
  };

  const handleExecuteGeneration = async () => {
    if (!item) return;
    const key = GeminiKeyService.getKey();
    if (!key) {
      setShowConfigModal(false);
      setShowApiKeyModal(true);
      return;
    }

    setShowConfigModal(false);
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStage(`Extracting text from "${item.title.slice(0, 28)}"...`);

    try {
      const extractedPages = await DocumentTextExtractor.extractText(item);
      if (!extractedPages || extractedPages.length === 0) {
        throw new Error('Could not extract readable text from this document. Please ensure the file contains searchable text.');
      }

      setGenerationStage(`Synthesizing ${cardCountChoice} high-yield active recall cards with Gemini...`);

      const newCards = await GeminiChatService.generateFlashcardsFromDocument({
        apiKey: key,
        subjectId,
        subjectName,
        documentTitle: item.title,
        relevantPages: extractedPages,
        contentType: item.type,
        cardCount: cardCountChoice,
      });

      if (!newCards || newCards.length === 0) {
        throw new Error('AI did not return any cards. Please try again.');
      }

      setGenerationStage('Saving cards to your subject study deck...');
      await StorageService.saveFlashcards(newCards);

      setCards((prev) => [...newCards, ...prev]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSuccessBanner(`⚡ Generated ${newCards.length} flashcards from "${item.title.slice(0, 24)}"!`);
      setTimeout(() => setSuccessBanner(null), 4500);
    } catch (err: any) {
      console.error('Failed to generate flashcards:', err);
      setGenerationError(err.message || 'Failed to generate flashcards with Gemini.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] bg-[#090c13] shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                Active Recall Flashcards
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {subjectName} • Spaced Repetition Deck
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {item && (
              <button
                onClick={handleStartAiGeneration}
                disabled={isGenerating}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] disabled:opacity-50"
                title={`Auto-generate cards from "${item.title}"`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span className="hidden sm:inline">Auto-Generate</span>
                <span className="sm:hidden">⚡ AI Auto</span>
              </button>
            )}

            <button
              onClick={() => setIsAdding(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.1] text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/[0.08]"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Add Card</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successBanner}</span>
            </span>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {generationError && (
          <div className="px-5 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{generationError}</span>
            </span>
            <button
              onClick={() => setGenerationError(null)}
              className="text-rose-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center overflow-y-auto relative min-h-[340px]">
          {/* Generating Loading State */}
          {isGenerating && (
            <div className="absolute inset-0 bg-[#0e121a]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.35)] animate-pulse">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <h3 className="text-base font-bold text-white mb-2">Generating Active Recall Cards</h3>
              <p className="text-xs text-purple-300/80 font-mono max-w-sm mb-4">
                {generationStage || 'Synthesizing key definitions, formulas & concepts...'}
              </p>
              <p className="text-[11px] text-slate-500">
                Grounding questions in real document pages with click-to-jump citations.
              </p>
            </div>
          )}

          {cards.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-4 shadow-inner">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                No flashcards in this deck yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                Active recall testing accelerates long-term retention by 200%. Auto-generate a deck directly from your current material or add your own cards.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {item && (
                  <button
                    onClick={handleStartAiGeneration}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                    <span>⚡ Auto-Generate from "{item.title.slice(0, 24)}..."</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-white/[0.08] transition"
                >
                  <Plus className="w-4 h-4 text-indigo-400" /> Custom Card
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
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={shuffleCards}
                    className="hover:text-slate-200 flex items-center gap-1 transition-colors text-[11px]"
                    title="Shuffle cards"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Shuffle
                  </button>
                  <button
                    onClick={handleDeleteCurrent}
                    className="hover:text-rose-400 flex items-center gap-1 transition-colors text-[11px]"
                    title="Delete current card"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button
                    onClick={handleClearDeck}
                    className="hover:text-rose-400 text-slate-500 flex items-center gap-1 transition-colors text-[11px]"
                    title="Clear all cards in deck"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                />
              </div>

              {/* Prominent Quick Auto-Generate Banner on Mobile & Desktop */}
              {item && (
                <div className="w-full mb-3 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-[11px] text-purple-200 truncate">
                      Document: <strong className="text-white">{item.title}</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleStartAiGeneration}
                    disabled={isGenerating}
                    className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-sm shrink-0 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-purple-200" />
                    <span>⚡ Auto-Generate</span>
                  </button>
                </div>
              )}

              {/* Interactive Flashcard */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] cursor-pointer rounded-2xl bg-gradient-to-b from-[#141a27] to-[#0c1017] border border-white/[0.08] hover:border-purple-500/40 p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl transition-all duration-300 group select-none"
              >
                {/* Top Row: State Badge + Flip Hint */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isFlipped
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-purple-300 transition-colors font-mono">
                    <RotateCw className="w-3 h-3" /> Space or click to flip
                  </span>
                </div>

                {/* Question / Answer Text */}
                <div className="my-auto py-5 text-center">
                  <p className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed tracking-tight">
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </p>
                </div>

                {/* Bottom Row: Source Citation & Difficulty */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-3 flex-wrap gap-2">
                  {/* Source Citation Badge with Click-to-Jump */}
                  {currentCard.sourceCitation ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentCard.sourcePageNumber && onJumpToPage) {
                          onJumpToPage(currentCard.sourcePageNumber);
                          onClose();
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition cursor-pointer"
                      title={currentCard.sourcePageNumber ? `Jump to ${currentCard.sourceCitation} in viewer` : undefined}
                    >
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>{currentCard.sourceCitation}</span>
                      {currentCard.sourcePageNumber && onJumpToPage && (
                        <span className="text-[9px] text-purple-400/80">↗ Jump</span>
                      )}
                    </button>
                  ) : (
                    <span className="capitalize text-[10px]">
                      {currentCard.difficulty ? `Last rated: ${currentCard.difficulty}` : 'Not yet reviewed'}
                    </span>
                  )}

                  <span className="font-mono text-[10px] text-slate-500">
                    Press 1, 2, or 3 to rate
                  </span>
                </div>
              </div>

              {/* Navigation & Rating buttons */}
              <div className="w-full mt-5 flex flex-col gap-3">
                {isFlipped ? (
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <button
                      onClick={() => handleRate('hard')}
                      className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>1</span> Hard
                    </button>
                    <button
                      onClick={() => handleRate('medium')}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>2</span> Good
                    </button>
                    <button
                      onClick={() => handleRate('easy')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>3</span> Easy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={prevCard}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-white/[0.06] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="px-5 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(168,85,247,0.35)] transition-all"
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

        {/* AI Generation Config Modal */}
        {showConfigModal && item && (
          <div className="absolute inset-0 bg-[#0e121a]/95 backdrop-blur-xl z-20 p-6 flex flex-col justify-center animate-fadeIn">
            <div className="max-w-md mx-auto w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Auto-Generate Flashcards</h3>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-300 mb-1">
                  Target Material: <strong className="text-white">{item.title}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  KaiStu will extract the key formulas, definitions, and concepts and generate active recall flashcards anchored to exact pages/slides.
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Number of Cards to Synthesize
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 8, 12].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCardCountChoice(cnt)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        cardCountChoice === cnt
                          ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                          : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{cnt} Cards</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {cnt === 5 ? 'High-Yield' : cnt === 8 ? 'Balanced' : 'Deep-Dive'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteGeneration}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  <span>Synthesize Cards</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key Setup Modal */}
        {showApiKeyModal && (
          <div className="absolute inset-0 bg-[#0e121a]/95 backdrop-blur-xl z-30 p-6 flex flex-col justify-center animate-fadeIn">
            <div className="max-w-md mx-auto w-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Google Gemini API Key Needed</h3>
                </div>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Card auto-generation uses Google's free Gemini API. Your key is stored securely in your browser's local storage and never sent to any third party.
              </p>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Get a free key in 30 seconds at{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-purple-300 font-bold inline-flex items-center gap-1"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  (100% Free, no credit card required).
                </span>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-3">
                <div>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    required
                  />
                  {apiKeyError && (
                    <p className="text-[11px] text-rose-400 mt-1">{apiKeyError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
                  >
                    Save Key & Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Card Modal */}
        {isAdding && (
          <div className="absolute inset-0 bg-[#0e121a]/95 backdrop-blur-xl z-20 p-6 flex flex-col justify-center animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Add Custom Flashcard
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
