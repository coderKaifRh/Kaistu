import React, { useState } from 'react';
import type { Subject, StudyItem, StudyFolder, ContentType } from '../../types';
import { FolderModal } from './FolderModal';
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
  Pencil,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface SubjectDetailViewProps {
  subject: Subject;
  items: StudyItem[];
  folders: StudyFolder[];
  onBack: () => void;
  onSelectItem: (item: StudyItem) => void;
  onAddNewMaterial: (folderId?: string | null) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: StudyItem) => void;
  onSaveFolder: (folder: StudyFolder) => Promise<void> | void;
  onDeleteFolder: (id: string) => Promise<void> | void;
  onOpenAiAssist: (contextPrompt: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  items,
  folders,
  onBack: _onBack,
  onSelectItem,
  onAddNewMaterial,
  onDeleteItem,
  onEditItem,
  onSaveFolder,
  onDeleteFolder,
  onOpenAiAssist,
  onToggleMobileSidebar,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<StudyFolder | null>(null);

  // Current folder object
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;

  // Build breadcrumb path
  const breadcrumbs = React.useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: subject.name }];
    if (!currentFolderId) return crumbs;

    const path: { id: string; name: string }[] = [];
    let curId: string | null | undefined = currentFolderId;
    while (curId) {
      const curFolder = folders.find((f) => f.id === curId);
      if (!curFolder) break;
      path.unshift({ id: curFolder.id, name: curFolder.name });
      curId = curFolder.parentId;
    }
    return [...crumbs, ...path];
  }, [currentFolderId, folders, subject.name]);

  // Navigate up one folder level
  const handleGoBack = () => {
    if (!currentFolderId) return;
    const cur = folders.find((f) => f.id === currentFolderId);
    setCurrentFolderId(cur?.parentId || null);
  };

  // Subfolders in this view
  const currentSubfolders = folders.filter(
    (f) => f.subjectId === subject.id && (f.parentId || null) === (currentFolderId || null)
  );

  const filteredFolders = currentSubfolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Items in this view
  const currentItems = items.filter(
    (item) => item.subjectId === subject.id && (item.folderId || null) === (currentFolderId || null)
  );

  const filteredItems = currentItems.filter((item) => {
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

  const handleSaveModalFolder = async (name: string) => {
    if (editingFolder) {
      await onSaveFolder({
        ...editingFolder,
        name,
        updatedAt: Date.now(),
      });
    } else {
      const newFolder: StudyFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId: subject.id,
        parentId: currentFolderId || null,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await onSaveFolder(newFolder);
    }
    setEditingFolder(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#07090e] p-4 sm:p-6 md:p-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

          {currentFolderId && (
            <button
              onClick={handleGoBack}
              className="p-2.5 rounded-xl bg-[#0e121a] border border-white/[0.12] text-slate-300 hover:text-white hover:bg-white/[0.08] transition shadow-sm flex items-center justify-center shrink-0"
              title="Back to parent folder"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            {/* Breadcrumbs trail */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 mb-1">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                {subject.code || 'COURSE'}
              </span>
              <span className="text-slate-600">•</span>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                    <button
                      onClick={() => setCurrentFolderId(crumb.id)}
                      className={`hover:text-indigo-300 transition-colors font-medium truncate max-w-[140px] sm:max-w-[200px] ${
                        isLast ? 'text-white font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {currentFolder ? (
                <>
                  <FolderOpen className="w-6 h-6 text-indigo-400 shrink-0" />
                  <span>{currentFolder.name}</span>
                </>
              ) : (
                subject.name
              )}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() =>
              onOpenAiAssist(
                `Can you create a structured revision roadmap and key concepts syllabus for "${
                  currentFolder ? `${subject.name} - ${currentFolder.name}` : subject.name
                }"? List the high-yield topics I must master for exams.`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-white/[0.08] text-indigo-300 border border-indigo-500/25 text-xs font-semibold transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">AI Study Plan</span>
            <span className="xs:hidden">AI Plan</span>
          </button>

          <button
            onClick={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.12] text-xs font-semibold transition shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => onAddNewMaterial(currentFolderId)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Subject Description Banner (only at root level if set) */}
      {!currentFolderId && subject.description && (
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06] mb-6 text-xs sm:text-sm text-slate-300 flex items-start gap-3 shadow-sm">
          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{subject.description}</p>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 mb-6">
        {/* Search */}
        <div className="w-full sm:w-80 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search folders, lectures, notes, PDFs..."
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

      {/* Folders Section (Chapters / Subfolders) */}
      {filteredFolders.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentFolderId ? 'Subfolders / Sections' : 'Chapters & Folders'} ({filteredFolders.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredFolders.map((folder) => {
              const subItemsCount = items.filter((i) => i.folderId === folder.id).length;
              const subFoldersCount = folders.filter((f) => f.parentId === folder.id).length;

              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="group bg-[#0e121a]/80 hover:bg-[#141924] border border-white/[0.08] hover:border-indigo-500/40 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                      <Folder className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setIsFolderModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/[0.08] rounded-lg transition"
                        title="Rename folder"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Are you sure you want to delete folder "${folder.name}" and all subfolders/materials inside?`
                            )
                          ) {
                            onDeleteFolder(folder.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {folder.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{subItemsCount} {subItemsCount === 1 ? 'material' : 'materials'}</span>
                      {subFoldersCount > 0 && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>{subFoldersCount} {subFoldersCount === 1 ? 'subfolder' : 'subfolders'}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                    <span>Open Folder</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Study Materials Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {currentFolderId
              ? `Materials in ${currentFolder?.name || 'Folder'}`
              : 'Root Study Materials'}{' '}
            ({filteredItems.length})
          </span>
        </h2>
      </div>

      {/* Study Materials Grid or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/20 my-auto min-h-[220px]">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <Plus className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white tracking-tight">
            {filteredFolders.length > 0 ? 'No materials in this view' : 'No chapters or materials yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
            {searchQuery
              ? 'No items matched your search query. Try searching for different keywords.'
              : currentFolderId
              ? 'Add lecture videos, notes, PDFs, or PPTX slides to this folder, or create nested subfolders!'
              : 'Create Chapter folders or add your study materials directly to build your subject library!'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingFolder(null);
                setIsFolderModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/[0.12] rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create Folder / Chapter</span>
            </button>
            <button
              onClick={() => onAddNewMaterial(currentFolderId)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Material</span>
            </button>
          </div>
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
                  <div className="flex items-center gap-1 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem(item);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-white/[0.08] rounded-lg transition"
                      title="Edit material (rename, change link, update tags)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition"
                      title="Delete material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Create / Rename Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveModalFolder}
        initialName={editingFolder?.name || ''}
        parentFolderName={
          editingFolder
            ? editingFolder.parentId
              ? folders.find((f) => f.id === editingFolder.parentId)?.name
              : undefined
            : currentFolder?.name
        }
        isEditing={Boolean(editingFolder)}
        onDelete={
          editingFolder
            ? () => {
                onDeleteFolder(editingFolder.id);
                setIsFolderModalOpen(false);
                setEditingFolder(null);
              }
            : undefined
        }
      />
    </div>
  );
};
