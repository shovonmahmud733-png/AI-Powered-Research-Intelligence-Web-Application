import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeDraftForMissingCitations } from '@/lib/citations/detector';

export async function POST(req: Request) {
  try {
    const { projectId, draftText } = await req.json();

    if (!draftText || typeof draftText !== 'string') {
      return NextResponse.json({ error: 'draftText is required' }, { status: 400 });
    }

    const papers = projectId ? db.getPapers(projectId) : [];
    const chunks = projectId ? db.getChunksByProject(projectId) : [];

    const analysis = analyzeDraftForMissingCitations(draftText, papers, chunks);

    const totalParagraphs = analysis.length;
    const requiringCitations = analysis.filter((p) => p.needsCitation).length;

    return NextResponse.json({
      totalParagraphs,
      requiringCitations,
      paragraphs: analysis,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
