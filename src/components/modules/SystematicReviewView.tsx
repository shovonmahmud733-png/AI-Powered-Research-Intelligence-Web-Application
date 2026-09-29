'use client';

import React, { useEffect, useState } from 'react';
import { SystematicReviewItem, Paper } from '@/lib/db/types';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  FileCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SystematicReviewViewProps {
  projectId: string;
  papers: Paper[];
}

export const SystematicReviewView: React.FC<SystematicReviewViewProps> = ({
  projectId,
  papers,
}) => {
  const [items, setItems] = useState<SystematicReviewItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/systematic-review?projectId=${projectId}`);
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats);
    } catch (err) {
      console.error('Fetch review error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchReview();
  }, [projectId]);

  const updateScreeningStatus = async (
    item: SystematicReviewItem,
    status: SystematicReviewItem['screeningStatus']
  ) => {
    const updated = { ...item, screeningStatus: status };
    try {
      await fetch('/api/systematic-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      fetchReview();
    } catch (err) {
      alert('Failed to update screening decision');
    }
  };

  const toggleFullTextReviewed = async (item: SystematicReviewItem) => {
    const updated = { ...item, fullTextReviewed: !item.fullTextReviewed };
    try {
      await fetch('/api/systematic-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      fetchReview();
    } catch (err) {
      console.error('Error toggling review status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <ClipboardList className="w-4 h-4 text-zinc-500" />
            <span>PRISMA-Compliant Systematic Review Protocol</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Stage-gate screening workflow ensuring researcher-supervised inclusion/exclusion with full traceability.
          </p>
        </div>

        {/* PRISMA Funnel Statistics */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-mono">1. IDENTIFIED</span>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {stats.totalIdentified}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-mono">2. UNSCREENED</span>
              <span className="text-base font-bold text-zinc-600 dark:text-zinc-400">
                {stats.unscreened}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">3. INCLUDED</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {stats.included}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-red-500 block font-mono">4. EXCLUDED</span>
              <span className="text-base font-bold text-red-500">
                {stats.excluded}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono">5. FULL TEXT</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                {stats.fullTextReviewed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Decision Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
              <th className="p-3 min-w-[240px]">Paper Title</th>
              <th className="p-3">Eligibility Criteria Matches</th>
              <th className="p-3 w-32">Full Text Reviewed</th>
              <th className="p-3 w-48 text-center">Screening Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {item.paperTitle}
                </td>

                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(item.criteriaMatches || {}).map(([crit, matched], i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          matched
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {matched ? '✓' : '×'} {crit}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="p-3">
                  <button
                    onClick={() => toggleFullTextReviewed(item)}
                    className={`text-[11px] px-2.5 py-1 rounded-md font-medium border transition-colors ${
                      item.fullTextReviewed
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {item.fullTextReviewed ? 'Reviewed ✓' : 'Pending'}
                  </button>
                </td>

                <td className="p-3 text-center">
                  <div className="flex items-center justify-center space-x-1.5">
                    <button
                      onClick={() => updateScreeningStatus(item, 'included')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        item.screeningStatus === 'included'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      Include
                    </button>

                    <button
                      onClick={() => updateScreeningStatus(item, 'excluded')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        item.screeningStatus === 'excluded'
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-700'
                      }`}
                    >
                      Exclude
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
