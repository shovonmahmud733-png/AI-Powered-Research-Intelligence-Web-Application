import zlib from 'zlib';
import { DocumentChunk } from '../db/types';
import { COMMON_DICTIONARY } from './dictionary';

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
  { name: 'Abstract', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?ABSTRACT\b/i },
  { name: 'Introduction', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?INTRODUCTION\b/i },
  { name: 'Related Work', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:RELATED\s+WORK|LITERATURE\s+REVIEW|BACKGROUND)\b/i },
  { name: 'Methodology', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:METHODOLOGY|PROPOSED\s+(?:METHOD|ARCHITECTURE|FRAMEWORK)|METHODS|APPROACH)\b/i },
  { name: 'Dataset & Preprocessing', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:DATASET(?:\s+CONSTRUCTION|\s+DESCRIPTION)?|CORPUS|DATA\s+COLLECTION|PREPROCESSING)\b/i },
  { name: 'Experiments & Setup', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:EXPERIMENTS|EXPERIMENTAL\s+SETUP|EVALUATION\s+SETUP)\b/i },
  { name: 'Results & Discussion', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:RESULTS|FINDINGS|RESULTS\s+AND\s+DISCUSSION|DISCUSSION)\b/i },
  { name: 'Limitations', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:LIMITATIONS\b|THREATS\s+TO\s+VALIDITY\b|(?:Limitations?|Threats\s+to\s+validity)\s*[:\-]|(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*Limitations?\b|^Limitations?\s*$)/i },
  { name: 'Conclusion & Future Work', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:CONCLUSION|CONCLUSIONS|FUTURE\s+WORK)\b/i },
  { name: 'References', regex: /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:REFERENCES|BIBLIOGRAPHY)\b/i },
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
    const buf = Buffer.from(padded, 'hex');

    // Detect UTF-16BE (PDF text using 2 bytes per char, e.g. BOM 0xFEFF or Indic/Latin with zero high byte)
    if (buf.length >= 2 && buf.length % 2 === 0) {
      if (buf[0] === 0xfe && buf[1] === 0xff) {
        const sliced = buf.subarray(2);
        sliced.swap16();
        return sliced.toString('utf16le');
      }
      let zeroHighBytes = 0;
      for (let i = 0; i < buf.length; i += 2) {
        if (buf[i] === 0x00 || buf[i] === 0x09) zeroHighBytes++;
      }
      if (zeroHighBytes >= Math.floor(buf.length / 4) && zeroHighBytes > 0) {
        const copy = Buffer.from(buf);
        copy.swap16();
        return copy.toString('utf16le');
      }
    }
    return buf.toString('latin1');
  } catch {
    return '';
  }
}

/**
 * Accurately decodes a PDF TJ array operator, e.g.:
 * [(This) -250 (research) -250 (uses) -250 (a) -250 (native) -250 (Chittagonian)] TJ
 * Negative numbers <= -80 represent word-spacing in PDF glyph coordinates.
 * Numbers between -79 and +50 represent intra-word kerning.
 */
function parseTjArray(arrayBody: string): string {
  const tokenRegex = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>|([+-]?(?:\d*\.\d+|\d+))/g;
  let match: RegExpExecArray | null;
  const parts: string[] = [];
  let lastDisplacement = 0;

  while ((match = tokenRegex.exec(arrayBody)) !== null) {
    if (match[1] !== undefined) {
      // Literal string (...)
      const decoded = decodePdfString(match[1]);
      if (decoded) {
        if ((lastDisplacement <= -40 || lastDisplacement >= 120) && parts.length > 0 && !parts[parts.length - 1].endsWith(' ') && !decoded.startsWith(' ')) {
          parts.push(' ');
        }
        parts.push(decoded);
      }
      lastDisplacement = 0;
    } else if (match[2] !== undefined) {
      // Hex string <...>
      const decoded = decodeHexString(match[2]);
      if (decoded) {
        if ((lastDisplacement <= -40 || lastDisplacement >= 120) && parts.length > 0 && !parts[parts.length - 1].endsWith(' ') && !decoded.startsWith(' ')) {
          parts.push(' ');
        }
        parts.push(decoded);
      }
      lastDisplacement = 0;
    } else if (match[3] !== undefined) {
      lastDisplacement = parseFloat(match[3]);
    }
  }

  return parts.join('').trim();
}

