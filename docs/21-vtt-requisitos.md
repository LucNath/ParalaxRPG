# 21 - Requisitos da VTT focada no mestre

**Estado:** requisitos organizados para planejamento; módulos de produto desta ampliação ainda pendentes. **Data do levantamento:** 13 de outubro de 2026. **Base de código consultada:** `8cca37bf72e743017a19470a2d14b0b9f49d5a3d`, cuja implementação é equivalente à versão `463961205c258cebbd6abb01a87e0be0f99154d2`.

**Evolução posterior ao levantamento:** [24 - contratos da mesa](24-vtt-contratos-da-mesa.md) define o recorte básico e acrescenta schemas/políticas testados em `packages/contracts`. A matriz abaixo continua descrevendo funcionalidades disponíveis, sem apresentar o contrato como mesa implementada. VTT-I01 permanece parcial até os protótipos/medições.

## Origem e uso

A fonte é [Especificações de uma VTT focada no mestre](referencias/especificacoes_vtt_mestre.pdf), versão 1.0, outubro de 2026, sete páginas. O PDF foi preservado sem alterações. Ele descreve requisitos conceituais e pede refinamento em histórias, protótipos e testes antes da implementação.

Este catálogo complementa a [especificação original do Paralax](referencias/especificacao-original.md). Os identificadores RF001-RF025, RNF001-RNF008 e HU existentes continuam com seus significados. Os novos IDs `VTT-R01` a `VTT-R60` identificam capacidades agrupadas do PDF; não equivalem a sessenta tickets ou recursos já entregues.

- **Origem:** capacidades e princípios presentes no PDF, com seção indicada nas tabelas.
- **Levantamento:** situação observada no código e nos contratos atuais do Paralax.
- **Proposta:** divisão de entregas, prioridades por item, contratos futuros e critérios operacionais nos documentos [22](22-vtt-plano-de-implementacao.md) e [23](23-vtt-backlog-e-aceite.md). São escolhas de planejamento, sujeitas a revisão antes do trabalho dependente.
- **Parcial:** existe uma parte da capacidade; os componentes restantes continuam planejados.
- **Planejado:** não há implementação do módulo correspondente no recorte atual.

O PDF define P0 como essencial, P1 como avançado e P2 como opcional/experimental. Não atribui esses níveis a cada item. A aplicação desses níveis às entregas do Paralax é uma proposta do plano. A simulação com IA, dados 3D e geração procedural são expressamente opcionais na fonte.

## Base que pode ser reaproveitada

| Capacidade disponível | Evidência no repositório | Limite relevante para a VTT |
| --- | --- | --- |
| Conta, perfil, autenticação e autorização | [Decisão 001](architecture/decisions/001-base-e-autenticacao.md), `apps/api/src/modules/auth` | Recuperação de senha, verificação de e-mail e papéis adicionais permanecem futuros |
| Sistemas básicos e versões imutáveis | [Decisão 002](architecture/decisions/002-sistemas-versionados.md), `packages/contracts/src/index.ts` | Atributos, perícias, recursos e tipos de dado; sem fórmulas, construtor visual avançado ou migração de campanhas |
| Campanhas, convites e participantes ativos | [Decisão 004](architecture/decisions/004-convites-e-membros.md), `apps/api/src/modules/campaigns/campaign-access.ts` | Mestre derivado do proprietário; jogador derivado da participação ativa; sem co-mestre ou audiência de espectadores |
| Personagens, valores de ficha e revisões | [Decisão 005](architecture/decisions/005-personagens-e-fichas.md) | Sem NPCs, inventário, retratos de personagens, autosave ou restauração pelo usuário |
| Sessões com agenda e ciclo de vida | [Decisão 006](architecture/decisions/006-sessoes-e-agenda.md) | Página pública contém somente apresentação; não é uma mesa pública com mapas, fichas ou tokens |
| Rolagens persistidas e idempotentes | [Decisão 007](architecture/decisions/007-rolagens-e-historico.md) | Quantidade, faces, modificador adicional e campo de ficha; sem expressões livres, efeitos ou rolagens cegas |
| Chat da sessão e notificações | [Chat das sessões](session-chat.md) | Consulta periódica; não há presença ou distribuição de eventos por WebSocket |
| Publicação de testes e backup operacional | [Deploy Vercel](deploy-vercel.md) | Backups administrativos antes de migrações não equivalem à exportação/restauração de uma campanha pelo mestre |

