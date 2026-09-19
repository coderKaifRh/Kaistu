import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ item, onOpenAiAssist }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.25);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF document from IndexedDB blob
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadPdfDoc = async () => {
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

        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setPdfBlobUrl(createdUrl);
        }

        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
      } catch (err: any) {
        console.error('Failed to parse PDF:', err);
        if (active) {
          setError('Error loading PDF: ' + (err.message || 'Unknown parsing error'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPdfDoc();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [item.fileStorageKey, item.id]);

  // Render current page to Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    try {
      setRenderingPage(true);

      // Cancel previous render task if still in progress
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

      const renderContext = {
        canvasContext: context,
        viewport,
        transform,
        canvas,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;

      await task.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, numPages, scale, rotation]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Page navigation helpers
  const goToPrevPage = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      setPageInput(String(p));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      setPageInput(String(p));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = item.fileName || `${item.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-[#080a0f] rounded-2xl border border-white/[0.08]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-semibold text-white tracking-tight">Loading PDF Document...</p>
        <span className="text-xs text-slate-500 mt-1 font-mono">{item.fileName || item.title}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 bg-[#080a0f] rounded-2xl border border-white/[0.08]">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">Unable to load PDF</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">{error}</p>
        {pdfBlobUrl && (
          <button
            onClick={handleOpenInNewTab}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Browser Tab</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-[#080a0f] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Top PDF Controls Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#0c1017] border-b border-white/[0.08] gap-2 flex-wrap sm:flex-nowrap shrink-0 select-none">
        {/* Left: Document Info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5" /> PDF
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-[220px]" title={item.title}>
            {item.title}
          </h3>
        </div>

        {/* Center: Pagination & Zoom Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Page Selector */}
          <div className="flex items-center bg-[#07090e] border border-white/[0.1] rounded-xl px-1.5 py-1 text-xs">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center px-1">
              <input
                type="text"
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputSubmit}
                className="w-8 text-center bg-transparent font-mono text-white text-xs focus:outline-none focus:bg-white/[0.08] rounded"
              />
              <span className="text-slate-500 text-xs mx-1">/</span>
              <span className="text-slate-400 text-xs font-mono">{numPages}</span>
            </form>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#07090e] border border-white/[0.1] rounded-xl px-1.5 py-1 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate Button */}
          <button
            onClick={handleRotate}
            className="p-1.5 bg-[#07090e] border border-white/[0.1] text-slate-400 hover:text-white rounded-xl transition hidden sm:flex items-center justify-center"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAiAssist && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying page ${currentPage} of ${numPages} from "${item.title}". Can you summarize the core principles, formulas, and definitions from this document?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-xl transition font-semibold shadow-sm"
              title="Ask AI to explain or summarize"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Study</span>
            </button>
          )}

          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full overflow-auto bg-[#07090e] flex flex-col items-center justify-start p-4 sm:p-6 relative"
      >
        {renderingPage && (
          <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur border border-white/[0.1] px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] text-slate-300">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
            <span>Rendering...</span>
          </div>
        )}

        {/* Shadowed Paper Canvas */}
        <div className="shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden bg-white my-auto max-w-full">
          <canvas ref={canvasRef} className="block max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
};
