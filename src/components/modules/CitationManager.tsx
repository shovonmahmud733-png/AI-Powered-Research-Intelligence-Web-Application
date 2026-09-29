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
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <BookmarkCheck className="w-4 h-4 text-zinc-500" />
            <span>Citation Intelligence & Reference Exporter</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Generates compliant academic citations from verified paper metadata. Never fabricates DOIs or publication years.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CitationStyle)}
            className="text-xs font-medium bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100"
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
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {style.toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>

      {/* BibTeX / RIS Bundle preview if selected */}
      {bundle && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
              Combined {style.toUpperCase()} Reference Bundle
            </span>
            <button
              onClick={() => copyToClipboard(bundle)}
              className="inline-flex items-center space-x-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {copiedBundle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBundle ? 'Copied Bundle!' : 'Copy Entire Bundle'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed">
            {bundle}
          </pre>
        </div>
      )}

      {/* Individual Citations */}
      <div className="space-y-3">
        {citations.map((c, idx) => (
          <div
            key={c.paperId}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-4">
                {c.title}
              </span>
              <button
                onClick={() => copyToClipboard(c.citation, idx)}
                className="inline-flex items-center space-x-1 px-2 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs transition-colors shrink-0"
              >
                {copiedIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans select-all">
              {c.citation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
