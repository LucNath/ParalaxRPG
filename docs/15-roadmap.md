# 15 — Roadmap

## Forma de evolução

A origem divide o produto em quatro MVPs e evolução futura. Este roadmap mantém essa separação. Não há prazos, equipe ou estimativas fornecidos; as etapas são ordenadas por dependência e critério de saída.

## Etapas

Estado atual: conta/perfil, sistemas básicos e campanhas vinculadas a uma versão de sistema já estão disponíveis. Campanhas incluem criação, edição, capacidade, estados, apresentação pública/privada, listas, convites e membros com controle de acesso. Consulte as verificações de [sistemas](verification/003-sistemas.md), [campanhas](verification/005-campanhas.md) e [convites/membros](verification/006-convites-e-membros.md). Personagens e fichas vinculadas à versão da campanha estão disponíveis, com valores persistidos e edição pelo dono ativo/mestre ([verificação 007](verification/007-personagens-e-fichas.md)). Sessões têm agenda com fuso, estados, início/fim reais, cancelamento e apresentação pública elegível ([verificação 008](verification/008-sessoes-e-agenda.md)). Rolagens básicas com modificadores de ficha e histórico privado persistente estão disponíveis ([verificação 010](verification/010-rolagens-e-historico.md)). O [chat de sessão](session-chat.md) está disponível com histórico, atualização por polling e notificações. Presença, entrega por WebSocket e expressões avançadas de dados permanecem extensões futuras. Ingresso/audiência de espectadores e presença continuam futuros. O MVP 1 permanece em andamento.

| Etapa | Conteúdo | Dependências | Critério de saída proposto |
| --- | --- | --- | --- |
| Preparação | Decisões de stack, acesso, dados, contratos e ambientes | Validar decisões que bloqueiam o MVP | Contratos e decisões do núcleo registrados; ambiente reproduzível |
| MVP 1 | Conta, perfil, sistema básico, campanha, convites, ficha, sessão, chat, dados e espectadores | Autenticação e modelo de autorização | Fluxo de três usuários da seção 59 concluído |
| Complementos do núcleo | Solicitações de ingresso, reutilização/licenciamento de sistemas e permissões adicionais; publicação básica e modalidade não listada já disponíveis | MVP 1 estável e decisões de produto | Fluxos adicionais aceitos sem quebrar privacidade |
| MVP 2 | Inventário, itens, NPCs, habilidades, iniciativa, combate, mapas e tokens | Fichas e sessão estáveis; autoria/revelação definidas | Mestre conduz combate e conteúdo da mesa com persistência e permissões |
| MVP 3 | Fog of war, biblioteca de mapas, música, efeitos, handouts, diário, wiki, documentos e histórico completo | Mapas/tokens e audiências consistentes | Conteúdo é revelado por audiência sem expor segredos |
| MVP 4 | Amigos, seguidores, comentários, avaliações, rankings, conquistas e estatísticas | Identidade, descoberta e métricas definidas | Interações sociais e contagens verificadas, com política de moderação |
| Evolução futura | Voz, vídeo, compartilhamento de tela, gravação, replay, Twitch/YouTube, bots, API pública, mercado, módulos comunitários, plugins e app móvel | Decisões por funcionalidade | Cada iniciativa tem escopo, custo e aceite próprios |

“Complementos do núcleo” é uma organização proposta para requisitos gerais não incluídos expressamente na seção 46, não um quinto MVP definido na origem.

## Incremento solicitado: conquistas e personalização

O recorte estático foi antecipado por solicitação do usuário: quatro conquistas de conta, concessão persistente, retroatividade comprovável, coleção/editor com prévia e aparência pública, conforme a [decisão 008](architecture/decisions/008-conquistas-e-cosmeticos.md). Fundos/bordas animados e novos marcos seguem em [20](20-conquistas-e-personalizacao.md); prioridade dessas extensões em relação ao chat/tempo real permanece pendente. O incremento antecipa parte das conquistas originalmente previstas no MVP 4, sem antecipar todo o módulo social.

## Prioridade técnica de origem

A seção 57 recomenda:

1. Usuários e autenticação.
2. Perfis.
3. Sistemas de RPG.
4. Campanhas.
5. Membros e convites.
6. Personagens.
7. Sessões.
8. WebSocket.
9. Chat.
10. Dados.
11. Sessões públicas.
12. Espectadores.
13. Inventário.
14. NPCs.
15. Combate.
16. Mapas.

Autorização e persistência acompanham cada módulo desde o início. Não devem ser deixadas para uma etapa final depois de expor sessões públicas.

## Expansão do construtor

Além do editor básico, a origem prevê classes, raças, arquétipos, habilidades, magias, poderes, condições, equipamentos, criaturas, regras de combate/progressão e modelos avançados de ficha.

Fórmulas e suporte a cartas não têm fase determinada. Proposta: priorizar após consolidar definição versionada, valores de ficha e parser limitado. Não atribuir essas funcionalidades automaticamente ao MVP 2 ou 3 sem estimativa e decisão explícita.

## Dependências importantes

- Publicar sistemas de terceiros depende de autoria, licença e atualização de versões (DP06).
- Solicitação aberta de ingresso depende de estado Recrutando, capacidade e aprovação do Mestre.
- Combate depende de participantes, recursos, permissões e eventos ordenados.
- Fog of war depende de mapa e projeção por audiência; esconder apenas na tela não basta.
- Documentos e handouts dependem de permissões de usuários específicos e arquivos privados.
- Rankings/horas jogadas dependem de métricas e contagens resistentes a duplicação e abuso.
- Replay/gravação depende de política de consentimento, retenção e visibilidade por momento.
- Mercado/plugins/API pública exigem contratos e políticas adicionais, sem compromisso de implementação no núcleo.

## Gestão de mudança proposta

Promover um item ao escopo exige atualizar requisitos, histórias, dados, API/eventos, permissões e testes afetados. Registrar impacto e decisão, sem alterar o sentido dos RFs originais silenciosamente.

Riscos, esforço e calendário serão estimados com equipe e infraestrutura definidas. Uma fase só deve ser considerada concluída pelas evidências de seus fluxos, não pela quantidade de telas criadas.

## Referências

Origem: seções 46–50 e 57. Veja [MVP](14-mvp.md), [decisões pendentes](README.md) e [contribuição](18-contribuicao.md).
