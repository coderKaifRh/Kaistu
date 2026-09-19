import React, { useState } from 'react';
import type { Subject } from '../../types';
import { X, BookOpen, Brain, Atom, Sigma, Code2, Globe2, Sparkles } from 'lucide-react';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Subject) => void;
  initialSubject?: Subject | null;
}

const COLOR_OPTIONS = [
  { name: 'Indigo Dream', value: 'from-indigo-600 to-blue-600' },
  { name: 'Emerald Focus', value: 'from-emerald-600 to-teal-600' },
  { name: 'Purple Galaxy', value: 'from-purple-600 to-pink-600' },
  { name: 'Amber Energy', value: 'from-amber-600 to-orange-600' },
  { name: 'Rose Passion', value: 'from-rose-600 to-red-600' },
  { name: 'Cyan Sky', value: 'from-cyan-600 to-blue-500' },
];

const ICON_OPTIONS = [
  { name: 'Brain', icon: Brain },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Atom', icon: Atom },
  { name: 'Sigma', icon: Sigma },
  { name: 'Code2', icon: Code2 },
  { name: 'Globe2', icon: Globe2 },
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSubject,
}) => {
  const [name, setName] = useState(initialSubject?.name || '');
  const [code, setCode] = useState(initialSubject?.code || '');
  const [description, setDescription] = useState(initialSubject?.description || '');
  const [color, setColor] = useState(initialSubject?.color || COLOR_OPTIONS[0].value);
  const [icon, setIcon] = useState(initialSubject?.icon || 'BookOpen');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const subject: Subject = {
      id: initialSubject?.id || 'sub-' + Date.now(),
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      color,
      icon,
      createdAt: initialSubject?.createdAt || Date.now(),
    };

    onSave(subject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#080a0f]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center text-white shadow-sm`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {initialSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              <p className="text-[11px] text-slate-400">Organize your materials, notes and exams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Subject Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Higher Mathematics, Machine Learning..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Course Code / Tag (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. MATH-201, CSE-302"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Description / Learning Goal
            </label>
            <textarea
              rows={2}
              placeholder="What syllabus modules or exams are covered here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 resize-none transition"
            />
          </div>

          {/* Color Gradient Theme */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Theme Accent
            </label>
            <div className="flex gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-lg bg-gradient-to-r ${c.value} transition-all ${
                    color === c.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b0e14] scale-110 shadow-md'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Icon Choice */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Symbol
            </label>
            <div className="flex gap-2">
              {ICON_OPTIONS.map((ico) => {
                const IconComp = ico.icon;
                return (
                  <button
                    key={ico.name}
                    type="button"
                    onClick={() => setIcon(ico.name)}
                    className={`p-2 rounded-xl border transition-all ${
                      icon === ico.name
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-[#07090e] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition"
            >
              {initialSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
