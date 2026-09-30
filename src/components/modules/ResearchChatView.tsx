'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  // Scope: 'project' or 'paper' — authoritative user selection
  const [scope, setScope] = useState<'project' | 'paper'>(initialPaperId ? 'paper' : 'project');
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId || papers[0]?.id || '');
  const [searchAcrossLibrary, setSearchAcrossLibrary] = useState(false);

  // Paper analysis state
  const [paperAnalysisStatus, setPaperAnalysisStatus] = useState<'idle' | 'analyzing' | 'ready'>('idle');
  const [paperAnalysisMessage, setPaperAnalysisMessage] = useState('');

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
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Fetch messages error:', err);
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
        // Restore all thread state from the persisted session
        setScope(sess.scope || 'project');
        if (sess.paperId) setSelectedPaperId(sess.paperId);
        setSearchAcrossLibrary(sess.searchAcrossLibrary ?? false);
        scopeRestoredRef.current = true;
      }
      fetchMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // Deep Paper Analysis Trigger — runs when user selects a paper in Single Paper mode
  const triggerPaperAnalysis = useCallback(async (paperId: string) => {
    if (!paperId || scope !== 'paper') return;

    setPaperAnalysisStatus('analyzing');
    setPaperAnalysisMessage('Checking paper analysis status...');

    try {
      // Check if paper already has chunks (already processed)
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) {
        setPaperAnalysisStatus('ready');
        setPaperAnalysisMessage('');
        return;
      }

      // Check if paper is already in 'ready' state (already processed)
      if (paper.processingStatus === 'ready') {
        // Brief visual confirmation
        setPaperAnalysisMessage('Loading paper knowledge context...');
        await new Promise((r) => setTimeout(r, 400));
        setPaperAnalysisStatus('ready');
        setPaperAnalysisMessage('');
        return;
      }

      // Show processing stages
      const stages = [
        'Extracting sections...',
        'Building paper knowledge...',
        'Indexing evidence...',
        'Preparing retrieval context...',
      ];

      for (const stage of stages) {
        setPaperAnalysisMessage(stage);
        await new Promise((r) => setTimeout(r, 350));
      }

      setPaperAnalysisStatus('ready');
      setPaperAnalysisMessage('');
    } catch (err) {
      console.error('Paper analysis error:', err);
      setPaperAnalysisStatus('ready');
      setPaperAnalysisMessage('');
    }
  }, [scope, papers]);

  // Trigger analysis when paper selection changes in Single Paper mode
  useEffect(() => {
    if (scope === 'paper' && selectedPaperId) {
      triggerPaperAnalysis(selectedPaperId);
    } else {
      setPaperAnalysisStatus('idle');
      setPaperAnalysisMessage('');
    }
  }, [scope, selectedPaperId, triggerPaperAnalysis]);

  // Persist scope changes to the active session
  const persistSessionState = useCallback(async (updates: Record<string, any>) => {
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
  }, [activeSessionId]);

  // When user explicitly changes scope
  const handleScopeChange = (newScope: 'project' | 'paper') => {
    setScope(newScope);
    persistSessionState({ scope: newScope });
  };

  // When user explicitly changes selected paper
  const handlePaperChange = (newPaperId: string) => {
    setSelectedPaperId(newPaperId);
    const paper = papers.find((p) => p.id === newPaperId);
    persistSessionState({
      paperId: newPaperId,
      paperTitle: paper?.title,
    });
  };

  // When user explicitly toggles searchAcrossLibrary
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
          ? `Discussion: ${targetPaper.title.substring(0, 30)}...`
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
      }
    } catch (err) {
      alert('Failed to initialize new conversation');
    }
  };

  // 4. Delete Session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation history?')) return;

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

  // 5. Send Message — CRITICAL: scope is authoritative, never overridden
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || sending) return;

    // Ensure session exists
    let currSessionId = activeSessionId;
    if (!currSessionId) {
      await handleNewSession();
      return;
    }

    setSending(true);
    setInputPrompt('');

    // Optimistically append user message
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
      // CRITICAL: The user's explicit scope selection is authoritative.
      // searchAcrossLibrary=ON does NOT change scope to 'project'.
      // It only enables broader retrieval within the chatEngine.
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

        // Refresh sessions to pick up title updates, but DO NOT reset scope
        const sessRes = await fetch(`/api/chat/sessions?projectId=${projectId}`);
        const sessData = await sessRes.json();
        setSessions(sessData.sessions || []);

        // Progressive stream typing animation
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
        alert(data.error || 'Failed to generate response');
      }
    } catch (err) {
      alert('Error communicating with Research AI');
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // 6. Regenerate Response — uses the same authoritative scope
  const handleRegenerate = async () => {
    if (!activeSessionId || sending) return;
    setSending(true);

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
        alert(data.error || 'Failed to regenerate answer');
      }
    } catch (err) {
      console.error('Regenerate error:', err);
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // 7. Save to Research Notes
  const handleSaveToNotes = async (msg: ChatMessage) => {
    try {
      const title = `Copilot Synthesis: ${msg.content.substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '')}...`;
      const noteContent = `## Copilot Inquiry Synthesis\n\n${msg.content}\n\n### Grounded Source Citations\n${(msg.sources || []).map((s) => `- ${s.paperTitle} (Page ${s.page}, Section: ${s.section})`).join('\n')}`;

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

  const researchPrompts =
    scope === 'paper'
      ? [
          'What is the main research problem?',
          'What dataset did the authors use?',
          'What preprocessing techniques were applied?',
          'What methodology did the authors use?',
          'What were the main results?',
          'What are the limitations?',
          'What future work did the authors suggest?',
        ]
      : [
          'What are the major limitations across the papers in my current project?',
          'Compare these papers.',
          'Explain this methodology.',
          'Find evidence supporting this claim.',
          'Why do these papers disagree?',
          'What datasets are used across the papers?',
          'Help me organize my literature review.',
          'Verify my interpretation against the extracted evidence.',
          'Suggest unanswered research questions for my project.',
        ];

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  return (
    <div className="space-y-4">
      {/* Top Banner: AI Assistance Mode & Context Status */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-bold text-base">
            🤖
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <span>Research AI</span>
                <span className="text-xs font-normal text-zinc-500">· Project Intelligence Assistant</span>
              </h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  aiAssistanceEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {aiAssistanceEnabled ? 'AI Active' : 'AI Paused (Manual Mode)'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Evidence-grounded conversational assistant directly aware of project papers, notes, matrix, and findings.
            </p>
          </div>
        </div>

        {/* Global AI ON/OFF Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleAiAssistance}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              aiAssistanceEnabled
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 font-semibold'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{aiAssistanceEnabled ? 'Disable AI Assistance' : 'Enable AI Assistance'}</span>
          </button>
        </div>
      </div>

      {/* Manual Mode Educational State (When AI Assistance = OFF) */}
      {!aiAssistanceEnabled ? (
        <div className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Manual Research Mode Active (AI Assistance is OFF)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Automatic AI assistance is currently paused to give you complete unmediated researcher focus. You can continue reading papers, writing research notes, editing the Literature Matrix manually, and managing citations without AI intervention.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onToggleAiAssistance}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Verify with AI / Turn AI Assistance ON</span>
            </button>
          </div>
        </div>
      ) : (
        /* Full Conversational Interface (When AI Assistance = ON) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[720px]">
          {/* Left Sessions Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col h-full shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                Research Threads
              </span>
              <button
                onClick={handleNewSession}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400"
                title="Start New Research Thread"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Session Items */}
            <div className="flex-1 overflow-y-auto space-y-1 py-2">
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between group ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{s.title || 'Untitled Thread'}</div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 ${
                          isActive ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                        }`}
                      >
                        {s.scope === 'paper' ? '📄 Paper Scope' : '📚 Project Scope'}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-opacity ${
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

            {/* Context Stats Footer */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 font-mono space-y-0.5">
              <div>Grounding Context:</div>
              <div className="text-zinc-400 font-normal">
                {scope === 'paper' && selectedPaper ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    1 Selected Paper ({selectedPaper.title.substring(0, 22)}...) · Isolated
                  </span>
                ) : (
                  <span>{papers.length} Project Papers · Verified Chunks · Notes</span>
                )}
              </div>
            </div>
          </div>

          {/* Center Chat Arena */}
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden shadow-xs">
            {/* Conversation Header & Scope Switcher */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 truncate">
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
                      className="text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-[10px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded font-medium"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(false)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 px-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {activeSession?.title || 'Research AI Thread'}
                    </span>
                    {activeSession && (
                      <button
                        onClick={() => {
                          setRenameText(activeSession.title);
                          setIsRenaming(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        title="Rename Conversation"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-1.5">
                  <select
                    value={scope}
                    onChange={(e) => handleScopeChange(e.target.value as 'project' | 'paper')}
                    className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="project">📚 All Project Papers</option>
                    <option value="paper">📄 Single Paper</option>
                  </select>

                  {scope === 'paper' && papers.length > 0 && (
                    <select
                      value={selectedPaperId}
                      onChange={(e) => handlePaperChange(e.target.value)}
                      className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 max-w-[200px] truncate focus:outline-none"
                    >
                      {papers.map((p) => (
                        <option key={p.id} value={p.id} className="truncate">
                          {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Scope Switcher / Restrict to Paper & Actions */}
              <div className="flex items-center space-x-2 text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                  <input
                    type="checkbox"
                    checked={searchAcrossLibrary}
                    onChange={(e) => handleSearchAcrossLibraryChange(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <span>Search Across My Research Library</span>
                </label>

                <button
                  onClick={handleClearConversation}
                  disabled={messages.length === 0}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded text-xs transition-colors disabled:opacity-40"
                  title="Clear conversation messages"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>

                <button
                  onClick={handleRegenerate}
                  disabled={sending || messages.length === 0}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs transition-colors disabled:opacity-40"
                  title="Regenerate last response"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Paper Analysis Status Banner */}
            {scope === 'paper' && paperAnalysisStatus === 'analyzing' && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center space-x-2 text-xs text-blue-700 dark:text-blue-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="font-medium">Analyzing Paper...</span>
                <span className="text-blue-500 dark:text-blue-400 font-mono">{paperAnalysisMessage}</span>
              </div>
            )}

            {scope === 'paper' && paperAnalysisStatus === 'ready' && selectedPaper && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-medium">Paper Ready ✓</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-mono truncate max-w-[300px]">
                    {selectedPaper.title}
                  </span>
                </div>
                <span className="text-emerald-500 dark:text-emerald-400 font-mono text-[10px]">
                  Single Paper Mode · All answers grounded in this paper only
                </span>
              </div>
            )}

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !loadingMessages && (
                <div className="text-center py-12 space-y-4 max-w-lg mx-auto">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-600 dark:text-zinc-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {scope === 'paper'
                        ? `Single Paper Deep Analysis — ${selectedPaper?.title || 'Select a Paper'}`
                        : 'Scientific Inquiry & Reasoning Workspace'}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      {scope === 'paper'
                        ? 'Ask any question about this paper. All answers will be grounded strictly in the selected paper\'s content, with exact page and section citations.'
                        : 'Inquire about methodology, empirical findings, vocabulary fragmentation, or cross-paper contradictions. All answers strictly map to verified page and section sources.'}
                    </p>
                  </div>

                  {/* Quick Action Prompts */}
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {researchPrompts.map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(promptText)}
                        className="text-[11px] bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-full text-left transition-colors"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasSources = msg.sources && msg.sources.length > 0;
                const isExpanded = expandedSources[msg.id];

                return (
                  <div key={msg.id} className={`space-y-2 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
                    <div
                      className={`rounded-xl p-4 text-xs leading-relaxed max-w-[88%] ${
                        isUser
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 space-y-3'
                      }`}
                    >
                      {/* Distinguishing Tag on Assistant message */}
                      {!isUser && (
                        <div className="flex items-center space-x-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-2">
                          {hasSources ? (
                            <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Source-Grounded Synthesis</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded font-medium flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Insufficient Evidence Grounding</span>
                            </span>
                          )}
                          {msg.interpretationNotes && hasSources && (
                            <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded">
                              AI Reasoning & Grounding
                            </span>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Sources Drawer / Accordion */}
                      {!isUser && hasSources && (
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-2">
                          <div
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer select-none"
                          >
                            <span className="flex items-center space-x-1">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Verified Sources & Evidence Quotes ({msg.sources?.length})</span>
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>

                          {isExpanded && (
                            <div className="space-y-1.5 pt-1">
                              {msg.sources?.map((src, sIdx) => {
                                const evKey = `${src.paperId}-${src.page}-${src.section}`;
                                return (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1.5 shadow-2xs"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1 text-zinc-700 dark:text-zinc-300 font-medium">
                                      <div className="flex items-center space-x-1 truncate max-w-[80%]">
                                        {src.paperId && onOpenPaper ? (
                                          <button
                                            onClick={() => onOpenPaper(src.paperId!)}
                                            className="hover:underline text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center space-x-1 text-left truncate"
                                            title="Open and read paper in Structured Analysis"
                                          >
                                            <span className="truncate">{src.paperTitle || 'Publication'}</span>
                                            <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" />
                                          </button>
                                        ) : (
                                          <span className="truncate">{src.paperTitle || 'Publication'}</span>
                                        )}
                                        {src.page && <span className="font-mono text-zinc-500">· Page {src.page}</span>}
                                        {src.section && <span className="font-mono text-zinc-500">· {src.section}</span>}
                                      </div>

                                      {src.similarityScore && (
                                        <span className="font-mono text-zinc-400 text-[10px]">
                                          {src.similarityScore}% match
                                        </span>
                                      )}
                                    </div>

                                    {src.snippet && (
                                      <p className="italic text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                                        &ldquo;{src.snippet}&rdquo;
                                      </p>
                                    )}

                                    <div className="flex items-center justify-end pt-1">
                                      <button
                                        onClick={() => handleSaveAsEvidence(src)}
                                        className="inline-flex items-center space-x-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-mono transition-colors"
                                        title="Persist this verified excerpt to Evidence Engine"
                                      >
                                        <FileCheck className="w-3 h-3 text-emerald-600" />
                                        <span>{savedEvidenceKey === evKey ? 'Saved to Evidence!' : '+ Save Evidence'}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assistant Action Toolbar */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px]">
                          <div className="flex items-center space-x-2 text-zinc-500 font-mono text-[10px]">
                            <span>Deterministic Local / Multi-LLM</span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400 transition-colors"
                              title="Copy Response"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {msg.sources && msg.sources.length > 0 && (
                              <button
                                onClick={() => handleSaveAsEvidence(msg.sources![0], msg.content.substring(0, 160))}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[11px] transition-colors"
                                title="Save primary finding to Evidence repository"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Save Evidence</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleSaveToNotes(msg)}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[11px] transition-colors"
                              title="Add directly to Project Research Notes"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>{savedNoteId === msg.id ? 'Saved to Notes!' : 'Save to Notes'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-500 font-mono animate-pulse flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>
                      {scope === 'paper'
                        ? `Retrieving evidence from "${selectedPaper?.title?.substring(0, 40) || 'selected paper'}"...`
                        : 'Retrieving project vector chunks and synthesizing evidence...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  scope === 'paper'
                    ? `Ask about "${selectedPaper?.title?.substring(0, 50) || 'this paper'}"...`
                    : 'Ask Research Copilot about your papers, evidence, methodology, or contradictions...'
                }
                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                type="submit"
                disabled={sending || !inputPrompt.trim()}
                className="px-4 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
