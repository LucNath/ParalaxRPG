# 02 — Requisitos funcionais

Os identificadores RF001–RF025 são os da seção 32 da origem. A coluna de aceitação detalha como verificar o requisito. A etapa vem do escopo dos MVPs, e não da ordem numérica dos RFs.

## Catálogo

| ID | Requisito de origem | Critério de aceitação derivado | Etapa |
| --- | --- | --- | --- |
| RF001 | Permitir cadastro | Uma conta válida é persistida; identificadores duplicados são rejeitados sem gerar outra conta | MVP 1 |
| RF002 | Permitir autenticação | Credenciais válidas permitem acesso; inválidas são rejeitadas; logout e renovação têm comportamento definido | MVP 1 |
| RF003 | Perfil personalizável | Usuário edita o próprio perfil e avatar; outro usuário não pode editá-lo | MVP 1 |
| RF004 | Criar sistemas próprios | Usuário cria sistema com nome, descrição, atributos, perícias, recursos e dados | MVP 1 |
| RF005 | Editar sistemas | Criador altera seu sistema; tentativa de outro usuário é negada | MVP 1 |
| RF006 | Publicar sistema privado, não listado ou público | Descoberta e acesso respeitam a visibilidade; alteração cabe ao criador | Complemento proposto do MVP 1; ver 14 |
| RF007 | Criar campanhas | Usuário cria campanha e recebe administração no escopo dela | MVP 1 |
| RF008 | Associar campanha a sistema | Campanha referencia um sistema existente e utilizável pelo criador da campanha | MVP 1 |
| RF009 | Convidar usuários | Mestre envia convite; destinatário autorizado pode aceitá-lo uma única vez | MVP 1 |
| RF010 | Solicitar entrada em campanha pública recrutando | Usuário solicita entrada; Mestre aceita ou recusa; não há ingresso automático | Após MVP 1, antes da expansão social |
| RF011 | Gerenciar participantes | Mestre aceita/recusa ingresso e remove jogadores; capacidade e vínculos são respeitados | Convites/remoção no MVP 1; solicitações após MVP 1 |
| RF012 | Criar personagens | Membro autorizado cria personagem vinculado ao usuário, campanha e sistema; ficha segue o modelo | MVP 1 |
| RF013 | Criar sessões | Mestre agenda sessão vinculada à campanha, com título, data, horário e privacidade | MVP 1 |
| RF014 | Iniciar sessão | Mestre inicia sessão válida; participantes autorizados acessam a sala | MVP 1 |
| RF015 | Exibir sessões ativas como AO VIVO | Estado ativo aparece na campanha; somente sessões públicas elegíveis aparecem na descoberta | MVP 1 |
| RF016 | Permitir acompanhar sessões públicas | Usuário autorizado entra como espectador e recebe apenas a projeção pública | MVP 1 |
| RF017 | Restringir sessões privadas | Apenas membros autorizados acessam HTTP, histórico e canal de tempo real privado | MVP 1 |
| RF018 | Conversa em tempo real | Mensagem de participante é persistida e entregue aos destinatários autorizados; reconexão recupera histórico | Chat de sessão no MVP 1; canais adicionais pendentes |
| RF019 | Rolagens de dados | Expressões suportadas são validadas e calculadas no servidor; espectador não pode rolar | MVP 1 |
| RF020 | Histórico de rolagens | Expressão, resultados individuais, total, autor e momento podem ser recuperados após recarregar | MVP 1 |
| RF021 | Adicionar mapas | Mestre cadastra mapa na campanha; participantes visualizam conforme autorização | MVP 2 |
| RF022 | Administrar NPCs | Mestre cria/edita NPCs e controla revelação; notas secretas não são entregues a jogadores | MVP 2 |
| RF023 | Inventário de personagens | Itens e quantidades são persistidos; transferência autorizada mantém consistência | MVP 2 |
| RF024 | Controle administrativo da campanha | Mestre administra os elementos disponíveis da própria campanha; acesso cruzado é negado | MVP 1, expandido junto dos módulos |
| RF025 | Espectadores de sessões públicas | Espectador acompanha sem editar fichas, mapas, personagens, dados ou sessão | MVP 1 |

Estado atual: RF001–RF005 estão implementados no recorte de conta/perfil e editor básico; RF006 foi adotado como complemento, com três visibilidades e catálogo básico. RF007/RF008 incluem criação de campanha e vínculo com versão fixa do sistema. RF009 e o recorte de convites/remoção de RF011 estão disponíveis com aceite/recusa e controle de capacidade; solicitações abertas de ingresso seguem RF010 e continuam futuras. RF024 inclui administração de configuração e membros, com demais módulos futuros. Veja as verificações de [conta/perfil](verification/001-autenticacao-perfil.md), [sistemas](verification/003-sistemas.md), [campanhas](verification/005-campanhas.md) e [convites/membros](verification/006-convites-e-membros.md). Os demais RFs continuam no planejamento.

RF016 descreve o acesso a uma sessão pública. RF025 descreve o papel e suas limitações; ambos devem ser rastreados mesmo quando compartilham implementação.

## Funcionalidades descritas fora do catálogo RF

Não foram criados novos números RF para estas funcionalidades. Elas permanecem rastreáveis pelas seções de origem e pelas histórias de usuário.

| Funcionalidade | Origem | Etapa |
| --- | --- | --- |
| Editar/excluir campanha; finalizar sessão | 3.4, 45–46, 59 | MVP 1 |
| Dashboard, convites e próximas sessões | 17 | MVP 1, visualização dos módulos existentes |
| Editor visual sem programação | 5 | MVP 1, estrutura básica |
| Recursos/atributos de ficha editáveis | 22, 46 | MVP 1 |
| Fórmulas configuráveis | 6 | Evolução, fase ainda pendente |
| Classes, raças, arquétipos, magias, poderes, condições, progressão e criaturas | 3.3–4 | Expansão do construtor; fase detalhada pendente |
| Iniciativa, combate, itens, tokens | 26–27, 47 | MVP 2 |
| Fog of war, música, efeitos, handouts, diário, wiki e documentos | 24–25, 28–29, 48 | MVP 3 |
| Amigos, seguidores, avaliações, rankings e conquistas | 15–16, 49 | MVP 4 |
| Voz, vídeo, replay, integrações, API pública, mercado, plugins e app móvel | 50 | Evolução futura |

## Validação transversal

Cada operação de escrita deve validar identidade, permissão no recurso, entradas e estado atual antes de persistir ou transmitir. Os critérios negativos de acesso são parte da aceitação funcional, não apenas dos testes de segurança.

Comportamentos ainda não definidos devem seguir o [registro de decisões pendentes](README.md), sem serem apresentados como funcionalidades prontas.

## Referências

[Regras de negócio](04-regras-de-negocio.md), [permissões](12-permissoes.md), [MVP](14-mvp.md) e [testes](16-testes.md).
