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
} from 'lucide-react';

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
}) => {
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);

  // If user has subjects, feature the active one; otherwise provide the featured flagship showcase
  const featuredSubject: Subject =
    subjects.length > 0 && subjects[activeCourseIndex]
      ? subjects[activeCourseIndex]
      : {
          id: 'flagship-ph-course',
          name: 'AI-Driven Full Stack Web Engineering',
          code: 'HERO-2026',
          description:
            'Welcome to Programming Hero! Start your journey with AI-Driven Full Stack Engineering, where you will learn modern web development from the fundamentals to real-world full-stack projects using JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB, authentication, deployment, and AI-assisted development workflows. Build job-relevant skills with guided support until you are ready for an internship or full-time developer role.',
          icon: 'Code2',
          color: 'from-purple-600 via-pink-600 to-indigo-600',
          createdAt: Date.now(),
        };

  // Find first material in featured subject for "Let's Code" button
  const featuredItems = items.filter((i) => i.subjectId === featuredSubject.id);
  const firstFeaturedItem = featuredItems[0];

  const handleLetsCode = () => {
    if (firstFeaturedItem) {
      onOpenItem(firstFeaturedItem);
    } else {
      onSelectSubject(featuredSubject.id);
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07060e] text-slate-100 hero-iso-grid relative select-none">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating 3D Geometric Crystal Prism (matches top-right in uploaded image) */}
      <div className="absolute top-24 right-6 sm:right-16 lg:right-28 pointer-events-none z-10 hidden sm:block animate-float-prism">
        <svg
          width="110"
          height="110"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_35px_rgba(217,70,239,0.7)]"
        >
          {/* Main faceted crystal */}
          <polygon points="50,5 95,50 50,95 5,50" fill="url(#prismGrad1)" opacity="0.95" />
          <polygon points="50,5 95,50 50,45" fill="url(#prismGrad2)" opacity="0.9" />
          <polygon points="5,50 50,5 50,45" fill="url(#prismGrad3)" opacity="0.85" />
          <polygon points="5,50 50,95 50,45" fill="url(#prismGrad4)" opacity="0.9" />
          <polygon points="95,50 50,95 50,45" fill="url(#prismGrad5)" opacity="0.95" />

          {/* Highlight edges */}
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

      {/* Top Navbar */}
      <nav className="w-full px-6 sm:px-12 py-4 flex items-center justify-between z-20 border-b border-white/[0.06] bg-[#07060e]/80 backdrop-blur-xl">
        {/* Brand Logo (Programming Hero style with purple polygon) */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveCourseIndex(0)}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white shadow-[0_0_22px_rgba(168,85,247,0.55)] ring-1 ring-white/30">
            <span className="font-black text-sm tracking-tighter">P</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black text-white tracking-tight flex items-center gap-1">
              Programming
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-1.5 py-0.2 rounded border border-purple-500/30 ml-1">
                HERO
              </span>
            </div>
            <div className="text-[11px] font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text tracking-wider">
              Hero • KaiStu
            </div>
          </div>
        </div>

        {/* Center/Right Nav Links */}
        <div className="flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveCourseIndex(0)}
            className="text-white hover:text-purple-400 transition-colors hidden sm:block"
          >
            Home
          </button>
          <a
            href="#all-courses"
            className="text-slate-300 hover:text-white transition-colors hidden sm:block"
          >
            Products
          </a>
          <button
            onClick={() =>
              alert(
                'KaiStu • Powered by Programming Hero UI style. Built for 100% offline study, videos, notes, PDFs, and continuous revision!'
              )
            }
            className="text-slate-300 hover:text-white transition-colors hidden sm:block"
          >
            About
          </button>
          <button
            onClick={onOpenAiHub}
            className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Success</span>
          </button>

          <button
            onClick={onAddSubject}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Course</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 md:px-12 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Centered Heading: "Our Courses_" */}
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

              {/* Video / Banner Mockup */}
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1333] via-[#2a174a] to-[#120924] border border-white/[0.1] mb-5 flex flex-col justify-between p-4 shadow-inner">
                {/* Banner top bar */}
                <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-pink-300 uppercase">
                  <span className="bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-md">
                    AI-DRIVEN FULL STACK
                  </span>
                  <span className="text-purple-300 font-bold">Programming Hero</span>
                </div>

                {/* Interactive Play Button (Pink circle with white triangle from image) */}
                <div
                  onClick={handleLetsCode}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 via-pink-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(236,72,153,0.7)] mx-auto my-auto group-hover:scale-115 transition-transform duration-200 cursor-pointer ring-4 ring-pink-500/20"
                  title="Play Course Preview"
                >
                  <Play className="w-6 h-6 fill-white ml-1" />
                </div>

                {/* Tech stacks icons at bottom of banner */}
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono text-[10px] text-emerald-300">Live Course</span>
                  </div>
                  <span className="text-slate-400 font-mono">React • Next • AI</span>
                </div>
              </div>

              {/* Card Bottom Details */}
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                  {featuredSubject.name}
                </h3>

                <button
                  onClick={handleLetsCode}
                  className="w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-[0_0_25px_rgba(147,51,234,0.45)] transition-all flex items-center gap-2"
                >
                  <span>Let's Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Course Headline & Description */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-300 bg-clip-text">
              Build The Future with AI Driven Full Stack Web Engineering
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-normal">
              {featuredSubject.description ||
                'Welcome to Programming Hero! Start your journey with AI-Driven Full Stack Engineering, where you will learn modern web development from the fundamentals to real-world full-stack projects using JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB, authentication, deployment, and AI-assisted development workflows. Build job-relevant skills with guided support until you are ready for an internship or full-time developer role.'}
            </p>

            {/* CTA Buttons (Explore & Success from image) */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => onSelectSubject(featuredSubject.id)}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all flex items-center gap-2 hover:scale-105"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenAiHub}
                className="px-6 py-3 rounded-xl border border-purple-500/40 bg-purple-950/25 hover:bg-purple-900/40 text-purple-200 hover:text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
              >
                Success
              </button>
            </div>
          </div>
        </div>

        {/* Section Divider & "All Courses" Grid */}
        <div id="all-courses" className="pt-10 border-t border-white/[0.08] relative z-10">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Explore All Courses & Subjects</span>
                <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md">
                  {subjects.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Each course features chapters, nested folders, PDFs, Word docs, slides, and video lectures.
              </p>
            </div>

            <button
              onClick={onAddSubject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>

          {/* Courses Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub, idx) => {
              const subItems = items.filter((i) => i.subjectId === sub.id);
              const subFolders = folders.filter((f) => f.subjectId === sub.id);
              const isCurrentFeatured = subjects[activeCourseIndex]?.id === sub.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    setActiveCourseIndex(idx);
                    onSelectSubject(sub.id);
                  }}
                  className={`group rounded-3xl p-5 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                    isCurrentFeatured
                      ? 'bg-gradient-to-b from-[#21113f] to-[#120824] border-2 border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.3)]'
                      : 'bg-gradient-to-b from-[#130b24] to-[#0a0514] border border-white/[0.08] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.18)]'
                  }`}
                >
                  {/* Subtle top glossy highlight */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

                  <div>
                    {/* Header: Icon & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white shadow-md shadow-purple-900/40 group-hover:scale-105 transition-transform`}
                        >
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
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition"
                          title="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 mb-2">
                      {sub.name}
                    </h3>

                    {/* Course Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {sub.description || 'Access chapters, video lectures, PDFs, and notes.'}
                    </p>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-4">
                      <span className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                        <Folder className="w-3 h-3 text-purple-400" />
                        <span>{subFolders.length} chapters</span>
                      </span>
                      <span className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3 text-pink-400" />
                        <span>{subItems.length} materials</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Button */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold">
                    <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                      <span>Explore Course</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* "+ Add New Course" Card */}
            <div
              onClick={onAddSubject}
              className="rounded-3xl border border-dashed border-purple-500/30 hover:border-purple-500/60 bg-[#0d061c]/40 hover:bg-[#150a2b]/60 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[220px] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">Create Custom Course</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Add computer science, physics, web development, or any exam subject with nested chapters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
