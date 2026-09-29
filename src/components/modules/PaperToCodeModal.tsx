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
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-zinc-500" />
            <span>Paper-to-Code Reference Implementation Generator</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Generates standardized starter scaffolding based on the published methodology and hyperparameters.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[260px] truncate"
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
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{loading ? 'Synthesizing...' : 'Generate Reference Script'}</span>
          </button>
        </div>
      </div>

      {/* Critical Attribution Disclaimer (Requirement 30) */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-semibold block">Academic Integrity Notice:</span>
          <p className="text-[11px] leading-relaxed">
            All code produced by this tool is an <strong>AI-generated reference implementation</strong>. It is synthesized from published methodologies to accelerate empirical reproduction. Unless verified against an official repository release, it must never be claimed as the original authors&apos; codebase.
          </p>
        </div>
      </div>

      {/* Code Display */}
      {generatedCode && (
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-lg space-y-2">
          <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>reference_pipeline.py (PyTorch & HuggingFace Transformers)</span>
            </span>

            <button
              onClick={copyCode}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Script' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed max-h-[500px]">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  );
};
