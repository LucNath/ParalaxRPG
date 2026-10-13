# 22 - Plano de implementação da VTT

**Estado:** proposta de sequência e escopo, preparada em 13 de outubro de 2026. A autorização desta etapa é organizar requisitos e plano. As funcionalidades abaixo permanecem planejadas.

Fonte: [catálogo e rastreabilidade](21-vtt-requisitos.md), derivado do [PDF preservado](referencias/especificacoes_vtt_mestre.pdf). Critérios verificáveis: [backlog e aceite](23-vtt-backlog-e-aceite.md).

## Objetivo da próxima entrega

Acrescentar à sessão existente uma mesa visual básica: o mestre prepara cenas, define um mapa e sua grade, escolhe a cena da sessão e posiciona tokens. Jogadores ativos consultam a cena compartilhada e movimentam apenas os tokens concedidos a eles. Posições confirmadas persistem e sobrevivem à recarga. Remoção da campanha revoga a mesa como já revoga chat e fichas.

Essa primeira entrega corresponde a VTT-I01, VTT-I02 e VTT-I03. Não conclui a Fase 1 do PDF: autosave mais amplo, exportação/restauração e os critérios de confiabilidade ainda precisam de VTT-I04 a VTT-I06. A conclusão do MVP original continua dependendo do [fluxo próprio do MVP](14-mvp.md).

## Sequência proposta

P0/P1/P2 nesta tabela são prioridades sugeridas para o Paralax, não classificações individuais atribuídas pelo PDF. Segurança, privacidade e persistência acompanham todos os incrementos, inclusive os opcionais.

