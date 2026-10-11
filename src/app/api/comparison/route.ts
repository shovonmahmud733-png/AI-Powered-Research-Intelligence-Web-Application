import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { PaperComparisonItem, PaperComparisonSynthesis } from '../../../lib/db/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paperIds, projectId } = body;

    if (!Array.isArray(paperIds) || paperIds.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 papers for multi-paper comparative analysis' },
        { status: 400 }
      );
    }

    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(paperIds));
    const papers = uniqueIds
      .map((id: string) => db.getPaperById(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    if (papers.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid papers must be found in the workspace database for comparative synthesis' },
        { status: 400 }
      );
    }

    const effectiveProjectId = projectId || papers[0].projectId;
    const allEvidence = effectiveProjectId ? db.getEvidence(effectiveProjectId) : [];
    const allGaps = effectiveProjectId ? db.getGaps(effectiveProjectId) : [];

    const comparisons: PaperComparisonItem[] = papers.map((p) => {
      const analysis = db.getAnalysisByPaper(p.id);
      const matrixRow = db.getMatrixByPaper(p.id);
      const paperEvidence = allEvidence.filter((e) => e.paperId === p.id);
      const paperGaps = allGaps.filter((g) => g.supportingPaperIds?.includes(p.id));

      const hasAnalysis = Boolean(analysis);

      return {
        paperId: p.id,
        title: p.title,
        authors: p.authors || [],
        year: p.publicationYear || 0,
        journal: p.journalOrConference || undefined,
        doi: p.doi || undefined,
        hasStructuredAnalysis: hasAnalysis,
        analysisStatus: hasAnalysis
          ? 'extracted'
          : matrixRow
          ? 'pending'
          : 'unextracted',
        problem: analysis?.researchProblem || (p.abstract ? p.abstract.substring(0, 240) + '...' : null),
        researchQuestions: analysis?.researchQuestions && analysis.researchQuestions.length > 0
          ? analysis.researchQuestions
          : [],
        contributions: analysis?.contributions && analysis.contributions.length > 0
          ? analysis.contributions
          : [],
        dataset: analysis?.dataset || matrixRow?.dataset || null,
        datasetSize: analysis?.datasetSize || matrixRow?.sampleSize || null,
        model: analysis?.model || matrixRow?.model || null,
        methodology: analysis?.preprocessing && analysis.preprocessing.length > 0
          ? analysis.preprocessing
          : (matrixRow?.method ? [matrixRow.method] : null),
        trainingSetup: analysis?.trainingSetup || null,
        metrics: analysis?.evaluationMetrics && analysis.evaluationMetrics.length > 0
          ? analysis.evaluationMetrics
          : (matrixRow?.metric ? [matrixRow.metric] : null),
        results: analysis?.results && Object.keys(analysis.results).length > 0
          ? analysis.results
          : (matrixRow?.result ? { 'Reported Result': matrixRow.result } : null),
        limitations: analysis?.limitations && analysis.limitations.length > 0
          ? analysis.limitations
          : (matrixRow?.limitation ? [matrixRow.limitation] : []),
        researchDirection: analysis?.futureWork && analysis.futureWork.length > 0
          ? analysis.futureWork
          : (matrixRow?.futureWork ? [matrixRow.futureWork] : []),
        evidenceSnippets: paperEvidence.map((e) => ({
          id: e.id,
          claim: e.claim,
          page: e.page,
          section: e.section,
          snippet: e.snippet,
          evidenceType: e.evidenceType,
          verificationStatus: e.verificationStatus,
        })),
        gapsAddressed: paperGaps.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          confidence: g.confidence,
        })),
      };
    });

    // Synthesize Shared Characteristics
    const sharedCharacteristics: PaperComparisonSynthesis['sharedCharacteristics'] = [];

    // Check shared domain or topics from titles/abstracts
    const titleWords = papers.map((p) =>
      p.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 4)
    );
    const commonTopics = titleWords[0].filter((w) =>
      titleWords.slice(1).every((list) => list.includes(w))
    );
    if (commonTopics.length > 0) {
      sharedCharacteristics.push({
        dimension: 'Research Domain & Focus',
        description: `All investigated manuscripts share thematic focus around ${commonTopics.slice(0, 3).map((w) => `"${w}"`).join(', ')}.`,
        papersInvolved: papers.map((p) => p.title),
      });
    }

    // Check shared publication year
    const uniqueYears = Array.from(new Set(papers.map((p) => p.publicationYear).filter(Boolean)));
    if (uniqueYears.length === 1) {
      sharedCharacteristics.push({
        dimension: 'Publication Era',
        description: `All papers were published contemporaneously in ${uniqueYears[0]}, reflecting state-of-the-art methodology of that academic cycle.`,
        papersInvolved: papers.map((p) => p.title),
      });
    }

    // Check shared models or architectures
    const models = comparisons.map((c) => c.model).filter((m): m is string => Boolean(m));
    const uniqueModels = Array.from(new Set(models));
    if (models.length === papers.length && uniqueModels.length === 1) {
      sharedCharacteristics.push({
        dimension: 'Model Architecture Family',
        description: `Both papers evaluate within the same architectural paradigm: ${uniqueModels[0]}.`,
        papersInvolved: papers.map((p) => p.title),
      });
    }

    // Synthesize Contrasting Dimensions
    const contrastingDimensions: PaperComparisonSynthesis['contrastingDimensions'] = [];

    // Model divergence
    if (uniqueModels.length > 1) {
      contrastingDimensions.push({
        dimension: 'Model Architectures',
        description: 'Papers diverge in empirical neural architectures and fine-tuning baselines.',
        details: comparisons.map((c) => ({
          paperTitle: c.title,
          value: c.model || 'Unspecified / Not reported',
        })),
      });
    }

    // Dataset divergence
    const datasetDetails = comparisons.map((c) => ({
      paperTitle: c.title,
      value: c.dataset ? `${c.dataset}${c.datasetSize ? ` (${c.datasetSize})` : ''}` : 'Not reported',
    }));
    const uniqueDatasets = Array.from(new Set(datasetDetails.map((d) => d.value)));
    if (uniqueDatasets.length > 1) {
      contrastingDimensions.push({
        dimension: 'Corpus & Sample Distribution',
        description: 'Manuscripts employ distinct evaluation datasets with varying corpus sizes and collection methodologies.',
        details: datasetDetails,
      });
    }

    // Methodology divergence
    const methodDetails = comparisons.map((c) => ({
      paperTitle: c.title,
      value: Array.isArray(c.methodology) && c.methodology.length > 0
        ? c.methodology.join('; ')
        : 'Standard / Unspecified',
    }));
    contrastingDimensions.push({
      dimension: 'Experimental Pipeline & Preprocessing',
      description: 'Differences in data preprocessing, feature engineering, and validation protocols.',
      details: methodDetails,
    });

    // Comparability Notes
    const comparabilityNotes: PaperComparisonSynthesis['comparabilityNotes'] = [];

    if (uniqueDatasets.length > 1) {
      comparabilityNotes.push({
        level: 'warning',
        title: 'Non-Equivalent Evaluation Corpora',
        note: 'Reported performance scores cannot be directly ranked against each other. Evaluated models were tested on disparate datasets with distinct class balances and label distributions.',
      });
    }

    const hasIncomplete = comparisons.some((c) => !c.hasStructuredAnalysis);
    if (hasIncomplete) {
      comparabilityNotes.push({
        level: 'info',
        title: 'Partial Extraction Available',
        note: 'One or more selected publications have pending structured analysis. Missing fields are explicitly marked as "Not reported" or "Pending" rather than estimated.',
      });
    }

    comparabilityNotes.push({
      level: 'caution',
      title: 'Neutral Comparative Principle',
      note: 'The system does not declare an arbitrary "superior" publication. Empirical utility is contingent upon resource constraints, domain adaptability, and target deployment environments.',
    });

    const response: PaperComparisonSynthesis = {
      papersCompared: papers.length,
      comparisons,
      sharedCharacteristics,
      contrastingDimensions,
      comparabilityNotes,
      synthesisNote:
        'Comparative matrix generated from verified manuscript extractions. Objective factual differences and shared traits are displayed with full evidence grounding.',
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const paperIdsParam = url.searchParams.get('paperIds');
    const projectId = url.searchParams.get('projectId') || undefined;

    if (!paperIdsParam) {
      return NextResponse.json(
        { error: 'Query parameter paperIds is required (comma-separated)' },
        { status: 400 }
      );
    }

    const paperIds = paperIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const mockReq = {
      json: async () => ({ paperIds, projectId }),
    } as unknown as Request;

    return POST(mockReq);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
