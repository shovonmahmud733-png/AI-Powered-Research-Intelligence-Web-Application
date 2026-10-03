'use client';

import React, { useEffect, useState } from 'react';
import { Paper, StructuredPaperAnalysis } from '@/lib/db/types';
import {
  Sparkles,
  BookOpen,
  Cpu,
  Database,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';

interface StructuredAnalysisViewProps {
  papers: Paper[];
  initialPaperId?: string;
  onAskThisPaper?: (paperId: string) => void;
}

export const StructuredAnalysisView: React.FC<StructuredAnalysisViewProps> = ({
  papers,
  initialPaperId,
  onAskThisPaper,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(
    initialPaperId || papers[0]?.id || ''
  );
  const [analysis, setAnalysis] = useState<StructuredPaperAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  const loadAnalysis = async (paperId: string) => {
    if (!paperId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerExtract = async () => {
    if (!selectedPaperId) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/papers/${selectedPaperId}/analysis`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Extraction error:', err);
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (selectedPaperId) {
      loadAnalysis(selectedPaperId);
    }
  }, [selectedPaperId]);

  return (
    <div className="space-y-6">
      {/* Header & Paper Selector */}
      <div className="bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Structured Paper Analysis Schema</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Systematic extraction across 13 canonical research dimensions stored in the database.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 max-w-[260px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {onAskThisPaper && selectedPaperId && (
            <button
              onClick={() => onAskThisPaper(selectedPaperId)}
              className="inline-flex items-center space-x-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-semibold transition-colors shrink-0"
              title="Open Research AI Chat restricted to this paper"
            >
              <span>🤖</span>
              <span>Ask Paper</span>
            </button>
          )}

          <button
            onClick={handleTriggerExtract}
            disabled={extracting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 transition-colors shadow-2xs shrink-0"
            title="Re-run Extraction Agent"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
            <span>{extracting ? 'Extracting...' : 'Extract'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-xs font-mono text-zinc-500 animate-pulse bg-white/40 dark:bg-[#0f1422]/30 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
          Loading structured representation from database...
        </div>
      )}

      {!loading && !analysis && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No structured analysis generated yet for this paper
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Click &ldquo;Extract&rdquo; to trigger the Extraction Agent across the paper text chunks.
            </p>
          </div>
          <button
            onClick={handleTriggerExtract}
            disabled={extracting}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs"
          >
            {extracting ? 'Processing chunks...' : 'Extract Structured Representation'}
          </button>
        </div>
      )}

      {!loading && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Problem & Questions */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>1. Research Problem & Inquiries</span>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Core Problem</div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                {analysis.researchProblem}
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Research Questions</div>
              <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                {analysis.researchQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 2: Contributions */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>2. Key Contributions</span>
            </div>
            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              {analysis.contributions.map((c, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: Dataset & Preprocessing */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <Database className="w-4 h-4 text-blue-500" />
              <span>3. Dataset & Preprocessing</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Dataset Name</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{analysis.dataset}</span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Dataset Size</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{analysis.datasetSize}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1.5">
                Preprocessing Pipeline
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.preprocessing.map((prep, i) => (
                  <span
                    key={i}
                    className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-0.5 rounded-md font-medium"
                  >
                    {prep}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: Model Architecture & Training */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span>4. Model Architecture & Hyperparameters</span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Model Backbone</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{analysis.model}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1.5">
                Training Setup
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                {analysis.trainingSetup}
              </p>
            </div>
          </div>

          {/* Card 5: Results & Metrics */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>5. Evaluation Metrics & Quantitative Findings</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(analysis.results).map(([key, val], i) => (
                <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-500 block truncate">{key}</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 6: Limitations & Future Directions */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>6. Documented Limitations & Future Work</span>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Explicit Limitations</div>
              <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                {analysis.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Future Directions</div>
              <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                {analysis.futureWork.map((fw, i) => (
                  <li key={i}>{fw}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
