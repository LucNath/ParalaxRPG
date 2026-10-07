# Publicação de testes na Vercel

## Serviços e configuração

O ambiente online usa a conta `lucky-8804ce74`, com projetos separados `paralax-rpg-web` (Next.js, raiz `apps/web`) e `paralax-rpg-api` (NestJS, raiz `apps/api`). Ambos incluem arquivos externos à raiz para resolver o workspace `packages/contracts`, usam Node.js 24 e região `iad1`.

O banco `paralax-rpg-tests` foi criado pelo Marketplace Neon no plano `free_v3`, separado do PostgreSQL local. Autenticação Neon adicional fica desativada: as contas continuam usando a autenticação implementada no projeto. As duas migrations existentes foram aplicadas por conexão direta, após confirmar que o schema público estava vazio. Não foram copiados usuários ou arquivos locais.

Avatares online usam o Blob store privado `paralax-rpg-avatars`. A API normaliza imagens para WebP e mantém as rotas públicas de avatar existentes; o cliente não recebe a credencial do store. `AVATAR_STORAGE=local` permanece o padrão de desenvolvimento. Arquivos antigos são preservados até definir retenção.

| Projeto | Variáveis necessárias |
| --- | --- |
| Web | `API_INTERNAL_URL` com o endereço HTTPS da API |
| API | `NODE_ENV=production`, `WEB_ORIGIN`, `API_PUBLIC_ORIGIN`, `DATABASE_URL`, `AUTH_ACCESS_SECRET`, `AVATAR_STORAGE=vercel-blob`, `BLOB_STORE_ID` e credencial fornecida pela conexão do store |
| Migrations | `DATABASE_URL_UNPOOLED` com a conexão direta Neon; aplicação usa `DATABASE_URL` com pooling |

A chave de sessão online foi gerada separadamente, armazenada como variável sensível e nunca registrada no repositório. `.env`, arquivos obtidos da Vercel, tokens, uploads e artefatos locais são ignorados. As variáveis do ambiente online não substituem `.env` local.

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
vercel deploy --prod --cwd apps/api --scope lucky-8804ce74
vercel deploy --prod --cwd apps/web --scope lucky-8804ce74
```

Comandos pressupõem vínculo local existente, autenticação válida e variáveis configuradas. O Node.js no Windows pode precisar de `$env:NODE_USE_SYSTEM_CA = '1'` para usar certificados do sistema, mantendo a verificação TLS.

Após publicar, verificar `/api/v1/health/ready` pelo domínio do site e o fluxo cadastro → perfil/avatar → sistema → recarga → publicação → logout/login, com dados sintéticos. Confirmar que uma pessoa sem sessão Vercel consegue abrir a URL.

## Custos e limites

Neon foi provisionado no plano gratuito, sem contratação de plano pago. Vercel Functions e Blob seguem as franquias e a cobrança da conta existente; esta configuração não altera o plano. Consulte [uso da Vercel](https://vercel.com/dashboard/lucky-8804ce74/usage), [preços do Blob](https://vercel.com/docs/vercel-blob/usage-and-pricing) e [plano Neon](https://neon.tech/pricing) antes de ampliar os testes.

O ambiente é para testar os módulos atuais: conta, perfil e sistemas. Campanhas e sessões continuam futuras. Rate limit usa memória por instância e não coordena múltiplas funções. Backups/exportação, recuperação de senha, verificação de e-mail, moderação e limpeza de arquivos permanecem pendentes. Preview não está conectado ao banco de testes publicado; deverá receber seus próprios dados e segredos antes de ser usado.
