'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ResearchGap, Paper } from '@/lib/db/types';
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Info,
  Compass,
  Search,
  Filter,
  RotateCcw,
  X,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  Edit3,
  Save,
  AlertTriangle,
  XCircle,
  Database,
  Users,
  Globe,
  Cpu,
  Gauge,
  Layers,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Tag,
} from 'lucide-react';

interface ResearchGapEngineProps {
  projectId: string;
  papers: Paper[];
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: () => void;
}

type GapCategory =
  | 'repeated_limitation'
  | 'missing_dataset'
  | 'underexplored_population'
  | 'language_coverage'
  | 'methodological'
  | 'evaluation';

type VerificationStatus = 'Researcher Verified' | 'Under Investigation' | 'Dismissed';
type ConfidenceLevel = 'high' | 'moderate' | 'exploratory';

const CATEGORY_CONFIG: Record<
  GapCategory,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }>; description: string }
> = {
  repeated_limitation: {
    label: 'Repeated Limitation',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: AlertTriangle,
    description: 'A recurring constraint, computational bottleneck, or failure mode reported across multiple studies.',
  },
  missing_dataset: {
    label: 'Missing Dataset / Vacancy',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: Database,
    description: 'Lack of benchmark corpora, annotated evaluation splits, or testbeds for this specific research setting.',
  },
  underexplored_population: {
    label: 'Underexplored Population',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: Users,
    description: 'Specific vernacular dialects, regional communities, or demographic cohorts unassessed in indexed literature.',
  },
  language_coverage: {
    label: 'Language & Modality Coverage',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    icon: Globe,
    description: 'Representation and tokenization barriers across non-standard orthography or cross-modal speech/text.',
  },
  methodological: {
    label: 'Methodological Disparity',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    icon: Cpu,
    description: 'Untested algorithmic approaches, conflicting hyperparameter regimens, or parameter-efficient fine-tuning gaps.',
  },
  evaluation: {
    label: 'Evaluation & Metric Gap',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: Gauge,
    description: 'Inadequacy of standard metrics to capture pragmatic nuances, annotator disagreements, or cultural sarcasm.',
  },
};

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }>; desc: string }
> = {
  'Under Investigation': {
    label: 'Under Investigation',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    icon: Clock,
    desc: 'Candidate research gap identified from reported limitations; requires human literature validation.',
  },
  'Researcher Verified': {
    label: 'Researcher Verified',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
    desc: 'Explicitly vetted and validated by the researcher as a genuine open scientific opportunity.',
  },
  'Dismissed': {
    label: 'Dismissed',
    badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
    icon: XCircle,
    desc: 'Determined by the researcher to be out of scope, already resolved, or insufficiently supported.',
  },
};

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  { label: string; badgeClass: string; explanation: string }
> = {
  high: {
    label: 'High Evidentiary Grounding',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    explanation: 'Multiple indexed publications independently report this exact limitation or unaddressed setting.',
  },
  moderate: {
    label: 'Moderate Grounding',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    explanation: 'Supported by explicit limitations in a single primary study or indirect experimental observations.',
  },
  exploratory: {
    label: 'Exploratory Hypothesis',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    explanation: 'Algorithmic inference extrapolating future work directions; requires empirical confirmation.',
  },
};

