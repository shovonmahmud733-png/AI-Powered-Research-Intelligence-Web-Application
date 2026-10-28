import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { getSessionUser } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = db.getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Research project not found' }, { status: 404 });
  }

  const user = getSessionUser(req);
  const userId = user?.id;

  // Authorization check: User can access if they own the project or if it's the public demo project
  if (!db.isProjectAccessible(id, userId)) {
    return NextResponse.json(
      { error: 'Forbidden: Access denied to this private research project' },
      { status: 403 }
    );
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
      isOwner: user ? project.userId === user.id : project.isDemo,
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
    const project = db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const user = getSessionUser(req, { allowDemoFallback: false });
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Strict ownership verification: cannot modify someone else's project
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify this research project' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Prevent tampering with project ID or owner ID
    const updates: any = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.researchField !== undefined) updates.researchField = String(body.researchField).trim();
    if (body.status !== undefined) updates.status = body.status;
    if (Array.isArray(body.researchQuestions)) updates.researchQuestions = body.researchQuestions;
    if (Array.isArray(body.objectives)) updates.objectives = body.objectives;
    if (Array.isArray(body.tags)) updates.tags = body.tags;

    const updated = db.updateProject(id, updates);
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
  const project = db.getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const user = getSessionUser(req, { allowDemoFallback: false });
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Strict ownership verification
  if (project.userId !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to delete this research project' },
      { status: 403 }
    );
  }

  if (project.isDemo) {
    return NextResponse.json(
      { error: 'The demo research project cannot be deleted' },
      { status: 400 }
    );
  }

  const success = db.deleteProject(id);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: 'Project and all associated data deleted successfully' });
}
