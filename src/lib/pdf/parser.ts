import zlib from 'zlib';
import { DocumentChunk } from '../db/types';

// Ensure DOMMatrix exists in Node.js / Serverless environments so pdfjs never errors
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
  };
}

export interface ExtractedSection {
  name: string;
  startPage: number;
  content: string;
}

export interface PDFParseResult {
  title?: string;
  authors?: string[];
  abstract?: string;
  totalPages: number;
  sections: ExtractedSection[];
  chunks: Omit<DocumentChunk, 'id'>[];
  hasTextLayer: boolean;
  warnings?: string[];
}

const SECTION_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Abstract', regex: /(?:^|\n|\b)\s*(?:1\.?\s*)?ABSTRACT\b/i },
  { name: 'Introduction', regex: /(?:^|\n|\b)\s*(?:1\.?\s*|I\.?\s*)?INTRODUCTION\b/i },
  { name: 'Related Work', regex: /(?:^|\n|\b)\s*(?:2\.?\s*|II\.?\s*)?(?:RELATED\s+WORK|LITERATURE\s+REVIEW|BACKGROUND)\b/i },
  { name: 'Methodology', regex: /(?:^|\n|\b)\s*(?:3\.?\s*|III\.?\s*)?(?:METHODOLOGY|PROPOSED\s+(?:METHOD|ARCHITECTURE|FRAMEWORK)|METHODS|APPROACH)\b/i },
  { name: 'Dataset & Preprocessing', regex: /(?:^|\n|\b)\s*(?:4\.?\s*|IV\.?\s*)?(?:DATASET|CORPUS|DATA\s+COLLECTION|PREPROCESSING)\b/i },
  { name: 'Experiments & Setup', regex: /(?:^|\n|\b)\s*(?:5\.?\s*|V\.?\s*)?(?:EXPERIMENTS|EXPERIMENTAL\s+SETUP|EVALUATION\s+SETUP)\b/i },
  { name: 'Results & Discussion', regex: /(?:^|\n|\b)\s*(?:6\.?\s*|VI\.?\s*)?(?:RESULTS|FINDINGS|RESULTS\s+AND\s+DISCUSSION|DISCUSSION)\b/i },
  { name: 'Limitations', regex: /(?:^|\n|\b)\s*(?:7\.?\s*|VII\.?\s*)?(?:LIMITATIONS?|THREATS?\s+TO\s+VALIDITY)\b/i },
  { name: 'Conclusion & Future Work', regex: /(?:^|\n|\b)\s*(?:8\.?\s*|VIII\.?\s*)?(?:CONCLUSION|CONCLUSIONS|FUTURE\s+WORK)\b/i },
  { name: 'References', regex: /(?:^|\n|\b)\s*(?:9\.?\s*|IX\.?\s*)?(?:REFERENCES|BIBLIOGRAPHY)\b/i },
];

function decodePdfString(rawStr: string): string {
  return rawStr
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1');
}

function decodeHexString(hexStr: string): string {
  try {
    const cleanHex = hexStr.replace(/\s+/g, '');
    const padded = cleanHex.length % 2 !== 0 ? cleanHex + '0' : cleanHex;
    return Buffer.from(padded, 'hex').toString('latin1');
  } catch {
    return '';
  }
}

/**
 * Robust Native PDF Stream and Flate Decompressor.
 * Decompresses all compressed (FlateDecode) and raw text streams directly using Node zlib.
 * Does NOT require external workers, headless browsers, canvas, or DOMMatrix.
 */
