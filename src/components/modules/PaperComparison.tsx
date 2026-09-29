'use client';

import React, { useState } from 'react';
import { Paper } from '@/lib/db/types';
import { GitCompare, CheckSquare, Square, Info } from 'lucide-react';

interface PaperComparisonProps {
  papers: Paper[];
}

export const PaperComparison: React.FC<PaperComparisonProps> = ({ papers }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    papers.slice(0, 2).map((p) => p.id)
  );
  const [comparisonData, setComparisonData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRunComparison = async () => {
    if (selectedIds.length < 2) {
      alert('Please select at least 2 papers to compare.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperIds: selectedIds }),
      });

      const data = await res.json();
      if (res.ok) {
        setComparisonData(data.comparisons);
      }
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  const dimensions = [
    { key: 'problem', label: 'Research Problem' },
    { key: 'dataset', label: 'Dataset & Corpus' },
    { key: 'datasetSize', label: 'Dataset Size' },
    { key: 'model', label: 'Model Architecture' },
    { key: 'methodology', label: 'Methodology & Preprocessing' },
    { key: 'metrics', label: 'Evaluation Metrics' },
    { key: 'results', label: 'Quantitative Results', isObject: true },
    { key: 'limitations', label: 'Stated Limitations', isList: true },
    { key: 'researchDirection', label: 'Research Directions', isList: true },
  ];

  return (
    <div className="space-y-6">
      {/* Selection Control */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-zinc-500" />
              <span>Multi-Paper Dimensional Comparison</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select 2 or more publications to contrast empirical pipelines, models, and boundary constraints.
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={selectedIds.length < 2 || loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <span>{loading ? 'Synthesizing...' : `Compare ${selectedIds.length} Selected Papers`}</span>
          </button>
        </div>

        {/* Paper Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
          {papers.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start space-x-2.5 ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/40'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-zinc-900 dark:text-zinc-100 mt-0.5 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {p.publicationYear} · {p.journalOrConference}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Neutral Scientific Note (Requirement 11) */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center space-x-2">
        <Info className="w-4 h-4 text-zinc-400 shrink-0" />
        <span>
          <strong>Scientific Principle:</strong> Comparative analysis presents factual evidence differences. The system does not declare an arbitrary &ldquo;best paper&rdquo;, as superiority depends on domain constraints, data distributions, and latency budgets.
        </span>
      </div>

      {/* Comparison Grid */}
      {comparisonData && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-3.5 w-44 font-semibold text-zinc-600 dark:text-zinc-400 text-[11px] uppercase tracking-wider">
                  Dimension
                </th>
                {comparisonData.map((paper: any) => (
                  <th key={paper.paperId} className="p-3.5 min-w-[280px] max-w-[340px]">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      {paper.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {paper.authors?.slice(0, 2).join(', ')} ({paper.year})
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {dimensions.map((dim) => (
                <tr key={dim.key} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                  <td className="p-3.5 font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50/40 dark:bg-zinc-950/40 align-top">
                    {dim.label}
                  </td>
                  {comparisonData.map((paper: any) => {
                    const val = paper[dim.key];

                    return (
                      <td key={paper.paperId} className="p-3.5 text-zinc-700 dark:text-zinc-300 align-top leading-relaxed">
                        {dim.isList && Array.isArray(val) ? (
                          <ul className="list-disc list-inside space-y-1">
                            {val.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : dim.isObject && typeof val === 'object' && val !== null ? (
                          <div className="space-y-1 font-mono text-[11px]">
                            {Object.entries(val).map(([k, v], i) => (
                              <div key={i} className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 py-0.5">
                                <span className="text-zinc-500">{k}:</span>
                                <span className="font-semibold">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>{String(val || '—')}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
