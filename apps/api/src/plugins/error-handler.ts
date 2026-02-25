import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error(error);

      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
      }

      if (error.statusCode) {
        return reply.status(error.statusCode).send({
          success: false,
          error: error.message,
        });
      }

      reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
      });
    },
  );
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
