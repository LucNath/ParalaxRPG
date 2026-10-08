# 14 — MVP

## Critério central

O MVP 1 deve comprovar o fluxo completo da seção 59. Não basta ter telas isoladas: usuários distintos precisam interagir com persistência, autorização e comunicação em tempo real.

A implementação já cobre conta/perfil, sistemas e campanhas: cadastro, login, renovação, logout, avatar e dashboard têm [verificação própria](verification/001-autenticacao-perfil.md); criação/edição, prévia, persistência versionada e visibilidade têm [verificação de sistemas](verification/003-sistemas.md). Campanhas incluem versão fixa, mestre, configuração e apresentação pública/privada, com [verificação própria](verification/005-campanhas.md). Convites por username, aceite/recusa, membros, lotação e remoção estão na [verificação 006](verification/006-convites-e-membros.md). Personagens e fichas privadas da versão fixa estão na [verificação 007](verification/007-personagens-e-fichas.md). Os passos 1–6 do fluxo abaixo estão disponíveis; o próximo é sessões. Exclusão de campanha e módulos de sessão/tempo real continuam futuros. O fluxo completo do MVP 1 ainda não está implementado.

## Escopo de origem — MVP 1

| Área | Dentro da primeira versão |
| --- | --- |
| Usuário | Cadastro, login, perfil e avatar |
| Sistema | Criar sistema com nome, descrição, atributos, perícias, recursos e dados |
| Campanha | Criar, editar, excluir, tornar pública/privada e convidar jogadores |
| Personagem | Criar ficha com atributos e recursos definidos pelo sistema |
| Sessão | Criar, iniciar e finalizar |
| Tempo real | Chat, rolagem de dados e atualização de personagens |
| Público | Listar campanhas públicas, mostrar sessões ao vivo e admitir espectadores |

O RF005 exige edição de sistemas no catálogo global; sua inclusão no núcleo é um detalhamento recomendado para tornar o editor utilizável. A interface inclui perícias porque elas fazem parte da definição inicial do sistema.

## Detalhamentos necessários para executar o fluxo

- Aceitar/recusar convites e manter vínculo de jogador; convidar sem ingresso não completa a seção 59.
- Administração e remoção de membros conforme RF011/RF024, com revogação de acesso.
- Histórico persistido de mensagens/rolagens e recuperação após recarregar.
- Separação entre sessão pública e privada, inclusive em campanhas públicas.
- Atualização da ficha no servidor e entrega aos clientes autorizados.
- Estados vazios, erros e reconexão na interface.
- Senhas com hash, tokens, proteção de acesso e auditoria administrativa conforme RNFs.

Esses itens detalham o funcionamento requerido; não antecipam inventário, mapas ou recursos sociais.

## Complementos propostos, sem ampliar o critério de origem

RF006 define publicação de sistemas em privado, não listado e público no catálogo geral, mas a seção 46 não a enumera no MVP 1. Esse complemento foi adotado na [decisão 002](architecture/decisions/002-sistemas-versionados.md): as três modalidades e o catálogo básico estão implementados. Uso em campanhas, cópia por terceiros e licenciamento continuam pendentes. A publicação não amplia o critério original de conclusão da seção 59.

Da mesma forma, campanha não listada existe no produto geral, mas o MVP 1 especifica pública/privada. É extensão a planejar, não condição original da primeira versão.

Estados PREPARANDO, PAUSADA e CANCELADA podem ser modelados desde o início, mas ações correspondentes não precisam preceder agendar/iniciar/encerrar. Convite por conta existente foi adotado na decisão 004; e-mail/link continuam futuros.

## Fora do MVP 1

- Solicitações abertas de ingresso, salvo priorização explícita posterior.
- Inventário, itens, NPCs, habilidades avançadas, iniciativa, combate, mapas e tokens.
- Fog of war, música, efeitos, handouts, diário, wiki e documentos estruturados.
- Amigos, seguidores, avaliações, ranking, conquistas e estatísticas completas.
- Voz, vídeo, gravação, replay, integrações externas, mercado, plugins e aplicativo móvel.
- Fórmulas, cartas e mecanismos avançados do construtor.

“Assistir” no MVP significa acompanhar o conteúdo público da sessão na plataforma. Transmissão audiovisual é etapa futura.

## Fluxo de conclusão — três usuários

| Passo | Ação | Evidência esperada |
| --- | --- | --- |
| 1 | Usuário A cria conta e entra | Conta persistida e autenticação válida |
| 2 | A cria sistema próprio | Definição pode ser recuperada após recarregar |
| 3 | A cria campanha com esse sistema | A é responsável; sistema correto está associado |
| 4 | A convida usuário B | Convite pendente destinado a B |
| 5 | B aceita e entra | Vínculo criado sem duplicata; capacidade respeitada |
| 6 | B cria personagem | Ficha corresponde ao sistema e à campanha |
| 7 | A cria sessão pública elegível | Agenda, participantes e privacidade persistidos |
| 8 | A inicia sessão | Estado AO VIVO persistido e entregue aos membros |
| 9 | A e B conversam | Mensagens entregues e recuperáveis |
| 10 | B rola dados | Expressão validada; resultado e detalhes persistidos |
| 11 | A altera informação da campanha | Alteração autorizada e auditável; B vê atualização pertinente |
| 12 | Sessão aparece em Ao vivo agora | Somente metadados públicos são listados |
| 13 | Usuário C entra como espectador | Acompanha conteúdo publicado; tentativas de edição/rolagem negadas |
| 14 | A encerra a sessão | FINALIZADA; removida da descoberta; novas ações de jogo bloqueadas |

Complementar com atualização de ficha durante a sessão e cenário de campanha pública/sessão privada para verificar os requisitos que não aparecem explicitamente em cada passo.

## Definição de pronto proposta

1. Fluxo acima aprovado por teste ponta a ponta com usuários distintos.
2. Requisitos do escopo têm cenários positivos e negativos rastreados.
3. Dados críticos sobrevivem a recarga/reinício; memória/local storage não é a única persistência.
4. HTTP e tempo real respeitam a mesma autorização; espectadores não recebem segredos.
5. Responsividade validada nos dispositivos de referência.
6. Configuração segura de ambiente e procedimento de execução documentados.
7. API, eventos e dados refletem a implementação; limitações conhecidas registradas.
8. Decisões pendentes que afetem funcionalidades entregues estão resolvidas e documentadas.

## Referências

Origem: seções 46 e 59. Veja [histórias](06-historias-de-usuario.md), [roadmap](15-roadmap.md) e [testes](16-testes.md).
