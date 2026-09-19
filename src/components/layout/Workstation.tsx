import React, { useState, useEffect, useRef } from 'react';
import type { StudyItem, Subject } from '../../types';
import { PdfViewer } from '../viewers/PdfViewer';
import { YouTubeViewer } from '../viewers/YouTubeViewer';
import { DocxViewer } from '../viewers/DocxViewer';
import { PptxViewer } from '../viewers/PptxViewer';
import { NoteEditor } from '../notes/NoteEditor';
import { AiChatPane } from '../ai/AiChatPane';
import { FlashcardDeck } from '../flashcards/FlashcardDeck';
import { ExamSimulator } from '../quiz/ExamSimulator';
import { AmbientPlayer } from '../audio/AmbientPlayer';
import { StorageService } from '../../services/storage';
import {
  ArrowLeft,
  Columns,
  Sparkles,
  FileText,
  Video,
  Edit3,
  Presentation,
  Plus,
  Bot,
  X,
  Maximize2,
  GripVertical,
  Zap,
  BrainCircuit,
  Award,
  Share2,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

interface WorkstationProps {
  subject: Subject;
  item: StudyItem;
  allItems: StudyItem[];
  onBack: () => void;
  onUpdateItem: (updated: StudyItem) => void;
  onSelectItem: (item: StudyItem) => void;
  onOpenAiAssist: (contextPrompt: string) => void;
  onAddNewMaterial: () => void;
}

export const Workstation: React.FC<WorkstationProps> = ({
  subject,
  item,
  allItems,
  onBack,
  onUpdateItem,
  onSelectItem,
  onOpenAiAssist,
  onAddNewMaterial,
}) => {
  // Split screen mode: 'none' | 'notes' | 'ai'
  const [splitMode, setSplitMode] = useState<'none' | 'notes' | 'ai'>('none');
  const [splitSecondaryNote, setSplitSecondaryNote] = useState<StudyItem | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showExamQuiz, setShowExamQuiz] = useState(false);
  const [isRatioPopoverOpen, setIsRatioPopoverOpen] = useState(false);

  // Dynamic split percentage (default to 65% for balanced maximum video + spacious notes)
  const [splitPercent, setSplitPercent] = useState<number>(65);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsRatioPopoverOpen(false);
      }
    };
    if (isRatioPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRatioPopoverOpen]);

  const handleExportBundle = async () => {
    try {
      const json = await StorageService.exportSubjectBundle(subject.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${subject.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.kaistu`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export bundle.');
    }
  };

  // Calculate the exact 16:9 optimal video width to avoid empty black space
  const calculateOptimalVideoPercent = () => {
    if (!containerRef.current) return 65;
    const rect = containerRef.current.getBoundingClientRect();
    // Available height for video player (excluding top toolbar ~36px)
    const availableHeight = rect.height - 36;
    if (availableHeight <= 0) return 65;
    // 16:9 ideal width so video touches top, bottom, left, right without black bars
    const optimal16by9Width = Math.floor(availableHeight * (16 / 9));
    let percent = Math.round((optimal16by9Width / rect.width) * 100);
    // Give at least 25% to notes and limit video to 75% max
    if (percent > 75) percent = 75;
    if (percent < 45) percent = 45;
    return percent;
  };

  // Automatically activate split with notes and auto-fit on load
  useEffect(() => {
    if (item.type === 'youtube') {
      setSplitMode('notes');
      // Calculate optimal ratio so video is maximized and notes fill all remaining screen space
      const timer = setTimeout(() => {
        const optimal = calculateOptimalVideoPercent();
        setSplitPercent(optimal);
      }, 150);

      const existingNote = allItems.find((i) => i.type === 'note' && i.id !== item.id);
      if (existingNote) {
        setSplitSecondaryNote(existingNote);
      } else {
        const scratchpad: StudyItem = {
          id: 'note-yt-' + item.id,
          subjectId: subject.id,
          title: `Notes: ${item.title.slice(0, 26)}`,
          type: 'note',
          noteContent: `# 📝 Lecture Notes: ${item.title}\n\n- Key Concept:\n- Important Formula:\n- Summary:\n`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSplitSecondaryNote(scratchpad);
      }

      return () => clearTimeout(timer);
    }
  }, [item.id, item.type]);

  // Window resize listener to keep optimal zero-waste proportions
  useEffect(() => {
    const handleResize = () => {
      if (item.type === 'youtube' && splitMode !== 'none') {
        const optimal = calculateOptimalVideoPercent();
        setSplitPercent(optimal);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [item.type, splitMode]);

  // Mouse drag handler for custom divider resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const totalWidth = rect.width;
      let newPercent = Math.round((offsetX / totalWidth) * 100);
      // Clamp between 20% and 82% to always ensure readable note space
      if (newPercent < 20) newPercent = 20;
      if (newPercent > 82) newPercent = 82;
      setSplitPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleSplitNotes = () => {
    if (splitMode === 'notes') {
      setSplitMode('none');
    } else {
      setSplitMode('notes');
      if (!splitSecondaryNote) {
        const existingNote = allItems.find((i) => i.type === 'note' && i.id !== item.id);
        if (existingNote) {
          setSplitSecondaryNote(existingNote);
        } else {
          const scratchpad: StudyItem = {
            id: 'scratch-' + item.id,
            subjectId: subject.id,
            title: `Notes: ${item.title.slice(0, 24)}`,
            type: 'note',
            noteContent: `# Notes for: ${item.title}\n\n- Key Point 1:\n- Key Point 2:\n`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setSplitSecondaryNote(scratchpad);
        }
      }
    }
  };

  const toggleSplitAi = () => {
    if (splitMode === 'ai') {
      setSplitMode('none');
    } else {
      setSplitMode('ai');
    }
  };

  const renderItemViewer = (targetItem: StudyItem, isSplitPane = false) => {
    switch (targetItem.type) {
      case 'youtube':
        return (
          <YouTubeViewer
            item={targetItem}
            onUpdateItem={onUpdateItem}
            onOpenAiAssist={onOpenAiAssist}
          />
        );
      case 'pdf':
        return <PdfViewer item={targetItem} onOpenAiAssist={onOpenAiAssist} />;
      case 'docx':
        return <DocxViewer item={targetItem} onOpenAiAssist={onOpenAiAssist} />;
      case 'pptx':
        return <PptxViewer item={targetItem} onOpenAiAssist={onOpenAiAssist} />;
      case 'note':
        return (
          <NoteEditor
            item={targetItem}
            defaultViewMode="edit"
            onUpdateItem={(upd) => {
              onUpdateItem(upd);
              if (isSplitPane && splitSecondaryNote?.id === upd.id) {
                setSplitSecondaryNote(upd);
              }
            }}
            onOpenAiAssist={onOpenAiAssist}
          />
        );
      default:
        return <div className="p-4 text-slate-400">Unsupported format.</div>;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-3.5 h-3.5 text-rose-400" />;
      case 'youtube':
        return <Video className="w-3.5 h-3.5 text-red-400" />;
      case 'docx':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'pptx':
        return <Presentation className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Edit3 className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const isSplitActive = splitMode !== 'none';
  const otherItems = allItems.filter((i) => i.id !== item.id);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Invisible overlay while dragging to prevent iframes from stealing mouse events */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* Top Workstation Navigation Bar */}
      <header className="flex items-center justify-between px-3.5 py-2 bg-[#090c13] border-b border-white/[0.07] shrink-0 backdrop-blur-xl z-20">
        {/* Left Zone: Minimalist Back & Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition shrink-0"
            title="Return to Subjects Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-white/[0.08] shrink-0" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate hidden md:inline">
              {subject.name}
            </span>
            <span className="text-slate-600 hidden md:inline text-xs">/</span>
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-white truncate max-w-[200px] sm:max-w-[320px]">
              {getItemIcon(item.type)}
              <span className="truncate">{item.title}</span>
            </div>
          </div>
        </div>

        {/* Center Zone: Segmented Capsule Mode Switcher */}
        <div className="hidden sm:flex items-center bg-[#0e121a] border border-white/[0.08] p-1 rounded-xl shadow-inner">
          <button
            onClick={toggleSplitNotes}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-semibold ${
              splitMode === 'notes'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
            title="Split with Notes"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>

          <button
            onClick={toggleSplitAi}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs font-semibold ${
              splitMode === 'ai'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
            title="Split with AI Tutor"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
          </button>

          <button
            onClick={() => setSplitMode('none')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-semibold ${
              splitMode === 'none'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
            title="Single Viewer Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Theater</span>
          </button>
        </div>

        {/* Right Zone: Sizing Popover & Tools Dock */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ratio & Sizing Popover */}
          {isSplitActive && (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsRatioPopoverOpen(!isRatioPopoverOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                  isRatioPopoverOpen
                    ? 'bg-white/[0.12] text-white border-indigo-500/50'
                    : 'bg-[#0e121a] text-slate-300 border-white/[0.08] hover:border-white/[0.16]'
                }`}
                title="Adjust split ratio & auto-fit"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>{splitPercent}% : {100 - splitPercent}%</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isRatioPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0e121b]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 shadow-2xl z-50 text-slate-200">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" /> Screen Proportions
                    </span>
                    <span className="text-xs font-mono text-indigo-300 font-bold">
                      {splitPercent}% / {100 - splitPercent}%
                    </span>
                  </div>

                  {/* Auto-Fit Zero Waste feature */}
                  <button
                    onClick={() => {
                      const opt = calculateOptimalVideoPercent();
                      setSplitPercent(opt);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <div className="text-left">
                        <div className="font-bold">Auto-Fit (Zero Waste)</div>
                        <div className="text-[10px] text-emerald-400/80 font-normal">Max 16:9 video + full width to notes</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">Auto</span>
                  </button>

                  {/* Presets Grid */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[
                      { label: '65:35', val: 65 },
                      { label: '55:45', val: 55 },
                      { label: '50:50', val: 50 },
                      { label: '75:25', val: 75 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        onClick={() => setSplitPercent(p.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono text-center transition-all ${
                          splitPercent === p.val
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'bg-black/30 hover:bg-white/[0.08] text-slate-300 border border-white/[0.05]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Video Width</span>
                      <span className="font-mono">{splitPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={splitPercent}
                      onChange={(e) => setSplitPercent(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="h-4 w-[1px] bg-white/[0.08] hidden sm:block shrink-0" />

          {/* Tools Group */}
          <div className="flex items-center gap-1 bg-[#0e121a] border border-white/[0.08] p-1 rounded-xl shadow-inner">
            {/* Ambient Focus Sounds */}
            <AmbientPlayer compact={true} />

            {/* Flashcards Deck Trigger */}
            <button
              onClick={() => setShowFlashcards(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
              title="Spaced Repetition Flashcards"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Cards</span>
            </button>

            {/* Exam Quiz Modal Trigger */}
            <button
              onClick={() => setShowExamQuiz(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
              title="Practice Exam Simulator"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Quiz</span>
            </button>

            {/* Share Subject Bundle (.kaistu) */}
            <button
              onClick={handleExportBundle}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
              title="Share Course Bundle (.kaistu) with friends"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>

          {/* Quick AI Hub Launcher */}
          <button
            onClick={() =>
              onOpenAiAssist(
                `I am currently studying "${item.title}" in ${subject.name}. What are the most important principles I need to understand from this material?`
              )
            }
            className="flex items-center gap-1.5 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl font-semibold transition shadow-sm hidden lg:flex"
            title="Open Full AI Modal"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Tutor</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Video fills 16:9, Notes fills the rest with zero wasted space */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 overflow-hidden relative w-full"
      >
        {/* Primary Viewer Pane (Left Video: Exact optimal width) */}
        <div
          style={{ width: isSplitActive ? `${splitPercent}%` : '100%' }}
          className="h-full overflow-hidden p-0 sm:p-0.5 min-w-0 transition-none"
        >
          {renderItemViewer(item)}
        </div>

        {/* Draggable Resizer Divider Bar */}
        {isSplitActive && (
          <div
            onMouseDown={handleMouseDown}
            className={`w-3.5 -mx-1.5 hover:w-4 hover:-mx-2 cursor-col-resize z-20 flex items-center justify-center group select-none transition-colors shrink-0 ${
              isDragging ? 'bg-indigo-600/60' : 'bg-transparent hover:bg-indigo-600/30'
            }`}
            title="Drag left or right to customize split size freely!"
          >
            <div className="w-1.5 h-16 rounded-full bg-slate-700 group-hover:bg-indigo-400 flex items-center justify-center transition-colors shadow-md">
              <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-white" />
            </div>
          </div>
        )}

        {/* Secondary Split Viewer Pane (Right Notes / AI: Takes every single remaining pixel!) */}
        {isSplitActive && (
          <div
            style={{ width: `${100 - splitPercent}%` }}
            className="h-full border-l border-slate-800 overflow-hidden p-0 sm:p-0.5 flex flex-col min-w-0 transition-none"
          >
            {/* Split Header Toolbar */}
            <div className="flex items-center justify-between px-2.5 py-1 mb-0.5 border-b border-slate-800/80 text-xs shrink-0 bg-slate-900/60 rounded-t-lg">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold truncate">
                <Columns className="w-3.5 h-3.5" />
                <span className="truncate">
                  {splitMode === 'ai'
                    ? 'In-App AI (GPT • Gemini • Claude)'
                    : `Notes: ${splitSecondaryNote?.title || 'Lecture Notes'}`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {100 - splitPercent}%
                </span>
                <button
                  onClick={() => setSplitMode('none')}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  title="Close Companion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Split Content Pane */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {splitMode === 'ai' ? (
                <AiChatPane
                  contextInfo={`Subject: ${subject.name}, Material: ${item.title}`}
                  isCompact={true}
                />
              ) : (
                splitSecondaryNote && renderItemViewer(splitSecondaryNote, true)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Material Quick Switcher Bar (Only visible when split is inactive to preserve screen height) */}
      {!isSplitActive && otherItems.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-950 border-t border-slate-800/80 overflow-x-auto text-xs shrink-0">
          <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider shrink-0">
            Switch:
          </span>
          {otherItems.map((other) => (
            <button
              key={other.id}
              onClick={() => onSelectItem(other)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition shrink-0"
              title={other.title}
            >
              {getItemIcon(other.type)}
              <span className="truncate max-w-[140px]">{other.title}</span>
            </button>
          ))}
          <button
            onClick={onAddNewMaterial}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-900/60 transition shrink-0"
            title="Add more material"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      )}

      {/* Flashcard Deck Modal */}
      {showFlashcards && (
        <FlashcardDeck
          subjectId={subject.id}
          subjectName={subject.name}
          onClose={() => setShowFlashcards(false)}
        />
      )}

      {/* Exam Simulator Modal */}
      {showExamQuiz && (
        <ExamSimulator
          subjectId={subject.id}
          subjectName={subject.name}
          onClose={() => setShowExamQuiz(false)}
        />
      )}
    </div>
  );
};
