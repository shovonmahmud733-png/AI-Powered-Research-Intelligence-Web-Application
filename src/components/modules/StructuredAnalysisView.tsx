'use client';

import React, { useEffect, useState } from 'react';
import { Paper, StructuredPaperAnalysis } from '@/lib/db/types';
import {
  Sparkles,
  BookOpen,
  Cpu,
  Database,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Power,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';

interface StructuredAnalysisViewProps {
  papers: Paper[];
  initialPaperId?: string;
  aiAssistanceEnabled?: boolean;
  onToggleAiAssistance?: () => void;
  onSelectPaper?: (paperId: string) => void;
  onAskThisPaper?: (paperId: string) => void;
  onBackToLibrary?: () => void;
}

type AnalysisTab = 'schema' | 'dossier' | 'inquire';

export const StructuredAnalysisView: React.FC<StructuredAnalysisViewProps> = ({
  papers,
  initialPaperId,
  aiAssistanceEnabled = true,
  onToggleAiAssistance,
  onSelectPaper,
  onAskThisPaper,
  onBackToLibrary,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(
    initialPaperId || papers[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<AnalysisTab>('schema');
  const [analysis, setAnalysis] = useState<StructuredPaperAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const selectedPaper = papers.find((p) => p.id === selectedPaperId) || papers[0];

  const handleSelectPaper = (newId: string) => {
    setSelectedPaperId(newId);
    if (onSelectPaper) {
      onSelectPaper(newId);
    }
  };

  const loadAnalysis = async (paperId: string) => {
    if (!paperId) return;
    setLoading(true);
    setExtractError(null);
    try {
      const res = await fetch(`/api/papers/${paperId}/analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (err: any) {
      setAnalysis(null);
      setExtractError(err.message || 'Failed to load analysis representation');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerExtract = async () => {
    if (!selectedPaperId) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch(`/api/papers/${selectedPaperId}/analysis`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      } else {
        const data = await res.json();
        setExtractError(data.error || 'Extraction engine failed to process chunks');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractError(err.message || 'Error executing structured analysis agent');
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (selectedPaperId) {
      loadAnalysis(selectedPaperId);
    }
  }, [selectedPaperId]);

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE PAPER WORKSPACE HEADER */}
      <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Navigation & Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-2">
            {onBackToLibrary && (
              <button
                type="button"
                onClick={onBackToLibrary}
                className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer mr-1"
                title="Return to Paper Library"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Library</span>
              </button>
            )}

            <span className="text-[10px] font-mono uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold tracking-wider">
              Single Paper Workspace
            </span>

            {/* AI Assistance State Badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border flex items-center space-x-1 ${
                aiAssistanceEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${aiAssistanceEnabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span>{aiAssistanceEnabled ? 'AI Assistance Active' : 'AI Assistance Off (Manual Review)'}</span>
            </span>
          </div>

          {/* Paper Switcher Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">Active Paper:</span>
            <select
              value={selectedPaperId}
              onChange={(e) => handleSelectPaper(e.target.value)}
              className="text-xs bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-900 dark:text-zinc-100 max-w-[240px] sm:max-w-[300px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Paper Title & Bibliographic Metadata */}
        {selectedPaper && (
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
              {selectedPaper.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              {selectedPaper.authors.join(', ')} ·{' '}
              <span className="italic">{selectedPaper.journalOrConference || 'Scholarly Publication'}</span> (
              {selectedPaper.publicationYear})
            </p>
            {selectedPaper.doi && (
              <p className="text-[11px] font-mono text-zinc-500 flex flex-wrap items-center gap-2">
                <span>
                  DOI:{' '}
                  <a
                    href={selectedPaper.url || `https://doi.org/${selectedPaper.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedPaper.doi}
                  </a>
                </span>
                {selectedPaper.citationCount > 0 && <span>· {selectedPaper.citationCount} citations</span>}
                <span>· Source: {selectedPaper.sourceProvider}</span>
              </p>
            )}
          </div>
        )}

        {/* Single Paper Isolation Banner & Workstation Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center space-x-2 text-xs text-zinc-600 dark:text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-[11px]">
              Single Paper Mode: All reasoning and RAG answers are strictly grounded in this paper.
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onAskThisPaper && selectedPaperId && (
              <button
                type="button"
                onClick={() => onAskThisPaper(selectedPaperId)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Launch Research AI Copilot in Single Paper Mode"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask Paper in Copilot</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTriggerExtract}
              disabled={extracting}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Re-run Structured Extraction Engine"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
              <span>{extracting ? 'Extracting...' : 'Re-extract Schema'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. WORKSPACE RESEARCH TABS */}
      <div className="flex items-center space-x-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'schema'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Structured Analysis Schema</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dossier')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'dossier'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bibliographic Dossier</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inquire')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'inquire'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Research Inquiries</span>
        </button>
      </div>

      {/* 3. ERROR & LOADING STATES */}
      {extractError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{extractError}</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-xs font-mono text-zinc-500 animate-pulse bg-white/40 dark:bg-[#0f1422]/30 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
          Loading structured representation from database...
        </div>
      )}

      {/* 4. TAB CONTENT: STRUCTURED SCHEMA (13 CANONICAL DIMENSIONS) */}
      {activeTab === 'schema' && !loading && !analysis && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No structured analysis generated yet for this paper
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Click &ldquo;Extract Schema&rdquo; to execute the Extraction Agent across the extracted full-text chunks.
            </p>
          </div>
          <button
            onClick={handleTriggerExtract}
            disabled={extracting}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
          >
            {extracting ? 'Processing chunks...' : 'Extract Structured Representation'}
          </button>
        </div>
      )}

      {activeTab === 'schema' && !loading && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Problem & Inquiries */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>1. Research Problem & Inquiries</span>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Core Problem
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                {analysis.researchProblem || (
                  <span className="text-zinc-400 italic">Insufficient evidence in document</span>
                )}
              </p>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Research Questions
              </div>
              {analysis.researchQuestions && analysis.researchQuestions.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                  {analysis.researchQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-zinc-400 italic mt-1 block">Not found in extracted text</span>
              )}
            </div>
          </div>

          {/* Card 2: Key Contributions */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>2. Key Contributions</span>
            </div>
            {analysis.contributions && analysis.contributions.length > 0 ? (
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                {analysis.contributions.map((c, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-zinc-400 italic">Insufficient evidence in document</span>
            )}
          </div>

          {/* Card 3: Dataset & Preprocessing */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <Database className="w-4 h-4 text-blue-500" />
              <span>3. Dataset & Preprocessing Pipeline</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Dataset Name</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {analysis.dataset || 'Not specified'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Dataset Size</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {analysis.datasetSize || 'Not specified'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1.5">
                Preprocessing Steps
              </span>
              {analysis.preprocessing && analysis.preprocessing.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.preprocessing.map((prep, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-0.5 rounded-md font-medium"
                    >
                      {prep}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic">Not found in extracted text</span>
              )}
            </div>
          </div>

          {/* Card 4: Model Architecture & Training */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span>4. Model Architecture & Hyperparameters</span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Model Backbone</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {analysis.model || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1.5">
                Training Configuration
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                {analysis.trainingSetup || 'Not found in extracted text'}
              </p>
            </div>
          </div>

          {/* Card 5: Results & Findings */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>5. Evaluation Metrics & Quantitative Findings</span>
            </div>
            {analysis.results && Object.keys(analysis.results).length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(analysis.results).map(([key, val], i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-800"
                  >
                    <span className="text-[10px] font-mono text-zinc-500 block truncate">{key}</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic">Insufficient quantitative evidence</span>
            )}
          </div>

          {/* Card 6: Limitations & Future Directions */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>6. Documented Limitations & Future Work</span>
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Explicit Limitations
              </div>
              {analysis.limitations && analysis.limitations.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                  {analysis.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-zinc-400 italic mt-1 block">Not found in extracted text</span>
              )}
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Future Directions
              </div>
              {analysis.futureWork && analysis.futureWork.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                  {analysis.futureWork.map((fw, i) => (
                    <li key={i}>{fw}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-zinc-400 italic mt-1 block">Not found in extracted text</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: BIBLIOGRAPHIC DOSSIER */}
      {activeTab === 'dossier' && selectedPaper && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider">
              Document Abstract
            </h3>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
              {selectedPaper.abstract || 'No abstract text cataloged.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Metadata Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedPaper.metadataStatus}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Retraction Status</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {selectedPaper.retractionStatus}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Citation Metrics</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {selectedPaper.citationCount} recorded citations
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: RESEARCH INQUIRIES & COPILOT PREVIEW */}
      {activeTab === 'inquire' && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-400 shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Single Paper Deep Analysis Mode
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Open the dedicated Research AI Copilot with hard retrieval isolation enabled. All answers, section citations, and evidence citations will come strictly from this selected paper.
            </p>
          </div>
          {onAskThisPaper && selectedPaperId && (
            <button
              onClick={() => onAskThisPaper(selectedPaperId)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Single Paper Research Chat</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
