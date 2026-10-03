'use client';

import React, { useEffect, useState } from 'react';
import { ResearchProject, Paper, User } from '@/lib/db/types';
import { Header } from '@/components/layout/Header';
import { Sidebar, WorkflowStage, SubView } from '@/components/layout/Sidebar';
import { NewProjectModal } from '@/components/layout/NewProjectModal';

// Workflow Modules
import { ResearchDashboardOverview } from '@/components/modules/ResearchDashboardOverview';
import { AcademicSearch } from '@/components/modules/AcademicSearch';
import { PaperLibrary } from '@/components/modules/PaperLibrary';
import { StructuredAnalysisView } from '@/components/modules/StructuredAnalysisView';
import { LiteratureMatrix } from '@/components/modules/LiteratureMatrix';
import { PaperComparison } from '@/components/modules/PaperComparison';
import { EvidenceEngine } from '@/components/modules/EvidenceEngine';
import { ClaimVerifier } from '@/components/modules/ClaimVerifier';
import { ContradictionDetector } from '@/components/modules/ContradictionDetector';
import { ResearchGapEngine } from '@/components/modules/ResearchGapEngine';
import { KnowledgeGraph } from '@/components/modules/KnowledgeGraph';
import { CitationManager } from '@/components/modules/CitationManager';
import { MissingCitationDetector } from '@/components/modules/MissingCitationDetector';
import { MethodologyAndReproducibility } from '@/components/modules/MethodologyAndReproducibility';
import { SystematicReviewView } from '@/components/modules/SystematicReviewView';
import { ExperimentTracker } from '@/components/modules/ExperimentTracker';
import { PaperToCodeModal } from '@/components/modules/PaperToCodeModal';
import { HumanFirstTools } from '@/components/modules/HumanFirstTools';
import { ResearchMemoryView } from '@/components/modules/ResearchMemoryView';
import { ResearchFeedAndTrends } from '@/components/modules/ResearchFeedAndTrends';
import { ResearchNotesView } from '@/components/modules/ResearchNotesView';
import { ResearchChatView } from '@/components/modules/ResearchChatView';

