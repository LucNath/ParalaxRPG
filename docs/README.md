# Documentação de engenharia

## Como ler

Esta organização deriva das 60 seções da [especificação original](referencias/especificacao-original.md). O conteúdo foi distribuído por responsabilidade, mantendo os identificadores RF001–RF025 e RNF001–RNF008.

Use primeiro a visão do produto, as regras de negócio e o MVP. Em seguida, consulte arquitetura, dados, API, tempo real e segurança para projetar a implementação.

### Status das informações

- **Requisito de origem:** comportamento ou restrição explicitamente descrito no anexo.
- **Detalhamento derivado:** interpretação operacional de um requisito, sem criar um novo módulo de produto.
- **Proposta:** solução ou regra adicional recomendada; ainda exige validação.
- **Decisão pendente:** ponto que o anexo não define, ou define apenas como possibilidade.

## Estado da implementação

Conta, autenticação, perfil com avatar, sistemas de RPG, campanhas, convites e membros já estão implementados. Next.js, NestJS, PostgreSQL e Prisma foram adotados conforme a [decisão 001](architecture/decisions/001-base-e-autenticacao.md). Sistemas seguem a [decisão 002](architecture/decisions/002-sistemas-versionados.md); campanhas com versão fixa, mestre, configuração e apresentação pública/privada seguem a [decisão 003](architecture/decisions/003-campanhas-versionadas.md). Convites por username, participação, capacidade e remoção seguem a [decisão 004](architecture/decisions/004-convites-e-membros.md). O ambiente de testes usa [Vercel, Neon e Blob](deploy-vercel.md). Personagens, sessões, Redis e Socket.IO continuam futuros; operação e orçamento da plataforma completa permanecem pendentes.

Consulte as [instruções de execução](../README.md) e os relatórios de [conta/perfil](verification/001-autenticacao-perfil.md), [sistemas](verification/003-sistemas.md), [primeira publicação online](verification/004-publicacao-vercel.md), [campanhas](verification/005-campanhas.md) e [convites/membros](verification/006-convites-e-membros.md). Os documentos de produto continuam descrevendo o escopo completo, sem significar que todas as funcionalidades estão disponíveis.

## Documentos

| Documento | Conteúdo |
| --- | --- |
| [01 — Visão do produto](01-visao-do-produto.md) | Propósito, público, diferencial e limites |
| [02 — Requisitos funcionais](02-requisitos-funcionais.md) | RF001–RF025 e critérios de aceitação |
| [03 — Requisitos não funcionais](03-requisitos-nao-funcionais.md) | RNF001–RNF008 e verificações |
| [04 — Regras de negócio](04-regras-de-negocio.md) | Vínculos, visibilidade e estados |
| [05 — Casos de uso](05-casos-de-uso.md) | Fluxos, pré-condições e exceções |
| [06 — Histórias de usuário](06-historias-de-usuario.md) | Backlog e aceitação por papel |
| [07 — Arquitetura](07-arquitetura.md) | Componentes, módulos e organização |
| [08 — Modelo de dados](08-modelo-de-dados.md) | Entidades, relações e integridade |
| [09 — API](09-api.md) | Rotas de origem e contrato proposto |
| [10 — WebSocket](10-websocket.md) | Eventos, salas e sincronização |
| [11 — Segurança](11-seguranca.md) | Autenticação, proteção e auditoria |
| [12 — Permissões](12-permissoes.md) | RBAC, escopo e permissões individuais |
| [13 — Interface](13-interface.md) | Telas, navegação e estados de UI |
| [14 — MVP](14-mvp.md) | Escopo e fluxo de conclusão do MVP 1 |
| [15 — Roadmap](15-roadmap.md) | Etapas de evolução e dependências |
| [16 — Testes](16-testes.md) | Estratégia, rastreabilidade e cenários |
| [17 — Deploy](17-deploy.md) | Ambientes, serviços e operação proposta |
| [18 — Contribuição](18-contribuicao.md) | Convenções, revisão e mudanças |
| [19 — Design system](19-design-system.md) | Direção visual adotada, tokens, navegação, componentes e padrões para os próximos módulos |
| [Artes do site](design/artes-do-site.md) | Coleção de imagens, arquivos originais/WebP, aplicações e prompts de geração |
| [Publicação Vercel](deploy-vercel.md) | Projetos, banco de testes, avatares persistentes e atualização do ambiente online |
| [Decisão 001](architecture/decisions/001-base-e-autenticacao.md) | Stack e política de autenticação adotadas na primeira etapa |
| [Decisão 002](architecture/decisions/002-sistemas-versionados.md) | Definições versionadas, salvamento concorrente e visibilidade dos sistemas |
| [Decisão 003](architecture/decisions/003-campanhas-versionadas.md) | Campanhas com versão fixa, mestre, apresentação pública/privada e histórico de configuração |
| [Decisão 004](architecture/decisions/004-convites-e-membros.md) | Convites por conta existente, lotação atômica, participação e remoção |
| [Verificação 001](verification/001-autenticacao-perfil.md) | Evidências do fluxo de conta e perfil |
| [Verificação 002](verification/002-direcao-visual.md) | Build, fluxos e revisão visual da identidade dark roxo/ciano |
| [Verificação 003](verification/003-sistemas.md) | Persistência, autorização, publicação, concorrência e editor desktop/mobile |
| [Verificação 004](verification/004-publicacao-vercel.md) | Deploy Vercel, PostgreSQL Neon, Blob e fluxos pelo endereço público |
| [Verificação 005](verification/005-campanhas.md) | Campanhas, proteção do mestre, versão fixa, publicação, concorrência e seletor de regras |
| [Verificação 006](verification/006-convites-e-membros.md) | Convites, membros, capacidade, revogação e fluxo com contas distintas |