function extractAllStreamsAndText(buffer: Buffer): { fullText: string; pageTexts: { page: number; text: string }[] } {
  const pageTexts: { page: number; text: string }[] = [];
  const textBlocks: string[] = [];
  let pos = 0;
  let pageCounter = 1;

  while (pos < buffer.length) {
    const streamStartIdx = buffer.indexOf(Buffer.from('stream'), pos);
    if (streamStartIdx === -1) break;

    const headerStart = Math.max(0, streamStartIdx - 450);
    const headerStr = buffer.subarray(headerStart, streamStartIdx).toString('binary');
    const isFlate = /Filter\s*\/FlateDecode|Filter\s*\[[^\]]*\/FlateDecode/i.test(headerStr);

    let dataStart = streamStartIdx + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) dataStart += 1;

    const streamEndIdx = buffer.indexOf(Buffer.from('endstream'), dataStart);
    if (streamEndIdx === -1) break;

    let streamData = buffer.subarray(dataStart, streamEndIdx);
    if (streamData.length > 0 && (streamData[streamData.length - 1] === 0x0a || streamData[streamData.length - 1] === 0x0d)) {
      streamData = streamData.subarray(0, streamData.length - (streamData[streamData.length - 2] === 0x0d ? 2 : 1));
    }

    let decompressed: Buffer | null = null;
    if (isFlate) {
      try {
        decompressed = zlib.inflateSync(streamData);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamData);
        } catch {
          decompressed = null;
        }
      }
    } else {
      decompressed = streamData;
    }

    if (decompressed) {
      const rawContent = decompressed.toString('latin1');
      const streamWords: string[] = [];

      // 1. Literal text: (text) Tj
      const tjLiteralRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
      let m: RegExpExecArray | null;
      while ((m = tjLiteralRegex.exec(rawContent)) !== null) {
        const decoded = decodePdfString(m[1]).trim();
        if (decoded) streamWords.push(decoded);
      }

      // 2. Hex text: <hex> Tj
      const tjHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
      while ((m = tjHexRegex.exec(rawContent)) !== null) {
        const decoded = decodeHexString(m[1]).trim();
        if (decoded) streamWords.push(decoded);
      }

      // 3. Array text: [(text) 20 <hex> -10 (more)] TJ
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      while ((m = tjArrayRegex.exec(rawContent)) !== null) {
        const arrayBody = m[1];
        const itemRegex = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>/g;
        let itemMatch: RegExpExecArray | null;
        const lineParts: string[] = [];
        while ((itemMatch = itemRegex.exec(arrayBody)) !== null) {
          if (itemMatch[1] !== undefined) {
            lineParts.push(decodePdfString(itemMatch[1]));
          } else if (itemMatch[2] !== undefined) {
            lineParts.push(decodeHexString(itemMatch[2]));
          }
        }
        const joined = lineParts.join('').trim();
        if (joined) streamWords.push(joined);
      }

      if (streamWords.length > 0) {
        const streamText = streamWords.join(' ').replace(/\s+/g, ' ').trim();
        if (streamText.length > 15) {
          textBlocks.push(streamText);
          pageTexts.push({ page: pageCounter++, text: streamText });
        }
      }
    }

    pos = streamEndIdx + 9;
  }

  const fullText = textBlocks.join('\n\n');
  return { fullText, pageTexts };
}

