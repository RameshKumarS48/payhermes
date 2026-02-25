import type { WorkflowGraph, WorkflowNode, WorkflowEdge } from '@voiceflow/shared';

export class WorkflowEngine {
  private graph: WorkflowGraph | null = null;
  private nodeMap: Map<string, WorkflowNode> = new Map();
  private edgesBySource: Map<string, WorkflowEdge[]> = new Map();

  load(graph: WorkflowGraph): void {
    this.graph = graph;
    this.nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    this.edgesBySource = new Map();

    for (const edge of graph.edges) {
      const existing = this.edgesBySource.get(edge.source) || [];
      existing.push(edge);
      this.edgesBySource.set(edge.source, existing);
    }
  }

  getStartNodeId(): string {
    if (!this.graph) throw new Error('Workflow not loaded');
    const startNode = this.graph.nodes.find((n) => n.type === 'start');
    if (!startNode) throw new Error('No start node found');
    return startNode.id;
  }

  getNode(nodeId: string): WorkflowNode {
    const node = this.nodeMap.get(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  getNextNodeId(currentNodeId: string, sourceHandle?: string): string | null {
    const edges = this.edgesBySource.get(currentNodeId) || [];

    if (sourceHandle) {
      const matchingEdge = edges.find((e) => e.sourceHandle === sourceHandle);
      if (matchingEdge) return matchingEdge.target;
    }

    // Default: first edge without a specific handle, or first edge
    const defaultEdge = edges.find((e) => !e.sourceHandle) || edges[0];
    return defaultEdge?.target || null;
  }

  resolveEdge(currentNodeId: string, handleOrIntentName: string): string | null {
    const edges = this.edgesBySource.get(currentNodeId) || [];
    const matchingEdge = edges.find((e) => e.sourceHandle === handleOrIntentName);
    return matchingEdge?.target || null;
  }

  interpolateVariables(text: string, variables: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}
