import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { QuizQuestion } from '../../types';

interface ExamSimulatorProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({
  subjectName,
  onClose,
}) => {
  // Practice question bank tailored dynamically for academic revision
  const sampleQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'Which of the following sorting algorithms offers an optimal guaranteed worst-case time complexity of O(n log n)?',
      options: ['QuickSort', 'MergeSort', 'BubbleSort', 'InsertionSort'],
      correctIndex: 1,
      explanation: 'MergeSort always divides the array in half and merges them in linear time, guaranteeing O(n log n) even in the worst case.',
    },
    {
      id: 'q2',
      question: 'In computational complexity, which complexity class represents problems verifiable in polynomial time by a deterministic Turing machine?',
      options: ['NP', 'P', 'NP-Complete', 'EXPTIME'],
      correctIndex: 0,
      explanation: 'NP (Nondeterministic Polynomial time) is the set of decision problems for which a given solution candidate can be verified in polynomial time.',
    },
    {
      id: 'q3',
      question: 'What is the primary objective of the Spaced Repetition learning technique?',
      options: [
        'Cramming maximum information 24 hours prior to examination',
        'Systematically increasing intervals between reviews to combat the Ebbinghaus forgetting curve',
        'Highlighting text multiple times in contrasting neon colors',
        'Re-reading textbook chapters passively without testing',
      ],
      correctIndex: 1,
      explanation: 'Spaced repetition reviews material at expanding time intervals right as memory begins to decay, solidifying long-term neural retention.',
    },
    {
      id: 'q4',
      question: 'Which data structure utilizes LIFO (Last-In, First-Out) ordering?',
      options: ['Queue', 'Stack', 'Heap', 'Linked List'],
      correctIndex: 1,
      explanation: 'A Stack is a LIFO data structure where the most recently pushed element is the first one popped.',
    },
    {
      id: 'q5',
      question: 'In deep learning transformers, what mechanism allows tokens to attend to information from other positions dynamically?',
      options: ['Backpropagation through time', 'Convolutional kernels', 'Self-Attention mechanism', 'Max Pooling'],
      correctIndex: 2,
      explanation: 'Self-attention calculates pairwise similarity scores between all tokens (Queries and Keys) to weight the contribution of Values.',
    },
  ];

  const [questions] = useState<QuizQuestion[]>(sampleQuestions);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes

  useEffect(() => {
    if (isSubmitted) return;
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
  }, [isSubmitted]);

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#090c13]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Timed Exam Simulator</h2>
              <p className="text-xs text-slate-400">{subjectName} • Practice Mock Exam</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isSubmitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 font-mono shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!isSubmitted ? (
            <div>
              {/* Question Navigation Bubbles */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                      currentIdx === i
                        ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/40'
                        : selectedAnswers[i] !== undefined
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Question Card */}
              <div className="bg-[#090c13] border border-white/[0.07] rounded-2xl p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                  <span className="font-bold uppercase tracking-wider text-indigo-400">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span>1 Mark</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-6 leading-relaxed tracking-tight">
                  {currentQ.question}
                </h3>

                {/* Options */}
                <div className="space-y-2.5">
                  {currentQ.options.map((option, oIdx) => {
                    const isSelected = selectedAnswers[currentIdx] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(oIdx)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 border ${
                          isSelected
                            ? 'bg-indigo-600/15 text-indigo-200 border-indigo-500 ring-1 ring-indigo-500/30 shadow-sm'
                            : 'bg-[#0e121a] text-slate-300 border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-colors ${
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
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 hover:bg-white/[0.1] transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="flex items-center gap-3">
                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/[0.1] transition-all"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}

                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all"
                  >
                    Submit Exam
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Results Screen */
            <div className="space-y-6">
              <div className="text-center py-6 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <div
                  className={`inline-flex p-4 rounded-full mb-3 ${
                    percentage >= 70
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <Award className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {percentage >= 80 ? 'Outstanding Result!' : percentage >= 50 ? 'Good Effort!' : 'Needs Review'}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  You scored <span className="text-white font-bold">{score}</span> out of{' '}
                  <span className="text-white font-bold">{questions.length}</span> ({percentage}%)
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleRestart}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake Test
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" /> Answer Key & Explanations
                </h4>
                {questions.map((q, idx) => {
                  const userAns = selectedAnswers[idx];
                  const isCorrect = userAns === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border text-sm ${
                        isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200">
                            Q{idx + 1}: {q.question}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 ml-6 text-slate-300">
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
                        <p className="text-slate-400 mt-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                          <strong className="text-slate-300">Why:</strong> {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
