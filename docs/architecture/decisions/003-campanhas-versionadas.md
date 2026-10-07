# Decisão 003 — Campanhas vinculadas a versões de sistemas

Status: adotada em 7 de outubro de 2026. Recorte de RF008–RF010 e RB03/RB06–RB09. Convites, membros, exclusão e solicitações de ingresso continuam incrementos separados.

## Regras e responsabilidade

Qualquer usuário autenticado cria campanhas usando uma versão de um sistema de sua autoria. A API valida essa autoria no banco, inclusive se o cliente informar uma versão alheia pública. Sistemas de terceiros dependem de política de reutilização/licença e autorizações futuras (DP06).

O criador é o mestre e responsável, identificado por `Campaign.ownerId`, atribuído pela sessão. Somente ele consulta a definição de regras pela campanha ou edita a configuração. Papéis e vínculos de jogadores serão introduzidos com membros; não há vínculo ou ingresso fictício neste incremento.

`Campaign.systemVersionId` é obrigatório e imutável pela API. A seleção na criação usa a versão carregada pelo editor; edições posteriores do sistema não alteram nome, regras ou número de versão vinculados. Uma versão antiga de autoria do mestre também é elegível pela API. O seletor da interface oferece a versão atual de cada sistema, com busca e paginação.

Não há troca de sistema, migração de fichas ou atualização automática de versões. A chave estrangeira impede excluir uma versão ainda referenciada. Exclusão de contas/sistemas/campanhas não é exposta pela aplicação; as cascatas existentes permitem a limpeza de contas sintéticas e seus próprios recursos nos testes.

## Configuração e acesso

| Campo | Regra adotada |
| --- | --- |
| Nome | 2–80 caracteres; espaços externos removidos |
| Descrição | Até 4000 caracteres; vazia permitida |
| Visibilidade | `PRIVATE` ou `PUBLIC`; padrão da interface privada |
| Estado | `PLANNED`, `RECRUITING`, `ACTIVE`, `PAUSED`, `ENDED`, `CANCELLED` |
| Capacidade | Inteiro de 1–20 jogadores, sem contar o mestre; padrão da interface 4 |

Os limites são escolhas de implementação. A origem não define grafo de transição de campanha; neste recorte, o mestre pode selecionar qualquer estado, inclusive reabrir, com registro da mudança. O estado não inicia sessões, não cria convites e não concede acesso a jogadores. Capacidade é configuração; o controle atômico de lotação será aplicado ao aceite de convites quando existir.

Campanha privada retorna 404 em consultas públicas, inclusive a um usuário autenticado que não seja o mestre. Campanha pública permite leitura anônima de nome, descrição, estado, capacidade, perfil público do mestre e nome/número da versão de sistema. Isso não publica a definição de um sistema privado. O editor explica a projeção pública antes de salvar. Sessões e conteúdo futuro terão autorização própria.

Listas pública e do mestre são separadas, com busca por nome/descrição, 20 itens por página e ordenação por atualização/id. A apresentação pública fica em `/c/:id`; listagem na interface fica dentro do painel autenticado. Nenhum e-mail, segredo de sessão, snapshot de auditoria ou definição de regras sai na resposta pública. Leituras usam `no-store`.

## Edição e histórico

Atualização completa por `PUT /campaigns/:id` exige `expectedRevision`. A comparação/incremento da revisão e o registro de `CampaignChange` ocorrem na mesma transação. Sob concorrência, uma escrita vence e a outra recebe `409 CAMPAIGN_REVISION_CONFLICT`.

O editor mantém o rascunho após conflito, bloqueia nova gravação com revisão obsoleta e oferece carregar a campanha atual mediante confirmação de descarte. Salvamento é explícito. Avisos de alterações pendentes cobrem recarga/fechamento e cliques em links; histórico do navegador e logout ainda não são cobertos.

`CampaignChange` contém campanha, revisão única, ator, snapshot da configuração e data. É histórico interno, sem API ou tela de restauração; não substitui auditoria administrativa geral nem uma política de retenção. Não há autosave.

## Limites

Imagem/banner personalizados, tags, idioma estruturado, classificação indicativa, frequência estruturada, membros, convites, personagens, sessões, exclusão, transferência de mestre e campanhas não listadas ficam para incrementos futuros. Descrição permite apresentar tom, frequência e expectativas da mesa em texto. Arte decorativa já existente é usada nas telas.

Veja [contrato HTTP](../../09-api.md), [schema Prisma](../../../apps/api/prisma/schema.prisma) e [verificação](../../verification/005-campanhas.md).
