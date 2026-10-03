'use client';

import React, { useState, useMemo } from 'react';
import { Paper } from '@/lib/db/types';
import {
  BookOpen,
  Upload,
  MessageSquare,
  Sparkles,
  Trash2,
  ExternalLink,
  FileText,
  AlertTriangle,
  FileUp,
  X,
  Send,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Check,
  Clock,
  Layers,
  Power,
  ChevronRight,
  Loader2,
  FileCheck,
} from 'lucide-react';

interface PaperLibraryProps {
  projectId: string;
  papers: Paper[];
  selectedPaperId?: string;
  aiAssistanceEnabled?: boolean;
  onSelectPaper?: (paperId: string) => void;
  onRefresh: () => void;
  onSelectPaperForAnalysis: (paperId: string) => void;
  onOpenCopilotForPaper?: (paperId: string) => void;
  onDeletePaper?: (paperId: string) => void;
}

type FilterCategory = 'all' | 'ready' | 'processing' | 'verified' | 'uploaded' | 'sample';
type SortOption = 'newest' | 'year' | 'citations' | 'title';
type ViewDensity = 'cards' | 'table';

export const PaperLibrary: React.FC<PaperLibraryProps> = ({
  projectId,
  papers,
  selectedPaperId: propSelectedPaperId,
  aiAssistanceEnabled = true,
  onSelectPaper,
  onRefresh,
  onSelectPaperForAnalysis,
  onOpenCopilotForPaper,
  onDeletePaper,
}) => {
  // Local active selection state synced with props
  const [internalSelectedPaperId, setInternalSelectedPaperId] = useState<string | null>(
    propSelectedPaperId || null
  );

  const activeSelectedId = propSelectedPaperId || internalSelectedPaperId;

  const handleSelectPaperItem = (paperId: string) => {
    setInternalSelectedPaperId(paperId);
    if (onSelectPaper) {
      onSelectPaper(paperId);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search, Filter, Sort, and View density state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [viewDensity, setViewDensity] = useState<ViewDensity>('cards');

  // Delete action states
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Ask Paper Modal state
  const [activeAskPaper, setActiveAskPaper] = useState<Paper | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      question: string;
      answer: string;
      evidence: Array<{ page: number; section: string; snippet: string; similarityScore: number }>;
      modelUsed: string;
    }>
  >([]);

  // Filtered and sorted papers
  const filteredPapers = useMemo(() => {
    let result = papers.filter((paper) => {
      // 1. Category Filter
      if (filterCategory === 'verified' && paper.metadataStatus !== 'verified') return false;
      if (filterCategory === 'uploaded' && paper.sourceProvider !== 'upload') return false;
      if (filterCategory === 'sample' && !paper.isDemo) return false;
      if (filterCategory === 'ready' && paper.processingStatus !== 'ready' && paper.processingStatus !== undefined)
        return false;
      if (
        filterCategory === 'processing' &&
        (paper.processingStatus === 'ready' || !paper.processingStatus)
      )
        return false;

      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (paper.title || '').toLowerCase().includes(q);
        const authorMatch = (paper.authors || []).some((a) => a.toLowerCase().includes(q));
        const venueMatch = (paper.journalOrConference || '').toLowerCase().includes(q);
        const doiMatch = (paper.doi || '').toLowerCase().includes(q);
        if (!titleMatch && !authorMatch && !venueMatch && !doiMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort papers
    return result.sort((a, b) => {
      if (sortOption === 'year') {
        return (b.publicationYear || 0) - (a.publicationYear || 0);
      }
      if (sortOption === 'citations') {
        return (b.citationCount || 0) - (a.citationCount || 0);
      }
      if (sortOption === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default 'newest'
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [papers, searchQuery, filterCategory, sortOption]);

  const activeSelectedPaper = useMemo(() => {
    if (!activeSelectedId) return null;
    return papers.find((p) => p.id === activeSelectedId) || null;
  }, [papers, activeSelectedId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress('Validating file & extracting page-aware text...');
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('projectId', projectId);
    if (uploadTitle) formData.append('title', uploadTitle);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Persist paper and chunks to client cache for multi-instance serverless resilience
      if (typeof window !== 'undefined' && data.paper) {
        try {
          const storedPapers = JSON.parse(localStorage.getItem('rp_custom_papers') || '[]');
          const updatedPapers = [data.paper, ...storedPapers.filter((p: any) => p.id !== data.paper.id)];
          localStorage.setItem('rp_custom_papers', JSON.stringify(updatedPapers));

          if (data.chunks && Array.isArray(data.chunks) && data.chunks.length > 0) {
            const storedChunks = JSON.parse(localStorage.getItem('rp_custom_chunks') || '[]');
            const updatedChunks = [...data.chunks, ...storedChunks.filter((c: any) => c.paperId !== data.paper.id)];
            localStorage.setItem('rp_custom_chunks', JSON.stringify(updatedChunks));
          }
        } catch (storageErr) {
          console.warn('Local storage sync warning:', storageErr);
        }
      }

      setUploadProgress(
        `Document extracted! ${data.chunksExtracted} paragraphs indexed across ${data.totalPages} pages.`
      );
      setTimeout(() => {
        setIsUploading(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadProgress(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'PDF processing error');
      setIsUploading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAskPaper || !question.trim()) return;

    setAsking(true);
    const currQuestion = question;
    setQuestion('');

    try {
      const res = await fetch(`/api/papers/${activeAskPaper.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currQuestion }),
      });

      const data = await res.json();
      if (res.ok) {
        setChatHistory((prev) => [
          ...prev,
          {
            question: currQuestion,
            answer: data.answer,
            evidence: data.evidence || [],
            modelUsed: data.modelUsed,
          },
        ]);
      } else {
        alert(data.error || 'Failed to query paper');
      }
    } catch (err: any) {
      alert('Error querying paper intelligence engine');
    } finally {
      setAsking(false);
    }
  };

  // Count duplicate titles for smart one-click cleanup
  const duplicateTitleCounts = papers.reduce((acc, p) => {
    const key = (p.title || '').trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicatePaperCount = papers.filter((p) => {
    const key = (p.title || '').trim().toLowerCase();
    return (duplicateTitleCounts[key] || 0) > 1;
  }).length;

  const duplicateExcessCount = duplicatePaperCount > 0
    ? duplicatePaperCount - Object.values(duplicateTitleCounts).filter((c) => c > 1).length
    : 0;

  const executeDeletePaper = async (paperId: string, shouldRefresh = true) => {
    const rawId = paperId;
    const decodedId = decodeURIComponent(paperId);
    setDeletingId(rawId);

    try {
      if (onDeletePaper) {
        onDeletePaper(rawId);
      }

      if (typeof window !== 'undefined') {
        try {
          const storedPapers = JSON.parse(localStorage.getItem('rp_custom_papers') || '[]');
          const updatedPapers = storedPapers.filter(
            (p: any) => p.id !== rawId && p.id !== decodedId
          );
          localStorage.setItem('rp_custom_papers', JSON.stringify(updatedPapers));

          const storedChunks = JSON.parse(localStorage.getItem('rp_custom_chunks') || '[]');
          const updatedChunks = storedChunks.filter(
            (c: any) =>
              c.paperId !== rawId &&
              c.paperId !== decodedId &&
              c.paper_id !== rawId &&
              c.paper_id !== decodedId
          );
          localStorage.setItem('rp_custom_chunks', JSON.stringify(updatedChunks));

          const deletedStored = localStorage.getItem('rp_deleted_papers');
          const deletedList: string[] = deletedStored ? JSON.parse(deletedStored) : [];
          if (!deletedList.includes(rawId)) deletedList.push(rawId);
          if (!deletedList.includes(decodedId)) deletedList.push(decodedId);
          localStorage.setItem('rp_deleted_papers', JSON.stringify(deletedList));
        } catch (storageErr) {
          console.warn('Local storage delete sync warning:', storageErr);
        }
      }

      await Promise.allSettled([
        fetch(`/api/papers/${encodeURIComponent(rawId)}?_t=${Date.now()}`, {
          method: 'DELETE',
          cache: 'no-store',
        }),
        fetch(`/api/papers?id=${encodeURIComponent(rawId)}&_t=${Date.now()}`, {
          method: 'DELETE',
          cache: 'no-store',
        }),
      ]);

      if (shouldRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  const handleDeduplicate = async () => {
    setIsDeduplicating(true);
    try {
      const seenTitles = new Set<string>();
      const papersToDelete: string[] = [];

      for (const p of papers) {
        const norm = (p.title || '').trim().toLowerCase();
        if (seenTitles.has(norm)) {
          papersToDelete.push(p.id);
        } else {
          seenTitles.add(norm);
        }
      }

      for (const id of papersToDelete) {
        await executeDeletePaper(id, false);
      }

      setFeedbackNotice(`Cleaned up ${papersToDelete.length} duplicate publication(s).`);
      setTimeout(() => setFeedbackNotice(null), 3500);
      onRefresh();
    } catch (err) {
      console.error('Deduplicate error:', err);
    } finally {
      setIsDeduplicating(false);
    }
  };

  // Helper for rendering accurate processing status badge
  const renderProcessingStatus = (paper: Paper) => {
    const status = paper.processingStatus || 'ready';
    if (status === 'ready') {
      return (
        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 flex items-center space-x-1 font-medium">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Ready</span>
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="text-[10px] font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center space-x-1 font-medium">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span>Processing Failed</span>
        </span>
      );
    }
    // 'uploading' | 'extracting' | 'indexing' | 'analyzing'
    return (
      <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center space-x-1 font-medium animate-pulse">
        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
        <span className="capitalize">{status}...</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {feedbackNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between shadow-2xs">
          <span>{feedbackNotice}</span>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-emerald-600 dark:text-emerald-400 p-0.5 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. ACADEMIC REFERENCE CATALOG HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Project Literature Library ({papers.length} Publications)</span>
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                aiAssistanceEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {aiAssistanceEnabled ? 'AI Assistance Active' : 'AI Assistance Off'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Structured full-text catalog with verified DOIs, section extraction, and vector-indexed evidence.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {duplicateExcessCount > 0 && (
            <button
              type="button"
              onClick={handleDeduplicate}
              disabled={isDeduplicating}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Automatically keep only the newest copy of each duplicate paper"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {isDeduplicating
                  ? 'Removing Duplicates...'
                  : `Deduplicate Library (${duplicateExcessCount})`}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsUploading(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Research PDF</span>
          </button>
        </div>
      </div>

      {/* 2. ACTIVE SELECTED PAPER SPOTLIGHT PANEL */}
      {activeSelectedPaper && (
        <div className="bg-white dark:bg-[#0f1422] rounded-2xl border-2 border-blue-500/80 dark:border-blue-500/70 p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold tracking-wider">
                Active Selected Paper
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
                Single Paper Mode Ready
              </span>
              {renderProcessingStatus(activeSelectedPaper)}
            </div>

            <div className="flex items-center space-x-2 text-xs">
              {onOpenCopilotForPaper && (
                <button
                  type="button"
                  onClick={() => onOpenCopilotForPaper(activeSelectedPaper.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Query this paper in isolated Single Paper Deep Analysis Mode"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Single Paper AI</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectPaperForAnalysis(activeSelectedPaper.id)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Structured Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => setInternalSelectedPaperId(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Deselect paper"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {activeSelectedPaper.title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {activeSelectedPaper.authors.join(', ')} ·{' '}
              <span className="italic">{activeSelectedPaper.journalOrConference || 'Scholarly Publication'}</span> (
              {activeSelectedPaper.publicationYear})
            </p>
            {activeSelectedPaper.doi && (
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                DOI: {activeSelectedPaper.doi}{' '}
                {activeSelectedPaper.citationCount > 0 && `· ${activeSelectedPaper.citationCount} citations`}
              </p>
            )}
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-center justify-between">
            <span className="font-medium">
              Single Paper Mode Grounding: All conversational inquiries in Research Copilot are strictly isolated to this document.
            </span>
            <span className="font-mono font-semibold text-[10px] uppercase">Hard Isolation Active</span>
          </div>
        </div>
      )}

      {/* 3. FILTER, SEARCH & VIEW DENSITY CONTROLS */}
      <div className="bg-white dark:bg-[#0f1422] p-3 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library by title, author, venue, or DOI..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips & View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Chips */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All ({papers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('ready')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === 'ready'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Ready
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('verified')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === 'verified'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Verified
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('uploaded')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === 'uploaded'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              PDFs
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('sample')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterCategory === 'sample'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Sample
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded-xl text-[11px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest Added</option>
              <option value="year">Publication Year</option>
              <option value="citations">Citation Count</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>

          {/* Density Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewDensity('cards')}
              className={`p-1 rounded-lg cursor-pointer ${
                viewDensity === 'cards'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewDensity('table')}
              className={`p-1 rounded-lg cursor-pointer ${
                viewDensity === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title="Compact reference table view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredPapers.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {searchQuery || filterCategory !== 'all'
                ? 'No publications match your filter criteria'
                : 'No papers cataloged in this project yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || filterCategory !== 'all'
                ? 'Try broadening your search term or clearing the active category filters.'
                : 'Discover and add academic literature using the Academic Search engine, or upload a research PDF manuscript to extract structured sections.'}
            </p>
          </div>
          {searchQuery || filterCategory !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
              }}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => setIsUploading(true)}
              className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              Upload your first PDF
            </button>
          )}
        </div>
      )}

      {/* 4. COMPACT REFERENCE TABLE VIEW */}
      {viewDensity === 'table' && filteredPapers.length > 0 && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-4">Publication / Authors</th>
                  <th className="py-3 px-3">Year & Venue</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {filteredPapers.map((paper) => {
                  const isSelected = paper.id === activeSelectedId;

                  return (
                    <tr
                      key={paper.id}
                      onClick={() => handleSelectPaperItem(paper.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600'
                          : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40'
                      }`}
                    >
                      <td className="py-3 px-4 max-w-sm sm:max-w-md">
                        <div className="flex items-center space-x-2">
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {paper.title}
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          {paper.authors.slice(0, 3).join(', ')}
                          {paper.authors.length > 3 ? ' et al.' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        <div className="font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {paper.publicationYear}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                          {paper.journalOrConference || 'Preprint'}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {renderProcessingStatus(paper)}
                          {paper.metadataStatus === 'verified' && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5">
                              <CheckCircle className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center space-x-1">
                          {onOpenCopilotForPaper && (
                            <button
                              onClick={() => onOpenCopilotForPaper(paper.id)}
                              className="p-1.5 text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Ask Copilot (Single Paper Mode)"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveAskPaper(paper);
                              setChatHistory([]);
                            }}
                            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Quick Inquire"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectPaperForAnalysis(paper.id)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                          >
                            Analyze
                          </button>
                          {confirmingDeleteId === paper.id ? (
                            <div className="inline-flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => executeDeletePaper(paper.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(paper.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. STANDARD CARD GRID VIEW */}
      {viewDensity === 'cards' && filteredPapers.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredPapers.map((paper) => {
            const isSelected = paper.id === activeSelectedId;

            return (
              <div
                key={paper.id}
                onClick={() => handleSelectPaperItem(paper.id)}
                className={`bg-white dark:bg-[#0f1422] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-blue-500 dark:border-blue-500/90 ring-1 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                    : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                        SELECTED
                      </span>
                    )}

                    {paper.isDemo ? (
                      <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-bold">
                        SAMPLE PAPER
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">
                        {paper.sourceProvider}
                      </span>
                    )}

                    {renderProcessingStatus(paper)}

                    {paper.metadataStatus === 'verified' && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified Metadata</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                    {onOpenCopilotForPaper && (
                      <button
                        onClick={() => onOpenCopilotForPaper(paper.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors font-semibold text-[11px] cursor-pointer"
                        title="Open paper in persistent Research Copilot with Single Paper Mode"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Ask Copilot</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveAskPaper(paper);
                        setChatHistory([]);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors font-medium text-[11px] cursor-pointer"
                      title="Quick single-paper RAG inspector"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Quick Inquire</span>
                    </button>

                    <button
                      onClick={() => onSelectPaperForAnalysis(paper.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition-colors font-semibold text-[11px] shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Structured Analysis</span>
                    </button>

                    {confirmingDeleteId === paper.id ? (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            executeDeletePaper(paper.id);
                          }}
                          disabled={deletingId === paper.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Click to permanently confirm deletion"
                        >
                          {deletingId === paper.id ? (
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Confirm Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setConfirmingDeleteId(null);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setConfirmingDeleteId(paper.id);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Remove Paper from Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {paper.authors.join(', ')} ·{' '}
                    <span className="italic">{paper.journalOrConference || 'Publication'}</span> ({paper.publicationYear})
                  </p>
                  {paper.doi && (
                    <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      DOI: {paper.doi} {paper.citationCount > 0 && `· ${paper.citationCount} citations`}
                    </p>
                  )}
                </div>

                {paper.abstract && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {paper.abstract}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-md w-full p-6 border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <FileUp className="w-4 h-4 text-blue-500" />
                <span>Upload & Index Research PDF</span>
              </h3>
              <button
                onClick={() => setIsUploading(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Select Academic PDF (Max 25MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
                      }
                    }
                  }}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-2.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-800 dark:file:bg-zinc-800 dark:file:text-zinc-200 hover:file:cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Paper Title (Optional override)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Extracted title from PDF..."
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 space-y-1 font-mono">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300">Extraction Pipeline:</div>
                <div className="text-[10px] text-zinc-400">
                  Validation → Page-Aware Text Extraction → Section Detection → Paragraph Chunking → Vector Embeddings
                </div>
              </div>

              {uploadProgress && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {uploadProgress}
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium">
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile}
                  className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  Process & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ask the Paper Modal (RAG Q&A with Strict Page & Section Citations) */}
      {activeAskPaper && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-2xl w-full h-[80vh] flex flex-col border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60">
              <div className="truncate pr-4">
                <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-semibold">
                  Grounded Evidence Q&A
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-1">
                  Ask: {activeAskPaper.title}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {onOpenCopilotForPaper && (
                  <button
                    onClick={() => {
                      const paperId = activeAskPaper.id;
                      setActiveAskPaper(null);
                      onOpenCopilotForPaper(paperId);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl font-semibold transition-colors cursor-pointer"
                    title="Transfer context to full persistent AI chat session"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Open in Copilot</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveAskPaper(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-12 space-y-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Inquire about specific methodology, datasets, models, metrics, or limitations. Every answer shows verified source page and section evidence.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {[
                      'What dataset was used and what is its size?',
                      'Explain the proposed methodology.',
                      'What are the stated limitations?',
                      'Why was this specific model architecture selected?',
                    ].map((sampleQ, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuestion(sampleQ);
                        }}
                        className="text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full text-left font-medium transition-colors cursor-pointer"
                      >
                        {sampleQ}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] font-medium">
                      {msg.question}
                    </div>
                  </div>

                  {/* AI Grounded Response */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl rounded-tl-xs p-4 max-w-[90%] space-y-3">
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {msg.answer}
                      </div>

                      {/* Evidence citations */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="border-t border-zinc-200/70 dark:border-zinc-800 pt-2.5 space-y-2">
                          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center space-x-1 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Source Evidence (Grounding Verification)</span>
                          </div>
                          {msg.evidence.slice(0, 2).map((ev, evIdx) => (
                            <div
                              key={evIdx}
                              className="p-2.5 bg-white dark:bg-[#0c101a] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-[11px] space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  Page {ev.page} · Section: {ev.section}
                                </span>
                                <span>{ev.similarityScore}% match</span>
                              </div>
                              <p className="italic text-zinc-600 dark:text-zinc-400">
                                &ldquo;{ev.snippet}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {asking && (
                <div className="text-xs text-zinc-500 font-mono animate-pulse flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Retrieving vector chunks and formulating grounded evidence answer...</span>
                </div>
              )}
            </div>

            {/* Modal Input */}
            <form
              onSubmit={handleAskQuestion}
              className="p-3 sm:p-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0f1422] flex items-center space-x-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask specific questions about this paper's findings, dataset, or methods..."
                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="px-4 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
