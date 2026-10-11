'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Contradiction, Paper } from '@/lib/db/types';
import {
  AlertTriangle,
  GitCompare,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  ArrowRight,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit3,
  Save,
  X,
  ExternalLink,
  FileText,
  Sparkles,
  ChevronDown,
  Check,
  RotateCcw,
  Info,
  Tag,
  AlertCircle,
  Eye,
  Quote,
} from 'lucide-react';

interface ContradictionDetectorProps {
  projectId: string;
  papers: Paper[];
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: () => void;
}

type ConflictCategory =
  | 'direct_empirical'
  | 'methodological_divergence'
  | 'dataset_variation'
  | 'scope_difference'
  | 'theoretical';

type ReviewStatus = 'detected' | 'under_review' | 'researcher_reviewed';

const CATEGORY_METADATA: Record<ConflictCategory, { label: string; badgeClass: string; desc: string }> = {
  direct_empirical: {
    label: 'Direct Empirical Disagreement',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    desc: 'Opposing empirical claims or metric benchmarks measured under nominally equivalent targets.',
  },
  methodological_divergence: {
    label: 'Methodological Divergence',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    desc: 'Differences attributable to preprocessing pipelines, tokenizers, learning rates, or architectural variations.',
  },
  dataset_variation: {
    label: 'Evaluation Dataset Variation',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    desc: 'Disagreements driven by distinct regional corpora, dialect splits, class distributions, or data curation.',
  },
  scope_difference: {
    label: 'Scope & Setting Divergence',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    desc: 'Discrepancy due to differences in evaluation context (e.g., zero-shot vs supervised, clean vs noisy text).',
  },
  theoretical: {
    label: 'Theoretical Discrepancy',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    desc: 'Conflicting inductive hypotheses or linguistic assumptions regarding representation capacity.',
  },
};

