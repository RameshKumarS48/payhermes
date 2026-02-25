import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function callsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/calls', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number };
    const skip = (Number(page) - 1) * Number(pageSize);

    const [calls, total] = await Promise.all([
      request.db.call.findMany({
        skip,
        take: Number(pageSize),
        orderBy: { startedAt: 'desc' },
        include: { agent: { select: { name: true } }, workflow: { select: { name: true } } },
      }),
      request.db.call.count(),
    ]);

    reply.send({
      success: true,
      data: calls,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
    });
  });

  fastify.get(
    '/api/calls/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const call = await request.db.call.findFirst({
        where: { id: request.params.id },
        include: {
          agent: { select: { name: true } },
          workflow: { select: { name: true } },
          events: { orderBy: { timestamp: 'asc' } },
        },
      });
      if (!call) {
        return reply.status(404).send({ success: false, error: 'Call not found' });
      }
      reply.send({ success: true, data: call });
    },
  );
}