| ID | Fase / prioridade | Entrega proposta | Dependências | Requisitos principais | Saída verificável |
| --- | --- | --- | --- | --- | --- |
| VTT-I01 | Fase 1 / P0 | Definir contratos da mesa, audiência, permissões e política de arquivos privados; protótipo de cena | Base atual; VTT-D01 a VTT-D05 | VTT-R01, VTT-R04, VTT-R05, VTT-R52, VTT-R57 | Contratos e matriz revisados; protótipo exercita mestre, jogador e terceiro |
| VTT-I02 | Fase 1 / P0 | Cenas e mapas com imagem, tamanho, grade quadrada ou sem grade, escala, zoom/pan e cena ativa da sessão | VTT-I01 | VTT-R23, VTT-R25, VTT-R31, VTT-R59 | Mestre configura uma cena; jogador autorizado consulta; recarga preserva configuração |
| VTT-I03 | Fase 1 / P0 | Tokens básicos, concessão de controle, vínculo opcional com personagem e posição compartilhada | VTT-I02; VTT-D02 | VTT-R04, VTT-R24, VTT-R32, VTT-R51, VTT-R53 | Dois clientes veem posições confirmadas; jogador não altera token alheio ou de outra campanha |
| VTT-I04 | Fase 1 / P0 | Autosave, confirmação de estado, recuperação de rascunho, revisão, histórico e desfazer do recorte; expandir aos editores existentes | VTT-I03; VTT-D07 | VTT-R03, VTT-R06, VTT-R24, VTT-R58 | Queda/retry/conflito não geram confirmação falsa nem perda silenciosa; autosave dos editores entra no aceite da fase |
| VTT-I05 | Fase 1 / P0 | Exportação integral e restauração de campanha em cópia nova; formato versionado e prévia de importação | VTT-I04; VTT-D06 | VTT-R02, VTT-R13, VTT-R14, VTT-R15, VTT-R16, VTT-R58 | Pacote recupera dados e arquivos; não inclui credenciais nem concede membros/poderes automaticamente |
| VTT-I06 | Fase 1 / P0 | Campanha de demonstração, testes de acesso/carga/recuperação, diagnóstico e guia de uso | VTT-I05 | VTT-R05, VTT-R06, VTT-R46, VTT-R51, VTT-R57, VTT-R59, VTT-R60 | Sessão completa em desktop/celular; restauração conferida; problemas e limites documentados |
| VTT-I07 | Fase 2 / P1 | Compêndios, NPCs, inventário, organização, referências, duplicação e importação em lote | VTT-I06; VTT-D08 | VTT-R17, VTT-R18, VTT-R19, VTT-R20, VTT-R40, VTT-R51 | Conteúdo reutilizável e cópias locais; recursos privados não aparecem a terceiros |
| VTT-I08 | Fase 2 / P1 | Wiki, painel de preparação, notas, objetivos, clocks, diário, recapitulação, missões, calendário e tabelas narrativas | VTT-I06; referências de VTT-I07 quando aplicáveis | VTT-R21, VTT-R22, VTT-R47, VTT-R48, VTT-R59 | Mestre prepara e registra sessão; visão de jogador e caderno secreto têm projeções separadas |
| VTT-I09 | Fase 2 / P1 | Combat Tracker manual, turnos/rodadas, condições, pausa da mesa e ligação de recursos com ficha/token | VTT-I03, VTT-I07; VTT-D03, VTT-D08 | VTT-R33, VTT-R34, VTT-R35, VTT-R50, VTT-R52 | Alterar recurso/condição atualiza a fonte única, ficha e exibição; comando repetido não aplica dano duas vezes |
| VTT-I10 | Fase 2 / P1 | Editor avançado de sistemas/fichas, fórmulas limitadas, ações/itens/efeitos, rolagens com audiência, prévia e desfazer | VTT-I09; VTT-D09 | VTT-R03, VTT-R07, VTT-R08, VTT-R09, VTT-R10, VTT-R11, VTT-R12, VTT-R36, VTT-R37, VTT-R38, VTT-R39, VTT-R40 | Resolução explicável no servidor; mudança transacional e reversível; resultados secretos não vazam |
| VTT-I11 | Fase 3 / P1 | Editor tático avançado: paredes/portas, visão, fog of war, luz, terreno, áreas, níveis e transições | VTT-I03, VTT-I09; VTT-D10 | VTT-R23, VTT-R24, VTT-R25, VTT-R26, VTT-R27, VTT-R28, VTT-R29, VTT-R30, VTT-R31, VTT-R32 | Projeção autorizada por jogador; exploração persistente e cenários grandes testados |
| VTT-I12 | Fase 3 / P1 | Handouts, áudio por canal/cena/zona, ambiente, feedback e acessibilidade individual | VTT-I08, VTT-I11; VTT-D11 | VTT-R43, VTT-R44, VTT-R45, VTT-R46, VTT-R49 | Entrega controlada; cada jogador pode desligar efeitos; sessão básica permanece utilizável |
| VTT-I13 | Fase 3 / P1 | Modo apresentador, transmissão/gravação, layouts OBS, overlays e comunicação por integração | VTT-I12; VTT-D03, VTT-D11 | VTT-R04, VTT-R42, VTT-R46, VTT-R49, VTT-R53, VTT-R55 | Saída limpa só recebe dados da audiência de transmissão; perfil mestre não é compartilhado |
| VTT-I14 | Fase 4 / P1 | Plugins, macros programáveis, API de integração, biblioteca/marketplace, idiomas, importadores e migrações avançadas | Fases 1 e 2 estáveis; VTT-D09, VTT-D12 | VTT-R01, VTT-R02, VTT-R11, VTT-R12, VTT-R13, VTT-R14, VTT-R15, VTT-R17, VTT-R54, VTT-R55, VTT-R56, VTT-R60 | Dependências explícitas; desativação segura; escopos/limites e compatibilidade testados |
| VTT-I15 | Fase 4 / P2 | Simulador estatístico e assistente de combate com IA, isolados e opcionais | VTT-I10, VTT-I11; VTT-D12 | VTT-R03, VTT-R09, VTT-R39, VTT-R41 | Simulação usa cópia, mostra hipóteses/versões e não modifica a campanha real |

