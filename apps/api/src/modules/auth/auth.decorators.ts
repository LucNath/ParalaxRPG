import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const PUBLIC_ROUTE = 'public-route';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export interface AuthIdentity { userId: string; sessionId: string }
export interface AuthRequest extends Request { identity?: AuthIdentity }
export const Identity = createParamDecorator((_data: unknown, context: ExecutionContext): AuthIdentity => {
  return context.switchToHttp().getRequest<AuthRequest>().identity!;
});
