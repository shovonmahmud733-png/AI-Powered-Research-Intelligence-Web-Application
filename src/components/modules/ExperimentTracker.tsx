'use client';

import React, { useEffect, useState } from 'react';
import { MLExperiment, Paper } from '@/lib/db/types';
import {
  Cpu,
  Plus,
  Trash2,
  GitCompare,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ExperimentTrackerProps {
  projectId: string;
  papers: Paper[];
}

export const ExperimentTracker: React.FC<ExperimentTrackerProps> = ({
  projectId,
  papers,
}) => {
  const [experiments, setExperiments] = useState<MLExperiment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Experiment Form
  const [name, setName] = useState('');
  const [model, setModel] = useState('xlm-roberta-base');
  const [dataset, setDataset] = useState('CSC-24');
  const [version, setVersion] = useState('v1.0.0');
  const [lr, setLr] = useState('2e-5');
  const [batchSize, setBatchSize] = useState(16);
  const [epochs, setEpochs] = useState(5);
  const [f1, setF1] = useState(0.825);
  const [accuracy, setAccuracy] = useState(0.835);
  const [notes, setNotes] = useState('');
  const [linkedPaperId, setLinkedPaperId] = useState(papers[0]?.id || '');

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/experiments?projectId=${projectId}`);
      const data = await res.json();
      setExperiments(data.experiments || []);
    } catch (err) {
      console.error('Fetch experiments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchExperiments();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name,
          model,
          dataset,
          version,
          hyperparameters: {
            learning_rate: lr,
            batch_size: batchSize,
            epochs,
          },
          metrics: {
            macro_f1: parseFloat(String(f1)),
            accuracy: parseFloat(String(accuracy)),
          },
          notes,
          linkedPaperId,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setName('');
        setNotes('');
        fetchExperiments();
      }
    } catch (err) {
      alert('Failed to log experiment');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/experiments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExperiments((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-zinc-500" />
            <span>ML Experiment & Reproducibility Tracker</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Log architectural checkpoints, hyperparameters, and quantitative evaluation metrics linked to literature.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              compareMode
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-transparent'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 inline mr-1" />
            <span>{compareMode ? 'Exit Comparison' : 'Compare Metric Deltas'}</span>
          </button>

          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Experiment</span>
          </button>
        </div>
      </div>

      {/* Add Experiment Modal */}
      {isAdding && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Log New Machine Learning Run
          </h3>

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Run / Experiment Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. XLM-R + Phonetic Reg Dropout"
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Model Checkpoint
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="xlm-roberta-base"
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Dataset Split
                </label>
                <input
                  type="text"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  placeholder="CSC-24"
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Learning Rate
                </label>
                <input
                  type="text"
                  value={lr}
                  onChange={(e) => setLr(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Macro-F1 (Metric)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={f1}
                  onChange={(e) => setF1(parseFloat(e.target.value))}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                  Accuracy
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={accuracy}
                  onChange={(e) => setAccuracy(parseFloat(e.target.value))}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Ablation / Training Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observed convergence rate, attention dispersion, etc..."
                className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
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
                Save Run
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Experiments Table & Metrics */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
              <th className="p-3 min-w-[200px]">Experiment Name</th>
              <th className="p-3">Model</th>
              <th className="p-3">Dataset</th>
              <th className="p-3">Hyperparameters</th>
              <th className="p-3 font-mono">Macro-F1</th>
              <th className="p-3 font-mono">Accuracy</th>
              <th className="p-3 min-w-[200px]">Observations</th>
              <th className="p-3 w-16 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {experiments.map((exp) => (
              <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  {exp.name}
                  <div className="text-[10px] text-zinc-400 font-mono font-normal">
                    {exp.version} · {new Date(exp.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-3 font-mono text-zinc-700 dark:text-zinc-300">{exp.model}</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">{exp.dataset}</td>
                <td className="p-3 text-[11px] font-mono text-zinc-500">
                  {Object.entries(exp.hyperparameters)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ')}
                </td>
                <td className="p-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {exp.metrics.macro_f1 ? (exp.metrics.macro_f1 * 100).toFixed(1) + '%' : '—'}
                </td>
                <td className="p-3 font-mono text-zinc-700 dark:text-zinc-300">
                  {exp.metrics.accuracy ? (exp.metrics.accuracy * 100).toFixed(1) + '%' : '—'}
                </td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                  {exp.notes || '—'}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded"
                    title="Delete Experiment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
