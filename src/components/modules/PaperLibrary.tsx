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
}

export const PaperLibrary: React.FC<PaperLibraryProps> = ({
  projectId,
  papers,
  onRefresh,
  onSelectPaperForAnalysis,
  onOpenCopilotForPaper,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to remove this paper and its extracted evidence from the project?')) return;
    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Upload Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-zinc-500" />
            <span>Project Paper Database ({papers.length} Publications)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Normalized paper catalog with verified DOIs, section extraction, and evidence grounding.
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsUploading(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Research PDF</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {papers.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
          <BookOpen className="w-8 h-8 mx-auto text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No papers in this project yet
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Search for academic literature using the Discover workflow, or upload a research PDF manuscript to extract structured evidence.
          </p>
          <button
            onClick={() => setIsUploading(true)}
            className="px-3.5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-md"
          >
            Upload your first PDF
          </button>
        </div>
      )}

      {/* Papers Grid */}
      <div className="grid grid-cols-1 gap-4">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                {paper.isDemo ? (
                  <span className="text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold">
                    DEMO PAPER — NOT A REAL PUBLICATION
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                    {paper.sourceProvider}
                  </span>
                )}

                {paper.metadataStatus === 'verified' && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Metadata Verified</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs">
                {onOpenCopilotForPaper && (
                  <button
                    onClick={() => onOpenCopilotForPaper(paper.id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md border border-amber-200 dark:border-amber-800 transition-colors font-medium"
                    title="Open paper in persistent Research Copilot with multi-turn chat"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ask Copilot</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveAskPaper(paper);
                    setChatHistory([]);
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  title="Quick single-paper RAG inspector"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Quick Inquire</span>
                </button>

                <button
                  onClick={() => onSelectPaperForAnalysis(paper.id)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-md hover:bg-zinc-800 transition-colors font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Structured Analysis</span>
                </button>

                <button
                  onClick={() => handleDeletePaper(paper.id)}
                  className="p-1 text-zinc-400 hover:text-red-600 rounded"
                  title="Remove Paper"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {paper.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {paper.authors.join(', ')} · <span className="italic">{paper.journalOrConference}</span> ({paper.publicationYear})
              </p>
              {paper.doi && (
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  DOI: {paper.doi} {paper.citationCount > 0 && `· ${paper.citationCount} citations`}
                </p>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {paper.abstract}
            </p>
          </div>
        ))}
      </div>

      {/* PDF Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <FileUp className="w-4 h-4 text-zinc-500" />
                <span>Upload & Index Research PDF</span>
              </h3>
              <button
                onClick={() => setIsUploading(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
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
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 hover:file:cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Paper Title (Optional override)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Extracted title from PDF..."
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2"
                />
              </div>

              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-md border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1 font-mono">
                <div>Extraction Pipeline:</div>
                <div className="text-[10px] text-zinc-400">
                  Validation → Page-Aware Text Extraction → Section Detection → Paragraph Chunking → Vector Embeddings
                </div>
              </div>

              {uploadProgress && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-300">
                  {uploadProgress}
                </div>
              )}

              {uploadError && (
                <div className="p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-300">
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile}
                  className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-md hover:bg-zinc-800 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full h-[80vh] flex flex-col border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950">
              <div className="truncate pr-4">
                <span className="text-[10px] font-mono uppercase bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                  Grounded Evidence Q&A
                </span>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-1">
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
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md hover:bg-amber-100"
                    title="Transfer context to full persistent AI chat session"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Open in Full Copilot</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveAskPaper(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <MessageSquare className="w-8 h-8 mx-auto text-zinc-400" />
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
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
                        className="text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-full text-left"
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
                    <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs px-3 py-2 rounded-xl rounded-tr-xs max-w-[85%]">
                      {msg.question}
                    </div>
                  </div>

                  {/* AI Grounded Response */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl rounded-tl-xs p-3.5 max-w-[90%] space-y-3">
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {msg.answer}
                      </div>

                      {/* Evidence citations */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 space-y-1.5">
                          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Source Evidence (Grounding Verification)</span>
                          </div>
                          {msg.evidence.slice(0, 2).map((ev, evIdx) => (
                            <div
                              key={evIdx}
                              className="p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200/70 dark:border-zinc-800 text-[11px] space-y-1"
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
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retrieving vector chunks and formulating grounded evidence answer...</span>
                </div>
              )}
            </div>

            {/* Modal Input */}
            <form
              onSubmit={handleAskQuestion}
              className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center space-x-2"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask specific questions about this paper's findings, dataset, or methods..."
                className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
