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

  const categoryLabels = {
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
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Cross-Paper Research Gap Engine</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Synthesizes recurring limitations, unaddressed datasets, and methodological vacancies across literature.
          </p>
        </div>

        <button
          onClick={handleSynthesizeGaps}
          disabled={synthesizing}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${synthesizing ? 'animate-spin' : ''}`} />
          <span>{synthesizing ? 'Analyzing Literature...' : 'Synthesize Potential Gaps'}</span>
        </button>
      </div>

      {/* Epistemological Humility Note (Requirement 15) */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
        <strong>Academic Standard:</strong> AI inference is presented as <em>potential gaps</em> and <em>exploratory hypotheses</em>, never as established scientific dogma. All gaps require explicit researcher verification.
      </div>

      {/* Gaps List */}
      <div className="space-y-4">
        {gaps.map((gap) => (
          <div
            key={gap.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-semibold">
                  {categoryLabels[gap.category] || gap.category}
                </span>

                <span
                  onClick={() => handleToggleVerification(gap)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border cursor-pointer select-none flex items-center space-x-1 ${
                    gap.verificationStatus === 'Researcher Verified'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                  title="Click to toggle verification status"
                >
                  {gap.verificationStatus === 'Researcher Verified' ? (
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Clock className="w-3 h-3 text-zinc-400" />
                  )}
                  <span>{gap.verificationStatus}</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  Confidence: <span className="capitalize">{gap.confidence}</span>
                </span>
                <button
                  onClick={() => handleDelete(gap.id)}
                  className="p-1 text-zinc-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Gap Title & Description */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {gap.title}
              </h3>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                {gap.description}
              </p>
            </div>

            {/* Supporting Publications */}
            {gap.supportingPaperTitles && gap.supportingPaperTitles.length > 0 && (
              <div className="text-xs">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Evidentiary Grounding (Supporting Papers)
                </span>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5 text-[11px] pl-1">
                  {gap.supportingPaperTitles.map((title, i) => (
                    <li key={i}>{title}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Proposed Novel Research Direction */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/70 dark:border-zinc-800 text-xs">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-0.5 text-[11px]">
                Potential Scientific Investigation Direction:
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                {gap.proposedDirection}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
