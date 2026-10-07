import { ConfigService } from '@nestjs/config';

export function trustedOrigins(config: ConfigService): string[] {
  const origins = new Set<string>();
  for (const key of ['WEB_ORIGIN', 'API_PUBLIC_ORIGIN']) {
    const configured = new URL(config.getOrThrow<string>(key));
    origins.add(configured.origin);
    if (config.get('NODE_ENV') !== 'production' && ['localhost', '127.0.0.1'].includes(configured.hostname)) {
      for (const hostname of ['localhost', '127.0.0.1']) {
        const alias = new URL(configured.origin); alias.hostname = hostname; origins.add(alias.origin);
      }
    }
  }
  return [...origins];
}
