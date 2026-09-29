import { describe, it, expect } from 'vitest';
import { parsePdfBuffer } from '../src/lib/pdf/parser';
import fs from 'fs';

describe('PDF Parser Unit Tests', () => {
  it('should parse PDF buffer and extract pages and chunks without DOMMatrix error', async () => {
    // Read the sample_paper.pdf we generated
    const buffer = fs.readFileSync('sample_paper.pdf');
    const result = await parsePdfBuffer(buffer, 'test-paper-100');

    expect(result.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.hasTextLayer).toBe(true);

    const fullContent = result.chunks.map((c) => c.content).join(' ');
    expect(fullContent.toLowerCase()).toContain('limitation');
  });
});
