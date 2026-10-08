# Verificação 006 — Convites e membros

Registro histórico desta entrega. Personagens e fichas foram implementados depois, na [decisão 005](../architecture/decisions/005-personagens-e-fichas.md) e [verificação 007](007-personagens-e-fichas.md).

Entrega de 7 de outubro de 2026. História: o mestre convida uma conta existente; o destinatário responde, ingressa conforme a capacidade e consulta as regras privadas; remoção encerra esse acesso. Políticas na [decisão 004](../architecture/decisions/004-convites-e-membros.md).

## Entrega

Caixa de convites no dashboard e `/convites`, histórico paginado, envio por username, aceite/recusa, expiração em sete dias, revogação pelo mestre e lista de membros. Jogadores ativos recebem a campanha na lista pessoal e podem consultar configuração, membros e regras fixas. Controles administrativos permanecem exclusivos do mestre. Aceite no dashboard atualiza a lista de campanhas imediatamente.

Migration aditiva `20261007210000_invitations_members`, com enums, tabelas, FKs, índices e unicidades de vínculo e convite pendente. Mestre derivado de ownerId, sem backfill de campanhas existentes. Aplicada no PostgreSQL local com `npm run db:migrate`.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| Tipos | `npm run typecheck` passou em API, web e contratos |
| Build | `npm run build` passou em contratos, NestJS e Next.js, com checagem TypeScript e nova rota `/convites` |
| Integração PostgreSQL | `npm run test:api`: 34 passaram, incluindo oito casos de convites/membros |
| Identidade/autorização | Convite atribuído à sessão; normalização de username; self-invite, conta inexistente, identidade extra e administração alheia rejeitados |
| Privacidade | Pendente não concede acesso; inbox exclusivo do destinatário; enviados exclusivos do mestre; sem e-mail/credenciais/regras nos DTOs de convite |
| Idempotência/persistência | Envios simultâneos produzem um convite; aceite repetido mantém um membro; consultas sobrevivem ao reinício da API |
| Última vaga | Dois aceites concorrentes: um entra, outro recebe 409 e mantém convite pendente; remoção libera a vaga |
| Revogação concorrente | Aceite e revogação têm um resultado consistente, sem vínculo associado a convite revogado |
| Capacidade | Redução abaixo da ocupação negada; alteração concorrente com aceite não excede maxPlayers |
| Expiração/estado | Convite vencido rejeitado; novo envio permitido; Finalizada/Cancelada bloqueiam ingresso mas permitem recusa |
| Remoção/reingresso | Sem novas leituras/lista/regras após remoção; mestre protegido; convite aceito antigo não reativa; novo convite reutiliza vínculo único |
| E2E completo | `npm run test:e2e -- --max-failures=1`: 14 cenários passaram, sete em desktop e sete em Pixel 7 |
| Fluxo com três contas | Recusa, aceite pelo dashboard, lista atualizada, consulta sem controles administrativos, lotação, remoção com tela aberta, reingresso, redução inválida/correção e revogação passaram nos dois dispositivos |
| Caixa de convites | 21 registros: páginas de 20/1 itens, convite vencido sem botão de aceite e falha 503 simulada seguida de recuperação passaram nos dois dispositivos |
| Persistência SQL | Confirmados vínculo único reativado, membro removido, jogador ativo e estados finais dos cinco convites do fluxo |
| Navegador | Sem erros de página no fluxo com três contas; largura de página dentro do viewport nas telas verificadas |
| Barra em 320 px | Após ajustar espaçamento da navegação, os dois cenários móveis passaram novamente; quatro links principais, perfil e saída ficaram integralmente dentro do viewport |

Os testes locais guardam o destino do banco, usam contas sintéticas e removem somente seus próprios registros por IDs. A caixa paginada usa 21 fixtures históricas locais e uma falha HTTP simulada para testar recuperação; esses dados não são publicados.

As primeiras execuções direcionadas corrigiram a preparação de fixtures e as esperas do verificador: mensagens foram localizadas dentro do conteúdo, remoção foi aguardada antes do foco do jogador e o teste de correção de capacidade passou a alterar um valor efetivamente diferente. Restaurar o valor já salvo mantém o botão desativado porque não há alteração. A regressão completa acima passou depois desses ajustes, preservando a autenticação e as regras do produto.

