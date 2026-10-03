'use client';

import React, { useEffect, useState } from 'react';
import { ResearchMemoryItem } from '@/lib/db/types';
import {
  BrainCircuit,
  Plus,
  Trash2,
  Bookmark,
  Calendar,
  Layers,
  Sparkles,
  History,
} from 'lucide-react';

interface ResearchMemoryViewProps {
  projectId: string;
}

export const ResearchMemoryView: React.FC<ResearchMemoryViewProps> = ({ projectId }) => {
  const [memoryItems, setMemoryItems] = useState<ResearchMemoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState<ResearchMemoryItem['category']>('decision');
  const [content, setContent] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research-memory?projectId=${projectId}`);
      const data = await res.json();
      setMemoryItems(data.memory || []);
    } catch (err) {
      console.error('Fetch memory error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMemory();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await fetch('/api/research-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          category,
          content,
          context,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setContent('');
        setContext('');
        fetchMemory();
      }
    } catch (err) {
      alert('Failed to save memory item');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/research-memory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemoryItems((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const categoryBadges: Record<string, string> = {
    decision: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    finding: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    terminology: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    hypothesis: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    methodology: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    constraint: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <BrainCircuit className="w-4 h-4" />
            </span>
            <span>Persistent Project-Level Research Memory</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Stores foundational lab decisions, verified terminology, hypotheses, and methodological milestones to maintain persistent context.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Decision / Memory</span>
        </button>
      </div>

      {/* Add Modal / Form */}
      {isAdding && (
        <div className="p-5 sm:p-6 bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 uppercase tracking-wider font-mono">
            Log Project Memory Entry
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                >
                  <option value="decision">Researcher Decision</option>
                  <option value="finding">Important Finding</option>
                  <option value="terminology">Linguistic / Domain Terminology</option>
                  <option value="hypothesis">Active Hypothesis</option>
                  <option value="methodology">Methodology Choice</option>
                  <option value="constraint">Practical Constraint</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Context / Origin (e.g. Lab Meeting, Week 2)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Lab Meeting — Week 3"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Memory Content
              </label>
              <textarea
                rows={3}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detail the rationale, consensus, or definition..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition-all"
              >
                Save to Memory
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Memory Timeline List */}
      <div className="space-y-3">
        {memoryItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-md font-semibold border ${
                    categoryBadges[item.category] || 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {item.category}
                </span>

                {item.context && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    · {item.context}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.date}</span>
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                  title="Remove record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
              {item.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
