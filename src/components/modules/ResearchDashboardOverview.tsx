'use client';

import React, { useEffect, useState } from 'react';
import { Paper, ResearchProject, User, ResearchGap, Contradiction } from '@/lib/db/types';
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
  ChevronRight,
  Activity,
  CheckCircle2,
  FolderGit2,
  AlertTriangle,
  Layers,
  Clock,
  Compass,
  FileUp,
  Target,
  HelpCircle,
  TrendingUp,
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
    questionCount?: number;
    memoryCount?: number;
    contradictionCount?: number;
  };
  user: User | null;
  aiAssistanceEnabled: boolean;
  onNavigate: (stage: WorkflowStage, subView: SubView, paperId?: string) => void;
  onOpenNewProject: () => void;
  onSelectProject: (id: string) => void;
  onOpenUpload?: () => void;
}

interface ActivityEvent {
  id: string;
  type: 'paper' | 'evidence' | 'note' | 'gap';
  title: string;
  subtitle: string;
  timestamp: string;
  linkStage: WorkflowStage;
  linkSubView: SubView;
  targetId?: string;
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
  const [activeGaps, setActiveGaps] = useState<ResearchGap[]>([]);
  const [activeContradictions, setActiveContradictions] = useState<Contradiction[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const verifiedPapersCount = papers.filter((p) => p.metadataStatus === 'verified').length;

  // Fetch real project insights (gaps and contradictions) when project changes
  useEffect(() => {
    if (!currentProject?.id) {
      setActiveGaps([]);
      setActiveContradictions([]);
      return;
    }

    let isMounted = true;
    setLoadingInsights(true);

    Promise.allSettled([
      fetch(`/api/gaps?projectId=${currentProject.id}`).then((r) => (r.ok ? r.json() : { gaps: [] })),
      fetch(`/api/contradictions?projectId=${currentProject.id}`).then((r) =>
        r.ok ? r.json() : { contradictions: [] }
      ),
    ])
      .then(([gapsRes, contraRes]) => {
        if (!isMounted) return;
        if (gapsRes.status === 'fulfilled' && gapsRes.value.gaps) {
          setActiveGaps(gapsRes.value.gaps);
        }
        if (contraRes.status === 'fulfilled' && contraRes.value.contradictions) {
          setActiveContradictions(contraRes.value.contradictions);
        }
      })
      .catch((err) => {
        console.warn('Insights load warning:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingInsights(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentProject?.id]);

  // Construct real chronological activity events strictly from authentic data
  const realActivities: ActivityEvent[] = React.useMemo(() => {
    const events: ActivityEvent[] = [];

    papers.forEach((p) => {
      events.push({
        id: `act-p-${p.id}`,
        type: 'paper',
        title: p.title,
        subtitle: p.sourceProvider === 'upload' ? 'Full-text PDF indexed' : `Cataloged from ${p.sourceProvider}`,
        timestamp: p.createdAt || p.retrievalDate || new Date().toISOString(),
        linkStage: 'understand',
        linkSubView: 'papers',
        targetId: p.id,
      });
    });

    activeGaps.forEach((g) => {
      events.push({
        id: `act-g-${g.id}`,
        type: 'gap',
        title: g.title,
        subtitle: `Research gap identified (${g.category.replace(/_/g, ' ')})`,
        timestamp: currentProject?.updatedAt || new Date().toISOString(),
        linkStage: 'investigate',
        linkSubView: 'gaps',
      });
    });

    // Sort newest first and limit to 5
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [papers, activeGaps, currentProject?.updatedAt]);

  const quickActions = [
    {
      title: 'Literature Search',
      desc: 'Query CrossRef & Semantic Scholar',
      icon: Search,
      stage: 'discover' as WorkflowStage,
      subView: 'search' as SubView,
      color: 'text-blue-500',
    },
    {
      title: 'Ingest Research PDF',
      desc: 'Extract sections & build vector index',
      icon: Upload,
      stage: 'understand' as WorkflowStage,
      subView: 'papers' as SubView,
      color: 'text-emerald-500',
    },
    {
      title: 'Research AI Copilot',
      desc: 'Multi-turn conversation with citations',
      icon: Sparkles,
      stage: 'understand' as WorkflowStage,
      subView: 'chat' as SubView,
      color: 'text-amber-500',
    },
    {
      title: 'Paper Analysis',
      desc: 'Extract methodology & benchmarks',
      icon: Layers,
      stage: 'understand' as WorkflowStage,
      subView: 'analysis' as SubView,
      color: 'text-cyan-500',
    },
    {
      title: 'Literature Matrix',
      desc: 'Tabulate datasets, metrics & results',
      icon: Table,
      stage: 'build' as WorkflowStage,
      subView: 'matrix' as SubView,
      color: 'text-purple-500',
    },
    {
      title: 'Claim Verifier',
      desc: 'Audit empirical claims vs source text',
      icon: ShieldCheck,
      stage: 'investigate' as WorkflowStage,
      subView: 'claim_verifier' as SubView,
      color: 'text-teal-500',
    },
    {
      title: 'Contradiction Detector',
      desc: 'Pinpoint conflicting findings',
      icon: AlertTriangle,
      stage: 'investigate' as WorkflowStage,
      subView: 'contradictions' as SubView,
      color: 'text-rose-500',
    },
    {
      title: 'Research Gap Engine',
      desc: 'Discover unaddressed limitations',
      icon: Lightbulb,
      stage: 'investigate' as WorkflowStage,
      subView: 'gaps' as SubView,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP TIER: EXECUTIVE PROJECT COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-[#0f1422] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 font-semibold tracking-wider">
                Research Command Center
              </span>
              {projects.length > 1 && (
                <div className="relative inline-flex items-center">
                  <FolderGit2 className="w-3 h-3 text-zinc-400 absolute left-2 pointer-events-none" />
                  <select
                    value={currentProject?.id || ''}
                    onChange={(e) => onSelectProject(e.target.value)}
                    className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md pl-6 pr-5 py-0.5 focus:outline-none cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentProject?.researchField && (
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                  Domain: {currentProject.researchField}
                </span>
              )}
              {currentProject?.isDemo && (
                <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-semibold">
                  Sample Project
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
              {currentProject?.title || 'Select or Initialize a Research Project'}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
              {currentProject?.description ||
                'Unified scholarly operating system for paper ingestion, section-grounded RAG retrieval, synthesis matrices, and academic citation tracking.'}
            </p>
          </div>

          {/* Primary Research Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('understand', 'chat')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>Launch Research AI</span>
            </button>

            <button
              onClick={() => onNavigate('discover', 'search')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-800 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search Literature</span>
            </button>

            <button
              onClick={() => onNavigate('understand', 'papers')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-800 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. REAL METRIC CARDS GRID */}
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
            {stats?.gapCount ?? activeGaps.length}
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

      {/* 3. ACTIVE RESEARCH QUESTIONS & OBJECTIVES SPOTLIGHT */}
      {currentProject && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                Active Research Agenda & Inquiry Focus
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {currentProject.researchQuestions?.length || 0} Questions Defined
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Research Questions List */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Primary Research Questions</span>
              </div>

              {currentProject.researchQuestions && currentProject.researchQuestions.length > 0 ? (
                <div className="space-y-2">
                  {currentProject.researchQuestions.slice(0, 3).map((rq) => (
                    <div
                      key={rq.id}
                      className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs flex items-start justify-between gap-3"
                    >
                      <p className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                        {rq.question}
                      </p>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-semibold shrink-0 ${
                          rq.status === 'answered'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : rq.status === 'active'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {rq.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 italic">
                  No explicit research questions formulated yet. Inquire with Research AI to synthesize preliminary questions.
                </div>
              )}
            </div>

            {/* Research Objectives & Tags */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-zinc-400" />
                <span>Investigation Objectives</span>
              </div>

              {currentProject.objectives && currentProject.objectives.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  {currentProject.objectives.slice(0, 3).map((obj, i) => (
                    <li
                      key={i}
                      className="p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 flex items-start space-x-2"
                    >
                      <span className="text-blue-500 font-mono text-[11px] font-bold mt-0.5">
                        0{i + 1}.
                      </span>
                      <span className="leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 italic">
                  No milestones specified. Track ongoing experiments or synthesis notes to document project progress.
                </div>
              )}

              {/* Tags */}
              {currentProject.tags && currentProject.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {currentProject.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. WORKSTATION QUICK ACTIONS (8 REAL TOOLS) */}
      <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Research Workstation Quick Tools
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Direct Launchers</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigate(action.stage, action.subView)}
                className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left group cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${action.color}`} />
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {action.title}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {action.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. MAIN CONTENT SPLIT: PUBLICATIONS & INTELLIGENCE ASIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Publications Catalog */}
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
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
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
                  className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Search Academic Literature
                </button>
                <button
                  onClick={() => onNavigate('understand', 'papers')}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer"
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
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
                        title="Query strictly this paper in Single Paper Deep Analysis Mode"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Ask Paper</span>
                      </button>

                      <button
                        onClick={() => onNavigate('understand', 'analysis', paper.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-md transition-colors cursor-pointer"
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
                      <span className="italic">{paper.journalOrConference || 'Publication'}</span> (
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
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium font-mono cursor-pointer"
                  >
                    + {papers.length - 5} additional papers in library
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Research Activity Timeline Section */}
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                  Recent Research Activity
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Real Project Audit</span>
            </div>

            {realActivities.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center bg-white dark:bg-[#0f1422] text-xs text-zinc-500 italic">
                No recent activity logged in this workspace yet. Add papers, extract evidence, or record synthesis notes to populate timeline.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {realActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => onNavigate(act.linkStage, act.linkSubView, act.targetId)}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {act.subtitle}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Intelligence, Gaps, Rigor Status */}
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
                  Academic Router Engine
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
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span>Open Conversational Assistant</span>
              </button>
            </div>
          </div>

          {/* Actionable Research Insights Card */}
          <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-wider">
                  Research Intelligence
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {activeGaps.length + activeContradictions.length} Signals
              </span>
            </div>

            {loadingInsights ? (
              <div className="py-6 text-center text-xs text-zinc-400 font-mono animate-pulse">
                Auditing project insights...
              </div>
            ) : activeGaps.length === 0 && activeContradictions.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No open gaps or contradictions detected for this project yet.
                </p>
                <button
                  onClick={() => onNavigate('investigate', 'gaps')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>Explore Research Gaps Engine</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeGaps.slice(0, 2).map((gap) => (
                  <div
                    key={gap.id}
                    onClick={() => onNavigate('investigate', 'gaps')}
                    className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1 cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-amber-800 dark:text-amber-400 uppercase">
                        Gap: {gap.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-amber-700/80 dark:text-amber-500">{gap.confidence}</span>
                    </div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                      {gap.title}
                    </div>
                  </div>
                ))}

                {activeContradictions.slice(0, 1).map((contra) => (
                  <div
                    key={contra.id}
                    onClick={() => onNavigate('investigate', 'contradictions')}
                    className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1 cursor-pointer hover:border-rose-300 dark:hover:border-rose-800 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold text-rose-800 dark:text-rose-400 uppercase">
                        Contradiction Detected
                      </span>
                      <span className="text-rose-700/80 dark:text-rose-500">Unresolved</span>
                    </div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                      {contra.topic}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
