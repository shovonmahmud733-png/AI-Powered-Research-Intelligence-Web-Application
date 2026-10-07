'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Evidence, Paper } from '@/lib/db/types';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Filter,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Quote,
  BookOpen,
  ArrowRight,
  Download,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  X,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';

interface EvidenceEngineProps {
  projectId: string;
  papers: Paper[];
  onOpenPaper?: (paperId: string) => void;
  onNavigateToContradictions?: () => void;
}

export const EvidenceEngine: React.FC<EvidenceEngineProps> = ({
  projectId,
  papers,
  onOpenPaper,
  onNavigateToContradictions,
}) => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaperId, setFilterPaperId] = useState<string>('all');
  const [filterEvidenceType, setFilterEvidenceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'confidence_desc' | 'confidence_asc' | 'paper_title'>('date_desc');

  // Interactive Card States
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // New Evidence Drawer / Modal Form State
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [claim, setClaim] = useState('');
  const [selectedPaperId, setSelectedPaperId] = useState(papers[0]?.id || '');
  const [page, setPage] = useState(1);
  const [section, setSection] = useState('Results & Evaluation');
  const [snippet, setSnippet] = useState('');
  const [location, setLocation] = useState('Results → Table 4 → Page 8');
  const [status, setStatus] = useState<Evidence['verificationStatus']>('supported');
  const [evidenceType, setEvidenceType] = useState<Evidence['evidenceType']>('empirical');
  const [confidence, setConfidence] = useState<number>(0.95);

  const suggestedSections = [
    'Results & Evaluation',
    'Methodology & Architecture',
    'Ablation Studies',
    'Discussion & Limitations',
    'Introduction & Problem Formulation',
  ];

  const fetchEvidence = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/evidence?projectId=${projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to load evidence (HTTP ${res.status})`);
      }
      const data = await res.json();
      setEvidenceList(data.evidence || []);
    } catch (err: any) {
      console.error('Evidence fetch error:', err);
      setFetchError(err.message || 'Unable to retrieve grounded evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchEvidence();
    }
  }, [projectId]);

  // Sync default paper selection if papers update
  useEffect(() => {
    if (papers.length > 0 && (!selectedPaperId || !papers.some((p) => p.id === selectedPaperId))) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers, selectedPaperId]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = evidenceList.length;
    const supported = evidenceList.filter((e) => e.verificationStatus === 'supported').length;
    const partially = evidenceList.filter((e) => e.verificationStatus === 'partially_supported').length;
    const contradicted = evidenceList.filter((e) => e.verificationStatus === 'contradicted').length;
    const insufficient = evidenceList.filter((e) => e.verificationStatus === 'insufficient_evidence').length;
    const requiresVerification = evidenceList.filter((e) => e.verificationStatus === 'requires_verification').length;
    const supportedRate = total > 0 ? Math.round((supported / total) * 100) : 0;

    return {
      total,
      supported,
      partially,
      contradicted,
      insufficient,
      requiresVerification,
      supportedRate,
    };
  }, [evidenceList]);

  // Filtered and Sorted Evidence
  const filteredEvidence = useMemo(() => {
    return evidenceList
      .filter((item) => {
        // Status filter
        if (filterStatus !== 'all' && item.verificationStatus !== filterStatus) {
          return false;
        }
        // Paper filter
        if (filterPaperId !== 'all' && item.paperId !== filterPaperId) {
          return false;
        }
        // Evidence Type filter
        if (filterEvidenceType !== 'all' && item.evidenceType !== filterEvidenceType) {
          return false;
        }
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchClaim = item.claim?.toLowerCase().includes(q);
          const matchSnippet = item.snippet?.toLowerCase().includes(q);
          const matchSection = item.section?.toLowerCase().includes(q);
          const matchPaper = item.paperTitle?.toLowerCase().includes(q);
          const matchLocation = item.location?.toLowerCase().includes(q);
          return matchClaim || matchSnippet || matchSection || matchPaper || matchLocation;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'confidence_desc') {
          return (b.confidence ?? 0) - (a.confidence ?? 0);
        }
        if (sortBy === 'confidence_asc') {
          return (a.confidence ?? 0) - (b.confidence ?? 0);
        }
        if (sortBy === 'paper_title') {
          return (a.paperTitle || '').localeCompare(b.paperTitle || '');
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        // date_desc (default)
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [evidenceList, filterStatus, filterPaperId, filterEvidenceType, searchQuery, sortBy]);

  const toggleSnippetExpand = (id: string) => {
    setExpandedSnippets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyCitation = async (item: Evidence) => {
    const paper = papers.find((p) => p.id === item.paperId);
    const authors = paper?.authors?.length ? paper.authors.join(', ') : 'Unknown Authors';
    const year = paper?.publicationYear ? ` (${paper.publicationYear})` : '';
    const doi = paper?.doi ? ` DOI: ${paper.doi}` : '';
    const textToCopy = `[Claim]: "${item.claim}"\n[Evidence]: "${item.snippet}"\n[Source]: ${item.paperTitle} - ${authors}${year}\n[Location]: ${item.location} (Page ${item.page}, Section: ${item.section})${doi}\n[Verification]: ${item.verificationStatus.toUpperCase()}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.warn('Failed to copy text', e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim()) {
      setFormError('Please provide a specific research claim to record.');
      return;
    }
    if (!snippet.trim()) {
      setFormError('Please include the verbatim supporting/contradicting snippet from the paper.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const selectedPaper = papers.find((p) => p.id === selectedPaperId);

    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          paperId: selectedPaperId,
          paperTitle: selectedPaper?.title,
          claim: claim.trim(),
          page: Number(page) || 1,
          section: section.trim(),
          snippet: snippet.trim(),
          location: location.trim() || `${section} → Page ${page}`,
          verificationStatus: status,
          evidenceType,
          confidence: Number(confidence) || 0.95,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save evidence');
      }

      setIsAdding(false);
      setClaim('');
      setSnippet('');
      fetchEvidence();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record evidence. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/evidence?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvidenceList((prev) => prev.filter((e) => e.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert('Could not delete evidence item.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvidence, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `evidence-repository-${projectId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportFeedback('Exported evidence as JSON file');
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const copyMarkdownSummary = async () => {
    if (filteredEvidence.length === 0) return;

    let md = `# Grounded Evidence Summary (${filteredEvidence.length} items)\n\n`;
    filteredEvidence.forEach((item, idx) => {
      md += `### ${idx + 1}. ${item.claim}\n`;
      md += `- **Verification Status**: \`${item.verificationStatus.toUpperCase()}\` (Confidence: ${Math.round((item.confidence ?? 0.9) * 100)}%)\n`;
      md += `- **Evidence Type**: ${item.evidenceType || 'empirical'}\n`;
      md += `- **Source Paper**: *${item.paperTitle}*\n`;
      md += `- **Location**: ${item.location} (Page ${item.page}, Section: ${item.section})\n`;
      md += `- **Verbatim Extract**:\n> "${item.snippet}"\n\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      setExportFeedback('Copied Markdown synthesis to clipboard');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (e) {
      console.warn('Failed to copy markdown', e);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterPaperId('all');
    setFilterEvidenceType('all');
    setSortBy('date_desc');
  };

  const getStatusBadgeConfig = (statusVal: string) => {
    switch (statusVal) {
      case 'supported':
        return {
          label: 'Supported',
          icon: CheckCircle2,
          badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
          dotClass: 'bg-emerald-500',
        };
      case 'partially_supported':
        return {
          label: 'Partially Supported',
          icon: CheckCircle2,
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
          dotClass: 'bg-blue-500',
        };
      case 'contradicted':
        return {
          label: 'Contradicted',
          icon: AlertTriangle,
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
          dotClass: 'bg-rose-500',
        };
      case 'requires_verification':
        return {
          label: 'Requires Verification',
          icon: HelpCircle,
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
          dotClass: 'bg-amber-500',
        };
      case 'insufficient_evidence':
      default:
        return {
          label: 'Insufficient Evidence',
          icon: HelpCircle,
          badgeClass: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80',
          dotClass: 'bg-zinc-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Header */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BookmarkCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <span>Evidence Engine & Source Verification</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
                    {evidenceList.length} Grounded Findings
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Bidirectional claim-to-text verification hierarchy: <span className="font-semibold text-zinc-700 dark:text-zinc-300">Claim</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Verbatim Extract</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Source Paper</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Exact Section & Page</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
            <button
              onClick={() => fetchEvidence()}
              disabled={loading}
              className="p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 rounded-xl transition-colors text-xs font-medium"
              title="Refresh Repository"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={copyMarkdownSummary}
              disabled={filteredEvidence.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Copy Markdown synthesis"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Markdown</span>
            </button>

            <button
              onClick={exportToJson}
              disabled={filteredEvidence.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Download JSON evidence records"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              onClick={() => {
                setFormError(null);
                setIsAdding(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Grounded Claim</span>
            </button>
          </div>
        </div>

        {/* Export Feedback Toast */}
        {exportFeedback && (
          <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Total Claims</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
            {metrics.total}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Across {papers.length} indexed papers</p>
        </div>

        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Supported</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
            {metrics.supported}
          </div>
          <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
            {metrics.supportedRate}% fully verified
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Contradictions</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono">
            {metrics.contradicted}
          </div>
          <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90">
            Scholarly divergence findings
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Partial / Gaps</span>
            <HelpCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">
            {metrics.partially + metrics.insufficient}
          </div>
          <p className="text-[11px] text-blue-600/90 dark:text-blue-400/90">
            Requires further evidence
          </p>
        </div>
      </div>

      {/* 3. Search and Multi-Attribute Filter Bar */}
      <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims, snippets, sections, paper titles, or location..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="all">All Statuses ({evidenceList.length})</option>
              <option value="supported">Supported ({metrics.supported})</option>
              <option value="partially_supported">Partially Supported ({metrics.partially})</option>
              <option value="contradicted">Contradicted ({metrics.contradicted})</option>
              <option value="insufficient_evidence">Insufficient Evidence ({metrics.insufficient})</option>
              <option value="requires_verification">Requires Verification ({metrics.requiresVerification})</option>
            </select>

            {/* Filter by Paper */}
            <select
              value={filterPaperId}
              onChange={(e) => setFilterPaperId(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">All Source Papers</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.length > 35 ? p.title.substring(0, 35) + '...' : p.title}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="date_desc">Newest Recorded</option>
              <option value="date_asc">Oldest Recorded</option>
              <option value="confidence_desc">Highest Confidence</option>
              <option value="confidence_asc">Lowest Confidence</option>
              <option value="paper_title">By Paper Title</option>
            </select>
          </div>
        </div>

        {/* Active Filters Pill Bar (if any filter is active) */}
        {(searchQuery || filterStatus !== 'all' || filterPaperId !== 'all' || filterEvidenceType !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500">
            <span className="text-[11px] font-medium text-zinc-400">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Search: &ldquo;{searchQuery}&rdquo;
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 dark:hover:text-blue-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('all')} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterPaperId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
                Paper Filter
                <button onClick={() => setFilterPaperId('all')} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline ml-auto font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Add Grounded Claim Modal / Drawer */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Record Grounded Research Claim
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Extract and ground an empirical assertion directly from peer-reviewed literature.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Claim */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Research Claim <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="e.g., XLM-R outperformed mBERT by 4.9% Macro-F1 on dialect test set"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Source Paper Selection */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Source Paper in Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.publicationYear ? `(${p.publicationYear})` : ''}
                    </option>
                  ))}
                  {papers.length === 0 && (
                    <option value="">No papers in project (upload papers first)</option>
                  )}
                </select>
              </div>

              {/* Location Hierarchy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Section Name
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => {
                      setSection(e.target.value);
                      setLocation(`${e.target.value} → Page ${page}`);
                    }}
                    placeholder="e.g., Results & Evaluation"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {/* Suggested chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {suggestedSections.slice(0, 3).map((sec) => (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => {
                          setSection(sec);
                          setLocation(`${sec} → Page ${page}`);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-mono"
                      >
                        {sec.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Page Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 1;
                      setPage(p);
                      setLocation(`${section} → Page ${p}`);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Hierarchy / Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Results → Table 4 → Page 8"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Status and Evidence Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Verification Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="supported">Supported</option>
                    <option value="partially_supported">Partially Supported</option>
                    <option value="contradicted">Contradicted</option>
                    <option value="insufficient_evidence">Insufficient Evidence</option>
                    <option value="requires_verification">Requires Verification</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Evidence Type
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="empirical">Empirical Result</option>
                    <option value="benchmark">Benchmark Evaluation</option>
                    <option value="theoretical">Theoretical Derivation</option>
                    <option value="qualitative">Qualitative Analysis</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Confidence ({Math.round(confidence * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.01"
                    value={confidence}
                    onChange={(e) => setConfidence(parseFloat(e.target.value))}
                    className="w-full mt-2 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Direct Evidence Snippet */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Verbatim Quote / Extract <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  placeholder="Exact quote from the paper justifying or contradicting the claim..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-serif"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Maintain scholarly integrity: provide exact text verbatim without fabrication.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Recording...' : 'Record & Ground Claim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Evidence Records List */}
      <div className="space-y-4">
        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-16 w-full bg-zinc-100 dark:bg-zinc-850 rounded-xl" />
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {fetchError && !loading && (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
            <p className="text-xs font-bold text-red-800 dark:text-red-300">{fetchError}</p>
            <button
              onClick={() => fetchEvidence()}
              className="text-xs text-red-700 dark:text-red-400 font-semibold underline hover:no-underline"
            >
              Try reloading
            </button>
          </div>
        )}

        {/* Empty States */}
        {!loading && !fetchError && filteredEvidence.length === 0 && (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#0f1422] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit mx-auto text-zinc-400">
              <BookmarkCheck className="w-8 h-8" />
            </div>
            {evidenceList.length === 0 ? (
              <>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No Grounded Evidence Recorded Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Start grounding research hypotheses with verifiable citations, page coordinates, and direct quotes from papers in this project.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Grounded Claim</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No Matching Evidence Found
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  No records match your active search and filter criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200 transition-colors"
                >
                  <span>Reset All Filters</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Evidence Cards */}
        {!loading &&
          filteredEvidence.map((item) => {
            const statusConfig = getStatusBadgeConfig(item.verificationStatus);
            const StatusIcon = statusConfig.icon;
            const isSnippetExpanded = expandedSnippets[item.id] || false;
            const isCopied = copiedId === item.id;
            const isDeleting = deleteConfirmId === item.id;

            // Enrich with paper metadata if present in papers array
            const enrichedPaper = papers.find((p) => p.id === item.paperId);
            const paperAuthors = enrichedPaper?.authors?.length
              ? enrichedPaper.authors.length > 2
                ? `${enrichedPaper.authors[0]} et al.`
                : enrichedPaper.authors.join(', ')
              : null;
            const publicationInfo = enrichedPaper?.journalOrConference
              ? `${enrichedPaper.journalOrConference}${enrichedPaper.publicationYear ? ` (${enrichedPaper.publicationYear})` : ''}`
              : enrichedPaper?.publicationYear
              ? `Published ${enrichedPaper.publicationYear}`
              : null;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
              >
                {/* 1. Card Top Bar: Status, Location, Confidence & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/70">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border font-mono tracking-tight ${statusConfig.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusConfig.label.toUpperCase()}</span>
                    </span>

                    {/* Evidence Type */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 uppercase font-mono">
                      {item.evidenceType || 'empirical'}
                    </span>

                    {/* Exact Location Tag */}
                    {item.location && (
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span className="text-zinc-400">Loc:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Right side: Confidence & Actions */}
                  <div className="flex items-center space-x-2">
                    {item.confidence !== undefined && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800">
                        {Math.round(item.confidence * 100)}% Confidence
                      </span>
                    )}

                    {/* Copy Citation Button */}
                    <button
                      onClick={() => handleCopyCitation(item)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy grounded citation"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete with inline confirmation */}
                    {isDeleting ? (
                      <div className="flex items-center space-x-1 bg-red-50 dark:bg-red-950/60 p-1 rounded-lg border border-red-200 dark:border-red-800/80 text-[11px]">
                        <span className="text-red-700 dark:text-red-300 font-semibold px-1">Delete?</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 text-zinc-600 dark:text-zinc-300 hover:bg-red-100 dark:hover:bg-red-900/60 rounded text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Delete this evidence record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. LEVEL 1: THE RESEARCH CLAIM */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-zinc-400 dark:text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Claim Under Investigation</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
                    {item.claim}
                  </h3>
                </div>

                {/* 3. LEVEL 2: VERBATIM EXTRACT / SNIPPET */}
                <div className="p-4 bg-zinc-50/90 dark:bg-zinc-900/70 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 relative">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                      <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Verbatim Extract</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {item.page !== undefined && item.page !== null && (
                        <span className="bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                          Page {item.page}
                        </span>
                      )}
                      {item.section && (
                        <span className="text-zinc-400 hidden sm:inline">Section: {item.section}</span>
                      )}
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 italic leading-relaxed font-serif">
                    &ldquo;
                    {isSnippetExpanded || item.snippet.length <= 220
                      ? item.snippet
                      : `${item.snippet.substring(0, 220)}...`}
                    &rdquo;
                  </p>

                  {/* Expand / Collapse Button if long */}
                  {item.snippet.length > 220 && (
                    <button
                      onClick={() => toggleSnippetExpand(item.id)}
                      className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                    >
                      <span>{isSnippetExpanded ? 'Show less' : 'Show full quote'}</span>
                      {isSnippetExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* 4. LEVEL 3: SOURCE PAPER IDENTITY & CONTEXT */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#121828] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-xs">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {enrichedPaper?.title || item.paperTitle}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 pl-5">
                      {paperAuthors && <span>{paperAuthors}</span>}
                      {publicationInfo && <span>• {publicationInfo}</span>}
                      {enrichedPaper?.doi && (
                        <a
                          href={`https://doi.org/${enrichedPaper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>DOI: {enrichedPaper.doi}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {(enrichedPaper?.openAccessUrl || enrichedPaper?.url) && (
                        <a
                          href={enrichedPaper.openAccessUrl || enrichedPaper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>PDF / Source</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Direct Paper Navigation Callback */}
                  {onOpenPaper && item.paperId && (
                    <button
                      onClick={() => onOpenPaper(item.paperId)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors shrink-0 self-start sm:self-center"
                    >
                      <span>Inspect Paper</span>
                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                    </button>
                  )}
                </div>

                {/* 5. LEVEL 4: DIALECTICAL TENSION CALLOUT (IF CONTRADICTED) */}
                {item.verificationStatus === 'contradicted' && (
                  <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-semibold text-xs">
                        <Scale className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Scholarly Contradiction Finding</span>
                      </div>
                      {onNavigateToContradictions && (
                        <button
                          onClick={onNavigateToContradictions}
                          className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Explore Contradiction Detector</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                      This finding conflicts with or qualifies competing assertions in the project literature. Scholarly contradiction is normal in active research—differences in tokenization, baselines, or hyperparameters explain the divergence.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
