'use client';

import React, { useEffect, useState } from 'react';
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
  Layers,
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
    paper: { bg: 'bg-blue-500/10', text: 'text-blue-500', fill: '#3b82f6', border: '#2563eb' },
    author: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', fill: '#10b981', border: '#059669' },
    dataset: { bg: 'bg-amber-500/10', text: 'text-amber-500', fill: '#f59e0b', border: '#d97706' },
    model: { bg: 'bg-purple-500/10', text: 'text-purple-500', fill: '#8b5cf6', border: '#7c3aed' },
    topic: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', fill: '#64748b', border: '#475569' },
    gap: { bg: 'bg-rose-500/10', text: 'text-rose-500', fill: '#f43f5e', border: '#e11d48' },
    method: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', fill: '#06b6d4', border: '#0891b2' },
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
      <div className="bg-white dark:bg-[#0f1422] p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              <Network className="w-4 h-4" />
            </span>
            <span>Interactive Research Knowledge Graph</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Relational topology connecting {nodes.length} entities and {edges.length} relationships across papers, datasets, models, and authors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 w-36 sm:w-44 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
          >
            <option value="all">All Entity Types ({nodes.length})</option>
            <option value="paper">Papers</option>
            <option value="author">Authors</option>
            <option value="model">Models</option>
            <option value="dataset">Datasets</option>
            <option value="gap">Research Gaps</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-0.5 bg-zinc-50 dark:bg-zinc-950">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="p-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="relative bg-[#090d16] rounded-2xl border border-zinc-800/90 overflow-hidden shadow-inner h-[580px]">
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/90 p-3 rounded-xl text-[10px] space-y-1.5 font-mono shadow-xl">
          <div className="font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Entity Schema
          </div>
          {Object.entries(typeColors).map(([t, color]) => (
            <div key={t} className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10" style={{ backgroundColor: color.fill }} />
              <span className="capitalize text-zinc-300 font-medium">{t}</span>
            </div>
          ))}
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-10 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/90 p-4 rounded-2xl max-w-xs text-xs space-y-3 shadow-2xl animate-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <span
                className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold"
                style={{
                  backgroundColor: typeColors[selectedNode.type]?.fill + '25',
                  color: typeColors[selectedNode.type]?.fill,
                }}
              >
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-100 text-sm leading-snug">{selectedNode.label}</h4>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
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
                  stroke="#334155"
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
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
                    fill="#94a3b8"
                    fontSize="9px"
                    fontFamily="monospace"
                    className="select-none pointer-events-none font-medium"
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
