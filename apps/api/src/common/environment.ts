import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

export function projectRoot() {
  // Vercel bundles the API without the source monorepo's package manifests.
  if (process.env.VERCEL) return process.cwd();
  let candidate = process.cwd();
  while (true) {
    const manifest = resolve(candidate, 'package.json');
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === 'paralax-rpg') return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error('Não foi possível localizar a raiz do monorepo.');
    candidate = parent;
  }
}

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url(),
  API_PUBLIC_ORIGIN: z.url(),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  AUTH_ACCESS_SECRET: z.string().min(64).refine(value => value !== 'GENERATED_BY_SETUP'),
  AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  UPLOAD_DIR: z.string().default('var/uploads'),
  AVATAR_STORAGE: z.enum(['local', 'vercel-blob']).default('local'),
  BLOB_STORE_ID: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export function validateEnvironment(values: Record<string, unknown>) {
  const result = environmentSchema.safeParse(values);
  if (!result.success) {
    // Only names are reported: an invalid secret must never be printed.
    throw new Error(`Configuração inválida: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}. Execute npm run setup e confira .env.`);
  }
  if (result.data.NODE_ENV === 'production' &&
      [result.data.WEB_ORIGIN, result.data.API_PUBLIC_ORIGIN].some(value => !value.startsWith('https://'))) {
    throw new Error('Produção exige origens HTTPS.');
  }
  if (values.VERCEL && result.data.AVATAR_STORAGE !== 'vercel-blob') {
    throw new Error('Vercel exige AVATAR_STORAGE=vercel-blob para preservar uploads.');
  }
  if (result.data.AVATAR_STORAGE === 'vercel-blob' && !result.data.BLOB_STORE_ID && !result.data.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Configure BLOB_STORE_ID ou BLOB_READ_WRITE_TOKEN para avatares.');
  }
  return { ...values, ...result.data };
}
