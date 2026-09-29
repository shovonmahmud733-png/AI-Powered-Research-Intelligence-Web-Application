import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { parsePdfBuffer } from '../src/lib/pdf/parser';

describe('PDF Parser Unit Tests', () => {
  it('1. should parse standard uncompressed PDF stream and extract chunks', async () => {
    const pdfStr =
      '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>> endobj\n4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n5 0 obj <</Length 145>> stream\nBT\n/F1 14 Tf\n50 700 Td\n(Title: Limitations of Neural Transformers in Dialectal NLP) Tj\n0 -30 Td\n(Limitations: The main limitation is high subword fragmentation on dialectal morphemes.) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n0000000287 00000 n\ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n484\n%%EOF';

    const buffer = Buffer.from(pdfStr, 'utf-8');
    const result = await parsePdfBuffer(buffer, 'test-paper-100');

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.hasTextLayer).toBe(true);

    const fullContent = result.chunks.map((c) => c.content).join(' ');
    expect(fullContent.toLowerCase()).toContain('limitation');
  });

  it('2. should decompress FlateDecode compressed streams (like IEEE LaTeX papers) and extract text & limitations', async () => {
    const contentStream = `
BT
/F1 12 Tf
50 720 Td
[(IEEE) 20 (for) 20 (journals) 20 (template) 20 (with) 20 (bibtex) 20 (example) 20 (files) 20 (included)] TJ
0 -30 Td
(Abstract: This document serves as a template for preparing IEEE journal manuscripts.) Tj
0 -30 Td
(Methodology: Experiments are conducted across multiple compute clusters with PyTorch baselines.) Tj
0 -30 Td
(Limitations: High computational cost of transformer pretraining and limited GPU VRAM restrict the batch size to 16 samples per accelerator.) Tj
ET
`;

    const deflated = zlib.deflateSync(Buffer.from(contentStream, 'utf-8'));
    const pdf = Buffer.concat([
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

    const result = await parsePdfBuffer(pdf, 'test-paper-ieee');

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.hasTextLayer).toBe(true);

    const fullContent = result.chunks.map((c) => c.content).join(' ');
    expect(fullContent.toLowerCase()).toContain('ieee');
    expect(fullContent.toLowerCase()).toContain('limitations');
    expect(fullContent.toLowerCase()).toContain('gpu vram');

    const limChunk = result.chunks.find(
      (c) => c.sectionName === 'Limitations' || c.content.toLowerCase().includes('limitation')
    );
    expect(limChunk).toBeDefined();
    expect(limChunk?.content.toLowerCase()).toContain('vram');
  });
});
