import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

export function createTenantClient(tenantId: string) {
  return globalPrisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }: { args: any; query: any }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        async update({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }: { args: any; query: any }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}

export { globalPrisma as prisma };
