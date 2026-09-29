'use client';

import React, { useEffect, useState } from 'react';
import { ResearchProject, Paper, User } from '@/lib/db/types';
import { Header } from '@/components/layout/Header';
import { Sidebar, WorkflowStage, SubView } from '@/components/layout/Sidebar';
import { NewProjectModal } from '@/components/layout/NewProjectModal';

// Workflow Modules
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

  // Workflow navigation state
  const [stage, setStage] = useState<WorkflowStage>('discover');
  const [subView, setSubView] = useState<SubView>('search');
  const [selectedAnalysisPaperId, setSelectedAnalysisPaperId] = useState<string | undefined>(undefined);
  const [selectedChatPaperId, setSelectedChatPaperId] = useState<string | undefined>(undefined);
  const [aiAssistanceEnabled, setAiAssistanceEnabled] = useState<boolean>(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

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
      const res = await fetch(`/api/papers?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data.papers || []);
      }
    } catch (e) {
      console.error('Papers fetch error:', e);
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

  const refreshData = () => {
    if (currentProject?.id) {
      fetchPapers(currentProject.id);
      fetchProjectDetails(currentProject.id);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
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
        />

        {/* Main Work Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Breadcrumb / Research Phase Banner */}
            <div className="flex items-center justify-between text-xs text-zinc-500 font-mono border-b border-zinc-200/80 dark:border-zinc-800 pb-2">
              <div className="flex items-center space-x-1.5 uppercase tracking-wider">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stage}</span>
                <span>/</span>
                <span className="text-zinc-600 dark:text-zinc-400">{subView.replace(/_/g, ' ')}</span>
              </div>

              {currentProject && (
                <div className="text-[11px] text-zinc-500 hidden sm:block">
                  Active Project: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentProject.title}</span>
                </div>
              )}
            </div>

            {/* Workflow Stage Views */}

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
