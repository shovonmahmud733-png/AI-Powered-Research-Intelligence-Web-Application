'use client';

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { ResearchProject } from '@/lib/db/types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: ResearchProject) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [field, setField] = useState('Computational Linguistics & NLP');
  const [questions, setQuestions] = useState('');
  const [objectives, setObjectives] = useState('');
  const [tags, setTags] = useState('NLP, Low-Resource, Transformers');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const qList = questions
        .split('\n')
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      const objList = objectives
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          researchField: field,
          researchQuestions: qList,
          objectives: objList,
          tags: tagList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onCreated(data.project);
        onClose();
        setTitle('');
        setDescription('');
        setQuestions('');
        setObjectives('');
      } else {
        alert(data.error || 'Failed to create project');
      }
    } catch (err) {
      alert('Network error creating project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <FolderPlus className="w-4 h-4 text-zinc-500" />
            <span>Create New Research Project</span>
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-500 block mb-1">
              Project Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Low-Resource Indic Dialectal NLP & Morphology"
              className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Research Field / Discipline
              </label>
              <input
                type="text"
                required
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-500 block mb-1">
              Project Overview / Abstract
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of research scope, hypotheses, and intended contributions..."
              className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-500 block mb-1">
              Primary Research Questions (One per line)
            </label>
            <textarea
              rows={3}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Does subword tokenization preserve dialectal morphemes?&#10;How does fine-tuned XLM-R compare to BanglaBERT?"
              className="w-full text-xs p-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium rounded hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? 'Initializing...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
