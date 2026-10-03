'use client';

import React, { useEffect, useState } from 'react';
import { ResearchProject, User } from '@/lib/db/types';
import {
  FolderGit2,
  Sparkles,
  Plus,
  GraduationCap,
  Power,
  Moon,
  Sun,
  Menu,
  X,
  Search,
  CheckCircle2,
  ChevronDown,
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
  onOpenSearch?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
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
  onOpenSearch,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rp_theme', 'light');
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Left: Mobile trigger, Brand & Project Selector */}
      <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
        {/* Mobile menu trigger */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden transition-colors"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        {/* Brand identity */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 shadow-xs ring-1 ring-zinc-900/10 dark:ring-zinc-100/20">
            <span className="font-mono text-xs font-bold tracking-tight">RI</span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                Research Intelligence
              </h1>
              <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded border border-blue-200/60 dark:border-blue-800/60 font-semibold">
                OS
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 leading-none">
              Academic Inquiry & Evidence Platform
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />

        {/* Project Selector */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="relative flex items-center">
            <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 pointer-events-none" />
            <select
              value={currentProject?.id || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="text-xs font-medium bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[240px] lg:max-w-[320px] truncate transition-colors appearance-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.isDemo ? '(Demo)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={onOpenNewProjectModal}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
            title="Create New Research Project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Controls & User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Active Research Field Pill */}
        {currentProject && (
          <div className="hidden xl:flex items-center space-x-2 text-[11px] font-mono bg-zinc-100/70 dark:bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">
              {currentProject.researchField}
            </span>
          </div>
        )}

        {/* Global AI Assistance Toggle */}
        {onToggleAiAssistance && (
          <button
            onClick={onToggleAiAssistance}
            title={
              aiAssistanceEnabled
                ? 'AI Assistance Active: Click to pause/disable AI Copilot'
                : 'AI Assistance Paused: Click to enable AI Copilot'
            }
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
              aiAssistanceEnabled
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/70'
            }`}
          >
            <Power
              className={`w-3.5 h-3.5 ${
                aiAssistanceEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
              }`}
            />
            <span className="font-semibold text-[11px]">AI: {aiAssistanceEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Quick Launch Research AI */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium rounded-lg shadow-xs hover:shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span className="hidden sm:inline font-semibold">Research AI</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 border-l border-zinc-200 dark:border-zinc-800 pl-2.5 sm:pl-3">
          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-medium text-xs shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
              {user?.name || 'Academic Researcher'}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none mt-0.5 truncate max-w-[130px]">
              {user?.institution || 'Research Institute'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
