'use client';

import React, { useState } from 'react';
import { Paper } from '@/lib/db/types';
import {
  HelpCircle,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertOctagon,
  GraduationCap,
  Brain,
  HelpCircle as QuestionIcon,
} from 'lucide-react';

interface HumanFirstToolsProps {
  papers: Paper[];
}

export const HumanFirstTools: React.FC<HumanFirstToolsProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState(papers[0]?.id || '');
  const [mode, setMode] = useState<'challenge' | 'explain_methodology' | 'quiz'>('challenge');
  const [userHypothesis, setUserHypothesis] = useState(
    'Phonetic subword regularization will generalize universally across all Indic regional dialects without task-specific tuning.'
  );
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleExecute = async () => {
    if (!selectedPaperId) return;

    setLoading(true);
    setOutput(null);
    setQuizData(null);
    setSelectedAnswers({});

    try {
      const res = await fetch('/api/human-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          paperId: selectedPaperId,
          userArgument: userHypothesis,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.quiz) {
          setQuizData(data.quiz);
        } else {
          setOutput(data.output);
        }
      } else {
        alert(data.error || 'Failed to process inquiry');
      }
    } catch (err) {
      console.error('Human tools error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <GraduationCap className="w-4 h-4" />
            </span>
            <span>Human-First Academic Reasoning & Socratic Inquiry</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Optional socratic dialogue tools to challenge assumptions, stress-test hypotheses, and explain intricate methodologies.
          </p>
        </div>

        {/* Paper Selector & Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs shrink-0 flex-wrap">
            <button
              onClick={() => setMode('challenge')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'challenge'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Challenge My Understanding
            </button>
            <button
              onClick={() => setMode('explain_methodology')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'explain_methodology'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Explain Methodology
            </button>
            <button
              onClick={() => setMode('quiz')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'quiz'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Quiz Me on Paper
            </button>
          </div>

          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[280px] truncate focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Input for Challenge mode */}
        {mode === 'challenge' && (
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
              Your Current Research Assumption / Hypothesis:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={userHypothesis}
                onChange={(e) => setUserHypothesis(e.target.value)}
                placeholder="State your interpretation to be rigorously challenged..."
                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                onClick={handleExecute}
                disabled={loading}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs shrink-0"
              >
                {loading ? 'Analyzing...' : 'Challenge Viewpoint'}
              </button>
            </div>
          </div>
        )}

        {(mode === 'explain_methodology' || mode === 'quiz') && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50 shadow-xs"
            >
              {loading
                ? 'Processing...'
                : mode === 'explain_methodology'
                ? 'Generate Methodology Deep-Dive'
                : 'Generate 3-Question Paper Quiz'}
            </button>
          </div>
        )}
      </div>

      {/* Socratic Output Card */}
      {output && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line font-sans">
            {output}
          </div>
        </div>
      )}

      {/* Quiz Card */}
      {quizData && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Comprehension Check: Grounded in Paper Evidence
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Verify your factual understanding of the paper&apos;s empirical claims and limitations.
            </p>
          </div>

          <div className="space-y-6">
            {quizData.map((q, qIdx) => {
              const selected = selectedAnswers[qIdx];
              const isAnswered = selected !== undefined;

              return (
                <div key={qIdx} className="space-y-3.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {qIdx + 1}. {q.question}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {q.options.map((opt: string, optIdx: number) => {
                      const isSelected = selected === optIdx;
                      const isCorrect = optIdx === q.correctIndex;

                      let btnStyle = 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300';
                      if (isAnswered) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => {
                            if (!isAnswered) {
                              setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx });
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className="p-3.5 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Verification Note:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
