import React, { useEffect, useRef, useState } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import { renderAsync } from 'docx-preview';
import {
  FileText,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface DocxViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ item, onOpenAiAssist }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;

    const renderDocx = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!item.fileStorageKey) {
          setError('No stored document file found for this item.');
          setLoading(false);
          return;
        }

        const blob = await StorageService.getFileBlob(item.fileStorageKey);
        if (!blob) {
          setError('Could not retrieve Word document from local storage.');
          setLoading(false);
          return;
        }

        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);

        const arrayBuffer = await blob.arrayBuffer();

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: 'docx-rendered-content',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            experimental: true,
          });
        }
      } catch (err: any) {
        console.error('Error rendering docx:', err);
        setError('Error rendering Word document: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    renderDocx();

    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [item.fileStorageKey, item.id]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.fileName || `${item.title}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`flex flex-col h-full bg-[#080a0f] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Action Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c1017] border-b border-white/[0.08] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5" /> DOCX
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate max-w-xs" title={item.title}>
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#07090e] border border-white/[0.1] rounded-xl px-1.5 py-1 text-xs text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] min-w-[36px] text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenAiAssist && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying from this Word document titled "${item.title}". Can you give me a structured summary and highlight key takeaways from this document?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-xl transition font-semibold shadow-sm"
              title="Ask AI to summarize or extract formulas"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title="Download original file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Continuous Vertical Scroll Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#07090e] p-4 sm:p-6 md:p-8 flex flex-col items-center">
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto text-slate-400 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs font-semibold text-white">Rendering Word document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 my-auto">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-xs font-medium text-slate-300">{error}</p>
          </div>
        )}

        <div
          ref={containerRef}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 docx-preview-wrapper max-w-4xl w-full shadow-2xl rounded-sm bg-white text-slate-900 p-6 sm:p-10 min-h-[600px] mb-8"
        />

        <div className="py-4 text-center text-xs text-slate-500 font-mono">
          — End of document —
        </div>
      </div>
    </div>
  );
};
