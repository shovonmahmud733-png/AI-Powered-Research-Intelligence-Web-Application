'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Evidence, Paper } from '@/lib/db/types';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
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
  Edit3,
  UserCheck,
  Bot,
  Eye,
  Tag,
  SplitSquareVertical,
  Sliders,
  AlignLeft,
  FileSearch,
} from 'lucide-react';

interface EvidenceEngineProps {
  projectId: string;
  projectTitle?: string;
  papers: Paper[];
  selectedPaperId?: string;
  onOpenPaper?: (paperId: string) => void;
  onNavigateToContradictions?: () => void;
  onNavigateToClaimVerifier?: () => void;
}

type GroupByMode = 'feed' | 'claim' | 'paper';
type ScopeMode = 'single_paper' | 'project' | 'library';

export const EvidenceEngine: React.FC<EvidenceEngineProps> = ({
  projectId,
  projectTitle,
  papers,
  selectedPaperId: initialSelectedPaperId,
  onOpenPaper,
  onNavigateToContradictions,
  onNavigateToClaimVerifier,
}) => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Scope & Mode Controls
  const [scope, setScope] = useState<ScopeMode>(initialSelectedPaperId ? 'single_paper' : 'project');
  const [activePaperId, setActivePaperId] = useState<string>(
    initialSelectedPaperId || papers[0]?.id || ''
  );
  const [isAiMode, setIsAiMode] = useState<boolean>(true); // AI ON vs AI OFF (Manual Research Mode)
  const [groupBy, setGroupBy] = useState<GroupByMode>('claim');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaperId, setFilterPaperId] = useState<string>('all');
  const [filterRelationship, setFilterRelationship] = useState<string>('all');
  const [filterVerificationLevel, setFilterVerificationLevel] = useState<string>('all'); // all | researcher_verified | ai_suggested
  const [filterEvidenceType, setFilterEvidenceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'confidence_desc' | 'paper_title' | 'claim'>('date_desc');

  // Interactive UI States
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal / Drawer Form State (for both Add and Edit)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [claim, setClaim] = useState('');
  const [researchQuestion, setResearchQuestion] = useState('');
  const [topic, setTopic] = useState('');
  const [formPaperId, setFormPaperId] = useState(papers[0]?.id || '');
  const [page, setPage] = useState<number | string>(1);
  const [pageUncertain, setPageUncertain] = useState(false);
  const [section, setSection] = useState('Results & Evaluation');
  const [snippet, setSnippet] = useState('');
  const [location, setLocation] = useState('Results → Page 1');
  const [status, setStatus] = useState<Evidence['verificationStatus']>('supported');
  const [relationship, setRelationship] = useState<'supports' | 'opposes' | 'contextual' | 'methodological'>('supports');
  const [evidenceType, setEvidenceType] = useState<Evidence['evidenceType']>('empirical');
  const [confidence, setConfidence] = useState<number>(0.95);
  const [researcherNotes, setResearcherNotes] = useState('');
  const [isResearcherVerified, setIsResearcherVerified] = useState(false);

  // Suggested Sections
  const suggestedSections = [
    'Results & Evaluation',
    'Methodology & Architecture',
    'Ablation Studies',
    'Discussion & Limitations',
    'Introduction & Problem Formulation',
  ];

  // Fetch Evidence from API
  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let queryUrl = `/api/evidence?projectId=${encodeURIComponent(projectId)}`;
      if (scope === 'single_paper' && activePaperId) {
        queryUrl += `&paperId=${encodeURIComponent(activePaperId)}&scope=single_paper`;
      } else if (scope === 'library') {
        queryUrl += `&scope=library`;
      }

      const res = await fetch(queryUrl);
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
  }, [projectId, scope, activePaperId]);

  useEffect(() => {
    if (projectId) {
      fetchEvidence();
    }
  }, [projectId, scope, activePaperId, fetchEvidence]);

  // Sync initialSelectedPaperId if passed
  useEffect(() => {
    if (initialSelectedPaperId && initialSelectedPaperId !== activePaperId) {
      setActivePaperId(initialSelectedPaperId);
      setFormPaperId(initialSelectedPaperId);
    }
  }, [initialSelectedPaperId]);

  // Sync default form paper
  useEffect(() => {
    if (papers.length > 0 && (!formPaperId || !papers.some((p) => p.id === formPaperId))) {
      setFormPaperId(activePaperId || papers[0].id);
    }
  }, [papers, formPaperId, activePaperId]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = evidenceList.length;
    const supported = evidenceList.filter((e) => e.verificationStatus === 'supported').length;
    const partially = evidenceList.filter((e) => e.verificationStatus === 'partially_supported').length;
    const contradicted = evidenceList.filter((e) => e.verificationStatus === 'contradicted').length;
    const insufficient = evidenceList.filter((e) => e.verificationStatus === 'insufficient_evidence').length;
    const requiresVerification = evidenceList.filter((e) => e.verificationStatus === 'requires_verification').length;
    const researcherVerified = evidenceList.filter((e) => Boolean(e.isResearcherVerified)).length;
    const opposingCount = evidenceList.filter((e) => e.relationship === 'opposes').length;
    const supportedRate = total > 0 ? Math.round((supported / total) * 100) : 0;

    return {
      total,
      supported,
      partially,
      contradicted,
      insufficient,
      requiresVerification,
      researcherVerified,
      opposingCount,
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
        // Paper filter (when in project or library scope)
        if (scope !== 'single_paper' && filterPaperId !== 'all' && item.paperId !== filterPaperId) {
          return false;
        }
        // Relationship filter
        if (filterRelationship !== 'all') {
          if (filterRelationship === 'supports' && item.relationship !== 'supports' && item.verificationStatus === 'contradicted') {
            return false;
          }
          if (filterRelationship === 'opposes' && item.relationship !== 'opposes' && item.verificationStatus !== 'contradicted') {
            return false;
          }
          if (filterRelationship === 'contextual' && item.relationship !== 'contextual') {
            return false;
          }
        }
        // Verification level filter
        if (filterVerificationLevel === 'researcher_verified' && !item.isResearcherVerified) {
          return false;
        }
        if (filterVerificationLevel === 'ai_suggested' && item.isResearcherVerified) {
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
          const matchNotes = item.researcherNotes?.toLowerCase().includes(q);
          const matchTopic = item.topic?.toLowerCase().includes(q);
          const matchRQ = item.researchQuestion?.toLowerCase().includes(q);
          return (
            matchClaim ||
            matchSnippet ||
            matchSection ||
            matchPaper ||
            matchLocation ||
            matchNotes ||
            matchTopic ||
            matchRQ
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'confidence_desc') {
          return (b.confidence ?? 0) - (a.confidence ?? 0);
        }
        if (sortBy === 'paper_title') {
          return (a.paperTitle || '').localeCompare(b.paperTitle || '');
        }
        if (sortBy === 'claim') {
          return (a.claim || '').localeCompare(b.claim || '');
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        // date_desc (default)
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [
    evidenceList,
    filterStatus,
    filterPaperId,
    filterRelationship,
    filterVerificationLevel,
    filterEvidenceType,
    searchQuery,
    sortBy,
    scope,
  ]);

  // Grouped Evidence by Claim or by Paper
  const groupedByClaim = useMemo(() => {
    const map = new Map<string, { claim: string; items: Evidence[]; researchQuestion?: string }>();
    filteredEvidence.forEach((item) => {
      const key = item.claim.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          claim: item.claim,
          items: [],
          researchQuestion: item.researchQuestion,
        });
      }
      map.get(key)!.items.push(item);
    });
    return Array.from(map.values());
  }, [filteredEvidence]);

  const groupedByPaper = useMemo(() => {
    const map = new Map<string, { paperId: string; paperTitle: string; items: Evidence[] }>();
    filteredEvidence.forEach((item) => {
      const key = item.paperId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          paperId: item.paperId,
          paperTitle: item.paperTitle || 'External Scholarly Source',
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    });
    return Array.from(map.values());
  }, [filteredEvidence]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    const locText = item.page ? `Page ${item.page}, Section: ${item.section || 'General'}` : 'Location Unspecified';
    const textToCopy = `[Claim]: "${item.claim}"\n[Verbatim Extract]: "${item.snippet}"\n[Source]: ${item.paperTitle} - ${authors}${year}\n[Location]: ${locText}${doi}\n[Verification Status]: ${item.verificationStatus.toUpperCase()}${item.isResearcherVerified ? ' [Researcher Confirmed]' : ''}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast('Copied grounded academic citation to clipboard');
    } catch (e) {
      console.warn('Failed to copy text', e);
    }
  };

  // Toggle Researcher Verification inline on card
  const handleToggleResearcherVerified = async (item: Evidence) => {
    const newVerifiedState = !item.isResearcherVerified;
    try {
      const res = await fetch('/api/evidence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isResearcherVerified: newVerifiedState,
          verificationStatus: newVerifiedState && item.verificationStatus === 'requires_verification' ? 'supported' : item.verificationStatus,
        }),
      });

      if (res.ok) {
        setEvidenceList((prev) =>
          prev.map((e) => (e.id === item.id ? { ...e, isResearcherVerified: newVerifiedState } : e))
        );
        showToast(newVerifiedState ? 'Verified by Researcher' : 'Marked as unverified machine suggestion');
      }
    } catch (err) {
      console.error('Error toggling researcher verification:', err);
    }
  };

  // Open Edit Modal with evidence values
  const handleOpenEdit = (item: Evidence) => {
    setEditingEvidenceId(item.id);
    setClaim(item.claim);
    setResearchQuestion(item.researchQuestion || '');
    setTopic(item.topic || '');
    setFormPaperId(item.paperId);
    setPage(item.page ?? 1);
    setPageUncertain(!item.page);
    setSection(item.section || 'Results & Evaluation');
    setSnippet(item.snippet);
    setLocation(item.location || `${item.section || 'Section'} → Page ${item.page || 1}`);
    setStatus(item.verificationStatus);
    setRelationship(item.relationship || (item.verificationStatus === 'contradicted' ? 'opposes' : 'supports'));
    setEvidenceType(item.evidenceType || 'empirical');
    setConfidence(item.confidence ?? 0.95);
    setResearcherNotes(item.researcherNotes || '');
    setIsResearcherVerified(Boolean(item.isResearcherVerified));
    setFormError(null);
    setModalMode('edit');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEvidenceId(null);
    setClaim('');
    setResearchQuestion('');
    setTopic('');
    setFormPaperId(scope === 'single_paper' && activePaperId ? activePaperId : papers[0]?.id || '');
    setPage(1);
    setPageUncertain(false);
    setSection('Results & Evaluation');
    setSnippet('');
    setLocation('Results → Page 1');
    setStatus('supported');
    setRelationship('supports');
    setEvidenceType('empirical');
    setConfidence(0.95);
    setResearcherNotes('');
    setIsResearcherVerified(false);
    setFormError(null);
    setModalMode('create');
  };

  // Save (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim()) {
      setFormError('Please provide a specific research claim or hypothesis.');
      return;
    }
    if (!snippet.trim()) {
      setFormError('Please include the verbatim supporting or contradicting passage from the paper.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const selectedPaper = papers.find((p) => p.id === formPaperId);
    const finalPage = pageUncertain ? undefined : Number(page) || 1;
    const finalLocation = pageUncertain
      ? `${section} (Page uncertain in extraction)`
      : location.trim() || `${section} → Page ${finalPage}`;

    try {
      if (modalMode === 'edit' && editingEvidenceId) {
        // PUT update
        const res = await fetch('/api/evidence', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEvidenceId,
            claim: claim.trim(),
            researchQuestion: researchQuestion.trim() || undefined,
            topic: topic.trim() || undefined,
            page: finalPage,
            section: section.trim(),
            snippet: snippet.trim(),
            location: finalLocation,
            verificationStatus: status,
            relationship,
            evidenceType,
            confidence: Number(confidence) || 0.95,
            researcherNotes: researcherNotes.trim() || undefined,
            isResearcherVerified,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update evidence');
        }

        showToast('Evidence record updated successfully');
      } else {
        // POST create
        const res = await fetch('/api/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            paperId: formPaperId,
            paperTitle: selectedPaper?.title,
            claim: claim.trim(),
            researchQuestion: researchQuestion.trim() || undefined,
            topic: topic.trim() || undefined,
            page: finalPage,
            section: section.trim(),
            snippet: snippet.trim(),
            location: finalLocation,
            verificationStatus: status,
            relationship,
            evidenceType,
            confidence: Number(confidence) || 0.95,
            researcherNotes: researcherNotes.trim() || undefined,
            isResearcherVerified,
            createdBy: isAiMode ? 'Lead Researcher (Assisted)' : 'Lead Researcher (Manual)',
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to save evidence');
        }

        showToast('Grounded evidence recorded into research repository');
      }

      setModalMode(null);
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
        showToast('Evidence record removed');
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
    showToast('Exported evidence as JSON file');
  };

  const copyMarkdownSummary = async () => {
    if (filteredEvidence.length === 0) return;

    let md = `# Grounded Evidence Synthesis (${filteredEvidence.length} items)\n\n`;
    if (projectTitle) md += `**Project:** ${projectTitle}\n`;
    md += `**Scope:** ${scope.replace('_', ' ').toUpperCase()}\n`;
    md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    filteredEvidence.forEach((item, idx) => {
      md += `### ${idx + 1}. Claim: "${item.claim}"\n`;
      if (item.researchQuestion) md += `- **Research Question**: ${item.researchQuestion}\n`;
      md += `- **Relationship**: \`${(item.relationship || 'supports').toUpperCase()}\`\n`;
      md += `- **Verification Status**: \`${item.verificationStatus.toUpperCase()}\` ${item.isResearcherVerified ? '(Researcher Confirmed)' : '(AI Suggestion)'}\n`;
      md += `- **Evidence Type**: ${item.evidenceType || 'empirical'}\n`;
      md += `- **Source Paper**: *${item.paperTitle}*\n`;
      md += `- **Coordinates**: Page ${item.page ?? 'Unspecified'}, Section: ${item.section || 'General'}\n`;
      md += `- **Verbatim Source Extract**:\n> "${item.snippet}"\n`;
      if (item.researcherNotes) md += `- **Researcher Notes**: ${item.researcherNotes}\n`;
      md += `\n`;
    });

    try {
      await navigator.clipboard.writeText(md);
      showToast('Copied Markdown synthesis to clipboard');
    } catch (e) {
      console.warn('Failed to copy markdown', e);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterPaperId('all');
    setFilterRelationship('all');
    setFilterVerificationLevel('all');
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
        };
      case 'partially_supported':
        return {
          label: 'Partially Supported',
          icon: CheckCircle2,
          badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        };
      case 'contradicted':
        return {
          label: 'Contradicted',
          icon: AlertTriangle,
          badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        };
      case 'requires_verification':
        return {
          label: 'Requires Verification',
          icon: HelpCircle,
          badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'insufficient_evidence':
      default:
        return {
          label: 'Insufficient Evidence',
          icon: HelpCircle,
          badgeClass: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80',
        };
    }
  };

  const renderEvidenceCard = (item: Evidence) => {
    const statusConfig = getStatusBadgeConfig(item.verificationStatus);
    const StatusIcon = statusConfig.icon;
    const isSnippetExpanded = expandedSnippets[item.id] || false;
    const isCopied = copiedId === item.id;
    const isDeleting = deleteConfirmId === item.id;

    // Enriched paper lookup
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

    const isOpposing = item.relationship === 'opposes' || item.verificationStatus === 'contradicted';

    return (
      <div
        key={item.id}
        className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
      >
        {/* 1. Card Top Bar: Status, Relationship, Verification Badge & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/70">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border font-mono tracking-tight ${statusConfig.badgeClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label.toUpperCase()}</span>
            </span>

            {/* Relationship Tag: Supports vs Opposes vs Contextual */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono uppercase border ${
                isOpposing
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                  : item.relationship === 'contextual'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              {isOpposing ? 'Opposing Evidence' : item.relationship === 'contextual' ? 'Contextual' : 'Supporting Evidence'}
            </span>

            {/* Researcher Verified vs Machine Suggestion Badge */}
            <button
              onClick={() => handleToggleResearcherVerified(item)}
              title="Click to toggle Researcher Verification"
              className={`inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                item.isResearcherVerified
                  ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
              }`}
            >
              {item.isResearcherVerified ? (
                <>
                  <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Researcher Confirmed</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-zinc-400" />
                  <span>Machine Suggestion (Click to Verify)</span>
                </>
              )}
            </button>

            {/* Fidelity / Extraction Quality */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                item.extractionQuality === 'verified'
                  ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                  : item.extractionQuality === 'approximate'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {item.extractionQuality === 'verified'
                ? 'Source Verified'
                : item.extractionQuality === 'approximate'
                ? 'Approximate Location'
                : 'Location Uncertain in Extraction'}
            </span>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center space-x-1.5">
            {/* Edit Button */}
            <button
              onClick={() => handleOpenEdit(item)}
              className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
              title="Edit annotation and verification details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* Copy Citation Button */}
            <button
              onClick={() => handleCopyCitation(item)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Copy grounded academic citation"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
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

        {/* 2. LEVEL 1: THE RESEARCH CLAIM & RESEARCH QUESTION */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-zinc-400 dark:text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Associated Claim</span>
            {item.topic && (
              <>
                <span>·</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">{item.topic}</span>
              </>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
            {item.claim}
          </h3>
          {item.researchQuestion && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium pt-0.5">
              <FileSearch className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>RQ: {item.researchQuestion}</span>
            </p>
          )}
        </div>

        {/* 3. LEVEL 2: VERBATIM SOURCE EXTRACT */}
        <div className="p-4 bg-zinc-50/90 dark:bg-zinc-900/70 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 relative">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
              <Quote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Verbatim Manuscript Extract</span>
            </span>
            <span className="flex items-center gap-2">
              {item.page !== undefined && item.page !== null ? (
                <span className="bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Page {item.page}
                </span>
              ) : (
                <span className="bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] italic text-zinc-400">
                  Page Not Stated
                </span>
              )}
              {item.section && (
                <span className="text-zinc-400 hidden sm:inline">Section: {item.section}</span>
              )}
            </span>
          </div>

          <blockquote className="text-xs sm:text-[13px] text-zinc-800 dark:text-zinc-200 italic leading-relaxed font-serif pl-2 border-l-2 border-emerald-500/60 dark:border-emerald-500/40">
            &ldquo;
            {isSnippetExpanded || item.snippet.length <= 220
              ? item.snippet
              : `${item.snippet.substring(0, 220)}...`}
            &rdquo;
          </blockquote>

          {/* Expand / Collapse Button if long */}
          {item.snippet.length > 220 && (
            <button
              onClick={() => toggleSnippetExpand(item.id)}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
            >
              <span>{isSnippetExpanded ? 'Show less' : 'Show full passage'}</span>
              {isSnippetExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
            </div>
          </div>

          {/* Direct Paper Navigation Callback */}
          {onOpenPaper && item.paperId && (
            <button
              onClick={() => onOpenPaper(item.paperId)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors shrink-0 self-start sm:self-center"
            >
              <span>Open in Reader</span>
              <ArrowRight className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>

        {/* 5. LEVEL 4: RESEARCHER NOTES & ANNOTATION */}
        {item.researcherNotes && (
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5 text-[11px]">
              <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Researcher Annotation & Critique</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
              {item.researcherNotes}
            </p>
          </div>
        )}

        {/* 6. LEVEL 5: CONTRADICTION FINDING CALLOUT */}
        {item.verificationStatus === 'contradicted' && (
          <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-semibold text-xs">
                <Scale className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Scholarly Contradiction Detected</span>
              </div>
              {onNavigateToContradictions && (
                <button
                  onClick={onNavigateToContradictions}
                  className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore Contradiction Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
              This evidence contradicts another finding in the project. Check whether differences in preprocessing, tokenizer choices, or corpus evaluation distributions explain the divergence.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE WORKSPACE HEADER */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BookmarkCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <span>Evidence Engine & Research Verification Vault</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold">
                    {evidenceList.length} Grounded Records
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Bidirectional claim-to-text verification: <span className="font-semibold text-zinc-700 dark:text-zinc-300">Claim</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Verbatim Passage</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Source Paper</span> → <span className="font-semibold text-zinc-700 dark:text-zinc-300">Page & Section</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* AI Mode Toggle: AI ON vs AI OFF (Manual Research Mode) */}
            <button
              onClick={() => {
                setIsAiMode(!isAiMode);
                showToast(isAiMode ? 'Switched to AI OFF (Manual Reading & Verification Mode)' : 'AI Assist Mode Activated');
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isAiMode
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
              }`}
              title="Toggle AI assistance vs strict manual evidence curation"
            >
              {isAiMode ? <Sparkles className="w-3.5 h-3.5 text-purple-600" /> : <Bot className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{isAiMode ? 'AI Assist ON' : 'AI OFF: Manual Mode'}</span>
            </button>

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
              <span className="hidden sm:inline">Markdown</span>
            </button>

            <button
              onClick={exportToJson}
              disabled={filteredEvidence.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Download JSON records"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Grounded Evidence</span>
            </button>
          </div>
        </div>

        {/* Scope Selector: Single Paper vs Project vs Research Library */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 font-medium text-[11px]">Retrieval Scope:</span>
            <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
              <button
                onClick={() => setScope('single_paper')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  scope === 'single_paper'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Single Paper Mode
              </button>
              <button
                onClick={() => setScope('project')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  scope === 'project'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Project Literature
              </button>
              <button
                onClick={() => setScope('library')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  scope === 'library'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Search Across Research Library
              </button>
            </div>
          </div>

          {/* If in Single Paper Mode, display dropdown to switch paper */}
          {scope === 'single_paper' && (
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 font-medium text-[11px]">Active Paper:</span>
              <select
                value={activePaperId}
                onChange={(e) => setActivePaperId(e.target.value)}
                className="text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-zinc-800 dark:text-zinc-200 font-medium max-w-[240px] truncate"
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title} ({p.publicationYear})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group By selector */}
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 font-medium text-[11px]">Group View:</span>
            <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
              <button
                onClick={() => setGroupBy('claim')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  groupBy === 'claim'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                By Claim
              </button>
              <button
                onClick={() => setGroupBy('paper')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  groupBy === 'paper'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                By Paper
              </button>
              <button
                onClick={() => setGroupBy('feed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  groupBy === 'feed'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Flat Feed
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2. METRICS & EVIDENCE HEALTH BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Total Evidence</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
            {metrics.total}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Grounded passages</p>
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
            {metrics.supportedRate}% verified findings
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
            Divergent evidence
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Researcher Confirmed</span>
            <UserCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300 font-mono">
            {metrics.researcherVerified}
          </div>
          <p className="text-[11px] text-purple-600/90 dark:text-purple-400/90">
            Human scholar certified
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Partial / Gaps</span>
            <HelpCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">
            {metrics.partially + metrics.insufficient}
          </div>
          <p className="text-[11px] text-blue-600/90 dark:text-blue-400/90">
            Requires more evidence
          </p>
        </div>
      </div>

      {/* 3. MULTI-FACETED FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims, verbatim passages, sections, notes, or paper titles..."
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="all">All Statuses ({evidenceList.length})</option>
              <option value="supported">Supported ({metrics.supported})</option>
              <option value="partially_supported">Partially Supported ({metrics.partially})</option>
              <option value="contradicted">Contradicted ({metrics.contradicted})</option>
              <option value="insufficient_evidence">Insufficient Evidence ({metrics.insufficient})</option>
              <option value="requires_verification">Requires Verification ({metrics.requiresVerification})</option>
            </select>

            {/* Filter by Relationship */}
            <select
              value={filterRelationship}
              onChange={(e) => setFilterRelationship(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="all">All Relationships</option>
              <option value="supports">Supporting Only</option>
              <option value="opposes">Opposing Only</option>
              <option value="contextual">Contextual Only</option>
            </select>

            {/* Filter by Verification Level */}
            <select
              value={filterVerificationLevel}
              onChange={(e) => setFilterVerificationLevel(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="all">All Verification Levels</option>
              <option value="researcher_verified">Researcher Confirmed Only</option>
              <option value="ai_suggested">Machine Suggestions Only</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
            >
              <option value="date_desc">Newest Recorded</option>
              <option value="date_asc">Oldest Recorded</option>
              <option value="confidence_desc">Highest Confidence</option>
              <option value="paper_title">By Paper Title</option>
              <option value="claim">By Claim Text</option>
            </select>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(searchQuery || filterStatus !== 'all' || filterRelationship !== 'all' || filterVerificationLevel !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500">
            <span className="text-[11px] font-medium text-zinc-400">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                Search: &ldquo;{searchQuery}&rdquo;
                <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('all')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterRelationship !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                Role: {filterRelationship}
                <button onClick={() => setFilterRelationship('all')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterVerificationLevel !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px]">
                Level: {filterVerificationLevel.replace('_', ' ')}
                <button onClick={() => setFilterVerificationLevel('all')}>
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

      {/* 4. MODAL / DRAWER (CREATE & EDIT) */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {modalMode === 'edit' ? 'Edit Grounded Evidence Record' : 'Record Grounded Evidence'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {modalMode === 'edit'
                      ? 'Refine claim mapping, annotations, and researcher verification.'
                      : 'Extract and ground an empirical passage directly from peer-reviewed literature.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
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

            <form onSubmit={handleSubmitForm} className="space-y-4">
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

              {/* Research Question & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Associated Research Question (Optional)
                  </label>
                  <input
                    type="text"
                    value={researchQuestion}
                    onChange={(e) => setResearchQuestion(e.target.value)}
                    placeholder="e.g. Does phonetic regularization boost dialectal generalization?"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Thematic Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Subword Fragmentation, Model Performance"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Source Paper Selection */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Source Paper in Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={formPaperId}
                  disabled={modalMode === 'edit'} // Preserve source paper identity
                  onChange={(e) => setFormPaperId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:opacity-60"
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

              {/* Verbatim Passage Snippet */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Verbatim Source Passage <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  placeholder="Exact quotation from the manuscript justifying or refuting the claim..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed font-serif"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Scholarly Fidelity: Extract passage verbatim without silently rewriting or embellishing the manuscript text.
                </p>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Page Number
                    </label>
                    <label className="text-[10px] text-zinc-400 flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pageUncertain}
                        onChange={(e) => setPageUncertain(e.target.checked)}
                        className="rounded accent-blue-600"
                      />
                      <span>Uncertain</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min={1}
                    disabled={pageUncertain}
                    value={page}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 1;
                      setPage(p);
                      setLocation(`${section} → Page ${p}`);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Location Label
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

              {/* Status, Relationship, and Evidence Type */}
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
                    Claim Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="supports">Supports Claim</option>
                    <option value="opposes">Opposes / Contradicts Claim</option>
                    <option value="contextual">Contextual Background</option>
                    <option value="methodological">Methodological Protocol</option>
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
                    <option value="methodological">Methodological</option>
                    <option value="qualitative">Qualitative Analysis</option>
                    <option value="contextual">Contextual</option>
                  </select>
                </div>
              </div>

              {/* Researcher Notes */}
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Researcher Notes & Critical Appraisal
                </label>
                <textarea
                  rows={2}
                  value={researcherNotes}
                  onChange={(e) => setResearcherNotes(e.target.value)}
                  placeholder="Add your scholarly interpretation, baseline qualifications, or methodological caveats..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Researcher Verified Checkbox */}
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200/60 dark:border-purple-900/40 flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="markVerifiedCheckbox"
                  checked={isResearcherVerified}
                  onChange={(e) => setIsResearcherVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                />
                <label htmlFor="markVerifiedCheckbox" className="text-xs text-purple-950 dark:text-purple-200 font-medium cursor-pointer">
                  Mark as <strong>Researcher Confirmed</strong> (Certifies that a human scholar verified the source excerpt)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
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
                  <span>{submitting ? 'Saving...' : modalMode === 'edit' ? 'Update Evidence' : 'Record & Ground Claim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EVIDENCE RECORDS LIST / GROUPS */}
      <div className="space-y-4">
        {/* Loading State */}
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
              Retry Loading Evidence
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !fetchError && filteredEvidence.length === 0 && (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#0f1422] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl space-y-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit mx-auto text-zinc-400">
              <BookmarkCheck className="w-8 h-8" />
            </div>
            {evidenceList.length === 0 ? (
              <>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {scope === 'single_paper'
                    ? 'No Grounded Evidence for Selected Paper'
                    : 'No Grounded Evidence Recorded Yet'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Extract verbatim passages, verify empirical assertions against paper text, and attach scholarly critiques.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record First Grounded Passage</span>
                  </button>
                  {scope === 'single_paper' && (
                    <button
                      onClick={() => setScope('project')}
                      className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200 transition-colors"
                    >
                      View All Project Evidence
                    </button>
                  )}
                </div>
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

        {/* 6. VIEW MODES */}
        {!loading && filteredEvidence.length > 0 && (
          <>
            {/* VIEW MODE A: BY CLAIM (Bidirectional dialectic: supporting vs opposing) */}
            {groupBy === 'claim' && (
              <div className="space-y-6">
                {groupedByClaim.map((group, gIdx) => {
                  const supporting = group.items.filter((i) => i.relationship !== 'opposes' && i.verificationStatus !== 'contradicted');
                  const opposing = group.items.filter((i) => i.relationship === 'opposes' || i.verificationStatus === 'contradicted');

                  return (
                    <div
                      key={gIdx}
                      className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      {/* Claim Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span>Claim Under Investigation</span>
                            <span>·</span>
                            <span className="text-zinc-600 dark:text-zinc-300">{group.items.length} Grounded Excerpt{group.items.length > 1 ? 's' : ''}</span>
                          </div>
                          <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                            {group.claim}
                          </h3>
                          {group.researchQuestion && (
                            <p className="text-xs text-zinc-500 flex items-center gap-1 font-medium">
                              <FileSearch className="w-3 h-3 text-zinc-400" />
                              <span>RQ: {group.researchQuestion}</span>
                            </p>
                          )}
                        </div>

                        {/* Dialectical balance tags */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                            {supporting.length} Supporting
                          </span>
                          {opposing.length > 0 && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-semibold">
                              {opposing.length} Opposing
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Evidence Items for this claim */}
                      <div className="space-y-3.5 pt-1">
                        {group.items.map((item) => renderEvidenceCard(item))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE B: BY PAPER */}
            {groupBy === 'paper' && (
              <div className="space-y-6">
                {groupedByPaper.map((pGroup, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    {/* Paper Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                          <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                          <span>Source Publication</span>
                          <span>·</span>
                          <span className="text-zinc-600 dark:text-zinc-300">{pGroup.items.length} Grounded Finding{pGroup.items.length > 1 ? 's' : ''}</span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                          {pGroup.paperTitle}
                        </h3>
                      </div>

                      {onOpenPaper && pGroup.paperId && (
                        <button
                          onClick={() => onOpenPaper(pGroup.paperId)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors shrink-0"
                        >
                          <span>Open in Reader</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5 pt-1">
                      {pGroup.items.map((item) => renderEvidenceCard(item))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE C: FLAT FEED */}
            {groupBy === 'feed' && (
              <div className="space-y-4">
                {filteredEvidence.map((item) => renderEvidenceCard(item))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