export function segmentGluedWord(token: string): string {
  if (token.length < 5) return token;
  if (COMMON_DICTIONARY.has(token.toLowerCase())) return token;
  if (!/^[a-zA-Z]+$/.test(token)) return token;

  const n = token.length;
  const lower = token.toLowerCase();

  // 1. Exact DP dictionary segmentation
  const dp = new Array(n + 1).fill(-Infinity);
  const parent = new Array(n + 1).fill(-1);
  dp[0] = 0;

  for (let i = 0; i < n; i++) {
    if (dp[i] === -Infinity) continue;
    for (let len = 1; len <= Math.min(30, n - i); len++) {
      const sub = lower.slice(i, i + len);
      if (COMMON_DICTIONARY.has(sub)) {
        const score = dp[i] + (len * len);
        if (score > dp[i + len]) {
          dp[i + len] = score;
          parent[i + len] = i;
        }
      }
    }
  }

  if (dp[n] > 0) {
    const pieces: string[] = [];
    let curr = n;
    while (curr > 0) {
      const prev = parent[curr];
      pieces.unshift(token.slice(prev, curr));
      curr = prev;
    }
    // Reject false-positive segmentation if any two consecutive pieces have length <= 2 (e.g. "at i on")
    let hasConsecutiveShort = false;
    for (let i = 0; i < pieces.length - 1; i++) {
      if (pieces[i].length <= 2 && pieces[i + 1].length <= 2) {
        hasConsecutiveShort = true;
        break;
      }
    }
    if (!hasConsecutiveShort) {
      return pieces.join(' ');
    }
  }

  return token;
}

export function normalizeExtractedText(text: string): string {
  if (!text) return '';

  // 1. Spacing after punctuation when glued immediately to letters
  // Avoid touching decimals (18.75), URLs (https://), DOIs (10.1016/...)
  let normalized = text
    .replace(/,([a-zA-Z])/g, ', $1')
    .replace(/;([a-zA-Z])/g, '; $1')
    .replace(/([a-z])\.([A-Z])/g, '$1. $2')
    .replace(/([!?])([A-Z])/g, '$1 $2');

  // 2. Tokenize and segment glued words
  return normalized
    .split(/\s+/)
    .map((token) => {
      // Don't touch URLs, DOIs, emails, file paths
      if (/^https?:|^doi:|^10\.\d+|[@\/\\#]/i.test(token)) return token;

      const match = token.match(/^([(\[{'\"“‘]*)([a-zA-Z0-9_-]+)([)\]}'\"”’.,;:!?]*)$/);
      if (match) {
        const prefix = match[1];
        const word = match[2];
        const suffix = match[3];
        const segmented = segmentGluedWord(word);
        return prefix + segmented + suffix;
      }
      return token;
    })
    .join(' ');
}

interface PositionedFragment {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

const COMPOUND_PREFIXES = new Set([
  'low', 'high', 'cross', 'state', 'zero', 'multi', 'pre', 'post', 'self',
  'well', 'fine', 'end', 'task', 'domain', 'context', 'evidence', 'open',
  'peer', 'state-of-the', 'large', 'few', 'single', 'full', 'semi'
]);

/**
 * Joins wrapped lines into logical paragraphs.
 * Accurately distinguishes line-wrap hyphens (re-\nsearch -> research) from
 * legitimate compound hyphens (low-resource, state-of-the-art, cross-paper, evidence-grounded).
 */
export function joinParagraphLines(lines: string[]): string {
  let para = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!para) {
      para = line;
      continue;
    }

    if (para.endsWith('-')) {
      const match = para.match(/([a-zA-Z0-9-]+)-$/);
      const nextMatch = line.match(/^([a-zA-Z0-9]+)(.*)/);
      if (match && nextMatch) {
        const prefix = match[1].toLowerCase();
        const nextWord = nextMatch[1];
        const rest = nextMatch[2];
        if (COMPOUND_PREFIXES.has(prefix) || prefix.endsWith('-the') || ['non', 'sub', 'meta'].includes(prefix)) {
          para = para + nextWord + rest; // preserves legitimate hyphen
        } else {
          // Wrapped word line-break hyphen: re- + search -> research
          para = para.slice(0, -1) + nextWord + rest;
        }
        continue;
      }
    }

    para += ' ' + line;
  }
  return para;
}

/**
 * Groups positioned fragments into horizontal lines and sorts by reading order.
 * Handles single-column and academic two-column formats.
 */
function reconstructPageText(fragments: PositionedFragment[]): string {
  if (fragments.length === 0) return '';

  // Check if page has academic 2-column layout (fragments clustered in left and right halves)
  const leftCol = fragments.filter((f) => f.x >= 30 && f.x <= 285 && f.y >= 80 && f.y <= 650);
  const rightCol = fragments.filter((f) => f.x >= 305 && f.x <= 580 && f.y >= 80 && f.y <= 650);
  const isTwoCol = leftCol.length >= 2 && rightCol.length >= 2;

  const groupFragmentsIntoLines = (frags: PositionedFragment[]): string[] => {
    if (frags.length === 0) return [];
    const sorted = [...frags].sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3.5) return yDiff;
      return a.x - b.x;
    });

    const lines: string[] = [];
    let currentLine: PositionedFragment[] = [];
    let currentY = -9999;

    for (const frag of sorted) {
      if (Math.abs(frag.y - currentY) > 3.5) {
        if (currentLine.length > 0) {
          lines.push(currentLine.map((f) => f.text.trim()).filter(Boolean).join(' '));
          currentLine = [];
        }
        currentY = frag.y;
      }
      currentLine.push(frag);
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.map((f) => f.text.trim()).filter(Boolean).join(' '));
    }
    return lines;
  };

  let pageLines: string[] = [];

  if (isTwoCol) {
    const colSplit = 295;
    const maxLeftY = Math.max(...leftCol.map((f) => f.y));
    const maxRightY = Math.max(...rightCol.map((f) => f.y));
    const colTopY = Math.max(maxLeftY, maxRightY) + 2;

    const topBanner = fragments.filter((f) => f.y > colTopY);
    const leftFrags = fragments.filter((f) => f.y <= colTopY && f.x < colSplit);
    const rightFrags = fragments.filter((f) => f.y <= colTopY && f.x >= colSplit);

    pageLines = [
      ...groupFragmentsIntoLines(topBanner),
      ...groupFragmentsIntoLines(leftFrags),
      ...groupFragmentsIntoLines(rightFrags),
    ];
  } else {
    pageLines = groupFragmentsIntoLines(fragments);
  }

  // Convert raw lines into paragraphs
  const paragraphs: string[] = [];
  let currentParaLines: string[] = [];

  for (const line of pageLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParaLines.length > 0) {
        paragraphs.push(joinParagraphLines(currentParaLines));
        currentParaLines = [];
      }
      continue;
    }

    // Check if line is a clear section heading or list item
    const isHeadingOrList = /^(?:\d+[\.\)]|\*|\-|[IVXLCDM]+\.|\b(?:ABSTRACT|INTRODUCTION|RELATED WORK|METHODOLOGY|DATASET|EXPERIMENTS|RESULTS|LIMITATIONS|CONCLUSION|REFERENCES)\b)/i.test(trimmed);
    if (isHeadingOrList && currentParaLines.length > 0) {
      paragraphs.push(joinParagraphLines(currentParaLines));
      currentParaLines = [];
    }

    currentParaLines.push(trimmed);
  }

  if (currentParaLines.length > 0) {
    paragraphs.push(joinParagraphLines(currentParaLines));
  }

  return paragraphs.join('\n\n');
}