Não foram encontrados modelos ou módulos implementados de cena, mapa, token, NPC, inventário, combate, Wiki, efeito ou macro. Personalização de perfil e controle de movimento das animações existem, mas não implementam os efeitos de imersão da mesa virtual.

## Princípios de produto

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R01 | Ativar apenas os módulos necessários à campanha e permitir desativação informada | 1, 9, 13 | Planejado: organização modular do código não é ativação de módulos pelo usuário |
| VTT-R02 | Dados portáveis, formatos documentados e compartilhamento sem dependência de formato proprietário | 1, 2.2 | Planejado |
| VTT-R03 | Automação transparente, configurável, reversível e subordinada à decisão narrativa do mestre | Capa, 1, 11, 13 | Parcial: resultados de dados são explicados; desfazer e motor de automação não existem |
| VTT-R04 | Separar o que mestre, jogadores e espectadores podem consultar ou alterar | 1, 8, 10 | Parcial: proprietário e jogadores ativos; concessões granulares e espectadores da mesa são futuros |
| VTT-R05 | Manter mapas complexos responsivos em computadores modestos | 1, 3.3, 11 | Planejado: metas e massa de teste a definir |
| VTT-R06 | Recuperar estado e evitar perda de campanha por queda, falha ou edição concorrente | 1, 8, 10 | Parcial: persistência, revisões e replay; autosave e recuperação integral pelo usuário são futuros |

## Sistemas, fichas e regras

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R07 | Configurar atributos, perícias, recursos, níveis, classes, espécies, progressão, condições e fórmulas | 2.1 | Parcial: editor básico e nível da ficha; demais estruturas e regras não implementadas |
| VTT-R08 | Construir fichas visuais com campos, abas, validações, listas, cálculos, ações e layout responsivo | 2.1, 8 | Parcial: ficha gerada pelos campos do sistema; sem editor visual de layout |
| VTT-R09 | Editar regras de testes, dificuldades, vantagem/desvantagem, críticos, resistências, iniciativa, dano, cura, descanso e progressão | 2.1 | Planejado |
| VTT-R10 | Suportar dados usuais, dados personalizados, notações e pools | 2.1, 4.2 | Parcial: faces configuráveis e múltiplos dados; sem notações ou resolução de pools |
| VTT-R11 | Configurar gatilhos, fórmulas e scripts com permissões, validação, logs e limites de execução | 2.1, 9 | Planejado |
| VTT-R12 | Versionar sistemas, registrar changelog, testar cópias e verificar compatibilidade entre versões | 2.1 | Parcial: versões imutáveis; sem cópias de teste e migração assistida |

## Portabilidade, compêndios e Wiki

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R13 | Importar/exportar sistemas, fichas, compêndios, mapas, cenas, macros, tabelas, regras e campanhas | 2.2 | Planejado |
| VTT-R14 | Documentar formatos aplicáveis, pacotes e manifesto de dependências | 2.2 | Planejado |
| VTT-R15 | Identificar incompatibilidades, conteúdo ausente e conflitos antes de migrar/importar | 2.2 | Planejado |
| VTT-R16 | Exportar a campanha inteira para backup, restaurá-la e selecionar conteúdo para compartilhar | 2.2, 10, 13 | Planejado como funcionalidade do produto |
| VTT-R17 | Catalogar sistemas e módulos com autoria, licença, versão, dependências, avaliações e histórico | 2.2, 9 | Parcial: autoria, visibilidade e versões de sistemas; demais campos e módulos não existem |
| VTT-R18 | Manter compêndios de personagens, NPCs, monstros, itens, equipamentos, habilidades, magias, efeitos, condições e tabelas; reutilizar conteúdo e cópias locais | 2.3 | Planejado |
| VTT-R19 | Organizar conteúdo com campos customizados, etiquetas, pastas, filtros, favoritos, pesquisa e referências cruzadas | 2.3 | Parcial: pesquisa nas listas atuais; organização de compêndios não existe |
| VTT-R20 | Importar em lote, duplicar, editar em massa, validar e detectar duplicatas de conteúdo | 2.3 | Planejado |
| VTT-R21 | Oferecer Wiki com páginas, categorias, anexos, imagens, histórico e visibilidade por página/seção ou descoberta | 2.4 | Planejado |
| VTT-R22 | Usar templates de locais, facções, NPCs, missões, sessões e regras; links, backlinks e menções; separar caderno secreto e visão do jogador | 2.4 | Planejado |

