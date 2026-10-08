# 09 — API

## Status do contrato

As rotas da seção 45 estão preservadas no primeiro catálogo. Payloads, respostas, erros e rotas complementares abaixo são **propostas de contrato** para a plataforma completa. O recorte já implementado está identificado a seguir; as demais rotas ainda não estão disponíveis.

## Contrato implementado — etapa 1

Todas as rotas abaixo usam o prefixo `/api/v1`. Schemas e DTOs reais estão em [contracts](../packages/contracts/src/index.ts).

| Rota | Entrada/saída | Acesso |
| --- | --- | --- |
| `POST /auth/register` | E-mail, username, displayName, password; retorna accessToken, expiresIn, user e cookie refresh | Público; 201 |
| `POST /auth/login` | E-mail/password; mesmo formato de sessão | Público; 200 |
| `POST /auth/refresh` | Cookie refresh e Origin confiável; rota a sessão | Cookie válido; 200 |
| `POST /auth/logout` | Cookie refresh e Origin confiável; revoga a família e limpa cookie | Idempotente; 204 |
| `GET /users/me` | Perfil do titular, incluindo e-mail | Bearer válido |
| `PATCH /users/me` | displayName, bio e location opcionais; ao menos uma alteração | Titular; campos extras rejeitados |
| `POST /users/me/avatar` | Multipart, campo `file`; retorna avatarUrl | Titular; até 2 MB; 201 |
| `GET /users/:username` | Perfil público, sem e-mail ou credenciais | Público |
| `GET /avatars/:key` | Imagem WebP validada | Público |
| `GET /health/live` | Status do processo | Público |
| `GET /health/ready` | Status e conexão com banco | Público |

Cadastro abre a sessão automaticamente nesta etapa. A rota implementada de avatar substitui a proposta `/uploads/avatar` enquanto não existir serviço genérico de uploads. Ver [decisão 001](architecture/decisions/001-base-e-autenticacao.md) para tokens, normalização e limitações.

Proposta: JSON sobre HTTPS, prefixo versionado `/api/v1`, IDs opacos e datas ISO 8601 com offset. As tabelas omitem o prefixo para manter correspondência com a origem. Campos desconhecidos devem ser rejeitados ou filtrados de modo explícito, nunca aplicados diretamente ao modelo do banco.

## Contrato implementado — sistemas

As rotas abaixo também usam `/api/v1`. Escritas rejeitam campos desconhecidos e atribuem autoria pela sessão. Metadados incluem `id`, `name`, `description`, `visibility`, `revision`, datas ISO UTC e `owner` com id/username/displayName. Detalhes acrescentam `versionId` e `definition`.

| Rota | Entrada/saída | Acesso |
| --- | --- | --- |
| `POST /systems` | `CreateSystemInput`; retorna detalhe da versão 1, 201 | Autenticado |
| `PUT /systems/:id` | Definição completa e `expectedRevision`; retorna nova versão | Autor; 409 se revisão obsoleta |
| `GET /systems/mine` | `page` e `search`; retorna `SystemsPage` | Sistemas do titular, em todas as visibilidades |
| `GET /systems/mine/:id` | Detalhe atual | Autor; 404 para recurso alheio/inexistente |
| `GET /systems/public` | `page` e `search`; retorna `SystemsPage` | Público; somente `PUBLIC` |
| `GET /systems/:id` | Detalhe atual | Público; `PUBLIC` ou `UNLISTED`; privados retornam 404 |

Listas usam `{items, page, pageSize, total}`; 20 itens por página, `page` de 1–10000 e busca de até 80 caracteres por nome/descrição sem diferença de maiúsculas/minúsculas. Ordenação por atualização decrescente e id crescente. Rotas retornam `Cache-Control: no-store`. IDs de sistema são UUID v4; chamadas privadas sem sessão retornam 401, entradas inválidas retornam 400. Conflito usa `SYSTEM_REVISION_CONFLICT` no envelope de erro existente.

Não há `GET /systems`, `PATCH /systems/:id`, exclusão ou consulta de versões antigas implementados. A tabela de origem abaixo preserva o planejamento; o recorte atual usa `PUT` para salvar uma definição completa e separa listas públicas/privadas. A [decisão 002](architecture/decisions/002-sistemas-versionados.md) registra os limites, a visibilidade e o vínculo de versões.

