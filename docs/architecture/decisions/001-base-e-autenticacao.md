# ADR 001 — Base do projeto e autenticação

**Status:** adotada na primeira etapa de implementação; revisável nas próximas entregas. **Data:** 7 de outubro de 2026. **Origem:** autorização para iniciar a implementação e arquitetura proposta nas seções 34–44.

## Contexto

O repositório estava vazio de código e continha os documentos 01–18. A primeira entrega foi delimitada a conta, autenticação, perfil e ambiente local, antes de sistemas e campanhas.

## DP01 — Stack e organização

- npm workspaces com `apps/web`, `apps/api` e `packages/contracts`.
- Next.js 16.4.0, React 19.3.0, NestJS 12.1.2, Prisma 7.10.0 e PostgreSQL 17.
- TypeScript 5.9.3 e Zod 4.6.5; dependências diretas fixadas e lockfile versionado.
- CSS próprio para esta interface; Tailwind permanece uma sugestão da origem, sem ser necessário para este recorte.
- Backend modular com módulos de banco, autenticação e usuários; API e frontend separados, com proxy da API na mesma origem do navegador.
- PostgreSQL isolado em Docker Compose, porta local 56432. Redis não é necessário neste recorte sem tempo real.

Alternativas consideradas: antecipar toda a plataforma ou construir primeiro o núcleo de identidade; foi escolhido o núcleo para obter um fluxo verificável com persistência e autorização antes da campanha.

Provedor, orçamento, topologia distribuída e stack de tempo real continuam pendentes. Esta decisão não escolhe Vercel ou outro serviço de hospedagem.

## DP02 — Conta

Login por e-mail. E-mail e username são normalizados em minúsculas; unicidade garantida no banco. Username tem 3–24 caracteres alfanuméricos/sublinhado e nomes reservados. Senha tem 10–128 caracteres, sem trim silencioso.

Senha é armazenada com Argon2id, memória de 64 MiB, três iterações e paralelismo um. Hashes e dados de sessão nunca entram no perfil público.

Cadastro cria conta e perfil na mesma operação transacional do Prisma e abre uma sessão automaticamente. Verificação de e-mail e recuperação de senha ficam fora desta entrega. E-mail/username não são editáveis pela rota de perfil.

## DP03 — Sessões

- Access token JWT HS256: 15 minutos por padrão; emissor `paralax-api`, audiência `paralax-web`, sujeito usuário e referência de sessão.
- Refresh token opaco aleatório: prazo absoluto de sete dias, sem extensão a cada rotação; somente SHA-256 do token é persistido.
- Cookie refresh `HttpOnly`, `SameSite=Lax`, caminho `/api/v1/auth`; `Secure` em produção.
- Access token fica em memória no cliente, sem localStorage/sessionStorage.
- Refresh consome o token antigo de forma atômica e gera outro na mesma família. Reutilização revoga a família.
- Cada requisição privada verifica a sessão no banco, permitindo invalidar access tokens imediatamente no logout/rotação.
- Logout é idempotente e revoga a família da sessão atual; outras sessões de login permanecem independentes.
- Refresh/logout exigem Origin explícita confiável; outras mutações recusam Origin externa quando presente.
- Desenvolvimento aceita os aliases localhost/127.0.0.1 apenas para protocolo e porta das origens configuradas; produção usa exclusivamente as origens configuradas.
- Cliente serializa refresh por instância e, em navegadores compatíveis, por Web Locks entre abas.

Consequências: mais uma consulta de autorização por requisição privada; refresh concorrente sem coordenação pode ser interpretado como reutilização e revogar a família. A política de múltiplos dispositivos e gerenciador de sessões completo poderá ser ampliada depois.

## Perfil e arquivos

Perfil editável: nome de exibição, biografia e localização opcional. Perfil público contém ID, username, nome, biografia, localização, avatar e data de ingresso; nunca e-mail ou credenciais.

Avatar: upload autenticado, limite de 2 MB, validação por decodificação real de PNG/JPEG/WebP, sem animação, limite de 20 milhões de pixels, conversão para WebP 256×256 e nome aleatório. Arquivo público é servido por rota com chave validada. Uploads ficam no disco local nesta etapa.

Arquivos substituídos ficam retidos para evitar remoção indevida sob gravações concorrentes; política de limpeza/retenção permanece DP08. Storage compartilhado é pré-requisito futuro para várias instâncias.

## Dependências e ambiente

O npm consultado inicialmente retornou versões antigas em cache; a auditoria orientou a escolha do Next.js corrigido e atualizações de ferramentas. `deepmerge-ts`, `mysql2` e `shell-quote` têm overrides para versões corrigidas. Os dois primeiros são dependências do CLI Prisma, não banco MySQL do produto.

CLI Prisma fica na raiz do workspace, permitindo aplicar os overrides no conjunto de ferramentas. Geração, migrations, build e testes foram exercitados com essas versões. Reavaliar overrides ao atualizar o Prisma/concurrently.

Credenciais locais são aleatórias, geradas por `scripts/setup.mjs`, nunca impressas nem versionadas. Certificados do sistema Windows podem ser usados com `NODE_USE_SYSTEM_CA`; nenhuma configuração desativa TLS.

## Consequências e próximos módulos

RF001–RF003 e parte dos RNFs já têm implementação. RF004 em diante seguem pendentes. Próxima entrega: sistemas configuráveis com definição versionada (DP06), sem antecipar campanhas/mapas no núcleo de identidade.

## Referências consultadas

Documentação oficial: [autenticação NestJS](https://docs.nestjs.com/security/authentication), [rate limiting NestJS](https://docs.nestjs.com/security/rate-limiting), [upload NestJS](https://docs.nestjs.com/techniques/file-upload), [gerador Prisma](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators) e [instalação Next.js](https://nextjs.org/docs/app/getting-started/installation). Os contratos específicos de access/refresh seguem os requisitos deste projeto e estão implementados no backend.

[Arquitetura](../../07-arquitetura.md), [segurança](../../11-seguranca.md) e [API](../../09-api.md).