Dados 3D de VTT-R38 e geração procedural de VTT-R26 são extensões P2 sugeridas dentro das respectivas fases. Não bloqueiam combate básico ou edição manual de mapas. Expressões limitadas e automação declarativa de VTT-I10 não autorizam execução arbitrária de scripts; macros/plugins programáveis dependem do isolamento de VTT-I14.

## Refinamento da primeira entrega

### VTT-I01 - Contratos, acesso e arquivos

1. Definir audiência e matriz de ações antes de criar DTOs. Reutilizar proprietário e participante ACTIVE da campanha; papel extra não aparece por inferência de username, conquista ou privilégio cosmético.
2. Prototipar navegação entre preparação da campanha e mesa da sessão, com estados de carregamento, erro, vazio, somente leitura e acesso revogado.
3. Definir configuração de mapa, limites de arquivo/resolução, coordenadas, revisão, concessão de controle e resposta a comandos repetidos.
4. Definir armazenamento e entrega autenticada de imagens privadas. O caminho de avatar atual é público e não deve ser usado como autorização para mapas ou notas secretas.
5. Exercitar a audiência com dados sintéticos: uma campanha, outra campanha, mestre, jogador, removido, pendente e visitante.

### VTT-I02 - Cenas e mapas básicos

Proposta de recorte: upload de imagem raster validada por decodificação, grade quadrada ou nenhuma, unidade/escala configurável, zoom/pan e seleção de cena. Grades hexagonal/isométrica, ferramentas completas de desenho, portas, visão dinâmica e fog of war ficam em VTT-I11.

O mapa base compartilhado nesta entrega é visível por inteiro aos membros autorizados da cena. Não anunciar ocultação segura de salas desenhadas nessa imagem. Segredos devem ficar em recursos/camadas que o servidor não entrega ao jogador; sigilo de áreas do próprio raster depende da solução de projeção de VTT-D10.

Persistir a cena na campanha e sua seleção na sessão. A cena selecionada deve pertencer à mesma campanha. Edição do mestre e consulta do jogador usam revisões e checagem de acesso atual; conhecer um UUID não concede acesso.

### VTT-I03 - Tokens e sincronização

Token básico: identificador, cena, nome autorizado, aparência, tamanho, posição em coordenadas do mapa, visibilidade, revisão e controladores. Vínculo com ficha é opcional e só pode apontar para uma ficha da mesma campanha; barras/aura/efeitos completos entram em fases seguintes.

- Mestre controla os tokens da própria mesa e concede/revoga controladores.
- Jogador ativo move somente os tokens explicitamente concedidos; não muda concessões, audiência, dono ou vinculação pelo payload de movimento.
- O servidor valida posição finita, limites e revisão. Coordenadas não dependem do tamanho da tela do usuário.
- Movimento pode ter prévia local, mas confirmação/persistência acontecem pelo comando autorizado, preferencialmente no fim do arraste. Não gravar cada pixel como uma edição independente.
- Retry conserva o identificador do comando. Mudança concorrente não sobrescreve silenciosamente a revisão vencedora.
- Reconexão refaz autorização e recupera snapshot/cursor; revogação limpa a mesa e impede novos comandos. Presença não é prova de participação.

A solução de sincronização depende de VTT-D02. Não presumir que o polling do chat atende à interação de tokens, nem que um processo persistente possa ser hospedado na topologia atual sem validação. Escolher o transporte pela latência, revogação, recuperação e custo demonstrados em protótipo.

## Modelo e interfaces propostos

Estes nomes representam responsabilidades de domínio; não são tabelas, migrations ou endpoints já existentes. Ajustar após fechar contratos. Não criar módulos vazios para as quatro fases.

