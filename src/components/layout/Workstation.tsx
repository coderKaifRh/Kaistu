import React, { useState, useEffect, useRef } from 'react';
import type { StudyItem, Subject } from '../../types';
import { PdfViewer } from '../viewers/PdfViewer';
import { YouTubeViewer } from '../viewers/YouTubeViewer';
import { DocxViewer } from '../viewers/DocxViewer';
import { PptxViewer } from '../viewers/PptxViewer';
import { NoteEditor } from '../notes/NoteEditor';
import { FlashcardDeck } from '../flashcards/FlashcardDeck';
import { ExamSimulator } from '../quiz/ExamSimulator';
import { AmbientPlayer } from '../audio/AmbientPlayer';
import { StorageService } from '../../services/storage';
import { DocumentChatDrawer } from '../ai/DocumentChatDrawer';
import {
  ArrowLeft,
  Columns,
  Sparkles,
  FileText,
  Video,
  Edit3,
  Presentation,
  Plus,
  X,
  Maximize2,
  GripVertical,
  Zap,
  BrainCircuit,
  Award,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  Pencil,
  Trash2,
  MoreHorizontal,
  Headphones,
  ChevronRight,
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
  onDeleteItem?: (id: string) => void;
  onEditItem?: (item: StudyItem) => void;
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
  onDeleteItem,
  onEditItem,
}) => {
  // Split screen mode: 'none' | 'notes'
  const [splitMode, setSplitMode] = useState<'none' | 'notes'>('notes');
  const [splitSecondaryNote, setSplitSecondaryNote] = useState<StudyItem | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showExamQuiz, setShowExamQuiz] = useState(false);
  const [isRatioPopoverOpen, setIsRatioPopoverOpen] = useState(false);
  const [isDocChatOpen, setIsDocChatOpen] = useState(false);
  const [docChatInitialPrompt, setDocChatInitialPrompt] = useState<string | undefined>(undefined);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

  const handleJumpToPage = (pageNum: number) => {
    const pageEl =
      document.getElementById(`pdf-page-${pageNum}`) ||
      document.getElementById(`pptx-slide-${pageNum}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pageEl.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-slate-900', 'transition-all');
      setTimeout(() => {
        pageEl.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-slate-900');
      }, 2500);
    }
  };

  const handleAskAiTutor = (prompt: string) => {
    setDocChatInitialPrompt(prompt);
    setIsDocChatOpen(true);
  };

  // Mobile detection and mobile tab switcher ('material' | 'notes')
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobileTab, setMobileTab] = useState<'material' | 'notes'>('material');

  // Dynamic split percentage (default to 65% for balanced maximum video + spacious notes)
  const [splitPercent, setSplitPercent] = useState<number>(65);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Listen to window resize for responsive mode
  useEffect(() => {
    const handleWinResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

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

  // Escape key to quickly return to dashboard when no sub-modals are open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDocChatOpen && !showFlashcards && !showExamQuiz && !isRatioPopoverOpen) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isDocChatOpen, showFlashcards, showExamQuiz, isRatioPopoverOpen]);

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
    } catch {
      alert('Failed to export bundle.');
    }
  };

  // Calculate the exact 16:9 optimal video width to avoid empty black space
  const calculateOptimalVideoPercent = () => {
    if (!containerRef.current) return 65;
    const rect = containerRef.current.getBoundingClientRect();
    const availableHeight = rect.height - 36;
    if (availableHeight <= 0) return 65;
    const optimal16by9Width = Math.floor(availableHeight * (16 / 9));
    let percent = Math.round((optimal16by9Width / rect.width) * 100);
    if (percent > 75) percent = 75;
    if (percent < 45) percent = 45;
    return percent;
  };

  // Automatically setup notes companion on load
  useEffect(() => {
    const existingNote = allItems.find((i) => i.type === 'note' && i.id !== item.id);
    if (existingNote) {
      setSplitSecondaryNote(existingNote);
    } else {
      const scratchpad: StudyItem = {
        id: 'note-auto-' + item.id,
        subjectId: subject.id,
        title: `Notes: ${item.title.slice(0, 24)}`,
        type: 'note',
        noteContent: `# 📝 Lecture Notes: ${item.title}\n\n- Key Principle:\n- Important Formula:\n- Summary Takeaway:\n`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSplitSecondaryNote(scratchpad);
    }

    if (item.type === 'youtube') {
      setSplitMode('notes');
      const timer = setTimeout(() => {
        const optimal = calculateOptimalVideoPercent();
        setSplitPercent(optimal);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [item.id, item.type]);

  // Window resize listener to keep optimal zero-waste proportions on desktop
  useEffect(() => {
    const handleResize = () => {
      if (item.type === 'youtube' && splitMode !== 'none' && !isMobile) {
        const optimal = calculateOptimalVideoPercent();
        setSplitPercent(optimal);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [item.type, splitMode, isMobile]);

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
      case 'ppt':
        return (
          <PptxViewer
            item={targetItem}
            onOpenAiAssist={onOpenAiAssist}
            onAskAiTutor={handleAskAiTutor}
          />
        );
      case 'note':
        return (
          <NoteEditor
            item={targetItem}
            onUpdateItem={(upd) => {
              onUpdateItem(upd);
              if (isSplitPane) {
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
      case 'ppt':
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
      <header className="w-full min-w-0 flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-[#090c13] border-b border-white/[0.07] shrink-0 backdrop-blur-xl z-20 gap-1.5 sm:gap-2">
        {/* Left Zone: Back & Breadcrumbs */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/[0.1] transition shrink-0 font-medium text-xs shadow-sm group"
            title="Return to Subjects Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-semibold text-[11px] sm:text-xs hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-[1px] bg-white/[0.08] shrink-0 hidden sm:block" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate hidden lg:inline">
              {subject.name}
            </span>
            <span className="text-slate-600 hidden lg:inline text-xs">/</span>
            <div className="flex items-center gap-1 font-semibold text-xs text-white truncate max-w-[70px] sm:max-w-[180px] md:max-w-[240px]">
              {getItemIcon(item.type)}
              <span className="truncate">{item.title}</span>
            </div>

            {/* Quick Edit and Delete buttons (Visible on desktop/tablet, inside Action Sheet on mobile) */}
            <div className="hidden sm:flex items-center gap-0.5 shrink-0">
              {onEditItem && (
                <button
                  onClick={() => onEditItem(item)}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-white/[0.08] transition"
                  title="Edit this material (rename, link, tags)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteItem && (
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                      onDeleteItem(item.id);
                      onBack();
                    }
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] transition"
                  title="Delete this material"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center Zone: Desktop Split / Mobile Tabs */}
        {isMobile ? (
          <div className="flex items-center bg-[#0e121a] border border-white/[0.08] p-0.5 rounded-xl shadow-inner shrink-0">
            <button
              onClick={() => setMobileTab('material')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                mobileTab === 'material'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {getItemIcon(item.type)}
              <span>Viewer</span>
            </button>
            <button
              onClick={() => setMobileTab('notes')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                mobileTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Notes</span>
            </button>
          </div>
        ) : (
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
              <span>Notes Split</span>
            </button>

            <button
              onClick={() => setSplitMode('none')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-semibold ${
                splitMode === 'none'
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title="Single Fullscreen Theater"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Theater</span>
            </button>
          </div>
        )}

        {/* Right Zone: Sizing & Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ratio Popover (Desktop only) */}
          {!isMobile && isSplitActive && (
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
                <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#0e121b]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 shadow-2xl z-50 text-slate-200">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" /> Screen Proportions
                    </span>
                    <span className="text-xs font-mono text-indigo-300 font-bold">
                      {splitPercent}% / {100 - splitPercent}%
                    </span>
                  </div>

                  {item.type === 'youtube' && (
                    <button
                      onClick={() => {
                        const optimal = calculateOptimalVideoPercent();
                        setSplitPercent(optimal);
                      }}
                      className="w-full mb-3 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Auto-Fit (Zero Black Bars)</span>
                    </button>
                  )}

                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[
                      { label: '65:35', val: 65 },
                      { label: '55:45', val: 55 },
                      { label: '50:50', val: 50 },
                      { label: '75:25', val: 75 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setSplitPercent(p.val)}
                        className={`py-1 text-center rounded-lg text-xs font-mono transition-all ${
                          splitPercent === p.val
                            ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-200 font-bold'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Viewer Width</span>
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

          {/* Ambient Lo-Fi Soundscapes Player (Visible across all devices with viewport-aware portal) */}
          <AmbientPlayer compact={true} />

          {/* Desktop Secondary Tools Group (Cards, Quiz, Export - accessible via More menu on mobile) */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Tools Group */}
            <div className="flex items-center gap-1 bg-[#0e121a] border border-white/[0.08] p-1 rounded-xl shadow-inner">
              <button
                onClick={() => setShowFlashcards(true)}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
                title="Spaced Repetition Flashcards"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">Cards</span>
              </button>

              <button
                onClick={() => setShowExamQuiz(true)}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
                title="Practice Exam Quiz"
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Quiz</span>
              </button>

              <button
                onClick={handleExportBundle}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg font-medium transition hover:bg-white/[0.06]"
                title="Share Study Bundle (.kaistu)"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden xl:inline">Export</span>
              </button>
            </div>

            {/* AI Web Launcher Hub Trigger */}
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying "${item.title}" in ${subject.name}. What are the foundational principles, key definitions, and high-yield exam takeaways from this material?`
                )
              }
              className="flex items-center gap-1.5 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl font-semibold transition shadow-sm"
              title="Open AI Web Launchers (Gemini, ChatGPT, Claude)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Web Hub</span>
            </button>
          </div>

          {/* Active AI Document Tutor (RAG) Trigger (Visible across all devices) */}
          <button
            onClick={() => setIsDocChatOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1.5 sm:px-2.5 rounded-xl font-bold transition shadow-sm shrink-0 ${
              isDocChatOpen
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)] ring-1 ring-purple-400/50'
                : 'bg-gradient-to-r from-purple-950/60 to-pink-950/40 hover:from-purple-900/80 hover:to-pink-900/60 text-purple-200 border border-purple-500/40 hover:border-purple-500/70 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
            }`}
            title="Ask AI questions about this document with page citations"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">Ask AI</span>
          </button>

          {/* Mobile Priority+ Overflow Button */}
          <button
            onClick={() => setIsMobileActionsOpen(true)}
            className="lg:hidden flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-[#0e121a] border border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.08] transition shadow-sm shrink-0"
            title="More study tools & options"
          >
            <MoreHorizontal className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Close / Exit Workstation Button (Shown on desktop/tablet, hidden on mobile since back button is on the left) */}
          <button
            onClick={onBack}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition shrink-0 ml-0.5"
            title="Close material and return to Dashboard (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      {isMobile ? (
        /* Mobile Layout: 100% full-screen responsive tab */
        <div className="flex-1 min-h-0 overflow-hidden relative w-full">
          {mobileTab === 'material' ? (
            <div className="h-full w-full overflow-hidden p-0.5">
              {renderItemViewer(item)}
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden p-0.5">
              {splitSecondaryNote && renderItemViewer(splitSecondaryNote, true)}
            </div>
          )}
        </div>
      ) : (
        /* Desktop / Laptop Layout: Side-by-Side Zero-Waste Split */
        <div
          ref={containerRef}
          className="flex flex-1 min-h-0 overflow-hidden relative w-full"
        >
          {/* Primary Viewer Pane */}
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
              title="Drag left or right to adjust split ratio"
            >
              <div className="w-1.5 h-16 rounded-full bg-slate-700 group-hover:bg-indigo-400 flex items-center justify-center transition-colors shadow-md">
                <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
            </div>
          )}

          {/* Secondary Split Viewer Pane (Notes) */}
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
                    {`Notes: ${splitSecondaryNote?.title || 'Lecture Notes'}`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {100 - splitPercent}%
                  </span>
                  <button
                    onClick={() => setSplitMode('none')}
                    className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Close Split Notes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Split Content Pane */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {splitSecondaryNote && renderItemViewer(splitSecondaryNote, true)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Material Quick Switcher Bar */}
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

      {/* Mobile Action Bottom Sheet (Priority+ Overflow Pattern) */}
      {isMobileActionsOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileActionsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Slide-up Container */}
          <div className="relative bg-[#0c0f17] border-t border-purple-500/30 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
              <div className="min-w-0 pr-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {getItemIcon(item.type)}
                  <span className="truncate">{item.title}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Study Tools & Quick Actions</p>
              </div>
              <button
                onClick={() => setIsMobileActionsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Items List */}
            <div className="space-y-2 mb-5">
              {/* Spaced Repetition Flashcards */}
              <button
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setShowFlashcards(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-left transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Spaced Repetition Flashcards</h4>
                    <p className="text-[10px] text-slate-400">Active recall study deck for this subject</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {/* Practice Exam Quiz */}
              <button
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setShowExamQuiz(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-left transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Exam Simulator Quiz</h4>
                    <p className="text-[10px] text-slate-400">Timed multiple choice revision test</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {/* External AI Web Launchers */}
              <button
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  onOpenAiAssist(
                    `I am studying "${item.title}" in ${subject.name}. What are the foundational principles, key definitions, and high-yield exam takeaways from this material?`
                  );
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-left transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">AI Web Launcher Hub</h4>
                    <p className="text-[10px] text-slate-400">Deep study prompts in Gemini, ChatGPT, Claude</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {/* Study Bundle Export */}
              <button
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  handleExportBundle();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-left transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Export Study Bundle</h4>
                    <p className="text-[10px] text-slate-400">Download .kaistu offline backup package</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            </div>

            {/* Embedded Ambient Soundscape Section */}
            <div className="mb-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                <span>Focus Soundscapes</span>
              </div>
              <AmbientPlayer compact={false} />
            </div>

            {/* Material Management: Edit & Delete */}
            <div className="pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-2">
              {onEditItem && (
                <button
                  onClick={() => {
                    setIsMobileActionsOpen(false);
                    onEditItem(item);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition"
                >
                  <Pencil className="w-4 h-4 text-indigo-400" />
                  <span>Edit Material</span>
                </button>
              )}
              {onDeleteItem && (
                <button
                  onClick={() => {
                    setIsMobileActionsOpen(false);
                    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                      onDeleteItem(item.id);
                      onBack();
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
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
          item={item}
          onJumpToPage={handleJumpToPage}
          onClose={() => setShowExamQuiz(false)}
        />
      )}

      {/* Active AI Document Chat Assistant Drawer (RAG) */}
      <DocumentChatDrawer
        item={item}
        isOpen={isDocChatOpen}
        onClose={() => {
          setIsDocChatOpen(false);
          setDocChatInitialPrompt(undefined);
        }}
        onJumpToPage={handleJumpToPage}
        initialPrompt={docChatInitialPrompt}
      />
    </div>
  );
};
