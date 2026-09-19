import React, { useState } from 'react';
import type { Subject, StudyItem, ContentType } from '../../types';
import {
  FileText,
  Video,
  Edit3,
  Presentation,
  Plus,
  Search,
  Trash2,
  Clock,
  Sparkles,
  BookOpen,
  Menu,
} from 'lucide-react';

interface SubjectDetailViewProps {
  subject: Subject;
  items: StudyItem[];
  onBack: () => void;
  onSelectItem: (item: StudyItem) => void;
  onAddNewMaterial: () => void;
  onDeleteItem: (id: string) => void;
  onOpenAiAssist: (contextPrompt: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  items,
  onBack: _onBack,
  onSelectItem,
  onAddNewMaterial,
  onDeleteItem,
  onOpenAiAssist,
  onToggleMobileSidebar,
}) => {
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getItemIcon = (type: ContentType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'youtube':
        return <Video className="w-5 h-5 text-red-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'pptx':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'note':
        return <Edit3 className="w-5 h-5 text-indigo-400" />;
    }
  };

  const getTypeBadge = (type: ContentType) => {
    switch (type) {
      case 'pdf':
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            PDF
          </span>
        );
      case 'youtube':
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            YouTube
          </span>
        );
      case 'docx':
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Word Doc
          </span>
        );
      case 'pptx':
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            PPTX Slide
          </span>
        );
      case 'note':
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Note
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07090e] p-5 sm:p-7 md:p-9">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="p-2.5 rounded-xl bg-[#0e121a] border border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.08] transition shadow-sm md:hidden flex items-center justify-center shrink-0"
              title="Open Subjects Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                {subject.code || 'COURSE'}
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs text-slate-400 font-medium">
                {items.length} {items.length === 1 ? 'material' : 'materials'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              {subject.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() =>
              onOpenAiAssist(
                `Can you create a structured revision roadmap and key concepts syllabus for "${subject.name}"? List the high-yield topics I must master for exams.`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-white/[0.08] text-indigo-300 border border-indigo-500/25 text-xs font-semibold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">AI Study Plan</span>
            <span className="xs:hidden">AI Plan</span>
          </button>

          <button
            onClick={onAddNewMaterial}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Subject Description Banner */}
      {subject.description && (
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06] mb-7 text-xs sm:text-sm text-slate-300 flex items-start gap-3 shadow-sm">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{subject.description}</p>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 mb-7">
        {/* Search */}
        <div className="w-full sm:w-80 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lectures, notes, PDFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/[0.08] rounded-xl pl-9 pr-14 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded pointer-events-none">
            ⌘K
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-white/[0.06] p-1 rounded-xl overflow-x-auto w-full sm:w-auto pb-1 sm:pb-1">
          {(['all', 'pdf', 'youtube', 'note', 'docx', 'pptx'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                filterType === type
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Study Materials Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/20 my-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <Plus className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight">No study materials found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            {searchQuery
              ? 'No items matched your search query. Try searching for different keywords.'
              : 'Add your PDFs, Word files, lecture videos, or notes to build your subject library!'}
          </p>
          <button
            onClick={onAddNewMaterial}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
          >
            Add First Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="glass-card rounded-2xl p-4.5 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/[0.08] group-hover:border-indigo-500/40 transition">
                      {getItemIcon(item.type)}
                    </div>
                    {getTypeBadge(item.type)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${item.title}"?`)) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg opacity-0 group-hover:opacity-100 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug tracking-tight">
                  {item.title}
                </h3>

                {item.type === 'youtube' && item.bookmarks && item.bookmarks.length > 0 && (
                  <p className="text-[10px] text-amber-300/90 mt-2 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded inline-block">
                    🔖 {item.bookmarks.length} study moments saved
                  </p>
                )}

                {item.fileName && (
                  <p className="text-[10px] text-slate-400 mt-2 truncate font-mono">
                    {item.fileName}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-3.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform font-semibold text-xs flex items-center gap-1">
                  Study Now <span>→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
