import React, { useEffect, useRef, useState } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import { renderAsync } from 'docx-preview';
import { FileText, Download, Sparkles, Loader2, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';

interface DocxViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ item, onOpenAiAssist }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
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
    <div className="flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Action Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5" /> DOCX
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate" title={item.title}>
            {item.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 hover:text-white rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px]">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="p-1 hover:text-white rounded"
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
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Download original file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-900/60 p-4 md:p-8 flex justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs font-medium">Parsing and rendering Word document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-xs font-medium text-slate-300">{error}</p>
          </div>
        )}

        <div
          ref={containerRef}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 docx-preview-wrapper max-w-4xl w-full shadow-lg rounded bg-white text-black p-8 min-h-[600px]"
        />
      </div>
    </div>
  );
};
