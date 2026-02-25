import type { FastifyRequest } from 'fastify';
import { workflowGraphSchema } from '@voiceflow/shared';
import type { WorkflowGraph } from '@voiceflow/shared';

const DEFAULT_GRAPH: WorkflowGraph = {
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 250, y: 50 },
      data: {
        label: 'Start',
        config: { greetingText: 'Hello! How can I help you today?' },
      },
    },
  ],
  edges: [],
};

export class WorkflowsService {
  async listByAgent(request: FastifyRequest, agentId: string) {
    return request.db.workflow.findMany({
      where: { agentId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(request: FastifyRequest, id: string) {
    const workflow = await request.db.workflow.findFirst({ where: { id } });
    if (!workflow) {
      throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
    }
    return workflow;
  }

  async create(request: FastifyRequest, agentId: string, name: string) {
    return request.db.workflow.create({
      data: {
        name,
        agentId,
        graph: DEFAULT_GRAPH as any,
      },
    });
  }

  async updateGraph(request: FastifyRequest, id: string, graph: unknown) {
    const validated = workflowGraphSchema.parse(graph);
    await this.getById(request, id);
    return request.db.workflow.update({
      where: { id },
      data: { graph: validated as any },
    });
  }

  async publish(request: FastifyRequest, id: string, targetStatus: 'SANDBOX' | 'PRODUCTION') {
    const workflow = await this.getById(request, id);

    if (targetStatus === 'PRODUCTION' && workflow.status === 'DRAFT') {
      throw Object.assign(
        new Error('Cannot publish directly to production. Promote to sandbox first.'),
        { statusCode: 400 },
      );
    }

    return request.db.workflow.update({
      where: { id },
      data: {
        status: targetStatus,
        publishedAt: targetStatus === 'PRODUCTION' ? new Date() : undefined,
      },
    });
  }

  async createVersion(request: FastifyRequest, id: string) {
    const workflow = await this.getById(request, id);
    return request.db.workflow.create({
      data: {
        name: workflow.name,
        agentId: workflow.agentId,
        graph: workflow.graph as any,
        variables: workflow.variables as any,
        parentId: workflow.id,
        version: workflow.version + 1,
      },
    });
  }

  validate(graph: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const result = workflowGraphSchema.safeParse(graph);
    if (!result.success) {
      return { valid: false, errors: result.error.errors.map((e) => e.message) };
    }

    const { nodes, edges } = result.data;

    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) errors.push('Workflow must have a Start node');
    if (startNodes.length > 1) errors.push('Workflow must have exactly one Start node');

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) errors.push(`Edge references missing source node: ${edge.source}`);
      if (!nodeIds.has(edge.target)) errors.push(`Edge references missing target node: ${edge.target}`);
    }

    const connectedNodes = new Set<string>();
    for (const edge of edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }
    for (const node of nodes) {
      if (node.type !== 'start' && !connectedNodes.has(node.id)) {
        errors.push(`Node "${node.data.label}" (${node.id}) is not connected`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
