'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  FileText,
  User,
  Database,
  Cpu,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Compass,
  ExternalLink,
  RefreshCw,
  Sliders,
  Table as TableIcon,
  Eye,
  EyeOff,
  Play,
  Pause,
  Crosshair,
  BookOpen,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';

export interface KnowledgeGraphProps {
  projectId: string;
  projectTitle?: string;
  papers?: any[];
  onOpenPaper?: (paperId: string) => void;
  onNavigateToEvidence?: (evidenceId?: string) => void;
  onNavigateToGaps?: () => void;
}

interface SimulatedNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

type LayoutPreset = 'force' | 'radial' | 'clustered';
type ViewMode = 'canvas' | 'directory';

// Visual styling schema for entity types
export const ENTITY_SCHEMA: Record<
  string,
  {
    label: string;
    description: string;
    color: string;
    fill: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    radius: number;
  }
> = {
  paper: {
    label: 'Academic Paper',
    description: 'Peer-reviewed research manuscripts and publications',
    color: '#3b82f6',
    fill: '#3b82f6',
    border: '#1d4ed8',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-600 dark:text-blue-400',
    icon: FileText,
    radius: 16,
  },
  author: {
    label: 'Scholar Author',
    description: 'Contributing academic researchers and investigators',
    color: '#10b981',
    fill: '#10b981',
    border: '#047857',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    icon: User,
    radius: 9,
  },
  dataset: {
    label: 'Benchmark Dataset',
    description: 'Empirical evaluation datasets, corpora, and benchmarks',
    color: '#f59e0b',
    fill: '#f59e0b',
    border: '#b45309',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-600 dark:text-amber-400',
    icon: Database,
    radius: 11,
  },
  model: {
    label: 'Neural Model',
    description: 'Architectures, transformers, and model implementations',
    color: '#8b5cf6',
    fill: '#8b5cf6',
    border: '#6d28d9',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-600 dark:text-purple-400',
    icon: Cpu,
    radius: 11,
  },
  finding: {
    label: 'Empirical Finding',
    description: 'Verified scientific results and evidence-backed claims',
    color: '#6366f1',
    fill: '#6366f1',
    border: '#4338ca',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    icon: CheckCircle2,
    radius: 12,
  },
  gap: {
    label: 'Research Gap',
    description: 'Unsolved methodological, empirical, or population vacancies',
    color: '#f43f5e',
    fill: '#f43f5e',
    border: '#be123c',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-600 dark:text-rose-400',
    icon: AlertCircle,
    radius: 13,
  },
  method: {
    label: 'Research Question',
    description: 'Investigative hypotheses and research objectives',
    color: '#06b6d4',
    fill: '#06b6d4',
    border: '#0e7490',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
    icon: HelpCircle,
    radius: 11,
  },
  topic: {
    label: 'Research Project',
    description: 'Central project scope and overarching domain hub',
    color: '#64748b',
    fill: '#64748b',
    border: '#334155',
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    badgeText: 'text-slate-600 dark:text-slate-400',
    icon: Compass,
    radius: 22,
  },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  includes_paper: 'Includes Paper',
  authored_by: 'Authored By',
  evaluates_on_dataset: 'Evaluates on Dataset',
  implements_model: 'Implements Model',
  supported_by_limitation: 'Supported by Limitation',
  reports_finding: 'Reports Finding',
  investigates_question: 'Investigates Question',
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  projectId,
  projectTitle,
  papers,
  onOpenPaper,
  onNavigateToEvidence,
  onNavigateToGaps,
}) => {
  // Data state
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState<string>(projectTitle || 'Research Project');

  // Interactive selection state
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeGraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeGraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<KnowledgeGraphEdge | null>(null);

  // View & Layout state
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('force');
  const [physicsRunning, setPhysicsRunning] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Filter state
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('all');
  const [selectedPaperScope, setSelectedPaperScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Canvas Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Simulation nodes
  const [simNodes, setSimNodes] = useState<SimulatedNode[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 650;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;

  // Fetch graph data from backend API
  const fetchGraph = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-graph?projectId=${projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to load knowledge graph: HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawNodes: KnowledgeGraphNode[] = data.nodes || [];
      const rawEdges: KnowledgeGraphEdge[] = data.edges || [];

      setNodes(rawNodes);
      setEdges(rawEdges);
      if (data.projectTitle) {
        setActiveProjectTitle(data.projectTitle);
      }

      // Initialize simulation coordinates
      initializeLayout(rawNodes, rawEdges, layoutPreset);
    } catch (err: any) {
      console.error('Failed to load knowledge graph:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [projectId, layoutPreset]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Layout initialization algorithm
  const initializeLayout = (
    rawNodes: KnowledgeGraphNode[],
    rawEdges: KnowledgeGraphEdge[],
    preset: LayoutPreset
  ) => {
    const paperNodes = rawNodes.filter((n) => n.type === 'paper');
    const paperCount = Math.max(1, paperNodes.length);

    let initialized: SimulatedNode[] = [];

    if (preset === 'radial') {
      // Concentric circles: Project at center, Papers in middle orbit, others in outer orbit
      initialized = rawNodes.map((n, i) => {
        const radius = ENTITY_SCHEMA[n.type]?.radius || 10;
        if (n.type === 'topic') {
          return { ...n, x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0, radius };
        }
        if (n.type === 'paper') {
          const pIdx = paperNodes.findIndex((p) => p.id === n.id);
          const angle = (pIdx / paperCount) * 2 * Math.PI - Math.PI / 2;
          return {
            ...n,
            x: CENTER_X + Math.cos(angle) * 180,
            y: CENTER_Y + Math.sin(angle) * 180,
            vx: 0,
            vy: 0,
            radius,
          };
        }
        // Associated entities in outer ring (radius 310)
        const angle = (i / Math.max(1, rawNodes.length)) * 2 * Math.PI;
        return {
          ...n,
          x: CENTER_X + Math.cos(angle) * 310 + (Math.random() - 0.5) * 30,
          y: CENTER_Y + Math.sin(angle) * 310 + (Math.random() - 0.5) * 30,
          vx: 0,
          vy: 0,
          radius,
        };
      });
    } else if (preset === 'clustered') {
      // Column/domain clusters
      const typeCols: Record<string, number> = {
        topic: 160,
        method: 160,
        paper: 400,
        model: 660,
        dataset: 660,
        finding: 860,
        gap: 860,
        author: 400,
      };

      const typeCounters: Record<string, number> = {};

      initialized = rawNodes.map((n) => {
        const radius = ENTITY_SCHEMA[n.type]?.radius || 10;
        const colX = typeCols[n.type] || 500;
        typeCounters[n.type] = (typeCounters[n.type] || 0) + 1;
        const count = typeCounters[n.type];
        const spacing = 46;
        const startY = 120;
        const posY = startY + count * spacing;

        return {
          ...n,
          x: colX + (n.type === 'author' ? (count % 2 === 0 ? 90 : -90) : (Math.random() - 0.5) * 20),
          y: posY,
          vx: 0,
          vy: 0,
          radius,
        };
      });
    } else {
      // Force-directed organic seed
      initialized = rawNodes.map((n, i) => {
        const radius = ENTITY_SCHEMA[n.type]?.radius || 10;
        const angle = (i / Math.max(1, rawNodes.length)) * 2 * Math.PI;
        const dist = n.type === 'topic' ? 30 : n.type === 'paper' ? 140 : 250;
        return {
          ...n,
          x: CENTER_X + Math.cos(angle) * dist + (Math.random() - 0.5) * 60,
          y: CENTER_Y + Math.sin(angle) * dist + (Math.random() - 0.5) * 60,
          vx: 0,
          vy: 0,
          radius,
        };
      });

      // Relax pre-simulation synchronously for 80 steps to avoid jumpy UI on mount
      relaxCoordinates(initialized, rawEdges, 80);
    }

    setSimNodes(initialized);
  };

  // Relaxation algorithm for spring-embedder force simulation
  const relaxCoordinates = (nodesList: SimulatedNode[], edgeList: KnowledgeGraphEdge[], steps: number) => {
    const kRepel = 4000;
    const springK = 0.04;
    const gravityK = 0.015;
    const friction = 0.85;

    const nodeIndex = new Map(nodesList.map((n) => [n.id, n]));

    for (let step = 0; step < steps; step++) {
      // 1. Repulsion between all node pairs
      for (let i = 0; i < nodesList.length; i++) {
        for (let j = i + 1; j < nodesList.length; j++) {
          const a = nodesList[i];
          const b = nodesList[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 80;
          const dist = Math.sqrt(distSq);
          const force = Math.min(kRepel / distSq, 8);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // 2. Attraction along edges
      edgeList.forEach((edge) => {
        const src = nodeIndex.get(edge.source);
        const tgt = nodeIndex.get(edge.target);
        if (!src || !tgt) return;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = edge.relationship === 'includes_paper' ? 140 : 100;
        const force = (dist - ideal) * springK;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      });

      // 3. Center gravity & boundary clamping
      nodesList.forEach((n) => {
        n.vx += (CENTER_X - n.x) * gravityK;
        n.vy += (CENTER_Y - n.y) * gravityK;

        n.vx *= friction;
        n.vy *= friction;
        n.x += n.vx;
        n.y += n.vy;

        n.x = Math.max(n.radius + 20, Math.min(CANVAS_WIDTH - n.radius - 20, n.x));
        n.y = Math.max(n.radius + 20, Math.min(CANVAS_HEIGHT - n.radius - 20, n.y));
      });
    }
  };

  // Continuous physics animation loop if enabled
  useEffect(() => {
    if (!physicsRunning || layoutPreset !== 'force' || simNodes.length === 0) return;

    let active = true;

    const loop = () => {
      if (!active) return;
      setSimNodes((prevNodes) => {
        const updated = [...prevNodes];
        relaxCoordinates(updated, edges, 1);
        return updated;
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [physicsRunning, layoutPreset, edges]);

  // Node Map for fast ID lookup
  const nodeMap = useMemo(() => new Map(simNodes.map((n) => [n.id, n])), [simNodes]);

  // Connected nodes & edges calculation for selected entity
  const connectedContext = useMemo(() => {
    if (!selectedNode) {
      return { connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<number>() };
    }
    const nodeIds = new Set<string>([selectedNode.id]);
    const edgeIds = new Set<number>();

    edges.forEach((edge, idx) => {
      if (edge.source === selectedNode.id) {
        nodeIds.add(edge.target);
        edgeIds.add(idx);
      } else if (edge.target === selectedNode.id) {
        nodeIds.add(edge.source);
        edgeIds.add(idx);
      }
    });

    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [selectedNode, edges]);

  // Filtering logic
  const filteredNodes = useMemo(() => {
    return simNodes.filter((n) => {
      // Type filter
      if (selectedType !== 'all' && n.type !== selectedType) return false;

      // Paper scope filter
      if (selectedPaperScope !== 'all') {
        const isPaperSelf = n.type === 'paper' && n.paperId === selectedPaperScope;
        const isDerivedFromPaper = n.paperId === selectedPaperScope;
        if (!isPaperSelf && !isDerivedFromPaper) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = n.label.toLowerCase().includes(q);
        const matchesDetails = n.details?.toLowerCase().includes(q) || false;
        const matchesType = n.type.toLowerCase().includes(q);
        const matchesPaper = n.paperTitle?.toLowerCase().includes(q) || false;
        if (!matchesLabel && !matchesDetails && !matchesType && !matchesPaper) return false;
      }

      return true;
    });
  }, [simNodes, selectedType, selectedPaperScope, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return edges.filter((edge, idx) => {
      // Must connect two visible nodes
      if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return false;

      // Relationship type filter
      if (selectedRelationship !== 'all' && edge.relationship !== selectedRelationship) return false;

      return true;
    });
  }, [edges, filteredNodeIds, selectedRelationship]);

  // Search autocomplete suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return simNodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
      .slice(0, 6);
  }, [simNodes, searchQuery]);

  // Node Degree (number of connections)
  const nodeDegrees = useMemo(() => {
    const deg: Record<string, number> = {};
    edges.forEach((e) => {
      deg[e.source] = (deg[e.source] || 0) + 1;
      deg[e.target] = (deg[e.target] || 0) + 1;
    });
    return deg;
  }, [edges]);

  // Canvas Viewport Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'rect') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggedNodeId) {
      // Convert client coordinates to SVG space
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Apply zoom and pan inversion
      const svgX = (clientX - pan.x) / zoom;
      const svgY = (clientY - pan.y) / zoom;

      setSimNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeId ? { ...n, x: svgX, y: svgY, vx: 0, vy: 0 } : n))
      );
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheelCanvas = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0012;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z + zoomDelta)));
  };

  // Center selected node in canvas
  const handleCenterNode = (node: KnowledgeGraphNode) => {
    const sim = nodeMap.get(node.id);
    if (!sim) return;
    const targetPanX = CENTER_X - sim.x * zoom;
    const targetPanY = CENTER_Y - sim.y * zoom;
    setPan({ x: targetPanX, y: targetPanY });
  };

  // Fit view to all visible nodes
  const handleFitToScreen = () => {
    if (filteredNodes.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    filteredNodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const boxW = Math.max(100, maxX - minX + 160);
    const boxH = Math.max(100, maxY - minY + 160);

    const fitScale = Math.min(CANVAS_WIDTH / boxW, CANVAS_HEIGHT / boxH, 1.4);
    const newZoom = Math.max(0.4, fitScale);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(newZoom);
    setPan({
      x: CANVAS_WIDTH / 2 - midX * newZoom,
      y: CANVAS_HEIGHT / 2 - midY * newZoom,
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedRelationship('all');
    setSelectedPaperScope('all');
    setSearchQuery('');
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  return (
    <div className="space-y-4 max-w-full font-sans">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-[#0f1422] p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Network className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <span>Interactive Research Knowledge Graph</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  <Lock className="w-2.5 h-2.5 text-zinc-400" />
                  <span>Project Scope</span>
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Investigating {nodes.length} relational entities and {edges.length} grounded links for{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">"{activeProjectTitle}"</span>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'canvas'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Interactive Visual Canvas"
            >
              <Network className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'directory'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Accessible Table Directory"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Entity Directory</span>
            </button>
          </div>

          {/* Refresh Graph */}
          <button
            onClick={() => fetchGraph()}
            disabled={loading}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition-colors disabled:opacity-50"
            title="Reload Knowledge Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Control & Filter Ribbon */}
      <div className="bg-white dark:bg-[#0f1422] p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Side: Search & Primary Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Entity Search with Suggestions */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search entities, topics, models..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {isSearchOpen && searchSuggestions.length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {searchSuggestions.map((sug) => {
                  const schema = ENTITY_SCHEMA[sug.type] || ENTITY_SCHEMA.topic;
                  const Icon = schema.icon;
                  return (
                    <button
                      key={sug.id}
                      onClick={() => {
                        setSelectedNode(sug);
                        handleCenterNode(sug);
                        setIsSearchOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: schema.color }} />
                        <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium text-xs">
                          {sug.label}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${schema.badgeBg} ${schema.badgeText}`}>
                        {sug.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Entity Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Entity Types ({nodes.length})</option>
            <option value="paper">Papers ({nodes.filter((n) => n.type === 'paper').length})</option>
            <option value="author">Authors ({nodes.filter((n) => n.type === 'author').length})</option>
            <option value="dataset">Datasets ({nodes.filter((n) => n.type === 'dataset').length})</option>
            <option value="model">Models ({nodes.filter((n) => n.type === 'model').length})</option>
            <option value="gap">Research Gaps ({nodes.filter((n) => n.type === 'gap').length})</option>
            <option value="finding">Findings ({nodes.filter((n) => n.type === 'finding').length})</option>
            <option value="method">Research Questions ({nodes.filter((n) => n.type === 'method').length})</option>
          </select>

          {/* Relationship Filter */}
          <select
            value={selectedRelationship}
            onChange={(e) => setSelectedRelationship(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Relationships ({edges.length})</option>
            {Object.entries(RELATIONSHIP_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label} ({edges.filter((e) => e.relationship === k).length})
              </option>
            ))}
          </select>

          {/* Paper Subgraph Filter */}
          {papers && papers.length > 0 && (
            <select
              value={selectedPaperScope}
              onChange={(e) => setSelectedPaperScope(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] truncate"
            >
              <option value="all">All Paper Subgraphs</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  Paper: {p.title.replace(/^\[DEMO.*?\]\s*/i, '').substring(0, 26)}...
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters Pill */}
          {(selectedType !== 'all' || selectedRelationship !== 'all' || selectedPaperScope !== 'all' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Right Side: Layout Preset & Physics Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'canvas' && (
            <>
              {/* Layout Preset Selector */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-0.5">
                <button
                  onClick={() => {
                    setLayoutPreset('force');
                    initializeLayout(nodes, edges, 'force');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    layoutPreset === 'force'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Organic Force-Directed Layout"
                >
                  Organic
                </button>
                <button
                  onClick={() => {
                    setLayoutPreset('radial');
                    initializeLayout(nodes, edges, 'radial');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    layoutPreset === 'radial'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Radial Concentric Orbit"
                >
                  Radial
                </button>
                <button
                  onClick={() => {
                    setLayoutPreset('clustered');
                    initializeLayout(nodes, edges, 'clustered');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    layoutPreset === 'clustered'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Domain Clustered Columns"
                >
                  Clustered
                </button>
              </div>

              {/* Physics Simulation Play/Pause */}
              {layoutPreset === 'force' && (
                <button
                  onClick={() => setPhysicsRunning((p) => !p)}
                  className={`p-1.5 border rounded-xl transition-colors ${
                    physicsRunning
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                  title={physicsRunning ? 'Pause Physics Simulation' : 'Run Physics Simulation'}
                >
                  {physicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Toggle Label Density */}
              <button
                onClick={() => setShowAllLabels((s) => !s)}
                className={`p-1.5 border rounded-xl transition-colors ${
                  showAllLabels
                    ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
                title={showAllLabels ? 'Hide Labels' : 'Show All Labels'}
              >
                {showAllLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Main Workspace Area */}
      {viewMode === 'canvas' ? (
        <div className="relative bg-[#090d16] dark:bg-[#070a12] rounded-2xl border border-zinc-800/90 overflow-hidden shadow-2xl h-[620px] select-none">
          {/* Subtle Deep Space Dot Matrix Grid */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Floating Zoom & Canvas Controls */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800/90 rounded-2xl p-1.5 shadow-2xl">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2 py-1 hover:bg-zinc-800 rounded-xl text-zinc-300 text-[10px] font-mono font-medium transition-colors"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-300 transition-colors"
              title="Fit Graph to Viewport"
              aria-label="Fit to Viewport"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {selectedNode && (
              <button
                onClick={() => handleCenterNode(selectedNode)}
                className="p-1.5 hover:bg-zinc-800 rounded-xl text-blue-400 transition-colors"
                title="Center Camera on Selected Node"
                aria-label="Center Selected Node"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Floating Collapsible Schema Legend */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/90 rounded-2xl p-3 text-xs shadow-2xl max-w-xs transition-all">
              <div
                onClick={() => setIsLegendOpen((o) => !o)}
                className="flex items-center justify-between cursor-pointer text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 select-none"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>Entity Legend ({filteredNodes.length}/{nodes.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500">{isLegendOpen ? '▲' : '▼'}</span>
              </div>

              {isLegendOpen && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 space-y-1.5 animate-in fade-in duration-200">
                  {Object.entries(ENTITY_SCHEMA).map(([key, schema]) => {
                    const count = nodes.filter((n) => n.type === key).length;
                    const isFiltered = selectedType === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedType(isFiltered ? 'all' : key)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-colors ${
                          isFiltered ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10 shrink-0"
                            style={{ backgroundColor: schema.fill }}
                          />
                          <span className="text-[11px] font-sans">{schema.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Floating Hover Tooltip */}
          {hoveredNode && !selectedNode && (() => {
            const hoveredSim = nodeMap.get(hoveredNode.id);
            const posX = hoveredSim ? hoveredSim.x : CENTER_X;
            const posY = hoveredSim ? hoveredSim.y : CENTER_Y;
            return (
              <div
                className="absolute pointer-events-none z-30 bg-zinc-950/95 border border-zinc-700/80 rounded-xl p-2.5 shadow-2xl max-w-xs text-xs space-y-1 animate-in fade-in duration-150"
                style={{
                  left: Math.min(CANVAS_WIDTH - 240, Math.max(20, posX * zoom + pan.x + 15)),
                  top: Math.min(CANVAS_HEIGHT - 100, Math.max(20, posY * zoom + pan.y + 15)),
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: ENTITY_SCHEMA[hoveredNode.type]?.color + '25',
                      color: ENTITY_SCHEMA[hoveredNode.type]?.color,
                    }}
                  >
                    {hoveredNode.type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {nodeDegrees[hoveredNode.id] || 0} links
                  </span>
                </div>
                <p className="font-semibold text-zinc-100 text-xs leading-snug line-clamp-2">
                  {hoveredNode.label}
                </p>
                {hoveredNode.details && (
                  <p className="text-zinc-400 text-[11px] line-clamp-2">{hoveredNode.details}</p>
                )}
              </div>
            );
          })()}

          {/* Selected Entity Contextual Detail Drawer */}
          {selectedNode && (
            <div className="absolute top-4 right-4 bottom-4 z-30 w-80 sm:w-96 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-4 sm:p-5 text-xs shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-4 duration-200">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md font-bold"
                      style={{
                        backgroundColor: ENTITY_SCHEMA[selectedNode.type]?.fill + '25',
                        color: ENTITY_SCHEMA[selectedNode.type]?.fill,
                      }}
                    >
                      {ENTITY_SCHEMA[selectedNode.type]?.label || selectedNode.type}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {nodeDegrees[selectedNode.id] || 0} Grounded Links
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Close Details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Entity Title */}
                <div>
                  <h3 className="font-bold text-zinc-100 text-sm leading-snug">
                    {selectedNode.label}
                  </h3>
                  {selectedNode.details && (
                    <p className="text-zinc-300 text-xs mt-2 leading-relaxed whitespace-pre-line bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60">
                      {selectedNode.details}
                    </p>
                  )}
                </div>

                {/* Type-Specific Provenance Details */}
                {selectedNode.type === 'paper' && (
                  <div className="space-y-2.5 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-400 block">
                      Publication Metadata
                    </span>
                    {selectedNode.authors && selectedNode.authors.length > 0 && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Authors: </span>
                        {selectedNode.authors.join(', ')}
                      </div>
                    )}
                    {selectedNode.publicationYear && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Year: </span>
                        {selectedNode.publicationYear}
                      </div>
                    )}
                    {selectedNode.venue && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Venue: </span>
                        {selectedNode.venue}
                      </div>
                    )}
                    {selectedNode.doi && (
                      <div className="text-zinc-300 text-[11px] flex items-center gap-1.5 truncate">
                        <span className="text-zinc-400">DOI: </span>
                        <a
                          href={`https://doi.org/${selectedNode.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center gap-1 font-mono text-[10px] truncate"
                        >
                          <span>{selectedNode.doi}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.type === 'finding' && (
                  <div className="space-y-2 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-400 block">
                      Empirical Grounding
                    </span>
                    {selectedNode.paperTitle && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Source Manuscript: </span>
                        {selectedNode.paperTitle}
                      </div>
                    )}
                    {selectedNode.location && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Location: </span>
                        {selectedNode.location}
                      </div>
                    )}
                    {selectedNode.confidence && (
                      <div className="text-zinc-300 text-[11px]">
                        <span className="text-zinc-400">Confidence Score: </span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {(selectedNode.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.type === 'gap' && (
                  <div className="space-y-2 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-400 block">
                      Gap Investigation
                    </span>
                    <p className="text-zinc-300 text-[11px]">
                      Identified from repeated author limitations across peer-reviewed corpus.
                    </p>
                  </div>
                )}

                {/* Connected Subgraph Entities List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Direct Connections ({connectedContext.connectedNodeIds.size - 1})
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {Array.from(connectedContext.connectedNodeIds)
                      .filter((id) => id !== selectedNode.id)
                      .map((id) => {
                        const connNode = nodeMap.get(id);
                        if (!connNode) return null;
                        const schema = ENTITY_SCHEMA[connNode.type] || ENTITY_SCHEMA.topic;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedNode(connNode);
                              handleCenterNode(connNode);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/60 text-left transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: schema.fill }}
                              />
                              <span className="text-zinc-200 text-xs font-medium truncate">
                                {connNode.label}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase shrink-0">
                              {connNode.type}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                {selectedNode.type === 'paper' && selectedNode.paperId && onOpenPaper && (
                  <button
                    onClick={() => onOpenPaper(selectedNode.paperId!)}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open in Paper Reader</span>
                  </button>
                )}

                {selectedNode.type === 'finding' && onNavigateToEvidence && (
                  <button
                    onClick={() => onNavigateToEvidence(selectedNode.evidenceId)}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inspect in Evidence Engine</span>
                  </button>
                )}

                {selectedNode.type === 'gap' && onNavigateToGaps && (
                  <button
                    onClick={() => onNavigateToGaps()}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Inspect in Research Gap Engine</span>
                  </button>
                )}

                <button
                  onClick={() => handleCenterNode(selectedNode)}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Center in Canvas</span>
                </button>
              </div>
            </div>
          )}

          {/* Selected Edge Inspection Drawer */}
          {selectedEdge && !selectedNode && (
            <div className="absolute top-4 right-4 z-30 w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-4 text-xs shadow-2xl space-y-3 animate-in slide-in-from-right-2 duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                  Relationship Inspector
                </span>
                <button
                  onClick={() => setSelectedEdge(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400">Relationship Type</span>
                <h4 className="font-semibold text-zinc-100 text-sm mt-0.5">
                  {RELATIONSHIP_LABELS[selectedEdge.relationship] || selectedEdge.relationship}
                </h4>
              </div>

              <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block">Source Entity</span>
                  <span className="font-medium text-zinc-200 text-xs">
                    {nodeMap.get(selectedEdge.source)?.label || selectedEdge.source}
                  </span>
                </div>
                <div className="flex items-center justify-center text-zinc-500">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block">Target Entity</span>
                  <span className="font-medium text-zinc-200 text-xs">
                    {nodeMap.get(selectedEdge.target)?.label || selectedEdge.target}
                  </span>
                </div>
              </div>

              {selectedEdge.evidenceSnippet && (
                <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 block font-semibold mb-1">
                    Supporting Evidence
                  </span>
                  <p className="text-zinc-300 text-[11px] italic">"{selectedEdge.evidenceSnippet}"</p>
                </div>
              )}
            </div>
          )}

          {/* Interactive SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onWheel={handleWheelCanvas}
          >
            {/* Background Rect to capture all clicks */}
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="transparent" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              <g>
                {filteredEdges.map((edge, idx) => {
                  const src = nodeMap.get(edge.source);
                  const tgt = nodeMap.get(edge.target);
                  if (!src || !tgt) return null;

                  const isConnectedToSelected =
                    selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                  const isSelectedEdge = selectedEdge === edge;

                  let strokeColor = '#334155';
                  let strokeWidth = 1.2;
                  let strokeOpacity = 0.6;

                  if (isConnectedToSelected || isSelectedEdge) {
                    strokeColor = '#60a5fa';
                    strokeWidth = 2.4;
                    strokeOpacity = 1;
                  } else if (selectedNode) {
                    strokeOpacity = 0.12;
                  }

                  const isDashed = edge.relationship === 'supported_by_limitation';
                  const isDotted = edge.relationship === 'reports_finding';

                  return (
                    <line
                      key={`edge-${idx}`}
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={isDashed ? '4 3' : isDotted ? '2 2' : undefined}
                      className="transition-colors duration-150 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                        setSelectedNode(null);
                      }}
                      onMouseEnter={() => setHoveredEdge(edge)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {filteredNodes.map((node) => {
                  const schema = ENTITY_SCHEMA[node.type] || ENTITY_SCHEMA.topic;
                  const isSelected = selectedNode?.id === node.id;
                  const isConnected = connectedContext.connectedNodeIds.has(node.id);
                  const isDimmed = selectedNode && !isSelected && !isConnected;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                        setSelectedEdge(null);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedNodeId(node.id);
                      }}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                      opacity={isDimmed ? 0.15 : 1}
                      style={{ transition: 'opacity 0.2s ease-in-out' }}
                    >
                      {/* Selection Glow / Outer Ring */}
                      {isSelected && (
                        <circle
                          r={node.radius + 6}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                          className="animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r={node.radius}
                        fill={schema.fill}
                        stroke={isSelected ? '#ffffff' : schema.border}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all hover:scale-125"
                      />

                      {/* Node Label */}
                      {(showAllLabels || isSelected || node.type === 'topic' || node.type === 'paper') && (
                        <text
                          y={node.radius + 13}
                          textAnchor="middle"
                          fill="#f1f5f9"
                          fontSize="9.5px"
                          fontFamily="ui-monospace, SFMono-Regular, monospace"
                          className="select-none pointer-events-none font-medium drop-shadow-md"
                          stroke="#090d16"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>

          {/* Empty Matching Filter State Overlay */}
          {filteredNodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-zinc-950/80 backdrop-blur-xs">
              <Compass className="w-10 h-10 text-zinc-500 mb-3" />
              <h4 className="text-sm font-semibold text-zinc-200">No Matching Entities Found</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                No entities match your current search and filter criteria in project "{activeProjectTitle}".
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 4. Accessible Entity Directory / Table View */
        <div className="bg-white dark:bg-[#0f1422] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-500" />
                <span>Entity Directory & Topology Index</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Tabular index of {filteredNodes.length} accessible entities in project "{activeProjectTitle}".
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              Showing {filteredNodes.length} of {nodes.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-200 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Entity Name / Label</th>
                  <th className="px-4 py-3">Connected Links</th>
                  <th className="px-4 py-3">Source Manuscript</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans">
                {filteredNodes.map((n) => {
                  const schema = ENTITY_SCHEMA[n.type] || ENTITY_SCHEMA.topic;
                  const Icon = schema.icon;
                  return (
                    <tr
                      key={n.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${schema.badgeBg} ${schema.badgeText}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{schema.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs sm:max-w-md truncate font-medium text-zinc-900 dark:text-zinc-100">
                        <div>
                          <span>{n.label}</span>
                          {n.details && (
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{n.details}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {nodeDegrees[n.id] || 0} edges
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {n.paperTitle || 'Project Core'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => {
                            setSelectedNode(n);
                            setViewMode('canvas');
                            handleCenterNode(n);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          Focus in Canvas
                        </button>
                        {n.type === 'paper' && n.paperId && onOpenPaper && (
                          <button
                            onClick={() => onOpenPaper(n.paperId!)}
                            className="px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors"
                          >
                            Open Paper
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
      )}
    </div>
  );
};
