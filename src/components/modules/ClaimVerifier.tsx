'use client';

import React, { useState } from 'react';
import { ClaimVerificationRecord } from '@/lib/db/types';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

interface ClaimVerifierProps {
  projectId: string;
}

export const ClaimVerifier: React.FC<ClaimVerifierProps> = ({ projectId }) => {
  const [claimInput, setClaimInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimVerificationRecord | null>(null);

  const sampleClaims = [
    'XLM-R outperformed mBERT on Chittagonian sentiment classification.',
    'BanglaBERT achieves superior performance over XLM-R when text is pre-normalized.',
    'Zero-shot transfer from Standard Bengali to Chittagonian degrades Macro-F1 by more than 20%.',
    'Non-native annotators achieved a higher agreement kappa than native speakers.',
    'Quantum computing was utilized to train the subword tokenizer.',
  ];

  const handleVerify = async (claimToVerify?: string) => {
    const text = claimToVerify || claimInput;
    if (!text.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/evidence/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, claim: text }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Claim verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Supported':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>SUPPORTED</span>
          </span>
        );
      case 'Partially Supported':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>PARTIALLY SUPPORTED</span>
          </span>
        );
      case 'Contradicted':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-mono">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>CONTRADICTED</span>
          </span>
        );
      case 'Insufficient Evidence':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>INSUFFICIENT EVIDENCE</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Rigorous Claim Verification Workflow</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Test any empirical assertion against project document chunks. The system never fabricates evidence.
          </p>
        </div>

        {/* Input & Form */}
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="Enter a scientific claim to verify against literature (e.g. 'XLM-R outperformed mBERT')..."
              className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleVerify()}
              disabled={loading || !claimInput.trim()}
              className="px-4 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0 shadow-2xs"
            >
              {loading ? 'Verifying against chunks...' : 'Verify Claim'}
            </button>
          </div>

          {/* Quick Click Sample Claims */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mr-1 font-mono uppercase text-[10px]">Test assertions:</span>
            {sampleClaims.map((sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setClaimInput(sample);
                  handleVerify(sample);
                }}
                className="text-[11px] bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full transition-colors text-left font-medium"
              >
                {sample.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="text-[11px] font-mono text-zinc-400">
              AUDIT RECORD #{result.id} · {new Date(result.checkedAt).toLocaleTimeString()}
            </div>
            {getStatusBadge(result.status)}
          </div>

          {/* Claim Text */}
          <div>
            <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              CLAIM TESTED
            </div>
            <div className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
              &ldquo;{result.claimText}&rdquo;
            </div>
          </div>

          {/* Grounded Result / Source */}
          {result.status !== 'Insufficient Evidence' && result.sourcePaperTitle ? (
            <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2.5">
                <div>
                  <span className="text-zinc-400 block uppercase text-[10px] font-mono">Source Publication</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {result.sourcePaperTitle}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block uppercase text-[10px] font-mono">Verified Location</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {result.location}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block uppercase text-[10px] font-mono mb-1">
                  Verbatim Passage Evidence
                </span>
                <p className="italic text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#0c101a] p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 leading-relaxed">
                  &ldquo;{result.evidenceSnippet}&rdquo;
                </p>
              </div>

              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                <strong className="text-zinc-800 dark:text-zinc-200">Analysis:</strong> {result.explanation}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                No supporting evidence was found in the available sources.
              </p>
              <p className="text-[11px] text-zinc-500">
                The current project papers and uploaded manuscripts do not contain matching empirical data or textual grounding for this assertion.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
