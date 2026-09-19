import React, { useState } from 'react';
import type { Subject, StudyItem, StudyFolder } from '../../types';
import {
  Sparkles,
  Play,
  Plus,
  BookOpen,
  Brain,
  Folder,
  ArrowRight,
  Pencil,
  Trash2,
  Layers,
  Code2,
  Atom,
  Sigma,
  Globe2,
  Timer,
  Download,
  GraduationCap,
  Video,
  FileText,
  Search,
} from 'lucide-react';
import { PomodoroBar } from '../pomodoro/PomodoroBar';

interface CoursesHeroViewProps {
  subjects: Subject[];
  items: StudyItem[];
  folders: StudyFolder[];
  onSelectSubject: (id: string) => void;
  onOpenItem: (item: StudyItem) => void;
  onAddSubject: () => void;
  onEditSubject?: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onOpenAiHub: () => void;
  onExportData?: () => void;
}

export const CoursesHeroView: React.FC<CoursesHeroViewProps> = ({
  subjects,
  items,
  folders,
  onSelectSubject,
  onOpenItem,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onOpenAiHub,
  onExportData,
}) => {
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusSessionOpen, setIsFocusSessionOpen] = useState(false);

  // User's active featured subject from their real subjects
  const hasSubjects = subjects.length > 0;
  const safeIndex = activeCourseIndex < subjects.length ? activeCourseIndex : 0;
  const featuredSubject: Subject | null = hasSubjects ? subjects[safeIndex] : null;

  // Real items and folders for the featured subject
  const featuredSubjectItems = featuredSubject
    ? items.filter((i) => i.subjectId === featuredSubject.id)
    : [];
  const featuredSubjectFolders = featuredSubject
    ? folders.filter((f) => f.subjectId === featuredSubject.id)
    : [];

  // Recent / primary item to launch directly from the hero play button
  const firstVideo = featuredSubjectItems.find((i) => i.type === 'youtube');
  const firstPdf = featuredSubjectItems.find((i) => i.type === 'pdf');
  const primaryItem = firstVideo || firstPdf || featuredSubjectItems[0];

  const handleHeroAction = () => {
    if (primaryItem) {
      onOpenItem(primaryItem);
    } else if (featuredSubject) {
      onSelectSubject(featuredSubject.id);
    } else {
      onAddSubject();
    }
  };

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain':
        return <Brain className="w-5 h-5" />;
      case 'Atom':
        return <Atom className="w-5 h-5" />;
      case 'Sigma':
        return <Sigma className="w-5 h-5" />;
      case 'Code2':
        return <Code2 className="w-5 h-5" />;
      case 'Globe2':
        return <Globe2 className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07060e] text-slate-100 hero-iso-grid relative select-none">
      {/* Ambient glowing atmosphere background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating 3D Geometric Crystal Prism (matches exact aesthetic from uploaded image) */}
      <div className="absolute top-20 right-6 sm:right-16 lg:right-24 pointer-events-none z-10 hidden sm:block animate-float-prism">
        <svg
          width="110"
          height="110"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_35px_rgba(217,70,239,0.7)]"
        >
          <polygon points="50,5 95,50 50,95 5,50" fill="url(#prismGrad1)" opacity="0.95" />
          <polygon points="50,5 95,50 50,45" fill="url(#prismGrad2)" opacity="0.9" />
          <polygon points="5,50 50,5 50,45" fill="url(#prismGrad3)" opacity="0.85" />
          <polygon points="5,50 50,95 50,45" fill="url(#prismGrad4)" opacity="0.9" />
          <polygon points="95,50 50,95 50,45" fill="url(#prismGrad5)" opacity="0.95" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />

          <defs>
            <linearGradient id="prismGrad1" x1="5" y1="5" x2="95" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="0.5" stopColor="#ec4899" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="prismGrad2" x1="50" y1="5" x2="95" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f472b6" />
              <stop offset="1" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="prismGrad3" x1="5" y1="5" x2="50" y2="45" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="prismGrad4" x1="5" y1="50" x2="50" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9333ea" />
              <stop offset="1" stopColor="#db2777" />
            </linearGradient>
            <linearGradient id="prismGrad5" x1="95" y1="50" x2="50" y2="95" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f43f5e" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Navbar in Glowing Dark Theme */}
      <nav className="w-full px-4 sm:px-10 py-3.5 flex items-center justify-between z-30 border-b border-white/[0.07] bg-[#07060e]/85 backdrop-blur-xl sticky top-0">
        {/* Brand Logo with Glowing Purple Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-1 ring-white/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>KaiStu</span>
              <span className="text-[9px] font-bold tracking-widest bg-purple-500/20 text-purple-300 font-mono px-1.5 py-0.5 rounded border border-purple-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-purple-300/70 font-medium tracking-wide">Study Companion</p>
          </div>
        </div>

        {/* Center / Right Links */}
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold">
          <a
            href="#all-subjects"
            className="text-white hover:text-purple-300 transition-colors hidden sm:block"
          >
            Subjects
          </a>

          {/* Focus Timer Trigger */}
          <button
            onClick={() => setIsFocusSessionOpen((prev) => !prev)}
            className={`transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              isFocusSessionOpen
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Focus Session (Pomodoro)"
          >
            <Timer className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">Focus Session</span>
          </button>

          {/* AI Hub */}
          <button
            onClick={onOpenAiHub}
            className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden xs:inline">AI Hub</span>
          </button>

          {/* Backup / Export */}
          {onExportData && (
            <button
              onClick={onExportData}
              className="text-slate-400 hover:text-slate-200 transition-colors hidden lg:flex items-center gap-1"
              title="Backup all study data as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>
          )}

          {/* Primary Action: + New Subject Button (matching top right CTA) */}
          <button
            onClick={onAddSubject}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
        </div>
      </nav>

      {/* Embedded Collapsible Focus Session Panel */}
      {isFocusSessionOpen && (
        <div className="w-full bg-[#0c0818]/95 border-b border-purple-900/40 p-4 relative z-20 animate-in slide-in-from-top-2 duration-200 shadow-2xl backdrop-blur-md">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-pink-400" />
              <span>KaiStu Pomodoro Focus Timer</span>
            </div>
            <div className="w-full">
              <PomodoroBar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 md:px-12 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Section Heading: "Our Courses_" / "My Subjects_" */}
        <div className="text-center mb-10 sm:mb-14 relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight inline-flex items-center">
            Our Courses<span className="text-purple-400 animate-pulse">_</span>
          </h1>
          {/* Glowing underline accent bar */}
          <div className="w-20 h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 rounded-full mx-auto mt-3 shadow-[0_0_20px_rgba(217,70,239,0.6)]" />
        </div>

        {/* Featured Hero Showcase (2-Column Grid as in Image) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 relative z-10">
          {/* Left Column: Featured Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-b from-[#1b0e35] via-[#120824] to-[#0a0414] border border-purple-500/35 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(168,85,247,0.22)] flex flex-col justify-between relative overflow-hidden group">
              {/* Card top glossy edge reflection */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent" />

              {/* Preview Banner Mockup */}
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1333] via-[#2a174a] to-[#120924] border border-white/[0.1] mb-5 flex flex-col justify-between p-4 shadow-inner">
                {/* Banner top bar */}
                <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-pink-300 uppercase">
                  <span className="bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-md">
                    {featuredSubject ? featuredSubject.code || 'COURSE' : 'START NOW'}
                  </span>
                  <span className="text-purple-300 font-bold">KaiStu Studio</span>
                </div>

                {/* Center Action Button (Pink circular play button as in the image) */}
                <div
                  onClick={handleHeroAction}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 via-pink-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(236,72,153,0.7)] mx-auto my-auto group-hover:scale-115 transition-transform duration-200 cursor-pointer ring-4 ring-pink-500/20"
                  title={primaryItem ? `Open "${primaryItem.title}"` : 'Explore Subject'}
                >
                  {primaryItem?.type === 'youtube' ? (
                    <Play className="w-6 h-6 fill-white ml-1" />
                  ) : primaryItem?.type === 'pdf' ? (
                    <FileText className="w-6 h-6" />
                  ) : (
                    <BookOpen className="w-6 h-6" />
                  )}
                </div>

                {/* Bottom stats of banner */}
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono text-[10px] text-emerald-300">
                      {featuredSubjectItems.length} Materials
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono">
                    {featuredSubjectFolders.length} Chapters
                  </span>
                </div>
              </div>

              {/* Card Bottom Details */}
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug truncate">
                  {featuredSubject ? featuredSubject.name : 'Welcome to KaiStu'}
                </h3>

                {primaryItem && (
                  <p className="text-xs text-purple-300/80 truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span>Up next: {primaryItem.title}</span>
                  </p>
                )}

                <button
                  onClick={handleHeroAction}
                  className="w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-[0_0_25px_rgba(147,51,234,0.45)] transition-all flex items-center gap-2"
                >
                  <span>{primaryItem ? "Let's Study" : hasSubjects ? 'Explore Subject' : '+ Create Subject'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Course Headline & Description */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-300 bg-clip-text">
              {featuredSubject ? featuredSubject.name : 'Organize Every Subject & Lecture with KaiStu'}
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-normal">
              {featuredSubject?.description ||
                'Organize all your lecture videos with timestamped notes, continuous-scroll PDFs, PowerPoint slides, and flashcards in one synchronized offline workspace. Study with total focus and zero server cost.'}
            </p>

            {/* Quick Metrics Bar */}
            {hasSubjects && featuredSubject && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-purple-200">
                <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-purple-400" />
                  <span>{featuredSubjectFolders.length} Chapter Folders</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  <span>{featuredSubjectItems.length} Study Materials</span>
                </div>
                {firstVideo && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Video Lectures Ready</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons ("Explore" & "AI Assistant" / "Focus") */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => {
                  if (featuredSubject) {
                    onSelectSubject(featuredSubject.id);
                  } else {
                    onAddSubject();
                  }
                }}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all flex items-center gap-2"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAiHub}
                className="px-6 sm:px-8 py-3 rounded-2xl border border-purple-500/50 hover:bg-purple-500/15 text-purple-300 hover:text-white font-bold text-sm sm:text-base transition-all shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>AI Assistant</span>
              </button>
            </div>

            {/* Course Selector Tabs (if user has multiple subjects) */}
            {subjects.length > 1 && (
              <div className="pt-4 border-t border-white/[0.08]">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Switch Featured Subject:
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {subjects.map((sub, idx) => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveCourseIndex(idx)}
                      className={`text-xs px-3 py-1.5 rounded-xl transition-all font-semibold flex items-center gap-1.5 ${
                        safeIndex === idx
                          ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] ring-1 ring-purple-400/50'
                          : 'bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.1] border border-white/[0.05]'
                      }`}
                    >
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* All Subjects / Courses Catalog Grid */}
        {/* ---------------------------------------------------- */}
        <div id="all-subjects" className="pt-10 border-t border-purple-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>All Subjects & Courses</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {subjects.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Access your nested chapter folders, continuous scroll PDFs, and video lectures.
              </p>
            </div>

            {/* Search Input */}
            {subjects.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subjects..."
                  className="w-full pl-9 pr-4 py-2 bg-[#0e0a1f] border border-purple-500/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition"
                />
              </div>
            )}
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((sub) => {
              const subFolders = folders.filter((f) => f.subjectId === sub.id);
              const subItems = items.filter((i) => i.subjectId === sub.id);

              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.id)}
                  className="bg-[#120824]/70 hover:bg-[#180d30]/90 border border-purple-500/20 hover:border-purple-500/50 rounded-2xl p-5 transition-all duration-200 shadow-md hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon + Code + Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {getSubjectIcon(sub.icon)}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
                            {sub.code || 'COURSE'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {onEditSubject && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSubject(sub);
                            }}
                            className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-white/[0.08] rounded-lg transition"
                            title="Edit course"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${sub.name}"?`)) {
                              onDeleteSubject(sub.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-purple-200 transition line-clamp-1">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description || 'No description provided. Click to open chapter folders and materials.'}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-purple-400" />
                        <span>{subFolders.length} Chapters</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-pink-400" />
                        <span>{subItems.length} Items</span>
                      </span>
                    </div>

                    <div className="text-purple-400 group-hover:text-purple-300 font-bold flex items-center gap-1 text-xs">
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* + Add New Subject Tile */}
            <div
              onClick={onAddSubject}
              className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/[0.03] hover:bg-purple-500/[0.08] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[190px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition">
                + Create Custom Subject
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Add a new course or subject with custom code, icon & description.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
