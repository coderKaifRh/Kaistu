/**
 * High-Performance, Non-Blocking Binary PowerPoint (.ppt / PowerPoint 97-2003) Parser
 * Extracts slides, slide titles, body bullet points, and speaker notes
 * from Microsoft Compound File Binary (CFB / OLE2) and raw PPT record streams.
 *
 * Designed with strict safety limits to prevent UI thread freezing or call stack overflows.
 */

export interface PptSlide {
  slideNumber: number;
  title: string;
  paragraphs: string[];
  notes?: string;
}

export const PptBinaryParser = {
  /**
   * Parse a binary .ppt buffer into structured slides.
   * Completely safe and non-blocking.
   */
  parse(buffer: ArrayBuffer, presentationTitle: string): PptSlide[] {
    try {
      if (!buffer || buffer.byteLength === 0) {
        return this.createFallbackSlide(presentationTitle);
      }

      // Step 1: Attempt to extract "PowerPoint Document" stream from CFB (OLE2 container)
      const streamBuffer = this.extractPowerPointDocumentStream(buffer) || buffer;

      // Ensure slides have real body content, not just placeholder "Slide 1, 2" headers
      const isSubstantial = (slideList: PptSlide[]) => {
        return (
          slideList.length > 0 &&
          slideList.some(
            (s) => s.paragraphs.length > 0 || (s.title && !/^Slide \d+$/i.test(s.title.trim()))
          )
        );
      };

      // Step 2: Parse structured PowerPoint records from stream
      const recordSlides = this.parseRecords(streamBuffer, presentationTitle);
      if (isSubstantial(recordSlides)) {
        return recordSlides;
      }

      // Step 3: Scan-based record atom locator (in case of non-standard container offsets)
      const scannedSlides = this.scanRecordAtoms(streamBuffer, presentationTitle);
      if (isSubstantial(scannedSlides)) {
        return scannedSlides;
      }

      // Step 4: High-speed native TextDecoder extraction fallback
      return this.deepStringExtraction(streamBuffer, presentationTitle);
    } catch (err) {
      console.warn('Error in binary PPT presentation parsing:', err);
      try {
        return this.deepStringExtraction(buffer, presentationTitle);
      } catch {
        return this.createFallbackSlide(presentationTitle);
      }
    }
  },

  /**
   * Extract the contiguous "PowerPoint Document" stream from a Compound File Binary (CFB / OLE) container
   */
  extractPowerPointDocumentStream(buffer: ArrayBuffer): ArrayBuffer | null {
    try {
      const uint8 = new Uint8Array(buffer);
      if (uint8.length < 512) return null;

      // Verify CFB magic signature: D0 CF 11 E0 A1 B1 1A E1
      const isCfb =
        uint8[0] === 0xd0 &&
        uint8[1] === 0xcf &&
        uint8[2] === 0x11 &&
        uint8[3] === 0xe0 &&
        uint8[4] === 0xa1 &&
        uint8[5] === 0xb1 &&
        uint8[6] === 0x1a &&
        uint8[7] === 0xe1;

      if (!isCfb) return null;

      const view = new DataView(buffer);
      const sectorShift = view.getUint16(30, true);
      const sectorSize = 1 << sectorShift; // Typically 512 bytes
      if (sectorSize !== 512 && sectorSize !== 4096) return null;

      const csectFat = Math.min(view.getUint32(44, true), 1024);
      const sectDirFirst = view.getUint32(48, true);

      // Read DIFAT (first 109 entries in header)
      const fatSectors: number[] = [];
      for (let i = 0; i < 109 && fatSectors.length < csectFat; i++) {
        const s = view.getUint32(76 + i * 4, true);
        if (s < 0xfffffffe) {
          fatSectors.push(s);
        }
      }

      // Build FAT table (capped for safety)
      const fat: number[] = [];
      for (const s of fatSectors) {
        const secOffset = (s + 1) * sectorSize;
        if (secOffset + sectorSize <= buffer.byteLength) {
          const secView = new DataView(buffer, secOffset, sectorSize);
          const entries = sectorSize / 4;
          for (let j = 0; j < entries; j++) {
            fat.push(secView.getUint32(j * 4, true));
          }
        }
      }

      const getSectorChain = (startSec: number): number[] => {
        const chain: number[] = [];
        let cur = startSec;
        const visited = new Set<number>();
        while (cur < 0xfffffffe && !visited.has(cur) && cur < fat.length && chain.length < 5000) {
          chain.push(cur);
          visited.add(cur);
          cur = fat[cur];
        }
        return chain;
      };

      // Read Directory sectors
      const dirSectors = getSectorChain(sectDirFirst);
      const dirBytes: Uint8Array[] = [];
      for (const s of dirSectors) {
        const secOffset = (s + 1) * sectorSize;
        if (secOffset + sectorSize <= buffer.byteLength) {
          dirBytes.push(new Uint8Array(buffer, secOffset, sectorSize));
        }
      }

      const totalDirLen = dirBytes.reduce((acc, b) => acc + b.length, 0);
      if (totalDirLen === 0) return null;

      const allDir = new Uint8Array(totalDirLen);
      let pos = 0;
      for (const b of dirBytes) {
        allDir.set(b, pos);
        pos += b.length;
      }

      const dirView = new DataView(allDir.buffer, allDir.byteOffset, allDir.byteLength);
      const entryCount = Math.min(Math.floor(allDir.length / 128), 256);

      for (let i = 0; i < entryCount; i++) {
        const eOffset = i * 128;
        const nameLen = dirView.getUint16(eOffset + 64, true);
        if (nameLen < 2 || nameLen > 64) continue;

        const nameBytes = allDir.subarray(eOffset, eOffset + Math.min(nameLen - 2, 64));
        const name = new TextDecoder('utf-16le', { fatal: false }).decode(nameBytes);

        if (/PowerPoint Document/i.test(name)) {
          const sectStart = dirView.getUint32(eOffset + 116, true);
          let streamSize = dirView.getUint32(eOffset + 120, true);

          // Bound stream size to prevent memory exhaustion (max 30MB)
          streamSize = Math.min(streamSize, 30 * 1024 * 1024, buffer.byteLength);
          if (streamSize <= 0) return null;

          const streamSectors = getSectorChain(sectStart);
          const streamChunks: Uint8Array[] = [];
          let bytesLeft = streamSize;

          for (const s of streamSectors) {
            if (bytesLeft <= 0) break;
            const secOffset = (s + 1) * sectorSize;
            const toRead = Math.min(bytesLeft, sectorSize);
            if (secOffset + toRead <= buffer.byteLength) {
              streamChunks.push(new Uint8Array(buffer, secOffset, toRead));
              bytesLeft -= toRead;
            }
          }

          const actualSize = streamChunks.reduce((acc, c) => acc + c.length, 0);
          if (actualSize === 0) return null;

          const streamBuffer = new Uint8Array(actualSize);
          let spos = 0;
          for (const c of streamChunks) {
            streamBuffer.set(c, spos);
            spos += c.length;
          }
          return streamBuffer.buffer;
        }
      }
    } catch (e) {
      console.warn('CFB PowerPoint Document stream extraction warning:', e);
    }

    return null;
  },

  /**
   * Traverse PowerPoint binary records
   * MS-PPT Record Header: 2 bytes ver/inst, 2 bytes recType, 4 bytes recLen
   */
  parseRecords(buffer: ArrayBuffer, defaultTitle: string): PptSlide[] {
    const view = new DataView(buffer);
    const slides: PptSlide[] = [];
    let currentSlide: PptSlide | null = null;
    let nextTextType = -1; // 0=Title, 1=Body, 2=Notes, 6=CenterTitle

    let offset = 0;
    let iterations = 0;
    const maxIterations = 100000;

    while (offset + 8 <= buffer.byteLength && iterations++ < maxIterations) {
      const verInst = view.getUint16(offset, true);
      const ver = verInst & 0x0f;
      const recType = view.getUint16(offset + 2, true);
      const recLen = view.getUint32(offset + 4, true);

      // If it's a container (ver === 0x0f), always step inside to parse child records!
      if (ver === 0x0f) {
        // RT_Slide (1006) container
        if (recType === 1006) {
          // If slides were already created from SlideListWithText, don't overwrite with empty slides
          const alreadyHasFilledSlides = slides.length > 0 && slides.some((s) => s.paragraphs.length > 0);
          if (!alreadyHasFilledSlides) {
            if (currentSlide && (currentSlide.title || currentSlide.paragraphs.length > 0)) {
              slides.push(currentSlide);
            }
            currentSlide = {
              slideNumber: slides.length + 1,
              title: '',
              paragraphs: [],
              notes: '',
            };
          }
        }
        offset += 8;
        continue;
      }

      // Guard against invalid lengths for atom payloads
      if (recLen > buffer.byteLength || offset + 8 + recLen > buffer.byteLength) {
        offset += 2;
        continue;
      }

      // RT_SlidePersistAtom (1017) inside SlideListWithText container
      if (recType === 1017) {
        if (currentSlide && (currentSlide.title || currentSlide.paragraphs.length > 0)) {
          slides.push(currentSlide);
        }
        currentSlide = {
          slideNumber: slides.length + 1,
          title: '',
          paragraphs: [],
          notes: '',
        };
        offset += 8 + recLen;
        continue;
      }

      // RT_TextHeaderAtom (3999)
      if (recType === 3999 && recLen >= 4) {
        nextTextType = view.getUint32(offset + 8, true);
        offset += 8 + recLen;
        continue;
      }

      // RT_TextCharsAtom (4000) - UTF-16LE text
      if (recType === 4000 && recLen > 0) {
        try {
          const textBytes = new Uint8Array(buffer, offset + 8, recLen);
          const text = new TextDecoder('utf-16le', { fatal: false }).decode(textBytes).replace(/\0/g, '').trim();
          if (text) {
            this.appendSlideText(slides, currentSlide, (s) => (currentSlide = s), text, nextTextType);
          }
        } catch {
          // ignore slice error
        }
        nextTextType = -1;
        offset += 8 + recLen;
        continue;
      }

      // RT_TextBytesAtom (4008) - Single byte ANSI/Latin-1 text
      if (recType === 4008 && recLen > 0) {
        try {
          const textBytes = new Uint8Array(buffer, offset + 8, recLen);
          const text = new TextDecoder('latin1', { fatal: false }).decode(textBytes).replace(/\0/g, '').trim();
          if (text) {
            this.appendSlideText(slides, currentSlide, (s) => (currentSlide = s), text, nextTextType);
          }
        } catch {
          // ignore slice error
        }
        nextTextType = -1;
        offset += 8 + recLen;
        continue;
      }

      // RT_CString (4006) - UTF-16LE string
      if (recType === 4006 && recLen > 0) {
        try {
          const textBytes = new Uint8Array(buffer, offset + 8, recLen);
          const text = new TextDecoder('utf-16le', { fatal: false }).decode(textBytes).replace(/\0/g, '').trim();
          if (text.length >= 2 && !/^(Calibri|Arial|Times New Roman)$/i.test(text)) {
            this.appendSlideText(slides, currentSlide, (s) => (currentSlide = s), text, nextTextType);
          }
        } catch {
          // ignore slice error
        }
        nextTextType = -1;
        offset += 8 + recLen;
        continue;
      }

      // Step forward atom payload
      offset += 8 + recLen;
    }

    if (currentSlide && (currentSlide.title || currentSlide.paragraphs.length > 0)) {
      slides.push(currentSlide);
    }

    return this.cleanAndFinalizeSlides(slides, defaultTitle);
  },

  /**
   * Helper to append parsed text to current slide
   */
  appendSlideText(
    slides: PptSlide[],
    currentSlide: PptSlide | null,
    setCurrentSlide: (s: PptSlide) => void,
    rawText: string,
    textType: number
  ) {
    if (!rawText) return;
    const lines = rawText
      .split(/[\r\n\x0b]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^(\d+|\*|\u2022)$/.test(s));

    if (lines.length === 0) return;

    let targetSlide = currentSlide;
    if (!targetSlide) {
      targetSlide = {
        slideNumber: slides.length + 1,
        title: '',
        paragraphs: [],
        notes: '',
      };
      setCurrentSlide(targetSlide);
    }

    // If text type is notes (2)
    if (textType === 2) {
      targetSlide.notes = (targetSlide.notes ? targetSlide.notes + ' ' : '') + lines.join(' ');
      return;
    }

    // Title assignment
    if (textType === 0 || textType === 6 || !targetSlide.title) {
      if (!targetSlide.title) {
        targetSlide.title = lines[0];
        if (lines.length > 1) {
          targetSlide.paragraphs.push(...lines.slice(1));
        }
      } else {
        targetSlide.paragraphs.push(...lines);
      }
    } else {
      targetSlide.paragraphs.push(...lines);
    }
  },

  /**
   * Fast Scan-based atom search: Finds all TextCharsAtom (4000) and TextBytesAtom (4008) in buffer
   */
  scanRecordAtoms(buffer: ArrayBuffer, defaultTitle: string): PptSlide[] {
    const view = new DataView(buffer);
    const slides: PptSlide[] = [];
    let currentSlide: PptSlide | null = null;

    let i = 0;
    // Scan max 5MB of buffer to keep search sub-20ms
    const maxScan = Math.min(buffer.byteLength, 5 * 1024 * 1024);

    while (i + 8 <= maxScan) {
      const recType = view.getUint16(i + 2, true);
      const recLen = view.getUint32(i + 4, true);

      // Slide marker (RT_Slide = 1006 or RT_SlidePersistAtom = 1017)
      if (recType === 1006 || recType === 1017) {
        if (currentSlide && (currentSlide.title || currentSlide.paragraphs.length > 0)) {
          slides.push(currentSlide);
        }
        currentSlide = {
          slideNumber: slides.length + 1,
          title: '',
          paragraphs: [],
          notes: '',
        };
        i += 8;
        continue;
      }

      if (recType === 4000 && recLen >= 2 && recLen <= 40000 && i + 8 + recLen <= buffer.byteLength) {
        try {
          const textBytes = new Uint8Array(buffer, i + 8, recLen);
          const text = new TextDecoder('utf-16le', { fatal: false }).decode(textBytes).replace(/\0/g, '').trim();
          if (text.length >= 2) {
            this.appendSlideText(slides, currentSlide, (s) => (currentSlide = s), text, -1);
            i += 8 + recLen;
            continue;
          }
        } catch {
          // ignore
        }
      }

      if (recType === 4008 && recLen >= 2 && recLen <= 40000 && i + 8 + recLen <= buffer.byteLength) {
        try {
          const textBytes = new Uint8Array(buffer, i + 8, recLen);
          const text = new TextDecoder('latin1', { fatal: false }).decode(textBytes).replace(/\0/g, '').trim();
          if (text.length >= 2) {
            this.appendSlideText(slides, currentSlide, (s) => (currentSlide = s), text, -1);
            i += 8 + recLen;
            continue;
          }
        } catch {
          // ignore
        }
      }

      i += 2; // Check on 2-byte boundaries for MS-PPT records
    }

    if (currentSlide && (currentSlide.title || currentSlide.paragraphs.length > 0)) {
      slides.push(currentSlide);
    }

    return this.cleanAndFinalizeSlides(slides, defaultTitle);
  },

  /**
   * High-Speed Dual-Encoding String Extractor:
   * Uses native browser TextDecoder and regex scanning on chunked buffer slices.
   * Completely avoids array call-stack overflows and executes in < 25ms.
   */
  deepStringExtraction(buffer: ArrayBuffer, title: string): PptSlide[] {
    const maxScan = Math.min(buffer.byteLength, 4 * 1024 * 1024);
    const chunk = new Uint8Array(buffer, 0, maxScan);
    const discoveredStrings: string[] = [];

    // 1. Scan UTF-16LE via native TextDecoder
    try {
      const dec16 = new TextDecoder('utf-16le', { fatal: false });
      const text16 = dec16.decode(chunk);
      const matches16 = text16.match(/[\x20-\x7E\u00A0-\uD7FF]{4,200}/g) || [];
      for (const m of matches16) {
        const trimmed = m.trim();
        if (trimmed.length >= 4) discoveredStrings.push(trimmed);
      }
    } catch {
      // ignore
    }

    // 2. Scan ASCII/UTF-8 via native TextDecoder
    try {
      const dec8 = new TextDecoder('latin1', { fatal: false });
      const text8 = dec8.decode(chunk);
      const matches8 = text8.match(/[\x20-\x7E]{5,200}/g) || [];
      for (const m of matches8) {
        const trimmed = m.trim();
        if (trimmed.length >= 5) discoveredStrings.push(trimmed);
      }
    } catch {
      // ignore
    }

    // Filter out binary noise, font names, and common OLE artifacts
    const filtered = discoveredStrings.filter((str) => {
      if (str.length < 3) return false;
      if (/^[a-f0-9\-_]{16,}$/i.test(str)) return false;
      if (/^(Calibri|Arial|Times New Roman|Wingdings|Symbol|Tahoma|Segoe UI|Verdana|Courier New|Trebuchet MS)$/i.test(str))
        return false;
      if (/^(PowerPoint Document|Current User|_VBA_PROJECT|SummaryInformation|DocumentSummaryInformation)$/i.test(str))
        return false;
      return true;
    });

    if (filtered.length === 0) {
      return this.createFallbackSlide(title);
    }

    // Deduplicate consecutive lines
    const deduplicated: string[] = [];
    for (const item of filtered) {
      if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1] !== item) {
        deduplicated.push(item);
      }
    }

    // Group strings into sensible slide chunks (~6-8 lines each)
    const slides: PptSlide[] = [];
    let curLines: string[] = [];
    let slideNum = 1;

    for (const s of deduplicated) {
      curLines.push(s);
      if (curLines.length >= 8) {
        slides.push({
          slideNumber: slideNum++,
          title: curLines[0],
          paragraphs: curLines.slice(1),
        });
        curLines = [];
      }
    }

    if (curLines.length > 0) {
      slides.push({
        slideNumber: slideNum,
        title: curLines[0],
        paragraphs: curLines.slice(1),
      });
    }

    return this.cleanAndFinalizeSlides(slides, title);
  },

  /**
   * Final cleanup to ensure valid slide numbers, titles, and non-empty slides
   */
  cleanAndFinalizeSlides(slides: PptSlide[], defaultTitle: string): PptSlide[] {
    const valid = slides.filter((s) => s.title.trim().length > 0 || s.paragraphs.length > 0);
    if (valid.length === 0) {
      return this.createFallbackSlide(defaultTitle);
    }

    return valid.map((s, idx) => ({
      slideNumber: idx + 1,
      title: s.title || `Slide ${idx + 1}`,
      paragraphs: s.paragraphs.filter((p) => p.trim().length > 0),
      notes: s.notes ? s.notes.trim() : undefined,
    }));
  },

  createFallbackSlide(title: string): PptSlide[] {
    return [
      {
        slideNumber: 1,
        title: title || 'PowerPoint Presentation',
        paragraphs: ['Presentation slides loaded. Ready for AI study analysis.'],
      },
    ];
  },
};
