import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@paralax/contracts';
import type { Request, Response } from 'express';
import { SchemaPipe } from '../../common/schema.pipe';
import { AuthService } from './auth.service';
import { Public } from './auth.decorators';

export const REFRESH_COOKIE = 'paralax_refresh';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}
  private cookieOptions() {
    return { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax' as const, path: '/api/v1/auth' };
  }
  private sendSession(response: Response, result: Awaited<ReturnType<AuthService['login']>>) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(REFRESH_COOKIE, result.refreshToken, { ...this.cookieOptions(), expires: result.expiresAt });
    return result.body;
  }
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(@Body(new SchemaPipe(registerSchema)) input: RegisterInput, @Res({ passthrough: true }) response: Response) {
    return this.sendSession(response, await this.auth.register(input));
  }
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body(new SchemaPipe(loginSchema)) input: LoginInput, @Res({ passthrough: true }) response: Response) {
    return this.sendSession(response, await this.auth.login(input));
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try { return this.sendSession(response, await this.auth.refresh(request.cookies?.[REFRESH_COOKIE])); }
    catch (error) { response.clearCookie(REFRESH_COOKIE, this.cookieOptions()); throw error; }
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    response.setHeader('Cache-Control', 'no-store');
  }
}