const STATUS_METADATA: Record<ReviewStatus, { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }> = {
  detected: {
    label: 'Awaiting Review',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  under_review: {
    label: 'Under Investigation',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: AlertCircle,
  },
  researcher_reviewed: {
    label: 'Researcher Reviewed',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
};

export const ContradictionDetector: React.FC<ContradictionDetectorProps> = ({
  projectId,
  papers,
  onOpenPaper,
  onNavigateToEvidence,
}) => {
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // UI state for note editing & status update
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal State for registering a new contradiction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<ConflictCategory>('methodological_divergence');
  const [newPaperAId, setNewPaperAId] = useState('');
  const [newClaimA, setNewClaimA] = useState('');
  const [newEvidenceA, setNewEvidenceA] = useState('');
  const [newPageA, setNewPageA] = useState<number>(1);
  const [newSectionA, setNewSectionA] = useState('');
  const [newPaperBId, setNewPaperBId] = useState('');
  const [newClaimB, setNewClaimB] = useState('');
  const [newEvidenceB, setNewEvidenceB] = useState('');
  const [newPageB, setNewPageB] = useState<number>(1);
  const [newSectionB, setNewSectionB] = useState('');
  const [newPotentialReasons, setNewPotentialReasons] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ReviewStatus>('detected');

  const fetchContradictions = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/contradictions?projectId=${projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to load contradictions (${res.status})`);
      }
      const data = await res.json();
      setContradictions(data.contradictions || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMessage(err.message || 'An error occurred while loading contradiction records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchContradictions();
    }
  }, [projectId]);

  // Helper map for looking up paper details
  const papersMap = useMemo(() => {
    const map = new Map<string, Paper>();
    papers.forEach((p) => map.set(p.id, p));
    return map;
  }, [papers]);

  const formatAuthors = (authors?: string[]) => {
    if (!authors || authors.length === 0) return null;
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]}, ${authors[1]} et al.`;
  };

  // Real Metric Calculations (ZERO FABRICATION)
  const metrics = useMemo(() => {
    const total = contradictions.length;
    const paperIds = new Set<string>();
    let awaitingReviewCount = 0;
    let underInvestigationCount = 0;
    let reviewedCount = 0;
    let totalDivergenceFactors = 0;

    contradictions.forEach((c) => {
      if (c.paperAId) paperIds.add(c.paperAId);
      if (c.paperBId) paperIds.add(c.paperBId);

      const status = c.status || 'detected';
      if (status === 'detected') awaitingReviewCount++;
      else if (status === 'under_review') underInvestigationCount++;
      else if (status === 'researcher_reviewed') reviewedCount++;

      if (Array.isArray(c.potentialReasons)) {
        totalDivergenceFactors += c.potentialReasons.length;
      }
    });

    return {
      total,
      uniquePapers: paperIds.size,
      awaitingReviewCount,
      underInvestigationCount,
      reviewedCount,
      totalDivergenceFactors,
    };
  }, [contradictions]);

  // Filtered List
  const filteredContradictions = useMemo(() => {
    return contradictions.filter((c) => {
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTopic = c.topic?.toLowerCase().includes(query);
        const matchesClaimA = c.claimA?.toLowerCase().includes(query);
        const matchesClaimB = c.claimB?.toLowerCase().includes(query);
        const matchesPaperA = c.paperATitle?.toLowerCase().includes(query);
        const matchesPaperB = c.paperBTitle?.toLowerCase().includes(query);
        const matchesEvidenceA = c.evidenceA?.toLowerCase().includes(query);
        const matchesEvidenceB = c.evidenceB?.toLowerCase().includes(query);
        const matchesNotes = c.notes?.toLowerCase().includes(query);
        const matchesReasons = c.potentialReasons?.some((r) => r.toLowerCase().includes(query));

        if (!matchesTopic && !matchesClaimA && !matchesClaimB && !matchesPaperA && !matchesPaperB && !matchesEvidenceA && !matchesEvidenceB && !matchesNotes && !matchesReasons) {
          return false;
        }
      }

      // Paper Filter
      if (selectedPaperFilter !== 'all') {
        if (c.paperAId !== selectedPaperFilter && c.paperBId !== selectedPaperFilter) {
          return false;
        }
      }

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        const currentStatus = c.status || 'detected';
        if (currentStatus !== selectedStatusFilter) {
          return false;
        }
      }

      // Category Filter
      if (selectedCategoryFilter !== 'all') {
        const category = c.conflictCategory || 'methodological_divergence';
        if (category !== selectedCategoryFilter) {
          return false;
        }
      }

      return true;
    });
  }, [contradictions, searchQuery, selectedPaperFilter, selectedStatusFilter, selectedCategoryFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedPaperFilter !== 'all' || selectedStatusFilter !== 'all' || selectedCategoryFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPaperFilter('all');
    setSelectedStatusFilter('all');
    setSelectedCategoryFilter('all');
  };

  // Status Update Handler
  const handleUpdateStatus = async (id: string, newStatus: ReviewStatus) => {
    try {
      const res = await fetch('/api/contradictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { status: newStatus } }),
      });
      if (res.ok) {
        setContradictions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
        showSavedConfirmation(id);
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // Lab Note Edit and Save
  const startEditingNote = (contra: Contradiction) => {
    setEditingNoteId(contra.id);
    setNoteDraft(contra.notes || '');
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const saveNote = async (id: string) => {
    setSavingNoteId(id);
    try {
      const res = await fetch('/api/contradictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: { notes: noteDraft } }),
      });
      if (res.ok) {
        setContradictions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, notes: noteDraft } : c))
        );
        setEditingNoteId(null);
        showSavedConfirmation(id);
      }
    } catch (err) {
      console.error('Save note error:', err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const showSavedConfirmation = (id: string) => {
    setSavedSuccessId(id);
    setTimeout(() => {
      setSavedSuccessId((curr) => (curr === id ? null : curr));
    }, 2500);
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/contradictions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContradictions((prev) => prev.filter((c) => c.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Reset Modal Form
  const resetModalForm = () => {
    setNewTopic('');
    setNewCategory('methodological_divergence');
    setNewPaperAId(papers.length > 0 ? papers[0].id : '');
    setNewClaimA('');
    setNewEvidenceA('');
    setNewPageA(1);
    setNewSectionA('');
    setNewPaperBId(papers.length > 1 ? papers[1].id : papers.length > 0 ? papers[0].id : '');
    setNewClaimB('');
    setNewEvidenceB('');
    setNewPageB(1);
    setNewSectionB('');
    setNewPotentialReasons('Evaluation Dataset Discrepancy\nPreprocessing & Tokenization Pipeline Variance\nHyperparameter & Epoch Configuration Discrepancy');
    setNewNotes('');
    setNewStatus('detected');
    setModalError(null);
  };

  const openRegisterModal = () => {
    resetModalForm();
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) {
      setModalError('Disagreement topic or hypothesis title is required.');
      return;
    }
    if (!newPaperAId || !newPaperBId) {
      setModalError('Both compared papers must be selected.');
      return;
    }
    if (newPaperAId === newPaperBId) {
      setModalError('Please select two distinct papers for comparative contradiction analysis.');
      return;
    }
    if (!newClaimA.trim() || !newClaimB.trim()) {
      setModalError('Both Position A and Position B claim summaries are required.');
      return;
    }
    if (!newEvidenceA.trim() || !newEvidenceB.trim()) {
      setModalError('Verbatim empirical evidence quotations are required for both sides.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    const reasonsList = newPotentialReasons
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      const res = await fetch('/api/contradictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topic: newTopic.trim(),
          conflictCategory: newCategory,
          paperAId: newPaperAId,
          claimA: newClaimA.trim(),
          evidenceA: newEvidenceA.trim(),
          pageA: newPageA,
          sectionA: newSectionA.trim() || undefined,
          paperBId: newPaperBId,
          claimB: newClaimB.trim(),
          evidenceB: newEvidenceB.trim(),
          pageB: newPageB,
          sectionB: newSectionB.trim() || undefined,
          potentialReasons: reasonsList,
          notes: newNotes.trim(),
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record disagreement');
      }

      const data = await res.json();
      if (data.contradiction) {
        setContradictions((prev) => [data.contradiction, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setModalError(err.message || 'An error occurred while creating the disagreement record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Overview */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  <span>Cross-Paper Contradiction & Disagreement Workspace</span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Dialectical Analysis
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed max-w-3xl">
                  Systematically inspect and evaluate conflicting findings between literature without prematurely rejecting either study. Analyze divergence drivers across tokenizers, sample datasets, evaluation benchmarks, and methodology.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onNavigateToEvidence && (
              <button
                onClick={onNavigateToEvidence}
                className="px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 transition-colors flex items-center gap-1.5"
                title="Jump to Evidence Engine"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Evidence Engine</span>
              </button>
            )}
            <button
              onClick={openRegisterModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Disagreement</span>
            </button>
          </div>
        </div>

        {/* 2. Executive Metrics Summary Grid (Zero Fabrication) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Total Conflicts</span>
              <GitCompare className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
              {metrics.total}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Empirical disagreements</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Papers Involved</span>
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {metrics.uniquePapers}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Distinct studies</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Awaiting Review</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {metrics.awaitingReviewCount}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Needs researcher triage</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Under Investigation</span>
              <AlertCircle className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
              {metrics.underInvestigationCount}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Active experiments</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Reviewed / Resolved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.reviewedCount}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Synthesis verified</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Multi-Attribute Filter Toolbar */}
      <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, empirical claim, evidence quote, or paper title..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Paper Selector Filter */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedPaperFilter}
              onChange={(e) => setSelectedPaperFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Compared Papers ({metrics.uniquePapers})</option>
              {Array.from(
                new Set(contradictions.flatMap((c) => [c.paperAId, c.paperBId]))
              ).map((paperId) => {
                const paper = papersMap.get(paperId);
                const title = paper ? paper.title : paperId;
                return (
                  <option key={paperId} value={paperId}>
                    {title.length > 40 ? title.substring(0, 40) + '...' : title}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Review Status Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="detected">Awaiting Review ({metrics.awaitingReviewCount})</option>
              <option value="under_review">Under Investigation ({metrics.underInvestigationCount})</option>
              <option value="researcher_reviewed">Researcher Reviewed ({metrics.reviewedCount})</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-52 shrink-0">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Disagreement Types</option>
              <option value="direct_empirical">Direct Empirical Disagreement</option>
              <option value="methodological_divergence">Methodological Divergence</option>
              <option value="dataset_variation">Evaluation Dataset Variation</option>
              <option value="scope_difference">Scope & Setting Divergence</option>
              <option value="theoretical">Theoretical Discrepancy</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Showing {filteredContradictions.length} of {contradictions.length} registered conflicts:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            {selectedStatusFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Status: {STATUS_METADATA[selectedStatusFilter as ReviewStatus]?.label || selectedStatusFilter}
              </span>
            )}
            {selectedCategoryFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Type: {CATEGORY_METADATA[selectedCategoryFilter as ConflictCategory]?.label || selectedCategoryFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Main Contradictions List / Empty State / Loading State */}
      <div className="space-y-5">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={fetchContradictions}
              className="underline hover:no-underline font-medium ml-4 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="h-5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-44 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                  <div className="h-44 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                </div>
                <div className="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State when no records exist */}
        {!loading && contradictions.length === 0 && (
          <div className="text-center py-16 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/60 dark:bg-[#0f1422]/50 text-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <GitCompare className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                No Empirical Contradictions Registered in Current Corpus
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                No conflicting empirical findings have been recorded for this project yet. Absence of registered contradiction records does not imply complete consensus across the entire literature field; untested edge cases or divergent methodology may still exist.
              </p>
            </div>
            <div>
              <button
                onClick={openRegisterModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Disagreement</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State when filtered results are zero */}
        {!loading && contradictions.length > 0 && filteredContradictions.length === 0 && (
          <div className="text-center py-12 px-4 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0f1422] text-xs space-y-3">
            <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              No contradictions match the active search or filters.
            </p>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Try adjusting your search query, or clear the active paper and status filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-3.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Contradiction Cards */}
        {!loading &&
          filteredContradictions.map((contra) => {
            const paperA = papersMap.get(contra.paperAId);
            const paperB = papersMap.get(contra.paperBId);
            const statusKey = (contra.status || 'detected') as ReviewStatus;
            const statusMeta = STATUS_METADATA[statusKey] || STATUS_METADATA.detected;
            const StatusIcon = statusMeta.icon;

            const categoryKey = (contra.conflictCategory || 'methodological_divergence') as ConflictCategory;
            const categoryMeta = CATEGORY_METADATA[categoryKey] || CATEGORY_METADATA.methodological_divergence;

            const isEditingNote = editingNoteId === contra.id;
            const isSavingNote = savingNoteId === contra.id;
            const isSavedSuccess = savedSuccessId === contra.id;
            const isConfirmingDelete = confirmDeleteId === contra.id;

            return (
              <article
                key={contra.id}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700/80"
              >
                {/* Topic Header & Review Status Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/10 shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50">
                        {contra.topic}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Conflict Category Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${categoryMeta.badgeClass}`}
                        title={categoryMeta.desc}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{categoryMeta.label}</span>
                      </span>

                      {/* Review Status Selector / Badge */}
                      <div className="relative inline-flex items-center">
                        <select
                          value={statusKey}
                          onChange={(e) => handleUpdateStatus(contra.id, e.target.value as ReviewStatus)}
                          className={`appearance-none pl-6 pr-6 py-0.5 text-[10px] font-mono font-medium rounded-md border cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${statusMeta.badgeClass}`}
                          title="Change research review status"
                        >
                          <option value="detected">Status: Awaiting Review</option>
                          <option value="under_review">Status: Under Investigation</option>
                          <option value="researcher_reviewed">Status: Researcher Reviewed</option>
                        </select>
                        <StatusIcon className="w-3 h-3 absolute left-2 pointer-events-none" />
                        <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                      </div>

                      {isSavedSuccess && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                          <Check className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Delete Confirmation */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-900/60 animate-fade-in">
                        <span className="text-[11px] text-red-600 dark:text-red-400 px-1 font-medium">
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(contra.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(contra.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Delete this contradiction record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Side-by-Side Symmetrical Comparison (Position A vs Position B) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* POSITION A CARD */}
                  <div className="flex flex-col justify-between p-4 bg-zinc-50/80 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-3 text-xs transition-all hover:border-blue-500/40 dark:hover:border-blue-500/30">
                    <div className="space-y-2.5">
                      {/* Badge & Paper Coordinates Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                          Position A
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#0f1422] px-2 py-0.5 rounded-md border border-zinc-200/70 dark:border-zinc-800/70">
                          Page {contra.pageA}{contra.sectionA ? ` • ${contra.sectionA}` : ''}
                        </span>
                      </div>

                      {/* Paper Title & Authors */}
                      <div className="space-y-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <h3
                            className={`font-semibold text-zinc-900 dark:text-zinc-100 leading-snug text-xs ${
                              onOpenPaper && contra.paperAId ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group flex items-center gap-1' : ''
                            }`}
                            onClick={() => onOpenPaper && contra.paperAId && onOpenPaper(contra.paperAId)}
                            title={contra.paperATitle}
                          >
                            <span>{contra.paperATitle}</span>
                            {onOpenPaper && contra.paperAId && (
                              <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-blue-500 shrink-0 inline ml-0.5" />
                            )}
                          </h3>
                        </div>

                        {paperA && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {paperA.authors && paperA.authors.length > 0 && (
                              <span>{formatAuthors(paperA.authors)}</span>
                            )}
                            {paperA.publicationYear && (
                              <span>&bull; {paperA.publicationYear}</span>
                            )}
                            {paperA.journalOrConference && (
                              <span className="italic truncate max-w-[200px]">
                                &bull; {paperA.journalOrConference}
                              </span>
                            )}
                            {paperA.doi && (
                              <a
                                href={`https://doi.org/${paperA.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-0.5"
                                title="Open DOI resolver"
                              >
                                <span>DOI: {paperA.doi}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Explicit Claim Box */}
                      <div className="p-2.5 bg-white dark:bg-[#0f1422] rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                          Asserted Finding
                        </div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {contra.claimA}
                        </div>
                      </div>

                      {/* Verbatim Supporting Evidence Quote */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Quote className="w-2.5 h-2.5 text-blue-500" />
                          <span>Direct Verbatim Evidence</span>
                        </div>
                        <div className="italic text-zinc-700 dark:text-zinc-300 text-xs bg-white dark:bg-[#0f1422] p-3 rounded-lg border-l-3 border-l-blue-500 border border-zinc-200/70 dark:border-zinc-800/80 leading-relaxed">
                          &ldquo;{contra.evidenceA}&rdquo;
                        </div>
                      </div>
                    </div>

                    {/* Paper Navigation Action */}
                    {onOpenPaper && contra.paperAId && (
                      <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex justify-end">
                        <button
                          onClick={() => onOpenPaper(contra.paperAId)}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>Inspect Study in Library</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* POSITION B CARD */}
                  <div className="flex flex-col justify-between p-4 bg-zinc-50/80 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-3 text-xs transition-all hover:border-purple-500/40 dark:hover:border-purple-500/30">
                    <div className="space-y-2.5">
                      {/* Badge & Paper Coordinates Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                          Position B
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#0f1422] px-2 py-0.5 rounded-md border border-zinc-200/70 dark:border-zinc-800/70">
                          Page {contra.pageB}{contra.sectionB ? ` • ${contra.sectionB}` : ''}
                        </span>
                      </div>

                      {/* Paper Title & Authors */}
                      <div className="space-y-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <h3
                            className={`font-semibold text-zinc-900 dark:text-zinc-100 leading-snug text-xs ${
                              onOpenPaper && contra.paperBId ? 'cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 group flex items-center gap-1' : ''
                            }`}
                            onClick={() => onOpenPaper && contra.paperBId && onOpenPaper(contra.paperBId)}
                            title={contra.paperBTitle}
                          >
                            <span>{contra.paperBTitle}</span>
                            {onOpenPaper && contra.paperBId && (
                              <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-purple-500 shrink-0 inline ml-0.5" />
                            )}
                          </h3>
                        </div>

                        {paperB && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {paperB.authors && paperB.authors.length > 0 && (
                              <span>{formatAuthors(paperB.authors)}</span>
                            )}
                            {paperB.publicationYear && (
                              <span>&bull; {paperB.publicationYear}</span>
                            )}
                            {paperB.journalOrConference && (
                              <span className="italic truncate max-w-[200px]">
                                &bull; {paperB.journalOrConference}
                              </span>
                            )}
                            {paperB.doi && (
                              <a
                                href={`https://doi.org/${paperB.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 ml-0.5"
                                title="Open DOI resolver"
                              >
                                <span>DOI: {paperB.doi}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Explicit Claim Box */}
                      <div className="p-2.5 bg-white dark:bg-[#0f1422] rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                          Asserted Finding
                        </div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                          {contra.claimB}
                        </div>
                      </div>

                      {/* Verbatim Supporting Evidence Quote */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Quote className="w-2.5 h-2.5 text-purple-500" />
                          <span>Direct Verbatim Evidence</span>
                        </div>
                        <div className="italic text-zinc-700 dark:text-zinc-300 text-xs bg-white dark:bg-[#0f1422] p-3 rounded-lg border-l-3 border-l-purple-500 border border-zinc-200/70 dark:border-zinc-800/80 leading-relaxed">
                          &ldquo;{contra.evidenceB}&rdquo;
                        </div>
                      </div>
                    </div>

                    {/* Paper Navigation Action */}
                    {onOpenPaper && contra.paperBId && (
                      <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex justify-end">
                        <button
                          onClick={() => onOpenPaper(contra.paperBId)}
                          className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <span>Inspect Study in Library</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Dialectical Divergence Factors Panel */}
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>Identified Factors for Scientific Disagreement:</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {contra.potentialReasons?.length || 0} Divergence Drivers
                    </span>
                  </div>

                  {contra.potentialReasons && contra.potentialReasons.length > 0 ? (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-800 dark:text-zinc-200 text-xs pt-1">
                      {contra.potentialReasons.map((reason, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 bg-white/70 dark:bg-[#0f1422]/60 p-2.5 rounded-lg border border-amber-200/40 dark:border-amber-900/30"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500 italic text-[11px]">
                      No divergence drivers specified yet.
                    </p>
                  )}
                </div>

                {/* 6. Researcher Synthesis & Lab Note Section (Interactive & Persistent) */}
                <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Lab Synthesis & Resolution Note
                      </span>
                    </div>

                    {!isEditingNote && (
                      <button
                        onClick={() => startEditingNote(contra)}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{contra.notes ? 'Edit Synthesis' : 'Add Synthesis'}</span>
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Document how your team interprets or reconciles this conflict (e.g. which preprocessing method to adopt, benchmark scope)..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelEditingNote}
                          className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveNote(contra.id)}
                          disabled={isSavingNote}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md shadow-xs transition-all flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                        </button>
                      </div>
                    </div>
                  ) : contra.notes ? (
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-[#0f1422] p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 font-mono">
                      {contra.notes}
                    </div>
                  ) : (
                    <div className="text-zinc-400 italic text-[11px]">
                      No lab synthesis note recorded yet. Click &ldquo;Add Synthesis&rdquo; to document resolution.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      {/* 7. Modal Drawer for Registering a New Disagreement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <GitCompare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    Register Empirical Disagreement
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Record opposing claims and identify divergence factors between studies
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Topic & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Disagreement Topic / Hypothesis Target *
                  </label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g., Multilingual vs Monolingual Transformer Superiority on Low-Resource Dialects"
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Conflict Classification
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ConflictCategory)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="methodological_divergence">Methodological Divergence</option>
                    <option value="direct_empirical">Direct Empirical Disagreement</option>
                    <option value="dataset_variation">Evaluation Dataset Variation</option>
                    <option value="scope_difference">Scope & Setting Divergence</option>
                    <option value="theoretical">Theoretical Discrepancy</option>
                  </select>
                </div>
              </div>

              {/* Side-by-Side Paper & Claim Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* POSITION A INPUTS */}
                <div className="p-3 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      Position A Setup
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Select Study A *
                    </label>
                    <select
                      value={newPaperAId}
                      onChange={(e) => setNewPaperAId(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    >
                      <option value="">-- Choose Study A --</option>
                      {papers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Asserted Claim Statement *
                    </label>
                    <input
                      type="text"
                      value={newClaimA}
                      onChange={(e) => setNewClaimA(e.target.value)}
                      placeholder="e.g., Multilingual XLM-R outperforms monolingual baselines (84.1% F1)."
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Verbatim Evidence Snippet *
                    </label>
                    <textarea
                      value={newEvidenceA}
                      onChange={(e) => setNewEvidenceA(e.target.value)}
                      rows={2}
                      placeholder="Paste exact excerpt from paper..."
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Page Coordinate
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newPageA}
                        onChange={(e) => setNewPageA(parseInt(e.target.value, 10) || 1)}
                        className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Section (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Results"
                        value={newSectionA}
                        onChange={(e) => setNewSectionA(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* POSITION B INPUTS */}
                <div className="p-3 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Position B Setup
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Select Study B *
                    </label>
                    <select
                      value={newPaperBId}
                      onChange={(e) => setNewPaperBId(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    >
                      <option value="">-- Choose Study B --</option>
                      {papers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Asserted Claim Statement *
                    </label>
                    <input
                      type="text"
                      value={newClaimB}
                      onChange={(e) => setNewClaimB(e.target.value)}
                      placeholder="e.g., Monolingual BanglaBERT exceeds XLM-R by 2.1% Macro-F1."
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Verbatim Evidence Snippet *
                    </label>
                    <textarea
                      value={newEvidenceB}
                      onChange={(e) => setNewEvidenceB(e.target.value)}
                      rows={2}
                      placeholder="Paste exact excerpt from paper..."
                      className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Page Coordinate
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newPageB}
                        onChange={(e) => setNewPageB(parseInt(e.target.value, 10) || 1)}
                        className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        Section (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Methodology"
                        value={newSectionB}
                        onChange={(e) => setNewSectionB(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Potential Divergence Reasons */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Hypothesized Divergence Factors (One per line)
                </label>
                <textarea
                  value={newPotentialReasons}
                  onChange={(e) => setNewPotentialReasons(e.target.value)}
                  rows={2}
                  placeholder="e.g. Differences in dialect density of dataset&#10;Phonetic subword regularization applied vs omitted"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Lab Note & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Initial Lab Synthesis Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Researcher takeaway or plan to test..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Review Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ReviewStatus)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="detected">Awaiting Review</option>
                    <option value="under_review">Under Investigation</option>
                    <option value="researcher_reviewed">Researcher Reviewed</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Recording Disagreement...' : 'Record Disagreement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
