import React, { useState } from 'react';
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
} from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  onItemAdded: (item: StudyItem) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  onItemAdded,
}) => {
  const [selectedType, setSelectedType] = useState<ContentType>('pdf');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Auto-fill title without extension
        const cleanName = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsProcessing(true);
    try {
      const itemId = 'item-' + Date.now();
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let newItem: StudyItem = {
        id: itemId,
        subjectId,
        title: title.trim(),
        type: selectedType,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (selectedType === 'youtube') {
        const vidId = extractYouTubeId(youtubeUrl);
        newItem.youtubeUrl = youtubeUrl;
        newItem.youtubeVideoId = vidId || undefined;
      } else if (selectedType === 'note') {
        newItem.noteContent = `# ${title.trim()}\n\nStart writing your detailed notes here...`;
      } else if (file) {
        // PDF, DOCX, or PPTX upload
        const storageKey = `${itemId}_${file.name}`;
        await StorageService.storeFileBlob(storageKey, file);

        newItem.fileName = file.name;
        newItem.fileSize = file.size;
        newItem.fileMimeType = file.type;
        newItem.fileStorageKey = storageKey;
      }

      await StorageService.saveItem(newItem);
      onItemAdded(newItem);
      onClose();
    } catch (err) {
      console.error('Failed to add study item:', err);
      alert('Error saving material. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#080a0f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Add Study Material</h2>
              <p className="text-[11px] text-slate-400">PDF, Word, PPTX, YouTube, or Markdown Note</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="grid grid-cols-5 gap-1.5 p-3.5 bg-[#080a0f] border-b border-white/[0.06] text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedType('pdf');
              setFile(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
              selectedType === 'pdf'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[11px]">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('note');
              setFile(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
              selectedType === 'note'
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-[11px]">Note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('youtube');
              setFile(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
              selectedType === 'youtube'
                ? 'bg-red-500/15 border-red-500/40 text-red-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="text-[11px]">YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('docx');
              setFile(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
              selectedType === 'docx'
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[11px]">Word</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType('pptx');
              setFile(null);
            }}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
              selectedType === 'pptx'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span className="text-[11px]">PPTX</span>
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
              placeholder="e.g. Chapter 4 Lecture Notes, Physics Derivations..."
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
                  if (!title) setTitle('YouTube Video Lecture');
                }}
                required
                className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Plays seamlessly in KaiStu with custom theater splitting and timestamps.
              </p>
            </div>
          )}

          {(selectedType === 'pdf' || selectedType === 'docx' || selectedType === 'pptx') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Upload {selectedType.toUpperCase()} File *
              </label>
              <div className="relative border border-dashed border-white/15 hover:border-indigo-500/60 rounded-xl p-5 text-center cursor-pointer transition bg-[#07090e]/60 group">
                <input
                  type="file"
                  accept={
                    selectedType === 'pdf'
                      ? '.pdf,application/pdf'
                      : selectedType === 'docx'
                      ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                      : '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  }
                  onChange={handleFileChange}
                  required={!file}
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
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300 group-hover:border-indigo-500/40 group-hover:text-indigo-400 transition">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                      Click to choose or drag & drop {selectedType.toUpperCase()}
                    </p>
                    <span className="text-[10px] text-slate-500">Stored safely in local IndexedDB browser storage</span>
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
              placeholder="e.g. Midterm, Formula, High-Yield"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          {/* Submit */}
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
              disabled={isProcessing}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              {isProcessing ? 'Saving to Local Disk...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
