'use client';

import React, { useEffect, useState, useRef } from 'react';
import { KnowledgeGraphNode, KnowledgeGraphEdge } from '@/lib/db/types';
import {
  Network,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  X,
} from 'lucide-react';

interface KnowledgeGraphProps {
  projectId: string;
}

interface SimulatedNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ projectId }) => {
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeGraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);

  // Canvas / SVG state
  const [zoom, setZoom] = useState(1);
  const [simNodes, setSimNodes] = useState<SimulatedNode[]>([]);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-graph?projectId=${projectId}`);
      const data = await res.json();
      const rawNodes: KnowledgeGraphNode[] = data.nodes || [];
      const rawEdges: KnowledgeGraphEdge[] = data.edges || [];
      setNodes(rawNodes);
      setEdges(rawEdges);

      // Initialize layout in a circular / physics space
      const width = 800;
      const height = 500;
      const centerX = width / 2;
      const centerY = height / 2;

      const initialSim: SimulatedNode[] = rawNodes.map((n, i) => {
        const angle = (i / Math.max(1, rawNodes.length)) * 2 * Math.PI;
        const radius = n.type === 'topic' ? 30 : n.type === 'paper' ? 140 : 240;
        return {
          ...n,
          x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
        };
      });

      setSimNodes(initialSim);
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchGraph();
  }, [projectId]);

  const typeColors: Record<string, { bg: string; text: string; fill: string; border: string }> = {
    paper: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-800 dark:text-blue-200', fill: '#3b82f6', border: '#2563eb' },
    author: { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-200', fill: '#10b981', border: '#059669' },
    dataset: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-200', fill: '#f59e0b', border: '#d97706' },
    model: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-800 dark:text-purple-200', fill: '#8b5cf6', border: '#7c3aed' },
    topic: { bg: 'bg-zinc-200 dark:bg-zinc-800', text: 'text-zinc-900 dark:text-zinc-100', fill: '#4b5563', border: '#1f2937' },
    gap: { bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-800 dark:text-rose-200', fill: '#f43f5e', border: '#e11d48' },
    method: { bg: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-800 dark:text-cyan-200', fill: '#06b6d4', border: '#0891b2' },
  };

  const filteredNodes = simNodes.filter((n) => {
    const matchesType = selectedType === 'all' || n.type === selectedType;
    const matchesSearch = searchQuery
      ? n.label.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Network className="w-4 h-4 text-zinc-500" />
            <span>Interactive Research Knowledge Graph</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Constructed from verified relational database records connecting {nodes.length} entities and {edges.length} relationships.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph entities..."
              className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 max-w-[160px]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
          >
            <option value="all">All Entity Types ({nodes.length})</option>
            <option value="paper">Papers</option>
            <option value="author">Authors</option>
            <option value="model">Models</option>
            <option value="dataset">Datasets</option>
            <option value="gap">Research Gaps</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-zinc-50 dark:bg-zinc-950">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-600"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-inner h-[560px]">
        {/* Legend */}
        <div className="absolute top-3 left-3 z-10 bg-zinc-900/90 backdrop-blur-xs border border-zinc-800 p-2.5 rounded-lg text-[10px] space-y-1.5 font-mono">
          <div className="font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Entity Schema
          </div>
          {Object.entries(typeColors).map(([t, color]) => (
            <div key={t} className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
              <span className="capitalize text-zinc-300">{t}</span>
            </div>
          ))}
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-10 bg-zinc-900/95 backdrop-blur-xs border border-zinc-800 p-4 rounded-xl max-w-xs text-xs space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold"
                style={{
                  backgroundColor: typeColors[selectedNode.type]?.fill + '25',
                  color: typeColors[selectedNode.type]?.fill,
                }}
              >
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-100 text-sm">{selectedNode.label}</h4>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                {selectedNode.details || 'Relational entity indexed in project knowledge graph.'}
              </p>
            </div>
          </div>
        )}

        {/* SVG Render */}
        <svg
          className="w-full h-full cursor-grab active:cursor-grabbing"
          viewBox="0 0 800 500"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Edges */}
          <g>
            {edges.map((edge, idx) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              return (
                <line
                  key={idx}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#374151"
                  strokeWidth="1.2"
                  strokeDasharray={edge.relationship.includes('gap') ? '3 3' : undefined}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {filteredNodes.map((node) => {
              const color = typeColors[node.type] || typeColors.topic;
              const isSelected = selectedNode?.id === node.id;
              const radius = node.type === 'topic' ? 14 : node.type === 'paper' ? 10 : 8;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer transition-transform hover:scale-125"
                >
                  <circle
                    r={radius}
                    fill={color.fill}
                    stroke={isSelected ? '#ffffff' : color.border}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all"
                  />
                  <text
                    y={radius + 12}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="9px"
                    fontFamily="monospace"
                    className="select-none pointer-events-none"
                  >
                    {node.label.substring(0, 18)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
