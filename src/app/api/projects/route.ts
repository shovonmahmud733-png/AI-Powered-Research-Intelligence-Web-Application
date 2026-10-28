import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ownedOnly = url.searchParams.get('ownedOnly') === 'true';

  const user = getSessionUser(req);
  const userId = user ? user.id : 'usr_demo_researcher_01';

  let projects = ownedOnly && user
    ? db.getUserProjects(userId)
    : db.getProjects(userId);

  // Enrich with stats
  const enriched = projects.map((p) => {
    const papers = db.getPapers(p.id);
    const evidence = db.getEvidence(p.id);
    const gaps = db.getGaps(p.id);
    const experiments = db.getExperiments(p.id);
    const notes = db.getNotes(p.id);

    return {
      ...p,
      isOwner: user ? p.userId === user.id : p.isDemo,
      stats: {
        paperCount: papers.length,
        evidenceCount: evidence.length,
        gapCount: gaps.length,
        questionCount: p.researchQuestions?.length || 0,
        experimentCount: experiments.length,
        noteCount: notes.length,
      },
    };
  });

  return NextResponse.json({ projects: enriched });
}

export async function POST(req: Request) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to create a project' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
    }

    const newProject = db.createProject({
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id, // Strictly bind to authenticated user session
      title: body.title.trim(),
      description: body.description?.trim() || '',
      researchField: body.researchField?.trim() || 'Interdisciplinary Sciences',
      researchQuestions: Array.isArray(body.researchQuestions)
        ? body.researchQuestions.map((q: any, i: number) => ({
            id: `rq-${Date.now()}-${i}`,
            question: typeof q === 'string' ? q : q.question,
            status: q.status || 'active',
            notes: q.notes,
          }))
        : [],
      objectives: Array.isArray(body.objectives) ? body.objectives : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
