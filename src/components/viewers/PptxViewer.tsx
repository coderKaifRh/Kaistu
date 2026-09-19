import React, { useEffect, useState } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import JSZip from 'jszip';
import {
  Presentation,
  Download,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface PptxViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
}

interface SlideContent {
  slideNumber: number;
  title: string;
  paragraphs: string[];
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ item, onOpenAiAssist }) => {
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;

    const parsePptx = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!item.fileStorageKey) {
          setError('No stored PPTX presentation found.');
          setLoading(false);
          return;
        }

        const blob = await StorageService.getFileBlob(item.fileStorageKey);
        if (!blob) {
          setError('Could not retrieve PowerPoint presentation from storage.');
          setLoading(false);
          return;
        }

        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);

        const arrayBuffer = await blob.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Find all slide files: ppt/slides/slide1.xml, etc.
        const slideFiles: { name: string; num: number }[] = [];
        zip.forEach((relativePath) => {
          const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
          if (match) {
            slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
          }
        });

        // Sort slides by number
        slideFiles.sort((a, b) => a.num - b.num);

        if (slideFiles.length === 0) {
          setError('No slide text content found in this PPTX archive.');
          setLoading(false);
          return;
        }

        const parsedSlides: SlideContent[] = [];

        for (const slideInfo of slideFiles) {
          const file = zip.file(slideInfo.name);
          if (file) {
            const xmlText = await file.async('text');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

            // Extract text paragraphs
            const textNodes = xmlDoc.getElementsByTagName('a:t');
            const lines: string[] = [];
            for (let i = 0; i < textNodes.length; i++) {
              const val = textNodes[i].textContent?.trim();
              if (val) lines.push(val);
            }

            const title = lines.length > 0 ? lines[0] : `Slide ${slideInfo.num}`;
            const body = lines.length > 1 ? lines.slice(1) : [];

            parsedSlides.push({
              slideNumber: slideInfo.num,
              title,
              paragraphs: body,
            });
          }
        }

        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
      } catch (err: any) {
        console.error('Error parsing PPTX:', err);
        setError('Error reading PowerPoint presentation: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    parsePptx();

    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [item.fileStorageKey, item.id]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.fileName || `${item.title}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div
      className={`flex flex-col h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 shrink-0">
            <Presentation className="w-3.5 h-3.5" /> PPTX
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate" title={item.title}>
            {item.title}
          </h3>
          {slides.length > 0 && (
            <span className="text-[11px] text-slate-500 font-medium">
              ({slides.length} slides)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenAiAssist && currentSlide && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying Slide ${currentSlide.slideNumber} of "${item.title}".
Title: ${currentSlide.title}
Content: ${currentSlide.paragraphs.join('\n')}
Can you explain this slide in detail with simple analogies and examples?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
              title="Explain current slide with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explain Slide</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Download original PPTX"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Workspace */}
      <div className="flex flex-1 min-h-0">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-medium">Extracting PowerPoint slides...</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-xs font-medium text-slate-300">{error}</p>
          </div>
        )}

        {!loading && !error && slides.length > 0 && (
          <>
            {/* Left Thumbnails Sidebar */}
            <div className="w-48 bg-slate-900 border-r border-slate-800 overflow-y-auto p-2.5 space-y-2 hidden md:block shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold px-1 mb-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Slides ({slides.length})</span>
              </div>
              {slides.map((s, idx) => (
                <button
                  key={s.slideNumber}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-full text-left p-2 rounded-lg border transition text-xs ${
                    idx === currentSlideIndex
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-mono text-[10px] text-slate-500 mb-0.5">Slide {s.slideNumber}</div>
                  <div className="font-medium truncate">{s.title || `Slide ${s.slideNumber}`}</div>
                </button>
              ))}
            </div>

            {/* Slide Stage Canvas */}
            <div className="flex-1 flex flex-col items-center justify-between p-4 md:p-8 bg-slate-950 overflow-y-auto">
              <div className="w-full max-w-3xl aspect-[16/10] bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-700 p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                {/* Decorative Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Slide Header */}
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400/80 font-mono mb-3">
                    <span>SLIDE {currentSlide.slideNumber} OF {slides.length}</span>
                    <span className="text-slate-500">{item.title}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight border-b border-slate-800 pb-4">
                    {currentSlide.title}
                  </h1>
                </div>

                {/* Slide Body */}
                <div className="flex-1 my-6 overflow-y-auto space-y-3">
                  {currentSlide.paragraphs.length > 0 ? (
                    currentSlide.paragraphs.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-slate-200 text-sm md:text-base leading-relaxed">
                        <span className="text-amber-400 text-lg leading-none select-none">•</span>
                        <span>{p}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-sm">No text content on this slide.</p>
                  )}
                </div>

                {/* Slide Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                  <span>KaiStu Presentation Mode</span>
                  <span>Slide {currentSlide.slideNumber}</span>
                </div>
              </div>

              {/* Bottom Slide Navigation Bar */}
              <div className="flex items-center gap-4 mt-6 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 shadow-lg">
                <button
                  onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Previous slide (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-xs font-mono text-slate-300">
                  {currentSlideIndex + 1} / {slides.length}
                </span>

                <button
                  onClick={() => setCurrentSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Next slide (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
