'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface MissingCitationDetectorProps {
  projectId: string;
}

export const MissingCitationDetector: React.FC<MissingCitationDetectorProps> = ({
  projectId,
}) => {
  const defaultDraft = `Subword tokenization methods such as Byte-Pair Encoding and SentencePiece were originally optimized on standardized high-resource text like Wikipedia and news corpora.

Studies have shown that multilingual transformer models suffer from catastrophic vocabulary fragmentation when applied directly to low-resource regional dialects, degrading sentiment classification performance.

In this work, we propose a phonetic subword regularization scheme with lattice sampling to align dialect morphemes with cross-lingual embeddings.

Recent experiments achieved a 84.1% Macro-F1 score on Chittagonian social commentary, significantly outperforming unregularized mBERT baselines.`;

  const [draftText, setDraftText] = useState(defaultDraft);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleAnalyze = async () => {
    if (!draftText.trim()) return;

    setAnalyzing(true);
    setResults(null);

    try {
      const res = await fetch('/api/citations/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, draftText }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data.paragraphs || []);
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Missing Citation & Evidentiary Claim Detector</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Paste manuscript drafts to detect unsupported empirical assertions and receive evidence-backed citations from your project library.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            rows={7}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Paste your research draft paragraphs here..."
            className="w-full text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !draftText.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Scanning empirical assertions...' : 'Audit Draft for Missing Citations'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Checklist */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
            <span>Audit Findings: {results.filter((p) => p.needsCitation).length} potential citation(s) needed</span>
          </div>

          {results.map((p) => (
            <div
              key={p.index}
              className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-xs space-y-3 ${
                p.needsCitation
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/10'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="text-xs font-mono font-semibold text-zinc-500">
                  Paragraph {p.index}
                </span>

                {p.needsCitation ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950 px-2.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Potential citation needed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Evidentially compliant ✓</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                {p.text}
              </p>

              {p.needsCitation && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                    {p.reason}
                  </div>

                  {/* Grounded Paper Suggestions */}
                  {p.suggestedPapers && p.suggestedPapers.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                        Suggested Supporting Papers from Your Repository:
                      </span>
                      {p.suggestedPapers.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 bg-white dark:bg-zinc-900 rounded border border-amber-200/80 dark:border-zinc-800 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                            <span>{s.paperTitle}</span>
                            <span className="font-mono text-zinc-500">Page {s.page} · {s.confidence}% match</span>
                          </div>
                          <p className="text-[11px] italic text-zinc-600 dark:text-zinc-400">
                            &ldquo;{s.snippet}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
