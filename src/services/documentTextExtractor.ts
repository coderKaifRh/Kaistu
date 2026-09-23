import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import type { StudyItem } from '../types';
import { StorageService } from './storage';
import { PptBinaryParser } from './pptBinaryParser';

// Ensure worker is registered
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

// In-memory cache for extracted document text to keep queries instantaneous
const documentTextCache = new Map<string, ExtractedPage[]>();

export const DocumentTextExtractor = {
  /**
   * Extract text pages from any StudyItem (PDF, Note, YouTube, PPTX/PPT, DOCX, etc.)
   */
  async extractText(item: StudyItem): Promise<ExtractedPage[]> {
    // Check in-memory cache first
    if (documentTextCache.has(item.id)) {
      return documentTextCache.get(item.id)!;
    }

    let pages: ExtractedPage[] = [];

    try {
      if (item.type === 'pdf') {
        pages = await this.extractPdfText(item);
      } else if (item.type === 'note') {
        pages = this.extractNoteText(item);
      } else if (item.type === 'youtube') {
        pages = this.extractYouTubeText(item);
      } else if (item.type === 'pptx' || item.type === 'ppt') {
        pages = await this.extractPptxText(item);
      } else if (item.type === 'docx') {
        pages = await this.extractDocxText(item);
      }
    } catch (err) {
      console.warn(`Failed to extract text from item "${item.title}":`, err);
    }

    if (pages.length > 0) {
      documentTextCache.set(item.id, pages);
    }

    return pages;
  },

  /**
   * Extract text from PDF document page by page using pdfjs-dist
   */
  async extractPdfText(item: StudyItem): Promise<ExtractedPage[]> {
    if (!item.fileStorageKey) return [];

    const blob = await StorageService.getFileBlob(item.fileStorageKey);
    if (!blob) return [];

    const arrayBuffer = await blob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
      cMapPacked: true,
    });

    const doc = await loadingTask.promise;
    const pages: ExtractedPage[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((i: any) => i.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText.length > 0) {
          pages.push({
            pageNumber: pageNum,
            text: pageText,
          });
        }
      } catch (e) {
        console.warn(`Error extracting text from PDF page ${pageNum}:`, e);
      }
    }

    return pages;
  },

  /**
   * Extract text from Note item
   */
  extractNoteText(item: StudyItem): ExtractedPage[] {
    const content = item.noteContent || '';
    if (!content.trim()) return [];

    // Split large notes into ~500 word sections
    const paragraphs = content.split(/\n\s*\n/);
    const pages: ExtractedPage[] = [];
    let curText = '';
    let secNum = 1;

    for (const p of paragraphs) {
      if ((curText + p).length > 2500 && curText.length > 0) {
        pages.push({ pageNumber: secNum++, text: curText.trim() });
        curText = p + '\n\n';
      } else {
        curText += p + '\n\n';
      }
    }

    if (curText.trim()) {
      pages.push({ pageNumber: secNum, text: curText.trim() });
    }

    return pages;
  },

  /**
   * Extract text from YouTube lecture item (notes & timestamp bookmarks)
   */
  extractYouTubeText(item: StudyItem): ExtractedPage[] {
    const parts: string[] = [];
    parts.push(`Video Title: ${item.title}`);
    if (item.noteContent) {
      parts.push(`Study Notes:\n${item.noteContent}`);
    }
    if (item.bookmarks && item.bookmarks.length > 0) {
      parts.push('Timestamped Key Moments:');
      for (const b of item.bookmarks) {
        const mins = Math.floor(b.timestamp / 60);
        const secs = Math.floor(b.timestamp % 60);
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        parts.push(`[${timeStr}] ${b.title}: ${b.note || ''}`);
      }
    }

    return [{ pageNumber: 1, text: parts.join('\n\n') }];
  },

  /**
   * Extract slides and speaker notes from PPTX presentations (with legacy PPT fallback)
   */
  async extractPptxText(item: StudyItem): Promise<ExtractedPage[]> {
    if (!item.fileStorageKey) return [];

    const blob = await StorageService.getFileBlob(item.fileStorageKey);
    if (!blob) return [];

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

    // Helper for binary PPT slide conversion
    const parseBinaryPpt = () => {
      try {
        const binarySlides = PptBinaryParser.parse(arrayBuffer, item.title);
        if (binarySlides.length > 0) {
          return binarySlides.map((slide) => {
            const parts: string[] = [`Slide ${slide.slideNumber}: ${slide.title}`];
            if (slide.paragraphs.length > 0) {
              parts.push(slide.paragraphs.join('\n'));
            }
            if (slide.notes) {
              parts.push(`[Speaker Notes: ${slide.notes}]`);
            }
            return {
              pageNumber: slide.slideNumber,
              text: parts.join('\n\n'),
            };
          });
        }
      } catch (e) {
        console.warn('Binary PPT extraction error:', e);
      }
      return null;
    };

    if (isExplicitPpt || !hasZipSignature) {
      const binPages = parseBinaryPpt();
      if (binPages && binPages.length > 0) {
        return binPages;
      }
    }

    try {
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Find all slide files: ppt/slides/slide1.xml, etc.
      const slideFiles: { name: string; num: number }[] = [];
      zip.forEach((relativePath) => {
        const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (match) {
          slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
        }
      });

      slideFiles.sort((a, b) => a.num - b.num);

      if (slideFiles.length > 0) {
        const parser = new DOMParser();
        const pages: ExtractedPage[] = [];

        // Map speaker notes if available: ppt/notesSlides/notesSlide1.xml
        const notesMap = new Map<number, string>();
        const notesFiles: { name: string; num: number }[] = [];
        zip.forEach((relativePath) => {
          const match = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i);
          if (match) {
            notesFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
          }
        });

        for (const nf of notesFiles) {
          try {
            const f = zip.file(nf.name);
            if (f) {
              const xml = await f.async('text');
              const doc = parser.parseFromString(xml, 'application/xml');
              const pNodes = Array.from(doc.getElementsByTagName('a:p'));
              const noteLines: string[] = [];
              for (const p of pNodes) {
                const tNodes = Array.from(p.getElementsByTagName('a:t'));
                const pText = tNodes.map((t) => t.textContent || '').join('').trim();
                // Filter out lone slide numbers or date headers in speaker notes
                if (pText && !/^\d+$/.test(pText)) {
                  noteLines.push(pText);
                }
              }
              if (noteLines.length > 0) {
                notesMap.set(nf.num, noteLines.join(' '));
              }
            }
          } catch {
            // ignore speaker note parse warning
          }
        }

        for (const slideInfo of slideFiles) {
          try {
            const file = zip.file(slideInfo.name);
            if (!file) continue;

            const xmlText = await file.async('text');
            const paragraphs: string[] = [];

            // 1. Multi-namespace DOM traversal (captures all drawingml namespaces)
            try {
              const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
              const allElements = Array.from(xmlDoc.getElementsByTagName('*'));
              const pNodes = allElements.filter((el) => el.localName === 'p');

              for (const p of pNodes) {
                const tNodes = Array.from(p.getElementsByTagName('*')).filter((el) => el.localName === 't');
                const lineText = tNodes.map((t) => t.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
                if (lineText) {
                  paragraphs.push(lineText);
                }
              }

              // Also capture table cell texts
              const trNodes = allElements.filter((el) => el.localName === 'tr');
              for (const tr of trNodes) {
                const tcNodes = Array.from(tr.getElementsByTagName('*')).filter((el) => el.localName === 'tc');
                const rowCells = tcNodes
                  .map((tc) => {
                    const tcPs = Array.from(tc.getElementsByTagName('*')).filter((el) => el.localName === 'p');
                    return tcPs
                      .map((p) => {
                        const tNodes = Array.from(p.getElementsByTagName('*')).filter((el) => el.localName === 't');
                        return tNodes.map((t) => t.textContent || '').join(' ').trim();
                      })
                      .filter(Boolean)
                      .join(' ');
                  })
                  .filter(Boolean);
                if (rowCells.length > 0) {
                  const rowStr = rowCells.join(' | ');
                  if (!paragraphs.includes(rowStr)) {
                    paragraphs.push(rowStr);
                  }
                }
              }
            } catch {
              // DOM parse error fallback
            }

            // 2. Strict regex fallback if DOM traversal yielded no paragraphs
            if (paragraphs.length === 0) {
              const pRegex = /<((?:[a-zA-Z0-9_]+:)?p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
              let pMatch;
              while ((pMatch = pRegex.exec(xmlText)) !== null) {
                const fullTag = pMatch[1];
                if (fullTag !== 'p' && !fullTag.endsWith(':p')) continue;
                const pBody = pMatch[3];
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
                  paragraphs.push(pText);
                }
              }
            }

            const slideTitle = paragraphs.length > 0 ? paragraphs[0] : `Slide ${slideInfo.num}`;
            const bodyLines = paragraphs.length > 1 ? paragraphs.slice(1) : [];

            const parts: string[] = [`Slide ${slideInfo.num}: ${slideTitle}`];
            if (bodyLines.length > 0) {
              parts.push(bodyLines.join('\n'));
            }

            const speakerNotes = notesMap.get(slideInfo.num);
            if (speakerNotes) {
              parts.push(`[Speaker Notes: ${speakerNotes}]`);
            }

            pages.push({
              pageNumber: slideInfo.num,
              text: parts.join('\n\n'),
            });
          } catch (e) {
            console.warn(`Error parsing slide ${slideInfo.num}:`, e);
          }
        }

        if (pages.length > 0) {
          return pages;
        }
      }
    } catch {
      // JSZip failed (standard for binary .ppt files or non-zip formats)
    }

    // Binary .ppt parser (PowerPoint 97-2003 OLE2 streams and atoms)
    try {
      const binarySlides = PptBinaryParser.parse(arrayBuffer, item.title);
      if (binarySlides.length > 0) {
        return binarySlides.map((slide) => {
          const parts: string[] = [`Slide ${slide.slideNumber}: ${slide.title}`];
          if (slide.paragraphs.length > 0) {
            parts.push(slide.paragraphs.join('\n'));
          }
          if (slide.notes) {
            parts.push(`[Speaker Notes: ${slide.notes}]`);
          }
          return {
            pageNumber: slide.slideNumber,
            text: parts.join('\n\n'),
          };
        });
      }
    } catch (e) {
      console.warn('Binary PPT extraction error:', e);
    }

    if (item.noteContent && item.noteContent.trim().length > 0) {
      return this.extractNoteText(item);
    }

    return [{ pageNumber: 1, text: `Presentation: ${item.title} (${item.fileName || 'PowerPoint Presentation'})` }];
  },

  /**
   * Extract text from Word documents (.docx)
   */
  async extractDocxText(item: StudyItem): Promise<ExtractedPage[]> {
    if (!item.fileStorageKey) return [];

    const blob = await StorageService.getFileBlob(item.fileStorageKey);
    if (!blob) return [];

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) return [];

      const xmlText = await docFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      const pNodes = Array.from(xmlDoc.getElementsByTagName('w:p'));
      const paragraphs: string[] = [];

      for (const p of pNodes) {
        const tNodes = Array.from(p.getElementsByTagName('w:t'));
        const text = tNodes.map((t) => t.textContent || '').join('').trim();
        if (text) {
          paragraphs.push(text);
        }
      }

      if (paragraphs.length === 0) return [];

      // Split into ~500 word pages
      const pages: ExtractedPage[] = [];
      let curText = '';
      let pageNum = 1;

      for (const p of paragraphs) {
        if ((curText + p).length > 2500 && curText.length > 0) {
          pages.push({ pageNumber: pageNum++, text: curText.trim() });
          curText = p + '\n\n';
        } else {
          curText += p + '\n\n';
        }
      }

      if (curText.trim()) {
        pages.push({ pageNumber: pageNum, text: curText.trim() });
      }

      return pages;
    } catch (e) {
      console.warn('Failed to parse docx text:', e);
      return [{ pageNumber: 1, text: `Document: ${item.title}` }];
    }
  },

  /**
   * Find most relevant pages matching the user's question using keyword/BM25 scoring
   */
  findRelevantPages(pages: ExtractedPage[], query: string, maxPages: number = 4): ExtractedPage[] {
    if (pages.length === 0) return [];
    if (pages.length <= maxPages) return pages;

    const lowerQuery = query.toLowerCase().trim();

    // Check if this is a broad summarization/overview query
    const isOverviewQuery =
      /\b(summar(y|ize)|overview|main points|key takeaways|what is this (about|book|paper|doc)|outline)\b/i.test(
        lowerQuery
      );

    if (isOverviewQuery) {
      // Pick first 2 pages + middle page + last page
      const indices = [0, 1, Math.floor(pages.length / 2), pages.length - 1];
      const selected = Array.from(new Set(indices))
        .filter((i) => i >= 0 && i < pages.length)
        .map((i) => pages[i]);
      return selected;
    }

    // Common stopwords to filter out for higher search precision
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'to', 'of',
      'with', 'by', 'from', 'about', 'as', 'into', 'like', 'through', 'after', 'over',
      'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
      'what', 'why', 'how', 'when', 'where', 'who', 'explain', 'tell', 'me', 'please',
      'ki', 'kivabe', 'koto', 'kon', 'amake', 'bolo', 'ei', 'er', 'theke', 'holo'
    ]);

    // Tokenize query words
    const queryTokens = lowerQuery
      .replace(/[^\w\s\u0980-\u09FF]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopwords.has(w));

    if (queryTokens.length === 0) {
      return pages.slice(0, maxPages);
    }

    // Score each page
    const scoredPages = pages.map((page) => {
      const lowerText = page.text.toLowerCase();
      let score = 0;

      // Exact phrase match bonus
      if (lowerText.includes(lowerQuery)) {
        score += 30;
      }

      // Keyword match frequency
      for (const token of queryTokens) {
        if (lowerText.includes(token)) {
          // Count occurrences
          const regex = new RegExp(`\\b${token}`, 'gi');
          const matches = (lowerText.match(regex) || []).length;
          score += Math.min(matches, 5) * 4;
        }
      }

      return { page, score };
    });

    // Sort by score descending
    scoredPages.sort((a, b) => b.score - a.score);

    // If top scores have hits (> 0), return top scorers
    const topScorers = scoredPages.filter((sp) => sp.score > 0).slice(0, maxPages);

    if (topScorers.length > 0) {
      // Sort back by pageNumber order so the context is sequential
      return topScorers.map((sp) => sp.page).sort((a, b) => a.pageNumber - b.pageNumber);
    }

    // Fallback: return the first few pages
    return pages.slice(0, maxPages);
  },
};
