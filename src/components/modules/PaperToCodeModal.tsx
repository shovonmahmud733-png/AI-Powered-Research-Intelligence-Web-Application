'use client';

import React, { useState } from 'react';
import { Paper } from '@/lib/db/types';
import {
  Code2,
  Copy,
  Check,
  AlertTriangle,
  Download,
  Terminal,
} from 'lucide-react';

interface PaperToCodeModalProps {
  papers: Paper[];
}

export const PaperToCodeModal: React.FC<PaperToCodeModalProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState(papers[0]?.id || '');
  const [framework, setFramework] = useState('pytorch');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!selectedPaperId) return;

    setLoading(true);
    setGeneratedCode(null);

    try {
      const res = await fetch('/api/paper-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: selectedPaperId, framework }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedCode(data.code);
        setDisclaimer(data.disclaimer);
      } else {
        alert(data.error || 'Failed to generate reference code');
      }
    } catch (err) {
      console.error('Code generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <Code2 className="w-4 h-4" />
            </span>
            <span>Paper-to-Code Reference Implementation Generator</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Generates standardized starter scaffolding based on published methodology and hyperparameters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[260px] truncate focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 transition-all active:scale-[0.98] shadow-xs"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{loading ? 'Synthesizing...' : 'Generate Reference Script'}</span>
          </button>
        </div>
      </div>

      {/* Critical Attribution Disclaimer */}
      <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Academic Integrity Notice:</span>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            All code produced by this tool is an <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">AI-generated reference implementation</strong> synthesized from published methodologies to accelerate empirical reproduction. Unless verified against an official repository release, it must never be claimed as the original authors&apos; codebase.
          </p>
        </div>
      </div>

      {/* Code Display */}
      {generatedCode && (
        <div className="bg-[#090d16] rounded-2xl border border-zinc-800/90 overflow-hidden shadow-2xl space-y-0 animate-in fade-in duration-200">
          <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              <span>reference_pipeline.py (PyTorch & HuggingFace Transformers)</span>
            </span>

            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? 'Copied Script' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed max-h-[520px] selection:bg-zinc-800">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  );
};
