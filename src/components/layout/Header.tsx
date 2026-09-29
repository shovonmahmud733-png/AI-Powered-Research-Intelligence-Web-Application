'use client';

import React from 'react';
import { ResearchProject, User } from '@/lib/db/types';
import {
  FolderGit2,
  Sparkles,
  BookOpen,
  Plus,
  Shield,
  GraduationCap,
  ExternalLink,
  Power,
  MessageSquare,
} from 'lucide-react';

interface HeaderProps {
  currentProject: ResearchProject | null;
  projects: ResearchProject[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  user: User | null;
  aiAssistanceEnabled?: boolean;
  onToggleAiAssistance?: () => void;
  onOpenChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onOpenNewProjectModal,
  user,
  aiAssistanceEnabled = true,
  onToggleAiAssistance,
  onOpenChat,
}) => {
  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-bold shadow-sm">
            <span className="font-mono text-sm tracking-tight">RI</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              Research Intelligence Platform
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              Operating System for Scientific Inquiry
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800 hidden md:block" />

        {/* Project Selector */}
        <div className="hidden md:flex items-center space-x-2">
          <FolderGit2 className="w-4 h-4 text-zinc-400" />
          <select
            value={currentProject?.id || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="text-xs font-medium bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[280px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.isDemo ? '(Demo Project)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenNewProjectModal}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="Create New Research Project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {currentProject && (
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
              {currentProject.researchField}
            </span>
          </div>
        )}

        {/* Global AI Assistance Toggle */}
        {onToggleAiAssistance && (
          <button
            onClick={onToggleAiAssistance}
            title={aiAssistanceEnabled ? 'AI Assistance Active: Click to pause/disable AI Copilot' : 'AI Assistance Paused: Click to enable AI Copilot'}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              aiAssistanceEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${aiAssistanceEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
            <span className="font-semibold">AI: {aiAssistanceEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Quick Launch Copilot */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span className="hidden sm:inline">Research Copilot</span>
          </button>
        )}

        {/* User Badge */}
        <div className="flex items-center space-x-2 border-l border-zinc-200 dark:border-zinc-800 pl-3">
          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-medium text-xs">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200 leading-none">
              {user?.name || 'Academic Researcher'}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 truncate max-w-[140px]">
              {user?.institution || 'Research Institute'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
