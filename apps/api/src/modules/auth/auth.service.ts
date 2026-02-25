import bcrypt from 'bcryptjs';
import { prisma } from '@voiceflow/db';
import type { SignupInput, LoginInput, AuthTokens } from '@voiceflow/shared';
import type { FastifyInstance } from 'fastify';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import crypto from 'crypto';

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async signup(input: SignupInput): Promise<AuthTokens> {
    const slug = input.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw Object.assign(new Error('Organization name already taken'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: input.tenantName,
        slug,
        users: {
          create: {
            email: input.email,
            passwordHash,
            name: input.name,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    return this.generateTokens(user.id, tenant.id, user.role);
  }

  async login(input: LoginInput): Promise<AuthTokens & { tenantId: string }> {
    const user = await prisma.user.findFirst({
      where: { email: input.email },
      include: { tenant: true },
    });

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    return { ...tokens, tenantId: user.tenantId };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await redis.get(`refresh:${refreshToken}`);
    if (!stored) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    const { userId, tenantId, role } = JSON.parse(stored);
    await redis.del(`refresh:${refreshToken}`);
    return this.generateTokens(userId, tenantId, role);
  }

  async logout(refreshToken: string): Promise<void> {
    await redis.del(`refresh:${refreshToken}`);
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessToken = this.app.jwt.sign({ userId, tenantId, role });
    const refreshToken = crypto.randomBytes(32).toString('hex');

    await redis.set(
      `refresh:${refreshToken}`,
      JSON.stringify({ userId, tenantId, role }),
      'EX',
      60 * 60 * 24 * 7, // 7 days
    );

    return { accessToken, refreshToken };
  }
}
