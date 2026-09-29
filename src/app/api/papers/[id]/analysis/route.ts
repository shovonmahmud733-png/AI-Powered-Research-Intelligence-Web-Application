import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractionAgent } from '@/lib/ai/agents';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysis = db.getAnalysisByPaper(id);
  if (!analysis) {
    return NextResponse.json({ error: 'No structured analysis exists yet for this paper' }, { status: 404 });
  }
  return NextResponse.json({ analysis });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paper = db.getPaperById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    let chunks = db.getChunksByPaper(id);
    if (chunks.length === 0) {
      chunks = [
        {
          id: `virtual-${id}-1`,
          paperId: id,
          pageNumber: 1,
          sectionName: 'Abstract',
          chunkIndex: 0,
          content: paper.abstract,
        },
      ];
    }

    const analysis = await extractionAgent.extractStructuredAnalysis(id, paper.title, chunks);
    db.saveAnalysis(analysis);

    return NextResponse.json({ analysis });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