| Conceito proposto | Responsabilidade e invariantes |
| --- | --- |
| Scene | Campanha, configuração do mapa, grade/escala e revisão; seleção de cena da sessão valida a campanha |
| SceneAsset | Metadados de imagem, autoria, chave privada, acesso e ciclo de vida; sem URL permanente pública para arquivo secreto |
| Token / TokenController | Estado básico e concessões de controle; controle sempre depende de participação ativa e audiência |
| SceneChange / comando idempotente | Registro de alterações confirmadas, ator, revisão e dados necessários ao desfazer; sem expor histórico secreto ao jogador |
| CampaignExport | Manifesto/versionamento e resultado de exportação; somente responsável autorizado obtém pacote integral |
| Actor / NPC, Item, Encounter, Effect | Fases posteriores; NPC não deve exigir criação de conta de usuário |

Proposta de API sob `/api/v1`: coleção de cenas da campanha, consulta/edição de cena, upload autorizado de asset, seleção da cena da sessão e comandos de criação/movimento de token. Definir URLs, schemas estritos e códigos de conflito em `packages/contracts` antes da implementação; atualizar [API](09-api.md) somente quando esse contrato for efetivamente adotado.

Operações que dependem de remoção de membro ou fechamento de sessão precisam compartilhar a ordenação transacional existente: verificar/bloquear campanha antes do recurso dependente. A granularidade de bloqueio deve ser medida; não trocar integridade por uma prévia de arraste mais rápida.

Para ficha/token/tracker, a proposta é uma fonte canônica de recursos e condições. O token exibe uma projeção autorizada; não mantém uma segunda cópia independente de PV. Na fase de combate, alterar a fonte incrementa revisão e grava auditoria na mesma transação. Definir em VTT-D08 se a fonte estende o JSON da ficha ou passa a entidades próprias.

## Recuperação e portabilidade

VTT-I04 distingue estado confirmado, alterações pendentes, entrada inválida e conflito. Autosave não confirma dados que o servidor não aceitou. O rascunho deve ter escopo de identidade/recurso e não reaparecer para outra conta após logout; a política de retenção local depende de VTT-D07.

VTT-I05 deve restaurar, numa campanha nova de teste, o conteúdo efetivamente existente na fase: versão das regras, configurações, fichas/valores, sessões/históricos exportáveis, cenas/tokens e arquivos. Ao surgirem Wiki, inventário ou outros módulos, seus formatos/manifestos e o teste de restauração evoluem junto; um módulo ativo sem cobertura de exportação impede declarar a exportação integral dessa versão.

O pacote precisa de whitelist de dados, versão de schema, inventário de arquivos e validação de dependências. Nunca incluir hashes de senha, access/refresh tokens, cookies, segredos de storage ou dados de outras campanhas. A prévia de importação informa incompatibilidades e perdas; arquivos/referências inválidos não geram restauração parcial silenciosa.

Restaurar não substitui a campanha original. Remapear IDs, vínculos e proprietário; membros e concessões anteriores não dão acesso automático a contas externas. Nova participação segue o fluxo de convite/aceite. Backups administrativos do banco e restauração por ponto no tempo são uma linha operacional distinta; precisam de política, capacidade e ensaio próprios em VTT-D06.

## Decisões pendentes

Os registros `VTT-D01` a `VTT-D12` complementam os DP existentes. Todos estão abertos; adotar uma escolha futura exige registrá-la com contexto, impacto e evidência, sem reescrever a fonte.

