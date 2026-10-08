# Decisão 008 — Conquistas e cosméticos estáticos

Data: 8 de outubro de 2026. Status: adotada para o primeiro incremento solicitado em [20](../../20-conquistas-e-personalizacao.md).

## Comportamento

Quatro marcos de conta, de etapa única (0/1):

| Código | Condição confirmada no servidor | Item concedido |
| --- | --- | --- |
| identity | Biografia não vazia e avatar salvo, em qualquer ordem | Portal violeta, borda SVG |
| first-character | Criar uma ficha própria válida | Refúgio luminoso, fundo WebP |
| first-campaign | Criar uma campanha própria válida | Cidadela flutuante, fundo WebP |
| first-roll | Gravar uma rolagem válida em sessão LIVE | Caminho dos dados, borda SVG |

Mestre/jogador podem obter marcos conforme as ações permitidas. Tentativa rejeitada não concede item. Reenvio da rolagem não concede novamente. Os prêmios não são equipados automaticamente; escolhas opcionais independentes de fundo e borda, removíveis sem perder a propriedade. O banner padrão atual continua disponível.

## Persistência e integridade

Catálogo pequeno e versionado em `@paralax/contracts`; não há editor administrativo de catálogos. `UserAchievement` guarda conta, código, earnedAt e ruleVersion=1. `UserCosmetic` guarda conta, código e earnedAt. Chaves compostas únicas impedem concessão repetida. CHECKs limitam os códigos implementados; ampliação do catálogo exige migration correspondente.

Concessão dentro da transação que confirma a ação, sem fila nem evento enviado pelo navegador. Cada condição é binária: não há contadores cumulativos ou tabela de eventos neste recorte. Primeiro INSERT ganha a data; INSERTs repetidos usam skipDuplicates. Falha na transação desfaz ação e prêmio.

`Profile.backgroundId`/`avatarFrameId` opcionais apontam, por FK composta com userId, para cosméticos da própria conta. CHECKs de categoria impedem trocar fundo por borda; validação HTTP rejeita item bloqueado/desconhecido/inadequado com 400 COSMETIC_UNAVAILABLE. FKs NO ACTION são diferíveis para permitir apagar a conta e suas relações em cascata sem conflitos de ordem. PATCH parcial preserva escolhas omitidas; null restaura o padrão.

Excluir ficha/campanha ou apagar biografia não retira conquistas já obtidas. Exclusão da conta remove conquistas/coleção/perfil. Não há revogação de prêmios nem contagem de sessões/horas, feitos, vitórias ou críticos.

## Liberação permanente por conta

Após solicitação do proprietário, Profile.allCosmeticsUnlocked permite acesso a todo o catálogo, inclusive novos itens. Default false, sem campo de entrada ou saída na API. A ativação ocorre administrativamente no banco para o ID imutável da conta identificada; não depende de nome de usuário nem concede acesso a dados de outras mesas. Conquistas continuam refletindo ações reais.

GET da coleção e PATCH com seleção de cosmético sincronizam os itens do catálogo na propriedade da conta em transação, sem duplicatas. A sincronização trava Profile antes de escrever cosméticos para manter a ordem de bloqueio das edições de bio/avatar. As validações de categoria e propriedade continuam aplicadas. Migration aditiva 20261008040000_cosmetic_access; nenhuma conta recebe liberação por padrão.

## Retroatividade

Migration 20261008030000_achievement_cosmetics concede marcos comprovados pelo estado existente: perfil com bio/avatar, menor createdAt da ficha/campanha da conta e menor createdAt de rolagem por actorId ainda existente. Avatar e biografia completos recebem a data da migration, pois não existe uma data confiável do momento em que ambas condições se completaram. Ações cujos registros foram apagados antes da migration não são inferidas. As escolhas de perfil continuam nulas; aparência antiga preservada.

## API e privacidade

- GET /users/me/achievements: quatro condições, progresso 0/1, data obtida e recompensas.
- GET /users/me/cosmetics: catálogo, estado de obtenção e seleção atual.
- PATCH /users/me: backgroundId/avatarFrameId opcionais e anuláveis, além dos campos existentes; demais campos rejeitados.
- GET /users/:username e respostas de autenticação incluem background/avatarFrame, com metadados do item equipado ou null.

Coleção e progresso são privados, autenticados e no-store. Perfil público entrega apenas a aparência equipada; sem conquistas, contagens, earnedAt, títulos/IDs de mesas, provas, e-mail ou origem do prêmio. Exibição opcional de distintivos permanece futura.

## Interface e arte

Área Perfil mantém editor de informações e acrescenta Conquistas e Personalizar perfil. Itens bloqueados têm miniatura e condição, rádio indisponível. Itens obtidos têm rádio acessível; a prévia muda antes de salvar e não altera o banco. Salvar informa resultado; atualizar coleção reconsulta conquistas obtidas em outra tela. Mudanças de bio/avatar na própria tela atualizam a coleção.

Fundos usam artes próprias já existentes (`luminous-forest.webp`, `floating-city.webp`). Bordas são SVGs novos do projeto, com centro transparente, sem animação; não alteram a foto enviada. Aplicação inicial no perfil público e na prévia, sem bordas no menu ou nas mensagens. Falha de mídia retoma o banner/avatares sem borda, inclusive quando o erro de imagem precede a hidratação. Controles e prévia verificados em desktop e 320 px.

Fundos/bordas animados, geração de GIF/loops, distintivos públicos e marcos cumulativos são etapas posteriores. Não há nova dependência, serviço ou variável de ambiente.
