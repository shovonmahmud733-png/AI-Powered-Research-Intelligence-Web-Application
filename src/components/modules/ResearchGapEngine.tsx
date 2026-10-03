'use client';

import React, { useEffect, useState } from 'react';
import { ResearchGap, Paper } from '@/lib/db/types';
import {
  Lightbulb,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Clock,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  Compass,
} from 'lucide-react';

interface ResearchGapEngineProps {
  projectId: string;
  papers: Paper[];
}

export const ResearchGapEngine: React.FC<ResearchGapEngineProps> = ({
  projectId,
  papers,
}) => {
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gaps?projectId=${projectId}`);
      const data = await res.json();
      setGaps(data.gaps || []);
    } catch (err) {
      console.error('Fetch gaps error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchGaps();
  }, [projectId]);

  const handleSynthesizeGaps = async () => {
    setSynthesizing(true);
    try {
      const res = await fetch('/api/gaps/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGaps(data.gaps || []);
      }
    } catch (err) {
      console.error('Synthesis error:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  const handleToggleVerification = async (gap: ResearchGap) => {
    const nextStatus =
      gap.verificationStatus === 'Researcher Verified'
        ? 'Under Investigation'
        : 'Researcher Verified';

    try {
      const res = await fetch('/api/gaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gap.id, verificationStatus: nextStatus }),
      });

      if (res.ok) {
        setGaps((prev) =>
          prev.map((g) => (g.id === gap.id ? { ...g, verificationStatus: nextStatus } : g))
        );
      }
    } catch (err) {
      console.error('Update gap error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/gaps?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGaps((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const categoryLabels: Record<string, string> = {
    repeated_limitation: 'Repeated Limitation',
    missing_dataset: 'Missing Dataset / Coverage',
    underexplored_population: 'Underexplored Dialect / Population',
    language_coverage: 'Language Coverage Bottleneck',
    methodological: 'Methodological Disparity',
    evaluation: 'Evaluation Gap',
  };

  return (
    <div className="space-y-6">
      {/* Header and Synthesis Trigger */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lightbulb className="w-4 h-4" />
            </span>
            <span>Cross-Paper Research Gap Engine</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-3xl">
            Synthesizes recurring limitations, unaddressed datasets, and methodological vacancies across literature to discover novel avenues.
          </p>
        </div>

        <button
          onClick={handleSynthesizeGaps}
          disabled={synthesizing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
        >
          <Sparkles className={`w-3.5 h-3.5 ${synthesizing ? 'animate-spin' : ''}`} />
          <span>{synthesizing ? 'Synthesizing Gaps...' : 'Synthesize Potential Gaps'}</span>
        </button>
      </div>

      {/* Epistemological Humility Note */}
      <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">Academic Standard:</strong> AI inference is presented as <em className="text-zinc-900 dark:text-zinc-100 font-medium not-italic underline decoration-zinc-300">potential gaps</em> and exploratory hypotheses, never as established scientific dogma. All gaps require explicit researcher verification.
        </p>
      </div>

      {/* Gaps List */}
      <div className="space-y-4">
        {gaps.length === 0 && !loading && (
          <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-[#0f1422]/50 text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
            <Compass className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="font-medium text-zinc-700 dark:text-zinc-300">No synthesized research gaps currently registered.</p>
            <p className="text-zinc-400 max-w-md mx-auto">Click &ldquo;Synthesize Potential Gaps&rdquo; to analyze your uploaded papers and identify unaddressed literature spaces.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0f1422] text-xs text-zinc-400">
            Loading research gap database...
          </div>
        )}

        {gaps.map((gap) => (
          <div
            key={gap.id}
            className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-500/20 font-semibold tracking-wider">
                  {categoryLabels[gap.category] || gap.category}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleVerification(gap)}
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md border cursor-pointer select-none inline-flex items-center gap-1.5 transition-all ${
                    gap.verificationStatus === 'Researcher Verified'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-200/70'
                  }`}
                  title="Click to toggle researcher verification status"
                >
                  {gap.verificationStatus === 'Researcher Verified' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span className="font-medium">{gap.verificationStatus}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60">
                  Confidence: <span className="capitalize font-semibold text-zinc-800 dark:text-zinc-200">{gap.confidence}</span>
                </span>
                <button
                  onClick={() => handleDelete(gap.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  title="Remove gap entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gap Title & Description */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {gap.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                {gap.description}
              </p>
            </div>

            {/* Supporting Publications */}
            {gap.supportingPaperTitles && gap.supportingPaperTitles.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 block">
                  Evidentiary Grounding (Supporting Papers)
                </span>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1 text-xs pl-1">
                  {gap.supportingPaperTitles.map((title, i) => (
                    <li key={i} className="leading-snug">{title}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Proposed Novel Research Direction */}
            <div className="p-3.5 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-xs space-y-1">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs block">
                Potential Scientific Investigation Direction:
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
                {gap.proposedDirection}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
