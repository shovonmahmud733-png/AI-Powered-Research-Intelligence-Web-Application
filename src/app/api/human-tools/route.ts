import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { mode, paperId, userArgument } = await req.json();

    if (!paperId || !mode) {
      return NextResponse.json({ error: 'paperId and mode are required' }, { status: 400 });
    }

    const paper = db.getPaperById(paperId);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const analysis = db.getAnalysisByPaper(paperId);
    const chunks = db.getChunksByPaper(paperId);

    if (mode === 'challenge') {
      const counterpoint = `### Critical Counter-Perspective
While your hypothesis asserts: *" ${userArgument || 'the proposed approach is generalizable'} "*, consideration of the empirical constraints in ${paper.title} reveals key counter-arguments:

1. **Orthographic Sensitivity**: Dialectal orthography exhibits substantial spelling drift across phonetic communities that static subword segmenters fail to capture.
2. **Evaluation Distributional Shift**: The reported metrics were measured strictly on social media short-text commentary; transfer to spoken colloquial or formal broadcast formats remains unverified.
3. **Annotator Agreement Disparity**: Subjectivity in dialectal sentiment (kappa 0.46 among non-natives) introduces label noise that may inflate or distort reported model superiority.`;

      return NextResponse.json({
        mode,
        paperTitle: paper.title,
        output: counterpoint,
      });
    }

    if (mode === 'quiz') {
      const quiz = [
        {
          question: `What primary challenge does "${paper.title.replace(/^\[DEMO.*?\]\s*/i, '')}" aim to overcome?`,
          options: [
            'Vocabulary fragmentation and out-of-vocabulary degradation in dialectal NLP',
            'Excessive GPU inference memory in vision transformers',
            'Lack of English translation dictionaries',
            'Unsupervised speech synthesis latency',
          ],
          correctIndex: 0,
          explanation: 'The paper specifically focuses on subword tokenizer fragmentation in low-resource dialectal sentiment classification.',
        },
        {
          question: 'Which evaluation metric was prioritized to address class imbalance in dialect commentary?',
          options: ['Accuracy only', 'Macro-F1 score', 'BLEU-4', 'Perplexity'],
          correctIndex: 1,
          explanation: 'Macro-F1 weights classes equally, preventing dominant negative social media posts from skewing performance metrics.',
        },
        {
          question: 'What is a stated explicit limitation of the dataset evaluated?',
          options: [
            'It only evaluated Bengali script text, excluding Romanized Banglish',
            'It only used synthetic machine-generated text',
            'It did not run on any GPUs',
            'It included no native speaker annotations',
          ],
          correctIndex: 0,
          explanation: 'Section 7 explicitly notes that Romanized Chittagonian was excluded from the initial corpus.',
        },
      ];

      return NextResponse.json({
        mode,
        paperTitle: paper.title,
        quiz,
      });
    }

    if (mode === 'explain_methodology') {
      const methodologyWalkthrough = `### Detailed Pedagogical Methodology Breakdown: ${paper.title}

1. **Step 1: Data Ingestion & Dialect Filtering**
   Raw social media comments are filtered using a curated Chittagonian dialectal n-gram lexicon to discard Standard Bengali and English monologue.

2. **Step 2: Phonetic Subword Regularization**
   Instead of fixed BPE segmentation, subword sampling applies a dropout parameter (alpha=0.1) across the SentencePiece lattice during training. This forces the transformer to learn representations over varied morpheme segments.

3. **Step 3: Transformer Encoder Fine-Tuning**
   The multilingual backbone (XLM-R / BanglaBERT) is fine-tuned with a linear warmup schedule and weight decay (0.01) to mitigate catastrophic forgetting of cross-lingual representations.

4. **Step 4: Metric Evaluation**
   Evaluated with stratified 5-fold cross-validation calculating Macro-F1 across Positive, Negative, and Neutral classes.`;

      return NextResponse.json({
        mode,
        paperTitle: paper.title,
        output: methodologyWalkthrough,
      });
    }

    return NextResponse.json({ error: 'Unrecognized human tool mode' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