## Decisões pendentes

Estas decisões não impedem a leitura da documentação, mas devem ser resolvidas antes das implementações dependentes.

| ID | Decisão | Documento de referência |
| --- | --- | --- |
| DP01 | Stack adotada na decisão 001 e Vercel/Neon/Blob para testes; operação e orçamento da plataforma completa pendentes | [Arquitetura](07-arquitetura.md) e [deploy](17-deploy.md) |
| DP02 | Login por e-mail adotado; verificação de conta e recuperação de senha adiadas | [Decisão 001](architecture/decisions/001-base-e-autenticacao.md) |
| DP03 | Tokens, transporte e revogação adotados na decisão 001; gestão completa de dispositivos futura | [Decisão 001](architecture/decisions/001-base-e-autenticacao.md) |
| DP04 | Convite por username de conta existente, validade de sete dias e novo convite adotados; e-mail/link futuros | [Decisão 004](architecture/decisions/004-convites-e-membros.md) |
| DP05 | Acesso anônimo a transmissões e sessão pública em campanha privada/não listada | [Permissões](12-permissoes.md) |
| DP06 | Versões imutáveis, autoria e visibilidade adotadas na decisão 002; uso por terceiros, licenciamento e migração de campanhas pendentes | [Decisão 002](architecture/decisions/002-sistemas-versionados.md) |
| DP07 | Edição de ficha por jogador, múltiplos personagens e permissões padrão | [Permissões](12-permissoes.md) |
| DP08 | Política de exclusão, retenção, exportação e histórico | [Dados](08-modelo-de-dados.md) |
| DP09 | Limites e metas de desempenho, disponibilidade, RPO e RTO | [Requisitos não funcionais](03-requisitos-nao-funcionais.md) |
| DP10 | Idiomas, classificação indicativa, moderação e conteúdo proibido | [Visão](01-visao-do-produto.md) |
| DP11 | Anotações, mensagens privadas e informações expostas a espectadores | [Interface](13-interface.md) e [WebSocket](10-websocket.md) |
| DP12 | Operadores e precisão de fórmulas; modelos sem dados ou com cartas | [Arquitetura](07-arquitetura.md) |

## Rastreabilidade da especificação original

A tabela cobre todas as seções, inclusive funcionalidades previstas somente para etapas futuras.

| Seções de origem | Tema | Destino principal |
| --- | --- | --- |
| 1–2 | Visão e objetivos | [01](01-visao-do-produto.md) |
| 3 | Tipos de usuário | [01](01-visao-do-produto.md), [12](12-permissoes.md) |
| 4–6 | Sistemas, editor e fórmulas | [04](04-regras-de-negocio.md), [07](07-arquitetura.md), [13](13-interface.md), [15](15-roadmap.md) |
| 7–9 | Campanhas, criação e visibilidade | [04](04-regras-de-negocio.md), [08](08-modelo-de-dados.md) |
| 10–13 | Sessões, estados, privacidade e ao vivo | [04](04-regras-de-negocio.md), [10](10-websocket.md), [13](13-interface.md) |
| 14–17 | Explorar, perfil, histórico e dashboard | [13](13-interface.md) |
| 18–20 | Tela da campanha, sala e chat | [10](10-websocket.md), [13](13-interface.md) |
| 21–23 | Dados, personagens e NPCs | [04](04-regras-de-negocio.md), [08](08-modelo-de-dados.md) |
| 24–29 | Mapas, fog of war, combate, inventário, documentos e diário | [08](08-modelo-de-dados.md), [13](13-interface.md), [15](15-roadmap.md) |
| 30–31 | Papéis e permissões | [12](12-permissoes.md) |
| 32 | Requisitos funcionais | [02](02-requisitos-funcionais.md) |
| 33 | Requisitos não funcionais | [03](03-requisitos-nao-funcionais.md), [11](11-seguranca.md) |
| 34–39 | Arquitetura, stack, persistência e tempo real | [07](07-arquitetura.md), [10](10-websocket.md), [17](17-deploy.md) |
| 40–41 | Entidades e relacionamentos | [08](08-modelo-de-dados.md) |
| 42–44 | Estrutura do projeto e módulos | [07](07-arquitetura.md), [18](18-contribuicao.md) |
| 45 | API inicial | [09](09-api.md) |
| 46–50 | MVPs e evolução | [14](14-mvp.md), [15](15-roadmap.md) |
| 51 | Nomes dos módulos | [01](01-visao-do-produto.md), [13](13-interface.md) |
| 52–55 | Fluxos e painel do Mestre | [05](05-casos-de-uso.md), [13](13-interface.md) |
| 56 | Independência de sistemas | [01](01-visao-do-produto.md), [07](07-arquitetura.md), [08](08-modelo-de-dados.md) |
| 57 | Prioridades técnicas | [15](15-roadmap.md) |
| 58 | Nome temporário | [01](01-visao-do-produto.md) |
| 59 | Fluxo da primeira versão | [14](14-mvp.md), [16](16-testes.md) |
| 60 | Organização documental | Este índice e os documentos 01–18 |
