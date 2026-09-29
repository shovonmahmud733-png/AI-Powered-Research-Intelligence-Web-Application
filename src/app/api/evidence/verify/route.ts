import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verificationAgent } from '@/lib/ai/agents';

export async function POST(req: Request) {
  try {
    const { projectId, claim } = await req.json();

    if (!claim || typeof claim !== 'string') {
      return NextResponse.json({ error: 'claim string is required' }, { status: 400 });
    }

    // Get all chunks available for the project
    const chunks = projectId ? db.getChunksByProject(projectId) : [];

    const result = await verificationAgent.verifyClaim(claim, chunks);
    result.projectId = projectId || '';

    // If source paper found, enrich with title
    if (result.sourcePaperId) {
      const paper = db.getPaperById(result.sourcePaperId);
      if (paper) {
        result.sourcePaperTitle = paper.title;
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
