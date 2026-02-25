import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@voiceflow/db';
import { SheetsService } from './sheets.service';

export async function sheetsRoutes(fastify: FastifyInstance) {
  const sheetsService = new SheetsService();

  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/sheets/connections', async (request: FastifyRequest, reply: FastifyReply) => {
    const connections = await request.db.sheetConnection.findMany({
      orderBy: { createdAt: 'desc' },
    });
    reply.send({ success: true, data: connections });
  });

  fastify.post('/api/sheets/connections', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, spreadsheetId, sheetName } = request.body as {
      name: string;
      spreadsheetId: string;
      sheetName: string;
    };

    const connection = await request.db.sheetConnection.create({
      data: {
        name,
        spreadsheetId,
        sheetName,
        tenantId: request.tenantId,
        credentialRef: `tenant:${request.tenantId}:sheets`,
      },
    });

    reply.status(201).send({ success: true, data: connection });
  });

  fastify.post(
    '/api/sheets/connections/:id/test',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const connection = await request.db.sheetConnection.findFirst({
        where: { id: request.params.id },
      });

      if (!connection) {
        return reply.status(404).send({ success: false, error: 'Connection not found' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: request.tenantId },
      });

      if (!tenant?.sheetsCredJson) {
        return reply.status(400).send({
          success: false,
          error: 'Google Sheets credentials not configured',
        });
      }

      try {
        const creds = JSON.parse(tenant.sheetsCredJson);
        const rows = await sheetsService.readRange(
          { clientEmail: creds.client_email, privateKey: creds.private_key },
          connection.spreadsheetId,
          `${connection.sheetName}!A1:A5`,
        );

        reply.send({ success: true, data: { connected: true, sampleRows: rows.length } });
      } catch (error: any) {
        reply.status(400).send({ success: false, error: `Connection test failed: ${error.message}` });
      }
    },
  );

  fastify.delete(
    '/api/sheets/connections/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await request.db.sheetConnection.delete({ where: { id: request.params.id } });
      reply.send({ success: true });
    },
  );
}
