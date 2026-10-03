'use client';

import React, { useEffect, useState } from 'react';
import { Paper } from '@/lib/db/types';
import { CitationStyle } from '@/lib/citations/formatters';
import {
  BookmarkCheck,
  Copy,
  Check,
  Download,
  FileCode,
  Layers,
  FileText,
} from 'lucide-react';

interface CitationManagerProps {
  projectId: string;
  papers: Paper[];
}

export const CitationManager: React.FC<CitationManagerProps> = ({
  projectId,
  papers,
}) => {
  const [style, setStyle] = useState<CitationStyle>('apa7');
  const [citations, setCitations] = useState<Array<{ paperId: string; title: string; citation: string }>>([]);
  const [bundle, setBundle] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCitations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/citations?projectId=${projectId}&style=${style}`);
      const data = await res.json();
      setCitations(data.citations || []);
      setBundle(data.bundle || null);
    } catch (err) {
      console.error('Failed to load citations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchCitations();
  }, [projectId, style]);

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedBundle(true);
      setTimeout(() => setCopiedBundle(false), 2000);
    }
  };

  const downloadBundleFile = () => {
    if (!bundle) return;
    const ext = style === 'bibtex' ? 'bib' : 'ris';
    const blob = new Blob([bundle], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_citations_${projectId}.${ext}`;
    a.click();
  };

  const styleNames: Record<CitationStyle, string> = {
    apa7: 'APA 7th Edition',
    ieee: 'IEEE',
    mla: 'MLA 9th Edition',
    chicago: 'Chicago Author-Date',
    harvard: 'Harvard',
    bibtex: 'BibTeX (.bib)',
    ris: 'RIS EndNote / Zotero (.ris)',
  };

  return (
    <div className="space-y-6">
      {/* Header & Style Picker */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <BookmarkCheck className="w-4 h-4" />
            </span>
            <span>Citation Intelligence & Reference Exporter</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Generates compliant academic citations from verified paper metadata. Never fabricates DOIs or publication years.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CitationStyle)}
            className="text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {Object.entries(styleNames).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {bundle && (
            <button
              onClick={downloadBundleFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {style.toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>

      {/* BibTeX / RIS Bundle preview if selected */}
      {bundle && (
        <div className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-xs">
                Combined {style.toUpperCase()} Reference Bundle
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(bundle)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs transition-all"
            >
              {copiedBundle ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedBundle ? 'Copied Bundle!' : 'Copy Entire Bundle'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-50/80 dark:bg-[#131929] p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/70 overflow-x-auto max-h-56 leading-relaxed selection:bg-zinc-200 dark:selection:bg-zinc-800">
            {bundle}
          </pre>
        </div>
      )}

      {/* Individual Citations */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#0f1422] text-xs text-zinc-400">
            Formatting references in {styleNames[style]}...
          </div>
        )}

        {citations.map((c, idx) => (
          <div
            key={c.paperId}
            className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <span className="font-semibold text-zinc-950 dark:text-zinc-50 truncate pr-4">
                {c.title}
              </span>
              <button
                onClick={() => copyToClipboard(c.citation, idx)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                {copiedIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans select-all bg-zinc-50/50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850">
              {c.citation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
