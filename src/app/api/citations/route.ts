import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CitationStyle, formatCitation } from '@/lib/citations/formatters';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paperId = url.searchParams.get('paperId');
  const projectId = url.searchParams.get('projectId');
  const style = (url.searchParams.get('style') as CitationStyle) || 'apa7';

  if (paperId) {
    const paper = db.getPaperById(paperId);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const citations = {
      apa7: formatCitation(paper, 'apa7'),
      ieee: formatCitation(paper, 'ieee'),
      mla: formatCitation(paper, 'mla'),
      chicago: formatCitation(paper, 'chicago'),
      harvard: formatCitation(paper, 'harvard'),
      bibtex: formatCitation(paper, 'bibtex'),
      ris: formatCitation(paper, 'ris'),
    };

    return NextResponse.json({ paperId, paperTitle: paper.title, citations, requestedStyleCitation: citations[style] });
  }

  if (projectId) {
    const papers = db.getPapers(projectId);
    const formatted = papers.map((p) => ({
      paperId: p.id,
      title: p.title,
      citation: formatCitation(p, style),
    }));

    // Combined BibTeX or RIS bundle
    let bundle = '';
    if (style === 'bibtex' || style === 'ris') {
      bundle = papers.map((p) => formatCitation(p, style)).join('\n\n');
    }

    return NextResponse.json({
      projectId,
      style,
      count: papers.length,
      citations: formatted,
      bundle: bundle || undefined,
    });
  }

  return NextResponse.json({ error: 'Either paperId or projectId must be provided' }, { status: 400 });
}
