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
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Cross-Paper Contradiction & Disagreement Detection</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Identifies conflicting empirical claims between peer-reviewed studies without arbitrarily declaring a single study correct. Analyzes divergence factors: datasets, preprocessing, sample sizes, and metrics.
        </p>
      </div>

      {/* Contradictions List */}
      <div className="space-y-4">
        {contradictions.length === 0 && (
          <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 text-xs text-zinc-500">
            No contradictory claims registered in this project yet. Add conflicting empirical findings between papers to track divergence hypotheses.
          </div>
        )}

        {contradictions.map((contra) => (
          <div
            key={contra.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            {/* Topic & Delete */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {contra.topic}
                </h3>
              </div>
              <button
                onClick={() => handleDelete(contra.id)}
                className="p-1 text-zinc-400 hover:text-red-600 rounded"
                title="Remove Contradiction Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Side-by-Side Conflicting Claims */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Paper A */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/70 dark:border-zinc-800/80 space-y-2 text-xs">
                <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">
                  Position A · {contra.paperATitle}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {contra.claimA}
                </div>
                <p className="italic text-zinc-600 dark:text-zinc-400 text-[11px] bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200/60 dark:border-zinc-800">
                  &ldquo;{contra.evidenceA}&rdquo;
                </p>
                <div className="text-[10px] font-mono text-zinc-400">
                  Citation: Page {contra.pageA}
                </div>
              </div>

              {/* Paper B */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/70 dark:border-zinc-800/80 space-y-2 text-xs">
                <div className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">
                  Position B · {contra.paperBTitle}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {contra.claimB}
                </div>
                <p className="italic text-zinc-600 dark:text-zinc-400 text-[11px] bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200/60 dark:border-zinc-800">
                  &ldquo;{contra.evidenceB}&rdquo;
                </p>
                <div className="text-[10px] font-mono text-zinc-400">
                  Citation: Page {contra.pageB}
                </div>
              </div>
            </div>

            {/* Potential Reasons for Disagreement (Requirement 14) */}
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
              <div className="font-semibold text-amber-900 dark:text-amber-300 text-[11px] flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Identified Factors for Scientific Disagreement:</span>
              </div>
              <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-1 text-[11px] pl-1">
                {contra.potentialReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            {/* Researcher Synthesis Note */}
            {contra.notes && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Lab Analysis Note: </span>
                {contra.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
