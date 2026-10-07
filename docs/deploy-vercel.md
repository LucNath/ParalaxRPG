# Publicação de testes na Vercel

Publicado e verificado em 7 de outubro de 2026: **[abrir Paralax RPG](https://paralax-rpg-web.vercel.app)**. Cada participante deve criar sua própria conta. O site dispensa sessão na Vercel. Consulte as [evidências da publicação](verification/004-publicacao-vercel.md).

## Serviços e configuração

O ambiente online usa a conta `lucky-8804ce74`, com projetos separados `paralax-rpg-web` (Next.js, raiz `apps/web`) e `paralax-rpg-api` (NestJS, raiz `apps/api`). Ambos incluem arquivos externos à raiz para resolver o workspace `packages/contracts`, usam Node.js 24 e região `iad1`.

O banco `paralax-rpg-tests` foi criado pelo Marketplace Neon no plano `free_v3`, separado do PostgreSQL local. Autenticação Neon adicional fica desativada: as contas continuam usando a autenticação implementada no projeto. As duas migrations existentes foram aplicadas por conexão direta, após confirmar que o schema público estava vazio. Não foram copiados usuários ou arquivos locais.

Avatares online usam o Blob store privado `paralax-rpg-avatars`. A API normaliza imagens para WebP e mantém as rotas públicas de avatar existentes; o cliente não recebe a credencial do store. `AVATAR_STORAGE=local` permanece o padrão de desenvolvimento. Arquivos antigos são preservados até definir retenção.

| Projeto | Variáveis necessárias |
| --- | --- |
| Web | `API_INTERNAL_URL` com o endereço HTTPS da API |
| API | `NODE_ENV=production`, `NODE_OPTIONS=--experimental-require-module`, `WEB_ORIGIN`, `API_PUBLIC_ORIGIN`, `DATABASE_URL`, `AUTH_ACCESS_SECRET`, `AVATAR_STORAGE=vercel-blob`, `BLOB_STORE_ID` e credencial fornecida pela conexão do store |
| Migrations | `DATABASE_URL_UNPOOLED` com a conexão direta Neon; aplicação usa `DATABASE_URL` com pooling |

A chave de sessão online foi gerada separadamente, armazenada como variável sensível e nunca registrada no repositório. `.env`, arquivos obtidos da Vercel, tokens, uploads e artefatos locais são ignorados. As variáveis do ambiente online não substituem `.env` local.

O install executa `npm ci --include=dev` na raiz do monorepo, garantindo TypeScript e demais ferramentas compartilhadas. A API mantém CommonJS e NestJS 12; [a opção documentada da Vercel](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module) habilita o carregamento de dependências ESM no runtime.

O navegador acessa `/api/v1` no mesmo domínio do site, por rewrite para a API. Assim, o cookie de refresh permanece HttpOnly/Secure/SameSite=Lax no domínio do site. Origem da escrita e do refresh é validada pela API. Compartilhar sempre o domínio canônico configurado em `WEB_ORIGIN`.

## Atualizar a publicação

Primeiro verificar os destinos:

```powershell
vercel project inspect --cwd apps/api --non-interactive
vercel project inspect --cwd apps/web --non-interactive
```

Os projetos devem corresponder aos nomes e à conta acima. Verificar tipos, testes e build antes de publicar. Quando houver migrations novas, aplicá-las de modo explícito ao ambiente correto, com conexão direta e preparação de recuperação; o build não migra automaticamente o banco.

```powershell
npm run check
npm run build
vercel link --yes --project paralax-rpg-api --scope lucky-8804ce74
vercel project inspect --non-interactive
vercel deploy --prod --scope lucky-8804ce74
vercel link --yes --project paralax-rpg-web --scope lucky-8804ce74
vercel project inspect --non-interactive
vercel deploy --prod --scope lucky-8804ce74
```

Executar os comandos na raiz do repositório, pois o projeto remoto já define `apps/api` ou `apps/web` como Root Directory. Não usar `--cwd apps/api` no deploy: essa versão da CLI repete o prefixo da raiz. Os vínculos dentro dos apps continuam úteis para consultar/configurar variáveis. Comandos pressupõem autenticação válida e variáveis configuradas. O Node.js no Windows pode precisar de `$env:NODE_USE_SYSTEM_CA = '1'` para usar certificados do sistema, mantendo a verificação TLS.

Após publicar, verificar `/api/v1/health/ready` pelo domínio do site e o fluxo cadastro → perfil/avatar → sistema → recarga → publicação → logout/login, com dados sintéticos. Confirmar que uma pessoa sem sessão Vercel consegue abrir a URL.

## Custos e limites

Neon foi provisionado no plano gratuito, sem contratação de plano pago. Vercel Functions e Blob seguem as franquias e a cobrança da conta existente; esta configuração não altera o plano. Consulte [uso da Vercel](https://vercel.com/dashboard/lucky-8804ce74/usage), [preços do Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing) e [plano Neon](https://neon.tech/pricing) antes de ampliar os testes.

O ambiente é para testar os módulos atuais: conta, perfil, sistemas e campanhas básicas. Convites, membros, personagens e sessões continuam futuros. Rate limit usa memória por instância e não coordena múltiplas funções. Backups/exportação, recuperação de senha, verificação de e-mail, moderação e limpeza de arquivos permanecem pendentes. Preview não está conectado ao banco de testes publicado; deverá receber seus próprios dados e segredos antes de ser usado.
