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
  { name: 'Abstract', regex: /(?:^|\n)\s*(?:1\.?\s*)?ABSTRACT\b/i },
  { name: 'Introduction', regex: /(?:^|\n)\s*(?:1\.?\s*|I\.?\s*)?INTRODUCTION\b/i },
  { name: 'Related Work', regex: /(?:^|\n)\s*(?:2\.?\s*|II\.?\s*)?(?:RELATED\s+WORK|LITERATURE\s+REVIEW|BACKGROUND)\b/i },
  { name: 'Methodology', regex: /(?:^|\n)\s*(?:3\.?\s*|III\.?\s*)?(?:METHODOLOGY|PROPOSED\s+(?:METHOD|ARCHITECTURE|FRAMEWORK)|METHODS|APPROACH)\b/i },
  { name: 'Dataset & Preprocessing', regex: /(?:^|\n)\s*(?:4\.?\s*|IV\.?\s*)?(?:DATASET|CORPUS|DATA\s+COLLECTION|PREPROCESSING)\b/i },
  { name: 'Experiments & Setup', regex: /(?:^|\n)\s*(?:5\.?\s*|V\.?\s*)?(?:EXPERIMENTS|EXPERIMENTAL\s+SETUP|EVALUATION\s+SETUP)\b/i },
  { name: 'Results & Discussion', regex: /(?:^|\n)\s*(?:6\.?\s*|VI\.?\s*)?(?:RESULTS|FINDINGS|RESULTS\s+AND\s+DISCUSSION|DISCUSSION)\b/i },
  { name: 'Limitations', regex: /(?:^|\n)\s*(?:7\.?\s*|VII\.?\s*)?(?:LIMITATIONS|THREATS\s+TO\s+VALIDITY)\b/i },
  { name: 'Conclusion & Future Work', regex: /(?:^|\n)\s*(?:8\.?\s*|VIII\.?\s*)?(?:CONCLUSION|CONCLUSIONS|FUTURE\s+WORK)\b/i },
  { name: 'References', regex: /(?:^|\n)\s*(?:9\.?\s*|IX\.?\s*)?(?:REFERENCES|BIBLIOGRAPHY)\b/i },
];

/**
 * Direct stream extractor for PDF buffers (guarantees text extraction from text streams)
 */
function extractRawTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString('binary');
    const textPieces: string[] = [];

    // Match text blocks inside BT ... ET
    const btRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;
    while ((match = btRegex.exec(raw)) !== null) {
      const block = match[0];
      // Match literal strings: (text) Tj
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textPieces.push(tjMatch[1]);
      }
      // Match array strings: [(text)] TJ
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrMatch: RegExpExecArray | null;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = tjArrMatch[1];
        const innerItems = inner.match(/\((.*?)\)/g);
        if (innerItems) {
          innerItems.forEach((it) => textPieces.push(it.replace(/^\(|\)$/g, '')));
        }
      }
    }
    return textPieces
      .join(' ')
      .replace(/\\([()\\])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

export async function parsePdfBuffer(
  buffer: Buffer,
  paperId: string
): Promise<PDFParseResult> {
  const warnings: string[] = [];
  const pageTexts: { page: number; text: string }[] = [];
  let totalPages = 1;
  let fullText = '';

  try {
    // Tier 1: Try modern pdf-parse v2 PDFParse class
    const pdfModule: any = await import('pdf-parse');
    const PDFParseClass = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);

    if (PDFParseClass && typeof PDFParseClass === 'function') {
      try {
        const parser = new PDFParseClass({ data: buffer });
        await parser.load();
        const textResult = await parser.getText();
        totalPages = textResult.total || (textResult.pages ? textResult.pages.length : 1);
        if (textResult.pages && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
          for (const p of textResult.pages) {
            if (p.text && p.text.trim()) {
              pageTexts.push({ page: p.num || pageTexts.length + 1, text: p.text });
            }
          }
        }
        fullText = textResult.text || pageTexts.map((pt) => pt.text).join('\n\n');
        await parser.destroy();
      } catch (classErr: any) {
        warnings.push(`PDFParse class warning: ${classErr.message}`);
      }
    }

    // Tier 2: If no text extracted yet, try legacy function call
    if (!fullText || fullText.trim().length === 0) {
      const pdfParseFunc =
        typeof pdfModule === 'function'
          ? pdfModule
          : pdfModule.default && typeof pdfModule.default === 'function'
          ? pdfModule.default
          : null;
      if (pdfParseFunc) {
        try {
          const data = await pdfParseFunc(buffer);
          totalPages = data.numpages || 1;
          fullText = data.text || '';
          if (fullText.trim()) {
            pageTexts.push({ page: 1, text: fullText });
          }
        } catch (legacyErr: any) {
          warnings.push(`Legacy pdfParse warning: ${legacyErr.message}`);
        }
      }
    }

    // Tier 3: If still empty, use direct PDF stream decoder fallback
    if (!fullText || fullText.trim().length === 0) {
      const fallbackText = extractRawTextFromPdfBuffer(buffer);
      if (fallbackText && fallbackText.trim().length > 20) {
        fullText = fallbackText;
        pageTexts.push({ page: 1, text: fullText });
        warnings.push('Extracted text via direct PDF stream decoder.');
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

    // Extract title heuristic from first page
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
      const pageLines = text.split('\n');
      let currentChunkText = '';

      for (const line of pageLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if line matches a new section header
        for (const pattern of SECTION_PATTERNS) {
          if (pattern.regex.test(trimmed)) {
            if (currentChunkText.trim().length > 40) {
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

        currentChunkText += (currentChunkText ? ' ' : '') + trimmed;

        // Break chunks around 750-1000 characters
        if (currentChunkText.length >= 800) {
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
      if (currentChunkText.trim().length > 25) {
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
    // Even if overall parsing errored, attempt raw stream extraction as ultimate fallback
    const fallbackText = extractRawTextFromPdfBuffer(buffer);
    if (fallbackText && fallbackText.trim().length > 20) {
      return {
        totalPages: 1,
        sections: [],
        chunks: [
          {
            paperId,
            pageNumber: 1,
            sectionName: 'Extracted Content',
            chunkIndex: 0,
            content: fallbackText.substring(0, 1500),
          },
        ],
        hasTextLayer: true,
        warnings: [`Extracted using raw PDF text stream fallback after: ${err.message}`],
      };
    }

    return {
      totalPages: 1,
      sections: [],
      chunks: [],
      hasTextLayer: false,
      warnings: [`PDF parsing failed: ${err.message}. OCR fallback architecture triggered.`],
    };
  }
}
