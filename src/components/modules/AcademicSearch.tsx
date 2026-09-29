'use client';

import React, { useState } from 'react';
import { SearchResultPaper } from '@/lib/scholarly/provider';
import {
  Search,
  BookPlus,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Filter,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AcademicSearchProps {
  projectId?: string;
  onPaperAdded?: () => void;
}

export const AcademicSearch: React.FC<AcademicSearchProps> = ({
  projectId,
  onPaperAdded,
}) => {
  const [query, setQuery] = useState('sentiment analysis Indic low-resource');
  const [author, setAuthor] = useState('');
  const [doi, setDoi] = useState('');
  const [year, setYear] = useState('');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultPaper[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [source, setSource] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && !doi.trim() && !author.trim()) return;

    setLoading(true);
    setSaveMessage(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (author) params.set('author', author);
      if (doi) params.set('doi', doi);
      if (year) params.set('year', year);
      if (openAccessOnly) params.set('openAccess', 'true');
      if (projectId) params.set('projectId', projectId);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.papers || []);
      setTotal(data.total || 0);
      setSource(data.source || 'Crossref API & Curated Repositories');
    } catch (err: any) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProject = async (paper: SearchResultPaper) => {
    if (!projectId) {
      alert('Please select or create a research project first.');
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
        setSaveMessage(`Successfully added "${paper.title.substring(0, 40)}..." to project!`);
        if (onPaperAdded) onPaperAdded();
      } else {
        setSaveMessage(data.error || 'Failed to add paper to project');
      }
    } catch (err: any) {
      setSaveMessage('Error communicating with research database');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span>Academic Paper Discovery</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Query verified external scholarly metadata via Crossref REST API and curated research benchmarks.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search research questions, keywords, models, or topics (e.g., 'subword tokenization Indic dialects')..."
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-8 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span>Querying Scholarly APIs...</span>
              ) : (
                <span className="flex items-center space-x-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Discover Literature</span>
                </span>
              )}
            </button>
          </div>

          {/* Granular Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Rahman or Devlin"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 text-zinc-800 dark:text-zinc-200"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">DOI</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1016/..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 text-zinc-800 dark:text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">Publication Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1.5 text-zinc-800 dark:text-zinc-200 font-mono"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center space-x-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openAccessOnly}
                  onChange={(e) => setOpenAccessOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                />
                <span>Open Access Only</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      {saveMessage && (
        <div className="p-3 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
          <span>{saveMessage}</span>
          <button onClick={() => setSaveMessage(null)} className="text-zinc-400 hover:text-zinc-600">
            ×
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {total !== null && (
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1 font-mono">
            <span>
              Found {total} scholarly records (Source: {source})
            </span>
          </div>
        )}

        {results.length === 0 && !loading && total === null && (
          <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
            <Search className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Discover verified literature for your project
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Search by academic topic, DOI, or author to retrieve papers from Crossref and curated Indic benchmarks.
            </p>
          </div>
        )}

        {results.map((paper) => {
          const isExpanded = expandedPaperId === paper.id;
          return (
            <div
              key={paper.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {/* Top row: tags, retraction warning, relevance */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  {paper.isDemo ? (
                    <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold">
                      DEMO PAPER — NOT A REAL PUBLICATION
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                      {paper.sourceProvider}
                    </span>
                  )}

                  {paper.retractionStatus === 'corrected' && (
                    <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Has Publisher Correction Notice</span>
                    </span>
                  )}

                  {paper.retractionStatus === 'retracted' && (
                    <span className="text-[10px] font-mono bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center space-x-1 font-bold">
                      <ShieldAlert className="w-3 h-3" />
                      <span>RETRACTED PUBLICATION</span>
                    </span>
                  )}
                </div>

                {/* Transparent Relevance Badge */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-zinc-500">Project Relevance:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      paper.relevance.score >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : paper.relevance.score >= 60
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        : 'bg-zinc-50 text-zinc-500'
                    }`}
                  >
                    {paper.relevance.score}%
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {paper.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {paper.authors.slice(0, 4).join(', ')}
                  {paper.authors.length > 4 ? ` et al.` : ''} ·{' '}
                  <span className="italic">{paper.journalOrConference}</span> ({paper.publicationYear})
                </p>
                {paper.doi && (
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    DOI: <a href={paper.url || `https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="hover:underline text-zinc-700 dark:text-zinc-300">{paper.doi}</a>
                    {paper.citationCount > 0 && ` · ${paper.citationCount} citations`}
                  </p>
                )}
              </div>

              {/* Abstract Preview */}
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {paper.abstract}
              </p>

              {/* Relevance Breakdown Factors (Requirement 18) */}
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/70 dark:border-zinc-800/80 text-[11px] space-y-1">
                <div className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Transparent Relevance Signals:</span>
                </div>
                <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5 pl-1">
                  {paper.relevance.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                  {paper.relevance.mismatches.map((m, i) => (
                    <li key={`m-${i}`} className="text-amber-700 dark:text-amber-400">
                      Potential divergence: {m}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center space-x-2 text-xs">
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
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
                      className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <span>PDF Direct Access</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAddToProject(paper)}
                    disabled={savingId === paper.id}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-60"
                  >
                    <BookPlus className="w-3.5 h-3.5" />
                    <span>{savingId === paper.id ? 'Adding...' : 'Add to Project'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