export const ResearchGapEngine: React.FC<ResearchGapEngineProps> = ({
  projectId,
  papers,
  onOpenPaper,
  onNavigateToEvidence,
}) => {
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState<string>('all');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');

  // Expanded cards
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(new Set());

  // Editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const [editingDirectionId, setEditingDirectionId] = useState<string | null>(null);
  const [directionDraft, setDirectionDraft] = useState<string>('');
  const [savingDirectionId, setSavingDirectionId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Paper analyses cache (for displaying real reported paper limitations)
  const [analysesCache, setAnalysesCache] = useState<Record<string, string[]>>({});

  // Modal State for recording a new research gap
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<GapCategory>('methodological');
  const [newDescription, setNewDescription] = useState('');
  const [newWhyItMatters, setNewWhyItMatters] = useState('');
  const [newSelectedPaperIds, setNewSelectedPaperIds] = useState<string[]>([]);
  const [newConfidence, setNewConfidence] = useState<ConfidenceLevel>('moderate');
  const [newVerificationStatus, setNewVerificationStatus] = useState<VerificationStatus>('Under Investigation');
  const [newProposedDirection, setNewProposedDirection] = useState('');
  const [newContraryEvidence, setNewContraryEvidence] = useState('');
  const [newResearcherNotes, setNewResearcherNotes] = useState('');

  const fetchGaps = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/gaps?projectId=${projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to load gaps (${res.status})`);
      }
      const data = await res.json();
      setGaps(data.gaps || []);
    } catch (err: any) {
      console.error('Fetch gaps error:', err);
      setErrorMessage(err.message || 'An error occurred while loading research gaps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchGaps();
    }
  }, [projectId]);

  // Pre-load paper analyses for papers in this project to display real limitations
  useEffect(() => {
    const loadAnalyses = async () => {
      const cache: Record<string, string[]> = {};
      for (const p of papers) {
        try {
          const res = await fetch(`/api/papers/${p.id}/analysis`);
          if (res.ok) {
            const data = await res.json();
            if (data.analysis?.limitations && Array.isArray(data.analysis.limitations)) {
              cache[p.id] = data.analysis.limitations;
            }
          }
        } catch {
          // ignore individual fetch errors
        }
      }
      setAnalysesCache(cache);
    };
    if (papers.length > 0) {
      loadAnalyses();
    }
  }, [papers]);

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

  // Real Metrics Calculations (ZERO FABRICATION)
  const metrics = useMemo(() => {
    const total = gaps.length;
    const underInvestigation = gaps.filter((g) => g.verificationStatus === 'Under Investigation').length;
    const verified = gaps.filter((g) => g.verificationStatus === 'Researcher Verified').length;
    const dismissed = gaps.filter((g) => g.verificationStatus === 'Dismissed').length;
    const connectedPapers = new Set(gaps.flatMap((g) => g.supportingPaperIds || [])).size;
    const highConfidence = gaps.filter((g) => g.confidence === 'high').length;

    return {
      total,
      underInvestigation,
      verified,
      dismissed,
      connectedPapers,
      highConfidence,
    };
  }, [gaps]);

  // Filtered List
  const filteredGaps = useMemo(() => {
    return gaps.filter((gap) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = gap.title?.toLowerCase().includes(q);
        const matchesDesc = gap.description?.toLowerCase().includes(q);
        const matchesDirection = gap.proposedDirection?.toLowerCase().includes(q);
        const matchesNotes = gap.researcherNotes?.toLowerCase().includes(q);
        const matchesWhy = gap.whyItMatters?.toLowerCase().includes(q);
        const matchesPapers = gap.supportingPaperTitles?.some((t) => t.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesDirection && !matchesNotes && !matchesWhy && !matchesPapers) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        if (gap.category !== selectedCategoryFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (gap.verificationStatus !== selectedStatusFilter) return false;
      }

      // Confidence filter
      if (selectedConfidenceFilter !== 'all') {
        if (gap.confidence !== selectedConfidenceFilter) return false;
      }

      // Paper filter
      if (selectedPaperFilter !== 'all') {
        if (!gap.supportingPaperIds?.includes(selectedPaperFilter)) return false;
      }

      return true;
    });
  }, [gaps, searchQuery, selectedCategoryFilter, selectedStatusFilter, selectedConfidenceFilter, selectedPaperFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategoryFilter !== 'all' ||
    selectedStatusFilter !== 'all' ||
    selectedConfidenceFilter !== 'all' ||
    selectedPaperFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setSelectedStatusFilter('all');
    setSelectedConfidenceFilter('all');
    setSelectedPaperFilter('all');
  };

  const showSavedConfirmation = (id: string) => {
    setSavedSuccessId(id);
    setTimeout(() => {
      setSavedSuccessId((curr) => (curr === id ? null : curr));
    }, 2500);
  };

  // Toggle card expansion
  const toggleExpandCard = (id: string) => {
    setExpandedGapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Status Update Handler
  const handleUpdateStatus = async (id: string, newStatus: VerificationStatus) => {
    try {
      const res = await fetch('/api/gaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verificationStatus: newStatus }),
      });
      if (res.ok) {
        setGaps((prev) =>
          prev.map((g) => (g.id === id ? { ...g, verificationStatus: newStatus } : g))
        );
        showSavedConfirmation(id);
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Endorse Direction Handler
  const handleToggleEndorseDirection = async (gap: ResearchGap) => {
    const nextStatus = gap.directionStatus === 'researcher_approved' ? 'ai_suggested' : 'researcher_approved';
    try {
      const res = await fetch('/api/gaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gap.id, directionStatus: nextStatus }),
      });
      if (res.ok) {
        setGaps((prev) =>
          prev.map((g) => (g.id === gap.id ? { ...g, directionStatus: nextStatus } : g))
        );
        showSavedConfirmation(gap.id);
      }
    } catch (err) {
      console.error('Direction status toggle error:', err);
    }
  };

  // Save Direction Edit
  const startEditingDirection = (gap: ResearchGap) => {
    setEditingDirectionId(gap.id);
    setDirectionDraft(gap.proposedDirection || '');
  };

  const cancelEditingDirection = () => {
    setEditingDirectionId(null);
    setDirectionDraft('');
  };

  const saveDirection = async (id: string) => {
    setSavingDirectionId(id);
    try {
      const res = await fetch('/api/gaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          proposedDirection: directionDraft.trim(),
          directionStatus: 'researcher_approved', // editing implies researcher endorsement
        }),
      });
      if (res.ok) {
        setGaps((prev) =>
          prev.map((g) =>
            g.id === id
              ? { ...g, proposedDirection: directionDraft.trim(), directionStatus: 'researcher_approved' }
              : g
          )
        );
        setEditingDirectionId(null);
        showSavedConfirmation(id);
      }
    } catch (err) {
      console.error('Save direction error:', err);
    } finally {
      setSavingDirectionId(null);
    }
  };

  // Save Researcher Notes
  const startEditingNote = (gap: ResearchGap) => {
    setEditingNoteId(gap.id);
    setNoteDraft(gap.researcherNotes || '');
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const saveNote = async (id: string) => {
    setSavingNoteId(id);
    try {
      const res = await fetch('/api/gaps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, researcherNotes: noteDraft.trim() }),
      });
      if (res.ok) {
        setGaps((prev) =>
          prev.map((g) => (g.id === id ? { ...g, researcherNotes: noteDraft.trim() } : g))
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

  // Delete Handler
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/gaps?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGaps((prev) => prev.filter((g) => g.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // AI Gap Synthesis Trigger
  const handleSynthesizeGaps = async () => {
    setSynthesizing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/gaps/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Synthesis failed');
      }
      setGaps(data.gaps || []);
      setSuccessToast(`Synthesized ${data.synthesizedCount || 0} candidate research gaps from literature.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setErrorMessage(err.message || 'An error occurred during gap synthesis.');
    } finally {
      setSynthesizing(false);
    }
  };

  // Modal Handlers
  const openRegisterModal = () => {
    setNewTitle('');
    setNewCategory('methodological');
    setNewDescription('');
    setNewWhyItMatters('');
    setNewSelectedPaperIds(papers.length > 0 ? [papers[0].id] : []);
    setNewConfidence('moderate');
    setNewVerificationStatus('Under Investigation');
    setNewProposedDirection('');
    setNewContraryEvidence('');
    setNewResearcherNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setModalError('Gap Title is required.');
      return;
    }
    if (!newDescription.trim()) {
      setModalError('Problem Description is required.');
      return;
    }

    setSubmittingModal(true);
    setModalError(null);

    try {
      const res = await fetch('/api/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newTitle.trim(),
          category: newCategory,
          description: newDescription.trim(),
          whyItMatters: newWhyItMatters.trim() || undefined,
          supportingPaperIds: newSelectedPaperIds,
          confidence: newConfidence,
          verificationStatus: newVerificationStatus,
          proposedDirection: newProposedDirection.trim() || 'Further experimental exploration recommended.',
          contraryEvidence: newContraryEvidence.trim() || undefined,
          researcherNotes: newResearcherNotes.trim(),
          directionStatus: 'researcher_approved', // researcher-submitted gaps start as approved
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record gap');
      }

      const data = await res.json();
      if (data.gap) {
        setGaps((prev) => [data.gap, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setModalError(err.message || 'Failed to record research gap.');
    } finally {
      setSubmittingModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Executive Header & Epistemic Guidance */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Lightbulb className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  <span>Cross-Paper Research Gap & Vacancy Engine</span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Epistemic Discovery
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed max-w-3xl">
                  Discovers unaddressed literature vacancies by synthesizing repeated limitations, evaluation voids, and missing datasets across published manuscripts. Candidate gaps represent exploratory hypotheses and require explicit researcher verification.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onNavigateToEvidence && (
              <button
                onClick={onNavigateToEvidence}
                className="px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-50 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 transition-colors flex items-center gap-1.5"
                title="Open Evidence Engine"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Evidence Engine</span>
              </button>
            )}

            <button
              onClick={openRegisterModal}
              className="px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-zinc-50 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Gap</span>
            </button>

            <button
              onClick={handleSynthesizeGaps}
              disabled={synthesizing}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${synthesizing ? 'animate-spin' : ''}`} />
              <span>{synthesizing ? 'Analyzing Literature...' : 'Synthesize Potential Gaps'}</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 2. Executive Metrics Summary Grid (Zero Fabrication) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Total Gaps</span>
              <Lightbulb className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
              {metrics.total}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Identified vacancies</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Under Investigation</span>
              <Clock className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
              {metrics.underInvestigation}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Awaiting evaluation</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Researcher Verified</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.verified}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Lab validated</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Dismissed</span>
              <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-600 dark:text-zinc-400 mt-1">
              {metrics.dismissed}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Ruled out</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">Evidence Papers</span>
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {metrics.connectedPapers}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Manuscripts linked</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-[#131929] p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
              <span className="font-medium">High Grounding</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.highConfidence}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Multi-paper consensus</div>
          </div>
        </div>
      </div>

      {/* Epistemological Standard Callout */}
      <div className="p-4 bg-zinc-50/80 dark:bg-[#131929] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/70 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Epistemic Standard:</strong> Algorithmic extraction itemizes reported paper limitations as <em className="text-zinc-900 dark:text-zinc-100 font-medium not-italic underline decoration-blue-500/40">candidate hypotheses</em>. They do not constitute established scientific facts until a researcher inspects the underlying manuscripts and manually marks the gap as <span className="text-emerald-600 dark:text-emerald-400 font-medium">Researcher Verified</span>.
        </p>
      </div>

      {/* 3. Search and Multi-Dimensional Filter Toolbar */}
      <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gaps by title, description, supporting paper, or proposed direction..."
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

          {/* Category Filter */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Gap Categories</option>
              <option value="repeated_limitation">Repeated Limitations</option>
              <option value="missing_dataset">Missing Dataset / Vacancy</option>
              <option value="underexplored_population">Underexplored Population</option>
              <option value="language_coverage">Language & Modality Coverage</option>
              <option value="methodological">Methodological Disparity</option>
              <option value="evaluation">Evaluation & Metric Gap</option>
            </select>
          </div>

          {/* Verification Status Filter */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Review Statuses</option>
              <option value="Under Investigation">Under Investigation ({metrics.underInvestigation})</option>
              <option value="Researcher Verified">Researcher Verified ({metrics.verified})</option>
              <option value="Dismissed">Dismissed ({metrics.dismissed})</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedConfidenceFilter}
              onChange={(e) => setSelectedConfidenceFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Confidence Levels</option>
              <option value="high">High Grounding</option>
              <option value="moderate">Moderate Grounding</option>
              <option value="exploratory">Exploratory Hypothesis</option>
            </select>
          </div>

          {/* Associated Paper Filter */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={selectedPaperFilter}
              onChange={(e) => setSelectedPaperFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-zinc-50 dark:bg-[#131929] border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Linked Papers ({metrics.connectedPapers})</option>
              {Array.from(new Set(gaps.flatMap((g) => g.supportingPaperIds || []))).map((pId) => {
                const paper = papersMap.get(pId);
                const title = paper ? paper.title : pId;
                return (
                  <option key={pId} value={pId}>
                    {title.length > 35 ? title.substring(0, 35) + '...' : title}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filters */}
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
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
            <span>Showing {filteredGaps.length} of {gaps.length} potential gaps:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            {selectedCategoryFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Category: {CATEGORY_CONFIG[selectedCategoryFilter as GapCategory]?.label || selectedCategoryFilter}
              </span>
            )}
            {selectedStatusFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Status: {selectedStatusFilter}
              </span>
            )}
            {selectedConfidenceFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                Confidence: {selectedConfidenceFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Main Research Gaps List / Skeletons / Empty States */}
      <div className="space-y-4">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={fetchGaps} className="underline hover:no-underline font-medium ml-4 shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
                <div className="h-12 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State when no gaps are registered */}
        {!loading && gaps.length === 0 && (
          <div className="text-center py-16 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/60 dark:bg-[#0f1422]/50 text-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                No Synthesized Research Gaps in Current Project Corpus
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Absence of registered research gaps does not imply literature has no unsolved problems; click &ldquo;Synthesize Potential Gaps&rdquo; to analyze indexed papers, or manually record an empirical gap.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={handleSynthesizeGaps}
                disabled={synthesizing}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Synthesize Potential Gaps</span>
              </button>
              <button
                onClick={openRegisterModal}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Record Research Gap</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State when search/filters return 0 */}
        {!loading && gaps.length > 0 && filteredGaps.length === 0 && (
          <div className="text-center py-12 px-4 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0f1422] text-xs space-y-3">
            <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              No research gaps match the active search or filters.
            </p>
            <p className="text-zinc-400 max-w-sm mx-auto">
              Try adjusting your search terms or clearing category and status filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-3.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Gap Cards */}
        {!loading &&
          filteredGaps.map((gap) => {
            const catConfig = CATEGORY_CONFIG[gap.category as GapCategory] || CATEGORY_CONFIG.methodological;
            const CategoryIcon = catConfig.icon;

            const statusConfig = STATUS_CONFIG[gap.verificationStatus as VerificationStatus] || STATUS_CONFIG['Under Investigation'];
            const StatusIcon = statusConfig.icon;

            const confConfig = CONFIDENCE_CONFIG[gap.confidence as ConfidenceLevel] || CONFIDENCE_CONFIG.moderate;

            const isExpanded = expandedGapIds.has(gap.id);
            const isEditingNote = editingNoteId === gap.id;
            const isSavingNote = savingNoteId === gap.id;
            const isEditingDirection = editingDirectionId === gap.id;
            const isSavingDirection = savingDirectionId === gap.id;
            const isConfirmingDelete = confirmDeleteId === gap.id;
            const isSavedSuccess = savedSuccessId === gap.id;

            const isDirectionApproved = gap.directionStatus === 'researcher_approved';

            return (
              <article
                key={gap.id}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700/80"
              >
                {/* Header: Category Badge + Status Selector + Confidence + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${catConfig.badgeClass}`}
                      title={catConfig.description}
                    >
                      <CategoryIcon className="w-3 h-3" />
                      <span>{catConfig.label}</span>
                    </span>

                    {/* Review Status Selector (Interactive & Persistent) */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={gap.verificationStatus}
                        onChange={(e) => handleUpdateStatus(gap.id, e.target.value as VerificationStatus)}
                        className={`appearance-none pl-6 pr-6 py-0.5 text-[10px] font-mono font-medium rounded-md border cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${statusConfig.badgeClass}`}
                        title="Change researcher review status"
                      >
                        <option value="Under Investigation">Status: Under Investigation</option>
                        <option value="Researcher Verified">Status: Researcher Verified</option>
                        <option value="Dismissed">Status: Dismissed</option>
                      </select>
                      <StatusIcon className="w-3 h-3 absolute left-2 pointer-events-none" />
                      <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                    </div>

                    {/* Confidence Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${confConfig.badgeClass}`}
                      title={confConfig.explanation}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span className="capitalize">{gap.confidence} Grounding</span>
                    </span>

                    {isSavedSuccess && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    )}
                  </div>

                  {/* Actions & Delete Confirmation */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => toggleExpandCard(gap.id)}
                      className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/70 rounded-lg border border-zinc-200/70 dark:border-zinc-700/70 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-900/60 animate-fade-in">
                        <span className="text-[11px] text-red-600 dark:text-red-400 px-1 font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(gap.id)}
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
                        onClick={() => setConfirmDeleteId(gap.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Remove gap record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Gap Title & Synthesized Problem Statement */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/10 mt-1.5 shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
                        {gap.title}
                      </h2>
                    </div>
                  </div>

                  <div className="pl-4.5 space-y-2 text-xs">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {gap.description}
                    </p>

                    {/* Why It Matters / Scholarly Significance */}
                    {gap.whyItMatters && (
                      <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-900/40 text-blue-950 dark:text-blue-200 text-xs">
                        <strong className="font-semibold text-blue-900 dark:text-blue-300">Scholarly Significance: </strong>
                        {gap.whyItMatters}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. EVIDENTIARY GROUNDING (Observed Literature Evidence) */}
                <div className="p-4 bg-zinc-50/80 dark:bg-[#131929] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Evidentiary Grounding ({gap.supportingPaperIds?.length || 0} Supporting Studies)</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Grounded in Peer-Reviewed Corpus
                    </span>
                  </div>

                  {/* Supporting Papers List */}
                  <div className="space-y-2.5">
                    {gap.supportingPaperIds && gap.supportingPaperIds.length > 0 ? (
                      gap.supportingPaperIds.map((paperId, idx) => {
                        const paper = papersMap.get(paperId);
                        const paperTitle = paper ? paper.title : gap.supportingPaperTitles?.[idx] || paperId;
                        const limitations = analysesCache[paperId] || [];

                        return (
                          <div
                            key={paperId + idx}
                            className="p-3 bg-white dark:bg-[#0f1422] rounded-lg border border-zinc-200/70 dark:border-zinc-800/80 space-y-1.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <h3
                                  className={`font-semibold text-zinc-900 dark:text-zinc-100 text-xs ${
                                    onOpenPaper ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group inline-flex items-center gap-1' : ''
                                  }`}
                                  onClick={() => onOpenPaper && onOpenPaper(paperId)}
                                  title={paperTitle}
                                >
                                  <span>{paperTitle}</span>
                                  {onOpenPaper && (
                                    <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-blue-500 shrink-0 inline ml-0.5" />
                                  )}
                                </h3>

                                {paper && (
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    {paper.authors && paper.authors.length > 0 && (
                                      <span>{formatAuthors(paper.authors)}</span>
                                    )}
                                    {paper.publicationYear && <span>&bull; {paper.publicationYear}</span>}
                                    {paper.journalOrConference && (
                                      <span className="italic truncate max-w-[200px]">
                                        &bull; {paper.journalOrConference}
                                      </span>
                                    )}
                                    {paper.doi && (
                                      <a
                                        href={`https://doi.org/${paper.doi}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-0.5"
                                        title="Open DOI resolver"
                                      >
                                        <span>DOI: {paper.doi}</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {onOpenPaper && (
                                <button
                                  onClick={() => onOpenPaper(paperId)}
                                  className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 inline-flex items-center gap-0.5"
                                >
                                  <span>Inspect</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>

                            {/* Real Reported Limitations from Document Analysis (if present) */}
                            {limitations.length > 0 && (
                              <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-600 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  Manuscript Reported Limitations:
                                </span>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5 pl-1">
                                  {limitations.slice(0, 2).map((lim, lIdx) => (
                                    <li key={lIdx} className="italic text-zinc-600 dark:text-zinc-400">
                                      &ldquo;{lim}&rdquo;
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-400 italic text-[11px]">
                        No specific supporting papers linked yet. Requires further empirical literature grounding.
                      </p>
                    )}
                  </div>

                  {/* Contrary Evidence / Literature Caveats */}
                  {gap.contraryEvidence && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Identified Contrary Evidence / Literature Caveats:</span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-xs">
                        {gap.contraryEvidence}
                      </p>
                    </div>
                  )}
                </div>

                {/* 6. PROPOSED SCIENTIFIC RESEARCH DIRECTION */}
                <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Proposed Scientific Investigation Direction
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direction Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          isDirectionApproved
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {isDirectionApproved ? (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            <span>Researcher-Approved Direction</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                            <span>AI-Suggested Direction</span>
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => handleToggleEndorseDirection(gap)}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        title="Toggle researcher endorsement of this direction"
                      >
                        {isDirectionApproved ? 'Revert to Suggested' : 'Endorse Direction'}
                      </button>

                      {!isEditingDirection && (
                        <button
                          onClick={() => startEditingDirection(gap)}
                          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-0.5 ml-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingDirection ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={directionDraft}
                        onChange={(e) => setDirectionDraft(e.target.value)}
                        placeholder="Define the precise experimental protocol or architecture to pursue..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={cancelEditingDirection}
                          className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveDirection(gap.id)}
                          disabled={isSavingDirection}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md shadow-xs transition-all flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>{isSavingDirection ? 'Saving...' : 'Save Direction'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-[#0f1422] p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 font-mono text-xs">
                      {gap.proposedDirection}
                    </p>
                  )}
                </div>

                {/* 7. EXPANDED VIEW: LAB ASSESSMENT & RESEARCHER NOTES */}
                {isExpanded && (
                  <div className="p-4 bg-zinc-50/70 dark:bg-[#131929] rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 space-y-2.5 text-xs animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          Researcher Assessment & Lab Notes
                        </span>
                      </div>

                      {!isEditingNote && (
                        <button
                          onClick={() => startEditingNote(gap)}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{gap.researcherNotes ? 'Edit Notes' : 'Add Notes'}</span>
                        </button>
                      )}
                    </div>

                    {isEditingNote ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Document hypothesis validity, planned dataset collection, or grant milestones..."
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
                            onClick={() => saveNote(gap.id)}
                            disabled={isSavingNote}
                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md shadow-xs transition-all flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>{isSavingNote ? 'Saving...' : 'Save Notes'}</span>
                          </button>
                        </div>
                      </div>
                    ) : gap.researcherNotes ? (
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-[#0f1422] p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 font-mono text-xs">
                        {gap.researcherNotes}
                      </p>
                    ) : (
                      <p className="text-zinc-400 italic text-[11px]">
                        No lab assessment notes recorded yet. Click &ldquo;Add Notes&rdquo; to document team takeaways.
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
      </div>

      {/* 8. Modal Drawer for Recording a New Research Gap */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8 bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    Record Academic Research Gap
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Manually document an unaddressed literature space with empirical paper links
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
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              {/* Title & Category */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Research Gap Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Parameter-Efficient LoRA Adaptation for Dialectal Syntactic Variations"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Gap Classification
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as GapCategory)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="repeated_limitation">Repeated Limitation</option>
                    <option value="missing_dataset">Missing Dataset / Benchmark Vacancy</option>
                    <option value="underexplored_population">Underexplored Population / Dialect</option>
                    <option value="language_coverage">Language & Modality Coverage</option>
                    <option value="methodological">Methodological Disparity</option>
                    <option value="evaluation">Evaluation & Metric Gap</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Evidentiary Grounding (Confidence)
                  </label>
                  <select
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(e.target.value as ConfidenceLevel)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="high">High Grounding (Multiple Studies)</option>
                    <option value="moderate">Moderate Grounding (Single Study)</option>
                    <option value="exploratory">Exploratory Hypothesis</option>
                  </select>
                </div>
              </div>

              {/* Description & Scholarly Significance */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Observed Limitation / Problem Statement *
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Detail the exact vacuum in literature or common constraint observed..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Scholarly Significance / Why It Matters (Optional)
                </label>
                <input
                  type="text"
                  value={newWhyItMatters}
                  onChange={(e) => setNewWhyItMatters(e.target.value)}
                  placeholder="Why solving this gap enables breakthrough capabilities..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Supporting Papers Multi-Select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Linked Supporting Papers in Project
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-1.5">
                  {papers.map((p) => {
                    const isChecked = newSelectedPaperIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedPaperIds((prev) => [...prev, p.id]);
                            } else {
                              setNewSelectedPaperIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-zinc-800 dark:text-zinc-200 truncate flex-1">{p.title}</span>
                      </label>
                    );
                  })}
                  {papers.length === 0 && (
                    <span className="text-zinc-400 italic text-[11px]">No papers available in current project.</span>
                  )}
                </div>
              </div>

              {/* Proposed Direction & Contrary Evidence */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Proposed Investigation Direction
                </label>
                <textarea
                  value={newProposedDirection}
                  onChange={(e) => setNewProposedDirection(e.target.value)}
                  rows={2}
                  placeholder="Recommended methodology or experiment to address this gap..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Known Contrary Evidence or Caveats (Optional)
                  </label>
                  <input
                    type="text"
                    value={newContraryEvidence}
                    onChange={(e) => setNewContraryEvidence(e.target.value)}
                    placeholder="Existing counter-arguments or edge cases..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Initial Review Status
                  </label>
                  <select
                    value={newVerificationStatus}
                    onChange={(e) => setNewVerificationStatus(e.target.value as VerificationStatus)}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-[#131929] border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="Under Investigation">Under Investigation</option>
                    <option value="Researcher Verified">Researcher Verified</option>
                    <option value="Dismissed">Dismissed</option>
                  </select>
                </div>
              </div>

              {/* Modal Submit */}
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
                  disabled={submittingModal}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingModal ? 'Recording Gap...' : 'Record Gap'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
