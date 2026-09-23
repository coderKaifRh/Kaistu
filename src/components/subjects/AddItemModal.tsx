import React, { useState, useEffect } from 'react';
import type { StudyItem, ContentType } from '../../types';
import { StorageService } from '../../services/storage';
import { extractYouTubeId } from '../viewers/YouTubeViewer';
import {
  X,
  FileText,
  Video,
  Edit3,
  Presentation,
  UploadCloud,
  FileCheck,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  folderId?: string | null;
  folderName?: string;
  onItemAdded: (item: StudyItem) => void;
  initialItem?: StudyItem | null;
  onDeleteItem?: (id: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  folderId,
  folderName,
  onItemAdded,
  initialItem,
  onDeleteItem,
}) => {
  const isEditing = Boolean(initialItem);
  const [selectedType, setSelectedType] = useState<ContentType>(initialItem?.type || 'pdf');
  const [title, setTitle] = useState(initialItem?.title || '');
  const [youtubeUrl, setYoutubeUrl] = useState(initialItem?.youtubeUrl || '');
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState(initialItem?.tags?.join(', ') || '');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setSelectedType(initialItem.type);
      setTitle(initialItem.title);
      setYoutubeUrl(initialItem.youtubeUrl || '');
      setTagsInput(initialItem.tags?.join(', ') || '');
      setFile(null);
    } else {
      setSelectedType('pdf');
      setTitle('');
      setYoutubeUrl('');
      setTagsInput('');
      setFile(null);
    }
  }, [initialItem, isOpen]);

  const processSelectedFile = (selected: File) => {
    setFile(selected);
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (ext === 'ppt' || ext === 'pps') {
      setSelectedType('ppt');
    } else if (ext === 'pptx' || ext === 'ppsx') {
      setSelectedType('pptx');
    } else if (ext === 'pdf') {
      setSelectedType('pdf');
    } else if (ext === 'docx' || ext === 'doc') {
      setSelectedType('docx');
    }
    if (!title) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsProcessing(true);
    try {
      const itemId = initialItem?.id || 'item-' + Date.now();
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let detectedType = selectedType;
      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'ppt' || ext === 'pps') {
          detectedType = 'ppt';
        } else if (ext === 'pptx' || ext === 'ppsx') {
          detectedType = 'pptx';
        }
      }

      let itemToSave: StudyItem = {
        ...(initialItem || {}),
        id: itemId,
        subjectId,
        folderId: initialItem ? initialItem.folderId : (folderId || null),
        title: title.trim(),
        type: detectedType,
        tags,
        createdAt: initialItem?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (selectedType === 'youtube') {
        const vidId = extractYouTubeId(youtubeUrl);
        itemToSave.youtubeUrl = youtubeUrl;
        itemToSave.youtubeVideoId = vidId || undefined;
      } else if (selectedType === 'note') {
        if (!itemToSave.noteContent) {
          itemToSave.noteContent = `# ${title.trim()}\n\nStart writing your detailed notes here...`;
        }
      } else if (file) {
        const storageKey = `${itemId}_${file.name}`;
        await StorageService.storeFileBlob(storageKey, file);

        itemToSave.fileName = file.name;
        itemToSave.fileSize = file.size;
        itemToSave.fileMimeType = file.type;
        itemToSave.fileStorageKey = storageKey;
      }

      await StorageService.saveItem(itemToSave);
      onItemAdded(itemToSave);
      onClose();
    } catch (err) {
      console.error('Failed to save study item:', err);
      alert('Error saving material. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = () => {
    if (!initialItem || !onDeleteItem) return;
    if (confirm(`Are you sure you want to delete "${initialItem.title}"?`)) {
      onDeleteItem(initialItem.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#080a0f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {isEditing ? 'Edit Study Material' : 'Add Study Material'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEditing
                  ? 'Update title, links, tags, or file'
                  : folderName
                  ? `Adding to: ${folderName}`
                  : 'PowerPoint (PPT / PPTX), PDF, Word, YouTube, or Markdown Note'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 p-2.5 sm:p-3.5 bg-[#080a0f] border-b border-white/[0.06] text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedType('pdf');
              setFile(null);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all min-h-[46px] ${
              selectedType === 'pdf'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] truncate w-full text-center">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('note');
              setFile(null);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all min-h-[46px] ${
              selectedType === 'note'
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] truncate w-full text-center">Note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('youtube');
              setFile(null);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all min-h-[46px] ${
              selectedType === 'youtube'
                ? 'bg-red-500/15 border-red-500/40 text-red-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] truncate w-full text-center">YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('docx');
              setFile(null);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all min-h-[46px] ${
              selectedType === 'docx'
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] truncate w-full text-center">Word</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('pptx');
              setFile(null);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all min-h-[46px] ${
              selectedType === 'pptx'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span className="text-[10px] sm:text-[11px] truncate w-full text-center">
              <span className="sm:hidden">Slides</span>
              <span className="hidden sm:inline">PPT / Slides</span>
            </span>
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Material Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 Lecture, Thermodynamics Derivations..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          {/* Type Specific Inputs */}
          {selectedType === 'youtube' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                YouTube Video URL *
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (!title) setTitle('YouTube Lecture');
                }}
                required
                className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Plays seamlessly inside KaiStu with full zero-waste theater split and notes.
              </p>
            </div>
          )}

          {(selectedType === 'pdf' || selectedType === 'docx' || selectedType === 'pptx' || selectedType === 'ppt') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isEditing && !file
                    ? `Current ${selectedType === 'pptx' || selectedType === 'ppt' ? 'PPT / Slides' : selectedType.toUpperCase()} File`
                    : `Upload ${selectedType === 'pptx' || selectedType === 'ppt' ? 'PPT / Slides' : selectedType.toUpperCase()} File *`}
                </label>
                {isEditing && initialItem?.fileName && !file && (
                  <span className="text-[10px] text-indigo-400 font-mono">
                    Keep current or choose new
                  </span>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                className="relative border border-dashed border-white/15 hover:border-indigo-500/60 rounded-xl p-4 text-center cursor-pointer transition bg-[#07090e]/60 group"
              >
                <input
                  type="file"
                  accept={
                    selectedType === 'pptx' || selectedType === 'ppt'
                      ? '.ppt,.pptx,.pps,.ppsx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/powerpoint,application/x-mspowerpoint'
                      : selectedType === 'docx'
                      ? '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'
                      : '.pdf,.ppt,.pptx,.pps,.ppsx,.docx,.doc,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  }
                  onChange={handleFileChange}
                  required={!isEditing && !file}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-300">
                    <FileCheck className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-semibold truncate max-w-xs">{file.name}</span>
                    <span className="text-[11px] text-slate-400">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                ) : isEditing && initialItem?.fileName ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <FileCheck className="w-5 h-5" />
                    <span className="text-xs font-semibold truncate max-w-xs">{initialItem.fileName}</span>
                    <span className="text-[10px] text-slate-500">(Click to replace)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300 group-hover:border-indigo-500/40 group-hover:text-indigo-400 transition">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      Click to choose or drag & drop {selectedType === 'pptx' || selectedType === 'ppt' ? 'PowerPoint (.ppt, .pptx)' : selectedType.toUpperCase()}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {selectedType === 'pptx' || selectedType === 'ppt'
                        ? 'Slides & speaker notes indexed for AI Tutor study'
                        : 'Stored safely on local disk'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Tags / Keywords (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Midterm, High-Yield, Formula, Review"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
            {isEditing && onDeleteItem ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                {isProcessing ? (
                  'Saving...'
                ) : isEditing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  'Add Material'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
