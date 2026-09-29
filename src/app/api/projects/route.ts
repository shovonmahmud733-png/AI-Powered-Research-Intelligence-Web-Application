import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: Request) {
  const user = getSessionUser(req);
  const userId = user ? user.id : 'usr_demo_researcher_01';
  const projects = db.getProjects(userId);

  // Enrich with stats
  const enriched = projects.map((p) => {
    const papers = db.getPapers(p.id);
    const evidence = db.getEvidence(p.id);
    const gaps = db.getGaps(p.id);
    const experiments = db.getExperiments(p.id);
    const notes = db.getNotes(p.id);

    return {
      ...p,
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
    const userId = user ? user.id : 'usr_demo_researcher_01';
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
    }

    const newProject = db.createProject({
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: body.title,
      description: body.description || '',
      researchField: body.researchField || 'Interdisciplinary Sciences',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
