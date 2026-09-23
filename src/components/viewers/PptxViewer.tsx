import React, { useEffect, useState, useRef } from 'react';
import type { StudyItem } from '../../types';
import { StorageService } from '../../services/storage';
import { PptBinaryParser } from '../../services/pptBinaryParser';
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
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';

interface PptxViewerProps {
  item: StudyItem;
  onOpenAiAssist?: (contextPrompt: string) => void;
  onAskAiTutor?: (contextPrompt: string) => void;
}

export interface SlideParagraph {
  text: string;
  level: number;
}

export interface SlideContent {
  slideNumber: number;
  title: string;
  subtitle?: string;
  paragraphs: SlideParagraph[];
  tables?: string[][][];
  images?: string[];
  notes?: string;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ item, onOpenAiAssist, onAskAiTutor }) => {
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [activeSlideNum, setActiveSlideNum] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // default 'light' to look like authentic PDF/paper presentation
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let currentMainUrl: string | null = null;
    const extractedBlobUrls: string[] = [];

    // Helper: cleanup any blob URLs created for this session
    const cleanupExtractedUrls = () => {
      for (const u of blobUrlsRef.current) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      }
      blobUrlsRef.current = [];
    };

    const parsePresentation = async () => {
      try {
        setLoading(true);
        setError(null);
        cleanupExtractedUrls();

        // Small yield so browser draws loading skeleton immediately
        await new Promise((r) => setTimeout(r, 10));

        if (!item.fileStorageKey) {
          setError('No stored PowerPoint presentation found.');
          setLoading(false);
          return;
        }

        const blob = await StorageService.getFileBlob(item.fileStorageKey);
        if (!blob) {
          setError('Could not retrieve PowerPoint presentation from storage.');
          setLoading(false);
          return;
        }

        currentMainUrl = URL.createObjectURL(blob);
        setBlobUrl(currentMainUrl);

        const arrayBuffer = await blob.arrayBuffer();

        const isExplicitPpt =
          item.type === 'ppt' ||
          item.fileName?.toLowerCase().endsWith('.ppt') ||
          item.fileName?.toLowerCase().endsWith('.pps');

        const headerBytes = new Uint8Array(arrayBuffer, 0, Math.min(8, arrayBuffer.byteLength));
        const hasZipSignature =
          headerBytes.length >= 4 &&
          headerBytes[0] === 0x50 &&
          headerBytes[1] === 0x4b &&
          (headerBytes[2] === 0x03 || headerBytes[2] === 0x05 || headerBytes[2] === 0x07);

        // Helper to load binary PPT slides safely
        const loadBinaryPpt = () => {
          try {
            const binarySlides = PptBinaryParser.parse(arrayBuffer, item.title);
            if (binarySlides.length > 0) {
              const mapped: SlideContent[] = binarySlides.map((s) => ({
                slideNumber: s.slideNumber,
                title: s.title || `Slide ${s.slideNumber}`,
                paragraphs: (s.paragraphs || []).map((p) => ({ text: p, level: 0 })),
                notes: s.notes,
              }));
              setSlides(mapped);
              setActiveSlideNum(1);
              return true;
            }
          } catch (binErr) {
            console.warn('Binary PPT parser warning:', binErr);
          }
          return false;
        };

        // If binary PPT format, load with binary parser
        if (isExplicitPpt || !hasZipSignature) {
          const success = loadBinaryPpt();
          if (success) {
            setLoading(false);
            return;
          }
        }

        // OpenXML PPTX Parsing
        let parsedWithZip = false;
        if (hasZipSignature) {
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);

            // Locate all slide files: ppt/slides/slide1.xml, slide01.xml, etc.
            const slideFiles: { name: string; num: number; base: string }[] = [];
            zip.forEach((relativePath) => {
              const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
              if (match) {
                const num = parseInt(match[1], 10);
                slideFiles.push({
                  name: relativePath,
                  num,
                  base: relativePath.split('/').pop() || `slide${num}.xml`,
                });
              } else if (/^ppt\/slides\/.*\.xml$/i.test(relativePath) && !relativePath.includes('_rels')) {
                const digits = relativePath.match(/\d+/);
                const num = digits ? parseInt(digits[0], 10) : slideFiles.length + 1;
                slideFiles.push({
                  name: relativePath,
                  num,
                  base: relativePath.split('/').pop() || `slide${num}.xml`,
                });
              }
            });

            slideFiles.sort((a, b) => a.num - b.num);

            if (slideFiles.length > 0) {
              // 1. Map speaker notes: ppt/notesSlides/notesSlide1.xml
              const notesMap = new Map<number, string>();
              const notesFiles: { name: string; num: number }[] = [];
              zip.forEach((relativePath) => {
                const match = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
                if (match) {
                  notesFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
                }
              });

              const parser = new DOMParser();

              for (const nf of notesFiles) {
                try {
                  const f = zip.file(nf.name);
                  if (f) {
                    const xml = await f.async('text');
                    const doc = parser.parseFromString(xml, 'application/xml');
                    const allEls = Array.from(doc.getElementsByTagName('*'));
                    const pNodes = allEls.filter((el) => el.localName === 'p');
                    const noteLines: string[] = [];
                    for (const p of pNodes) {
                      const tEls = Array.from(p.getElementsByTagName('*')).filter((el) => el.localName === 't');
                      const pText = tEls.map((t) => t.textContent || '').join(' ').trim();
                      if (pText && !/^\d+$/.test(pText)) {
                        noteLines.push(pText);
                      }
                    }
                    if (noteLines.length > 0) {
                      notesMap.set(nf.num, noteLines.join('\n'));
                    }
                  }
                } catch {
                  // ignore note parse error
                }
              }

              // 2. Parse each slide XML with full shape, title, bullet, table, and image extraction
              const parsedSlides: SlideContent[] = [];

              for (const slideInfo of slideFiles) {
                const file = zip.file(slideInfo.name);
                if (!file) continue;

                const xmlText = await file.async('text');

                // Extract embedded images from slide relationships
                const slideImages: string[] = [];
                const relsPath = `ppt/slides/_rels/${slideInfo.base}.rels`;
                const relsFile = zip.file(relsPath);
                if (relsFile) {
                  try {
                    const relsXml = await relsFile.async('text');
                    const relRegex = /<Relationship\b([^>]*)\/?>/gi;
                    let relMatch;
                    while ((relMatch = relRegex.exec(relsXml)) !== null) {
                      const attrs = relMatch[1];
                      if (/Type="[^"]*\/relationships\/image"/i.test(attrs)) {
                        const targetMatch = attrs.match(/Target="([^"]+)"/i);
                        if (targetMatch) {
                          let t = targetMatch[1].replace(/\\/g, '/');
                          if (t.startsWith('../')) {
                            t = 'ppt/' + t.slice(3);
                          } else if (!t.startsWith('ppt/')) {
                            t = 'ppt/' + t.replace(/^\//, '');
                          }
                          const imgEntry = zip.file(t);
                          if (imgEntry) {
                            const imgBlob = await imgEntry.async('blob');
                            const imgUrl = URL.createObjectURL(imgBlob);
                            extractedBlobUrls.push(imgUrl);
                            slideImages.push(imgUrl);
                          }
                        }
                      }
                    }
                  } catch (relErr) {
                    console.warn(`Error extracting images for slide ${slideInfo.num}:`, relErr);
                  }
                }

                // Parse slide content (DOM + Regex multi-strategy)
                let slideTitle = '';
                let slideSubtitle = '';
                const slideParagraphs: SlideParagraph[] = [];
                const slideTables: string[][][] = [];

                try {
                  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

                  const extractTextFromP = (p: Element): string => {
                    const tNodes = Array.from(p.getElementsByTagName('*')).filter((el) => el.localName === 't');
                    return tNodes.map((t) => t.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
                  };

                  const getIndentLvl = (p: Element): number => {
                    const pPr = Array.from(p.getElementsByTagName('*')).find((el) => el.localName === 'pPr');
                    if (pPr && pPr.getAttribute('lvl')) {
                      return parseInt(pPr.getAttribute('lvl') || '0', 10);
                    }
                    return 0;
                  };

                  // 1. Check shapes for title, subtitle, and body
                  const spNodes = Array.from(xmlDoc.getElementsByTagName('*')).filter((el) => el.localName === 'sp');

                  for (const sp of spNodes) {
                    const ph = Array.from(sp.getElementsByTagName('*')).find((el) => el.localName === 'ph');
                    const phType = ph?.getAttribute('type') || '';
                    const cNvPr = Array.from(sp.getElementsByTagName('*')).find((el) => el.localName === 'cNvPr');
                    const shapeName = cNvPr?.getAttribute('name') || '';

                    const isTitleShape = phType === 'title' || phType === 'ctrTitle' || /title/i.test(shapeName);
                    const isSubTitleShape = phType === 'subTitle';

                    const pNodes = Array.from(sp.getElementsByTagName('*')).filter((el) => el.localName === 'p');
                    for (const p of pNodes) {
                      const text = extractTextFromP(p);
                      if (!text) continue;

                      if (isTitleShape && !slideTitle) {
                        slideTitle = text;
                      } else if (isSubTitleShape && !slideSubtitle) {
                        slideSubtitle = text;
                      } else {
                        slideParagraphs.push({
                          text,
                          level: getIndentLvl(p),
                        });
                      }
                    }
                  }

                  // 2. Check tables
                  const tblNodes = Array.from(xmlDoc.getElementsByTagName('*')).filter((el) => el.localName === 'tbl');
                  for (const tbl of tblNodes) {
                    const rows: string[][] = [];
                    const trNodes = Array.from(tbl.getElementsByTagName('*')).filter((el) => el.localName === 'tr');
                    for (const tr of trNodes) {
                      const cells: string[] = [];
                      const tcNodes = Array.from(tr.getElementsByTagName('*')).filter((el) => el.localName === 'tc');
                      for (const tc of tcNodes) {
                        const tcPs = Array.from(tc.getElementsByTagName('*')).filter((el) => el.localName === 'p');
                        const cellText = tcPs.map(extractTextFromP).filter(Boolean).join(' ');
                        cells.push(cellText);
                      }
                      if (cells.length > 0 && cells.some((c) => c.trim().length > 0)) {
                        rows.push(cells);
                      }
                    }
                    if (rows.length > 0) {
                      slideTables.push(rows);
                    }
                  }

                  // If no paragraphs from shapes, gather all remaining paragraphs
                  if (slideParagraphs.length === 0 && !slideTitle) {
                    const allPs = Array.from(xmlDoc.getElementsByTagName('*')).filter((el) => el.localName === 'p');
                    for (const p of allPs) {
                      const text = extractTextFromP(p);
                      if (text) {
                        slideParagraphs.push({
                          text,
                          level: getIndentLvl(p),
                        });
                      }
                    }
                  }
                } catch (domErr) {
                  console.warn(`DOMParser error on slide ${slideInfo.num}, using regex:`, domErr);
                }

                // Strict Regex Fallback if DOM returned 0 paragraphs and no title
                if (slideParagraphs.length === 0 && !slideTitle) {
                  const pRegex = /<((?:[a-zA-Z0-9_]+:)?p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
                  let pMatch;
                  while ((pMatch = pRegex.exec(xmlText)) !== null) {
                    const fullTag = pMatch[1];
                    if (fullTag !== 'p' && !fullTag.endsWith(':p')) continue;
                    const pAttrs = pMatch[2];
                    const pBody = pMatch[3];
                    const lvlMatch = pBody.match(/lvl="(\d+)"/i) || pAttrs.match(/lvl="(\d+)"/i);
                    const level = lvlMatch ? parseInt(lvlMatch[1], 10) : 0;
                    const tRegex = /<((?:[a-zA-Z0-9_]+:)?t)\b[^>]*>([^<]+)<\/\1>/gi;
                    let tMatch;
                    let pText = '';
                    while ((tMatch = tRegex.exec(pBody)) !== null) {
                      if (tMatch[1] === 't' || tMatch[1].endsWith(':t')) {
                        pText += (pText ? ' ' : '') + tMatch[2].trim();
                      }
                    }
                    pText = pText.trim();
                    if (pText) {
                      if (!slideTitle) {
                        slideTitle = pText;
                      } else {
                        slideParagraphs.push({ text: pText, level });
                      }
                    }
                  }
                }

                // If still no title but paragraphs exist, use first paragraph as title
                if (!slideTitle && slideParagraphs.length > 0) {
                  slideTitle = slideParagraphs.shift()!.text;
                }

                // Default title if still empty
                if (!slideTitle) {
                  slideTitle = `Slide ${slideInfo.num}`;
                }

                parsedSlides.push({
                  slideNumber: slideInfo.num,
                  title: slideTitle,
                  subtitle: slideSubtitle || undefined,
                  paragraphs: slideParagraphs,
                  tables: slideTables.length > 0 ? slideTables : undefined,
                  images: slideImages.length > 0 ? slideImages : undefined,
                  notes: notesMap.get(slideInfo.num),
                });
              }

              if (parsedSlides.length > 0) {
                blobUrlsRef.current = extractedBlobUrls;
                setSlides(parsedSlides);
                setActiveSlideNum(parsedSlides[0]?.slideNumber || 1);
                parsedWithZip = true;
                setLoading(false);
                return;
              }
            }
          } catch (zipErr) {
            console.warn('JSZip PPTX extraction warning, falling back to binary parser:', zipErr);
          }
        }

        // Fallback to binary parser if JSZip found no slides
        if (!parsedWithZip) {
          const success = loadBinaryPpt();
          if (success) {
            setLoading(false);
            return;
          }
          setError('Could not extract slide content from this PowerPoint presentation.');
        }
      } catch (err: any) {
        console.error('Error parsing presentation:', err);
        setError('Error reading PowerPoint presentation: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    parsePresentation();

    return () => {
      if (currentMainUrl) URL.revokeObjectURL(currentMainUrl);
      for (const u of extractedBlobUrls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      }
    };
  }, [item.fileStorageKey, item.id, item.title]);

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
        threshold: 0.35,
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
    const isPpt = item.fileName?.toLowerCase().endsWith('.ppt') || item.type === 'ppt';
    a.download = item.fileName || `${item.title}.${isPpt ? 'ppt' : 'pptx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeSlide = slides.find((s) => s.slideNumber === activeSlideNum) || slides[0];
  const isPpt = item.fileName?.toLowerCase().endsWith('.ppt') || item.type === 'ppt';

  return (
    <div
      className={`flex flex-col h-full bg-[#080a0f] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#0c1017] border-b border-white/[0.08] shrink-0 select-none gap-2">
        {/* Left: Presentation Info & Slide Count */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1.5 rounded-lg border transition ${
              showSidebar
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle slide outline / thumbnails"
          >
            <Layers className="w-4 h-4" />
          </button>

          <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
            <Presentation className="w-3.5 h-3.5" /> {isPpt ? 'PPT' : 'PPTX'}
          </span>

          <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-xs" title={item.title}>
            {item.title}
          </h3>

          {slides.length > 0 && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              (Slide {activeSlideNum} of {slides.length})
            </span>
          )}
        </div>

        {/* Center / Right: Zoom, Theme, AI Tutor & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Controls (like PDF viewer) */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5 text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(70, z - 10))}
              className="p-1 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-1.5 text-[11px] font-mono hover:text-amber-300 transition"
              title="Reset Zoom to 100%"
            >
              {zoom}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(160, z + 10))}
              className="p-1 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Selector: Paper White (PDF style) vs Studio Dark */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`p-1.5 rounded-xl border transition flex items-center gap-1 text-xs ${
              theme === 'light'
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={theme === 'light' ? 'Current: Clean Paper / PDF style. Click for Studio Dark' : 'Current: Studio Dark. Click for Clean Paper / PDF style'}
          >
            {theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            <span className="hidden md:inline text-[11px] font-medium">
              {theme === 'light' ? 'Paper (PDF)' : 'Dark'}
            </span>
          </button>

          {/* AI Tutor Assistant Button */}
          {activeSlide && (onAskAiTutor || onOpenAiAssist) && (
            <button
              onClick={() => {
                const prompt = `I am studying Slide ${activeSlide.slideNumber} of "${item.title}".\nTitle: ${activeSlide.title}${
                  activeSlide.subtitle ? `\nSubtitle: ${activeSlide.subtitle}` : ''
                }\nContent:\n${activeSlide.paragraphs.map((p) => `• ${p.text}`).join('\n')}${
                  activeSlide.tables ? `\n[Tables Present: ${activeSlide.tables.length}]` : ''
                }${activeSlide.notes ? `\nSpeaker Notes: ${activeSlide.notes}` : ''}\n\nCan you explain this slide thoroughly with key examination concepts, definitions, and an everyday analogy?`;
                if (onAskAiTutor) {
                  onAskAiTutor(prompt);
                } else if (onOpenAiAssist) {
                  onOpenAiAssist(prompt);
                }
              }}
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl transition font-semibold shadow-sm cursor-pointer"
              title="Explain current slide with KaiStu AI Tutor"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden sm:inline">Explain Slide</span>
            </button>
          )}

          {/* Download Original File */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title={`Download original ${isPpt ? 'PPT' : 'PowerPoint'} file`}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Slide Workspace */}
      <div className="flex flex-1 min-h-0 relative">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-semibold text-white">Extracting PowerPoint slides, graphics & content...</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-xs font-medium text-slate-300 max-w-sm mb-3">{error}</p>
            {blobUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Original File</span>
              </button>
            )}
          </div>
        )}

        {!loading && !error && slides.length > 0 && (
          <>
            {/* Left Thumbnails / Outline Sidebar */}
            {showSidebar && (
              <div className="w-56 bg-[#090c13] border-r border-white/[0.07] overflow-y-auto p-3 space-y-2 shrink-0 animate-in slide-in-from-left-4 duration-150">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Slides ({slides.length})</span>
                  </div>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-slate-500 hover:text-white p-0.5 rounded"
                    title="Collapse Outline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {slides.map((s) => (
                  <button
                    key={s.slideNumber}
                    onClick={() => scrollToSlide(s.slideNumber)}
                    className={`w-full text-left p-2.5 rounded-xl border transition text-xs relative group ${
                      s.slideNumber === activeSlideNum
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-0.5">
                      <span>Slide {s.slideNumber}</span>
                      <div className="flex items-center gap-1 opacity-70">
                        {s.images && s.images.length > 0 && <ImageIcon className="w-2.5 h-2.5 text-sky-400" />}
                        {s.tables && s.tables.length > 0 && <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-400" />}
                      </div>
                    </div>
                    <div className="truncate text-[12px]">{s.title || `Slide ${s.slideNumber}`}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Continuous Vertical Presentation Feed (Like PDF Pages) */}
            <div
              ref={scrollContainerRef}
              className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8 flex flex-col items-center transition-colors ${
                theme === 'light' ? 'bg-[#181d27]' : 'bg-[#06080d]'
              }`}
            >
              {slides.map((slide) => {
                const isLight = theme === 'light';
                const hasBodyContent =
                  slide.paragraphs.length > 0 ||
                  (slide.tables && slide.tables.length > 0) ||
                  (slide.images && slide.images.length > 0) ||
                  slide.subtitle;

                return (
                  <div
                    key={slide.slideNumber}
                    id={`pptx-slide-${slide.slideNumber}`}
                    data-slide-num={slide.slideNumber}
                    ref={(el) => {
                      slideRefs.current[slide.slideNumber] = el;
                    }}
                    style={{
                      width: `${Math.round(860 * (zoom / 100))}px`,
                      maxWidth: '100%',
                    }}
                    className={`rounded-2xl transition-all scroll-mt-6 flex flex-col justify-between overflow-hidden relative ${
                      isLight
                        ? 'bg-white text-slate-900 border border-slate-200 shadow-[0_12px_45px_rgba(0,0,0,0.5)]'
                        : 'bg-[#0d111a] text-slate-100 border border-white/[0.08] shadow-[0_12px_45px_rgba(0,0,0,0.7)]'
                    } p-6 sm:p-9 md:p-10 min-h-[460px]`}
                  >
                    {/* Decorative Top Accent Bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                        isLight ? 'from-amber-500 via-indigo-500 to-purple-500' : 'from-amber-500/80 via-indigo-500/80 to-purple-500/80'
                      }`}
                    />

                    {/* Slide Top Metadata Bar */}
                    <div className="flex items-center justify-between text-xs font-mono mb-4 pt-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                            isLight
                              ? 'bg-amber-500/10 text-amber-800 border-amber-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          SLIDE {slide.slideNumber} OF {slides.length}
                        </span>
                        <span className={`text-[11px] truncate max-w-xs hidden sm:inline ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.title}
                        </span>
                      </div>

                      {/* Quick AI Action for this slide */}
                      {(onAskAiTutor || onOpenAiAssist) && (
                        <button
                          onClick={() => {
                            const prompt = `I am studying Slide ${slide.slideNumber} of "${item.title}".\nTitle: ${slide.title}${
                              slide.subtitle ? `\nSubtitle: ${slide.subtitle}` : ''
                            }\nContent:\n${slide.paragraphs.map((p) => `• ${p.text}`).join('\n')}${
                              slide.tables ? `\n[Tables Present: ${slide.tables.length}]` : ''
                            }${slide.notes ? `\nSpeaker Notes: ${slide.notes}` : ''}\n\nCan you explain this slide in depth, highlight key points, and give an intuitive real-world example?`;
                            if (onAskAiTutor) {
                              onAskAiTutor(prompt);
                            } else if (onOpenAiAssist) {
                              onOpenAiAssist(prompt);
                            }
                          }}
                          className={`flex items-center gap-1.5 text-[11px] font-sans font-semibold px-2 py-1 rounded-lg transition cursor-pointer ${
                            isLight
                              ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
                              : 'text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.05]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                          <span>Ask AI</span>
                        </button>
                      )}
                    </div>

                    {/* Slide Header: Title & Subtitle */}
                    <div className="mb-6">
                      <h2
                        className={`text-2xl sm:text-3xl font-extrabold tracking-tight pb-3 border-b ${
                          isLight
                            ? 'text-slate-900 border-slate-200'
                            : 'text-white border-white/[0.08]'
                        }`}
                      >
                        {slide.title}
                      </h2>
                      {slide.subtitle && (
                        <p className={`mt-2 text-sm sm:text-base font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {slide.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Slide Body Content */}
                    <div className="my-auto space-y-4 py-2">
                      {/* 1. Bullet Points / Text Runs */}
                      {slide.paragraphs.length > 0 && (
                        <div className="space-y-3">
                          {slide.paragraphs.map((p, pIdx) => {
                            const indentClass =
                              p.level === 1
                                ? 'ml-5 sm:ml-7 text-xs sm:text-sm'
                                : p.level >= 2
                                ? 'ml-10 sm:ml-12 text-xs'
                                : 'text-sm sm:text-base';

                            const bulletMarker =
                              p.level === 1 ? '◦' : p.level >= 2 ? '▪' : '•';

                            return (
                              <div
                                key={pIdx}
                                className={`flex items-start gap-2.5 leading-relaxed transition-colors ${indentClass} ${
                                  isLight ? 'text-slate-800' : 'text-slate-200'
                                }`}
                              >
                                <span
                                  className={`select-none font-bold text-base leading-none shrink-0 mt-0.5 ${
                                    p.level === 0
                                      ? 'text-amber-500'
                                      : isLight
                                      ? 'text-slate-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {bulletMarker}
                                </span>
                                <span className="flex-1">{p.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Structured Tables */}
                      {slide.tables && slide.tables.length > 0 && (
                        <div className="my-5 space-y-4">
                          {slide.tables.map((tbl, tblIdx) => (
                            <div
                              key={tblIdx}
                              className={`overflow-x-auto rounded-xl border shadow-sm ${
                                isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.02]'
                              }`}
                            >
                              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <tbody>
                                  {tbl.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className={`border-b last:border-b-0 ${
                                        rIdx === 0
                                          ? isLight
                                            ? 'bg-slate-100/80 font-bold text-slate-800 border-slate-200'
                                            : 'bg-white/[0.06] font-bold text-white border-white/10'
                                          : isLight
                                          ? 'hover:bg-slate-100/40 border-slate-200 text-slate-700'
                                          : 'hover:bg-white/[0.03] border-white/10 text-slate-300'
                                      }`}
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="px-3.5 py-2.5 border-r last:border-r-0 border-inherit">
                                          {cell || '—'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. Embedded Slide Images / Figures */}
                      {slide.images && slide.images.length > 0 && (
                        <div className="my-5 flex flex-wrap gap-4 items-center justify-center">
                          {slide.images.map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              onClick={() => setSelectedImage(imgUrl)}
                              className={`relative group cursor-zoom-in overflow-hidden rounded-xl border shadow-md max-h-72 transition-all hover:scale-[1.01] ${
                                isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-black/40'
                              }`}
                              title="Click to view full size image"
                            >
                              <img
                                src={imgUrl}
                                alt={`Slide ${slide.slideNumber} visual illustration ${imgIdx + 1}`}
                                className="max-h-72 w-auto object-contain rounded-xl"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                                <Maximize2 className="w-4 h-4" /> Click to enlarge
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty Slide Fallback */}
                      {!hasBodyContent && (
                        <div
                          className={`text-center py-10 my-4 border border-dashed rounded-xl ${
                            isLight
                              ? 'border-slate-200 text-slate-400 bg-slate-50/50'
                              : 'border-white/10 text-slate-500 bg-white/[0.02]'
                          }`}
                        >
                          <Presentation className="w-8 h-8 mx-auto mb-2 opacity-50 text-amber-500" />
                          <p className="text-xs font-medium">Slide Header / Visual Title Slide</p>
                        </div>
                      )}
                    </div>

                    {/* Speaker Notes */}
                    {slide.notes && (
                      <div
                        className={`my-4 p-3 rounded-xl border text-xs leading-relaxed ${
                          isLight
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : 'bg-amber-500/[0.08] border-amber-500/20 text-amber-200'
                        }`}
                      >
                        <span className="font-bold block mb-1">Speaker Notes:</span>
                        <p className="whitespace-pre-wrap">{slide.notes}</p>
                      </div>
                    )}

                    {/* Slide Footer */}
                    <div
                      className={`flex items-center justify-between pt-4 mt-6 border-t text-[11px] font-mono ${
                        isLight ? 'border-slate-200 text-slate-500' : 'border-white/[0.08] text-slate-500'
                      }`}
                    >
                      <span>KaiStu Slides • {item.title}</span>
                      <span>Page {slide.slideNumber} of {slides.length}</span>
                    </div>
                  </div>
                );
              })}

              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                — End of Presentation ({slides.length} Slides) —
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
              title="Close Image Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged slide visual"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
