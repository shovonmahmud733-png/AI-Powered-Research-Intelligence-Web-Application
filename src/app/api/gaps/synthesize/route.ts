import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gapAgent } from '@/lib/ai/agents';

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const papers = db.getPapers(projectId);
    const analyses = papers
      .map((p) => db.getAnalysisByPaper(p.id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    const synthesizedGaps = gapAgent.synthesizeGapsFromPapers(papers, analyses);

    // Save synthesized gaps if not already existing
    const existingGaps = db.getGaps(projectId);
    const created = [];
    for (const gap of synthesizedGaps) {
      const exists = existingGaps.some((eg) => eg.title.toLowerCase() === gap.title.toLowerCase());
      if (!exists) {
        db.createGap(gap);
        created.push(gap);
      }
    }

    return NextResponse.json({
      success: true,
      synthesizedCount: created.length,
      gaps: db.getGaps(projectId),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
