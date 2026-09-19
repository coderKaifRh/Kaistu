import React, { useEffect, useState, useRef } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import JSZip from 'jszip';
import {
  Presentation,
  Download,
  Sparkles,
  Loader2,
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
  const [activeSlideNum, setActiveSlideNum] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
        setActiveSlideNum(parsedSlides[0]?.slideNumber || 1);
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

  // Track which slide is visible on scroll
  useEffect(() => {
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const num = parseInt(entry.target.getAttribute('data-slide-num') || '1', 10);
            setActiveSlideNum(num);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.4,
      }
    );

    slides.forEach((s) => {
      const el = slideRefs.current[s.slideNumber];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [slides]);

  const scrollToSlide = (slideNum: number) => {
    const el = slideRefs.current[slideNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.fileName || `${item.title}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeSlide = slides.find((s) => s.slideNumber === activeSlideNum) || slides[0];

  return (
    <div
      className={`flex flex-col h-full bg-[#080a0f] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0c1017] border-b border-white/[0.08] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
            <Presentation className="w-3.5 h-3.5" /> PPTX
          </span>
          <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[160px] sm:max-w-xs" title={item.title}>
            {item.title}
          </h3>
          {slides.length > 0 && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              (Slide {activeSlideNum} of {slides.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenAiAssist && activeSlide && (
            <button
              onClick={() =>
                onOpenAiAssist(
                  `I am studying Slide ${activeSlide.slideNumber} of "${item.title}".
Title: ${activeSlide.title}
Content: ${activeSlide.paragraphs.join('\n')}
Can you explain this slide in detail with simple analogies and key exam highlights?`
                )
              }
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-xl transition font-semibold shadow-sm"
              title="Explain current slide with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explain Slide</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title="Download original PPTX"
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

      {/* Main Slide Workspace with Continuous Vertical Scrolling */}
      <div className="flex flex-1 min-h-0">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-semibold text-white">Extracting PowerPoint slides...</p>
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
            {/* Left Thumbnails Sidebar (Quick Navigation) */}
            <div className="w-52 bg-[#090c13] border-r border-white/[0.07] overflow-y-auto p-3 space-y-2 hidden md:block shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Slides ({slides.length})</span>
              </div>
              {slides.map((s) => (
                <button
                  key={s.slideNumber}
                  onClick={() => scrollToSlide(s.slideNumber)}
                  className={`w-full text-left p-2.5 rounded-xl border transition text-xs ${
                    s.slideNumber === activeSlideNum
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="font-mono text-[10px] text-slate-500 mb-0.5">Slide {s.slideNumber}</div>
                  <div className="truncate">{s.title || `Slide ${s.slideNumber}`}</div>
                </button>
              ))}
            </div>

            {/* Continuous Vertical Scroll Slide Feed */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 flex flex-col items-center bg-[#07090e]"
            >
              {slides.map((slide) => (
                <div
                  key={slide.slideNumber}
                  data-slide-num={slide.slideNumber}
                  ref={(el) => {
                    slideRefs.current[slide.slideNumber] = el;
                  }}
                  className="w-full max-w-3xl bg-[#0e121a] hover:bg-[#111622] rounded-2xl border border-white/[0.08] p-6 sm:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all scroll-mt-6"
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />

                  {/* Slide Header */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-amber-400 font-mono mb-2">
                      <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        SLIDE {slide.slideNumber} OF {slides.length}
                      </span>
                      <span className="text-slate-500 text-[11px] truncate max-w-xs">{item.title}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight border-b border-white/[0.06] pb-3.5 pt-1">
                      {slide.title}
                    </h2>
                  </div>

                  {/* Slide Body */}
                  <div className="my-5 space-y-3">
                    {slide.paragraphs.length > 0 ? (
                      slide.paragraphs.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-3 text-slate-200 text-sm sm:text-base leading-relaxed">
                          <span className="text-amber-400 text-lg leading-none select-none shrink-0 mt-0.5">•</span>
                          <span>{p}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic text-sm">No text content on this slide.</p>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.06] text-[11px] text-slate-500 font-mono">
                    <span>KaiStu Presentation Scroll</span>
                    <span>Slide {slide.slideNumber}</span>
                  </div>
                </div>
              ))}

              <div className="py-6 text-center text-xs text-slate-500 font-mono">
                — End of presentation ({slides.length} slides) —
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
