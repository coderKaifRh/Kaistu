import React, { useEffect, useState } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import { FileText, Download, Maximize2, Minimize2, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ item, onOpenAiAssist }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let currentObjectUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!item.fileStorageKey) {
          setError('No stored PDF file found for this item.');
          setLoading(false);
          return;
        }

        const blob = await StorageService.getFileBlob(item.fileStorageKey);
        if (!blob) {
          setError('Could not retrieve PDF data from local storage.');
          setLoading(false);
          return;
        }

        // Ensure blob has application/pdf type
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        currentObjectUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(currentObjectUrl);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError('Error reading PDF: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [item.fileStorageKey, item.id]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = item.fileName || `${item.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900 rounded-xl">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading In-App PDF Viewer...</p>
        <span className="text-xs text-slate-500 mt-1">{item.fileName || item.title}</span>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">Unable to load PDF</h3>
        <p className="text-xs text-slate-400 mt-1">{error || 'Missing PDF data.'}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* PDF Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-rose-500/20 text-rose-400 text-xs font-semibold px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5" /> PDF
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate" title={item.title}>
            {item.title}
          </h3>
          {item.fileSize && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              ({(item.fileSize / (1024 * 1024)).toFixed(2)} MB)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenAiAssist && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying from this PDF document titled "${item.title}". Can you give me a summary, list the main key points, and explain the core definitions?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
              title="Ask AI to summarize or explain this PDF"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Study with AI</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Embedded Native Browser PDF Object Viewer */}
      <div className="flex-1 w-full h-full bg-slate-900 relative">
        <object
          data={`${pdfUrl}#toolbar=1&navpanes=1&statusbar=1&view=FitH`}
          type="application/pdf"
          className="w-full h-full border-0 absolute inset-0"
        >
          {/* Fallback iframe */}
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={item.title}
            className="w-full h-full border-0"
          >
            <p className="p-4 text-center text-slate-400">
              Your browser does not support inline PDFs.{' '}
              <button onClick={handleDownload} className="text-indigo-400 underline">
                Click here to download the file.
              </button>
            </p>
          </iframe>
        </object>
      </div>
    </div>
  );
};
