'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Paper, PaperComparisonItem, PaperComparisonSynthesis } from '@/lib/db/types';
import {
  GitCompare,
  CheckSquare,
  Square,
  Info,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  Download,
  ExternalLink,
  FileText,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  CheckCircle2,
  BarChart3,
  Database,
  Cpu,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  BookmarkCheck,
  SplitSquareVertical,
  HelpCircle,
} from 'lucide-react';

interface PaperComparisonProps {
  papers: Paper[];
  projectId?: string;
  projectTitle?: string;
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: () => void;
  onNavigateToGaps?: () => void;
}

type DimensionCategory =
  | 'all'
  | 'identity'
  | 'formulation'
  | 'corpus'
  | 'methodology'
  | 'results'
  | 'limitations'
  | 'evidence';

type ViewMode = 'table' | 'cards' | 'synthesis';

interface DimensionConfig {
  key: string;
  label: string;
  category: DimensionCategory;
  description: string;
  isList?: boolean;
  isObject?: boolean;
}

export const PaperComparison: React.FC<PaperComparisonProps> = ({
  papers,
  projectId,
  projectTitle,
  onOpenPaper,
  onNavigateToEvidence,
  onNavigateToGaps,
}) => {
  // Selected paper IDs (default to first 2 papers if available)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    papers.slice(0, Math.min(2, papers.length)).map((p) => p.id)
  );

  const [synthesisData, setSynthesisData] = useState<PaperComparisonSynthesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & display controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DimensionCategory>('all');
  const [diffsOnly, setDiffsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Evidence inspector drawer state
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<{
    paperTitle: string;
    paperId: string;
    evidence: NonNullable<PaperComparisonItem['evidenceSnippets']>;
  } | null>(null);

  // Collapsible category groups
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Run comparison fetch
  const fetchComparison = useCallback(
    async (ids: string[]) => {
      if (ids.length < 2) {
        setSynthesisData(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperIds: ids,
            projectId: projectId || (papers.length > 0 ? papers[0].projectId : undefined),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate comparative synthesis');
        }

        setSynthesisData(data);
      } catch (err: any) {
        console.error('Comparison error:', err);
        setError(err.message || 'An unexpected error occurred while loading comparison data.');
      } finally {
        setLoading(false);
      }
    },
    [papers, projectId]
  );

  // Auto-fetch when initial 2 papers are available and synthesisData is empty
  useEffect(() => {
    if (selectedIds.length >= 2 && !synthesisData && !loading) {
      fetchComparison(selectedIds);
    }
  }, [selectedIds, fetchComparison, synthesisData, loading]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      fetchComparison(next);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = papers.map((p) => p.id);
    setSelectedIds(allIds);
    fetchComparison(allIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSynthesisData(null);
  };

  const handleResetDefault = () => {
    const defaultIds = papers.slice(0, Math.min(2, papers.length)).map((p) => p.id);
    setSelectedIds(defaultIds);
    fetchComparison(defaultIds);
  };

  // Dimensions Definition
  const dimensions: DimensionConfig[] = useMemo(
    () => [
      // Publication Identity
      {
        key: 'authors',
        label: 'Authors',
        category: 'identity',
        description: 'Authors listed in publication header',
        isList: true,
      },
      {
        key: 'year',
        label: 'Publication Year',
        category: 'identity',
        description: 'Calendar year of manuscript release',
      },
      {
        key: 'journal',
        label: 'Venue / Conference',
        category: 'identity',
        description: 'Academic journal, conference, or workshop venue',
      },
      {
        key: 'doi',
        label: 'DOI / Citation ID',
        category: 'identity',
        description: 'Digital Object Identifier',
      },

      // Research Formulation
      {
        key: 'problem',
        label: 'Research Problem & Objective',
        category: 'formulation',
        description: 'Primary problem statement and investigated hypothesis',
      },
      {
        key: 'researchQuestions',
        label: 'Research Questions (RQs)',
        category: 'formulation',
        description: 'Explicit research questions addressed in manuscript',
        isList: true,
      },
      {
        key: 'contributions',
        label: 'Claimed Contributions',
        category: 'formulation',
        description: 'Primary conceptual and empirical contributions claimed by authors',
        isList: true,
      },
      {
        key: 'gapsAddressed',
        label: 'Addressed Research Gaps',
        category: 'formulation',
        description: 'Connected community literature gaps supported by this paper',
        isList: true,
      },

      // Data & Corpus
      {
        key: 'dataset',
        label: 'Dataset & Corpus Name',
        category: 'corpus',
        description: 'Target language or domain dataset utilized',
      },
      {
        key: 'datasetSize',
        label: 'Dataset Sample Size',
        category: 'corpus',
        description: 'Extracted corpus volume, token count, or sample count',
      },

      // Methodology & Models
      {
        key: 'model',
        label: 'Model Architecture',
        category: 'methodology',
        description: 'Primary baseline and proposed neural or statistical architectures',
      },
      {
        key: 'methodology',
        label: 'Preprocessing & Pipeline',
        category: 'methodology',
        description: 'Data cleaning, normalization, and tokenization procedures',
        isList: true,
      },
      {
        key: 'trainingSetup',
        label: 'Training Setup & Hyperparameters',
        category: 'methodology',
        description: 'Optimization setup, hardware environment, or fine-tuning strategy',
      },

      // Evaluation & Empirical Results
      {
        key: 'metrics',
        label: 'Evaluation Metrics',
        category: 'results',
        description: 'Quantitative benchmark scoring criteria',
        isList: true,
      },
      {
        key: 'results',
        label: 'Quantitative Results',
        category: 'results',
        description: 'Reported numerical performance metrics',
        isObject: true,
      },

      // Boundaries & Horizons
      {
        key: 'limitations',
        label: 'Stated Limitations',
        category: 'limitations',
        description: 'Explicit scope constraints and threats to validity noted by authors',
        isList: true,
      },
      {
        key: 'researchDirection',
        label: 'Future Work Directions',
        category: 'limitations',
        description: 'Unresolved challenges and proposed future avenues',
        isList: true,
      },

      // Evidence Traceability
      {
        key: 'evidenceSnippets',
        label: 'Manuscript Evidence Vault',
        category: 'evidence',
        description: 'Verified citations, page numbers, and verbatim manuscript quotes',
        isList: true,
      },
    ],
    []
  );

  // Filter dimensions according to search, category, and "Diffs Only" toggle
  const filteredDimensions = useMemo(() => {
    return dimensions.filter((dim) => {
      // Category filter
      if (selectedCategory !== 'all' && dim.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = dim.label.toLowerCase().includes(q);
        const matchesDesc = dim.description.toLowerCase().includes(q);
        // Also check if any paper has a value matching the query
        const matchesContent = synthesisData?.comparisons.some((c: any) => {
          const val = c[dim.key];
          if (!val) return false;
          if (typeof val === 'string') return val.toLowerCase().includes(q);
          if (Array.isArray(val)) return val.some((item) => String(item).toLowerCase().includes(q));
          if (typeof val === 'object') {
            return Object.entries(val).some(
              ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
            );
          }
          return false;
        });

        if (!matchesLabel && !matchesDesc && !matchesContent) {
          return false;
        }
      }

      // Diffs Only filter
      if (diffsOnly && synthesisData && synthesisData.comparisons.length > 1) {
        const values = synthesisData.comparisons.map((c: any) => {
          const val = c[dim.key];
          if (val === null || val === undefined) return '';
          if (Array.isArray(val)) return val.slice().sort().join('|');
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val).trim();
        });
        const allIdentical = values.every((v) => v === values[0]);
        if (allIdentical) return false;
      }

      return true;
    });
  }, [dimensions, selectedCategory, searchQuery, diffsOnly, synthesisData]);

  // Group filtered dimensions by category for clean sectioning
  const categoriesList: { id: DimensionCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Dimensions', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'identity', label: 'Identity & Metadata', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'formulation', label: 'Research Formulation', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'corpus', label: 'Data & Corpus', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'methodology', label: 'Methodology & Setup', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'results', label: 'Evaluation & Results', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'limitations', label: 'Boundaries & Horizons', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'evidence', label: 'Evidence Traceability', icon: <BookmarkCheck className="w-3.5 h-3.5" /> },
  ];

  // Export handlers
  const handleExportMarkdown = () => {
    if (!synthesisData) return;

    let md = `# Multi-Paper Comparative Synthesis\n\n`;
    if (projectTitle) md += `**Project:** ${projectTitle}\n`;
    md += `**Generated:** ${new Date().toLocaleDateString()}\n`;
    md += `**Papers Compared:** ${synthesisData.papersCompared}\n\n`;

    md += `## Compared Publications\n`;
    synthesisData.comparisons.forEach((c, idx) => {
      md += `${idx + 1}. **${c.title}** (${c.year}) - ${c.authors.join(', ')}\n`;
      if (c.journal) md += `   - Venue: ${c.journal}\n`;
      if (c.doi) md += `   - DOI: ${c.doi}\n`;
    });
    md += `\n`;

    if (synthesisData.sharedCharacteristics.length > 0) {
      md += `## Shared Empirical Characteristics\n`;
      synthesisData.sharedCharacteristics.forEach((s) => {
        md += `- **${s.dimension}:** ${s.description}\n`;
      });
      md += `\n`;
    }

    if (synthesisData.contrastingDimensions.length > 0) {
      md += `## Key Dimensional Divergences\n`;
      synthesisData.contrastingDimensions.forEach((cd) => {
        md += `### ${cd.dimension}\n${cd.description}\n\n`;
        cd.details.forEach((d) => {
          md += `- **${d.paperTitle}:** ${d.value}\n`;
        });
        md += `\n`;
      });
    }

    if (synthesisData.comparabilityNotes.length > 0) {
      md += `## Comparability Constraints & Scientific Caveats\n`;
      synthesisData.comparabilityNotes.forEach((cn) => {
        md += `- **[${cn.level.toUpperCase()}] ${cn.title}:** ${cn.note}\n`;
      });
      md += `\n`;
    }

    md += `## Dimensional Comparison Matrix\n\n`;
    const headerCols = ['Dimension', ...synthesisData.comparisons.map((c) => c.title.replace(/\|/g, '-'))];
    md += `| ${headerCols.join(' | ')} |\n`;
    md += `| ${headerCols.map(() => '---').join(' | ')} |\n`;

    dimensions.forEach((dim) => {
      const row = [dim.label];
      synthesisData.comparisons.forEach((c: any) => {
        const val = c[dim.key];
        let cellText = 'Not reported';
        if (val !== null && val !== undefined) {
          if (Array.isArray(val)) {
            cellText = val.length > 0 ? val.map((item) => (typeof item === 'object' ? item.title || item.claim : item)).join('; ') : 'Not reported';
          } else if (typeof val === 'object') {
            cellText = Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
          } else {
            cellText = String(val);
          }
        }
        row.push(cellText.replace(/\|/g, '-').replace(/\n/g, ' '));
      });
      md += `| ${row.join(' | ')} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paper_comparison_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!synthesisData) return;

    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const header = ['Dimension', ...synthesisData.comparisons.map((c) => c.title)];
    const rows = [header.map(escapeCsv).join(',')];

    dimensions.forEach((dim) => {
      const row = [dim.label];
      synthesisData.comparisons.forEach((c: any) => {
        const val = c[dim.key];
        let cellText = 'Not reported';
        if (val !== null && val !== undefined) {
          if (Array.isArray(val)) {
            cellText = val.length > 0 ? val.map((item) => (typeof item === 'object' ? item.title || item.claim : item)).join('; ') : 'Not reported';
          } else if (typeof val === 'object') {
            cellText = Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
          } else {
            cellText = String(val);
          }
        }
        row.push(cellText);
      });
      rows.push(row.map(escapeCsv).join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paper_comparison_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render cell content honestly without fabrication
  const renderCellValue = (c: PaperComparisonItem, dim: DimensionConfig) => {
    const val = (c as any)[dim.key];

    // Special renderer for DOI
    if (dim.key === 'doi') {
      if (!val) {
        return <span className="text-zinc-400 dark:text-zinc-500 italic text-[11px]">Not reported</span>;
      }
      return (
        <a
          href={val.startsWith('http') ? val : `https://doi.org/${val}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-mono text-[11px]"
        >
          <span className="truncate">{val}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }

    // Special renderer for Addressed Research Gaps
    if (dim.key === 'gapsAddressed') {
      const gaps = c.gapsAddressed;
      if (!gaps || gaps.length === 0) {
        return (
          <span className="text-zinc-400 dark:text-zinc-500 italic text-[11px]">
            No linked research gaps in workspace
          </span>
        );
      }
      return (
        <div className="space-y-1.5">
          {gaps.map((g) => (
            <div
              key={g.id}
              className="p-1.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-[11px]"
            >
              <div className="font-semibold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <span>{g.title}</span>
                {onNavigateToGaps && (
                  <button
                    onClick={onNavigateToGaps}
                    title="View in Research Gap Engine"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 ml-1"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                Category: {g.category.replace('_', ' ')} · Confidence: {g.confidence}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Special renderer for Manuscript Evidence Vault
    if (dim.key === 'evidenceSnippets') {
      const snippets = c.evidenceSnippets;
      if (!snippets || snippets.length === 0) {
        return (
          <div className="flex items-center space-x-1.5 text-zinc-400 dark:text-zinc-500 text-[11px] italic">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>No isolated evidence snippets</span>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {snippets.length} grounded finding{snippets.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={() =>
                setActiveEvidenceModal({
                  paperTitle: c.title,
                  paperId: c.paperId,
                  evidence: snippets,
                })
              }
              className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-semibold border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100 transition-colors inline-flex items-center space-x-1"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>Inspect All ({snippets.length})</span>
            </button>
          </div>
          <div className="space-y-1.5">
            {snippets.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 text-[11px]"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                  {item.claim}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center space-x-2">
                  <span>Page {item.page}</span>
                  <span>·</span>
                  <span className="truncate max-w-[140px]">{item.section}</span>
                </div>
              </div>
            ))}
            {snippets.length > 2 && (
              <button
                onClick={() =>
                  setActiveEvidenceModal({
                    paperTitle: c.title,
                    paperId: c.paperId,
                    evidence: snippets,
                  })
                }
                className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                + {snippets.length - 2} more citations...
              </button>
            )}
          </div>
        </div>
      );
    }

    // Unreported / Missing State
    if (val === null || val === undefined || (Array.isArray(val) && val.length === 0)) {
      if (!c.hasStructuredAnalysis) {
        return (
          <div className="inline-flex items-center space-x-1 text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-200/60 dark:border-amber-900/40">
            <span>Pending Analysis</span>
          </div>
        );
      }
      return (
        <span className="text-zinc-400 dark:text-zinc-500 italic text-[11px]">
          Not reported in manuscript
        </span>
      );
    }

    // List rendering
    if (dim.isList && Array.isArray(val)) {
      return (
        <ul className="list-disc list-inside space-y-1.5 text-zinc-700 dark:text-zinc-300">
          {val.map((item: any, i: number) => (
            <li key={i} className="leading-relaxed">
              {typeof item === 'object' ? item.title || item.claim || JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    // Key-Value Object rendering (e.g. quantitative results)
    if (dim.isObject && typeof val === 'object') {
      const entries = Object.entries(val);
      if (entries.length === 0) {
        return <span className="text-zinc-400 italic text-[11px]">No metrics reported</span>;
      }
      return (
        <div className="space-y-1 font-mono text-[11px] rounded-lg bg-zinc-50/60 dark:bg-zinc-900/50 p-2 border border-zinc-200/50 dark:border-zinc-800/50">
          {entries.map(([k, v], i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 last:border-0 py-0.5"
            >
              <span className="text-zinc-500 dark:text-zinc-400 text-[10px]">{k}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Default string or primitive value
    return (
      <span className="leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
        {String(val)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. WORKSPACE HEADER */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200/60 dark:border-purple-900/40">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center space-x-2">
                  <span>Paper Comparison Workspace</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
                    {selectedIds.length} of {papers.length} Selected
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Systematic empirical contrast across research methodology, datasets, findings, and manuscript evidence.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchComparison(selectedIds)}
              disabled={selectedIds.length < 2 || loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              title="Refresh comparison analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              disabled={!synthesisData || loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!synthesisData || loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* View Mode Selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Card View
              </button>
              <button
                onClick={() => setViewMode('synthesis')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'synthesis'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Synthesis
              </button>
            </div>
          </div>
        </div>

        {/* Paper Selection Strip */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5">
              <span>Publications in Workspace ({papers.length})</span>
            </span>
            <div className="flex items-center space-x-2 text-[11px]">
              <button
                onClick={handleSelectAll}
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <button
                onClick={handleResetDefault}
                className="text-zinc-600 dark:text-zinc-400 hover:underline"
              >
                Reset Default (2)
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <button
                onClick={handleClearSelection}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {papers.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleSelect(p.id);
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-2.5 focus:outline-hidden focus:ring-2 focus:ring-purple-500/50 ${
                    isSelected
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 shadow-2xs'
                      : 'border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  )}
                  <div className="truncate flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center space-x-1.5">
                      <span>{p.publicationYear}</span>
                      <span>·</span>
                      <span className="truncate max-w-[130px]">{p.journalOrConference || 'Preprint'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SCIENTIFIC PRINCIPLE & COMPARABILITY NOTICE */}
      <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-300 flex items-start space-x-3">
        <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-blue-900 dark:text-blue-200">
            Empirical Comparability Principle
          </div>
          <div className="leading-relaxed text-blue-800 dark:text-blue-300 text-[11px]">
            Comparative analysis provides evidence-grounded contrast across reported empirical conditions. Numerical scores are non-comparable unless both pipelines evaluate on identical datasets under matched baseline conditions.
          </div>
        </div>
      </div>

      {/* 3. SEARCH & DIMENSION CONTROLS */}
      {selectedIds.length >= 2 && (
        <div className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search dimensions, metrics, or methods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Diffs Only Toggle */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setDiffsOnly(!diffsOnly)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  diffsOnly
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>Show Differences Only</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                    : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. ERROR & LOADING STATES */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-400 flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedIds.length < 2 && !loading && (
        <div className="p-12 text-center bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <GitCompare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Select At Least 2 Papers to Compare
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Please choose two or more publications from your workspace to generate an evidence-grounded comparative review.
            </p>
          </div>
          <button
            onClick={handleResetDefault}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Select First 2 Papers
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 animate-spin" />
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Synthesizing multi-paper comparative matrix...
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT BASED ON VIEW MODE */}
      {synthesisData && !loading && selectedIds.length >= 2 && (
        <>
          {/* TABULAR MATRIX VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800">
                      <th
                        scope="col"
                        className="p-4 w-52 min-w-[200px] sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900/90 font-mono font-bold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider border-r border-zinc-200/60 dark:border-zinc-800/60"
                      >
                        Research Dimension
                      </th>
                      {synthesisData.comparisons.map((c) => (
                        <th
                          key={c.paperId}
                          scope="col"
                          className="p-4 min-w-[320px] max-w-[400px] align-top border-r border-zinc-100 dark:border-zinc-800/60 last:border-0"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs leading-snug">
                                {c.title}
                              </h4>
                              <button
                                onClick={() => toggleSelect(c.paperId)}
                                title="Remove paper from comparison"
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="text-[11px] text-zinc-500 font-mono">
                              {c.authors.slice(0, 2).join(', ')}
                              {c.authors.length > 2 ? ' et al.' : ''} ({c.year})
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {c.hasStructuredAnalysis ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 font-mono">
                                  Structured Extraction
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 font-mono">
                                  Pending Extraction
                                </span>
                              )}

                              {onOpenPaper && (
                                <button
                                  onClick={() => onOpenPaper(c.paperId)}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center space-x-1"
                                >
                                  <span>View Paper</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredDimensions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={synthesisData.comparisons.length + 1}
                          className="p-8 text-center text-zinc-500 italic"
                        >
                          No dimensions match the current search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDimensions.map((dim) => (
                        <tr
                          key={dim.key}
                          className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors"
                        >
                          <th
                            scope="row"
                            className="p-4 sticky left-0 z-10 bg-white dark:bg-[#0f1422] border-r border-zinc-200/60 dark:border-zinc-800/60 align-top"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                                {dim.label}
                              </div>
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                                {dim.description}
                              </div>
                            </div>
                          </th>
                          {synthesisData.comparisons.map((c) => (
                            <td
                              key={c.paperId}
                              className="p-4 align-top text-xs leading-relaxed border-r border-zinc-100 dark:border-zinc-800/60 last:border-0"
                            >
                              {renderCellValue(c, dim)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARD VIEW (Great for Mobile & Tablet or Focused Reading) */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {filteredDimensions.map((dim) => (
                <div
                  key={dim.key}
                  className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {dim.label}
                      </h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {dim.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {dim.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {synthesisData.comparisons.map((c) => (
                      <div
                        key={c.paperId}
                        className="p-3.5 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs"
                      >
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px] flex items-center justify-between">
                          <span className="truncate">{c.title}</span>
                          <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-1">
                            {c.year}
                          </span>
                        </div>
                        <div className="pt-1 text-xs">{renderCellValue(c, dim)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SYNTHESIS & DIVERGENCE VIEW */}
          {viewMode === 'synthesis' && (
            <div className="space-y-6">
              {/* Shared Characteristics */}
              <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Shared Empirical Foundations
                  </h3>
                </div>
                {synthesisData.sharedCharacteristics.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    No strict shared attributes detected across investigated dimensions.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {synthesisData.sharedCharacteristics.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1 text-xs"
                      >
                        <div className="font-semibold text-emerald-900 dark:text-emerald-300">
                          {item.dimension}
                        </div>
                        <p className="text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed text-[11px]">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contrasting Dimensions */}
              <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <SplitSquareVertical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Key Dimensional Divergences
                  </h3>
                </div>
                {synthesisData.contrastingDimensions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    No major methodological divergences detected.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {synthesisData.contrastingDimensions.map((cd, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2 text-xs"
                      >
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {cd.dimension}
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                          {cd.description}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                          {cd.details.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 text-[11px]"
                            >
                              <div className="font-medium text-zinc-500 dark:text-zinc-400 truncate text-[10px]">
                                {d.paperTitle}
                              </div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                                {d.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparability Notes */}
              <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Comparability Limitations & Warnings
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {synthesisData.comparabilityNotes.map((cn, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        cn.level === 'warning'
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                          : cn.level === 'caution'
                          ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-300'
                          : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className="font-semibold">{cn.title}: </span>
                      <span>{cn.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. EVIDENCE INSPECTOR MODAL */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Manuscript Grounded Evidence
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  {activeEvidenceModal.paperTitle}
                </p>
              </div>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {activeEvidenceModal.evidence.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.claim}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50">
                      {item.verificationStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <blockquote className="p-3 rounded-lg bg-white dark:bg-zinc-950/60 border-l-3 border-blue-500 text-zinc-700 dark:text-zinc-300 italic text-[11px] leading-relaxed">
                    &ldquo;{item.snippet}&rdquo;
                  </blockquote>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                    <span>
                      Page {item.page} · Section: {item.section}
                    </span>
                    <span className="uppercase">Type: {item.evidenceType}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                {onOpenPaper && (
                  <button
                    onClick={() => {
                      onOpenPaper(activeEvidenceModal.paperId);
                      setActiveEvidenceModal(null);
                    }}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold hover:bg-zinc-200 transition-colors inline-flex items-center space-x-1.5"
                  >
                    <span>Open in Paper Reader</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {onNavigateToEvidence && (
                  <button
                    onClick={() => {
                      onNavigateToEvidence();
                      setActiveEvidenceModal(null);
                    }}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors inline-flex items-center space-x-1.5 border border-blue-200/50"
                  >
                    <span>Evidence Vault</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
