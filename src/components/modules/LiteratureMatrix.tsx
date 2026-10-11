'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { LiteratureMatrixRow } from '@/lib/db/types';
import {
  Table,
  Plus,
  Trash2,
  Download,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  BookOpen,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Copy,
  FileText,
  Layers,
  Lock,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  Sliders,
} from 'lucide-react';

export interface LiteratureMatrixProps {
  projectId: string;
  projectTitle?: string;
  papers?: any[];
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: (evidenceId?: string) => void;
}

interface AvailablePaper {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  venue?: string;
  doi?: string;
}

type DimensionCategory = 'all' | 'context' | 'methodology' | 'findings' | 'analysis' | 'custom';
type SortOption = 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc' | 'dataset' | 'model';
type ViewMode = 'grid' | 'cards';

export const LiteratureMatrix: React.FC<LiteratureMatrixProps> = ({
  projectId,
  projectTitle,
  papers,
  onOpenPaper,
  onNavigateToEvidence,
}) => {
  // Data state
  const [rows, setRows] = useState<LiteratureMatrixRow[]>([]);
  const [availablePapers, setAvailablePapers] = useState<AvailablePaper[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit row state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<LiteratureMatrixRow>>({});
  const [savingRow, setSavingRow] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DimensionCategory>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('year_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals & Drawers state
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddPaperOpen, setIsAddPaperOpen] = useState(false);
  const [activeEvidenceDrawer, setActiveEvidenceDrawer] = useState<{
    row: LiteratureMatrixRow;
    title: string;
    snippet: string;
    location: string;
  } | null>(null);
  const [activeCellModal, setActiveCellModal] = useState<{
    title: string;
    dimension: string;
    content: string;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Copy notification
  const [copiedText, setCopiedText] = useState(false);

  // Fetch Matrix Data
  const fetchMatrix = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matrix?projectId=${projectId}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      const loadedRows: LiteratureMatrixRow[] = data.rows || [];
      setRows(loadedRows);
      setAvailablePapers(data.availablePapers || []);

      // Collect custom column keys
      const cols = new Set<string>();
      loadedRows.forEach((r) => {
        if (r.customColumns) {
          Object.keys(r.customColumns).forEach((k) => cols.add(k));
        }
      });
      setCustomColumns(Array.from(cols));
    } catch (err: any) {
      console.error('Failed to load matrix:', err);
      setError(err.message || 'Failed to load literature matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [projectId]);

  // Handle Edit Lifecycle
  const handleStartEdit = (row: LiteratureMatrixRow) => {
    setEditingRowId(row.id);
    setEditingValues({
      ...row,
      customColumns: { ...(row.customColumns || {}) },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRowId) return;
    setSavingRow(true);
    try {
      const res = await fetch('/api/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingValues),
      });

      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editingRowId ? ({ ...r, ...editingValues } as LiteratureMatrixRow) : r
          )
        );
        setEditingRowId(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save changes');
      }
    } catch (err) {
      alert('Error saving matrix updates');
    } finally {
      setSavingRow(false);
    }
  };

  const handleDeleteRow = async (id: string) => {
    try {
      const res = await fetch(`/api/matrix?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      alert('Failed to delete matrix row');
    }
  };

  // Add Paper to Matrix
  const handleAddPaper = async (paper: AvailablePaper) => {
    try {
      const payload: Partial<LiteratureMatrixRow> = {
        projectId,
        paperId: paper.id,
        paperTitle: paper.title,
        year: paper.publicationYear,
        dataset: 'Pending extraction',
        model: 'Pending extraction',
        language: 'Dialectal Bengali / English',
        method: 'Pending empirical review',
        metric: 'Accuracy / F1',
        result: 'Not yet analyzed',
        limitation: 'Pending limitation extraction',
        customColumns: {},
      };

      const res = await fetch('/api/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRows((prev) => [...prev, data.row]);
        setAvailablePapers((prev) => prev.filter((p) => p.id !== paper.id));
        setIsAddPaperOpen(false);
      }
    } catch (err) {
      alert('Failed to add paper to matrix');
    }
  };

  // Add Custom Dimension Column
  const handleAddCustomColumn = () => {
    const col = newColumnName.trim();
    if (!col || customColumns.includes(col)) return;
    setCustomColumns((prev) => [...prev, col]);
    setNewColumnName('');
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Paper Title',
      'Authors',
      'Year',
      'Venue',
      'DOI',
      'Dataset',
      'Sample Size',
      'Model',
      'Language',
      'Method',
      'Metric',
      'Result',
      'Limitation',
      'Future Work',
      ...customColumns,
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const authorsStr = (r.authors || []).join('; ');
      const standard = [
        `"${r.paperTitle.replace(/"/g, '""')}"`,
        `"${authorsStr.replace(/"/g, '""')}"`,
        r.year,
        `"${(r.journalOrConference || '').replace(/"/g, '""')}"`,
        `"${(r.doi || '').replace(/"/g, '""')}"`,
        `"${(r.dataset || '').replace(/"/g, '""')}"`,
        `"${(r.sampleSize || '').replace(/"/g, '""')}"`,
        `"${(r.model || '').replace(/"/g, '""')}"`,
        `"${(r.language || '').replace(/"/g, '""')}"`,
        `"${(r.method || '').replace(/"/g, '""')}"`,
        `"${(r.metric || '').replace(/"/g, '""')}"`,
        `"${(r.result || '').replace(/"/g, '""')}"`,
        `"${(r.limitation || '').replace(/"/g, '""')}"`,
        `"${(r.futureWork || '').replace(/"/g, '""')}"`,
      ];
      const custom = customColumns.map(
        (c) => `"${(r.customColumns?.[c] || '').replace(/"/g, '""')}"`
      );
      csvLines.push([...standard, ...custom].join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `literature_matrix_${projectId}.csv`;
    link.click();
  };

  // Export Markdown Table
  const exportMarkdown = () => {
    const headers = ['Paper Title', 'Year', 'Dataset', 'Model', 'Method', 'Metric', 'Result', 'Limitation'];
    const divider = headers.map(() => '---');

    const lines = [
      `| ${headers.join(' | ')} |`,
      `| ${divider.join(' | ')} |`,
    ];

    for (const r of rows) {
      const row = [
        r.paperTitle.replace(/\|/g, '\\|'),
        r.year.toString(),
        r.dataset.replace(/\|/g, '\\|'),
        r.model.replace(/\|/g, '\\|'),
        r.method.replace(/\|/g, '\\|'),
        r.metric.replace(/\|/g, '\\|'),
        r.result.replace(/\|/g, '\\|'),
        r.limitation.replace(/\|/g, '\\|'),
      ];
      lines.push(`| ${row.join(' | ')} |`);
    }

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Filter & Sort Logic
  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        // Query search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = r.paperTitle.toLowerCase().includes(q);
          const matchesAuthors = (r.authors || []).some((a) => a.toLowerCase().includes(q));
          const matchesDataset = r.dataset?.toLowerCase().includes(q);
          const matchesModel = r.model?.toLowerCase().includes(q);
          const matchesResult = r.result?.toLowerCase().includes(q);
          const matchesLimitation = r.limitation?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesAuthors && !matchesDataset && !matchesModel && !matchesResult && !matchesLimitation) {
            return false;
          }
        }

        // Year filter
        if (selectedYear !== 'all' && r.year.toString() !== selectedYear) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all') {
          if (selectedStatus === 'completed' && r.analysisStatus !== 'completed') return false;
          if (selectedStatus === 'pending' && r.analysisStatus === 'completed') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'year_desc') return b.year - a.year;
        if (sortBy === 'year_asc') return a.year - b.year;
        if (sortBy === 'title_asc') return a.paperTitle.localeCompare(b.paperTitle);
        if (sortBy === 'title_desc') return b.paperTitle.localeCompare(a.paperTitle);
        if (sortBy === 'dataset') return a.dataset.localeCompare(b.dataset);
        if (sortBy === 'model') return a.model.localeCompare(b.model);
        return 0;
      });
  }, [rows, searchQuery, selectedYear, selectedStatus, sortBy]);

  // Unique publication years available
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
    return years;
  }, [rows]);

  // Helper for honest missing info styling
  const renderCellContent = (value: string | undefined, defaultPlaceholder: string = 'Not specified') => {
    const val = value || defaultPlaceholder;

    if (val === 'Pending extraction') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Pending Analysis</span>
        </span>
      );
    }

    if (val === 'Not specified' || val === 'Not reported') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 italic">
          <HelpCircle className="w-3 h-3 shrink-0 text-zinc-400" />
          <span>Not Reported</span>
        </span>
      );
    }

    return <span>{val}</span>;
  };

  return (
    <div className="space-y-4 max-w-full font-sans">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Table className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <span>Literature Matrix & Systematic Synthesis Grid</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  <Lock className="w-2.5 h-2.5 text-zinc-400" />
                  <span>Project Scope</span>
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Structured academic synthesis comparing {rows.length} indexed studies across methodology, datasets, models, metrics, and limitations.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Paper to Matrix */}
          {availablePapers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsAddPaperOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Paper ({availablePapers.length} available)</span>
              </button>

              {/* Add Paper Dropdown */}
              {isAddPaperOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 divide-y divide-zinc-100 dark:divide-zinc-800 space-y-2">
                  <div className="text-[11px] font-mono font-semibold uppercase text-zinc-400 pb-1">
                    Unadded Project Papers
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pt-2">
                    {availablePapers.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="truncate text-left">
                          <p className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {p.title.replace(/^\[DEMO.*?\]\s*/i, '')}
                          </p>
                          <span className="text-[10px] text-zinc-400">
                            {p.authors.join(', ')} ({p.publicationYear})
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddPaper(p)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Export full CSV matrix"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Export Markdown */}
          <button
            onClick={exportMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-colors"
            title="Copy as Markdown table"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Copied Markdown!' : 'Copy Markdown'}</span>
          </button>

          {/* View Mode Switcher (Grid vs Cards) */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Dense Grid View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Stacked Paper Cards"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchMatrix}
            disabled={loading}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition-colors disabled:opacity-50"
            title="Reload Matrix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Search, Dimension Filter, and Custom Column Ribbon */}
      <div className="bg-white dark:bg-[#0f1422] p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Side: Search & Filter Facets */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, models, datasets..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dimension Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as DimensionCategory)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Dimension Groups</option>
            <option value="context">Research Context (Objective & Language)</option>
            <option value="methodology">Methodology & Systems (Dataset, Model, Metric)</option>
            <option value="findings">Findings & Results</option>
            <option value="analysis">Critical Analysis (Limitations & Future Work)</option>
            {customColumns.length > 0 && <option value="custom">Custom Researcher Columns</option>}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr.toString()}>
                {yr}
              </option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="year_desc">Sort: Year (Newest)</option>
            <option value="year_asc">Sort: Year (Oldest)</option>
            <option value="title_asc">Sort: Paper Title (A-Z)</option>
            <option value="title_desc">Sort: Paper Title (Z-A)</option>
            <option value="dataset">Sort: Dataset Name</option>
            <option value="model">Sort: Model Name</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || selectedCategory !== 'all' || selectedYear !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedYear('all');
                setSelectedStatus('all');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Side: Add Custom Dimension */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New custom dimension..."
            className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 max-w-[150px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
          <button
            onClick={handleAddCustomColumn}
            className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            title="Add Custom Dimension Column"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Dimension</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace Table (Comparative Grid View) */}
      {viewMode === 'grid' ? (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs border-collapse relative">
              {/* Table Header: Dual Level Header */}
              <thead className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-[#0d121f]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-xs">
                {/* Level 1: Category Banners */}
                <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                  <th className="p-2.5 sticky left-0 z-40 bg-zinc-50/95 dark:bg-[#0d121f]/95 min-w-[280px] border-r border-zinc-200 dark:border-zinc-800">
                    PAPER IDENTITY & METADATA
                  </th>

                  {(selectedCategory === 'all' || selectedCategory === 'context') && (
                    <th colSpan={2} className="p-2.5 text-blue-600 dark:text-blue-400 bg-blue-500/5 text-center border-r border-zinc-200 dark:border-zinc-800">
                      RESEARCH CONTEXT
                    </th>
                  )}

                  {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                    <th colSpan={5} className="p-2.5 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-center border-r border-zinc-200 dark:border-zinc-800">
                      METHODOLOGY & SYSTEMS
                    </th>
                  )}

                  {(selectedCategory === 'all' || selectedCategory === 'findings') && (
                    <th className="p-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-center border-r border-zinc-200 dark:border-zinc-800">
                      FINDINGS & RESULTS
                    </th>
                  )}

                  {(selectedCategory === 'all' || selectedCategory === 'analysis') && (
                    <th colSpan={2} className="p-2.5 text-rose-600 dark:text-rose-400 bg-rose-500/5 text-center border-r border-zinc-200 dark:border-zinc-800">
                      CRITICAL ANALYSIS
                    </th>
                  )}

                  {(selectedCategory === 'all' || selectedCategory === 'custom') && customColumns.length > 0 && (
                    <th colSpan={customColumns.length} className="p-2.5 text-purple-600 dark:text-purple-400 bg-purple-500/5 text-center border-r border-zinc-200 dark:border-zinc-800">
                      CUSTOM RESEARCHER DIMENSIONS
                    </th>
                  )}

                  <th className="p-2.5 w-24 text-center sticky right-0 z-40 bg-zinc-50/95 dark:bg-[#0d121f]/95 border-l border-zinc-200 dark:border-zinc-800">
                    ACTIONS
                  </th>
                </tr>

                {/* Level 2: Individual Column Headers */}
                <tr className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  {/* Sticky Paper Column */}
                  <th className="p-3 sticky left-0 z-40 bg-zinc-50/95 dark:bg-[#0d121f]/95 min-w-[280px] border-r border-zinc-200 dark:border-zinc-800">
                    Manuscript / Study
                  </th>

                  {/* Context */}
                  {(selectedCategory === 'all' || selectedCategory === 'context') && (
                    <>
                      <th className="p-3 min-w-[120px]">Language / Variety</th>
                      <th className="p-3 min-w-[180px]">Objective / Problem</th>
                    </>
                  )}

                  {/* Methodology */}
                  {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                    <>
                      <th className="p-3 min-w-[150px]">Dataset</th>
                      <th className="p-3 min-w-[120px]">Sample Size</th>
                      <th className="p-3 min-w-[150px]">Model Architecture</th>
                      <th className="p-3 min-w-[150px]">Methodology</th>
                      <th className="p-3 min-w-[120px]">Metric</th>
                    </>
                  )}

                  {/* Findings */}
                  {(selectedCategory === 'all' || selectedCategory === 'findings') && (
                    <th className="p-3 min-w-[180px]">Performance / Result</th>
                  )}

                  {/* Analysis */}
                  {(selectedCategory === 'all' || selectedCategory === 'analysis') && (
                    <>
                      <th className="p-3 min-w-[180px]">Limitation</th>
                      <th className="p-3 min-w-[160px]">Future Work</th>
                    </>
                  )}

                  {/* Custom Columns */}
                  {(selectedCategory === 'all' || selectedCategory === 'custom') &&
                    customColumns.map((col) => (
                      <th key={col} className="p-3 min-w-[140px] text-purple-600 dark:text-purple-400 font-mono">
                        {col}
                      </th>
                    ))}

                  {/* Sticky Actions */}
                  <th className="p-3 w-24 text-center sticky right-0 z-40 bg-zinc-50/95 dark:bg-[#0d121f]/95 border-l border-zinc-200 dark:border-zinc-800">
                    Controls
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                {filteredRows.map((row) => {
                  const isEditing = editingRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Sticky Primary Column: Paper Identity */}
                      <td className="p-3.5 sticky left-0 z-20 bg-white group-hover:bg-zinc-50/90 dark:bg-[#0f1422] dark:group-hover:bg-[#121828] border-r border-zinc-200 dark:border-zinc-800 max-w-xs shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-zinc-950 dark:text-zinc-50 leading-snug line-clamp-2">
                              {row.paperTitle.replace(/^\[DEMO.*?\]\s*/i, '')}
                            </span>
                          </div>

                          {/* Authors & Year */}
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5 font-mono">
                            <span>{row.year}</span>
                            <span>•</span>
                            <span className="truncate max-w-[160px]">
                              {row.authors && row.authors.length > 0
                                ? row.authors.slice(0, 2).join(', ') + (row.authors.length > 2 ? ' et al.' : '')
                                : 'Peer-Reviewed'}
                            </span>
                          </div>

                          {/* Venue & DOI / Open Paper action */}
                          <div className="flex items-center gap-2 pt-1">
                            {row.paperId && onOpenPaper && (
                              <button
                                onClick={() => onOpenPaper(row.paperId)}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Open Paper</span>
                              </button>
                            )}

                            {row.doi && (
                              <a
                                href={`https://doi.org/${row.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-mono flex items-center gap-0.5"
                                title={`DOI: ${row.doi}`}
                              >
                                <span>DOI</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Language */}
                      {(selectedCategory === 'all' || selectedCategory === 'context') && (
                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.language || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, language: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            renderCellContent(row.language)
                          )}
                        </td>
                      )}

                      {/* Objective / Problem */}
                      {(selectedCategory === 'all' || selectedCategory === 'context') && (
                        <td className="p-3.5 max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.researchProblem || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, researchProblem: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            <span
                              onClick={() =>
                                setActiveCellModal({
                                  title: row.paperTitle,
                                  dimension: 'Research Objective / Problem',
                                  content: row.researchProblem || row.method || 'Not specified',
                                })
                              }
                              className="cursor-pointer line-clamp-2 hover:text-blue-500 transition-colors"
                            >
                              {renderCellContent(row.researchProblem || row.method)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Dataset */}
                      {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.dataset || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, dataset: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {renderCellContent(row.dataset)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Sample Size */}
                      {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                        <td className="p-3.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {renderCellContent(row.sampleSize, 'Not reported')}
                        </td>
                      )}

                      {/* Model Architecture */}
                      {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                        <td className="p-3.5 font-mono text-[11px]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.model || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, model: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            renderCellContent(row.model)
                          )}
                        </td>
                      )}

                      {/* Methodology */}
                      {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                        <td className="p-3.5 max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.method || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, method: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            <span
                              onClick={() =>
                                setActiveCellModal({
                                  title: row.paperTitle,
                                  dimension: 'Methodology Details',
                                  content: row.method,
                                })
                              }
                              className="cursor-pointer line-clamp-2 hover:text-blue-500 transition-colors"
                            >
                              {renderCellContent(row.method)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Metric */}
                      {(selectedCategory === 'all' || selectedCategory === 'methodology') && (
                        <td className="p-3.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.metric || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, metric: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                            />
                          ) : (
                            renderCellContent(row.metric)
                          )}
                        </td>
                      )}

                      {/* Result / Performance */}
                      {(selectedCategory === 'all' || selectedCategory === 'findings') && (
                        <td className="p-3.5 max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.result || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, result: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                            />
                          ) : (
                            <div className="space-y-1">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono text-[11px] block">
                                {renderCellContent(row.result)}
                              </span>
                              {row.evidenceSnippet && (
                                <button
                                  onClick={() =>
                                    setActiveEvidenceDrawer({
                                      row,
                                      title: 'Empirical Evidence',
                                      snippet: row.evidenceSnippet!,
                                      location: row.evidenceLocation || 'Manuscript',
                                    })
                                  }
                                  className="text-[10px] text-indigo-500 hover:text-indigo-400 flex items-center gap-1 font-mono"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>View Evidence ({row.evidenceLocation || 'Text'})</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Limitation */}
                      {(selectedCategory === 'all' || selectedCategory === 'analysis') && (
                        <td className="p-3.5 max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValues.limitation || ''}
                              onChange={(e) => setEditingValues({ ...editingValues, limitation: e.target.value })}
                              className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs text-amber-600"
                            />
                          ) : (
                            <span
                              onClick={() =>
                                setActiveCellModal({
                                  title: row.paperTitle,
                                  dimension: 'Reported Limitation',
                                  content: row.limitation,
                                })
                              }
                              className="text-amber-700 dark:text-amber-400/90 italic cursor-pointer line-clamp-2 hover:underline"
                            >
                              {renderCellContent(row.limitation)}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Future Work */}
                      {(selectedCategory === 'all' || selectedCategory === 'analysis') && (
                        <td className="p-3.5 max-w-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {renderCellContent(row.futureWork, 'Not documented')}
                        </td>
                      )}

                      {/* Custom Columns */}
                      {(selectedCategory === 'all' || selectedCategory === 'custom') &&
                        customColumns.map((col) => (
                          <td key={col} className="p-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingValues.customColumns?.[col] || ''}
                                onChange={(e) =>
                                  setEditingValues({
                                    ...editingValues,
                                    customColumns: {
                                      ...(editingValues.customColumns || {}),
                                      [col]: e.target.value,
                                    },
                                  })
                                }
                                className="w-full p-1 border rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-xs"
                              />
                            ) : (
                              <span>{row.customColumns?.[col] || '—'}</span>
                            )}
                          </td>
                        ))}

                      {/* Sticky Actions Column */}
                      <td className="p-3.5 text-center sticky right-0 z-20 bg-white group-hover:bg-zinc-50/90 dark:bg-[#0f1422] dark:group-hover:bg-[#121828] border-l border-zinc-200 dark:border-zinc-800 shadow-xs">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSaveEdit}
                              disabled={savingRow}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                              title="Save Changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : deleteConfirmId === row.id ? (
                          <div className="flex items-center justify-center gap-1 animate-in fade-in">
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                              title="Confirm Remove"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(row)}
                              className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Edit Row"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(row.id)}
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Remove from Matrix"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 4. Mobile & Tablet Stacked Paper Cards View */
        <div className="space-y-3">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              className="bg-white dark:bg-[#0f1422] p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                    {row.paperTitle.replace(/^\[DEMO.*?\]\s*/i, '')}
                  </h4>
                  <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {row.year} • {(row.authors || []).join(', ')}
                  </div>
                </div>
                {row.paperId && onOpenPaper && (
                  <button
                    onClick={() => onOpenPaper(row.paperId)}
                    className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read</span>
                  </button>
                )}
              </div>

              {/* Dimension Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Dataset</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{renderCellContent(row.dataset)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Model Architecture</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{renderCellContent(row.model)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Performance Result</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{renderCellContent(row.result)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Primary Limitation</span>
                  <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">{renderCellContent(row.limitation)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Evidence Inspector Drawer */}
      {activeEvidenceDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  Evidence Provenance
                </span>
                <button
                  onClick={() => setActiveEvidenceDrawer(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {activeEvidenceDrawer.row.paperTitle}
                </h4>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  Location: {activeEvidenceDrawer.location}
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Verbatim Manuscript Excerpt
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                  "{activeEvidenceDrawer.snippet}"
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              {onNavigateToEvidence && (
                <button
                  onClick={() => {
                    onNavigateToEvidence();
                    setActiveEvidenceDrawer(null);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Inspect in Evidence Engine</span>
                </button>
              )}
              {activeEvidenceDrawer.row.paperId && onOpenPaper && (
                <button
                  onClick={() => {
                    onOpenPaper(activeEvidenceDrawer.row.paperId);
                    setActiveEvidenceDrawer(null);
                  }}
                  className="w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium transition-colors"
                >
                  Open Manuscript in Reader
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Deep Cell Reader Modal */}
      {activeCellModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-500 font-bold block">
                  {activeCellModal.dimension}
                </span>
                <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mt-0.5 line-clamp-1">
                  {activeCellModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveCellModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
              {activeCellModal.content}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeCellModal.content);
                  setActiveCellModal(null);
                }}
                className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
