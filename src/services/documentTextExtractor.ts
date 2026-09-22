import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { StudyItem } from '../types';
import { StorageService } from './storage';

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
   * Extract text pages from any StudyItem (PDF, Note, YouTube, etc.)
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
      } else if (item.type === 'docx' || item.type === 'pptx') {
        pages = await this.extractOfficeText(item);
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
   * Extract basic text from Office documents (DOCX/PPTX)
   */
  async extractOfficeText(item: StudyItem): Promise<ExtractedPage[]> {
    // If the item has noteContent saved, use it
    if (item.noteContent && item.noteContent.trim().length > 0) {
      return this.extractNoteText(item);
    }
    return [{ pageNumber: 1, text: `Document: ${item.title} (${item.fileName || 'Office Document'})` }];
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
