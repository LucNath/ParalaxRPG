import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './database/prisma.service';
import { Public } from './modules/auth/auth.decorators';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('live')
  live() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'connected' }; }
    catch { throw new ServiceUnavailableException({ code: 'NOT_READY', message: 'Serviço temporariamente indisponível.' }); }
  }
}
