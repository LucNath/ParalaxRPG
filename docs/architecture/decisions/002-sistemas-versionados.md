# Decisão 002 — Sistemas versionados

Status: adotada no incremento de sistemas, em 7 de outubro de 2026. Requisitos: RF004, RF005 e complemento de publicação RF006.

## Contexto e decisão

O criador precisa configurar regras sem programação e editá-las sem substituir silenciosamente a definição que uma campanha venha a usar. Adotamos uma definição JSON validada, com versões imutáveis e autoria explícita no PostgreSQL.

`RpgSystem` contém o autor, metadados atuais, visibilidade e revisão. Cada criação ou edição salva gera `SystemVersion`, com UUID próprio, número sequencial, nome, descrição e definição. Sistema e versão são gravados em uma transação. A combinação sistema/número é única; versões anteriores não são alteradas. O detalhe retorna `versionId` para preparar o vínculo de futuras campanhas a uma versão específica.

Atualização usa `PUT /systems/:id`, com definição completa e `expectedRevision`. O banco compara a revisão e incrementa atomicamente; somente uma edição concorrente vence. Uma revisão obsoleta retorna `409 SYSTEM_REVISION_CONFLICT`. O editor preserva o rascunho local e oferece carregar a versão atual mediante confirmação.

## Definição e limites locais

Schemas compartilhados estão em [contracts](../../../packages/contracts/src/index.ts). Campos desconhecidos são rejeitados; o autor vem da sessão.

| Campo | Regra adotada |
| --- | --- |
| Nome/descrição do sistema | Nome de 2–80 caracteres; descrição de até 2000; espaços externos removidos |
| Atributos e perícias | Até 40 por categoria; nome de 1–50 caracteres; valor inicial inteiro entre −1.000.000 e 1.000.000 |
| Recursos | Até 40; valor inicial inteiro de 0–1.000.000; máximo opcional no mesmo intervalo; inicial não excede máximo informado |
| Identificadores | UUID por campo, preservado na edição; único entre todas as categorias da definição |
| Nomes de campos | Únicos por categoria após normalização NFKC e comparação sem diferença de maiúsculas/minúsculas |
| Vínculos | Perícia pode apontar para um atributo da mesma definição, ou nenhum |
| Dados | Até 20 tipos distintos; faces inteiras de 2–1000; lista vazia permitida |
| Formato | `schemaVersion: 1`; ordem das listas define apresentação |

Esses limites são escolhas de implementação, não campos obrigatórios de um sistema universal. Nenhum atributo, perícia ou recurso é imposto. Remover um atributo pelo editor desfaz seus vínculos com perícias. Dados padrão são sugestões que podem ser desmarcadas.

## Acesso e publicação

Novos sistemas começam privados. Somente o autor pode editar ou consultar a rota autenticada de seus sistemas.

| Visibilidade | Leitura pública | Catálogo público |
| --- | --- | --- |
| `PRIVATE` | Negada com 404 | Ausente |
| `UNLISTED` | Qualquer pessoa com o link lê a definição completa | Ausente |
| `PUBLIC` | Qualquer pessoa lê a definição completa | Presente |

Não listado não oferece segredo de acesso. A página `/s/:id` é acessível sem login; o catálogo na interface fica na área de Sistemas do painel. A API de catálogo é pública. O DTO de autoria contém id, username e displayName, sem e-mail ou credenciais.

Rotas de sistemas e página pública evitam cache. O detalhe lê exatamente a versão identificada pela linha autorizada, impedindo que uma edição concorrente exponha uma versão mais nova privada. Tornar privado bloqueia novas consultas públicas; conteúdo já lido ou copiado não pode ser recolhido.

## Interface e consequências

Salvamento é explícito, com estado de alterações pendentes, envio e versão confirmada. Não há autosave. Atributos, perícias e recursos são ordenados por botões com nomes acessíveis. A prévia acompanha valores e vínculos, mas não cria personagens persistidos.

Avisos de alterações pendentes cobrem recarregar/fechar a página e seguir links pelo editor. Histórico do navegador e saída da conta ainda podem descartar alterações sem aviso. Não há tela de histórico, restauração, exclusão, cópia, fórmulas, grants privados ou licenciamento.

Campanhas deverão fixar `SystemVersion.id`. Editar um sistema não migrará campanhas/fichas automaticamente. Elegibilidade para usar sistemas de terceiros, licença, retenção/exclusão e migrações explícitas serão definidas com os módulos dependentes. Este incremento resolve autoria, visibilidade e formato de versões da DP06, sem afirmar que o ciclo completo de reutilização está concluído.

## Evidências

[Contrato HTTP](../../09-api.md), [schema Prisma](../../../apps/api/prisma/schema.prisma), [migration](../../../apps/api/prisma/migrations/20261007150000_systems/migration.sql) e [verificação 003](../../verification/003-sistemas.md).