Capturas de jogador, membros/convites e caixa de convites em `.artifacts/{desktop,mobile}-*.png` foram inspecionadas, além de `.artifacts/convites-320px.png` e `.artifacts/navegacao-320px.png`. A revisão visual identificou saída cortada na largura mínima; o espaçamento foi corrigido e a nova checagem exige visibilidade integral dos seis controles. A barra fixa pode aparecer no meio da captura completa por composição de screenshot.

## Publicação

Publicado em **[Paralax RPG — Convites](https://paralax-rpg-web.vercel.app/convites)**, código `0335695`, pelos projetos Vercel existentes, sem envio ao GitHub. Target `production`, usado como endereço estável de testes.

| Campo | Web | API |
| --- | --- | --- |
| Framework / status | Next.js / `READY` | NestJS / `READY` |
| Build | 32 segundos | 34 segundos |
| Deployment | `dpl_DKvadQz5x5mM2VUjC41EjKgutxxQ` | `dpl_BozrsQWgQLFxWxZGsW1jDsU6HrQk` |
| Inspeção | [Web](https://vercel.com/lucky-8804ce74/paralax-rpg-web/DKvadQz5x5mM2VUjC41EjKgutxxQ) | [API](https://vercel.com/lucky-8804ce74/paralax-rpg-api/BozrsQWgQLFxWxZGsW1jDsU6HrQk) |

Quarta migration aplicada por conexão direta ao Neon após confirmar as três anteriores, IDs da equipe/projeto e ambiente online de testes. IDs de usuários, sistemas, versões, campanhas e histórico anteriores conferidos antes/depois e preservados. Sem reset, seed ou cópia do banco local. Readiness da API pública confirmou banco conectado e a nova rota de inbox retornou 401 sem autenticação. A adição de tabelas permite retornar ao código anterior sem desfazer o schema; nesse caso o suporte a jogadores/convites fica indisponível até restaurar o código novo.

## Verificação online e observabilidade

Smoke test pelo domínio público, sem login Vercel ou bypass, passou em Chromium desktop e Pixel 7, com três contas distintas por dispositivo:

- Cadastro e campanha privada vinculada a um sistema próprio.
- Jogador sem vínculo recebe 404 antes do aceite.
- Recusa, novo envio e aceite pela interface, com leitura das regras privadas e ausência de controles administrativos no jogador.
- Sistema original privado continua inacessível pela sua API pública.
- Segundo jogador encontra mesa lotada e mantém convite pendente.
- Remoção confirmada pelo mestre, seguida de foco na tela já aberta do jogador, remove o conteúdo privado e mostra perda de acesso.
- Vaga liberada permite o aceite do outro jogador.
- Novo convite ao removido revogado; histórico aceito anterior não oferece acesso à campanha.
- Recarga mantém histórico e remoção; SQL no Neon confirma estados dos convites e vínculos ACTIVE/REMOVED.
- Sem erros de página e sem overflow horizontal nas telas verificadas.

Capturas online de jogador, administração e histórico em `.artifacts/online-{desktop,mobile}-{jogador,convites-mestre,convites-revogados}.png` foram inspecionadas. Contas sintéticas e seus dados foram removidos ao final por id, e-mail e username exatos. TLS permaneceu verificado com certificados do sistema no Node.js local.

Logs dos dois deployments finais consultados na janela de uma hora: nenhum HTTP 500, zero eventos de nível `error` no web. API apresentou três avisos do driver PostgreSQL sobre `sslmode`, todos em respostas 200; nenhum outro evento de erro. O limite de consulta foi 100 registros e os resultados ficaram abaixo dele. Não foram adicionados drains nem monitoramento externo contínuo. As evidências cobrem o fluxo e a janela consultados, sem teste de carga ou garantia de disponibilidade contínua.

## Limites

Personagens, sessões, WebSocket, solicitações públicas, e-mail/link de convite, saída voluntária, mestre auxiliar e permissões individuais continuam futuros. Não há push: membros/convites atualizam ao recuperar foco e a cada 30 segundos enquanto a tela está visível. Remoção bloqueia novas requisições imediatamente; dados já recebidos não podem ser recolhidos. Histórico dos convites e último estado/datas do vínculo não representam auditoria completa de todas as ações.
