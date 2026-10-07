import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthRequest, PUBLIC_ROUTE } from './auth.decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService,
    private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') || [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
    let claims: { sub: string; sid: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('AUTH_ACCESS_SECRET'),
        algorithms: ['HS256'], issuer: 'paralax-api', audience: 'paralax-web',
      });
    } catch { throw new UnauthorizedException(); }
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw new UnauthorizedException();
    const session = await this.prisma.refreshSession.findUnique({ where: { id: claims.sid }, select: { userId: true, revokedAt: true, expiresAt: true } });
    if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException();
    request.identity = { userId: claims.sub, sessionId: claims.sid };
    return true;
  }
}
