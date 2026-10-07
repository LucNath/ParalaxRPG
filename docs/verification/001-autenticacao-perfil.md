# Verificação 001 — Autenticação e perfil

**Data:** 7 de outubro de 2026. **Ambiente:** Windows, Node.js 26.5.0, npm 11.17.0, PostgreSQL 17 em Docker, Chromium via Playwright.

**História verificada:** pessoa cria conta pela interface → API valida/persiste em PostgreSQL → sessão autenticada abre dashboard → pessoa edita perfil e avatar → dados sobrevivem à recarga → perfil público omite dados privados → logout revoga acesso → novo login restaura o perfil.

## Resultado

| Fronteira | Status | Evidência |
| --- | --- | --- |
| Interface renderiza | Aprovado | Navegação e screenshots em desktop 1440×1000 e emulação Pixel 7 |
| Cliente → API | Aprovado | Cadastro 201, alteração 200, upload 201, logout 204 e login 200 nos testes |
| API → banco | Aprovado | Testes consultam User, Profile e RefreshSession no PostgreSQL real |
| Banco → resposta | Aprovado | Valores de perfil e chave de avatar recuperados; resposta pública sem e-mail/hash |
| Resposta → interface | Aprovado | Nome, biografia, localização e avatar aparecem após salvar e recarregar |
| Persistência após reinício | Aprovado | Teste fecha/reabre API e consulta perfil e sessão preservados no banco |
| Autorização | Aprovado | Rejeita token inválido/expirado, emissor/destinatário incorretos e edição de outro usuário |
| Revogação | Aprovado | Rotação invalida access antigo; replay revoga família; logout impede access/refresh imediatamente |
| Arquivos | Aprovado | Avatar real normalizado; conteúdo falso, formato ativo e upload acima de 2 MB rejeitados |
| Configuração | Aprovado no ambiente local | .env gerado e ignorado pelo Git; banco isolado; segredos sem exposição no frontend |

## Comandos e resultados executados

| Comando | Resultado observado |
| --- | --- |
| `npm run setup` | Configuração local criada com credenciais aleatórias |
| `npm run db:up` | Container próprio saudável na porta 56432 |
| `prisma migrate dev --name init_auth`, no workspace da API | Migration inicial criada e aplicada |
| `npm run check` | Tipos dos três workspaces e 11 testes de integração aprovados |
| `npm run test:e2e` | Quatro testes aprovados: dois cenários em desktop e mobile |
| `npm run build` | Backend e frontend compilados; sete rotas/páginas de frontend geradas |
| `npm audit` | Zero vulnerabilidades conhecidas no conjunto instalado/lockfile desta verificação |

`npm run db:migrate` usa `migrate deploy` para aplicar a migration existente em novas instalações, sem recriar o schema por `db push`.

## Cobertura dos testes

Os 11 testes de API cobrem hash de senha/token, validação/duplicatas, login incorreto, projeção pública, edição restrita, validade JWT, refresh/replay, logout/origem, avatar, reinício da API e rate limit.

Os quatro testes E2E cobrem a jornada completa de conta/perfil e mensagens de validação/login em desktop e celular. Verificam também cookie HttpOnly, ausência de tokens em localStorage/sessionStorage, console sem exceções de página e largura sem overflow na página inicial/dashboard.

RF001–RF003 foram exercitados. RNF001–RNF003 e RNF007 têm evidências no recorte implementado. HTTPS de produção (RNF004), tempo real (RNF005), múltiplas instâncias (RNF006) e auditoria do Mestre (RNF008) precisam dos próximos módulos/ambientes; não estão declarados concluídos.

## Ajustes durante a verificação

- A porta inicial sugerida de PostgreSQL já era usada por outro projeto; foi adotada 56432, preservando os serviços existentes.
- A auditoria encontrou dependências desatualizadas; versões e overrides foram corrigidos e builds/testes reexecutados.
- A fixture PNG inicial tinha conteúdo inválido; o teste agora gera imagem válida com Sharp.
- Seletores E2E ambíguos foram limitados ao conteúdo principal, distinguindo links da sidebar e o anunciador de rotas do Next.js.
- A revisão React verificou estado por provider, acesso sem armazenamento persistente de tokens, limpeza de efeitos, rótulos, foco, loading/erros e permissões no servidor.

## Evidências locais

Screenshots: `.artifacts/desktop-inicio.png`, `.artifacts/mobile-inicio.png`, `.artifacts/desktop-perfil.png`, `.artifacts/mobile-perfil.png`, `.artifacts/desktop-dashboard.png` e `.artifacts/mobile-dashboard.png`. Artefatos são locais e ignorados pelo Git.

Testes de API limpam apenas as contas/arquivos que criaram. E2E também removem seus registros após cada cenário e usam somente o banco local de desenvolvimento.

## Limites

O workflow CI foi escrito, mas ainda não foi executado no GitHub. Não houve deploy, teste de carga, inspeção de produção ou validação de WebSocket. Capturas de mobile são emulação Chromium, não evidência de teste em aparelho físico.

O recorte usa armazenamento local de avatares e rate limit em memória por instância. Os módulos de sistemas/campanhas e o fluxo completo dos três usuários do MVP 1 continuam pendentes.

## Referências

[Execução](../../README.md), [decisão 001](../architecture/decisions/001-base-e-autenticacao.md), [plano de testes](../16-testes.md), [testes da API](../../apps/api/test/auth.integration.test.cjs) e [testes E2E](../../tests/e2e/auth-profile.spec.ts).