## Contrato implementado — campanhas

Prefixo `/api/v1`; schemas em `contracts`. `CreateCampaignInput` contém nome, descrição, visibilidade pública/privada, estado, `maxPlayers` e `systemVersionId`. A autoria é atribuída pela sessão; somente versões de sistemas criados pelo mestre são elegíveis. `UpdateCampaignInput` contém a configuração completa e `expectedRevision`, sem aceitar troca de sistema ou mestre.

| Rota | Entrada/saída | Acesso |
| --- | --- | --- |
| `POST /campaigns` | `CreateCampaignInput`; retorna `CampaignDetail`, 201 | Autenticado; sistema de autoria do titular |
| `PUT /campaigns/:id` | `UpdateCampaignInput`; retorna detalhe atualizado | Mestre; 409 para revisão obsoleta |
| `GET /campaigns/mine` | `page`, `search`; retorna `CampaignsPage` | Campanhas próprias ou com vínculo de jogador ativo |
| `GET /campaigns/mine/:id` | Configuração e definição da versão vinculada | Mestre/jogador ativo; 404 para usuário sem vínculo |
| `GET /campaigns/public` | `page`, `search`; retorna apresentações públicas | Anônimo; somente `PUBLIC` |
| `GET /campaigns/:id` | `CampaignSummary` com apresentação da campanha | Anônimo; privado retorna 404 |

`CampaignSummary` inclui id, nome, descrição, visibilidade, estado, capacidade, revisão, datas, perfil público do mestre e `system: {name, version}`. A projeção pública não inclui definição nem identificador da versão, e-mail ou auditoria. `CampaignDetail`, disponível ao mestre/jogador ativo, acrescenta `systemVersionId`, `definition` e `role: OWNER | PLAYER`. Sistema privado permanece privado mesmo quando a campanha é pública; a leitura autorizada das regras pela campanha não libera a API privada do sistema ao jogador.

Listas e validação de UUID seguem o padrão de sistemas: 20 itens, página 1–10000, busca de até 80 caracteres, ordenação por atualização/id e `no-store`. Schemas estritos rejeitam campos extras e capacidades fora de 1–20. Erro de versão alheia/inexistente usa 404 `CAMPAIGN_SYSTEM_UNAVAILABLE`; edição concorrente usa 409 `CAMPAIGN_REVISION_CONFLICT`. Escrita e `CampaignChange` são transacionais.

Não há `GET /campaigns`, `PATCH`, exclusão ou inscrição pública implementados. Veja as decisões [003](architecture/decisions/003-campanhas-versionadas.md) e [004](architecture/decisions/004-convites-e-membros.md). Reduzir capacidade abaixo dos jogadores ativos retorna 409 `CAMPAIGN_CAPACITY_CONFLICT`; não é conflito de revisão e o formulário permite corrigir e tentar novamente.

## Contrato implementado — convites e membros

Prefixo `/api/v1`, autenticação Bearer e `Cache-Control: no-store` em todas as rotas. UUID v4 para parâmetros. Identidades e papéis são atribuídos pela sessão, sem confiar em campos enviados pelo cliente.

| Rota | Entrada/saída | Acesso |
| --- | --- | --- |
| `GET /users/me/invitations` | `page`; `InvitationsPage` | Somente convites destinados ao titular |
| `GET /campaigns/:id/invitations` | `page`; `InvitationsPage` | Mestre da campanha |
| `POST /campaigns/:id/invitations` | `{username}` estrito; `CampaignInvitation`, 201 | Mestre; conta existente |
| `POST /invitations/:id/accept` | Sem payload; `CampaignInvitation`, 200 | Destinatário; vaga e campanha aberta |
| `POST /invitations/:id/decline` | Sem payload; `CampaignInvitation`, 200 | Destinatário |
| `DELETE /campaigns/:id/invitations/:invitationId` | Sem payload, 204 | Mestre; revoga pendente |
| `GET /campaigns/:id/members` | `CampaignMembers` | Mestre/jogador ativo |
| `DELETE /campaigns/:id/members/:userId` | Sem payload, 204 | Mestre; remove jogador |

