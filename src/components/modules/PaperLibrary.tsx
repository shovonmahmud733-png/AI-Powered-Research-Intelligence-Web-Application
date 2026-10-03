'use client';

import React, { useState } from 'react';
import { Paper } from '@/lib/db/types';
import {
  BookOpen,
  Upload,
  MessageSquare,
  Sparkles,
  Trash2,
  ExternalLink,
  FileText,
  AlertTriangle,
  FileUp,
  X,
  Send,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface PaperLibraryProps {
  projectId: string;
  papers: Paper[];
  onRefresh: () => void;
  onSelectPaperForAnalysis: (paperId: string) => void;
  onOpenCopilotForPaper?: (paperId: string) => void;
  onDeletePaper?: (paperId: string) => void;
}

export const PaperLibrary: React.FC<PaperLibraryProps> = ({
  projectId,
  papers,
  onRefresh,
  onSelectPaperForAnalysis,
  onOpenCopilotForPaper,
  onDeletePaper,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete Paper Confirmation Modal state
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ask Paper Modal state
  const [activeAskPaper, setActiveAskPaper] = useState<Paper | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      question: string;
      answer: string;
      evidence: Array<{ page: number; section: string; snippet: string; similarityScore: number }>;
      modelUsed: string;
    }>
  >([]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress('Validating file & extracting page-aware text...');
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('projectId', projectId);
    if (uploadTitle) formData.append('title', uploadTitle);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Persist paper and chunks to client cache for multi-instance serverless resilience
      if (typeof window !== 'undefined' && data.paper) {
        try {
          const storedPapers = JSON.parse(localStorage.getItem('rp_custom_papers') || '[]');
          const updatedPapers = [data.paper, ...storedPapers.filter((p: any) => p.id !== data.paper.id)];
          localStorage.setItem('rp_custom_papers', JSON.stringify(updatedPapers));

          if (data.chunks && Array.isArray(data.chunks) && data.chunks.length > 0) {
            const storedChunks = JSON.parse(localStorage.getItem('rp_custom_chunks') || '[]');
            const updatedChunks = [...data.chunks, ...storedChunks.filter((c: any) => c.paperId !== data.paper.id)];
            localStorage.setItem('rp_custom_chunks', JSON.stringify(updatedChunks));
          }
        } catch (storageErr) {
          console.warn('Local storage sync warning:', storageErr);
        }
      }

      setUploadProgress(
        `Document extracted! ${data.chunksExtracted} paragraphs indexed across ${data.totalPages} pages.`
      );
      setTimeout(() => {
        setIsUploading(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadProgress(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'PDF processing error');
      setIsUploading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAskPaper || !question.trim()) return;

    setAsking(true);
    const currQuestion = question;
    setQuestion('');

    try {
      const res = await fetch(`/api/papers/${activeAskPaper.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currQuestion }),
      });

      const data = await res.json();
      if (res.ok) {
        setChatHistory((prev) => [
          ...prev,
          {
            question: currQuestion,
            answer: data.answer,
            evidence: data.evidence || [],
            modelUsed: data.modelUsed,
          },
        ]);
      } else {
        alert(data.error || 'Failed to query paper');
      }
    } catch (err: any) {
      alert('Error querying paper intelligence engine');
    } finally {
      setAsking(false);
    }
  };

  const confirmDeletePaper = async () => {
    if (!paperToDelete) return;
    const paperId = paperToDelete.id;
    setIsDeleting(true);

    try {
      // 1. Trigger parent optimistic delete if provided
      if (onDeletePaper) {
        onDeletePaper(paperId);
      }

      // 2. Synchronize localStorage cache & tombstone
      if (typeof window !== 'undefined') {
        try {
          const storedPapers = JSON.parse(localStorage.getItem('rp_custom_papers') || '[]');
          const updatedPapers = storedPapers.filter((p: any) => p.id !== paperId);
          localStorage.setItem('rp_custom_papers', JSON.stringify(updatedPapers));

          const storedChunks = JSON.parse(localStorage.getItem('rp_custom_chunks') || '[]');
          const updatedChunks = storedChunks.filter((c: any) => c.paperId !== paperId && c.paper_id !== paperId);
          localStorage.setItem('rp_custom_chunks', JSON.stringify(updatedChunks));

          const deletedStored = localStorage.getItem('rp_deleted_papers');
          const deletedList = deletedStored ? JSON.parse(deletedStored) : [];
          if (!deletedList.includes(paperId)) {
            deletedList.push(paperId);
            localStorage.setItem('rp_deleted_papers', JSON.stringify(deletedList));
          }
        } catch (storageErr) {
          console.warn('Local storage delete sync warning:', storageErr);
        }
      }

      // 3. Call backend deletion API routes
      await fetch(`/api/papers/${encodeURIComponent(paperId)}`, { method: 'DELETE' });

      // 4. Refresh parent state
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setPaperToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Upload Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Project Literature Library ({papers.length} Publications)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Structured full-text catalog with verified DOIs, section extraction, and vector-indexed evidence.
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsUploading(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs hover:shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Research PDF</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {papers.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-[#0f1422]/40 space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No papers cataloged in this project yet
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Discover and add academic literature using the Academic Search engine, or upload a research PDF manuscript to extract structured sections.
            </p>
          </div>
          <button
            onClick={() => setIsUploading(true)}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl shadow-xs"
          >
            Upload your first PDF
          </button>
        </div>
      )}

      {/* Papers Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="bg-white dark:bg-[#0f1422] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                {paper.isDemo ? (
                  <span className="text-[10px] font-mono uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-bold">
                    SAMPLE PAPER
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md font-medium">
                    {paper.sourceProvider}
                  </span>
                )}

                {paper.metadataStatus === 'verified' && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified Metadata</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                {onOpenCopilotForPaper && (
                  <button
                    onClick={() => onOpenCopilotForPaper(paper.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors font-semibold text-[11px]"
                    title="Open paper in persistent Research Copilot with multi-turn chat"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Ask Copilot</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveAskPaper(paper);
                    setChatHistory([]);
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors font-medium text-[11px]"
                  title="Quick single-paper RAG inspector"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Quick Inquire</span>
                </button>

                <button
                  onClick={() => onSelectPaperForAnalysis(paper.id)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition-colors font-semibold text-[11px] shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Structured Analysis</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPaperToDelete(paper);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Remove Paper from Project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {paper.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {paper.authors.join(', ')} · <span className="italic">{paper.journalOrConference || 'Publication'}</span> ({paper.publicationYear})
              </p>
              {paper.doi && (
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  DOI: {paper.doi} {paper.citationCount > 0 && `· ${paper.citationCount} citations`}
                </p>
              )}
            </div>

            {paper.abstract && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {paper.abstract}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* PDF Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-md w-full p-6 border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <FileUp className="w-4 h-4 text-blue-500" />
                <span>Upload & Index Research PDF</span>
              </h3>
              <button
                onClick={() => setIsUploading(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Select Academic PDF (Max 25MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
                      }
                    }
                  }}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-2.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-800 dark:file:bg-zinc-800 dark:file:text-zinc-200 hover:file:cursor-pointer border border-zinc-200 dark:border-zinc-800 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Paper Title (Optional override)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Extracted title from PDF..."
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 space-y-1 font-mono">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300">Extraction Pipeline:</div>
                <div className="text-[10px] text-zinc-400">
                  Validation → Page-Aware Text Extraction → Section Detection → Paragraph Chunking → Vector Embeddings
                </div>
              </div>

              {uploadProgress && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {uploadProgress}
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium">
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-3.5 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile}
                  className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 shadow-xs"
                >
                  Process & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ask the Paper Modal (RAG Q&A with Strict Page & Section Citations) */}
      {activeAskPaper && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-2xl w-full h-[80vh] flex flex-col border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60">
              <div className="truncate pr-4">
                <span className="text-[10px] font-mono uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-semibold">
                  Grounded Evidence Q&A
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-1">
                  Ask: {activeAskPaper.title}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {onOpenCopilotForPaper && (
                  <button
                    onClick={() => {
                      const paperId = activeAskPaper.id;
                      setActiveAskPaper(null);
                      onOpenCopilotForPaper(paperId);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl font-semibold transition-colors"
                    title="Transfer context to full persistent AI chat session"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Open in Copilot</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveAskPaper(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-12 space-y-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 shadow-2xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Inquire about specific methodology, datasets, models, metrics, or limitations. Every answer shows verified source page and section evidence.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {[
                      'What dataset was used and what is its size?',
                      'Explain the proposed methodology.',
                      'What are the stated limitations?',
                      'Why was XLM-R or transformer model selected?',
                    ].map((sampleQ, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuestion(sampleQ);
                        }}
                        className="text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full text-left font-medium transition-colors"
                      >
                        {sampleQ}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] font-medium">
                      {msg.question}
                    </div>
                  </div>

                  {/* AI Grounded Response */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl rounded-tl-xs p-4 max-w-[90%] space-y-3">
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {msg.answer}
                      </div>

                      {/* Evidence citations */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="border-t border-zinc-200/70 dark:border-zinc-800 pt-2.5 space-y-2">
                          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center space-x-1 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Source Evidence (Grounding Verification)</span>
                          </div>
                          {msg.evidence.slice(0, 2).map((ev, evIdx) => (
                            <div
                              key={evIdx}
                              className="p-2.5 bg-white dark:bg-[#0c101a] rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 text-[11px] space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  Page {ev.page} · Section: {ev.section}
                                </span>
                                <span>{ev.similarityScore}% match</span>
                              </div>
                              <p className="italic text-zinc-600 dark:text-zinc-400">
                                &ldquo;{ev.snippet}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {asking && (
                <div className="text-xs text-zinc-500 font-mono animate-pulse flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Retrieving vector chunks and formulating grounded evidence answer...</span>
                </div>
              )}
            </div>

            {/* Modal Input */}
            <form
              onSubmit={handleAskQuestion}
              className="p-3 sm:p-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0f1422] flex items-center space-x-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask specific questions about this paper's findings, dataset, or methods..."
                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="px-4 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Paper Confirmation Modal */}
      {paperToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f1422] rounded-2xl max-w-md w-full p-6 border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                  Remove Publication from Project?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to remove <span className="font-semibold text-zinc-900 dark:text-zinc-100">&ldquo;{paperToDelete.title}&rdquo;</span>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              This will permanently remove the paper, its extracted sections, and indexed RAG evidence from this research project.
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPaperToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeletePaper}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Publication</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
