import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, X } from 'lucide-react';
import { StorageService } from '../../services/storage';
import type { ExamTarget, Subject } from '../../types';

interface ExamCountdownWidgetProps {
  subjects: Subject[];
}

export const ExamCountdownWidget: React.FC<ExamCountdownWidgetProps> = ({ subjects }) => {
  const [targets, setTargets] = useState<ExamTarget[]>([]);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [examTitle, setExamTitle] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    const list = await StorageService.getExamTargets();
    setTargets(list);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !examTitle.trim() || !targetDate) return;

    const sub = subjects.find((s) => s.id === selectedSubjectId);
    const newTarget: ExamTarget = {
      id: `exam-${Date.now()}`,
      subjectId: selectedSubjectId,
      subjectName: sub ? sub.name : 'General Exam',
      title: examTitle.trim(),
      targetDate,
      createdAt: Date.now(),
    };

    await StorageService.saveExamTarget(newTarget);
    setExamTitle('');
    setTargetDate('');
    setIsAdding(false);
    await loadTargets();
  };

  const handleDelete = async (id: string) => {
    await StorageService.deleteExamTarget(id);
    await loadTargets();
  };

  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-slate-900/50 border border-white/[0.07] rounded-xl p-3 text-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Exam Timeline
        </span>
        <button
          onClick={() => {
            if (subjects.length > 0 && !selectedSubjectId) {
              setSelectedSubjectId(subjects[0].id);
            }
            setIsAdding(true);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Add exam target date"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {targets.length === 0 ? (
        <div className="text-center py-2.5 text-[11px] text-slate-500">
          No exams scheduled. Click <span className="text-indigo-400 font-semibold">+</span> to set a date!
        </div>
      ) : (
        <div className="space-y-1.5">
          {targets.map((t) => {
            const days = getDaysRemaining(t.targetDate);
            const isUrgent = days <= 3 && days >= 0;

            return (
              <div
                key={t.id}
                className="group flex items-center justify-between p-2 rounded-lg bg-black/25 border border-white/[0.05] hover:border-white/[0.12] text-xs transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-200 truncate text-[11px] tracking-tight">{t.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{t.subjectName}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      days < 0
                        ? 'bg-white/[0.04] text-slate-500'
                        : isUrgent
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 ring-1 ring-rose-500/20'
                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                    }`}
                  >
                    {days < 0 ? 'Passed' : days === 0 ? 'Today!' : `${days}d left`}
                  </span>

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition"
                    title="Delete target"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" /> Set Exam Target
              </h4>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Exam Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm / Final Examination"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
