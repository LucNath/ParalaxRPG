# Verificação 006 — Convites e membros

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

## Limites

Personagens, sessões, WebSocket, solicitações públicas, e-mail/link de convite, saída voluntária, mestre auxiliar e permissões individuais continuam futuros. Não há push: membros/convites atualizam ao recuperar foco e a cada 30 segundos enquanto a tela está visível. Remoção bloqueia novas requisições imediatamente; dados já recebidos não podem ser recolhidos. Histórico dos convites e último estado/datas do vínculo não representam auditoria completa de todas as ações.
