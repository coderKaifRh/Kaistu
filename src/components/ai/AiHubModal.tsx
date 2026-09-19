import React, { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { AiChatPane } from './AiChatPane';

interface AiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  contextInfo?: string;
}

export const AiHubModal: React.FC<AiHubModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  contextInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div
        className={`bg-[#080a0f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isExpanded ? 'w-full h-full' : 'w-full max-w-4xl h-[88vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0e14] border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-white tracking-wide">
              KaiStu AI Study Hub
            </span>
            <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/20">
              Gemini • GPT • Claude
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition hidden sm:block"
              title={isExpanded ? 'Restore size' : 'Expand Fullscreen'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] rounded-lg transition"
              title="Close AI Hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-App AI Chat Pane */}
        <div className="flex-1 min-h-0">
          <AiChatPane initialPrompt={initialPrompt} contextInfo={contextInfo} />
        </div>
      </div>
    </div>
  );
};