export async function parsePdfBuffer(
  buffer: Buffer,
  paperId: string
): Promise<PDFParseResult> {
  const warnings: string[] = [];
  let pageTexts: { page: number; text: string }[] = [];
  let totalPages = 1;
  let fullText = '';

  try {
    // 1. Primary Engine: Robust Native PDF Flate & Stream Decompressor (Zero external workers/DOMMatrix)
    const streamResult = extractAllStreamsAndText(buffer);
    if (streamResult.fullText.trim().length > 30) {
      fullText = streamResult.fullText;
      pageTexts = streamResult.pageTexts;
      totalPages = Math.max(1, pageTexts.length);
    }

    // 2. Secondary Engine: Try modern pdf-parse class if native streams did not extract sufficient text
    if (!fullText || fullText.trim().length < 50) {
      try {
        const pdfModule: any = await import('pdf-parse');
        const PDFParseClass = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);
        if (PDFParseClass && typeof PDFParseClass === 'function') {
          const parser = new PDFParseClass({ data: buffer });
          await parser.load();
          const textResult = await parser.getText();
          if (textResult.text && textResult.text.trim().length > 30) {
            totalPages = textResult.total || (textResult.pages ? textResult.pages.length : 1);
            if (textResult.pages && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
              for (const p of textResult.pages) {
                if (p.text && p.text.trim()) {
                  pageTexts.push({ page: p.num || pageTexts.length + 1, text: p.text });
                }
              }
            }
            fullText = textResult.text || pageTexts.map((pt) => pt.text).join('\n\n');
          }
          await parser.destroy();
        }
      } catch (parseClassErr: any) {
        warnings.push(`PDFParse class: ${parseClassErr.message}`);
      }
    }

    const cleanFullText = fullText.trim();
    if (!cleanFullText || cleanFullText.length < 20) {
      warnings.push(
        'Warning: PDF document contains minimal or no extractable text. Document appears to be a scanned bitmap or restricted.'
      );
      return {
        totalPages: totalPages || 1,
        sections: [],
        chunks: [],
        hasTextLayer: false,
        warnings,
      };
    }

    // Extract title heuristic from first lines
    const firstPageText = pageTexts.length > 0 ? pageTexts[0].text : cleanFullText.substring(0, 1500);
    const lines = firstPageText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 4 && !/^(page|\d+|https?:|doi:|issn)/i.test(l));
    const possibleTitle = lines.length > 0 ? lines[0].substring(0, 200) : undefined;

    // Extract sections and chunks
    const sections: ExtractedSection[] = [];
    const chunks: Omit<DocumentChunk, 'id'>[] = [];
    let currentSection = 'Introduction';
    let chunkIndex = 0;

    const pagesToProcess = pageTexts.length > 0 ? pageTexts : [{ page: 1, text: cleanFullText }];

    for (const { page, text } of pagesToProcess) {
      const pageLines = text.split(/(?<=[.?!])\s+/);
      let currentChunkText = '';

      for (const line of pageLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if line matches a new section header
        for (const pattern of SECTION_PATTERNS) {
          if (pattern.regex.test(trimmed)) {
            if (currentChunkText.trim().length > 30) {
              chunks.push({
                paperId,
                pageNumber: page,
                sectionName: currentSection,
                chunkIndex: chunkIndex++,
                content: currentChunkText.trim(),
              });
              currentChunkText = '';
            }
            currentSection = pattern.name;
            break;
          }
        }

        // Inline section detection (e.g. "Limitations: Our model...")
        if (/limitations?|threats?\s+to\s+validity/i.test(trimmed) && currentSection !== 'Limitations') {
          if (currentChunkText.trim().length > 30) {
            chunks.push({
              paperId,
              pageNumber: page,
              sectionName: currentSection,
              chunkIndex: chunkIndex++,
              content: currentChunkText.trim(),
            });
            currentChunkText = '';
          }
          currentSection = 'Limitations';
        }

        currentChunkText += (currentChunkText ? ' ' : '') + trimmed;

        // Break chunks around 600-800 characters
        if (currentChunkText.length >= 700) {
          chunks.push({
            paperId,
            pageNumber: page,
            sectionName: currentSection,
            chunkIndex: chunkIndex++,
            content: currentChunkText.trim(),
          });
          currentChunkText = '';
        }
      }

      // Flush remaining page text
      if (currentChunkText.trim().length > 20) {
        chunks.push({
          paperId,
          pageNumber: page,
          sectionName: currentSection,
          chunkIndex: chunkIndex++,
          content: currentChunkText.trim(),
        });
      }
    }

    // Safety fallback: if no chunks were created despite having clean text
    if (chunks.length === 0 && cleanFullText.length > 0) {
      chunks.push({
        paperId,
        pageNumber: 1,
        sectionName: 'Introduction',
        chunkIndex: 0,
        content: cleanFullText.substring(0, 1200),
      });
    }

    return {
      title: possibleTitle,
      totalPages,
      sections,
      chunks,
      hasTextLayer: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return {
      totalPages: 1,
      sections: [],
      chunks: [],
      hasTextLayer: false,
      warnings: [`PDF parsing failed: ${err.message}`],
    };
  }
}
