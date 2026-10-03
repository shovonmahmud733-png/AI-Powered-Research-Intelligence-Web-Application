'use client';

import React from 'react';
import { Paper, ResearchProject, User } from '@/lib/db/types';
import { WorkflowStage, SubView } from '@/components/layout/Sidebar';
import {
  Sparkles,
  BookOpen,
  Search,
  Upload,
  Table,
  BookmarkCheck,
  ShieldCheck,
  Lightbulb,
  Cpu,
  FileText,
  ArrowRight,
  ExternalLink,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  FolderGit2,
  Plus,
} from 'lucide-react';

interface ResearchDashboardOverviewProps {
  currentProject: ResearchProject | null;
  projects: ResearchProject[];
  papers: Paper[];
  stats?: {
    paperCount: number;
    evidenceCount: number;
    gapCount: number;
    experimentCount: number;
    noteCount: number;
  };
  user: User | null;
  aiAssistanceEnabled: boolean;
  onNavigate: (stage: WorkflowStage, subView: SubView, paperId?: string) => void;
  onOpenNewProject: () => void;
  onSelectProject: (id: string) => void;
  onOpenUpload?: () => void;
}

export const ResearchDashboardOverview: React.FC<ResearchDashboardOverviewProps> = ({
  currentProject,
  projects,
  papers,
  stats,
  user,
  aiAssistanceEnabled,
  onNavigate,
  onOpenNewProject,
  onSelectProject,
}) => {
  const verifiedPapersCount = papers.filter((p) => p.metadataStatus === 'verified').length;

  const phases: Array<{
    stage: WorkflowStage;
    subView: SubView;
    number: string;
    name: string;
    desc: string;
    count: number;
    unit: string;
  }> = [
    {
      stage: 'discover',
      subView: 'search',
      number: '01',
      name: 'Discover',
      desc: 'Explore scholarly literature & trends',
      count: papers.length,
      unit: 'papers',
    },
    {
      stage: 'understand',
      subView: 'papers',
      number: '02',
      name: 'Understand',
      desc: 'Deep PDF extraction & structured analysis',
      count: verifiedPapersCount,
      unit: 'verified',
    },
    {
      stage: 'investigate',
      subView: 'evidence',
      number: '03',
      name: 'Investigate',
      desc: 'Evidence engine, claims & contradictions',
      count: stats?.evidenceCount || 0,
      unit: 'evidence',
    },
    {
      stage: 'build',
      subView: 'matrix',
      number: '04',
      name: 'Build',
      desc: 'Literature matrix & experiment tracking',
      count: stats?.experimentCount || 0,
      unit: 'experiments',
    },
    {
      stage: 'write',
      subView: 'notes',
      number: '05',
      name: 'Synthesize',
      desc: 'Research notes & citation verification',
      count: stats?.noteCount || 0,
      unit: 'notes',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Project Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-[#0f1422] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 font-semibold tracking-wider">
                Active Research Workstation
              </span>
              {currentProject?.researchField && (
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/70 px-2 py-0.5 rounded-md">
                  Field: {currentProject.researchField}
                </span>
              )}
              {currentProject?.isDemo && (
                <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-semibold">
                  Sample Project
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
              {currentProject?.title || 'Select or Create a Research Project'}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
              {currentProject?.description ||
                'Unified research command center for full-text PDF ingestion, multi-paper synthesis, evidence-grounded reasoning, and academic citation tracking.'}
            </p>
          </div>

          {/* Quick Launch Action Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('understand', 'chat')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>Launch Research AI</span>
            </button>

            <button
              onClick={() => onNavigate('discover', 'search')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-800 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700/80 transition-all"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search Literature</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Statistics Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Papers */}
        <div
          onClick={() => onNavigate('understand', 'papers')}
          className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {papers.length}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
            Papers Cataloged
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            {verifiedPapersCount} verified metadata
          </div>
        </div>

        {/* Metric 2: Evidence */}
        <div
          onClick={() => onNavigate('investigate', 'evidence')}
          className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-2">
            <BookmarkCheck className="w-4 h-4 text-emerald-500" />
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.evidenceCount || 0}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
            Verified Evidence
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Grounded citations
          </div>
        </div>

        {/* Metric 3: Research Gaps */}
        <div
          onClick={() => onNavigate('investigate', 'gaps')}
          className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.gapCount || 0}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
            Research Gaps
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Methodological voids
          </div>
        </div>

        {/* Metric 4: Experiments */}
        <div
          onClick={() => onNavigate('build', 'experiments')}
          className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.experimentCount || 0}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
            Experiments Tracked
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Reproducibility runs
          </div>
        </div>

        {/* Metric 5: Research Notes */}
        <div
          onClick={() => onNavigate('write', 'notes')}
          className="col-span-2 sm:col-span-1 bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {stats?.noteCount || 0}
          </div>
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
            Synthesis Notes
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            Manuscript drafts
          </div>
        </div>
      </div>

      {/* 5-Phase Research Lifecycle Stepper */}
      <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Research Inquiry Lifecycle
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {papers.length > 0 ? 'Active Workflow' : 'Getting Started'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {phases.map((p, idx) => (
            <div
              key={p.number}
              onClick={() => onNavigate(p.stage, p.subView)}
              className="p-3.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">
                  {p.number}
                </span>
                <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                  {p.count} {p.unit}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>{p.name}</span>
                <ArrowRight className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-zinc-500 leading-tight">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Center Area: Project Literature Catalog & AI Copilot Quick Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Project Literature Catalog */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                Project Publications ({papers.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('understand', 'papers')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium"
            >
              <span>View Full Library</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {papers.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center bg-white dark:bg-[#0f1422] space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  No papers cataloged in this project yet
                </h3>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Start by searching academic literature or uploading a research paper PDF for deep section extraction and reasoning.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => onNavigate('discover', 'search')}
                  className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-lg"
                >
                  Search Academic Literature
                </button>
                <button
                  onClick={() => onNavigate('understand', 'papers')}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  Upload Research PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {papers.slice(0, 5).map((paper) => (
                <div
                  key={paper.id}
                  className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                        {paper.sourceProvider}
                      </span>
                      {paper.metadataStatus === 'verified' && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onNavigate('understand', 'chat', paper.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/60 transition-colors"
                        title="Query strictly this paper in Single Paper Deep Analysis Mode"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Ask Paper</span>
                      </button>

                      <button
                        onClick={() => onNavigate('understand', 'analysis', paper.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md transition-colors"
                      >
                        <Layers className="w-3 h-3 text-zinc-500" />
                        <span>Analysis</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {paper.title}
                    </h3>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {paper.authors.slice(0, 3).join(', ')}
                      {paper.authors.length > 3 ? ' et al.' : ''} ·{' '}
                      <span className="italic">{paper.journalOrConference || 'Preprint'}</span> (
                      {paper.publicationYear})
                    </div>
                  </div>

                  {paper.abstract && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {paper.abstract}
                    </p>
                  )}
                </div>
              ))}

              {papers.length > 5 && (
                <div className="text-center pt-1">
                  <button
                    onClick={() => onNavigate('understand', 'papers')}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium font-mono"
                  >
                    + {papers.length - 5} additional papers in library
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: AI Engine Health & Quick Workstation Launchers */}
        <div className="space-y-4">
          {/* AI Grounding Status Card */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-wider">
                  Grounding & Rigor
                </span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  aiAssistanceEnabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {aiAssistanceEnabled ? 'AI Active' : 'AI Paused'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-zinc-100/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Retrieval Policy</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] font-medium">
                  Page & Section Scoped
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-100/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Single Paper Mode</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                  Hard Isolated RAG
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-100/60 dark:border-zinc-800/60">
                <span className="text-zinc-500">Model Engine</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] font-medium">
                  Offline Academic Engine
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-500">Citation Mapping</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] font-medium">
                  Verified Ingest
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('understand', 'chat')}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span>Open Conversational Assistant</span>
              </button>
            </div>
          </div>

          {/* Quick Workstation Shortcuts */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Workstation Tools
            </h3>

            <div className="space-y-1.5">
              <button
                onClick={() => onNavigate('build', 'matrix')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Table className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium">Literature Matrix</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={() => onNavigate('investigate', 'claim_verifier')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Claim Verifier</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={() => onNavigate('build', 'comparison')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="font-medium">Paper Comparison</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                onClick={() => onNavigate('write', 'citations')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <BookmarkCheck className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span className="font-medium">Citation Manager (BibTeX)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
