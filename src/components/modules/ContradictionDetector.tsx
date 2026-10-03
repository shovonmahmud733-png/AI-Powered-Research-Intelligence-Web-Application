'use client';

import React, { useEffect, useState } from 'react';
import { Contradiction, Paper } from '@/lib/db/types';
import {
  AlertTriangle,
  GitCompare,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface ContradictionDetectorProps {
  projectId: string;
  papers: Paper[];
}

export const ContradictionDetector: React.FC<ContradictionDetectorProps> = ({
  projectId,
  papers,
}) => {
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContradictions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contradictions?projectId=${projectId}`);
      const data = await res.json();
      setContradictions(data.contradictions || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchContradictions();
  }, [projectId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/contradictions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContradictions((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span>Cross-Paper Contradiction & Disagreement Detection</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-3xl">
              Identifies conflicting empirical claims between peer-reviewed studies without arbitrarily declaring a single study correct. Analyzes divergence factors: datasets, preprocessing, sample sizes, and metrics.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
              <GitCompare className="w-3.5 h-3.5 text-zinc-400" />
              <span>{contradictions.length} Registered Disagreements</span>
            </span>
          </div>
        </div>
      </div>

      {/* Contradictions List */}
      <div className="space-y-4">
        {contradictions.length === 0 && !loading && (
          <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-[#0f1422]/50 text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
            <GitCompare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="font-medium text-zinc-700 dark:text-zinc-300">No contradictory claims registered in this project yet.</p>
            <p className="text-zinc-400 max-w-md mx-auto">Add conflicting empirical findings between papers to systematically track divergence hypotheses.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0f1422] text-xs text-zinc-400">
            Scanning for empirical conflicts...
          </div>
        )}

        {contradictions.map((contra) => (
          <div
            key={contra.id}
            className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            {/* Topic & Delete */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10" />
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {contra.topic}
                </h3>
              </div>
              <button
                onClick={() => handleDelete(contra.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                title="Remove Contradiction Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Side-by-Side Conflicting Claims */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paper A */}
              <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    Position A
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Page {contra.pageA}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {contra.paperATitle}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {contra.claimA}
                </div>
                <p className="italic text-zinc-600 dark:text-zinc-400 text-xs bg-white dark:bg-[#0f1422] p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 leading-relaxed">
                  &ldquo;{contra.evidenceA}&rdquo;
                </p>
              </div>

              {/* Paper B */}
              <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    Position B
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Page {contra.pageB}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {contra.paperBTitle}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {contra.claimB}
                </div>
                <p className="italic text-zinc-600 dark:text-zinc-400 text-xs bg-white dark:bg-[#0f1422] p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 leading-relaxed">
                  &ldquo;{contra.evidenceB}&rdquo;
                </p>
              </div>
            </div>

            {/* Potential Reasons for Disagreement */}
            <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-2">
              <div className="font-semibold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Identified Factors for Scientific Disagreement:</span>
              </div>
              <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-1 text-xs pl-1">
                {contra.potentialReasons.map((reason, idx) => (
                  <li key={idx} className="leading-relaxed">{reason}</li>
                ))}
              </ul>
            </div>

            {/* Researcher Synthesis Note */}
            {contra.notes && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Lab Analysis Note: </span>
                {contra.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
