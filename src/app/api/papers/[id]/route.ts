import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paper = db.getPaperById(id);
  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
  }

  const analysis = db.getAnalysisByPaper(id);
  const chunks = db.getChunksByPaper(id);

  return NextResponse.json({
    paper,
    analysis,
    chunksCount: chunks.length,
    chunksSummary: chunks.map((c) => ({
      id: c.id,
      pageNumber: c.pageNumber,
      sectionName: c.sectionName,
      length: c.content.length,
    })),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = db.updatePaper(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }
    return NextResponse.json({ paper: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();
    db.deletePaper(cleanId);
    return NextResponse.json({ success: true, deletedId: cleanId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
