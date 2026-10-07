import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { LoginInput, RegisterInput, AuthResponse } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { currentProfile, currentUserSelect } from '../users/profile.mapper';
import { Prisma } from '../../generated/prisma/client';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const passwordOptions = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(randomBytes(32).toString('hex'), passwordOptions);
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService,
    private readonly config: ConfigService) {}

  async register(input: RegisterInput) {
    const passwordHash = await argon2.hash(input.password, passwordOptions);
    try {
      const user = await this.prisma.user.create({ data: {
        email: input.email, username: input.username, passwordHash,
        profile: { create: { displayName: input.displayName } },
      }, select: currentUserSelect });
      return this.createSession(user.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException({ code: 'ACCOUNT_CONFLICT', message: 'E-mail ou nome de usuário indisponível.' });
      throw error;
    }
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true, passwordHash: true } });
    const valid = await argon2.verify(user?.passwordHash || await this.dummyHash, input.password);
    if (!user || !valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' });
    return this.createSession(user.id);
  }

  private async createSession(userId: string) {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.getOrThrow<number>('AUTH_REFRESH_TTL_DAYS') * 86400000);
    const session = await this.prisma.refreshSession.create({ data: { userId, familyId: randomUUID(), tokenHash: digest(refreshToken), expiresAt } });
    return this.response(userId, session.id, refreshToken, expiresAt);
  }

  async refresh(rawToken?: string) {
    if (!rawToken || rawToken.length > 256) throw new UnauthorizedException();
    const refreshToken = randomBytes(48).toString('base64url');
    const now = new Date();
    const next = await this.prisma.$transaction(async tx => {
      const previous = await tx.refreshSession.findUnique({ where: { tokenHash: digest(rawToken) } });
      if (!previous || previous.expiresAt <= now) return null;
      if (previous.revokedAt) {
        await tx.refreshSession.updateMany({ where: { familyId: previous.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      const claimed = await tx.refreshSession.updateMany({ where: { id: previous.id, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
      if (claimed.count !== 1) {
        await tx.refreshSession.updateMany({ where: { familyId: previous.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      return tx.refreshSession.create({ data: { userId: previous.userId, familyId: previous.familyId, tokenHash: digest(refreshToken), expiresAt: previous.expiresAt } });
    });
    if (!next) throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente.' });
    return this.response(next.userId, next.id, refreshToken, next.expiresAt);
  }

  async logout(rawToken?: string) {
    if (!rawToken || rawToken.length > 256) return;
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: digest(rawToken) }, select: { familyId: true } });
    if (session) await this.prisma.refreshSession.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async response(userId: string, sessionId: string, refreshToken: string, expiresAt: Date) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: currentUserSelect });
    const expiresIn = this.config.getOrThrow<number>('AUTH_ACCESS_TTL_SECONDS');
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: sessionId }, {
      secret: this.config.getOrThrow<string>('AUTH_ACCESS_SECRET'), expiresIn,
      algorithm: 'HS256', issuer: 'paralax-api', audience: 'paralax-web',
    });
    const body: AuthResponse = { accessToken, expiresIn, user: currentProfile(user) };
    return { body, refreshToken, expiresAt };
  }
}
