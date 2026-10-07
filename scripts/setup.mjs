import { readFile, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../.env', import.meta.url));
try {
  await access(target);
  console.log('.env já existe; configuração preservada.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const password = randomBytes(24).toString('hex');
  const port = template.match(/^POSTGRES_PORT=(\d+)$/m)[1];
  const content = template
    .replace('POSTGRES_PASSWORD=GENERATED_BY_SETUP', `POSTGRES_PASSWORD=${password}`)
    .replace('DATABASE_URL=GENERATED_BY_SETUP', `DATABASE_URL=postgresql://paralax:${password}@127.0.0.1:${port}/paralax`)
    .replace('AUTH_ACCESS_SECRET=GENERATED_BY_SETUP', `AUTH_ACCESS_SECRET=${randomBytes(48).toString('hex')}`);
  await writeFile(target, content, { flag: 'wx', mode: 0o600 });
  console.log('.env local criado com credenciais aleatórias. Não adicione este arquivo ao Git.');
}
