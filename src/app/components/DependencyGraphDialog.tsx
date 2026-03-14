import { useEffect, useRef, useState } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { DependencyService, DependencyGraph } from '../services/DependencyService';
import { Source, Model } from '../types';
import * as dagre from 'dagre';
import styles from './form-controls.module.css';

interface GraphNode {
  id: string;
  name: string;
  type: 'source' | 'model';
  isStale?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
}

type ViewMode = 'all' | 'current-upstream' | 'current-downstream';

function buildGraphData(
  graph: DependencyGraph,
  sources: Source[],
  models: Model[],
  viewMode: ViewMode,
  currentModelId: string | null
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create lookup maps for names
  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
  const modelMap = new Map(models.map((m) => [m.id, { name: m.name, isStale: m.isStale }]));

  // Determine which nodes to include based on view mode
  let nodeIdsToInclude = new Set<string>();

  if (viewMode === 'all') {
    // Include all nodes
    nodeIdsToInclude = new Set(graph.nodes.keys());
  } else if (viewMode === 'current-upstream' && currentModelId) {
    // Include current model and all its dependencies (upstream)
    nodeIdsToInclude.add(currentModelId);
    const deps = DependencyService.getDependencies(graph, currentModelId);
    deps.forEach((id) => nodeIdsToInclude.add(id));

    // Recursively add dependencies of dependencies
    const visited = new Set<string>();
    const queue = [...deps];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      nodeIdsToInclude.add(id);
      const moreDeps = DependencyService.getDependencies(graph, id);
      queue.push(...moreDeps);
    }
  } else if (viewMode === 'current-downstream' && currentModelId) {
    // Include current model and all its dependents (downstream)
    nodeIdsToInclude.add(currentModelId);
    const dependents = DependencyService.getAllDependents(graph, currentModelId);
    dependents.forEach((id) => nodeIdsToInclude.add(id));
  }

  // Build nodes
  for (const [id, node] of graph.nodes) {
    if (!nodeIdsToInclude.has(id)) continue;

    if (node.type === 'source') {
      const name = sourceMap.get(id) || id;
      nodes.push({ id, name, type: 'source' });
    } else {
      const modelInfo = modelMap.get(id);
      const name = modelInfo?.name || id;
      nodes.push({
        id,
        name,
        type: 'model',
        isStale: modelInfo?.isStale || false,
      });
    }
  }

  // Build edges (only between included nodes)
  for (const [nodeId, node] of graph.nodes) {
    if (!nodeIdsToInclude.has(nodeId)) continue;

    for (const depId of node.dependencies) {
      if (nodeIdsToInclude.has(depId)) {
        edges.push({ source: depId, target: nodeId });
      }
    }
  }

  return { nodes, edges };
}