## Mapas, cenas e tokens

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R23 | Separar camadas de terreno, paredes, portas, luz, decoração, efeitos, tokens, notas e segredos | 3.1 | Planejado |
| VTT-R24 | Desenhar, preencher, selecionar múltiplos objetos, alinhar, agrupar, copiar/colar e desfazer/refazer | 3.1 | Planejado |
| VTT-R25 | Importar mapas/imagens, recortar, escalar, rotacionar, criar mosaicos e usar grades quadradas, hexagonais, isométricas ou nenhuma | 3.1 | Planejado |
| VTT-R26 | Usar templates, biblioteca de assets com licença/etiquetas e geração procedural opcional | 3.1 | Planejado |
| VTT-R27 | Usar paredes e portas, inclusive secretas, com bloqueio de movimento e linha de visão; estados aberto/fechado/trancado | 3.2 | Planejado |
| VTT-R28 | Revelar/ocultar áreas com fog of war manual ou automático e exploração persistente | 3.2 | Planejado |
| VTT-R29 | Calcular luz dinâmica, visão no escuro, cones, limites de visão, sombras e luz ambiente | 3.2 | Planejado |
| VTT-R30 | Tratar terreno difícil, perigos, armadilhas, cobertura, elevação, distância, alcance, trajetórias e templates de área | 3.2 | Planejado |
| VTT-R31 | Conectar níveis/cenas por entradas, escadas, portais e teletransportes; pré-carregar assets, duplicar cenas e alternar variantes sem recarga pesada | 3.2, 3.3 | Planejado |
| VTT-R32 | Criar tokens com propriedade, tamanho, forma, aura, recursos, estados, marcadores e controle de nome visível/oculto | 3.2 | Planejado |

## Combate e automação

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R33 | Gerenciar iniciativa manual/automática, desempates, turnos, rodadas, fases, NPCs/grupos e ações de adiar, preparar, pular ou reinserir | 4.1 | Planejado |
| VTT-R34 | Acompanhar recursos, escudos, fadiga, condições, concentração, duração, recargas, alertas e limpeza configurável de efeitos | 4.1 | Planejado: valores de recursos existem apenas na ficha |
| VTT-R35 | Atualizar ficha, token e Combat Tracker a partir de uma fonte consistente de estado | 4.1, 13 | Planejado |
| VTT-R36 | Rolar por ações da ficha/itens/magias, ler fórmulas e modificadores ativos, explicar o cálculo e registrar ator/histórico | 4.2 | Parcial: histórico, ator e um campo da ficha como modificador; sem botões de ação ou fórmulas |
| VTT-R37 | Separar rolagens públicas à mesa, privadas ao mestre, cegas e sussurradas a destinatários específicos | 4.2 | Planejado: histórico atual é comum aos participantes ativos |
| VTT-R38 | Aplicar críticos, falhas, rerrolagens, dados explosivos, sucesso parcial e modificadores do sistema; dados 3D opcionais | 4.2 | Planejado |
| VTT-R39 | Selecionar alvos, validar e aplicar dano, cura, recursos e efeitos, inclusive em área/lote, com prévia, log e desfazer | 4.2, 4.3, 11 | Planejado |
| VTT-R40 | Modelar itens, cargas, peso, munição, requisitos e efeitos; habilidades com custo, alcance, execução e recarga; efeitos com origem, alvo, duração, acúmulo e remoção | 4.3 | Planejado |
| VTT-R41 | Simular encontros e táticas com IA opcional, hipóteses explícitas, estatística e inspeção por passos, em ambiente isolado sem alterar a campanha real | 4.4 | Planejado; opcional na origem |

