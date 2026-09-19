import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Folder, Trash2, Check } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderName: string) => Promise<void> | void;
  initialName?: string;
  parentFolderName?: string;
  isEditing?: boolean;
  onDelete?: () => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  parentFolderName,
  isEditing = false,
  onDelete,
}) => {
  const [folderName, setFolderName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFolderName(initialName);
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(folderName.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save folder:', err);
      alert('Error saving folder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0e14] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#080a0f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shadow-sm">
              {isEditing ? <Folder className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {isEditing ? 'Rename Folder / Chapter' : 'New Folder / Chapter'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {parentFolderName ? `Inside: ${parentFolderName}` : 'Root level chapter'}
              </p>
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
              Folder / Chapter Name *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Chapter 1: Introduction, Derivatives, Lab Practicals..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
              className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              You can nest unlimited subfolders and store YouTube lectures, PDFs, notes & slides inside.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete folder "${folderName}" and all its contents?`)) {
                    onDelete();
                    onClose();
                  }
                }}
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
                disabled={isSubmitting || !folderName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Save Changes' : 'Create Folder'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
