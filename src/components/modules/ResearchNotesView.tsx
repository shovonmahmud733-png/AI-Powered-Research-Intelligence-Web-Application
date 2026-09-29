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
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <span>Structured Research Notes ({notes.length} Documents)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Markdown-powered research logs with entity cross-linking to papers, evidence, and gaps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or tags..."
              className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 max-w-[160px]"
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
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {isCreating && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {editingId ? 'Edit Research Note' : 'Create New Research Note'}
          </h3>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Synthesis of Tokenizer Fragmentation Bottlenecks"
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-500 block mb-1">Link to Paper</label>
                <select
                  value={linkedPaperId}
                  onChange={(e) => setLinkedPaperId(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
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
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Tokenizer, Low-Resource, Subwords"
                className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Content (Markdown supported)
              </label>
              <textarea
                rows={6}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your research synthesis, methodology notes, or hypothesis tests..."
                className="w-full text-xs font-mono p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded hover:bg-zinc-800"
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
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    {note.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-1 text-zinc-400">
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1 hover:text-zinc-800 dark:hover:text-zinc-200"
                      title="Edit Note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 hover:text-red-600"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {note.title}
                </h3>

                {linkedPaper && (
                  <div className="text-[11px] text-zinc-500 flex items-center space-x-1">
                    <Link2 className="w-3 h-3 text-zinc-400" />
                    <span className="truncate">Linked: {linkedPaper.title}</span>
                  </div>
                )}

                <div className="prose prose-xs dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300 line-clamp-6 leading-relaxed">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                Updated {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
