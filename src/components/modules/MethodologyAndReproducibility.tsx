'use client';

import React, { useState } from 'react';
import { Paper } from '@/lib/db/types';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface MethodologyAndReproducibilityProps {
  papers: Paper[];
}

export const MethodologyAndReproducibility: React.FC<MethodologyAndReproducibilityProps> = ({
  papers,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState(papers[0]?.id || '');
  const selectedPaper = papers.find((p) => p.id === selectedPaperId) || papers[0];

  // Reproducibility checklist items
  const reproducibilityCriteria = [
    { item: 'Dataset Documentation', status: 'Available', note: 'CSC-24 corpus details, size (4,200), and class splits documented.' },
    { item: 'Dataset Public Access Link', status: 'Available', note: 'Public benchmark split hosted on HuggingFace Datasets hub.' },
    { item: 'Preprocessing Code / Script', status: 'Available', note: 'Phonetic regularization script and tokenization routines reported.' },
    { item: 'Model Architecture Weights', status: 'Available', note: 'Base weights on HuggingFace: xlm-roberta-base.' },
    { item: 'Exact Hyperparameters', status: 'Available', note: 'Reported: AdamW, LR=2e-5, Batch size 16, Warmup 10%, 5 epochs.' },
    { item: 'Hardware & Compute Setup', status: 'Available', note: 'Single NVIDIA A100 (40GB), total training time: 2.4 hours.' },
    { item: 'Evaluation Metric Script', status: 'Available', note: 'Scikit-learn macro-F1 calculation implementation specified.' },
    { item: 'Official Source Code Repository', status: 'Missing', note: 'No verified official GitHub repository URL provided in published paper header.' },
    { item: 'Fixed Random Seed', status: 'Not Reported', note: 'Random seed value for stochastic data shuffling not explicitly specified in methodology text.' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            AVAILABLE
          </span>
        );
      case 'Missing':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            MISSING
          </span>
        );
      case 'Not Reported':
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
            NOT REPORTED
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-zinc-500" />
            <span>Methodology & Scientific Reproducibility Analyzer</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit empirical ML/NLP pipelines and reproducibility checklists against open science standards.
          </p>
        </div>

        <select
          value={selectedPaperId}
          onChange={(e) => setSelectedPaperId(e.target.value)}
          className="text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[280px] truncate"
        >
          {papers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Methodology Pipeline Visualization (Requirement 21) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          Methodological Pipeline Flow
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 text-center text-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 1</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Dataset</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Curated CSC-24</div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 2</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Preprocessing</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Emoji & Punctuation</div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 3</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Features</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Phonetic Subwords</div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 4</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Model</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">XLM-RoBERTa</div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 5</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Training</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">AdamW, 5 Epochs</div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] text-zinc-400 font-mono">STAGE 6</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1">Evaluation</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Macro-F1 Stratified</div>
          </div>
        </div>
      </div>

      {/* Reproducibility Audit Table (Requirement 22) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs space-y-2">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Reproducibility Checklist (Open Science Standards)
            </h3>
            <p className="text-[11px] text-zinc-500">
              Absence of code does not imply irreproducibility; checklist documents reported transparency.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            Transparency Score: 78%
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
              <th className="p-3 w-64">Criterion</th>
              <th className="p-3 w-36">Status</th>
              <th className="p-3">Verified Documentation Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {reproducibilityCriteria.map((c, idx) => (
              <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{c.item}</td>
                <td className="p-3">{getStatusBadge(c.status)}</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400 text-[11px]">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
