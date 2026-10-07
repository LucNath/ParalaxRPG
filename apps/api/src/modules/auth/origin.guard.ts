import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { trustedOrigins } from '../../common/trusted-origins';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origin = request.get('origin');
    const allowed = trustedOrigins(this.config);
    if (origin && !allowed.includes(origin)) throw new ForbiddenException({ code: 'INVALID_ORIGIN', message: 'Origem da requisição não permitida.' });
    // Cookie-based operations require an explicit trusted Origin to prevent CSRF.
    if (/\/auth\/(refresh|logout)\/?$/.test(request.path) && !origin) throw new ForbiddenException({ code: 'INVALID_ORIGIN', message: 'Origem da requisição obrigatória.' });
    return true;
  }
}
