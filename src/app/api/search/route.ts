import { NextResponse } from 'next/server';
import { scholarlySearch } from '@/lib/scholarly';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const author = url.searchParams.get('author') || undefined;
    const doi = url.searchParams.get('doi') || undefined;
    const yearStr = url.searchParams.get('year');
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const openAccessOnly = url.searchParams.get('openAccess') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '15', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const projectId = url.searchParams.get('projectId') || undefined;

    // Fetch project context if available to power transparent relevance engine
    let projectContext: any = undefined;
    if (projectId) {
      const project = db.getProjectById(projectId);
      if (project) {
        projectContext = {
          field: project.researchField,
          questions: project.researchQuestions?.map((q) => q.question) || [],
          objectives: project.objectives || [],
          tags: project.tags || [],
        };
      }
    }

    if (!query && !author && !doi) {
      return NextResponse.json({
        papers: [],
        total: 0,
        source: 'Awaiting query parameters',
      });
    }

    const result = await scholarlySearch.search({
      query,
      author,
      doi,
      year,
      openAccessOnly,
      limit,
      offset,
      projectContext,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scholarly search encountered an error' }, { status: 500 });
  }
}