## Transmissão e imersão

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R42 | Preparar saída limpa para OBS/transmissão/gravação, layouts, overlays, transições, modo apresentador e filtros de informações/chat sensíveis | 5 | Planejado: página pública de sessão não implementa transmissão da mesa |
| VTT-R43 | Gerenciar áudio por biblioteca/playlist/cena/zona, canais separados, volume, fades, ducking, repetição e integrações autorizadas | 6.1 | Planejado |
| VTT-R44 | Oferecer alertas de baixa vida e feedback sensorial configurável, individual e com intensidade controlada, incluindo referência ao FVTT Heartbeat | 6.2 | Planejado; referência não significa integração adotada |
| VTT-R45 | Apresentar ataques, cura, clima, partículas, luz e mudanças de ambiente | 6.2 | Planejado |
| VTT-R46 | Reduzir movimento, desligar flashes, controlar volume e oferecer sinais equivalentes; desligar recursos sem impedir a sessão básica | 6.2, 13 | Parcial: controle de movimento de cosméticos; recursos da mesa ainda não existem |

## Condução e colaboração

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R47 | Preparar sessões com painel do mestre, notas privadas, tensão, frentes, objetivos, pistas, eventos, resumo anterior, elenco de NPCs e checklist | 7 | Parcial: agenda e descrição; demais ferramentas não implementadas |
| VTT-R48 | Registrar diário, decisões e linha do tempo; usar tabelas/geradores para encontros, nomes, rumores, tesouros e ganchos; gerir missões, facções, reputação, economia, calendário, clima e viagens | 7 | Planejado |
| VTT-R49 | Entregar handouts, documentos, imagens, mapas e pistas com audiência definida e revelação gradual | 7 | Planejado |
| VTT-R50 | Pausar a mesa e congelar movimento, rolagens ou ações em situações críticas | 7 | Planejado: estado PAUSED da campanha não constitui trava de ações da mesa |
| VTT-R51 | Usar fichas claras e responsivas, teclado, diário/inventário/objetivos pessoais, notas compartilhadas, descobertas e criação colaborativa aprovada pelo mestre | 8 | Parcial: fichas responsivas; colaboração e conteúdo pessoal avançado são futuros |
| VTT-R52 | Conceder permissões por personagem, grupo, documento, item, mapa e campo; separar proprietário, mestre, co-mestre, jogador e espectador | 8, 10 | Parcial: proprietário e jogador ativo; permissões por objeto e papéis adicionais são futuros |
| VTT-R53 | Mostrar presença/conexão, recuperar estado após queda e integrar comunicação por texto e voz/vídeo | 8 | Parcial: chat com polling; presença e voz/vídeo não implementados |

## Extensibilidade, segurança e qualidade

| ID | Requisito de origem | Seção do PDF | Situação no Paralax |
| --- | --- | --- | --- |
| VTT-R54 | Oferecer plugins, eventos/ganchos, macros, biblioteca/editor, diagnóstico, permissões e teste de módulos compatíveis | 9 | Planejado |
| VTT-R55 | Expor API com escopos, limites e auditoria; integrar streaming, armazenamento, autenticação e bibliotecas de assets | 9 | Parcial: API interna autenticada, storage e publicação; API de integrações não existe |
| VTT-R56 | Publicar repositório/marketplace com versões, dependências, avaliações/licenças; internacionalização e terminologia de sistemas | 9, 11 | Parcial: interface em português e datas/fusos; sem marketplace ou seleção de idioma |
| VTT-R57 | Impor visibilidade no servidor, proteger arquivos/scripts/API e definir retenção, exclusão e compartilhamento | 10 | Parcial: autorização e validação do núcleo; arquivos da mesa, scripts e política completa são futuros |
| VTT-R58 | Disponibilizar backups automáticos, restauração por ponto no tempo, cópias pré-migração, autosave, histórico, prevenção de conflitos e auditoria de automações | 10 | Parcial: revisões, auditoria do núcleo e backups operacionais pré-migração; demais fluxos não implementados/definidos |
| VTT-R59 | Buscar em toda a campanha; configurar atalhos/painéis, ações em lote, menus contextuais, carregamento, erros e diagnóstico de desempenho | 7, 11 | Parcial: busca por módulo e feedback de erro; sem busca universal ou painéis configuráveis |
| VTT-R60 | Oferecer demonstração, templates, documentação/changelog/guias e testar mapas grandes, muitos tokens, efeitos e conexão instável | 11 | Parcial: documentação e testes do núcleo; campanha de demonstração e carga da VTT são futuras |

