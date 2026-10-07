import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verificationAgent } from '@/lib/ai/agents';

export async function POST(req: Request) {
  try {
    const { projectId, claim, paperId } = await req.json();

    if (!claim || typeof claim !== 'string') {
      return NextResponse.json({ error: 'claim string is required' }, { status: 400 });
    }

    // Get chunks available for the specified paper or project
    const chunks = paperId
      ? db.getChunksByPaper(paperId)
      : projectId
      ? db.getChunksByProject(projectId)
      : [];

    const result = await verificationAgent.verifyClaim(claim, chunks);
    result.projectId = projectId || '';

    // If source paper found, enrich with title and authors
    if (result.sourcePaperId) {
      const paper = db.getPaperById(result.sourcePaperId);
      if (paper) {
        result.sourcePaperTitle = paper.title;
        (result as any).sourcePaperAuthors = paper.authors;
        (result as any).sourcePaperYear = paper.publicationYear;
        (result as any).sourcePaperDoi = paper.doi;
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
