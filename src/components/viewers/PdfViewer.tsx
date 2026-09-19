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

// Sub-component that renders an individual PDF page on demand
interface PdfPageItemProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  onPageVisible: (num: number) => void;
}

const PdfPageItem: React.FC<PdfPageItemProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  onPageVisible,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isNearView, setIsNearView] = useState(pageNumber <= 3); // Preload first 3 pages immediately

  // IntersectionObserver to detect when page is near view and when it's actively visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Observer 1: Render when page is near viewport (within 800px)
    const renderObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsNearView(true);
        }
      },
      { rootMargin: '800px 0px' }
    );
    renderObserver.observe(el);

    // Observer 2: Update active page indicator when centered in view
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onPageVisible(pageNumber);
        }
      },
      { threshold: 0.3 }
    );
    visibleObserver.observe(el);

    return () => {
      renderObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, [pageNumber, onPageVisible]);

  // Render canvas when near view or when scale/rotation changes
  const renderPage = useCallback(async () => {
    if (!isNearView || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNumber);
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
      setIsRendered(true);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    }
  }, [pdfDoc, pageNumber, scale, rotation, isNearView]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      ref={containerRef}
      className="my-3 flex flex-col items-center select-none scroll-mt-4"
    >
      <div className="shadow-[0_10px_35px_rgba(0,0,0,0.6)] rounded-sm overflow-hidden bg-white max-w-full min-h-[300px] flex items-center justify-center relative">
        {!isRendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-slate-400 gap-2 p-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-[11px] font-mono">Loading Page {pageNumber}...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
      </div>
      <span className="text-[10px] font-mono text-slate-500 mt-1.5">
        Page {pageNumber} of {pdfDoc.numPages}
      </span>
    </div>
  );
};

export const PdfViewer: React.FC<PdfViewerProps> = ({ item, onOpenAiAssist }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePageNum, setActivePageNum] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
        setActivePageNum(1);
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

  const handlePageVisible = useCallback((num: number) => {
    setActivePageNum(num);
    setPageInput(String(num));
  }, []);

  const scrollToPage = (pageNum: number) => {
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      scrollToPage(p);
    } else {
      setPageInput(String(activePageNum));
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
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

  // Array of page numbers: [1, 2, 3, ..., numPages]
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

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
          <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[200px]" title={item.title}>
            {item.title}
          </h3>
        </div>

        {/* Center: Scroll indicator & Jump + Zoom */}
        <div className="flex items-center gap-2">
          {/* Scroll Page Indicator & Quick Jump */}
          <form
            onSubmit={handlePageInputSubmit}
            className="flex items-center bg-[#07090e] border border-white/[0.1] rounded-xl px-2 py-1 text-xs"
            title="Type a page number and press Enter to jump"
          >
            <span className="text-slate-500 text-[11px] mr-1 hidden xs:inline">Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              className="w-8 text-center bg-transparent font-mono text-white text-xs focus:outline-none focus:bg-white/[0.08] rounded"
            />
            <span className="text-slate-500 text-xs mx-0.5">/</span>
            <span className="text-slate-400 text-xs font-mono">{numPages}</span>
          </form>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#07090e] border border-white/[0.1] rounded-xl px-1.5 py-1 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[38px] text-center">
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
                  `I am reading page ${activePageNum} of ${numPages} from the PDF document "${item.title}". Can you summarize the core principles, formulas, and definitions from this material?`
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
            <Download className="w-4 h-4" />
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

      {/* Main Continuous Vertical Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full h-full overflow-y-auto overflow-x-auto bg-[#07090e] p-4 sm:p-6 flex flex-col items-center"
      >
        {pdfDoc &&
          pageNumbers.map((pNum) => (
            <PdfPageItem
              key={pNum}
              pdfDoc={pdfDoc}
              pageNumber={pNum}
              scale={scale}
              rotation={rotation}
              onPageVisible={handlePageVisible}
            />
          ))}

        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          — End of document ({numPages} pages) —
        </div>
      </div>
    </div>
  );
};