## Critérios essenciais preservados da origem

Os IDs abaixo referenciam os oito critérios da seção 13 do PDF. Sua verificação é distribuída entre fases; eles não estão todos atendidos pela base atual.

| ID | Resultado exigido pela origem | Requisitos relacionados | Evidência prevista |
| --- | --- | --- | --- |
| VTT-AC01 | Criar/importar sistema e montar ficha sem editar código da VTT | VTT-R07, VTT-R08, VTT-R13 | História VTT-HU15 e importação de sistema; editor básico atual cobre parte |
| VTT-AC02 | Rolagem da ficha usa atributos/modificadores corretos e explica o resultado | VTT-R10, VTT-R36, VTT-R38 | VTT-HU15; cálculo atual na sessão cobre parte |
| VTT-AC03 | Habilidade seleciona alvos no mapa e resolve dano, cura, recursos e efeitos | VTT-R30, VTT-R39, VTT-R40 | VTT-HU15 após mapas, tokens e combate |
| VTT-AC04 | Alterar recurso/condição no tracker atualiza ficha e token consistentemente | VTT-R34, VTT-R35 | VTT-HU14, incluindo concorrência e rollback |
| VTT-AC05 | Mestre oculta áreas, NPCs, handouts e rolagens, conferindo a visão do jogador | VTT-R04, VTT-R28, VTT-R37, VTT-R49, VTT-R57 | VTT-HU06, VTT-HU15 e VTT-HU16; ocultação de áreas depende da solução de projeção |
| VTT-AC06 | Exportar e restaurar campanha em ambiente de teste sem perda relevante | VTT-R13, VTT-R14, VTT-R16, VTT-R58 | VTT-HU09 e VTT-HU10 com comparação de dados e arquivos |
| VTT-AC07 | Desativar módulo sem corromper dados, informando dependências e efeitos | VTT-R01, VTT-R12, VTT-R54 | VTT-HU17 |
| VTT-AC08 | Desligar imersão/streaming individualmente preserva condução básica | VTT-R42, VTT-R43, VTT-R46 | VTT-HU16 |

## Relação entre a origem nova e o roadmap existente

| Fase do PDF | Relação com o Paralax | Tratamento proposto |
| --- | --- | --- |
| 1 - Fundação | Parte do MVP 1 atual, com mapas/tokens que estavam no MVP 2 | Antecipar somente a mesa visual básica e completar autosave/portabilidade; não concluir o MVP original por associação |
| 2 - Mestre avançado | Conteúdo de sistemas avançados, MVP 2 e parte da Wiki do MVP 3 | Compêndios, preparação, combate e regras em incrementos dependentes |
| 3 - Imersão e transmissão | MVP 3 e parte das integrações futuras | Visão/luz, áudio, handouts e apresentação com audiência controlada |
| 4 - Ecossistema | Extensões futuras e parte social de avaliações | Plugins, API de integração, marketplace e simulação opcional |

A fonte original continua preservada. A mudança de ordem para mapas/tokens é uma proposta de priorização, não uma alteração retroativa do que estava definido no MVP 1.

Próxima leitura: [plano e dependências](22-vtt-plano-de-implementacao.md), [histórias e aceite](23-vtt-backlog-e-aceite.md) e [decisões pendentes](22-vtt-plano-de-implementacao.md#decisões-pendentes).
