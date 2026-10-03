'use client';

import React, { useEffect, useState } from 'react';
import { Evidence, Paper } from '@/lib/db/types';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react';

interface EvidenceEngineProps {
  projectId: string;
  papers: Paper[];
}

export const EvidenceEngine: React.FC<EvidenceEngineProps> = ({ projectId, papers }) => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Evidence Form
  const [claim, setClaim] = useState('');
  const [selectedPaperId, setSelectedPaperId] = useState(papers[0]?.id || '');
  const [page, setPage] = useState(1);
  const [section, setSection] = useState('Results & Evaluation');
  const [snippet, setSnippet] = useState('');
  const [location, setLocation] = useState('Results → Table 4 → Page 8');
  const [status, setStatus] = useState<Evidence['verificationStatus']>('supported');

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evidence?projectId=${projectId}`);
      const data = await res.json();
      setEvidenceList(data.evidence || []);
    } catch (err) {
      console.error('Evidence fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchEvidence();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim()) return;

    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          paperId: selectedPaperId,
          claim,
          page,
          section,
          snippet,
          location,
          verificationStatus: status,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setClaim('');
        setSnippet('');
        fetchEvidence();
      }
    } catch (err) {
      alert('Failed to record evidence');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/evidence?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvidenceList((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filtered = evidenceList.filter((e) =>
    filterStatus === 'all' ? true : e.verificationStatus === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <BookmarkCheck className="w-4 h-4 text-emerald-500" />
            <span>Project Evidence Repository ({evidenceList.length} Grounded Items)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Claim ↓ Evidence ↓ Paper ↓ Section ↓ Page ↓ Table/Figure traceable hierarchy.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Verification States</option>
            <option value="supported">Supported</option>
            <option value="partially_supported">Partially Supported</option>
            <option value="contradicted">Contradicted</option>
            <option value="insufficient_evidence">Insufficient Evidence</option>
          </select>

          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Evidence</span>
          </button>
        </div>
      </div>

      {/* Add Evidence Modal/Drawer */}
      {isAdding && (
        <div className="p-5 bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl space-y-3.5 shadow-xs">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Record New Grounded Research Claim
          </h3>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                Research Claim
              </label>
              <input
                type="text"
                required
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="e.g., XLM-R outperformed mBERT by 4.9% Macro-F1 on dialect text"
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Source Paper
                </label>
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Location (Hierarchy)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Results → Table 4 → Page 8"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="supported">Supported</option>
                  <option value="partially_supported">Partially Supported</option>
                  <option value="contradicted">Contradicted</option>
                  <option value="insufficient_evidence">Insufficient Evidence</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                Direct Evidence Quote / Snippet
              </label>
              <textarea
                rows={2}
                required
                value={snippet}
                onChange={(e) => setSnippet(e.target.value)}
                placeholder="Verbatim quote from the paper..."
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                Record Evidence
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence Cards */}
      <div className="space-y-3.5">
        {filtered.map((item) => {
          const statusColors = {
            supported: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
            partially_supported: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
            contradicted: 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
            insufficient_evidence: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
            requires_verification: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          }[item.verificationStatus] || 'bg-zinc-100 text-zinc-600';

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase font-mono ${statusColors}`}>
                    {item.verificationStatus.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Location: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.location}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-zinc-400">
                    Confidence: {Math.round(item.confidence * 100)}%
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete Evidence"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Claim */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5 font-mono">
                  Claim
                </span>
                <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {item.claim}
                </p>
              </div>

              {/* Source & Direct Snippet */}
              <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Source: {item.paperTitle}
                  </span>
                  <span className="font-mono text-zinc-400">Page {item.page}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic leading-relaxed">
                  &ldquo;{item.snippet}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
