'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Paper, ResearchProject, ChatSession, ChatMessage, ChatSourceItem } from '@/lib/db/types';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  RotateCw,
  Copy,
  Check,
  BookmarkPlus,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Power,
  Edit3,
  RotateCcw,
  FileCheck,
  X,
  Loader2,
  Menu,
  Clock,
  Compass,
  ArrowRight,
  Database,
  Cpu,
  BarChart2,
  CornerDownLeft,
  Info,
  Filter,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchChatViewProps {
  projectId: string;
  project: ResearchProject | null;
  papers: Paper[];
  initialPaperId?: string;
  aiAssistanceEnabled: boolean;
  onToggleAiAssistance: () => void;
  onNavigateToNotes?: () => void;
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: () => void;
}

export const ResearchChatView: React.FC<ResearchChatViewProps> = ({
  projectId,
  project,
  papers,
  initialPaperId,
  aiAssistanceEnabled,
  onToggleAiAssistance,
  onNavigateToNotes,
  onOpenPaper,
  onNavigateToEvidence,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState<{ type: string; message: string } | null>(null);

  // Scope: 'project' or 'paper' — authoritative user selection
  const [scope, setScope] = useState<'project' | 'paper'>(initialPaperId ? 'paper' : 'project');
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId || papers[0]?.id || '');
  const [searchAcrossLibrary, setSearchAcrossLibrary] = useState(false);

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Paper analysis state
  const [paperAnalysisStatus, setPaperAnalysisStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle');
  const [paperAnalysisMessage, setPaperAnalysisMessage] = useState('');

  // Processing stage messages
  const [processingStage, setProcessingStage] = useState('Querying research knowledge base...');

  // Session rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');

  // Feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [savedEvidenceKey, setSavedEvidenceKey] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Track whether scope was restored from session to prevent overwrite
  const scopeRestoredRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch Sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/chat/sessions?projectId=${projectId}`);
      const data = await res.json();
      const loaded: ChatSession[] = data.sessions || [];
      setSessions(loaded);
      if (loaded.length > 0 && !activeSessionId) {
        setActiveSessionId(loaded[0].id);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // 2. Fetch Messages
  const fetchMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    setChatError(null);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Fetch messages error:', err);
      setChatError({
        type: 'Network Error',
        message: 'Unable to load message history. Please verify your connection.',
      });
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSessions();
    }
  }, [projectId]);

  // Sync from initialPaperId (e.g. when navigating from Paper Library)
  useEffect(() => {
    if (initialPaperId) {
      setScope('paper');
      setSelectedPaperId(initialPaperId);
    }
  }, [initialPaperId]);

  // Restore scope/paperId/searchAcrossLibrary from session when switching threads
  useEffect(() => {
    if (activeSessionId) {
      const sess = sessions.find((s) => s.id === activeSessionId);
      if (sess) {
        setScope(sess.scope || 'project');
        if (sess.paperId) setSelectedPaperId(sess.paperId);
        setSearchAcrossLibrary(sess.searchAcrossLibrary ?? false);
        scopeRestoredRef.current = true;
      }
      fetchMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // Deep Paper Analysis Trigger — runs when user selects a paper in Single Paper mode
  const triggerPaperAnalysis = useCallback(
    async (paperId: string) => {
      if (!paperId || scope !== 'paper') return;

      setPaperAnalysisStatus('analyzing');
      setPaperAnalysisMessage('Checking document index status...');

      try {
        const paper = papers.find((p) => p.id === paperId);
        if (!paper) {
          setPaperAnalysisStatus('ready');
          setPaperAnalysisMessage('');
          return;
        }

        if (paper.processingStatus === 'ready') {
          setPaperAnalysisMessage('Paper knowledge context loaded.');
          await new Promise((r) => setTimeout(r, 300));
          setPaperAnalysisStatus('ready');
          setPaperAnalysisMessage('');
          return;
        }

        const stages = [
          'Extracting section hierarchy...',
          'Building tokenized chunks...',
          'Indexing empirical evidence...',
          'Retrieval context prepared.',
        ];

        for (const stage of stages) {
          setPaperAnalysisMessage(stage);
          await new Promise((r) => setTimeout(r, 250));
        }

        setPaperAnalysisStatus('ready');
        setPaperAnalysisMessage('');
      } catch (err) {
        console.error('Paper analysis error:', err);
        setPaperAnalysisStatus('ready');
        setPaperAnalysisMessage('');
      }
    },
    [scope, papers]
  );

  // Trigger analysis when paper selection changes in Single Paper mode
  useEffect(() => {
    if (scope === 'paper' && selectedPaperId) {
      triggerPaperAnalysis(selectedPaperId);
    } else {
      setPaperAnalysisStatus('idle');
      setPaperAnalysisMessage('');
    }
  }, [scope, selectedPaperId, triggerPaperAnalysis]);

  // Dynamic processing message stages during inquiry submission
  useEffect(() => {
    if (!sending) return;
    const stages =
      scope === 'paper'
        ? [
            'Retrieving verified chunks from active paper...',
            'Validating page references and section bounds...',
            'Synthesizing evidence-grounded scientific response...',
          ]
        : [
            'Scanning project literature corpus...',
            'Ranking cross-paper evidence by relevance...',
            'Synthesizing cross-paper insights with page citations...',
          ];

    let currentStage = 0;
    setProcessingStage(stages[0]);
    const interval = setInterval(() => {
      currentStage = (currentStage + 1) % stages.length;
      setProcessingStage(stages[currentStage]);
    }, 1200);

    return () => clearInterval(interval);
  }, [sending, scope]);

  // Persist scope changes to the active session
  const persistSessionState = useCallback(
    async (updates: Record<string, any>) => {
      if (!activeSessionId) return;
      try {
        await fetch('/api/chat/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId, ...updates }),
        });
      } catch (err) {
        console.warn('Failed to persist session state:', err);
      }
    },
    [activeSessionId]
  );

  const handleScopeChange = (newScope: 'project' | 'paper') => {
    setScope(newScope);
    persistSessionState({ scope: newScope });
  };

  const handlePaperChange = (newPaperId: string) => {
    setSelectedPaperId(newPaperId);
    const paper = papers.find((p) => p.id === newPaperId);
    persistSessionState({
      paperId: newPaperId,
      paperTitle: paper?.title,
    });
  };

  const handleSearchAcrossLibraryChange = (checked: boolean) => {
    setSearchAcrossLibrary(checked);
    persistSessionState({ searchAcrossLibrary: checked });
  };

  // 3. Create New Session
  const handleNewSession = async () => {
    try {
      const targetPaper = scope === 'paper' ? papers.find((p) => p.id === selectedPaperId) : undefined;
      const title =
        scope === 'paper' && targetPaper
          ? `Analysis: ${targetPaper.title.substring(0, 32)}...`
          : 'New Research Inquiry';

      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          scope,
          paperId: scope === 'paper' ? selectedPaperId : undefined,
          paperTitle: targetPaper?.title,
          searchAcrossLibrary,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSessions((prev) => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setMessages([]);
        setChatError(null);
        setIsMobileSidebarOpen(false);
      }
    } catch (err) {
      alert('Failed to initialize new conversation');
    }
  };

  // 4. Delete Session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation thread?')) return;

    try {
      const res = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          setActiveSessionId(remaining[0]?.id || null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  // 4b. Rename Session
  const handleRenameSession = async (sessionId: string) => {
    if (!renameText.trim()) {
      setIsRenaming(false);
      return;
    }

    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: renameText.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: renameText.trim() } : s))
        );
      }
    } catch (err) {
      console.error('Rename error:', err);
    } finally {
      setIsRenaming(false);
      setRenameText('');
    }
  };

  // 4c. Clear Conversation
  const handleClearConversation = async () => {
    if (!activeSessionId) return;
    if (!confirm('Are you sure you want to clear all messages in this conversation thread?')) return;

    try {
      const res = await fetch(`/api/chat/messages?sessionId=${activeSessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages([]);
        setChatError(null);
      }
    } catch (err) {
      console.error('Clear conversation error:', err);
    }
  };

  // 4d. Save to Evidence Engine
  const handleSaveAsEvidence = async (src: ChatSourceItem, contextClaim?: string) => {
    try {
      const paper = papers.find((p) => p.id === src.paperId) || papers[0];
      const claimText = contextClaim || src.snippet || 'Empirical research observation';

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          paperId: src.paperId || paper?.id,
          paperTitle: src.paperTitle || paper?.title || 'Academic Paper',
          page: src.page || 1,
          section: src.section || 'Extracted Section',
          claim: claimText.substring(0, 200),
          snippet: src.snippet || claimText,
          verificationStatus: 'verified',
        }),
      });

      if (res.ok) {
        const key = `${src.paperId}-${src.page}-${src.section}`;
        setSavedEvidenceKey(key);
        setTimeout(() => setSavedEvidenceKey(null), 3000);
      }
    } catch (err) {
      alert('Failed to save to Evidence Engine');
    }
  };

  // 5. Send Message — CRITICAL: scope is authoritative
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || sending) return;

    let currSessionId = activeSessionId;
    if (!currSessionId) {
      await handleNewSession();
      return;
    }

    setSending(true);
    setChatError(null);
    setInputPrompt('');

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currSessionId,
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const effectiveScope = scope;

      let clientChunks: any[] = [];
      if (typeof window !== 'undefined') {
        try {
          const storedChunks = localStorage.getItem('rp_custom_chunks');
          if (storedChunks) {
            const parsed = JSON.parse(storedChunks);
            if (Array.isArray(parsed)) {
              if (effectiveScope === 'paper' && selectedPaperId) {
                clientChunks = parsed.filter(
                  (c: any) => c.paperId === selectedPaperId || c.paper_id === selectedPaperId
                );
              } else {
                const relevantPaperIds = new Set(papers.map((p) => p.id));
                clientChunks = parsed.filter(
                  (c: any) =>
                    relevantPaperIds.has(c.paperId) ||
                    (c.paper_id && relevantPaperIds.has(c.paper_id))
                );
              }
            }
          }
        } catch (storageErr) {
          console.warn('Storage read warning:', storageErr);
        }
      }

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currSessionId,
          projectId,
          content: prompt,
          scope: effectiveScope,
          paperId: effectiveScope === 'paper' ? selectedPaperId : undefined,
          searchAcrossLibrary,
          clientPapers: papers,
          clientChunks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const asst = data.assistantMessage;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempUserMsg.id ? data.userMessage : m))
        );

        const sessRes = await fetch(`/api/chat/sessions?projectId=${projectId}`);
        const sessData = await sessRes.json();
        setSessions(sessData.sessions || []);

        // Stream typing animation
        const fullContent = asst.content;
        let charIndex = 0;
        const tempAsst: ChatMessage = { ...asst, content: '' };
        setMessages((prev) => [...prev, tempAsst]);

        const step = Math.max(4, Math.floor(fullContent.length / 30));
        const timer = setInterval(() => {
          charIndex += step;
          if (charIndex >= fullContent.length) {
            clearInterval(timer);
            setMessages((prev) =>
              prev.map((m) => (m.id === asst.id ? asst : m))
            );
            setTimeout(scrollToBottom, 50);
          } else {
            const partial = fullContent.substring(0, charIndex);
            setMessages((prev) =>
              prev.map((m) => (m.id === asst.id ? { ...m, content: partial } : m))
            );
          }
        }, 15);
      } else {
        setChatError({
          type: 'Request Failed',
          message: data.error || 'Failed to generate response. Please retry.',
        });
      }
    } catch (err: any) {
      setChatError({
        type: 'Network Error',
        message: 'Could not connect to the Research AI engine. Please verify your connection.',
      });
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // 6. Regenerate Response
  const handleRegenerate = async () => {
    if (!activeSessionId || sending) return;
    setSending(true);
    setChatError(null);

    try {
      const res = await fetch('/api/chat/messages/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          projectId,
          scope,
          paperId: scope === 'paper' ? selectedPaperId : undefined,
          searchAcrossLibrary,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.assistantMessage]);
      } else {
        setChatError({
          type: 'Regeneration Error',
          message: data.error || 'Failed to regenerate answer',
        });
      }
    } catch (err: any) {
      setChatError({
        type: 'Network Error',
        message: 'Error communicating with Research AI engine.',
      });
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // 7. Save to Research Notes
  const handleSaveToNotes = async (msg: ChatMessage) => {
    try {
      const title = `Synthesis: ${msg.content.substring(0, 36).replace(/[^a-zA-Z0-9\s]/g, '')}...`;
      const noteContent = `## Copilot Synthesis\n\n${msg.content}\n\n### Grounded Source Citations\n${(msg.sources || []).map((s) => `- ${s.paperTitle} (Page ${s.page}, Section: ${s.section})`).join('\n')}`;

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          content: noteContent,
          tags: ['AI-Copilot', 'Literature-Synthesis'],
          linkedPaperId: msg.sources?.[0]?.paperId,
        }),
      });

      if (res.ok) {
        setSavedNoteId(msg.id);
        setTimeout(() => setSavedNoteId(null), 3000);
      }
    } catch (err) {
      alert('Failed to save to notes');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Context-aware Suggestion Prompts for Empty State
  const emptyStatePromptGroups = useMemo(() => {
    if (scope === 'paper') {
      return [
        {
          category: 'Problem & Methodology',
          icon: <Cpu className="w-3.5 h-3.5 text-blue-500" />,
          prompts: [
            'What is the primary research problem addressed?',
            'What methodology and model architecture were proposed?',
            'What preprocessing techniques were applied to the data?',
          ],
        },
        {
          category: 'Empirical Evidence & Results',
          icon: <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />,
          prompts: [
            'What dataset did the authors construct or evaluate?',
            'What were the quantitative findings and baseline comparisons?',
            'What evidence supports the authors’ main conclusions?',
          ],
        },
        {
          category: 'Critical Evaluation & Gaps',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
          prompts: [
            'What are the explicit limitations documented by the authors?',
            'What future work directions did the authors outline?',
          ],
        },
      ];
    }

    return [
      {
        category: 'Corpus-Level Synthesis',
        icon: <Layers className="w-3.5 h-3.5 text-purple-500" />,
        prompts: [
          'What are the recurring limitations across the papers in this project?',
          'Compare the core methodologies proposed across these publications.',
          'What datasets are benchmarked across this literature?',
        ],
      },
      {
        category: 'Contradiction & Evidence Grounding',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
        prompts: [
          'Where do these papers disagree or report conflicting outcomes?',
          'Find empirical evidence supporting or challenging main claims.',
          'Verify my understanding of the state-of-the-art baselines.',
        ],
      },
      {
        category: 'Research Questions & Gaps',
        icon: <Compass className="w-3.5 h-3.5 text-blue-500" />,
        prompts: [
          'Suggest unanswered research questions for my project based on these papers.',
          'Help me structure the literature review section for my paper.',
        ],
      },
    ];
  }, [scope]);

  // Contextual Follow-up Chips for after the latest response
  const followUpChips = useMemo(() => {
    if (scope === 'paper') {
      return [
        'What are the documented limitations?',
        'Explain the evaluation metrics in detail',
        'What dataset size and distribution were used?',
        'What future work is suggested?',
      ];
    }
    return [
      'Compare methodologies across these papers',
      'Where do these findings disagree?',
      'Identify research gaps in this corpus',
      'What are the common limitations?',
    ];
  }, [scope]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  // Helper to check if a message represents an Insufficient Evidence response
  const isInsufficientEvidenceMessage = (msg: ChatMessage) => {
    if (msg.role !== 'assistant') return false;
    const lower = msg.content.toLowerCase();
    return (
      lower.includes('insufficient evidence') ||
      lower.includes('no verified documentation') ||
      (msg.sources && msg.sources.length === 0 && lower.includes('insufficient'))
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. PROFESSIONAL RESEARCH COMMAND CENTER HEADER */}
      <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Research AI Command Center
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border flex items-center space-x-1 ${
                    aiAssistanceEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      aiAssistanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                    }`}
                  />
                  <span>{aiAssistanceEnabled ? 'Grounded Retrieval Active' : 'AI Paused (Manual Mode)'}</span>
                </span>
                {project?.researchField && (
                  <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                    {project.researchField}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                Evidence-grounded scholarly reasoning engine with strict document boundary isolation and verified page/section citations.
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={onToggleAiAssistance}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                aiAssistanceEnabled
                  ? 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/80'
                  : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 font-semibold shadow-xs'
              }`}
              title="Toggle AI assistance across the workstation"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{aiAssistanceEnabled ? 'Disable AI' : 'Enable AI'}</span>
            </button>

            {/* Mobile thread drawer toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Threads</span>
            </button>
          </div>
        </div>

        {/* 2. GROUNDING CONTEXT STRIP — "What is the AI currently allowed to use?" */}
        <div className="bg-zinc-50/90 dark:bg-zinc-900/60 rounded-xl p-3 border border-zinc-200/70 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Permitted Grounding:</span>
            </span>

            {/* Active Grounding Mode Pill */}
            {scope === 'paper' ? (
              <span className="inline-flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 px-2.5 py-0.5 rounded-lg font-semibold text-[11px]">
                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Single Paper Mode</span>
                <span className="text-zinc-400 font-normal">·</span>
                <strong className="truncate max-w-[220px] sm:max-w-[320px]">
                  {selectedPaper?.title || 'Selected Document'}
                </strong>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70 px-2.5 py-0.5 rounded-lg font-semibold text-[11px]">
                <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Project Corpus Scope</span>
                <span className="text-zinc-400 font-normal">·</span>
                <span>{papers.length} publications indexed</span>
              </span>
            )}

            {/* Library-wide cross search pill */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                searchAcrossLibrary
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 border-zinc-200 dark:border-zinc-700/60'
              }`}
            >
              {searchAcrossLibrary
                ? 'Library Cross-Search: ACTIVE (Extended)'
                : 'Library Cross-Search: OFF (Project Boundary)'}
            </span>
          </div>

          {/* Quick Scope Switcher & Paper Selector */}
          <div className="flex items-center space-x-2">
            <select
              value={scope}
              onChange={(e) => handleScopeChange(e.target.value as 'project' | 'paper')}
              className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="project">📚 All Project Papers</option>
              <option value="paper">📄 Single Paper Mode</option>
            </select>

            {scope === 'paper' && papers.length > 0 && (
              <select
                value={selectedPaperId}
                onChange={(e) => handlePaperChange(e.target.value)}
                className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-900 dark:text-zinc-100 font-medium max-w-[200px] truncate focus:outline-none cursor-pointer shadow-2xs"
                title="Change active paper context"
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 3. AI OFF MODE (MANUAL RESEARCH STATE) */}
      {!aiAssistanceEnabled ? (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
              Distraction-Free Manual Review
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Manual Research Mode Active (AI Assistance Muted)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Automated AI synthesis is paused so you can focus on manual document analysis, note-taking, and matrix curation without computational interruptions.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              onClick={onToggleAiAssistance}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
              <span>Resume AI Assistance</span>
            </button>
            {onNavigateToNotes && (
              <button
                onClick={onNavigateToNotes}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-zinc-500" />
                <span>Go to Research Notes</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 4. MAIN CHAT WORKSTATION GRID */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-14rem)] min-h-[660px] max-h-[880px] relative">
          {/* LEFT: THREADS / SESSIONS SIDEBAR */}
          <div
            className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-[#0f1422] border-r border-zinc-200 dark:border-zinc-800 p-4 transform transition-transform duration-200 ease-in-out lg:static lg:transform-none lg:w-auto lg:border-r-0 lg:border lg:rounded-2xl lg:p-3.5 flex flex-col h-full shadow-xs ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Clock className="w-3 h-3" />
                <span>Research Threads ({sessions.length})</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleNewSession}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                  title="Start New Research Thread"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-1 py-2 text-xs">
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2 flex-1">
                      <div className="truncate text-xs">{s.title || 'Untitled Inquiry'}</div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 flex items-center space-x-1.5 ${
                          isActive ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                        }`}
                      >
                        <span>{s.scope === 'paper' ? '📄 Single Paper' : '📚 Project Scope'}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded-md hover:text-red-500 transition-all cursor-pointer ${
                        isActive ? 'text-zinc-400 hover:text-red-400' : 'text-zinc-400'
                      }`}
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer Info */}
            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-500 font-mono space-y-1">
              <div className="text-zinc-400 uppercase tracking-wider text-[9px] font-semibold">
                Corpus Footprint:
              </div>
              <div className="truncate text-zinc-700 dark:text-zinc-300">
                {scope === 'paper' && selectedPaper ? (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold truncate block">
                    1 Paper ({selectedPaper.title.substring(0, 22)}...)
                  </span>
                ) : (
                  <span>{papers.length} Project Papers · Section Chunks</span>
                )}
              </div>
            </div>
          </div>

          {/* Backdrop for mobile sidebar */}
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-2xs"
            />
          )}

          {/* RIGHT: MAIN CONVERSATION & EVIDENCE ARENA */}
          <div className="lg:col-span-3 bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl flex flex-col h-full overflow-hidden shadow-xs">
            {/* Conversation Header */}
            <div className="p-3 sm:p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2.5 truncate max-w-[65%]">
                {isRenaming ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (activeSessionId) handleRenameSession(activeSessionId);
                    }}
                    className="flex items-center space-x-1.5"
                  >
                    <input
                      type="text"
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-[10px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2.5 py-1 rounded-md font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(false)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 px-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {activeSession?.title || 'Active Research Thread'}
                    </span>
                    {activeSession && (
                      <button
                        onClick={() => {
                          setRenameText(activeSession.title);
                          setIsRenaming(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                        title="Rename Thread"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Thread Action Controls */}
              <div className="flex items-center space-x-2 text-xs">
                {/* Search across library toggle */}
                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400 font-mono select-none">
                  <input
                    type="checkbox"
                    checked={searchAcrossLibrary}
                    onChange={(e) => handleSearchAcrossLibraryChange(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Search Across Library</span>
                </label>

                <button
                  onClick={handleClearConversation}
                  disabled={messages.length === 0}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  title="Clear messages in thread"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>

                <button
                  onClick={handleRegenerate}
                  disabled={sending || messages.length === 0}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  title="Regenerate last response"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              </div>
            </div>

            {/* Persistent Single Paper Status Banner */}
            {scope === 'paper' && selectedPaper && (
              <div className="px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300 font-semibold truncate max-w-[80%]">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[11px] uppercase font-mono tracking-wider font-bold">
                    Grounded Document:
                  </span>
                  <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium">
                    {selectedPaper.title}
                  </span>
                  {selectedPaper.doi && (
                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                      ({selectedPaper.doi})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {onOpenPaper && (
                    <button
                      type="button"
                      onClick={() => onOpenPaper(selectedPaper.id)}
                      className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Inspect Schema</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Notification Bar */}
            {chatError && (
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs text-red-800 dark:text-red-300">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="font-semibold">{chatError.type}:</span>
                  <span>{chatError.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatError(null)}
                  className="p-1 hover:text-red-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* MESSAGES CONVERSATION SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* EMPTY STATE */}
              {messages.length === 0 && !loadingMessages && (
                <div className="py-8 sm:py-10 space-y-6 max-w-2xl mx-auto">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-2xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {scope === 'paper'
                        ? `Single Paper Deep Analysis: ${selectedPaper?.title ? `"${selectedPaper.title.substring(0, 35)}..."` : 'Selected Document'}`
                        : 'Project Literature Reasoning & Evidence Synthesis'}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      {scope === 'paper'
                        ? 'All inquiries in this thread are strictly isolated and grounded in the selected document. Ask targeted questions about methodology, dataset size, preprocessing, or empirical findings.'
                        : 'Submit scholarly queries across your current research project. Answers are verified against indexed document chunks and return transparent page and section citations.'}
                    </p>
                  </div>

                  {/* Suggestion Prompt Category Cards */}
                  <div className="space-y-3 pt-2">
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-center">
                      Recommended Research Inquiries
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {emptyStatePromptGroups.map((group, gIdx) => (
                        <div
                          key={gIdx}
                          className="bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 space-y-2"
                        >
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {group.icon}
                            <span>{group.category}</span>
                          </div>
                          <div className="space-y-1.5">
                            {group.prompts.map((pText, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handleSendMessage(pText)}
                                className="w-full text-left text-[11px] bg-white dark:bg-zinc-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-zinc-200/70 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-300 p-2 rounded-lg transition-all font-medium leading-snug cursor-pointer shadow-2xs group flex items-start justify-between"
                              >
                                <span>{pText}</span>
                                <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-blue-500 shrink-0 ml-1 mt-0.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CONVERSATION FLOW */}
              {messages.map((msg, msgIndex) => {
                const isUser = msg.role === 'user';
                const hasSources = Boolean(msg.sources && msg.sources.length > 0);
                const isExpanded = expandedSources[msg.id];
                const isInsufficient = isInsufficientEvidenceMessage(msg);
                const isLastAssistantMessage =
                  !isUser && msgIndex === messages.length - 1 && !sending;

                return (
                  <div
                    key={msg.id}
                    className={`space-y-2 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}
                  >
                    <div
                      className={`rounded-2xl text-xs leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                        isUser
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 p-4 sm:p-5 font-medium shadow-2xs'
                          : 'bg-white dark:bg-[#0c101a] border border-zinc-200/90 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 p-5 sm:p-6 space-y-4 shadow-xs w-full'
                      }`}
                    >
                      {/* ASSISTANT HEADER: Grounding & Verification Status */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                              Research AI Synthesis
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {msg.modelUsed ? `(${msg.modelUsed})` : '(Isolated Engine)'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {hasSources ? (
                              <span className="text-[10px] font-mono uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>{msg.sources?.length} Verified Citation{msg.sources?.length === 1 ? '' : 's'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>Insufficient Grounding</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* INSUFFICIENT EVIDENCE CALLOUT */}
                      {!isUser && isInsufficient && (
                        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-300">
                          <div className="flex items-center space-x-2 font-bold font-mono text-[11px] uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Insufficient Grounded Evidence in Scope</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400">
                            The available document chunks do not contain verified textual citations to answer this question. Try refining your inquiry with terminology from the paper, or broaden retrieval scope.
                          </p>
                        </div>
                      )}

                      {/* MESSAGE BODY (CUSTOM MARKDOWN STYLING FOR ACADEMIC PROSE) */}
                      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed space-y-2">
                        <ReactMarkdown
                          components={{
                            h1: ({ ...props }) => (
                              <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-1.5 pb-1 border-b border-zinc-200/80 dark:border-zinc-800" {...props} />
                            ),
                            h2: ({ ...props }) => (
                              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2.5 mb-1" {...props} />
                            ),
                            h3: ({ ...props }) => (
                              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-2 mb-1" {...props} />
                            ),
                            p: ({ ...props }) => (
                              <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed my-1.5" {...props} />
                            ),
                            ul: ({ ...props }) => (
                              <ul className="list-disc list-inside text-xs space-y-1 my-2 text-zinc-800 dark:text-zinc-200 pl-1" {...props} />
                            ),
                            ol: ({ ...props }) => (
                              <ol className="list-decimal list-inside text-xs space-y-1 my-2 text-zinc-800 dark:text-zinc-200 pl-1" {...props} />
                            ),
                            blockquote: ({ ...props }) => (
                              <blockquote className="border-l-2 border-blue-500 pl-3 py-1 my-2 text-xs italic text-zinc-600 dark:text-zinc-400 bg-blue-50/30 dark:bg-blue-950/20 rounded-r-lg" {...props} />
                            ),
                            code: ({ ...props }) => (
                              <code className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-800 dark:text-zinc-200" {...props} />
                            ),
                            table: ({ ...props }) => (
                              <div className="overflow-x-auto my-3">
                                <table className="w-full text-xs text-left border-collapse border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden" {...props} />
                              </div>
                            ),
                            th: ({ ...props }) => (
                              <th className="p-2 bg-zinc-100 dark:bg-zinc-800/90 font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-[11px]" {...props} />
                            ),
                            td: ({ ...props }) => (
                              <td className="p-2 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs" {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* VERIFIED SOURCES & EVIDENCE SECTION */}
                      {!isUser && hasSources && (
                        <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-2.5">
                          <button
                            type="button"
                            onClick={() => toggleSources(msg.id)}
                            className="w-full flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer select-none"
                          >
                            <span className="flex items-center space-x-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                              <span>Verified Citations & Evidence Chunks ({msg.sources?.length})</span>
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400 flex items-center space-x-1">
                              <span>{isExpanded ? 'Hide citations' : 'Inspect citations'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>

                          {/* Sources Accordion Body */}
                          {isExpanded && (
                            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                              {msg.sources?.map((src, sIdx) => {
                                const evKey = `${src.paperId}-${src.page}-${src.section}`;
                                return (
                                  <div
                                    key={sIdx}
                                    className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 text-xs space-y-2"
                                  >
                                    {/* Source Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <div className="flex items-center space-x-2 truncate max-w-[85%]">
                                        <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                          {sIdx + 1}
                                        </span>

                                        {src.paperId && onOpenPaper ? (
                                          <button
                                            type="button"
                                            onClick={() => onOpenPaper(src.paperId!)}
                                            className="hover:underline text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center space-x-1 truncate cursor-pointer text-left"
                                            title="Inspect paper in Structured Analysis"
                                          >
                                            <span className="truncate">{src.paperTitle || 'Publication'}</span>
                                            <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                                          </button>
                                        ) : (
                                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                            {src.paperTitle || 'Publication'}
                                          </span>
                                        )}
                                      </div>

                                      {/* Match Score Badge */}
                                      {src.similarityScore && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold">
                                          {src.similarityScore}% relevance
                                        </span>
                                      )}
                                    </div>

                                    {/* Page & Section Metadata Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                                      {src.page && (
                                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                          Page {src.page}
                                        </span>
                                      )}
                                      {src.section && (
                                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded truncate max-w-[200px]">
                                          Section: {src.section}
                                        </span>
                                      )}
                                      {src.sourceFilename && (
                                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded truncate max-w-[180px]">
                                          File: {src.sourceFilename}
                                        </span>
                                      )}
                                    </div>

                                    {/* Exact Grounded Excerpt Snippet */}
                                    {src.snippet && (
                                      <div className="p-2.5 bg-white dark:bg-zinc-950/50 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-700 dark:text-zinc-300 italic leading-relaxed">
                                        &ldquo;{src.snippet}&rdquo;
                                      </div>
                                    )}

                                    {/* Action Row */}
                                    <div className="flex items-center justify-end space-x-2 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveAsEvidence(src)}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-mono font-medium transition-colors cursor-pointer"
                                        title="Persist excerpt to Evidence Repository"
                                      >
                                        <FileCheck className="w-3 h-3 text-emerald-600" />
                                        <span>
                                          {savedEvidenceKey === evKey ? 'Saved to Evidence!' : '+ Save Evidence'}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ASSISTANT ACTION TOOLBAR */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                          <span className="text-[10px] font-mono text-zinc-400">
                            Academic Research Intelligence Grounding
                          </span>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                              title="Copy Answer to Clipboard"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {hasSources && (
                              <button
                                type="button"
                                onClick={() => handleSaveAsEvidence(msg.sources![0], msg.content.substring(0, 160))}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                title="Save to Evidence Engine"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Save Evidence</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSaveToNotes(msg)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                              title="Save to Research Notes"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5 text-blue-500" />
                              <span>{savedNoteId === msg.id ? 'Saved to Notes!' : 'Save Note'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CONTEXTUAL FOLLOW-UP CHIPS (DISPLAYED ON LATEST RESPONSE) */}
                      {isLastAssistantMessage && (
                        <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                            Suggested Follow-up Inquiries:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {followUpChips.map((chip, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleSendMessage(chip)}
                                className="text-[11px] bg-zinc-50 dark:bg-zinc-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-300 border border-zinc-200/80 dark:border-zinc-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* PROCESSING LOADING STATE */}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-[#0c101a] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2 shadow-xs w-full max-w-md">
                    <div className="flex items-center space-x-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                      <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
                      <span>Scholarly Intelligence Engine Processing</span>
                    </div>
                    <div className="flex items-center space-x-2 text-zinc-500 text-[11px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      <span>{processingStage}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT COMMAND WORKSPACE */}
            <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0f1422] space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex flex-col bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all p-2.5 shadow-2xs"
              >
                {/* Active Scope Tag above text input */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pb-1.5 border-b border-zinc-200/50 dark:border-zinc-800/60 mb-1">
                  <div className="flex items-center space-x-1.5 truncate max-w-[80%]">
                    <span className="text-zinc-500 font-semibold uppercase">Scope:</span>
                    {scope === 'paper' ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium truncate">
                        📄 Single Paper: {selectedPaper?.title || 'Selected document'}
                      </span>
                    ) : (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        📚 Project Corpus ({papers.length} publications)
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-zinc-400">
                    Enter ↵ to send · Shift+Enter for newline
                  </span>
                </div>

                {/* Multiline textarea with keyboard listener */}
                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={
                    scope === 'paper'
                      ? `Inquire about ${selectedPaper?.title ? `"${selectedPaper.title.substring(0, 36)}..."` : 'this paper'} (methodology, dataset, findings)...`
                      : 'Ask Research AI across all project papers (e.g. "Compare limitations across these papers")...'
                  }
                  className="w-full text-xs bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
                />

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    {inputPrompt.trim() && (
                      <button
                        type="button"
                        onClick={() => setInputPrompt('')}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        title="Clear input"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !inputPrompt.trim()}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all shadow-xs cursor-pointer"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Inquiry</span>
                        <CornerDownLeft className="w-3 h-3 opacity-60 hidden sm:inline" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
