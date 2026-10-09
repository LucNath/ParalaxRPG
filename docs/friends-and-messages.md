# Amigos e mensagens privadas

Em **Meu espaço → Amigos**, o usuário busca o início de um nome de usuário (mínimo 3 caracteres, até 20 resultados), envia uma solicitação e acompanha pedidos recebidos/enviados. O destinatário pode aceitar ou recusar; o remetente pode cancelar. A amizade precisa ser aceita para abrir ou enviar mensagens.

A página reúne 30 vínculos por vez, incluindo amizades, solicitações e pessoas bloqueadas pelo próprio usuário. Mostra a última mensagem e a contagem de não lidas. As conversas carregam as 50 mensagens mais recentes e permitem buscar páginas anteriores. Texto simples, até 2.000 caracteres; HTML permanece texto. Sem anexos, chamadas ou indicadores de presença nesta versão.

Enquanto a página estiver visível, a lista é atualizada a cada 15 segundos e a conversa a cada 7 segundos, também ao retornar à aba. O histórico fica no PostgreSQL; a implementação funciona nas funções atuais da Vercel, sem depender de conexões WebSocket persistentes. Não há notificações push ou criptografia ponta a ponta. As mensagens são privadas por autorização da API e não aparecem nos perfis públicos.

## Consentimento e bloqueios

- Só o destinatário aceita ou recusa uma solicitação pendente. Pedidos cruzados continuam pendentes: não representam consentimento automático.
- Remover amizade torna o histórico indisponível e impede novos envios. Se a amizade for aceita novamente no futuro, o histórico volta a ficar disponível para os mesmos participantes.
- Bloquear impede pedidos, mensagens e resultados de busca entre o par. Só quem bloqueou pode desbloquear. Desbloquear não restaura a amizade.
- Recusar, cancelar, remover ou desbloquear inicia uma espera de 24 horas antes de outra solicitação entre o mesmo par.
- Há limites de 10 solicitações e 30 envios de mensagem por minuto por endereço IP/rota, além do limite geral existente. Os contadores atuais são locais à instância da API; não representam uma cota global distribuída.

## Dados e concorrência

`Friendship` usa um par canônico de IDs (`lowId < highId`) com unicidade no banco. Criação concorrente usa `INSERT ... ON CONFLICT` seguido de trava da linha; ações, envio e leitura compartilham a mesma trava. Assim, um envio só pode ocorrer antes da remoção/bloqueio ou ser rejeitado depois dela.

`DirectMessage` tem sequência crescente por amizade e unicidade de `(friendshipId, senderId, requestId)`. O cliente mantém o mesmo UUID ao repetir um envio cujo resultado ficou incerto. Reutilizar o UUID com outro conteúdo retorna conflito. A paginação por sequência evita perdas por timestamps iguais. Cada participante tem um marcador de leitura monotônico; o GET não altera esse marcador.

Todos os endpoints `/api/v1/social/*` exigem autenticação, validam entradas estritamente e retornam `Cache-Control: no-store`. O servidor deriva o remetente da sessão; nenhuma entrada permite escolher outra identidade. Busca/listas retornam apenas identidade pública, nunca e-mail ou credenciais. Perfis de amigos não dão acesso a campanhas privadas. Excluir uma conta remove seus vínculos e conversas por cascata.

## Notificações

O sino no cabeçalho abre `/notificacoes`, com solicitações recebidas, amizades aceitas e novas mensagens agrupadas por conversa. Os atalhos abrem a solicitação ou conversa mesmo quando o vínculo está fora da primeira página de Amigos. A central mostra 30 avisos por página e permite marcar cada aviso como visto.

O indicador de **Amigos** soma solicitações recebidas pendentes e mensagens efetivamente não lidas em todos os vínculos. O sino conta avisos não vistos. Marcar um aviso como visto não lê a conversa nem resolve uma solicitação; ler as mensagens na conversa atualiza ambos os estados correspondentes. Os contadores e a central atualizam a cada 15 segundos enquanto a aba está visível, ao retornar à aba e após ações locais.

`SocialNotification` não guarda o conteúdo das mensagens. Triggers no PostgreSQL criam e atualizam os avisos na mesma transação da amizade ou mensagem, também durante a publicação gradual da API. Cancelar, recusar, remover ou bloquear retira os avisos daquele vínculo. Replay de envio não gera novo aviso. Uma revisão crescente impede que marcar um aviso antigo como visto oculte mensagens recebidas depois dele.

A migração recupera solicitações atualmente pendentes e mensagens atualmente não lidas. Não inventa avisos históricos de aceite, pois o horário original não está disponível. Não há entrega por e-mail ou push nesta etapa.

## Endpoints

| Método e rota (prefixo `/api/v1/social`) | Entrada e resultado |
| --- | --- |
| `GET /search?search=nome` | Até 20 identidades públicas por prefixo; exclui a própria conta e pares bloqueados |
| `GET /connections?page=1` | Até 30 vínculos visíveis, última mensagem e contagem de não lidas |
| `GET /connections/:id` | Um vínculo visível do próprio usuário para acesso direto |
| `GET /notifications/summary` | Solicitações recebidas, mensagens não lidas e avisos não vistos em todos os vínculos |
| `GET /notifications?page=1` | Até 30 avisos, apenas identidade pública, tipo e revisão |
| `POST /notifications/:id/read` | `{ version }`; marca o aviso observado como visto sem alterar leitura da conversa; revisão antiga não oculta um aviso novo; status 204 |
| `POST /requests` | `{ username }`; retorna `{ id }` com status 201 |
| `POST /connections/:id/action` | `{ action }`: `accept`, `decline`, `cancel`, `remove`, `block` ou `unblock`; status 204 |
| `GET /connections/:id/messages?before=sequencia` | Até 50 mensagens em ordem crescente e `hasMore`; sem `before`, retorna as mais recentes |
| `POST /connections/:id/messages` | `{ requestId, content }`; retorna a mensagem com status 201, também em replay idêntico |
| `POST /connections/:id/read` | `{ sequence }`; avança apenas o marcador do solicitante, até uma sequência já existente; status 204 |

Uma conversa sem amizade aceita ou sem participação retorna 404. Solicitação duplicada, espera de reenvio e ações incompatíveis retornam 409. Entradas inválidas retornam 400; limites de requisições retornam 429.

## Verificação

`apps/api/test/social.integration.test.cjs` testa consentimento, isolamento, pedidos cruzados, replay de mensagem, ordenação concorrente, leitura, paginação, bloqueio, cooldown e limites, com PostgreSQL local real. `tests/e2e/social.spec.ts` percorre duas contas no navegador em desktop/celular: busca, convite, aceite, troca de mensagens, não lidas, persistência e bloqueio. As contas de teste são locais e removidas ao final, preservando as vagas pioneiras reais de produção.

Os testes da API também cobrem notificações, revisão antiga, rollback, retirada por bloqueio/cancelamento e contadores com mais de 30 vínculos. `tests/e2e/notifications.spec.ts` verifica sino e menu no dashboard, aceite, atalhos, aviso visto versus mensagem lida, logout e largura de 320 px.
