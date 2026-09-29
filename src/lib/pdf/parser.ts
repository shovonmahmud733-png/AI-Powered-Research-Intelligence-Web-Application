import { DocumentChunk } from '../db/types';

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

export async function parsePdfBuffer(
  buffer: Buffer,
  paperId: string
): Promise<PDFParseResult> {
  const warnings: string[] = [];

  try {
    // Dynamic import to handle SSR / edge safe execution
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    // Custom page extractor if supported
    const pageTexts: { page: number; text: string }[] = [];
    let pageCounter = 1;

    const data = await pdfParse(buffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === null) {
              text += item.str + ' ';
            } else {
              text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }
          const currPage = pageCounter++;
          pageTexts.push({ page: currPage, text });
          return text;
        });
      },
    });

    const totalPages = data.numpages || pageTexts.length || 1;
    const fullText = data.text || '';

    if (!fullText || fullText.trim().length < 50) {
      warnings.push(
        'Warning: PDF document contains minimal or no extractable text. Document appears to be a scanned bitmap or restricted. OCR fallback layer recommended for complete extraction.'
      );
      return {
        totalPages: totalPages || 1,
        sections: [],
        chunks: [],
        hasTextLayer: false,
        warnings,
      };
    }

    // Attempt to extract title from first page
    const firstPageText = pageTexts.length > 0 ? pageTexts[0].text : fullText.substring(0, 2000);
    const lines = firstPageText
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const possibleTitle = lines.slice(0, 3).join(' ').substring(0, 200);

    // Section Detection and Page Mapping
    const sections: ExtractedSection[] = [];
    const chunks: Omit<DocumentChunk, 'id'>[] = [];
    let currentSection = 'Introduction';
    let chunkIndex = 0;

    // Process page by page
    const pagesToProcess = pageTexts.length > 0 ? pageTexts : [{ page: 1, text: fullText }];

    for (const { page, text } of pagesToProcess) {
      const pageLines = text.split('\n');
      let currentChunkText = '';

      for (const line of pageLines) {
        const trimmed = line.trim();

        // Check if line matches a new section header
        for (const pattern of SECTION_PATTERNS) {
          if (pattern.regex.test(trimmed)) {
            // Flush existing chunk
            if (currentChunkText.trim().length > 80) {
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

        currentChunkText += ' ' + trimmed;

        // Split chunk if it exceeds reasonable paragraph length (~1200 characters)
        if (currentChunkText.length >= 1000) {
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

      // Flush remainder of page
      if (currentChunkText.trim().length > 50) {
        chunks.push({
          paperId,
          pageNumber: page,
          sectionName: currentSection,
          chunkIndex: chunkIndex++,
          content: currentChunkText.trim(),
        });
      }
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
      warnings: [`PDF parsing failed: ${err.message}. OCR fallback architecture triggered.`],
    };
  }
}
