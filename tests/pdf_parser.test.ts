import { describe, it, expect } from 'vitest';
import { parsePdfBuffer } from '../src/lib/pdf/parser';

describe('PDF Parser Unit Tests', () => {
  it('should parse PDF buffer and extract pages and chunks without DOMMatrix error', async () => {
    // Generate valid test PDF stream in memory
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
});
