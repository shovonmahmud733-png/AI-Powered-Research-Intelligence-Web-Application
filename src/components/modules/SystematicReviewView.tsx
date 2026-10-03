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
  Check,
  X,
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
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <ClipboardList className="w-4 h-4" />
            </span>
            <span>PRISMA-Compliant Systematic Review Protocol</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Stage-gate screening workflow ensuring researcher-supervised inclusion/exclusion with full traceability.
          </p>
        </div>

        {/* PRISMA Funnel Statistics */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-center">
            <div className="p-3.5 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-mono font-semibold uppercase">1. IDENTIFIED</span>
              <span className="text-lg font-bold font-mono tracking-tight text-zinc-950 dark:text-zinc-50 mt-1 block">
                {stats.totalIdentified}
              </span>
            </div>

            <div className="p-3.5 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-mono font-semibold uppercase">2. UNSCREENED</span>
              <span className="text-lg font-bold font-mono tracking-tight text-zinc-600 dark:text-zinc-400 mt-1 block">
                {stats.unscreened}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono font-semibold uppercase">3. INCLUDED</span>
              <span className="text-lg font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 block">
                {stats.included}
              </span>
            </div>

            <div className="p-3.5 bg-rose-500/5 dark:bg-rose-950/20 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-mono font-semibold uppercase">4. EXCLUDED</span>
              <span className="text-lg font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 mt-1 block">
                {stats.excluded}
              </span>
            </div>

            <div className="p-3.5 bg-purple-500/5 dark:bg-purple-950/20 rounded-xl border border-purple-500/20">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono font-semibold uppercase">5. FULL TEXT</span>
              <span className="text-lg font-bold font-mono tracking-tight text-purple-600 dark:text-purple-400 mt-1 block">
                {stats.fullTextReviewed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Decision Table */}
      <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200/90 dark:border-zinc-800/80 text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                <th className="p-3.5 min-w-[240px]">Paper Title</th>
                <th className="p-3.5">Eligibility Criteria Matches</th>
                <th className="p-3.5 w-36 text-center">Full Text Reviewed</th>
                <th className="p-3.5 w-48 text-center">Screening Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {item.paperTitle}
                  </td>

                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.criteriaMatches || {}).map(([crit, matched], i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold inline-flex items-center gap-1 border ${
                            matched
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80'
                          }`}
                        >
                          {matched ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3 h-3 text-zinc-400" />}
                          <span>{crit}</span>
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => toggleFullTextReviewed(item)}
                      className={`text-[11px] px-3 py-1 rounded-lg font-medium border transition-all ${
                        item.fullTextReviewed
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-200/70'
                      }`}
                    >
                      {item.fullTextReviewed ? 'Reviewed ✓' : 'Pending'}
                    </button>
                  </td>

                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => updateScreeningStatus(item, 'included')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          item.screeningStatus === 'included'
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-600 border border-zinc-200/80 dark:border-zinc-700/80'
                        }`}
                      >
                        Include
                      </button>

                      <button
                        onClick={() => updateScreeningStatus(item, 'excluded')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          item.screeningStatus === 'excluded'
                            ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-zinc-950'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600 border border-zinc-200/80 dark:border-zinc-700/80'
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
    </div>
  );
};
