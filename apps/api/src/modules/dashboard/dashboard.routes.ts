import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@voiceflow/db';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/dashboard/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.user.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCallsToday, totalCalls, completedCalls, failedCalls, activeWorkflows, agents] =
      await Promise.all([
        prisma.call.count({ where: { tenantId, startedAt: { gte: today } } }),
        prisma.call.count({ where: { tenantId } }),
        prisma.call.count({ where: { tenantId, status: 'COMPLETED' } }),
        prisma.call.count({ where: { tenantId, status: 'FAILED' } }),
        prisma.workflow.count({ where: { agent: { tenantId }, status: 'PRODUCTION' } }),
        prisma.agent.count({ where: { tenantId, isActive: true } }),
      ]);

    const automationRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    const fallbackRate = totalCalls > 0 ? Math.round((failedCalls / totalCalls) * 100) : 0;

    reply.send({
      success: true,
      data: {
        totalCallsToday,
        automationRate,
        fallbackRate,
        activeWorkflows,
        activeAgents: agents,
      },
    });
  });

  fastify.get('/api/dashboard/call-volume', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.user.tenantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const calls = await prisma.call.findMany({
      where: { tenantId, startedAt: { gte: thirtyDaysAgo } },
      select: { startedAt: true, status: true },
      orderBy: { startedAt: 'asc' },
    });

    const volumeByDay: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const call of calls) {
      const day = call.startedAt.toISOString().split('T')[0];
      if (!volumeByDay[day]) volumeByDay[day] = { total: 0, completed: 0, failed: 0 };
      volumeByDay[day].total++;
      if (call.status === 'COMPLETED') volumeByDay[day].completed++;
      if (call.status === 'FAILED') volumeByDay[day].failed++;
    }

    reply.send({
      success: true,
      data: Object.entries(volumeByDay).map(([date, counts]) => ({ date, ...counts })),
    });
  });
}
