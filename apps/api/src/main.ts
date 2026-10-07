import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createApplication } from './bootstrap';

async function main() {
  const app = await createApplication(undefined, NestFactory);
  await app.listen(process.env.PORT || app.get(ConfigService).getOrThrow<number>('API_PORT'), process.env.VERCEL ? '0.0.0.0' : '127.0.0.1');
}
void main().catch(() => { console.error('Não foi possível iniciar a API. Confira o banco de dados e a configuração do ambiente.'); process.exitCode = 1; });
