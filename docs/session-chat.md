# Chat das sessões

Na página de cada sessão, **Chat da sessão** reúne o mestre e os participantes ativos da campanha. O chat funciona durante o agendamento e ao vivo. Encerrar/cancelar a sessão ou a campanha fecha novos envios; o histórico continua disponível aos participantes ativos. Amizade e liberação de cosméticos não concedem acesso à mesa.

Mensagens são texto simples de até 2.000 caracteres, com autor e horário no fuso da sessão. As 50 mais recentes carregam primeiro; o botão de histórico busca páginas anteriores. A tela consulta novas mensagens a cada 7 segundos enquanto a aba estiver visível e ao retornar a ela. A entrega usa PostgreSQL e as funções atuais da Vercel, sem infraestrutura adicional de WebSocket.

O sino e a central de notificações mostram um aviso por sessão com mensagens recebidas. **Abrir chat da sessão** leva diretamente ao chat. Marcar o aviso como visto não marca mensagens como lidas. A leitura avança quando o chat está no campo de visão e nas mensagens recentes; ler páginas antigas não apaga avisos novos. A contagem de Amigos continua exclusiva às amizades e conversas privadas.

## Permissões e consistência

- Visitantes, pessoas com convite pendente e ex-participantes recebem 401/404 nos endpoints privados, mesmo em sessões públicas. A apresentação pública não inclui mensagens.
- Envio, leitura e remoção usam a mesma trava da campanha. Após a remoção, o usuário perde leitura, envio e notificações; o histórico permanece para a mesa.
- O reingresso recupera o histórico, sem criar avisos ou não lidas para mensagens anteriores ao retorno. Mensagens posteriores voltam a notificar normalmente.
- Cada envio usa `requestId` gerado pelo cliente. Repetir o mesmo envio recupera a mensagem sem duplicar sequência ou notificação, inclusive após o encerramento se o autor continua autorizado. Usar o identificador com outro conteúdo gera 409.
- A revisão do aviso impede que marcar uma versão antiga como vista esconda mensagens novas. O cursor de leitura só avança e não aceita sequências futuras.
- Há limite de 30 envios HTTP por minuto. Conteúdo HTML é exibido literalmente. Não há anexos, edição, exclusão de mensagens, presença ou notificações push neste incremento.

## API

Todos os caminhos partem de `/api/v1`; exigem autenticação e retornam `Cache-Control: no-store`.

| Método e caminho | Contrato |
| --- | --- |
| `GET /sessions/:id/messages?before=sequencia` | `items`, `nextCursor`, `latestSequence`, `readSequence`, `canSend`; até 50 mensagens em ordem crescente |
| `POST /sessions/:id/messages` | `{ requestId, content }`; mensagem com identidade pública do autor; status 201 |
| `POST /sessions/:id/messages/read` | `{ sequence }`; leitura do solicitante; status 204 |
| `GET /social/notifications` | Feed paginado misto; `SESSION_MESSAGE` contém `session: { id, title }` e identidade pública do último remetente |
| `GET /social/notifications/summary` | Adiciona `sessionUnreadMessages`; `unreadNotifications` inclui avisos de sessões |
| `POST /social/notifications/:id/read` | `{ version }`; marca apenas o aviso observado como visto |

## Persistência e verificação

A migração `20261009090000_session_chat` acrescenta `SessionChat`, `SessionMessage`, `SessionChatRead` e `SessionChatNotification`. Não altera dados existentes nem inventa histórico. Um trigger retira avisos ao remover membros, inclusive durante a atualização entre versões da API. As notificações e a mensagem são gravadas na mesma transação.

`apps/api/test/session-chat.integration.test.cjs` verifica acesso, texto/autoria, persistência, replay, sequência concorrente, paginação, leitura, versões de aviso, feed misto, remoção/reingresso, encerramento e limites com PostgreSQL real. `tests/e2e/session-chat.spec.ts` percorre duas contas em desktop/celular, incluindo resposta perdida, histórico anterior, notificação, apresentação pública e largura de 320 px. Contas sintéticas são criadas somente no banco local e removidas ao final.