function renderGraph(
  container: HTMLElement,
  nodes: GraphNode[],
  edges: GraphEdge[],
  currentModelId: string | null
): void {
  // Create dagre graph with hierarchical layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR', // Left to right (horizontal)
    nodesep: 60,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre
  nodes.forEach((node) => {
    g.setNode(node.id, {
      label: node.name,
      width: 140,
      height: 60,
    });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Compute layout
  dagre.layout(g);

  // Get graph dimensions
  const graphInfo = g.graph();
  const width = (graphInfo.width || 800) + 80;
  const height = (graphInfo.height || 400) + 80;

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.style.display = 'block';
  svg.style.margin = '0 auto';

  // Create container group
  const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(svgGroup);

  // Draw edges (arrows)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
  arrowPath.setAttribute('fill', '#999');
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.insertBefore(defs, svgGroup);

  g.edges().forEach((e) => {
    const edge = g.edge(e);
    const points = edge.points;

    // Create path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#999');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svgGroup.appendChild(path);
  });

  // Draw nodes
  g.nodes().forEach((nodeId) => {
    const node = g.node(nodeId);
    const data = nodes.find((n) => n.id === nodeId)!;
    const isCurrentModel = nodeId === currentModelId;

    // Node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'graph-node');
    nodeGroup.style.cursor = 'default';

    // Node rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (node.x - node.width / 2).toString());
    rect.setAttribute('y', (node.y - node.height / 2).toString());
    rect.setAttribute('width', node.width.toString());
    rect.setAttribute('height', node.height.toString());
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', data.type === 'source' ? '#fdb833' : '#1789fc');
    rect.setAttribute('stroke', isCurrentModel ? '#333' : '#fff');
    rect.setAttribute('stroke-width', isCurrentModel ? '4' : '3');

    if (data.isStale) {
      rect.setAttribute('opacity', '0.5');
    }

    nodeGroup.appendChild(rect);

    // Node label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.x.toString());
    text.setAttribute('y', node.y.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('pointer-events', 'none');

    // Truncate long names
    let displayName = data.name;
    if (displayName.length > 15) {
      displayName = displayName.substring(0, 13) + '...';
    }
    text.textContent = displayName;

    // Add title for full name on hover
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = data.name;
    nodeGroup.appendChild(title);

    nodeGroup.appendChild(text);
    svgGroup.appendChild(nodeGroup);
  });

  // Clear container and add SVG
  container.innerHTML = '';
  container.appendChild(svg);
}

export function DependencyGraphDialog() {
  const svgRef = useRef<HTMLDivElement>(null);
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;
  const activeModel = AppStore.activeModel.value;
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  useEffect(() => {
    if (!svgRef.current) return;

    // Build dependency graph
    const graph = DependencyService.buildGraph(sources, models);
    const currentModelId = activeModel?.id || null;
    const { nodes, edges } = buildGraphData(graph, sources, models, viewMode, currentModelId);

    // Check if there's any data
    if (nodes.length === 0) {
      svgRef.current.innerHTML =
        '<div style="padding: 2rem; text-align: center; color: var(--color-dark-gray);">No sources or models to display.</div>';
      return;
    }

    try {
      renderGraph(svgRef.current, nodes, edges, currentModelId);
    } catch (error) {
      console.error('Failed to render dependency graph:', error);
      if (svgRef.current) {
        svgRef.current.innerHTML = `<div style="padding: 2rem; color: red;">Failed to render graph: ${(error as Error).message}</div>`;
      }
    }
  }, [sources, models, activeModel, viewMode]);

  const hasActiveModel = !!activeModel;

  return (
    <div>
      <div class={styles.helpText} style={{ marginBottom: '1rem' }}>
        Visual representation of dependencies between sources and models. The graph flows from left
        (sources) to right (dependent models). Sources are shown in yellow, models in blue. Stale
        models (that need recomputation) appear faded.
      </div>

      {/* View Mode Toggle */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          class={`button ${viewMode === 'all' ? 'button--primary' : 'button--secondary'} button--small`}
          onClick={() => setViewMode('all')}
        >
          <span class="iconify" aria-hidden="true" data-icon="carbon:network-3"></span>
          <span>All</span>
        </button>
        <button
          class={`button ${viewMode === 'current-upstream' ? 'button--primary' : 'button--secondary'} button--small`}
          onClick={() => setViewMode('current-upstream')}
          disabled={!hasActiveModel}
          title={
            hasActiveModel ? 'Show current model and all its dependencies' : 'Select a model first'
          }
        >
          <span class="iconify" aria-hidden="true" data-icon="carbon:arrow-left"></span>
          <span>Dependencies (Upstream)</span>
        </button>
        <button
          class={`button ${viewMode === 'current-downstream' ? 'button--primary' : 'button--secondary'} button--small`}
          onClick={() => setViewMode('current-downstream')}
          disabled={!hasActiveModel}
          title={
            hasActiveModel
              ? 'Show current model and all models that depend on it'
              : 'Select a model first'
          }
        >
          <span class="iconify" aria-hidden="true" data-icon="carbon:arrow-right"></span>
          <span>Dependents (Downstream)</span>
        </button>
      </div>

      <div
        ref={svgRef}
        style={{
          width: '100%',
          minHeight: '400px',
          maxHeight: '600px',
          overflow: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          background: 'white',
        }}
      />

      <div class={styles.noteBox}>
        <strong>Legend:</strong>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '16px',
                borderRadius: '4px',
                background: '#fdb833',
                border: '2px solid #fff',
              }}
            ></div>
            <span>Source</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '16px',
                borderRadius: '4px',
                background: '#1789fc',
                border: '2px solid #fff',
              }}
            ></div>
            <span>Model</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '16px',
                borderRadius: '4px',
                background: '#1789fc',
                border: '2px solid #fff',
                opacity: 0.5,
              }}
            ></div>
            <span>Stale Model</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '16px',
                borderRadius: '4px',
                background: '#1789fc',
                border: '4px solid #333',
              }}
            ></div>
            <span>Current Model</span>
          </div>
        </div>
      </div>
    </div>
  );
}
