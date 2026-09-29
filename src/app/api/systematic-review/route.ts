import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SystematicReviewItem } from '@/lib/db/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const reviewItems = db.getSystematicReview(projectId);
  const papers = db.getPapers(projectId);

  // Synchronize with any papers not yet in review workflow
  const existingPaperIds = new Set(reviewItems.map((r) => r.paperId));
  for (const paper of papers) {
    if (!existingPaperIds.has(paper.id)) {
      const newItem: SystematicReviewItem = {
        id: `sr-${paper.id}`,
        projectId,
        paperId: paper.id,
        paperTitle: paper.title,
        screeningStatus: 'unscreened',
        criteriaMatches: {
          'Thematic Alignment': true,
          'Empirical Methodology': true,
        },
        fullTextReviewed: false,
      };
      db.saveSystematicReviewItem(newItem);
      reviewItems.push(newItem);
    }
  }

  // PRISMA Counts
  const stats = {
    totalIdentified: papers.length,
    unscreened: reviewItems.filter((i) => i.screeningStatus === 'unscreened').length,
    included: reviewItems.filter((i) => i.screeningStatus === 'included').length,
    excluded: reviewItems.filter((i) => i.screeningStatus === 'excluded').length,
    fullTextReviewed: reviewItems.filter((i) => i.fullTextReviewed).length,
  };

  return NextResponse.json({ items: reviewItems, stats });
}

export async function POST(req: Request) {
  try {
    const item = await req.json();
    if (!item.projectId || !item.paperId) {
      return NextResponse.json({ error: 'projectId and paperId are required' }, { status: 400 });
    }

    const saved = db.saveSystematicReviewItem(item);
    return NextResponse.json({ item: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