export default function ResearchWorkspacePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ResearchProject | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  // Workflow navigation state - Defaults to Executive Command Center
  const [stage, setStage] = useState<WorkflowStage>('overview');
  const [subView, setSubView] = useState<SubView>('overview');
  const [selectedAnalysisPaperId, setSelectedAnalysisPaperId] = useState<string | undefined>(undefined);
  const [selectedChatPaperId, setSelectedChatPaperId] = useState<string | undefined>(undefined);
  const [aiAssistanceEnabled, setAiAssistanceEnabled] = useState<boolean>(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Stats
  const [projectStats, setProjectStats] = useState<any>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.warn('Auth fetch:', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const pList = data.projects || [];
        setProjects(pList);
        if (pList.length > 0 && !currentProject) {
          setCurrentProject(pList[0]);
        }
      }
    } catch (e) {
      console.error('Projects fetch error:', e);
    }
  };

  const fetchPapers = async (projectId: string) => {
    try {
      let deletedIds = new Set<string>();
      if (typeof window !== 'undefined') {
        try {
          const storedDeleted = localStorage.getItem('rp_deleted_papers');
          if (storedDeleted) {
            const list: string[] = JSON.parse(storedDeleted);
            list.forEach((id) => {
              deletedIds.add(id);
              deletedIds.add(decodeURIComponent(id));
              deletedIds.add(encodeURIComponent(id));
            });
          }
        } catch (e) {
          console.warn('Deleted papers parse error:', e);
        }
      }

      const res = await fetch(`/api/papers?projectId=${projectId}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      let apiPapers: Paper[] = [];
      if (res.ok) {
        const data = await res.json();
        apiPapers = data.papers || [];
      }

      // Merge with custom papers saved in localStorage for this project
      let localPapers: Paper[] = [];
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('rp_custom_papers');
          if (stored) {
            const parsed = JSON.parse(stored);
            localPapers = parsed.filter(
              (p: Paper) => p.projectId === projectId && !deletedIds.has(p.id) && !deletedIds.has(decodeURIComponent(p.id))
            );
          }
        } catch (e) {
          console.warn('Local paper parse error:', e);
        }
      }

      // Deduplicate by id and filter out any deleted papers
      const seen = new Set<string>();
      const combined: Paper[] = [];
      for (const p of [...apiPapers, ...localPapers]) {
        const pDecoded = decodeURIComponent(p.id);
        if (!seen.has(p.id) && !seen.has(pDecoded) && !deletedIds.has(p.id) && !deletedIds.has(pDecoded)) {
          seen.add(p.id);
          seen.add(pDecoded);
          combined.push(p);
        }
      }
      setPapers(combined);
    } catch (e) {
      console.error('Papers fetch error:', e);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    const rawId = paperId;
    const decodedId = decodeURIComponent(paperId);

    // 1. Optimistic UI update
    setPapers((prev) => prev.filter((p) => p.id !== rawId && p.id !== decodedId));
    if (selectedAnalysisPaperId === rawId || selectedAnalysisPaperId === decodedId) {
      setSelectedAnalysisPaperId('');
    }
    if (selectedChatPaperId === rawId || selectedChatPaperId === decodedId) {
      setSelectedChatPaperId('');
    }

    // 2. Local storage cleanup & persistent tombstone
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rp_custom_papers');
        if (stored) {
          const parsed = JSON.parse(stored);
          const updated = parsed.filter((p: any) => p.id !== rawId && p.id !== decodedId);
          localStorage.setItem('rp_custom_papers', JSON.stringify(updated));
        }

        const storedChunks = localStorage.getItem('rp_custom_chunks');
        if (storedChunks) {
          const parsed = JSON.parse(storedChunks);
          const updated = parsed.filter(
            (c: any) =>
              c.paperId !== rawId &&
              c.paperId !== decodedId &&
              c.paper_id !== rawId &&
              c.paper_id !== decodedId
          );
          localStorage.setItem('rp_custom_chunks', JSON.stringify(updated));
        }

        const deletedStored = localStorage.getItem('rp_deleted_papers');
        const deletedList: string[] = deletedStored ? JSON.parse(deletedStored) : [];
        if (!deletedList.includes(rawId)) deletedList.push(rawId);
        if (!deletedList.includes(decodedId)) deletedList.push(decodedId);
        localStorage.setItem('rp_deleted_papers', JSON.stringify(deletedList));
      } catch (err) {
        console.warn('Local storage delete sync error:', err);
      }
    }

    // 3. Backend API deletion (call both route patterns with cache busting)
    try {
      await Promise.allSettled([
        fetch(`/api/papers/${encodeURIComponent(rawId)}?_t=${Date.now()}`, {
          method: 'DELETE',
          cache: 'no-store',
        }),
        fetch(`/api/papers?id=${encodeURIComponent(rawId)}&_t=${Date.now()}`, {
          method: 'DELETE',
          cache: 'no-store',
        }),
      ]);
    } catch (err) {
      console.warn('API delete error:', err);
    }

    // 4. Update project details
    if (currentProject?.id) {
      fetchProjectDetails(currentProject.id);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data.project);
        setProjectStats(data.project.stats);
      }
    } catch (e) {
      console.error('Project detail fetch error:', e);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchProjects().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      fetchPapers(currentProject.id);
      fetchProjectDetails(currentProject.id);
    }
  }, [currentProject?.id]);

  const handleSelectProject = (id: string) => {
    const p = projects.find((proj) => proj.id === id);
    if (p) setCurrentProject(p);
  };

  const handleSelectPaperForAnalysis = (paperId: string) => {
    setSelectedAnalysisPaperId(paperId);
    setStage('understand');
    setSubView('analysis');
  };

  const handleNavigate = (newStage: WorkflowStage, newSubView: SubView, paperId?: string) => {
    if (paperId) {
      setSelectedAnalysisPaperId(paperId);
      setSelectedChatPaperId(paperId);
    }
    setStage(newStage);
    setSubView(newSubView);
    setIsMobileMenuOpen(false);
  };

  const refreshData = () => {
    if (currentProject?.id) {
      fetchPapers(currentProject.id);
      fetchProjectDetails(currentProject.id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090d16] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased transition-colors">
      {/* Top Header */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        user={user}
        aiAssistanceEnabled={aiAssistanceEnabled}
        onToggleAiAssistance={() => setAiAssistanceEnabled((prev) => !prev)}
        onOpenChat={() => {
          setStage('understand');
          setSubView('chat');
        }}
        onOpenSearch={() => {
          setStage('discover');
          setSubView('search');
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Sidebar */}
        <Sidebar
          activeStage={stage}
          activeSubView={subView}
          onSelectSubView={(stg, sv) => {
            setStage(stg);
            setSubView(sv);
          }}
          stats={projectStats}
          aiAssistanceEnabled={aiAssistanceEnabled}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Work Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Breadcrumb / Research Phase Header */}
            <div className="flex items-center justify-between text-xs text-zinc-500 font-mono border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5">
              <div className="flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                <span className="font-bold text-zinc-900 dark:text-zinc-200">{stage}</span>
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                  {subView.replace(/_/g, ' ')}
                </span>
              </div>

              {currentProject && (
                <div className="text-[11px] text-zinc-500 hidden sm:flex items-center space-x-2">
                  <span>Project:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
                    {currentProject.title}
                  </span>
                </div>
              )}
            </div>

            {/* Workflow Stage Views */}

            {/* OVERVIEW: Executive Research Command Center */}
            {subView === 'overview' && (
              <ResearchDashboardOverview
                currentProject={currentProject}
                projects={projects}
                papers={papers}
                stats={projectStats}
                user={user}
                aiAssistanceEnabled={aiAssistanceEnabled}
                onNavigate={handleNavigate}
                onOpenNewProject={() => setIsNewProjectModalOpen(true)}
                onSelectProject={handleSelectProject}
              />
            )}

            {/* 0. DEDICATED PERSISTENT AI COPILOT */}
            {subView === 'chat' && currentProject && (
              <ResearchChatView
                projectId={currentProject.id}
                project={currentProject}
                papers={papers}
                initialPaperId={selectedChatPaperId || selectedAnalysisPaperId}
                aiAssistanceEnabled={aiAssistanceEnabled}
                onToggleAiAssistance={() => setAiAssistanceEnabled((prev) => !prev)}
                onNavigateToNotes={() => {
                  setStage('write');
                  setSubView('notes');
                }}
                onOpenPaper={(paperId) => {
                  setSelectedAnalysisPaperId(paperId);
                  setStage('understand');
                  setSubView('analysis');
                }}
                onNavigateToEvidence={() => {
                  setStage('investigate');
                  setSubView('evidence');
                }}
              />
            )}

            {/* 1. DISCOVER */}
            {subView === 'search' && (
              <AcademicSearch
                projectId={currentProject?.id}
                onPaperAdded={refreshData}
              />
            )}
            {subView === 'feed' && (
              <ResearchFeedAndTrends
                papers={papers}
                researchField={currentProject?.researchField || 'Interdisciplinary Sciences'}
              />
            )}
            {subView === 'trends' && (
              <ResearchFeedAndTrends
                papers={papers}
                researchField={currentProject?.researchField || 'Interdisciplinary Sciences'}
              />
            )}

            {/* 2. UNDERSTAND */}
            {subView === 'papers' && currentProject && (
              <PaperLibrary
                projectId={currentProject.id}
                papers={papers}
                onRefresh={refreshData}
                onDeletePaper={handleDeletePaper}
                onSelectPaperForAnalysis={handleSelectPaperForAnalysis}
                onOpenCopilotForPaper={(pId) => {
                  setSelectedChatPaperId(pId);
                  setStage('understand');
                  setSubView('chat');
                }}
              />
            )}
            {subView === 'analysis' && (
              <StructuredAnalysisView
                papers={papers}
                initialPaperId={selectedAnalysisPaperId}
                onAskThisPaper={(pId) => {
                  setSelectedChatPaperId(pId);
                  setStage('understand');
                  setSubView('chat');
                }}
              />
            )}
            {subView === 'reproducibility' && (
              <MethodologyAndReproducibility papers={papers} />
            )}

            {/* 3. INVESTIGATE */}
            {subView === 'evidence' && currentProject && (
              <EvidenceEngine projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'claim_verifier' && currentProject && (
              <ClaimVerifier projectId={currentProject.id} />
            )}
            {subView === 'contradictions' && currentProject && (
              <ContradictionDetector projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'gaps' && currentProject && (
              <ResearchGapEngine projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'knowledge_graph' && currentProject && (
              <KnowledgeGraph projectId={currentProject.id} />
            )}

            {/* 4. BUILD */}
            {subView === 'matrix' && currentProject && (
              <LiteratureMatrix projectId={currentProject.id} />
            )}
            {subView === 'comparison' && (
              <PaperComparison papers={papers} />
            )}
            {subView === 'experiments' && currentProject && (
              <ExperimentTracker projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'paper_to_code' && (
              <PaperToCodeModal papers={papers} />
            )}

            {/* 5. WRITE */}
            {subView === 'notes' && currentProject && (
              <ResearchNotesView projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'citations' && currentProject && (
              <CitationManager projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'missing_citations' && currentProject && (
              <MissingCitationDetector projectId={currentProject.id} />
            )}
            {subView === 'systematic_review' && currentProject && (
              <SystematicReviewView projectId={currentProject.id} papers={papers} />
            )}
            {subView === 'human_tools' && (
              <HumanFirstTools papers={papers} />
            )}
          </div>
        </main>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreated={(newProj) => {
          setProjects((prev) => [newProj, ...prev]);
          setCurrentProject(newProj);
        }}
      />
    </div>
  );
}
