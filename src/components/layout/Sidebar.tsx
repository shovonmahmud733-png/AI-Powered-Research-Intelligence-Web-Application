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
  LayoutDashboard,
  Activity,
  Layers,
  X,
} from 'lucide-react';

export type WorkflowStage = 'overview' | 'discover' | 'understand' | 'investigate' | 'build' | 'write';
export type SubView =
  | 'overview'
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
  description?: string;
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeStage,
  activeSubView,
  onSelectSubView,
  stats,
  aiAssistanceEnabled = true,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const sections: SidebarSection[] = [
    {
      stage: 'overview',
      label: 'Workspace',
      items: [
        {
          id: 'overview',
          label: 'Command Center',
          icon: LayoutDashboard,
        },
        {
          id: 'chat',
          label: 'Research AI Copilot',
          icon: Sparkles,
          highlight: true,
          statusBadge: aiAssistanceEnabled ? 'Active' : 'Muted',
        },
      ],
    },
    {
      stage: 'discover',
      label: 'Phase 1 · Discover',
      items: [
        { id: 'search', label: 'Academic Search', icon: Search },
        { id: 'feed', label: 'Research Feed', icon: Compass },
        { id: 'trends', label: 'Scholarly Trends', icon: TrendingUp },
      ],
    },
    {
      stage: 'understand',
      label: 'Phase 2 · Understand',
      items: [
        { id: 'papers', label: 'Paper Library', icon: BookOpen, badge: stats?.paperCount },
        { id: 'analysis', label: 'Structured Analysis', icon: Layers },
        { id: 'reproducibility', label: 'Methods & Reproducibility', icon: ShieldCheck },
      ],
    },
    {
      stage: 'investigate',
      label: 'Phase 3 · Investigate',
      items: [
        { id: 'evidence', label: 'Evidence Engine', icon: BookmarkCheck, badge: stats?.evidenceCount },
        { id: 'claim_verifier', label: 'Claim Verifier', icon: ShieldCheck },
        { id: 'contradictions', label: 'Contradiction Detector', icon: AlertTriangle },
        { id: 'gaps', label: 'Research Gaps', icon: Lightbulb, badge: stats?.gapCount },
        { id: 'knowledge_graph', label: 'Knowledge Graph', icon: Network },
      ],
    },
    {
      stage: 'build',
      label: 'Phase 4 · Build',
      items: [
        { id: 'matrix', label: 'Literature Matrix', icon: Table },
        { id: 'comparison', label: 'Paper Comparison', icon: GitCompare },
        { id: 'experiments', label: 'Experiment Tracker', icon: Cpu, badge: stats?.experimentCount },
        { id: 'paper_to_code', label: 'Paper-to-Code', icon: Code2 },
      ],
    },
    {
      stage: 'write',
      label: 'Phase 5 · Synthesize',
      items: [
        { id: 'notes', label: 'Research Notes', icon: FileText, badge: stats?.noteCount },
        { id: 'citations', label: 'Citation Manager', icon: BookmarkCheck },
        { id: 'missing_citations', label: 'Missing Citations', icon: AlertTriangle },
        { id: 'systematic_review', label: 'Systematic Review (PRISMA)', icon: ClipboardList },
        { id: 'human_tools', label: 'Human-First Tools', icon: HelpCircle },
      ],
    },
  ];

  const sidebarContent = (
    <aside className="w-64 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#0c101a] flex flex-col h-full overflow-hidden transition-colors">
      {/* Mobile Header if drawer is open */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
          Research Navigation
        </span>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {sections.map((sec) => (
          <div key={sec.label} className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase font-mono">
              {sec.label}
            </div>

            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSubView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSubView(sec.stage, item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left group ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white dark:text-zinc-950'
                            : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
                              : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.statusBadge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 ${
                            aiAssistanceEnabled
                              ? isActive
                                ? 'bg-emerald-500/20 text-emerald-300 dark:text-emerald-800'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              aiAssistanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                            }`}
                          />
                          <span>{item.statusBadge}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/40 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Local Engine Active</span>
        </div>
        <div className="text-zinc-400 dark:text-zinc-500">v1.2-prod</div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-[calc(100vh-4rem)] shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
