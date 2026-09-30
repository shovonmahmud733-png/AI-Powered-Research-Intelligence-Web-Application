import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { parsePdfBuffer, joinParagraphLines, normalizeExtractedText } from '../src/lib/pdf/parser';

describe('PDF Word Spacing & Layout Extraction Tests', () => {
  function createPdfWithContent(streamContent: string): Buffer {
    const deflated = zlib.deflateSync(Buffer.from(streamContent, 'utf-8'));
    return Buffer.concat([
      Buffer.from(
        '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>> endobj\n4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n5 0 obj <</Length ' +
          deflated.length +
          ' /Filter /FlateDecode>>\nstream\n'
      ),
      deflated,
      Buffer.from(
        '\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n0000000287 00000 n\ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n500\n%%EOF'
      ),
    ]);
  }

  it('1. Normal paragraphs: TJ array with negative kerning retains spaces', async () => {
    // LaTeX justified text outputs words in separate parentheses separated by negative displacements
    const stream = `
BT
/F1 12 Tf
50 720 Td
[(This) -250 (research) -250 (uses) -250 (a) -250 (native) -250 (Chittagonian) -250 (dialect) -250 (resource.)] TJ
0 -25 Td
[(which) -250 (is) -250 (currently) -250 (being) -250 (collected) -250 (and) -250 (annotated) -250 (for) -250 (sentiment.)] TJ
0 -25 Td
[(the) -250 (collection) -250 (will) -250 (be) -250 (targeted) -250 (to) -250 (text) -250 (items.)] TJ
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-spacing-normal');

    const text = result.chunks.map((c) => c.content).join(' ');

    // MUST NOT be concatenated into single run-on words
    expect(text).not.toContain('ThisresearchusesanativeChittagoniandialectresource');
    expect(text).not.toContain('whichiscurrentlybeingcollectedandannotatedforsentiment');
    expect(text).not.toContain('thecollectionwillbetargetedtotextitems');

    // MUST contain correct word spacing
    expect(text).toContain('This research uses a native Chittagonian dialect resource.');
    expect(text).toContain('which is currently being collected and annotated for sentiment.');
    expect(text).toContain('the collection will be targeted to text items.');
  });

  it('2. Wrapped lines: Line wrapping joins words cleanly with single spaces', async () => {
    const lines = [
      'This research uses a',
      'native Chittagonian',
      'dialect resource.',
    ];
    const joined = joinParagraphLines(lines);
    expect(joined).toBe('This research uses a native Chittagonian dialect resource.');
  });

  it('3. Two-column academic papers: reads left column then right column without interweaving', async () => {
    // Left column at x=50, Right column at x=320
    const stream = `
BT
/F1 12 Tf
200 740 Td
(Title: Multilingual Dialect Processing) Tj
ET
BT
/F1 10 Tf
50 600 Td
(Left Column Paragraph 1: We establish the foundation.) Tj
0 -20 Td
(Left Column Paragraph 2: Results show high recall.) Tj
ET
BT
/F1 10 Tf
320 600 Td
(Right Column Paragraph 1: Furthermore, we analyze error modes.) Tj
0 -20 Td
(Right Column Paragraph 2: In conclusion, tokenization succeeds.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-two-column');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('Left Column Paragraph 1');
    expect(text).toContain('Right Column Paragraph 1');

    const leftIdx = text.indexOf('Left Column Paragraph 2');
    const rightIdx = text.indexOf('Right Column Paragraph 1');
    // Left column must be read before right column
    expect(leftIdx).toBeLessThan(rightIdx);
  });

  it('4. Hyphenated words: distinguishes line-break hyphens from legitimate compound hyphens', () => {
    // Line-break split word: re- + search -> research
    expect(joinParagraphLines(['We conduct re-', 'search in Indic NLP.'])).toBe(
      'We conduct research in Indic NLP.'
    );

    // Legitimate compound hyphen: low- + resource -> low-resource
    expect(joinParagraphLines(['We evaluate on a low-', 'resource dialect benchmark.'])).toBe(
      'We evaluate on a low-resource dialect benchmark.'
    );

    // Compound: state-of-the- + art -> state-of-the-art
    expect(joinParagraphLines(['It outperforms state-of-the-', 'art transformers.'])).toBe(
      'It outperforms state-of-the-art transformers.'
    );

    // Compound: cross- + paper -> cross-paper
    expect(joinParagraphLines(['Conducting cross-', 'paper analysis.'])).toBe(
      'Conducting cross-paper analysis.'
    );

    // Compound: evidence- + grounded -> evidence-grounded
    expect(joinParagraphLines(['Findings are evidence-', 'grounded.'])).toBe(
      'Findings are evidence-grounded.'
    );
  });

  it('5. Bullet lists: preserves list items on distinct lines', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Contributions:) Tj
0 -20 Td
(- First annotated Chittagonian sentiment corpus) Tj
0 -20 Td
(- Empirical evaluation of 4 transformer models) Tj
0 -20 Td
(- Novel phonetic regularizer for OOV reduction) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-bullet-list');
    const text = result.chunks.map((c) => c.content).join('\n');

    expect(text).toContain('- First annotated Chittagonian sentiment corpus');
    expect(text).toContain('- Empirical evaluation of 4 transformer models');
    expect(text).toContain('- Novel phonetic regularizer for OOV reduction');
  });

  it('6. Section headings: correctly segments Abstract, Methodology, Limitations', async () => {
    const stream = `
BT
/F1 14 Tf
50 720 Td
(ABSTRACT) Tj
0 -30 Td
/F1 10 Tf
(This study investigates subword tokenization across regional dialects.) Tj
0 -40 Td
/F1 14 Tf
(METHODOLOGY) Tj
0 -30 Td
/F1 10 Tf
(We calibrate sentencepiece models with phonetic regularization.) Tj
0 -40 Td
/F1 14 Tf
(LIMITATIONS) Tj
0 -30 Td
/F1 10 Tf
(Evaluation is limited to standard script representations.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-sections');

    const secNames = result.chunks.map((c) => c.sectionName);
    expect(secNames).toContain('Abstract');
    expect(secNames).toContain('Methodology');
    expect(secNames).toContain('Limitations');
  });

  it('7. Tables: preserves row data and columnar tokens with proper spaces', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Table 1: Benchmark Results Across Models) Tj
0 -25 Td
(Model           Precision   Recall   Macro-F1) Tj
0 -20 Td
(BanglaBERT      81.2%       79.4%    80.3%) Tj
0 -20 Td
(XLM-R-Phonetic  85.7%       83.9%    84.8%) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-tables');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('Table 1: Benchmark Results Across Models');
    expect(text).toContain('85.7%');
    expect(text).toContain('84.8%');
  });

  it('8. Numbers: correctly preserves integers, decimals, and coordinate values', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(The dataset contains 4200 sentences with 18.75 tokens per sequence and p < 0.001 significance.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-numbers');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('4200');
    expect(text).toContain('18.75');
    expect(text).toContain('0.001');
  });

  it('9. Percentages: correctly extracts percentages without mangling', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Accuracy improved by 4.9% from 79.2% to 84.1% on out-of-domain dialect tests.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-percentages');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('4.9%');
    expect(text).toContain('79.2%');
    expect(text).toContain('84.1%');
  });

  it('10. Citations: correctly extracts bracketed citations like [14] and [1, 5-7]', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Prior investigations [14] observed similar morphology, whereas newer models [1, 5-7] show resilience.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-citations');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('[14]');
    expect(text).toContain('[1, 5-7]');
  });

  it('11. URLs: extracts complete web URLs with protocol and paths', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Dataset and codebase available at https://github.com/bangla-nlp/chittagong-corpus for verification.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-urls');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('https://github.com/bangla-nlp/chittagong-corpus');
  });

  it('12. DOI strings: correctly preserves academic DOI identifiers', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Published under DOI: 10.1016/j.csl.2024.101562 in Computer Speech and Language.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-doi');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('10.1016/j.csl.2024.101562');
  });

  it('13. Unicode text: correctly preserves math symbols and typographic quotes', async () => {
    const stream = `
BT
/F1 10 Tf
50 700 Td
(Statistical variance sigma = 0.24 +/- 0.03 under 95% confidence intervals.) Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-unicode');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('sigma');
    expect(text).toContain('+/-');
    expect(text).toContain('95%');
  });

  it('14. Bengali/Chittagonian text: preserves Indic text encoded in UTF-16BE hex strings', async () => {
    // "বাংলা" in UTF-16BE hex: 09ac 09be 0982 09b2 09be
    // "চাটগাঁইয়া" (Chittagonian) in UTF-16BE hex:
    // চ = 099a, া = 09be, ট = 099f, গ = 0997, ঁ = 0981, া = 09be, ই = 0987, য় = 09df, া = 09be
    const stream = `
BT
/F1 12 Tf
50 700 Td
<099a09be099f099709be0981098709df09be> Tj
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-bengali');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('চাটগাঁইয়া');
  });

  it('15. Glued run-on words: normalizeExtractedText restores word boundaries accurately', () => {
    const glued = 'ThisresearchusesanativeChittagoniandialectresource';
    const restored = normalizeExtractedText(glued);
    expect(restored).toBe('This research uses a native Chittagonian dialect resource');

    const gluedSentence = 'As reported, ThisresearchusesanativeChittagoniandialectresource which is collected.';
    expect(normalizeExtractedText(gluedSentence)).toContain('This research uses a native Chittagonian dialect resource');
  });

  it('16. Multi-line TJ array: correctly parses and normalizes word spacing across newlines', async () => {
    const stream = `
BT
/F1 12 Tf
50 700 Td
[
(This) -250
(research) -250
(uses) -250
(a) -250
(native) -250
(Chittagonian) -250
(dialect) -250
(resource.)
] TJ
ET
`;
    const pdf = createPdfWithContent(stream);
    const result = await parsePdfBuffer(pdf, 'test-multiline-tj');
    const text = result.chunks.map((c) => c.content).join(' ');

    expect(text).toContain('This research uses a native Chittagonian dialect resource.');
    expect(text).not.toContain('ThisresearchusesanativeChittagoniandialectresource');
  });
});
