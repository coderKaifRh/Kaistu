import React from 'react';
import type { Subject } from '../../types';
import {
  GraduationCap,
  Plus,
  Sparkles,
  BookOpen,
  Download,
  Trash2,
  Folder,
  Brain,
  Atom,
  Sigma,
  Code2,
  Globe2,
  Upload,
  X,
  LayoutGrid,
} from 'lucide-react';
import { PomodoroBar } from '../pomodoro/PomodoroBar';
import { ExamCountdownWidget } from '../exam/ExamCountdownWidget';
import { StorageService } from '../../services/storage';

interface SidebarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string) => void;
  onAddSubject: () => void;
  onDeleteSubject: (id: string, name: string) => void;
  onOpenAiHub: () => void;
  onExportData: () => void;
  itemCountsBySubject: Record<string, number>;
  onCloseMobile?: () => void;
  onBackToCourses?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onAddSubject,
  onDeleteSubject,
  onOpenAiHub,
  onExportData,
  itemCountsBySubject,
  onCloseMobile,
  onBackToCourses,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await StorageService.importSubjectBundle(text);
      alert(`Imported "${result.subject.name}" with ${result.itemsCount} materials and ${result.flashcardsCount} flashcards!`);
      window.location.reload();
    } catch (err: any) {
      alert('Failed to import bundle: ' + (err?.message || 'Invalid format'));
    }
  };

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain':
        return <Brain className="w-4 h-4" />;
      case 'Atom':
        return <Atom className="w-4 h-4" />;
      case 'Sigma':
        return <Sigma className="w-4 h-4" />;
      case 'Code2':
        return <Code2 className="w-4 h-4" />;
      case 'Globe2':
        return <Globe2 className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <aside className="w-72 sm:w-80 md:w-64 lg:w-72 bg-[#07060e] border-r border-purple-900/30 flex flex-col h-full shrink-0 select-none shadow-2xl md:shadow-none">
      {/* App Branding */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] ring-1 ring-white/20">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">KaiStu</span>
              <span className="text-[9px] font-bold tracking-widest bg-purple-500/20 text-purple-300 font-mono px-1.5 py-0.5 rounded border border-purple-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Study Companion</p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition md:hidden"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Embedded Pomodoro Widget */}
      <div className="p-3 border-b border-white/[0.06] bg-slate-900/30">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
          <span>Focus Session</span>
        </div>
        <PomodoroBar />
      </div>

      {/* AI Hub Launch Button */}
      <div className="p-3 border-b border-white/[0.06]">
        <button
          onClick={onOpenAiHub}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 border border-indigo-500/30 hover:border-indigo-500/60 text-slate-200 hover:text-white transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-3 h-3 text-amber-300" />
            </div>
            <span className="text-xs font-semibold tracking-tight">AI Assistant Hub</span>
          </div>
          <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
            GPT / Claude
          </span>
        </button>
      </div>

      {/* Navigation: Study Hub Overview */}
      {onBackToCourses && (
        <div className="px-3 pt-2 pb-1">
          <button
            onClick={onBackToCourses}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              !selectedSubjectId
                ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              <span>Study Hub</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Overview
            </span>
          </button>
        </div>
      )}

      {/* Subjects Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Subjects</span>
          <button
            onClick={onAddSubject}
            className="p-1 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
            title="Create New Subject"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8 px-2 text-slate-500 text-xs">
            <Folder className="w-7 h-7 mx-auto mb-2 opacity-25" />
            <p>No subjects added yet.</p>
            <button
              onClick={onAddSubject}
              className="mt-2 text-indigo-400 hover:text-indigo-300 font-semibold text-xs"
            >
              + Create First Subject
            </button>
          </div>
        ) : (
          subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            const count = itemCountsBySubject[sub.id] || 0;

            return (
              <div
                key={sub.id}
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-indigo-500/[0.12] border border-indigo-500/30 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                }`}
                onClick={() => onSelectSubject(sub.id)}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-r-full" />
                )}

                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white shrink-0 text-[10px] shadow-sm opacity-90`}
                  >
                    {getSubjectIcon(sub.icon)}
                  </div>
                  <div className="truncate">
                    <div className="truncate font-semibold text-slate-200 group-hover:text-white tracking-tight">
                      {sub.name}
                    </div>
                    {sub.code && (
                      <div className="text-[10px] text-slate-400 font-mono tracking-wide">{sub.code}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 bg-black/30 border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete subject "${sub.name}" and all its stored files?`)) {
                        onDeleteSubject(sub.id, sub.name);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-white/[0.08] rounded transition"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Exam Countdown Tracker */}
      <div className="p-2.5 border-t border-white/[0.06] bg-slate-900/20 shrink-0">
        <ExamCountdownWidget subjects={subjects} />
      </div>

      {/* Footer System Actions */}
      <div className="px-3.5 py-2.5 border-t border-white/[0.06] bg-[#07090e] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          accept=".kaistu,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/[0.06] text-slate-300 font-medium text-[11px]"
            title="Import a .kaistu subject bundle from friends"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import</span>
          </button>
          <button
            onClick={onExportData}
            className="flex items-center gap-1.5 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/[0.06] text-slate-300 font-medium text-[11px]"
            title="Backup all data as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
          100% Offline
        </span>
      </div>
    </aside>
  );
};
