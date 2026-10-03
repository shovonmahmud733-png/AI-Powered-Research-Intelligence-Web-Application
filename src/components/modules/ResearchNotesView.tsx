'use client';

import React, { useEffect, useState } from 'react';
import { ResearchNote, Paper } from '@/lib/db/types';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Link2,
  Search,
  BookOpen,
  Calendar,
  PenSquare,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchNotesViewProps {
  projectId: string;
  papers: Paper[];
}

export const ResearchNotesView: React.FC<ResearchNotesViewProps> = ({
  projectId,
  papers,
}) => {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [linkedPaperId, setLinkedPaperId] = useState('');

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/notes?projectId=${projectId}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Fetch notes error:', err);
    }
  };

  useEffect(() => {
    if (projectId) fetchNotes();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editingId) {
        await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title,
            content,
            tags,
            linkedPaperId: linkedPaperId || undefined,
          }),
        });
      } else {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            title,
            content,
            tags,
            linkedPaperId: linkedPaperId || undefined,
          }),
        });
      }

      setIsCreating(false);
      setEditingId(null);
      setTitle('');
      setContent('');
      setTagInput('');
      setLinkedPaperId('');
      fetchNotes();
    } catch (err) {
      alert('Failed to save note');
    }
  };

  const handleEdit = (note: ResearchNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTagInput(note.tags.join(', '));
    setLinkedPaperId(note.linkedPaperId || '');
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredNotes = notes.filter((n) => {
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <FileText className="w-4 h-4" />
            </span>
            <span>Structured Research Notes</span>
            <span className="text-xs font-mono font-medium text-zinc-400">({notes.length} Documents)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Markdown-powered research logs with entity cross-linking to papers, evidence, and gaps.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-36 sm:w-44 transition-all"
            />
          </div>

          <button
            onClick={() => {
              setIsCreating(true);
              setEditingId(null);
              setTitle('');
              setContent('');
              setTagInput('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Editor Modal / Inline Form */}
      {isCreating && (
        <div className="p-5 sm:p-6 bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 uppercase tracking-wider font-mono flex items-center gap-2">
            <PenSquare className="w-4 h-4 text-zinc-500" />
            <span>{editingId ? 'Edit Research Note' : 'Create New Research Note'}</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Synthesis of Tokenizer Fragmentation Bottlenecks"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Link to Paper</label>
                <select
                  value={linkedPaperId}
                  onChange={(e) => setLinkedPaperId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="">No linked paper</option>
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Tokenizer, Low-Resource, Subwords"
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                Content (Markdown supported)
              </label>
              <textarea
                rows={6}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your research synthesis, methodology notes, or hypothesis tests..."
                className="w-full text-xs font-mono p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white shadow-xs transition-all"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.map((note) => {
          const linkedPaper = papers.find((p) => p.id === note.linkedPaperId);

          return (
            <div
              key={note.id}
              className="bg-white dark:bg-[#0f1422] border border-zinc-200/90 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {note.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md font-mono font-medium border border-zinc-200/60 dark:border-zinc-700/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1.5 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit Note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 leading-snug">
                  {note.title}
                </h3>

                {linkedPaper && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 bg-zinc-50/70 dark:bg-[#131929] px-2.5 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/70">
                    <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">Linked: {linkedPaper.title}</span>
                  </div>
                )}

                <div className="prose prose-xs dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300 line-clamp-6 leading-relaxed">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                <span>ID: {note.id.substring(0, 8)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
