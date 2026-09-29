'use client';

import React, { useEffect, useState } from 'react';
import { LiteratureMatrixRow } from '@/lib/db/types';
import {
  Table,
  Plus,
  Trash2,
  Download,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface LiteratureMatrixProps {
  projectId: string;
}

export const LiteratureMatrix: React.FC<LiteratureMatrixProps> = ({ projectId }) => {
  const [rows, setRows] = useState<LiteratureMatrixRow[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<LiteratureMatrixRow>>({});
  const [loading, setLoading] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matrix?projectId=${projectId}`);
      const data = await res.json();
      const loadedRows: LiteratureMatrixRow[] = data.rows || [];
      setRows(loadedRows);

      // Collect custom column names
      const cols = new Set<string>();
      loadedRows.forEach((r) => {
        if (r.customColumns) {
          Object.keys(r.customColumns).forEach((k) => cols.add(k));
        }
      });
      setCustomColumns(Array.from(cols));
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMatrix();
  }, [projectId]);

  const handleStartEdit = (row: LiteratureMatrixRow) => {
    setEditingRowId(row.id);
    setEditingValues({ ...row, customColumns: { ...(row.customColumns || {}) } });
  };

  const handleSaveEdit = async () => {
    if (!editingRowId) return;
    try {
      const res = await fetch('/api/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingValues),
      });

      if (res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === editingRowId ? ({ ...r, ...editingValues } as LiteratureMatrixRow) : r))
        );
        setEditingRowId(null);
      }
    } catch (err) {
      alert('Failed to save matrix edits');
    }
  };

  const handleAddCustomColumn = () => {
    const col = newColumnName.trim();
    if (!col || customColumns.includes(col)) return;
    setCustomColumns((prev) => [...prev, col]);
    setNewColumnName('');
  };

  const exportCSV = () => {
    const headers = ['Paper', 'Year', 'Dataset', 'Model', 'Language', 'Method', 'Metric', 'Result', 'Limitation', ...customColumns];
    const csvRows = [headers.join(',')];

    for (const r of rows) {
      const standard = [
        `"${r.paperTitle.replace(/"/g, '""')}"`,
        r.year,
        `"${r.dataset.replace(/"/g, '""')}"`,
        `"${r.model.replace(/"/g, '""')}"`,
        `"${r.language.replace(/"/g, '""')}"`,
        `"${r.method.replace(/"/g, '""')}"`,
        `"${r.metric.replace(/"/g, '""')}"`,
        `"${r.result.replace(/"/g, '""')}"`,
        `"${r.limitation.replace(/"/g, '""')}"`,
      ];
      const custom = customColumns.map((c) => `"${(r.customColumns?.[c] || '').replace(/"/g, '""')}"`);
      csvRows.push([...standard, ...custom].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `literature_matrix_${projectId}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Table className="w-4 h-4 text-zinc-500" />
            <span>Literature Matrix & Synthesis Grid</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Normalized comparative tabular representation. Edit extracted cells inline to maintain researcher oversight.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Add custom column input */}
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="New column name..."
              className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-zinc-800 dark:text-zinc-200 max-w-[150px]"
            />
            <button
              onClick={handleAddCustomColumn}
              className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md text-xs"
              title="Add Custom Column"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-md text-xs font-medium hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <th className="p-3 min-w-[200px]">Paper</th>
              <th className="p-3 w-16">Year</th>
              <th className="p-3 min-w-[140px]">Dataset</th>
              <th className="p-3 min-w-[140px]">Model</th>
              <th className="p-3 min-w-[110px]">Language</th>
              <th className="p-3 min-w-[140px]">Method</th>
              <th className="p-3 min-w-[110px]">Metric</th>
              <th className="p-3 min-w-[160px]">Result</th>
              <th className="p-3 min-w-[180px]">Limitation</th>
              {customColumns.map((col) => (
                <th key={col} className="p-3 min-w-[140px] text-purple-600 dark:text-purple-400 font-mono">
                  {col}
                </th>
              ))}
              <th className="p-3 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {rows.map((row) => {
              const isEditing = editingRowId === row.id;

              return (
                <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs">
                    {row.paperTitle}
                  </td>
                  <td className="p-3 font-mono text-zinc-500">{row.year}</td>

                  {/* Dataset */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.dataset || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, dataset: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950"
                      />
                    ) : (
                      <span className="text-zinc-700 dark:text-zinc-300">{row.dataset}</span>
                    )}
                  </td>

                  {/* Model */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.model || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, model: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950"
                      />
                    ) : (
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">{row.model}</span>
                    )}
                  </td>

                  {/* Language */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.language || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, language: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950"
                      />
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400">{row.language}</span>
                    )}
                  </td>

                  {/* Method */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.method || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, method: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950"
                      />
                    ) : (
                      <span className="text-zinc-700 dark:text-zinc-300">{row.method}</span>
                    )}
                  </td>

                  {/* Metric */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.metric || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, metric: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950 font-mono"
                      />
                    ) : (
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">{row.metric}</span>
                    )}
                  </td>

                  {/* Result */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.result || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, result: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950 font-medium"
                      />
                    ) : (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">{row.result}</span>
                    )}
                  </td>

                  {/* Limitation */}
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValues.limitation || ''}
                        onChange={(e) => setEditingValues({ ...editingValues, limitation: e.target.value })}
                        className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950 text-amber-700"
                      />
                    ) : (
                      <span className="text-zinc-500 italic">{row.limitation}</span>
                    )}
                  </td>

                  {/* Custom Columns */}
                  {customColumns.map((col) => (
                    <td key={col} className="p-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.customColumns?.[col] || ''}
                          onChange={(e) =>
                            setEditingValues({
                              ...editingValues,
                              customColumns: {
                                ...(editingValues.customColumns || {}),
                                [col]: e.target.value,
                              },
                            })
                          }
                          className="w-full p-1 border rounded text-xs bg-zinc-50 dark:bg-zinc-950"
                        />
                      ) : (
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {row.customColumns?.[col] || '—'}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* Row Actions */}
                  <td className="p-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Save Changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRowId(null)}
                          className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(row)}
                        className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded"
                        title="Edit Values"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