Listas têm 20 itens por página, `page` 1–10000 e ordenação por criação decrescente/id crescente. `CampaignInvitation` inclui id, status, datas ISO UTC, campanha `{id,name}`, remetente/destinatário `{id,username,displayName}` e `recipientIsMember`. Não inclui e-mail ou definição. O estado vencido é retornado como `EXPIRED`, mesmo antes da atualização persistida por um novo envio. Convites aceitos de membros removidos permanecem no histórico sem conceder acesso.

`CampaignMembers` retorna `{items,playerCount,maxPlayers}`; cada item contém identidade pública, `role` e `joinedAt`. Mestre (`OWNER`) aparece na lista mas não conta nas vagas; jogadores ativos usam `PLAYER`. Membros removidos não aparecem na lista atual.

Entrada inválida/convite para si/remoção do mestre: 400. Falta de sessão: 401. Recurso privado, convite alheio ou conta inexistente: 404. Conflitos 409 incluem `INVITATION_PENDING`, `ALREADY_CAMPAIGN_MEMBER`, `INVITATION_LIMIT`, `INVITATION_EXPIRED`, `INVITATION_ALREADY_RESOLVED`, `CAMPAIGN_FULL` e `CAMPAIGN_CLOSED`. Falta de vaga mantém o convite pendente. Aceite repetido enquanto membro ativo, recusa repetida, revogação repetida e remoção repetida são idempotentes. Reingresso após remoção exige novo convite.

## Contrato implementado — personagens

Prefixo `/api/v1`, Bearer, UUID v4 e `Cache-Control: no-store`. Schemas estritos em contracts.

| Rota | Entrada/saída | Acesso |
| --- | --- | --- |
| `GET /characters/mine` | page/search; CharactersPage | Próprias fichas com acesso atual |
| `GET /campaigns/:id/characters` | page/search; CharactersPage | Mestre: todas; jogador ativo: próprias |
| `POST /campaigns/:id/characters` | name, description, story, level e values opcional; CharacterDetail, 201 | Cria para o titular; mestre/jogador ativo; campanha aberta |
| `GET /characters/:id` | CharacterDetail | Dono ativo ou mestre |
| `PUT /characters/:id` | Metadados, values completos, expectedRevision; CharacterDetail | Dono ativo ou mestre |

level é null ou inteiro positivo. values tem arrays attributes/skills/resources com `{fieldId,value}`, todos os campos da versão fixa uma vez. Sem values na criação, o servidor aplica defaults. Identidade, campanha e versão não são campos de entrada. Recursos respeitam máximo da versão e não podem ser negativos. PUT é substituição completa, com revisão otimista e histórico transacional.

Listas têm 20 itens, page 1–10000, search até 80, ordenação atualização/id. Resumos incluem dono/campanha/sistema e apresentação, omitindo história, valores, definição e e-mail. Detalhe autorizado inclui definition, values, systemVersionId e canEdit.

Sessão ausente: 401. Conteúdo inacessível: 404. Payload inválido: 400; valores divergentes da definição: CHARACTER_VALUES_INVALID. Conflitos 409: CHARACTER_REVISION_CONFLICT, CHARACTER_LIMIT (20 por dono/campanha), CHARACTER_CAMPAIGN_CLOSED. Remoção revoga acesso sem apagar fichas. Não há PATCH, DELETE, transferência ou rota pública de personagens. Veja a [decisão 005](architecture/decisions/005-personagens-e-fichas.md).

## Rotas de origem