/**
 * Robust Native PDF Stream and Flate Decompressor with Text Positioning.
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
      const pageFragments: PositionedFragment[] = [];

      let currentX = 0;
      let currentY = 0;
      let currentFontSize = 11;
      let lineStartX = 0;

      // Tokenize PDF stream commands: BT, ET, Tf, Tm, Td, TD, T*, Tj, ', ", TJ
      const cmdRegex = /(?:BT|ET|\/F\w+\s+([\d.]+)\s+Tf|([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm|([-\d.]+)\s+([-\d.]+)\s+Td|([-\d.]+)\s+([-\d.]+)\s+TD|T\*|\(((?:[^()\\]|\\.)*)\)\s*Tj|<([0-9a-fA-F\s]+)>\s*Tj|\(((?:[^()\\]|\\.)*)\)\s*'|\[([\s\S]*?)\]\s*TJ)/g;

      let opMatch: RegExpExecArray | null;
      while ((opMatch = cmdRegex.exec(rawContent)) !== null) {
        const fullOp = opMatch[0];

        if (fullOp === 'BT') {
          currentX = 0;
          currentY = 0;
          lineStartX = 0;
        } else if (fullOp === 'ET') {
          // End of text block
        } else if (opMatch[1] !== undefined) {
          // Tf: font size
          currentFontSize = parseFloat(opMatch[1]) || 11;
        } else if (opMatch[2] !== undefined) {
          // Tm: text matrix a b c d e f
          currentX = parseFloat(opMatch[6]) || currentX;
          currentY = parseFloat(opMatch[7]) || currentY;
          lineStartX = currentX;
        } else if (opMatch[8] !== undefined) {
          // Td: tx ty (moves relative to start of current line)
          const tx = parseFloat(opMatch[8]) || 0;
          const ty = parseFloat(opMatch[9]) || 0;
          currentX = lineStartX + tx;
          currentY += ty;
          lineStartX = currentX;
        } else if (opMatch[10] !== undefined) {
          // TD: tx ty
          const tx = parseFloat(opMatch[10]) || 0;
          const ty = parseFloat(opMatch[11]) || 0;
          currentX = lineStartX + tx;
          currentY += ty;
          lineStartX = currentX;
        } else if (fullOp === 'T*') {
          currentY -= currentFontSize * 1.2;
          currentX = lineStartX;
        } else if (opMatch[12] !== undefined) {
          // (literal) Tj
          const text = decodePdfString(opMatch[12]).trim();
          if (text) {
            pageFragments.push({ text, x: currentX, y: currentY, fontSize: currentFontSize });
            currentX += text.length * currentFontSize * 0.5;
          }
        } else if (opMatch[13] !== undefined) {
          // <hex> Tj
          const text = decodeHexString(opMatch[13]).trim();
          if (text) {
            pageFragments.push({ text, x: currentX, y: currentY, fontSize: currentFontSize });
            currentX += text.length * currentFontSize * 0.5;
          }
        } else if (opMatch[14] !== undefined) {
          // ' (next line and show)
          currentY -= currentFontSize * 1.2;
          currentX = lineStartX;
          const text = decodePdfString(opMatch[14]).trim();
          if (text) {
            pageFragments.push({ text, x: currentX, y: currentY, fontSize: currentFontSize });
            currentX += text.length * currentFontSize * 0.5;
          }
        } else if (opMatch[15] !== undefined) {
          // [...] TJ (array with displacement kerning)
          const text = parseTjArray(opMatch[15]);
          if (text) {
            pageFragments.push({ text, x: currentX, y: currentY, fontSize: currentFontSize });
            currentX += text.length * currentFontSize * 0.5;
          }
        }
      }

      if (pageFragments.length > 0) {
        const streamText = reconstructPageText(pageFragments);
        if (streamText.length > 0) {
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
    if (streamResult.fullText.trim().length > 0) {
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
    if (!cleanFullText || cleanFullText.length < 2) {
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
        let detectedSection: string | null = null;
        for (const pattern of SECTION_PATTERNS) {
          if (pattern.regex.test(trimmed)) {
            // Standalone or header line check: if longer than 80 chars, must have numbering/colon
            if (trimmed.length > 80 && !/^(?:\d+[\.\)]|[IVXLCDM]+\.?|[-•*]|\w+\s*:)/.test(trimmed)) {
              continue;
            }
            detectedSection = pattern.name;
            break;
          }
        }

        // Strict inline section detection (e.g. "Limitations: Our model...")
        if (!detectedSection && /^(?:(?:\d+[\.\)]|[IVXLCDM]+\.?)\s*)?(?:Limitations?|Threats\s+to\s+validity)\s*[:\-]/i.test(trimmed)) {
          detectedSection = 'Limitations';
        }

        if (detectedSection && detectedSection !== currentSection) {
          if (currentChunkText.trim().length > 30) {
            chunks.push({
              paperId,
              paper_id: paperId,
              pageNumber: page,
              page_number: page,
              sectionName: currentSection,
              section: currentSection,
              chunkIndex: chunkIndex++,
              content: normalizeExtractedText(currentChunkText.trim()),
            });
            currentChunkText = '';
          }
          currentSection = detectedSection;
        }

        currentChunkText += (currentChunkText ? ' ' : '') + trimmed;

        // Break chunks around 600-800 characters
        if (currentChunkText.length >= 700) {
          chunks.push({
            paperId,
            paper_id: paperId,
            pageNumber: page,
            page_number: page,
            sectionName: currentSection,
            section: currentSection,
            chunkIndex: chunkIndex++,
            content: normalizeExtractedText(currentChunkText.trim()),
          });
          currentChunkText = '';
        }
      }

      // Flush remaining page text
      if (currentChunkText.trim().length > 20) {
        chunks.push({
          paperId,
          paper_id: paperId,
          pageNumber: page,
          page_number: page,
          sectionName: currentSection,
          section: currentSection,
          chunkIndex: chunkIndex++,
          content: normalizeExtractedText(currentChunkText.trim()),
        });
      }
    }

    // Safety fallback: if no chunks were created despite having clean text
    if (chunks.length === 0 && cleanFullText.length > 0) {
      chunks.push({
        paperId,
        paper_id: paperId,
        pageNumber: 1,
        page_number: 1,
        sectionName: 'Introduction',
        section: 'Introduction',
        chunkIndex: 0,
        content: normalizeExtractedText(cleanFullText.substring(0, 1200)),
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
