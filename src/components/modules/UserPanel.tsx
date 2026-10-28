'use client';

import React, { useState, useEffect } from 'react';
import { ResearchProject, Paper, User, ResearchNote, Evidence } from '@/lib/db/types';
import { WorkflowStage, SubView } from '@/components/layout/Sidebar';
import {
  User as UserIcon,
  FolderGit2,
  BookOpen,
  Sparkles,
  BookmarkCheck,
  FileText,
  Shield,
  Layers,
  Clock,
  ArrowRight,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Moon,
  Sun,
  Key,
  X,
} from 'lucide-react';

interface UserPanelProps {
  user: User | null;
  projects: ResearchProject[];
  currentProject: ResearchProject | null;
  papers: Paper[];
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onNavigate: (stage: WorkflowStage, subView: SubView, paperId?: string) => void;
  onRefreshData: () => void;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  initialTab?: 'workspace' | 'projects' | 'library' | 'preferences';
}

export const UserPanel: React.FC<UserPanelProps> = ({
  user,
  projects,
  currentProject,
  papers,
  onSelectProject,
  onOpenNewProject,
  onNavigate,
  onRefreshData,
  onUserUpdated,
  onLogout,
  initialTab = 'workspace',
}) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'projects' | 'library' | 'preferences'>(initialTab);

  // Stats & recent items
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Edit Project Modal state
  const [editingProject, setEditingProject] = useState<ResearchProject | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editField, setEditField] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Project Deletion Confirmation
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingProjectTitle, setDeletingProjectTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile preferences form state
  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(user?.fieldOfStudy || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [prefDefaultScope, setPrefDefaultScope] = useState<'project' | 'paper'>(
    user?.preferences?.defaultScope || 'project'
  );
  const [prefCitationFormat, setPrefCitationFormat] = useState<'apa' | 'ieee' | 'bibtex' | 'harvard'>(
    user?.preferences?.citationFormat || 'apa'
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter for library tab
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

  // Load user's notes and evidence from the current project or first project
  useEffect(() => {
    if (user) {
      setName(user.name);
      setInstitution(user.institution);
      setFieldOfStudy(user.fieldOfStudy);
    }
  }, [user]);

  useEffect(() => {
    const fetchRecentItems = async () => {
      if (!currentProject?.id) return;
      setLoadingData(true);
      try {
        const [notesRes, evRes] = await Promise.allSettled([
          fetch(`/api/notes?projectId=${currentProject.id}`),
          fetch(`/api/evidence?projectId=${currentProject.id}`),
        ]);

        if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
          const data = await notesRes.value.json();
          setNotes(data.notes || []);
        }

        if (evRes.status === 'fulfilled' && evRes.value.ok) {
          const data = await evRes.value.json();
          setEvidenceList(data.evidence || []);
        }
      } catch (err) {
        console.warn('Error fetching recent items:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchRecentItems();
  }, [currentProject?.id]);

  // Handle Edit Project
  const handleOpenEditProject = (p: ResearchProject) => {
    setEditingProject(p);
    setEditTitle(p.title);
    setEditDesc(p.description || '');
    setEditField(p.researchField || '');
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          researchField: editField.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update project');
      }

      setEditingProject(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error updating project');
    } finally {
      setSavingProject(false);
    }
  };

  // Handle Archive / Unarchive Project
  const handleToggleArchiveProject = async (p: ResearchProject) => {
    const nextStatus = p.status === 'archived' ? 'active' : 'archived';
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.warn('Archive toggle failed:', err);
    }
  };

  // Handle Delete Project
  const confirmDeleteProject = (p: ResearchProject) => {
    setDeletingProjectId(p.id);
    setDeletingProjectTitle(p.title);
  };

  const executeDeleteProject = async () => {
    if (!deletingProjectId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/projects/${deletingProjectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      setDeletingProjectId(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error deleting project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Save Preferences / Profile
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus(null);

    if (newPassword && newPassword !== confirmPassword) {
      setSettingsStatus({ type: 'error', message: 'New passwords do not match' });
      setSavingSettings(false);
      return;
    }

    try {
      const payload: any = {
        name: name.trim(),
        institution: institution.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        preferences: {
          defaultScope: prefDefaultScope,
          citationFormat: prefCitationFormat,
        },
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save account settings');
      }

      onUserUpdated(data.user);
      setSettingsStatus({ type: 'success', message: 'Account settings and preferences updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSettingsStatus({ type: 'error', message: err.message || 'Failed to update preferences' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered papers for library tab
  const filteredPapers = papers.filter((paper) => {
    const matchesSearch =
      librarySearch === '' ||
      paper.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      paper.authors.some((a) => a.toLowerCase().includes(librarySearch.toLowerCase()));

    const matchesProject =
      selectedProjectFilter === 'all' || paper.projectId === selectedProjectFilter;

    return matchesSearch && matchesProject;
  });

  return (
    <div className="space-y-6">
      {/* Researcher Workspace Header */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#0c101a] p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg font-mono shadow-md ring-2 ring-blue-500/20 shrink-0">
              {user?.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'RI'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {user?.name || 'Academic Researcher'}
                </h1>
                <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60 font-semibold">
                  Lead Scholar
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                {user?.institution || 'Independent Research Institute'}
                {user?.fieldOfStudy && (
                  <span className="text-zinc-400 dark:text-zinc-500"> · {user.fieldOfStudy}</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">
                Account ID: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{user?.id || 'usr_guest'}</span> · Email: {user?.email || 'N/A'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
            <button
              onClick={onOpenNewProject}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              title="Sign out of research session"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Real Data Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Research Projects
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {projects.length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Indexed Papers
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {papers.length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Verified Evidence
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {evidenceList.length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Research Notes
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {notes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200/80 dark:border-zinc-800 text-xs font-medium space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'workspace'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Workspace Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'projects'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>My Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'library'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Accessible Papers ({papers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center space-x-2 py-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Account & Preferences</span>
        </button>
      </div>

      {/* TAB 1: WORKSPACE OVERVIEW */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* Active Project Banner */}
          {currentProject && (
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      Currently Active Project
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {currentProject.title}
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-2xl">
                    {currentProject.description || 'No description provided for this research project.'}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('overview', 'overview')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <span>Open Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Launchpad to Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate('understand', 'chat')}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Research AI Copilot
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Query manuscript evidence with strict source isolation and verifiable citations.
              </p>
            </div>

            <div
              onClick={() => onNavigate('understand', 'papers')}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Paper Library & Ingestion
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Upload PDFs, inspect extracted sections, and view structured academic analyses.
              </p>
            </div>

            <div
              onClick={() => onNavigate('investigate', 'evidence')}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Evidence Engine & Claims
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Inspect empirical claims, page-level anchors, and researcher-verified evidence cards.
              </p>
            </div>
          </div>

          {/* Recent Research Activity (Notes & Evidence) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Notes */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Recent Research Notes ({notes.length})</span>
                </h4>
                <button
                  onClick={() => onNavigate('write', 'notes')}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                >
                  <span>View All Notes</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No notes recorded yet in this project.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notes.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => onNavigate('write', 'notes')}
                      className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        <span className="truncate">{n.title}</span>
                        <span className="text-[10px] font-mono text-zinc-400 font-normal">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1">
                        {n.content || 'Empty note content'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Evidence */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verified Evidence Records ({evidenceList.length})</span>
                </h4>
                <button
                  onClick={() => onNavigate('investigate', 'evidence')}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                >
                  <span>View Evidence Hub</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {evidenceList.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No evidence cards recorded yet in this project.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {evidenceList.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onNavigate('investigate', 'evidence')}
                      className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        <span className="truncate">{ev.claim}</span>
                        <span className="text-[10px] font-mono uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                          {ev.verificationStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-1 italic mt-1">
                        &quot;{ev.snippet}&quot;
                      </p>
                      <div className="text-[10px] text-zinc-400 font-mono mt-1">
                        {ev.paperTitle} · {ev.location}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS MANAGEMENT */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Research Projects
              </h3>
              <p className="text-xs text-zinc-500">
                Manage your academic projects, edit research questions, and isolate document boundaries.
              </p>
            </div>
            <button
              onClick={onOpenNewProject}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {projects.map((p) => {
              const isCurrent = currentProject?.id === p.id;
              const isArchived = p.status === 'archived';

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-blue-500/80 bg-blue-50/10 dark:bg-blue-950/10 ring-1 ring-blue-500/20'
                      : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a]'
                  } shadow-xs`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {p.title}
                        </span>
                        {p.isDemo && (
                          <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 font-semibold">
                            Demo
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.2 rounded font-semibold">
                            Archived
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-mono uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Workspace</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {p.description || 'No detailed description.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono pt-1">
                        <span>Field: <strong className="text-zinc-600 dark:text-zinc-300">{p.researchField}</strong></span>
                        <span>·</span>
                        <span>Questions: <strong className="text-zinc-600 dark:text-zinc-300">{p.researchQuestions?.length || 0}</strong></span>
                        <span>·</span>
                        <span>Created: <strong className="text-zinc-600 dark:text-zinc-300">{new Date(p.createdAt).toLocaleDateString()}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                      {!isCurrent ? (
                        <button
                          onClick={() => {
                            onSelectProject(p.id);
                            onNavigate('overview', 'overview');
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium transition-colors cursor-pointer"
                        >
                          Open Workspace
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('overview', 'overview')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
                        >
                          Dashboard
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditProject(p)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                        title="Edit Project Metadata"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleArchiveProject(p)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                        title={isArchived ? 'Unarchive Project' : 'Archive Project'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      {!p.isDemo && (
                        <button
                          onClick={() => confirmDeleteProject(p)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors"
                          title="Delete Project and Associated Data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACCESSIBLE PAPERS */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Accessible Research Papers ({filteredPapers.length})
              </h3>
              <p className="text-xs text-zinc-500">
                Browse academic manuscripts across your authorized project workspaces.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search papers..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.substring(0, 25)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredPapers.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] text-xs text-zinc-500 space-y-3">
              <BookOpen className="w-8 h-8 text-zinc-400 mx-auto" />
              <p>No papers found matching your query or selected project.</p>
              <button
                onClick={() => onNavigate('understand', 'papers')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Upload PDF Manuscript
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {paper.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                          paper.processingStatus === 'ready'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {paper.processingStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {paper.authors.join(', ')} · <em>{paper.journalOrConference}</em> ({paper.publicationYear})
                    </div>
                    {paper.doi && (
                      <div className="text-[10px] font-mono text-zinc-400">
                        DOI: {paper.doi}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => onNavigate('understand', 'analysis', paper.id)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                    >
                      Analysis
                    </button>
                    <button
                      onClick={() => onNavigate('understand', 'chat', paper.id)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium transition-colors cursor-pointer"
                    >
                      Ask Paper
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ACCOUNT SETTINGS & PREFERENCES */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="space-y-6">
          {settingsStatus && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center space-x-2.5 ${
                settingsStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
              }`}
            >
              {settingsStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{settingsStatus.message}</span>
            </div>
          )}

          {/* Profile Card */}
          <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500">
              Researcher Identity & Affiliation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name & Scholarly Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Registered Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Academic Institution / Research Lab
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Primary Field of Study / Domain
                </label>
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Research Workspace Defaults */}
          <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500">
              Workspace & AI Assistant Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Default AI Search Scope
                </label>
                <select
                  value={prefDefaultScope}
                  onChange={(e) => setPrefDefaultScope(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="project">Project Scope (All project publications)</option>
                  <option value="paper">Single Paper Mode (Strict manuscript isolation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Preferred Citation Export Style
                </label>
                <select
                  value={prefCitationFormat}
                  onChange={(e) => setPrefCitationFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="apa">APA 7th Edition</option>
                  <option value="ieee">IEEE Standard</option>
                  <option value="bibtex">BibTeX / LaTeX</option>
                  <option value="harvard">Harvard Referencing</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#0c101a] shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-500">
              Security & Credentials (Optional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password (min. 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Changes & Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* EDIT PROJECT METADATA MODAL */}
      {editingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-[#0f1422] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Edit Research Project
              </h3>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Research Domain / Field
                </label>
                <input
                  type="text"
                  required
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Project Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-medium disabled:opacity-50"
                >
                  {savingProject ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PROJECT DIALOG */}
      {deletingProjectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#0f1422] rounded-xl border border-red-200 dark:border-red-900/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Delete Research Project?
                </h3>
                <p className="text-[11px] text-zinc-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to delete <strong>&quot;{deletingProjectTitle}&quot;</strong>? All associated indexed publications, extracted chunks, evidence records, and research notes will be permanently removed.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProjectId(null)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteProject}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