| Método e rota | Operação | Autorização esperada |
| --- | --- | --- |
| `POST /auth/register` | Cadastro | Visitante; limites de abuso |
| `POST /auth/login` | Login | Visitante; verificação de credenciais |
| `POST /auth/logout` | Logout | Sessão/token a revogar |
| `POST /auth/refresh` | Renovação | Refresh token válido |
| `GET /users/:username` | Perfil público | Visitante/usuário; projeção pública |
| `PATCH /users/me` | Editar próprio perfil | Titular autenticado |
| `POST /systems` | Criar sistema | Usuário autenticado |
| `GET /systems` | Listar sistemas | Público vê públicos; privados só em consulta autorizada |
| `GET /systems/:id` | Consultar sistema | Conforme visibilidade e autorização |
| `PATCH /systems/:id` | Editar sistema | Criador; versão em uso segue DP06 |
| `DELETE /systems/:id` | Excluir sistema | Criador; dependências/retenção seguem DP08 |
| `POST /campaigns` | Criar campanha | Usuário; acesso ao sistema |
| `GET /campaigns` | Listar campanhas | Projeção pública ou conjunto autorizado |
| `GET /campaigns/:id` | Consultar campanha | Conforme visibilidade e vínculo |
| `PATCH /campaigns/:id` | Editar campanha | Responsável/Mestre autorizado |
| `DELETE /campaigns/:id` | Excluir campanha | Responsável; política DP08 |
| `POST /campaigns/:id/invitations` | Convidar | Mestre autorizado |
| `GET /campaigns/:id/members` | Consultar membros | Vínculo autorizado; perfil público separado |
| `DELETE /campaigns/:id/members/:userId` | Remover membro | Mestre; proteção do responsável |
| `POST /campaigns/:id/characters` | Criar personagem | Membro com permissão |
| `GET /characters/:id` | Consultar personagem | Vínculo/audiência autorizada |
| `PATCH /characters/:id` | Editar personagem | Dono autorizado ou Mestre |
| `DELETE /characters/:id` | Excluir personagem | Política a definir por dono/Mestre |
| `POST /campaigns/:id/sessions` | Criar sessão | Mestre |
| `GET /sessions/:id` | Consultar sessão | Projeção correspondente ao acesso |
| `POST /sessions/:id/start` | Iniciar sessão | Mestre; transição válida |
| `POST /sessions/:id/end` | Encerrar sessão | Mestre; transição válida |

O endpoint de exclusão de sistema existe no catálogo original, embora não seja condição do fluxo mínimo do MVP 1. Deve aplicar proteção de referências antes de ser disponibilizado.

## Rotas complementares propostas

Estas rotas preenchem lacunas dos fluxos, sem atribuir sua existência à origem.

| Método e rota | Finalidade | Etapa |
| --- | --- | --- |
| `GET /users/me` | Identidade e perfil do usuário atual | MVP 1 |
| `GET /users/me/campaigns` | Campanhas das quais participa/administra | MVP 1 |
| `GET /users/me/invitations` | Convites do destinatário autenticado | MVP 1 |
| `POST /invitations/:id/accept` | Aceitar convite | MVP 1 |
| `POST /invitations/:id/decline` | Recusar convite | MVP 1 |
| `DELETE /campaigns/:id/invitations/:invitationId` | Revogar convite pendente | MVP 1 |
| `GET /campaigns/:id/characters` | Fichas autorizadas na campanha | MVP 1 |
| `GET /campaigns/:id/sessions` | Agenda/histórico autorizado | MVP 1 |
| `GET /sessions/live` | Descoberta pública de sessões ativas elegíveis | MVP 1 |
| `GET /sessions/:id/messages` | Histórico autorizado de mensagens | MVP 1 |
| `GET /sessions/:id/rolls` | Histórico autorizado de dados | MVP 1 |
| `POST /uploads/avatar` | Enviar avatar ou obter upload autorizado | MVP 1; mecanismo de storage pendente |
| `POST /campaigns/:id/join-requests` | Solicitar ingresso | Após MVP 1 |
| `POST /campaigns/:id/join-requests/:requestId/accept` | Aceitar solicitação | Após MVP 1 |
| `POST /campaigns/:id/join-requests/:requestId/decline` | Recusar solicitação | Após MVP 1 |

O roteamento deve distinguir caminhos estáticos (`/users/me`, `/sessions/live`) de parâmetros. Chat, dados e presença usam o contrato de tempo real proposto; não inventar endpoints de escrita HTTP paralelos sem necessidade e regra compartilhada.

## Payloads ilustrativos

Valores e IDs são fictícios. O exemplo de sistema corresponde ao contrato implementado; campanha, sessão e ficha continuam propostas.

### Criar sistema

