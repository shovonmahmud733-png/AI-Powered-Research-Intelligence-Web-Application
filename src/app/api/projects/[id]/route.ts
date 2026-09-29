import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = db.getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Research project not found' }, { status: 404 });
  }

  const papers = db.getPapers(id);
  const evidence = db.getEvidence(id);
  const gaps = db.getGaps(id);
  const experiments = db.getExperiments(id);
  const notes = db.getNotes(id);
  const memory = db.getMemory(id);
  const contradictions = db.getContradictions(id);

  return NextResponse.json({
    project: {
      ...project,
      stats: {
        paperCount: papers.length,
        evidenceCount: evidence.length,
        gapCount: gaps.length,
        questionCount: project.researchQuestions?.length || 0,
        experimentCount: experiments.length,
        noteCount: notes.length,
        memoryCount: memory.length,
        contradictionCount: contradictions.length,
      },
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = db.updateProject(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ project: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = db.deleteProject(id);
  if (!success) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
