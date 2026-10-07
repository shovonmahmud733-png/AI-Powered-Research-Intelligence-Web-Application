'use client';

import React, { useState, useEffect } from 'react';
import { ClaimVerificationRecord, Paper } from '@/lib/db/types';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Quote,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Layers,
  Scale,
  Clock,
  History,
  Trash2,
  BookmarkCheck,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react';

interface ClaimVerifierProps {
  projectId: string;
  papers?: Paper[];
  selectedPaperId?: string | null;
  onOpenPaper?: (paperId: string) => void;
  onNavigateToContradictions?: () => void;
  onNavigateToEvidence?: () => void;
}

export const ClaimVerifier: React.FC<ClaimVerifierProps> = ({
  projectId,
  papers = [],
  selectedPaperId = null,
  onOpenPaper,
  onNavigateToContradictions,
  onNavigateToEvidence,
}) => {
  const [claimInput, setClaimInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [result, setResult] = useState<ClaimVerificationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scope: 'project' (all papers) or 'single_paper' (isolated to one paper)
  const [verificationScope, setVerificationScope] = useState<'project' | 'single_paper'>('project');
  const [scopePaperId, setScopePaperId] = useState<string>(selectedPaperId || (papers[0]?.id ?? ''));

  // Interactive feedback states
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [saveEvidenceSuccess, setSaveEvidenceSuccess] = useState(false);

  // Verification History (persisted in local state)
  const [history, setHistory] = useState<ClaimVerificationRecord[]>([]);

  // Sync selected paper if passed from parent
  useEffect(() => {
    if (selectedPaperId) {
      setScopePaperId(selectedPaperId);
    }
  }, [selectedPaperId]);

  // Load session history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      try {
        const stored = localStorage.getItem(`rp_claim_history_${projectId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHistory(parsed);
          }
        }
      } catch (e) {
        console.warn('Could not parse verification history:', e);
      }
    }
  }, [projectId]);

  const saveToHistory = (newRecord: ClaimVerificationRecord) => {
    setHistory((prev) => {
      // Remove duplicates by claimText
      const filtered = prev.filter((item) => item.claimText !== newRecord.claimText);
      const updated = [newRecord, ...filtered].slice(0, 10);
      if (typeof window !== 'undefined' && projectId) {
        try {
          localStorage.setItem(`rp_claim_history_${projectId}`, JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save verification history:', e);
        }
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== 'undefined' && projectId) {
      localStorage.removeItem(`rp_claim_history_${projectId}`);
    }
  };

  const sampleClaims = [
    'XLM-R outperformed mBERT by 4.9% Macro-F1 on dialect test set.',
    'BanglaBERT achieves superior performance over XLM-R when text is pre-normalized.',
    'Zero-shot transfer from Standard Bengali to Chittagonian degrades Macro-F1 by more than 20%.',
    'Non-native annotators misinterpret colloquial sarcasm in dialectal sentences.',
    'Chatgaiya tokens suffer from a 48.3% high-order fragmentation rate in standard SentencePiece.',
    'Quantum computing was utilized to train the dialectal subword tokenizer.',
  ];

  const handleVerify = async (claimToVerify?: string) => {
    const text = (claimToVerify || claimInput).trim();
    if (!text) {
      setError('Please provide a specific scientific claim to verify.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveEvidenceSuccess(false);

    // Staged status indicators corresponding to real application workflow
    setLoadingStage('Analyzing assertion semantics...');
    const timer1 = setTimeout(() => {
      setLoadingStage('Retrieving candidate document chunks...');
    }, 250);
    const timer2 = setTimeout(() => {
      setLoadingStage('Evaluating passage alignment & contradictions...');
    }, 550);

    try {
      const payload: any = { projectId, claim: text };
      if (verificationScope === 'single_paper' && scopePaperId) {
        payload.paperId = scopePaperId;
      }

      const res = await fetch('/api/evidence/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification request failed');
      }

      setResult(data);
      saveToHistory(data);
    } catch (err: any) {
      console.error('Claim verification error:', err);
      setError(err.message || 'Verification could not be completed. Please check your connection and retry.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleCopyAudit = async () => {
    if (!result) return;
    const text = `[AUDIT RECORD #${result.id}]\nClaim: "${result.claimText}"\nStatus: ${result.status}\nExplanation: ${result.explanation}\nSource: ${result.sourcePaperTitle || 'N/A'}\nLocation: ${result.location || 'N/A'}\nEvidence Passage: "${result.evidenceSnippet || 'None'}"\nVerified At: ${new Date(result.checkedAt).toLocaleString()}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2500);
    } catch (e) {
      console.warn('Copy error:', e);
    }
  };

  const handleSaveAsEvidence = async () => {
    if (!result || !result.sourcePaperId) return;

    setIsSavingEvidence(true);
    try {
      const mappedStatus = {
        Supported: 'supported',
        'Partially Supported': 'partially_supported',
        Contradicted: 'contradicted',
        'Insufficient Evidence': 'insufficient_evidence',
        'Requires Verification': 'requires_verification',
      }[result.status] || 'supported';

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          paperId: result.sourcePaperId,
          paperTitle: result.sourcePaperTitle,
          claim: result.claimText,
          snippet: result.evidenceSnippet || '',
          location: result.location || 'Verified Passage',
          verificationStatus: mappedStatus,
          evidenceType: 'empirical',
          confidence: 0.95,
        }),
      });

      if (res.ok) {
        setSaveEvidenceSuccess(true);
      } else {
        alert('Failed to record into Evidence Repository');
      }
    } catch (err) {
      console.error('Save evidence error:', err);
    } finally {
      setIsSavingEvidence(false);
    }
  };

  const getStatusPresentation = (status: string) => {
    switch (status) {
      case 'Supported':
        return {
          label: 'SUPPORTED',
          icon: CheckCircle2,
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          dotClass: 'bg-emerald-500',
          meaning: 'Evidence in the corpus directly confirms the claim without conflicting qualifications.',
        };
      case 'Partially Supported':
        return {
          label: 'PARTIALLY SUPPORTED',
          icon: AlertCircle,
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          dotClass: 'bg-blue-500',
          meaning: 'Evidence substantiates aspects of the claim, but key constraints, baselines, or margins require qualification.',
        };
      case 'Contradicted':
        return {
          label: 'CONTRADICTED',
          icon: Scale,
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          dotClass: 'bg-rose-500',
          meaning: 'Empirical findings in the indexed manuscript report outcomes contrary to this assertion.',
        };
      case 'Requires Verification':
        return {
          label: 'REQUIRES VERIFICATION',
          icon: AlertTriangle,
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          dotClass: 'bg-amber-500',
          meaning: 'Ambiguity or divergent definitions in literature require manual expert researcher validation.',
        };
      case 'Insufficient Evidence':
      default:
        return {
          label: 'INSUFFICIENT EVIDENCE',
          icon: HelpCircle,
          badgeClass: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80',
          dotClass: 'bg-zinc-400',
          meaning: 'Available literature chunks do not contain enough empirical data to substantiate or refute this claim.',
        };
    }
  };

  const selectedScopePaper = papers.find((p) => p.id === scopePaperId);

  return (
    <div className="space-y-6">
      {/* 1. Header & Verification Scope Control */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                <span>Claim Verification Workspace</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
                  Evidence-Grounded Audit
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Test empirical assertions against indexed document chunks. Never hallucinates grounding or fabricates citations.
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <button
              onClick={() => setVerificationScope('project')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                verificationScope === 'project'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              All Project Papers
            </button>
            <button
              onClick={() => setVerificationScope('single_paper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                verificationScope === 'single_paper'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Single Paper Scope
            </button>
          </div>
        </div>

        {/* Single Paper Scope Context Bar (when in single paper mode) */}
        {verificationScope === 'single_paper' && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold">Isolated Paper Scope:</span>
              <span className="truncate font-medium">{selectedScopePaper?.title || 'Selected Paper'}</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={scopePaperId}
                onChange={(e) => setScopePaperId(e.target.value)}
                className="text-xs bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-800 rounded-lg px-2.5 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[220px] truncate"
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 2. Claim Input Area */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="Enter a scientific claim or hypothesis to verify (e.g. 'XLM-R outperformed mBERT by 4.9% Macro-F1 on dialect test set')..."
              className="w-full text-xs sm:text-[13px] bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 rounded-xl p-3.5 pr-20 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed transition-all"
            />
            {claimInput && (
              <button
                onClick={() => setClaimInput('')}
                className="absolute right-3 top-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title="Clear input"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span>{claimInput.length} chars</span>
              <span>•</span>
              <span>Scope: {verificationScope === 'single_paper' ? 'Single Paper Isolation' : 'Project Corpus'}</span>
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={loading || !claimInput.trim()}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-2xs shrink-0"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingStage || 'Verifying assertion...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Claim Against Literature</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Click Sample Claims */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Curated Academic Test Assertions:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sampleClaims.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setClaimInput(sample);
                    handleVerify(sample);
                  }}
                  className="text-[11px] bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full transition-colors text-left font-medium max-w-full truncate"
                  title={sample}
                >
                  {sample.length > 55 ? `${sample.substring(0, 55)}...` : sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => handleVerify()}
            className="text-xs font-bold underline hover:no-underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Loading State Skeleton */}
      {loading && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-850 rounded-xl" />
          <div className="h-10 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
        </div>
      )}

      {/* 5. Verification Result Workspace */}
      {result && !loading && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 animate-fadeIn">
          {/* Audit Record Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-semibold text-zinc-400">
                  AUDIT #{result.id}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(result.checkedAt).toLocaleTimeString()}</span>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {verificationScope === 'single_paper' ? 'Single Paper Scope' : 'Project Corpus'}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            {(() => {
              const statusPres = getStatusPresentation(result.status);
              const StatusIcon = statusPres.icon;
              return (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border font-mono tracking-tight ${statusPres.badgeClass}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    <span>{statusPres.label}</span>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* LEVEL 1: TESTED CLAIM */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Tested Empirical Claim</span>
            </div>
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/70 dark:border-zinc-800 text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
              &ldquo;{result.claimText}&rdquo;
            </div>
          </div>

          {/* LEVEL 2: STATUS SEMANTICS & REASONING ANALYSIS */}
          <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>Verification Analysis & Semantic Alignment</span>
              </span>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {result.explanation}
            </p>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60">
              <strong className="text-zinc-700 dark:text-zinc-300">Status Semantics:</strong> {getStatusPresentation(result.status).meaning}
            </p>
          </div>

          {/* LEVEL 3: GROUNDED PASSAGE EVIDENCE (When available) */}
          {result.status !== 'Insufficient Evidence' && result.evidenceSnippet ? (
            <div className="space-y-3">
              {/* Contradiction Specific Presentation */}
              {result.status === 'Contradicted' && (
                <div className="p-4 bg-rose-50/90 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-rose-600" />
                      <span>Empirical Contradiction Detected in Literature</span>
                    </span>
                    {onNavigateToContradictions && (
                      <button
                        onClick={onNavigateToContradictions}
                        className="text-[11px] underline hover:no-underline font-semibold"
                      >
                        Open Contradiction Matrix →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-rose-200/60 dark:border-rose-900/50">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1">
                        Claim Stated
                      </span>
                      <p className="text-zinc-900 dark:text-zinc-100 font-medium">
                        &ldquo;{result.claimText}&rdquo;
                      </p>
                    </div>

                    <div className="p-3 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-rose-200/60 dark:border-rose-900/50">
                      <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold block mb-1">
                        Literature Finding Contrary
                      </span>
                      <p className="text-zinc-900 dark:text-zinc-100 italic font-serif">
                        &ldquo;{result.evidenceSnippet}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Passage Evidence Box */}
              {result.status !== 'Contradicted' && (
                <div className="p-4 bg-zinc-50/90 dark:bg-zinc-900/70 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                      <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Grounded Literature Passage</span>
                    </span>
                    <span className="bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {result.location}
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-zinc-800 dark:text-zinc-200 italic leading-relaxed font-serif p-3 bg-white dark:bg-[#0c101a] rounded-lg border border-zinc-200/70 dark:border-zinc-800/80">
                    &ldquo;{result.evidenceSnippet}&rdquo;
                  </p>
                </div>
              )}

              {/* LEVEL 4: SOURCE PAPER PROVENANCE & ACTIONS */}
              <div className="p-3.5 bg-white dark:bg-[#121828] rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {result.sourcePaperTitle || 'Verified Scholarly Manuscript'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 pl-5">
                    {result.location && <span>Location: {result.location}</span>}
                    {(result as any).sourcePaperDoi && (
                      <a
                        href={`https://doi.org/${(result as any).sourcePaperDoi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>DOI: {(result as any).sourcePaperDoi}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Provenance Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onOpenPaper && result.sourcePaperId && (
                    <button
                      onClick={() => onOpenPaper(result.sourcePaperId!)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
                    >
                      <span>Inspect Paper</span>
                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                    </button>
                  )}

                  <button
                    onClick={handleSaveAsEvidence}
                    disabled={isSavingEvidence || saveEvidenceSuccess}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {saveEvidenceSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Saved to Evidence</span>
                      </>
                    ) : (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Save as Grounded Evidence</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* INSUFFICIENT EVIDENCE DETAILED STATE */
            <div className="p-5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-200 font-bold">
                <HelpCircle className="w-4 h-4 text-zinc-500" />
                <span>No Grounding Passage Found in Current Scope</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The indexed document chunks in this {verificationScope === 'single_paper' ? 'selected paper' : 'project corpus'} do not contain textual passages or empirical tables supporting or contradicting this claim.
              </p>
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap gap-2 text-[11px]">
                {verificationScope === 'single_paper' && (
                  <button
                    onClick={() => {
                      setVerificationScope('project');
                      handleVerify();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Scan All Project Papers
                  </button>
                )}
                <span className="text-zinc-400 self-center">
                  Recommended action: Verify manually against external literature or rephrase key terms.
                </span>
              </div>
            </div>
          )}

          {/* Audit Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <button
              onClick={handleCopyAudit}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium transition-colors"
            >
              {copiedAudit ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Audit Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Audit Record</span>
                </>
              )}
            </button>

            {saveEvidenceSuccess && onNavigateToEvidence && (
              <button
                onClick={onNavigateToEvidence}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View in Evidence Repository</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. Empty State (When no active result) */}
      {!result && !loading && (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#0f1422] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit mx-auto text-zinc-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Ready to Verify Academic Claims
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Enter a hypothesis above or click one of the curated test assertions to audit its empirical grounding across your manuscripts.
          </p>
        </div>
      )}

      {/* 7. Verification History (Session Runs) */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <History className="w-4 h-4 text-zinc-400" />
              <span>Session Verification History ({history.length})</span>
            </div>
            <button
              onClick={clearHistory}
              className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="space-y-2">
            {history.map((item) => {
              const statusPres = getStatusPresentation(item.status);
              const StatusIcon = statusPres.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setResult(item)}
                  className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer transition-all group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      &ldquo;{item.claimText}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <span>{new Date(item.checkedAt).toLocaleTimeString()}</span>
                      {item.sourcePaperTitle && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{item.sourcePaperTitle}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono tracking-tight shrink-0 self-start sm:self-center ${statusPres.badgeClass}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusPres.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
