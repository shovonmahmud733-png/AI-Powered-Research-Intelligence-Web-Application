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
    decision: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    finding: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    terminology: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    hypothesis: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    methodology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    constraint: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <BrainCircuit className="w-4 h-4 text-zinc-500" />
            <span>Persistent Project-Level Research Memory</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Stores foundational lab decisions, verified terminology, hypotheses, and methodological milestones to maintain context.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Decision / Memory</span>
        </button>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Log Project Memory Entry
          </h3>

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
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
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Context / Origin (e.g. Lab Meeting, Week 2)
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Lab Meeting — Week 3"
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Memory Content
              </label>
              <textarea
                rows={3}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detail the rationale, consensus, or definition..."
                className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded hover:bg-zinc-800"
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
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                    categoryBadges[item.category] || 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {item.category}
                </span>

                {item.context && (
                  <span className="text-xs text-zinc-500 font-medium">
                    · {item.context}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{item.date}</span>
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 hover:text-red-600 text-zinc-400"
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