| ID | Escolha a resolver | Necessária antes de | Condição mínima |
| --- | --- | --- | --- |
| VTT-D01 | Recorte da mesa inicial e mudança de prioridade de mapas/tokens | VTT-I01 | Aceitar explicitamente limites da primeira entrega e a relação com os MVPs originais |
| VTT-D02 | Transporte, topologia, ordenação, presença e recuperação de eventos | VTT-I03 | Protótipo com dois clientes, perda/reconexão, revogação e medição na hospedagem pretendida; custo registrado |
| VTT-D03 | Audiência, controladores, campos expostos, co-mestre/espectador e edição após encerramento | VTT-I01 para papéis básicos; antes das expansões dependentes | Matriz por ação/objeto e comportamento do token vinculado a ficha de removido; nenhuma concessão global implícita |
| VTT-D04 | Canvas/renderização e interação mouse/toque/teclado | VTT-I02 | Protótipo e medição em dispositivo modesto, com zoom e arraste; manter interface atual da aplicação |
| VTT-D05 | Limites, armazenamento privado, URLs temporárias e retenção de assets | Upload em VTT-I02 | Verificar capacidade/custo do recurso escolhido, autorização, validação de arquivo e política para órfãos/substituições |
| VTT-D06 | Formato do pacote, importação, RPO/RTO, backups automáticos e restauração | VTT-I05 | Manifesto e compatibilidade; restauração ensaiada; verificar capacidade/retenção/PITR do serviço contratado sem presumir suporte |
| VTT-D07 | Autosave, rascunho offline, undo/redo, retenção e conflitos | VTT-I04 | Confirmar política de dados privados no cliente e limites de revisão; preservar mudanças concorrentes de terceiros |
| VTT-D08 | Modelo de NPC, inventário, recursos e condições; visibilidade de PV | VTT-I07 e VTT-I09 | Fonte única, relações por campanha, migração de fichas existentes e definição de valores visíveis por audiência |
| VTT-D09 | Linguagem de fórmulas, precisão, gatilhos, custos de execução e isolamento | VTT-I10; scripts em VTT-I14 | Gramática/regras determinísticas, validação, logs e limites; sem execução arbitrária de conteúdo importado |
| VTT-D10 | Projeção de visão/fog, mapas por área e orçamento de renderização | VTT-I11 | Dados e arquivos de áreas secretas não chegam ao cliente sem autorização; escala medida |
| VTT-D11 | Áudio, voz/vídeo, apresentação e audiência de streaming | VTT-I12 e VTT-I13 | Escopos, acessibilidade individual, licenças de assets e comportamento de reconexão |
| VTT-D12 | Plugins/API/marketplace e operação da simulação com IA | VTT-I14 e VTT-I15 | Permissões, compatibilidade, isolamento, exportação, consentimento e custo por uso |

Decisões de interface/armazenamento/tempo real acima não contratam serviços ou impõem bibliotecas novas. O núcleo atual permanece Next.js, NestJS, PostgreSQL e contratos compartilhados até decisão fundamentada em contrário.

## Portões de conclusão

| Fase | Critério do PDF aplicado ao Paralax | Evidência necessária |
| --- | --- | --- |
| 1 - Fundação | Sessão completa, estado recuperável e acesso confiável | VTT-I01 a VTT-I06; mesa com dois participantes e terceiro negado; autosave e restauração integral ensaiados |
| 2 - Mestre avançado | Preparação e combate ligados à ficha/mapa, com log e reversão | Conteúdo/Wiki e VTT-I09/VTT-I10; mudança única sob retry, rollback, conflito e audiência correta |
| 3 - Imersão e transmissão | Alternar preparação, jogo e apresentação sem expor segredos | Projeções de mestre/jogador/transmissão verificadas no payload e nos arquivos; efeitos desligáveis |
| 4 - Ecossistema | Compartilhar, atualizar e testar conteúdo preservando campanhas | Compatibilidade e desativação de plugins; restauração; simulação isolada se o recurso opcional for adotado |

Prazo, esforço, teto de custo, limites finais de cena e metas quantitativas de desempenho ainda não foram fornecidos. Proposta de massa inicial de ensaio: cenas com 25 e 200 tokens, imagem pequena/grande, computador modesto, celular e conexão instável. A massa é de teste, não uma cota do produto; medir antes de fixar metas e publicar limites.

Cada incremento deve entregar contratos, persistência, autorização, interface, testes pertinentes, documentação e evidência. Publicação só entra quando a entrega implementada passou pelos critérios, com migration/backup quando necessários; editar este plano não exige republicar o site.
