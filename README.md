# Paralax RPG

Plataforma para criar sistemas próprios de RPG, organizar campanhas e jogar online. A plataforma fornece as ferramentas; o criador define as regras.

Já estão disponíveis **cadastro, login, renovação de sessão, logout, dashboard, perfil com avatar e criação/edição de sistemas de RPG**, com PostgreSQL real. O editor configura atributos, perícias, recursos e dados, mostra uma prévia da ficha e salva versões imutáveis. Sistemas podem ser privados, não listados ou públicos, com busca no catálogo. Campanhas e mesa virtual são as próximas entregas; o MVP 1 completo ainda não está concluído.

A interface adota fantasia moderna com tema escuro, roxo/ciano e Geist. O [design system](docs/19-design-system.md) registra a direção fornecida, os componentes atuais, a proveniência da arte e os padrões para os próximos módulos.

## Executar localmente

Pré-requisitos: Node.js 22.18 ou superior, npm 10 ou superior e Docker com Compose. A implementação foi verificada em Windows com Node.js 26.5.0.

Na raiz do repositório:

```powershell
npm ci
npm run setup
npm run db:up
npm run db:migrate
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Não há conta padrão: use **Criar conta**. A API fica em `http://localhost:4000/api/v1` e o PostgreSQL local em `127.0.0.1:56432`.

Depois de atualizar o código, execute `npm run db:migrate` antes de iniciar para aplicar migrations novas sem reiniciar o banco. No painel, abra **Sistemas** para criar suas regras. O salvamento é explícito; cada edição salva gera uma versão, e alterações concorrentes retornam um conflito sem sobrescrever a outra aba.

`setup` cria `.env` com senha de banco e chave de autenticação aleatórias e preserva uma configuração existente. `.env`, uploads e arquivos gerados são ignorados pelo Git. Se uma porta estiver ocupada, altere a configuração correspondente antes de iniciar; a porta web também está no script de `apps/web/package.json` e na configuração de testes.

Os avatares ficam em `var/uploads/avatars`, são públicos, limitados a 2 MB e convertidos para WebP 256×256. O armazenamento em disco é a opção de desenvolvimento; produção com várias instâncias precisará de storage compartilhado.

Se o npm encontrar erro de certificado no Windows, use os certificados instalados no sistema, mantendo a verificação TLS:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci
```

## Verificar a implementação

Com o banco iniciado e as migrations aplicadas:

```powershell
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

- `check`: tipos e testes de integração da API com banco real.
- `build`: produção de frontend e backend.
- `test:e2e`: navegação real em Chromium, desktop e celular; inicia os servidores necessários.

Os testes criam contas sintéticas e removem seus registros ao final. Testes E2E devem ser executados exclusivamente com o banco local de desenvolvimento. Screenshots ficam em `.artifacts/`; traces de falhas em `test-results/`.

Para parar a aplicação, use `Ctrl+C` no terminal de desenvolvimento. `npm run db:down` para o container sem excluir o volume persistido. Evite remover o volume se quiser preservar contas.

## Organização

| Pasta | Conteúdo |
| --- | --- |
| `apps/web` | Next.js e interface em português |
| `apps/api` | NestJS, autenticação, usuários, sistemas versionados e Prisma |
| `packages/contracts` | Schemas Zod e DTOs públicos compartilhados |
| `tests/e2e` | Testes de navegação desktop/mobile |
| `docs` | Requisitos, arquitetura, decisões e instruções |

API de saúde: `GET /api/v1/health/live` e `GET /api/v1/health/ready`. A segunda verifica o PostgreSQL.

Consulte o [índice da documentação](docs/README.md), o [MVP](docs/14-mvp.md), a [decisão sobre sistemas](docs/architecture/decisions/002-sistemas-versionados.md) e os [resultados de verificação](docs/verification/003-sistemas.md).

## Limites atuais

Não há recuperação de senha, verificação de e-mail, troca de e-mail/username, campanhas, personagens persistidos ou WebSocket implementados. O editor ainda não oferece autosave, fórmulas, exclusão, restauração de versões ou cópia de sistemas. A prévia mostra a definição, sem criar personagens. O rate limit inicial usa memória por processo; coordenação entre instâncias e Redis entram quando a arquitetura distribuída for implementada. Avatares antigos permanecem até definir política de limpeza.

O provedor de produção não foi escolhido e nenhum deploy foi realizado. A [especificação original](docs/referencias/especificacao-original.md) continua preservada integralmente.
