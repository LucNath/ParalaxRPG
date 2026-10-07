# 12 — Permissões

## Princípio

O RBAC de origem combina papéis da plataforma e papéis dentro da campanha. **Ser Mestre em uma campanha não concede autoridade em outra.** O controle do Mestre cobre todos os módulos disponíveis do próprio ambiente, sem alterar recursos originais pertencentes a terceiros.

## Papéis de origem

| Escopo | Papel | Significado |
| --- | --- | --- |
| Plataforma | ADMIN | Administração da plataforma; poderes detalhados não definidos |
| Plataforma | USER | Conta autenticada |
| Plataforma | SYSTEM_CREATOR | Função de autoria de sistemas; qualquer usuário pode exercê-la |
| Plataforma | GAME_MASTER | Função de condução de campanhas; permissões dependem do vínculo local |
| Plataforma | PLAYER | Função de jogador em campanhas onde participa |
| Plataforma | SPECTATOR | Função de acompanhamento sem participação |
| Campanha | OWNER | Responsável pela campanha |
| Campanha | GM | Mestre autorizado na campanha |
| Campanha | ASSISTANT_GM | Auxiliar; poderes não detalhados na origem |
| Campanha | PLAYER | Jogador vinculado |
| Campanha | SPECTATOR | Consulta pública/autorizada; não controla a mesa |

Visitante não é role autenticada. Criador, Mestre e jogador podem ser funções derivadas de autoria/vínculos em vez de flags globais persistidas. A escolha técnica deve preservar o escopo.

Proposta para MVP 1: criar `OWNER` no usuário que abre a campanha, jogadores como `PLAYER` e espectadores como audiência de sessão. GM adicional e ASSISTANT_GM ficam para expansão. Um espectador público não precisa ganhar vínculo permanente de campanha.

## Matriz da plataforma

| Ação | Visitante | Usuário | Criador do recurso |
| --- | --- | --- | --- |
| Ver página inicial, campanhas/sistemas/perfis públicos | Sim | Sim | Sim |
| Criar conta ou fazer login | Sim | Conforme estado da conta | Conforme estado da conta |
| Editar perfil | Não | Próprio | Próprio |
| Criar sistema/campanha | Não | Sim | Sim |
| Editar sistema | Não | Não, se não for autor | Sim |
| Publicar/excluir sistema | Não | Não, se não for autor | Sim, com regras de dependência |
| Assistir sessão pública | DP05 | Sim, se elegível | Sim, se elegível |
| Seguir usuários | Não | Etapa social | Etapa social |

ADMIN não recebeu poderes detalhados no anexo. Não pressupor acesso irrestrito a mensagens privadas ou conteúdo secreto; definir operações administrativas e auditoria separadamente.

## Matriz da campanha e sessão

“Condicional” exige vínculo, permissão individual, estado e audiência apropriados.

| Ação | OWNER/Mestre | ASSISTANT_GM | PLAYER | SPECTATOR |
| --- | --- | --- | --- | --- |
| Consultar conteúdo privado de campanha | Sim | A definir | Condicional | Não |
| Editar configuração da campanha | Sim | A definir | Não | Não |
| Excluir campanha/transferir responsável | OWNER; política de transferência pendente | Não por padrão proposto | Não | Não |
| Convidar, aceitar solicitações e remover membros | Sim | A definir | Não | Não |
| Criar/iniciar/encerrar sessão | Sim | A definir | Não | Não |
| Alterar visibilidade da campanha/sessão | Sim | A definir | Não | Não |
| Criar personagem | Sim, conforme módulo | A definir | Condicional, na própria campanha | Não |
| Editar ficha própria | Sim | A definir | Conforme permissão | Não |
| Editar fichas dos jogadores | Sim, como administração | A definir | Somente com concessão específica futura | Não |
| Enviar chat de participante | Sim, em estado permitido | Condicional | Condicional | Não no MVP 1 |
| Rolar dados | Sim, em estado permitido | Condicional | Condicional | Não |
| Ler chat/rolagens | Conforme audiência | Conforme audiência | Conforme audiência | Apenas conteúdo publicado |
| Criar/controlar NPC, item, mapa e combate | Sim, quando módulo existir | Conforme concessão futura | Conforme concessão específica | Não |
| Mover token próprio | Sim | Conforme concessão | Conforme permissão | Não |
| Ver NPC/notas secretas | Sim | Conforme concessão | Somente parte explicitamente revelada | Somente parte publicada |
| Ver documentos | Conforme audiência | Conforme audiência | Conforme audiência | Apenas públicos |
| Controlar permissões individuais | Sim, no escopo da campanha | A definir | Não | Não |

OWNER é o responsável administrativo. A origem não distingue em detalhe OWNER e GM em ações destrutivas; a restrição de exclusão ao OWNER acima é proposta. Não tratar a matriz como autorização pronta para ASSISTANT_GM sem resolver a política.

## Permissões individuais

A origem exemplifica: editar personagem, mover token, criar item, ver NPC secreto e controlar NPC. Proposta de chaves técnicas:

| Chave | Alvo e limite |
| --- | --- |
| `character.editOwn` | Personagens do próprio usuário na campanha |
| `token.moveOwn` | Tokens que o usuário controla |
| `item.create` | Conteúdo da campanha, quando o módulo existir |
| `npc.viewSecret` | NPCs concedidos ou escopo explicitamente definido |
| `npc.control` | NPCs concedidos ou escopo explicitamente definido |

Proposta: negar por padrão ações administrativas para jogadores; conceder edição/movimento apenas quando definidos pelo Mestre. Defaults exatos de edição são DP07. Concessões devem especificar ação e recurso, podendo ter alvo individual em vez de abrir todos os NPCs secretos.

## Avaliação proposta de acesso

1. Autenticar quando necessário.
2. Resolver recurso e campanha/sistema associado.
3. Verificar autoria ou vínculo ativo.
4. Aplicar papel e concessões/restrições individuais previstas.
5. Validar estado da sessão e audiência do conteúdo.
6. Autorizar apenas a operação e os campos permitidos; filtrar a resposta por audiência.

Proposta de precedência: vínculo removido ou recurso inacessível nega acesso antes de permissões; restrição explícita prevalece nas ações configuráveis; OWNER mantém poderes necessários para administrar sua campanha. Override individual não cria poderes de ADMIN nem autoria de sistema alheio.

## Casos obrigatórios de proteção

- Campanha pública com sessão privada: público pode ver apresentação da campanha, mas não sala/histórico.
- NPC parcialmente revelado: jogador recebe somente os campos revelados; segredo não é enviado.
- Documento para usuários específicos: um membro sem concessão não o acessa.
- Sessão pública: espectador não altera ficha nem rola dados, mesmo enviando comandos manualmente.
- Jogador removido: perde acesso às consultas e aos canais que já estavam abertos.
- Convite pendente: não permite usar permissões de jogador antes do aceite.
- Link de privado: identificador conhecido não dispensa vínculo.

DP05 deve resolver visitantes em transmissões e sessões públicas de campanhas não públicas. Enquanto pendente, a proposta conservadora está nas [regras de negócio](04-regras-de-negocio.md).

## Referências

Origem: seções 3, 9, 12, 23, 28, 30–31. Veja [segurança](11-seguranca.md), [API](09-api.md), [WebSocket](10-websocket.md) e [testes](16-testes.md).