```json
{
  "name": "Crônicas de Aether",
  "description": "Fantasia e exploração em reinos flutuantes.",
  "visibility": "PRIVATE",
  "definition": {
    "schemaVersion": 1,
    "attributes": [
      { "id": "130a6b3c-8b77-42f1-a538-06580b753a91", "name": "Vontade", "defaultValue": 2 }
    ],
    "skills": [
      { "id": "fc2c14fe-39a0-426a-a4eb-c10c7ca14ac8", "name": "Investigação", "defaultValue": 0, "attributeId": "130a6b3c-8b77-42f1-a538-06580b753a91" }
    ],
    "resources": [
      { "id": "be58a853-5c44-4e22-81df-09222aee0518", "name": "Energia", "defaultValue": 5, "maxValue": 10 }
    ],
    "dice": [6, 20]
  }
}
```

Não exigir Força ou Vida como campos fixos. O servidor gera IDs de sistema/versão e deriva autor da sessão; o editor gera UUIDs dos campos, preservados entre versões. `attributeId` pode ser nulo, `maxValue` pode ser nulo e todas as listas podem ser vazias. Na edição, enviar o mesmo corpo mais `expectedRevision` com a revisão lida.

### Criar campanha

```json
{
  "name": "A chegada a Eldoria",
  "systemVersionId": "sv_exemplo",
  "description": "Uma expedição às fronteiras de Aether.",
  "visibility": "PUBLIC",
  "status": "RECRUITING",
  "maxPlayers": 5,
  "language": "pt-BR",
  "tags": ["fantasia", "exploração"]
}
```

`systemVersionId` deverá referenciar a versão imutável adotada na decisão 002. O responsável vem da autenticação. Criação de campanha ainda não está disponível.

### Criar sessão

```json
{
  "title": "A Floresta Negra",
  "description": "O grupo segue as pistas do templo.",
  "scheduledAt": "2030-05-18T19:00:00-03:00",
  "timezone": "America/Fortaleza",
  "visibility": "PRIVATE",
  "participantIds": ["usr_jogador_exemplo"]
}
```

Data meramente ilustrativa. Servidor valida vínculo dos participantes; estado inicial é controlado pelo serviço.

### Atualizar ficha

```json
{
  "revision": 3,
  "attributes": [{ "attributeId": "attr_forca_exemplo", "value": 2 }],
  "resources": [{ "resourceId": "res_vida_exemplo", "current": 18 }]
}
```

Proposta: `409` se a revisão estiver obsoleta; a resposta traz a nova revisão somente após persistência. IDs de outra campanha ou versão são rejeitados.

## Respostas e erros propostos

- `200`: consulta ou alteração concluída; `201`: recurso criado; `204`: ação concluída sem corpo.
- `400`: formato/entrada inválida; `401`: credencial ausente, inválida ou expirada.
- `403`: identidade válida, ação proibida; `404`: recurso inexistente ou ocultado para proteger existência.
- `409`: conflito de estado, versão, capacidade ou unicidade.
- `413`: arquivo/corpo acima do limite; `429`: limite de requisições; `500`: erro interno sem detalhes secretos.

```json
{
  "error": {
    "code": "SESSION_STATE_CONFLICT",
    "message": "Esta sessão não pode ser iniciada no estado atual.",
    "requestId": "req_exemplo",
    "details": []
  }
}
```

Código estável para o cliente; mensagem compreensível e eventualmente traduzida. Não retornar stack, SQL, tokens, hash ou dados privados em `details`.

## Paginação, descoberta e projeções

Sistemas já usam paginação por página conforme o contrato acima. Para listas futuras, proposta: `items` e `nextCursor`, com `limit` máximo a definir. Histórico ordena por timestamp e ID para evitar ambiguidades.

Filtros de origem para explorar incluem sistema, gênero, idioma, jogadores, recrutamento, classificação, popularidade, recentes e mais assistidas. No MVP 1, priorizar filtros suportados por dados existentes; popularidade e rankings precisam de definição posterior.

`GET /campaigns` não deve misturar campanhas privadas do titular na resposta pública por acidente. Preferir a rota autenticada de minhas campanhas. Conteúdo público usa DTO próprio, sem campos secretos, permissões internas ou tokens de convite.

## Contratos a produzir na implementação

Publicar especificação OpenAPI, schemas de validação e exemplos de erro somente depois de fixar os payloads. Definir idempotência de ações repetidas: aceite não duplica membros e início/encerramento não emitem efeitos administrativos duplicados.

## Referências

[WebSocket](10-websocket.md), [segurança](11-seguranca.md), [permissões](12-permissoes.md) e [dados](08-modelo-de-dados.md).
