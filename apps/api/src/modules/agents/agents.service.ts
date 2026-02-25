import type { AgentCreateInput, AgentUpdateInput } from '@voiceflow/shared';
import type { FastifyRequest } from 'fastify';

export class AgentsService {
  async list(request: FastifyRequest) {
    return request.db.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { workflows: true, calls: true } } },
    });
  }

  async getById(request: FastifyRequest, id: string) {
    const agent = await request.db.agent.findFirst({
      where: { id },
      include: {
        workflows: { orderBy: { updatedAt: 'desc' } },
        _count: { select: { calls: true } },
      },
    });
    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
    }
    return agent;
  }

  async create(request: FastifyRequest, input: AgentCreateInput) {
    return request.db.agent.create({
      data: {
        name: input.name,
        description: input.description,
        useCase: input.useCase,
        language: input.language,
        voiceId: input.voiceId ?? 'aura-2-thalia-en',
        systemPrompt: input.systemPrompt,
        tenantId: request.tenantId,
      },
    });
  }

  async update(request: FastifyRequest, id: string, input: AgentUpdateInput) {
    await this.getById(request, id);
    return request.db.agent.update({
      where: { id },
      data: input,
    });
  }

  async delete(request: FastifyRequest, id: string) {
    await this.getById(request, id);
    return request.db.agent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
