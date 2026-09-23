import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Key,
  FileText,
  Presentation,
  ExternalLink,
} from 'lucide-react';
import type { QuizQuestion, StudyItem } from '../../types';
import { GeminiKeyService } from '../../services/geminiKeyService';
import { DocumentTextExtractor } from '../../services/documentTextExtractor';
import { GeminiChatService } from '../../services/geminiChatService';

interface ExamSimulatorProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  item?: StudyItem;
  onJumpToPage?: (pageNum: number) => void;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({
  subjectName,
  onClose,
  item,
  onJumpToPage,
}) => {
  const isPresentation = item?.type === 'pptx' || item?.type === 'ppt';

  // Fallback questions for when API key is not configured or offline
  const fallbackQuestions: QuizQuestion[] = [
    {
      id: 'fb-1',
      question: item
        ? `What is the primary academic focus or foundational thesis explored in "${item.title}"?`
        : `Which principle is central to mastering ${subjectName}?`,
      options: [
        'Core conceptual understanding and systemic problem-solving',
        'Passive memorization of superficial definitions without application',
        'Skipping foundational axioms in favor of high-level intuition only',
        'Relying solely on external unverified summaries without proofs',
      ],
      correctIndex: 0,
      explanation: 'True academic mastery begins with foundational principles, formal definitions, and systematic application.',
      pageCitation: 1,
    },
    {
      id: 'fb-2',
      question: 'When analyzing complex academic structures or formal proofs, which methodology yields the highest retention?',
      options: [
        'Passive re-reading of textbooks without self-testing',
        'Active recall combined with spaced interval retrieval testing',
        'Cramming right before exam evaluation without rest cycles',
        'Linear note transcription without semantic reorganization',
      ],
      correctIndex: 1,
      explanation: 'Active recall and spaced retrieval force neural re-consolidation, significantly outperforming passive review.',
      pageCitation: 1,
    },
  ];

  const [questions, setQuestions] = useState<QuizQuestion[]>(fallbackQuestions);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Gemini API Key Management
  const [showKeySetup, setShowKeySetup] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);

  // Dynamic Exam Generator
  const generateExam = useCallback(
    async (forceApiKey?: string) => {
      const activeKey = forceApiKey || GeminiKeyService.getKey();

      if (!activeKey) {
        setShowKeySetup(true);
        setIsAiGenerated(false);
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        let extractedPages: any[] = [];
        if (item) {
          extractedPages = await DocumentTextExtractor.extractText(item);
        }

        const generated = await GeminiChatService.generateExamQuestions({
          apiKey: activeKey,
          documentTitle: item?.title || subjectName,
          subjectName,
          relevantPages: extractedPages,
          contentType: item?.type,
          questionCount: 5,
        });

        if (generated && generated.length > 0) {
          setQuestions(generated);
          setIsAiGenerated(true);
          setSelectedAnswers({});
          setIsSubmitted(false);
          setCurrentIdx(0);
          setTimeLeft(300);
          setShowKeySetup(false);
        }
      } catch (err: any) {
        console.warn('AI Exam Generation failed:', err);
        setGenerationError(
          err.message || 'Unable to generate dynamic questions. You can still practice with standard revision questions.'
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [item, subjectName]
  );

  // Trigger generation on initial mount if item and key exist
  useEffect(() => {
    const key = GeminiKeyService.getKey();
    if (key && item) {
      generateExam(key);
    } else if (!key) {
      setShowKeySetup(true);
    }
  }, [generateExam, item]);

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || isGenerating) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isGenerating]);

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentIdx(0);
    setTimeLeft(300);
  };

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;

    setIsValidatingKey(true);
    setGenerationError(null);

    const validation = await GeminiKeyService.validateKey(trimmed);
    setIsValidatingKey(false);

    if (validation.valid) {
      GeminiKeyService.saveKey(trimmed);
      setShowKeySetup(false);
      setTimeout(() => {
        generateExam(trimmed);
      }, 300);
    } else {
      setGenerationError(validation.error || 'Invalid API key. Please check Google AI Studio.');
    }
  };

  // Calculate score
  const score = questions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);
  const percentage = Math.round((score / questions.length) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] bg-[#090c13] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {item ? item.title : `${subjectName} Exam Simulator`}
                </h2>
                {isAiGenerated && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full shrink-0">
                    <Sparkles className="w-3 h-3 text-pink-400" /> AI Grounded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {subjectName} • {isAiGenerated ? 'Context-Grounded Dynamic Test' : 'Academic Revision Mock'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Regenerate Button */}
            {!isGenerating && (
              <button
                onClick={() => generateExam()}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.1] transition shadow-sm"
                title="Generate a brand new exam using AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>New Exam</span>
              </button>
            )}

            {!isSubmitted && !isGenerating && (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 font-mono shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition"
              title="Close Exam Simulator"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* AI Generating Loading State */}
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-8 h-8 animate-pulse text-pink-400" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400 absolute -bottom-1 -right-1" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Generating Tailored Exam with Gemini AI...</h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Reading <span className="text-indigo-300 font-semibold">{item?.title || subjectName}</span>, synthesizing core theorems, formulas, and high-yield questions...
              </p>
            </div>
          ) : (
            <div>
              {/* Optional API Key Setup Banner */}
              {showKeySetup && (
                <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30 text-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-pink-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Unlock Real AI-Generated Exams for this Document
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowKeySetup(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    Paste your free Google Gemini API key to automatically create custom practice tests tailored to{' '}
                    <span className="text-white font-semibold">"{item?.title || subjectName}"</span>.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      placeholder="Paste Gemini API Key (starts with AIza...)"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={isValidatingKey || !apiKeyInput.trim()}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      {isValidatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Save & Generate</span>
                    </button>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 px-2 py-1.5"
                    >
                      Get Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {generationError && (
                    <p className="text-[11px] text-rose-400 mt-2 font-medium">{generationError}</p>
                  )}
                </div>
              )}

              {!isSubmitted ? (
                <div>
                  {/* Question Navigation Bubbles */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
                    {questions.map((q, i) => (
                      <button
                        key={q.id || i}
                        onClick={() => setCurrentIdx(i)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-mono font-bold transition-all shrink-0 ${
                          currentIdx === i
                            ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] ring-1 ring-indigo-400/50'
                            : selectedAnswers[i] !== undefined
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Question Card */}
                  <div className="bg-[#090c13] border border-white/[0.07] rounded-2xl p-4 sm:p-6 mb-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                      <span className="font-bold uppercase tracking-wider text-indigo-400">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      {currentQ.pageCitation && (
                        <button
                          onClick={() => onJumpToPage?.(currentQ.pageCitation!)}
                          className="flex items-center gap-1 text-[11px] text-purple-300 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-lg hover:bg-purple-500/25 transition cursor-pointer"
                          title={`Jump to ${isPresentation ? 'Slide' : 'Page'} ${currentQ.pageCitation}`}
                        >
                          {isPresentation ? <Presentation className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span>{isPresentation ? `Slide ${currentQ.pageCitation}` : `Page ${currentQ.pageCitation}`}</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-100 mb-5 leading-relaxed tracking-tight">
                      {currentQ.question}
                    </h3>

                    {/* Options */}
                    <div className="space-y-2">
                      {currentQ.options.map((option, oIdx) => {
                        const isSelected = selectedAnswers[currentIdx] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectOption(oIdx)}
                            className={`w-full text-left px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-3 border ${
                              isSelected
                                ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500 ring-1 ring-indigo-500/40 shadow-sm'
                                : 'bg-[#0e121a] text-slate-300 border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors shrink-0 ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-black/40 text-slate-400 border border-white/[0.08]'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <span className="flex-1 leading-snug">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                      disabled={currentIdx === 0}
                      className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 hover:bg-white/[0.1] transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3">
                      {currentIdx < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                          className="px-3 sm:px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/[0.1] transition-all"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : null}

                      <button
                        onClick={handleSubmit}
                        className="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all"
                      >
                        Submit Exam
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Results Screen */
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="text-center py-6 px-4 bg-[#090c13] border border-white/[0.08] rounded-2xl shadow-sm">
                    <div
                      className={`inline-flex p-3 sm:p-4 rounded-2xl mb-3 ${
                        percentage >= 70
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <Award className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {percentage >= 80 ? 'Outstanding Result!' : percentage >= 50 ? 'Good Effort!' : 'Needs Review'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mb-4">
                      You scored <span className="text-white font-bold">{score}</span> out of{' '}
                      <span className="text-white font-bold">{questions.length}</span> ({percentage}%)
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      <button
                        onClick={handleRestart}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Test
                      </button>
                      <button
                        onClick={() => generateExam()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Generate Fresh Exam
                      </button>
                      <button
                        onClick={onClose}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" /> Answer Key & Deep Explanations
                    </h4>
                    {questions.map((q, idx) => {
                      const userAns = selectedAnswers[idx];
                      const isCorrect = userAns === q.correctIndex;

                      return (
                        <div
                          key={q.id || idx}
                          className={`p-3.5 sm:p-4 rounded-xl border text-sm transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-rose-500/10 border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isCorrect ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span className="font-semibold text-xs sm:text-sm text-slate-100">
                                Q{idx + 1}: {q.question}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {q.pageCitation && (
                                <button
                                  onClick={() => onJumpToPage?.(q.pageCitation!)}
                                  className="text-[10px] font-mono text-purple-300 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded hover:bg-purple-500/30 transition cursor-pointer"
                                  title={`Jump to ${isPresentation ? 'Slide' : 'Page'} ${q.pageCitation}`}
                                >
                                  {isPresentation ? `Slide ${q.pageCitation}` : `Page ${q.pageCitation}`}
                                </button>
                              )}
                              <span
                                className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-bold uppercase ${
                                  isCorrect
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs space-y-1 sm:ml-6 text-slate-300">
                            <p>
                              <strong className="text-slate-400">Your Answer:</strong>{' '}
                              {userAns !== undefined
                                ? `${String.fromCharCode(65 + userAns)}) ${q.options[userAns]}`
                                : 'Unanswered'}
                            </p>
                            {!isCorrect && (
                              <p className="text-emerald-400">
                                <strong>Correct Answer:</strong>{' '}
                                {String.fromCharCode(65 + q.correctIndex)}) {q.options[q.correctIndex]}
                              </p>
                            )}
                            <div className="text-slate-400 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                              <strong className="text-slate-300">Why:</strong> {q.explanation}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
