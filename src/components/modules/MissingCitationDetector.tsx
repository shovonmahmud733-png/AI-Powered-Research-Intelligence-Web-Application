'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
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
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span>Missing Citation & Evidentiary Claim Detector</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Paste manuscript drafts to audit unsupported empirical assertions and receive evidence-backed citations from your project library.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            rows={7}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Paste your research draft paragraphs here..."
            className="w-full text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 leading-relaxed transition-all"
          />

          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !draftText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs"
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
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 px-1">
            <span className="font-semibold">Audit Findings: {results.filter((p) => p.needsCitation).length} potential citation(s) needed</span>
            <span>{results.length} total paragraphs audited</span>
          </div>

          {results.map((p) => (
            <div
              key={p.index}
              className={`bg-white dark:bg-[#0f1422] border rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5 transition-all ${
                p.needsCitation
                  ? 'border-amber-300/80 dark:border-amber-800/80 bg-amber-50/15 dark:bg-amber-950/10'
                  : 'border-zinc-200/90 dark:border-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                <span className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                  Paragraph {p.index}
                </span>

                {p.needsCitation ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Potential Citation Needed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Evidentially Compliant ✓</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                {p.text}
              </p>

              {p.needsCitation && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/50 text-xs space-y-2.5">
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                    {p.reason}
                  </div>

                  {/* Grounded Paper Suggestions */}
                  {p.suggestedPapers && p.suggestedPapers.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                        Suggested Supporting Papers from Your Repository:
                      </span>
                      {p.suggestedPapers.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-white dark:bg-[#0f1422] rounded-xl border border-amber-200/70 dark:border-zinc-800/80 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            <span className="truncate pr-2">{s.paperTitle}</span>
                            <span className="font-mono text-[10px] text-zinc-400 shrink-0">Page {s.page} · {s.confidence}% match</span>
                          </div>
                          <p className="text-xs italic text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-850 leading-relaxed">
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
