'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SearchResultPaper } from '@/lib/scholarly/provider';
import { Paper, ResearchProject } from '@/lib/db/types';
import {
  Search,
  BookPlus,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Filter,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  ArrowUpDown,
  Check,
  FileText,
  BookOpen,
  Layers,
  RotateCcw,
  Tag,
} from 'lucide-react';

interface AcademicSearchProps {
  projectId?: string;
  currentProject?: ResearchProject | null;
  existingPapers?: Paper[];
  onPaperAdded?: () => void;
}

type SortCriterion = 'relevance' | 'newest' | 'citations' | 'title';

export const AcademicSearch: React.FC<AcademicSearchProps> = ({
  projectId,
  currentProject,
  existingPapers = [],
  onPaperAdded,
}) => {
  // Main Search State
  const [query, setQuery] = useState('sentiment analysis Indic low-resource');
  const [author, setAuthor] = useState('');
  const [doi, setDoi] = useState('');
  const [year, setYear] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [minCitations, setMinCitations] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [sortOption, setSortOption] = useState<SortCriterion>('relevance');

  // Async Execution State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultPaper[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [source, setSource] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Interaction State
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set());
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPreviewPaper, setSelectedPreviewPaper] = useState<SearchResultPaper | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());

  // Recent Searches History
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Initialize recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rp_recent_searches');
        if (stored) {
          setRecentSearches(JSON.parse(stored).slice(0, 5));
        }
      } catch (e) {
        console.warn('Failed to parse recent searches:', e);
      }
    }
  }, []);

  const saveRecentQuery = (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (!trimmed || typeof window === 'undefined') return;

    try {
      const updated = [trimmed, ...recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('rp_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent search query:', e);
    }
  };

  // Check if a result is already saved in the project
  const isAlreadyCataloged = (paper: SearchResultPaper): boolean => {
    if (savedPaperIds.has(paper.id)) return true;
    const paperDoi = (paper.doi || '').trim().toLowerCase();
    const paperTitleNorm = (paper.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    return existingPapers.some((existing) => {
      const existingDoi = (existing.doi || '').trim().toLowerCase();
      const existingTitleNorm = (existing.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (paperDoi && existingDoi && paperDoi === existingDoi) return true;
      if (paperTitleNorm && existingTitleNorm && paperTitleNorm === existingTitleNorm) return true;
      return false;
    });
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = customQuery !== undefined ? customQuery : query;
    if (!activeQuery.trim() && !doi.trim() && !author.trim()) return;

    setLoading(true);
    setSearchError(null);
    setFeedbackNotice(null);
    setHasSearched(true);

    if (activeQuery.trim()) {
      saveRecentQuery(activeQuery);
    }

    try {
      const params = new URLSearchParams();
      if (activeQuery) params.set('q', activeQuery);
      if (author) params.set('author', author);
      if (doi) params.set('doi', doi);
      if (year) params.set('year', year);
      if (openAccessOnly) params.set('openAccess', 'true');
      if (projectId) params.set('projectId', projectId);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Scholarly search endpoint returned an unexpected response');
      }

      const data = await res.json();
      setResults(data.papers || []);
      setTotal(data.total || 0);
      setSource(data.source || 'Crossref REST API & Academic Repositories');
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Unable to query academic repositories. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setAuthor('');
    setDoi('');
    setYear('');
    setOpenAccessOnly(false);
    setMinCitations('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (author.trim()) count++;
    if (doi.trim()) count++;
    if (year.trim()) count++;
    if (openAccessOnly) count++;
    if (minCitations.trim()) count++;
    return count;
  }, [author, doi, year, openAccessOnly, minCitations]);

  // Client-side filtering & sorting
  const processedResults = useMemo(() => {
    let list = [...results];

    // Filter by min citations if specified
    if (minCitations.trim()) {
      const minVal = parseInt(minCitations, 10);
      if (!isNaN(minVal)) {
        list = list.filter((p) => (p.citationCount || 0) >= minVal);
      }
    }

    // Sort results
    list.sort((a, b) => {
      if (sortOption === 'relevance') {
        return (b.relevance?.score || 0) - (a.relevance?.score || 0);
      }
      if (sortOption === 'newest') {
        return (b.publicationYear || 0) - (a.publicationYear || 0);
      }
      if (sortOption === 'citations') {
        return (b.citationCount || 0) - (a.citationCount || 0);
      }
      if (sortOption === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [results, minCitations, sortOption]);

  const handleAddToProject = async (paper: SearchResultPaper) => {
    if (!projectId) {
      setFeedbackNotice({
        type: 'error',
        message: 'No active research project selected. Please select or create a project first.',
      });
      return;
    }

    setSavingId(paper.id);
    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          doi: paper.doi,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          publicationYear: paper.publicationYear,
          journalOrConference: paper.journalOrConference,
          url: paper.url,
          openAccessUrl: paper.openAccessUrl,
          citationCount: paper.citationCount,
          sourceProvider: paper.sourceProvider,
          sourceId: paper.sourceId,
          isDemo: paper.isDemo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSavedPaperIds((prev) => new Set([...prev, paper.id]));
        setFeedbackNotice({
          type: 'success',
          message: `Added "${paper.title.substring(0, 45)}..." to your project library.`,
        });
        if (onPaperAdded) onPaperAdded();
      } else {
        setFeedbackNotice({
          type: 'error',
          message: data.error || 'Failed to add publication to project library.',
        });
      }
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: 'Network error communicating with project database.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts((prev) => {
      const next = new Set(prev);
      if (next.has(paperId)) next.delete(paperId);
      else next.add(paperId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. ACADEMIC SEARCH HEADER & SEARCH COMMAND BAR */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 font-semibold tracking-wider">
                Scholarly Discovery
              </span>
              {currentProject?.title && (
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-[260px]">
                  Project: <strong className="text-zinc-800 dark:text-zinc-200">{currentProject.title}</strong>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center space-x-2">
              <Search className="w-4 h-4 text-blue-500" />
              <span>Academic Paper Discovery & Crossref Repository Ingest</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Query peer-reviewed literature across Crossref, Semantic Scholar, and curated academic benchmarks with transparent relevance ranking.
            </p>
          </div>
        </div>

        {/* Main Search Input Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search research questions, keywords, models, or topics (e.g. 'subword tokenization Indic dialects')..."
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                  title="Clear query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
                className={`inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeFilterCount > 0 || isFilterExpanded
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                    : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
                {isFilterExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900 rounded-full animate-spin" />
                    <span>Querying Repositories...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Discover Literature</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Query Presets / Recent Searches */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-zinc-400 font-mono flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Recent & Suggestions:</span>
            </span>
            {recentSearches.length > 0
              ? recentSearches.map((rq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(rq);
                      handleSearch(undefined, rq);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer truncate max-w-[220px]"
                  >
                    {rq}
                  </button>
                ))
              : ['subword tokenization Indic dialects', 'transformer cross-lingual transfer', 'morphological regularization'].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(sug);
                      handleSearch(undefined, sug);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
          </div>

          {/* Expandable Advanced Filter Panel */}
          {isFilterExpanded && (
            <div className="pt-3.5 pb-1 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Vaswani or Devlin"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    DOI Identifier
                  </label>
                  <input
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="e.g. 10.1016/j..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Min Citations
                  </label>
                  <input
                    type="number"
                    value={minCitations}
                    onChange={(e) => setMinCitations(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center space-x-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={openAccessOnly}
                      onChange={(e) => setOpenAccessOnly(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Open Access Direct PDF</span>
                  </label>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-zinc-500 font-mono">
                    {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''} applied
                  </span>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center space-x-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="font-medium">{feedbackNotice.message}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. RESULTS BAR: COUNT, SOURCE & SORTING */}
      {hasSearched && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 text-xs">
          <div className="flex items-center space-x-2 text-zinc-500 font-mono">
            <span>
              Found <strong>{processedResults.length}</strong> record{processedResults.length === 1 ? '' : 's'}
              {total !== null && total > processedResults.length ? ` of ${total} indexed` : ''}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="truncate max-w-[280px]">Provider: {source}</span>
          </div>

          {processedResults.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-zinc-400 font-mono text-[11px] flex items-center space-x-1">
                <ArrowUpDown className="w-3 h-3" />
                <span>Sort by:</span>
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortCriterion)}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="relevance">Project Relevance (Highest First)</option>
                <option value="newest">Publication Year (Newest First)</option>
                <option value="citations">Citation Count (Most Cited First)</option>
                <option value="title">Paper Title (A–Z)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* 3. SEARCH STATES: INITIAL, LOADING SKELETON, ERROR, NO RESULTS, OR RESULTS CARDS */}

      {/* Loading Skeleton State */}
      {loading && (
        <div className="space-y-3.5">
          {[1, 2, 3].map((sk) => (
            <div
              key={sk}
              className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="space-y-1.5 pt-1">
                <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded pt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && searchError && (
        <div className="border border-red-200 dark:border-red-900/60 rounded-2xl p-8 text-center bg-red-50/40 dark:bg-red-950/20 space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-red-900 dark:text-red-200">
              Scholarly Search Request Failed
            </h3>
            <p className="text-xs text-red-700/80 dark:text-red-400 max-w-md mx-auto leading-relaxed">
              {searchError}
            </p>
          </div>
          <button
            onClick={() => handleSearch()}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Initial Clean State */}
      {!loading && !searchError && !hasSearched && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Discover verified literature for your project
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Search by academic topic, DOI, or author to retrieve papers from Crossref and curated research benchmarks.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setQuery('subword tokenization Indic dialects');
                handleSearch(undefined, 'subword tokenization Indic dialects');
              }}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium rounded-xl cursor-pointer"
            >
              Explore Sample Query
            </button>
          </div>
        </div>
      )}

      {/* No Results State */}
      {!loading && !searchError && hasSearched && processedResults.length === 0 && (
        <div className="text-center py-14 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No publications matched your query
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find matching records. Try broadening your keywords, removing specific year/author filters, or searching by exact DOI.
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                handleClearFilters();
                handleSearch();
              }}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg cursor-pointer"
            >
              Clear Filters & Search Again
            </button>
          )}
        </div>
      )}

      {/* 4. RESULTS LIST: PROFESSIONAL SEARCH RESULT CARDS */}
      {!loading && !searchError && processedResults.length > 0 && (
        <div className="space-y-3.5">
          {processedResults.map((paper) => {
            const cataloged = isAlreadyCataloged(paper);
            const isAbstractExpanded = expandedAbstracts.has(paper.id);

            return (
              <div
                key={paper.id}
                className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                {/* Header Row: Provider, Retraction Notices, Project Relevance */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {paper.isDemo ? (
                      <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-bold">
                        CURATED BENCHMARK
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">
                        {paper.sourceProvider}
                      </span>
                    )}

                    {paper.retractionStatus === 'corrected' && (
                      <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center space-x-1 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Correction Notice</span>
                      </span>
                    )}

                    {paper.retractionStatus === 'retracted' && (
                      <span className="text-[10px] font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center space-x-1 font-bold">
                        <ShieldAlert className="w-3 h-3" />
                        <span>RETRACTED PUBLICATION</span>
                      </span>
                    )}

                    {cataloged && (
                      <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 flex items-center space-x-1 font-semibold">
                        <Check className="w-3 h-3" />
                        <span>In Project Library</span>
                      </span>
                    )}
                  </div>

                  {/* Transparent Relevance Badge */}
                  {paper.relevance && (
                    <div className="flex items-center space-x-1.5 text-xs font-mono">
                      <span className="text-zinc-500">Relevance:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                          paper.relevance.score >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : paper.relevance.score >= 60
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title={paper.relevance.confidence ? `Confidence: ${paper.relevance.confidence}` : undefined}
                      >
                        {paper.relevance.score >= 80
                          ? `Highly Relevant (${paper.relevance.score}%)`
                          : paper.relevance.score >= 60
                          ? `Relevant (${paper.relevance.score}%)`
                          : `Exploratory (${paper.relevance.score}%)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Bibliographic Metadata */}
                <div>
                  <h3
                    onClick={() => setSelectedPreviewPaper(paper)}
                    className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {paper.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {paper.authors.slice(0, 4).join(', ')}
                    {paper.authors.length > 4 ? ` et al.` : ''} ·{' '}
                    <span className="italic">{paper.journalOrConference || 'Scholarly Publication'}</span> (
                    {paper.publicationYear})
                  </p>
                  {paper.doi && (
                    <p className="text-[11px] font-mono text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>
                        DOI:{' '}
                        <a
                          href={paper.url || `https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-blue-600 dark:text-blue-400"
                        >
                          {paper.doi}
                        </a>
                      </span>
                      {paper.citationCount > 0 && <span>· {paper.citationCount} citations</span>}
                    </p>
                  )}
                </div>

                {/* Abstract Excerpt */}
                {paper.abstract && (
                  <div className="space-y-1">
                    <p
                      className={`text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed ${
                        isAbstractExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {paper.abstract}
                    </p>
                    {paper.abstract.length > 160 && (
                      <button
                        type="button"
                        onClick={() => toggleAbstract(paper.id)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                      >
                        {isAbstractExpanded ? 'Show less' : 'Read full abstract'}
                      </button>
                    )}
                  </div>
                )}

                {/* Transparent Relevance Breakdown Factors */}
                {paper.relevance && paper.relevance.reasons.length > 0 && (
                  <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-[11px] space-y-1">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5 font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Transparent Relevance Signals:</span>
                    </div>
                    <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5 pl-1">
                      {paper.relevance.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                      {paper.relevance.mismatches &&
                        paper.relevance.mismatches.map((m, i) => (
                          <li key={`m-${i}`} className="text-amber-700 dark:text-amber-400">
                            Potential divergence: {m}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center space-x-3 text-xs">
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Publisher Page</span>
                      </a>
                    )}
                    {paper.openAccessUrl && (
                      <a
                        href={paper.openAccessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Direct PDF Access</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewPaper(paper)}
                      className="inline-flex items-center space-x-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Inspect Details</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {cataloged ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700/80 cursor-default"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Cataloged</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToProject(paper)}
                        disabled={savingId === paper.id}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl transition-all disabled:opacity-60 shadow-2xs cursor-pointer"
                      >
                        {savingId === paper.id ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Adding to Project...</span>
                          </>
                        ) : (
                          <>
                            <BookPlus className="w-3.5 h-3.5" />
                            <span>Add to Project</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. PAPER DETAILS PREVIEW MODAL */}
      {selectedPreviewPaper && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60">
              <div className="flex items-center space-x-2 truncate pr-3">
                <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-semibold shrink-0">
                  Scholarly Record
                </span>
                <span className="text-xs text-zinc-500 font-mono truncate">
                  {selectedPreviewPaper.sourceProvider}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewPaper(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {selectedPreviewPaper.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  <strong>Authors:</strong> {selectedPreviewPaper.authors.join(', ')}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  <strong>Publication Venue:</strong> {selectedPreviewPaper.journalOrConference || 'Preprint'} (
                  {selectedPreviewPaper.publicationYear})
                </p>
                {selectedPreviewPaper.doi && (
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">
                    <strong>DOI:</strong> {selectedPreviewPaper.doi}
                  </p>
                )}
              </div>

              {selectedPreviewPaper.retractionStatus === 'retracted' && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Warning: This publication has been formally retracted by the publisher.
                  </span>
                </div>
              )}

              {/* Abstract */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono tracking-wider">
                  Abstract
                </h4>
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedPreviewPaper.abstract || 'No abstract text available for this record.'}
                </div>
              </div>

              {/* Relevance Breakdown */}
              {selectedPreviewPaper.relevance && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Project Relevance Factors ({selectedPreviewPaper.relevance.score}%)</span>
                  </h4>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-xs space-y-1">
                    <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {selectedPreviewPaper.relevance.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                      {selectedPreviewPaper.relevance.mismatches.map((m, i) => (
                        <li key={`m-${i}`} className="text-amber-700 dark:text-amber-400">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs">
                {selectedPreviewPaper.url && (
                  <a
                    href={selectedPreviewPaper.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Publisher Page</span>
                  </a>
                )}
                {selectedPreviewPaper.openAccessUrl && (
                  <a
                    href={selectedPreviewPaper.openAccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Access PDF</span>
                  </a>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewPaper(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                {isAlreadyCataloged(selectedPreviewPaper) ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-semibold rounded-xl cursor-default"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Already in Project</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddToProject(selectedPreviewPaper)}
                    disabled={savingId === selectedPreviewPaper.id}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    <BookPlus className="w-3.5 h-3.5" />
                    <span>
                      {savingId === selectedPreviewPaper.id ? 'Adding...' : 'Add to Project'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
