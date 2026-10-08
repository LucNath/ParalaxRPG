# Decisão 004 — Convites e membros

Personagens e fichas receberam posteriormente a [decisão 005](005-personagens-e-fichas.md) e [verificação 007](../../verification/007-personagens-e-fichas.md). As limitações abaixo registram o estado anterior.

Status: adotada em 7 de outubro de 2026. Complementa a [decisão 003](003-campanhas-versionadas.md), implementando RF009, RF011 e a administração de membros de RF024. Resolve DP04 para o convite por conta existente; e-mail e links continuam futuros.

## Identidade e ciclo de vida

O mestre convida uma conta por `username`, normalizado para minúsculas e aceitando `@` inicial. Destinatário, campanha e remetente são resolvidos no servidor; o cliente não atribui identidade nem papel. Não há envio de e-mail, token compartilhável ou cadastro automático. A pessoa responde na caixa de convites do dashboard ou em `/convites`.

O convite vence em sete dias e assume `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED` ou `EXPIRED`. Não concede acesso antes do aceite e não reserva vaga. Até 50 convites pendentes válidos por campanha; há no máximo um pendente por campanha/destinatário, garantido também por índice único parcial no PostgreSQL. Expiração é calculada nas leituras e validada ao responder; um novo envio marca os pendentes vencidos da campanha como expirados. Não depende de cron.

Somente o destinatário aceita/recusa; somente o mestre envia, consulta enviados e revoga pendentes. Recusa e revogação repetidas são idempotentes. Aceite repetido retorna sucesso enquanto o vínculo permanece ativo, sem duplicar membros. Outra resposta após estado final retorna 409. Campanhas `ENDED` e `CANCELLED` bloqueiam novos convites e aceites; permitem recusa e administração dos membros existentes. O mestre pode reabrir a campanha.

## Participação e capacidade

O mestre é derivado de `Campaign.ownerId` e aparece como `OWNER` no DTO, sem outra linha de vínculo. `CampaignMember` representa jogadores, com unicidade `(campaignId,userId)`, estado `ACTIVE`/`REMOVED` e datas de entrada/remoção. O jogador removido só retorna mediante novo convite; um convite aceito anteriormente não reativa sua participação. O novo aceite reutiliza a linha do vínculo e atualiza a data de ingresso.

`maxPlayers` conta jogadores ativos, excluindo o mestre. Aceite, remoção, envio/revogação de convite e edição da campanha usam o mesmo bloqueio de linha `SELECT ... FOR UPDATE` dentro de transações. Disputas pela última vaga, aceite contra revogação e redução da capacidade são serializadas. Capacidade abaixo da ocupação é rejeitada com 409; falta de vaga mantém o convite pendente. O estado do convite e o vínculo são gravados atomicamente.

## Acesso e privacidade

O mestre e jogadores ativos consultam configuração, versão fixa e membros. Apenas o mestre edita configuração ou administra membros/convites. `/campaigns/mine` passa a incluir campanhas próprias e aquelas com vínculo ativo; detalhe privado informa `role`. Conhecer o ID, ter convite pendente ou ter sido membro não autoriza leitura. Recursos privados inacessíveis retornam 404; falta de autenticação retorna 401.

Participar permite ler a definição da versão escolhida pela campanha, inclusive quando o sistema original é privado. Isso não publica o sistema, não permite sua edição e não libera sua API privada ao jogador. A apresentação pública continua excluindo regras, histórico e e-mail. Convites e membros usam projeções explícitas de identidade pública; não retornam credenciais, endereço de e-mail ou a definição privada.

Remoção marca o vínculo como `REMOVED`, revoga convites pendentes dessa pessoa e impede novas consultas privadas imediatamente. A tela aberta atualiza membros ao recuperar foco e a cada 30 segundos enquanto visível; uma resposta 404 remove o conteúdo privado da tela. Não é possível recolher dados já recebidos pelo navegador. Não há WebSocket ou revogação de canais nesta etapa.

## Limites

Sem solicitação pública de ingresso, saída voluntária, transferência de mestre, GM auxiliar, overrides de permissão, notificações push ou convites por e-mail/link. Histórico dos convites e estado/datas do vínculo são persistidos; não constituem auditoria completa de cada remoção/reingresso. Personagens e política de retenção de suas fichas serão decididos na próxima etapa.

A migration `20261007210000_invitations_members` é aditiva. Campanhas existentes mantêm seu mestre sem backfill. O schema Prisma e a migration SQL são complementares: o índice parcial está no SQL. Evidências em [verificação 006](../../verification/006-convites-e-membros.md).
