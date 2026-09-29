'use client';

import React from 'react';
import {
  Compass,
  BookOpen,
  Search,
  Sparkles,
  GitCompare,
  Network,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Table,
  Cpu,
  BookmarkCheck,
  FileEdit,
  ClipboardList,
  Code2,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export type WorkflowStage = 'discover' | 'understand' | 'investigate' | 'build' | 'write';
export type SubView =
  | 'chat'
  | 'search'
  | 'feed'
  | 'trends'
  | 'papers'
  | 'pdf_reader'
  | 'analysis'
  | 'reproducibility'
  | 'evidence'
  | 'claim_verifier'
  | 'contradictions'
  | 'gaps'
  | 'knowledge_graph'
  | 'matrix'
  | 'comparison'
  | 'experiments'
  | 'paper_to_code'
  | 'notes'
  | 'citations'
  | 'missing_citations'
  | 'systematic_review'
  | 'human_tools';

interface SidebarItem {
  id: SubView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
  statusBadge?: string;
}

interface SidebarSection {
  stage: WorkflowStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: SidebarItem[];
}

interface SidebarProps {
  activeStage: WorkflowStage;
  activeSubView: SubView;
  onSelectSubView: (stage: WorkflowStage, subView: SubView) => void;
  stats?: {
    paperCount: number;
    evidenceCount: number;
    gapCount: number;
    experimentCount: number;
    noteCount: number;
  };
  aiAssistanceEnabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeStage,
  activeSubView,
  onSelectSubView,
  stats,
  aiAssistanceEnabled = true,
}) => {
  const sections: SidebarSection[] = [
    {
      stage: 'understand' as WorkflowStage,
      label: 'Research AI',
      icon: Sparkles,
      description: 'Persistent Project-Aware Research Partner',
      items: [
        {
          id: 'chat' as SubView,
          label: '🤖 Research AI',
          icon: Sparkles,
          highlight: true,
          statusBadge: aiAssistanceEnabled ? 'Active' : 'Muted',
        },
      ],
    },
    {
      stage: 'discover' as WorkflowStage,
      label: 'Discover',
      icon: Compass,
      description: 'Scholarly discovery & feed',
      items: [
        { id: 'search' as SubView, label: 'Academic Search', icon: Search },
        { id: 'feed' as SubView, label: 'Research Feed', icon: Compass },
        { id: 'trends' as SubView, label: 'Scholarly Trends', icon: TrendingUp },
      ],
    },
    {
      stage: 'understand' as WorkflowStage,
      label: 'Understand',
      icon: BookOpen,
      description: 'Full-text extraction & RAG',
      items: [
        { id: 'papers' as SubView, label: 'Paper Library', icon: BookOpen, badge: stats?.paperCount },
        { id: 'analysis' as SubView, label: 'Structured Analysis', icon: Sparkles },
        { id: 'reproducibility' as SubView, label: 'Reproducibility & Methods', icon: ShieldCheck },
      ],
    },
    {
      stage: 'investigate' as WorkflowStage,
      label: 'Investigate',
      icon: ShieldCheck,
      description: 'Evidence & scientific rigor',
      items: [
        { id: 'evidence' as SubView, label: 'Evidence Engine', icon: BookmarkCheck, badge: stats?.evidenceCount },
        { id: 'claim_verifier' as SubView, label: 'Claim Verifier', icon: ShieldCheck },
        { id: 'contradictions' as SubView, label: 'Contradiction Detector', icon: AlertTriangle },
        { id: 'gaps' as SubView, label: 'Research Gaps', icon: Lightbulb, badge: stats?.gapCount },
        { id: 'knowledge_graph' as SubView, label: 'Knowledge Graph', icon: Network },
      ],
    },
    {
      stage: 'build' as WorkflowStage,
      label: 'Build',
      icon: Table,
      description: 'Synthesis, matrix & code',
      items: [
        { id: 'matrix' as SubView, label: 'Literature Matrix', icon: Table },
        { id: 'comparison' as SubView, label: 'Paper Comparison', icon: GitCompare },
        { id: 'experiments' as SubView, label: 'Experiment Tracker', icon: Cpu, badge: stats?.experimentCount },
        { id: 'paper_to_code' as SubView, label: 'Paper-to-Code', icon: Code2 },
      ],
    },
    {
      stage: 'write' as WorkflowStage,
      label: 'Write',
      icon: FileEdit,
      description: 'Evidence writing & citations',
      items: [
        { id: 'notes' as SubView, label: 'Research Notes', icon: FileText, badge: stats?.noteCount },
        { id: 'citations' as SubView, label: 'Citation Intelligence', icon: BookmarkCheck },
        { id: 'missing_citations' as SubView, label: 'Missing Citations', icon: AlertTriangle },
        { id: 'systematic_review' as SubView, label: 'Systematic Review (PRISMA)', icon: ClipboardList },
        { id: 'human_tools' as SubView, label: 'Human-First Research Tools', icon: HelpCircle },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="p-3 space-y-6">
        {sections.map((sec) => (
          <div key={sec.stage} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center justify-between">
              <span>{sec.label}</span>
            </div>

            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSubView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSubView(sec.stage, item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-800'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.statusBadge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 ${
                          aiAssistanceEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${aiAssistanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                        <span>{item.statusBadge}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="mt-auto p-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Local Engine Active</span>
        </span>
        <span>v1.0-prod</span>
      </div>
    </aside>
  );
};
