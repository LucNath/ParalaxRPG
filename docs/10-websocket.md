# 10 — WebSocket e comunicação em tempo real

## Objetivo e status

RNF005 exige comunicação bidirecional para chat e informações de sessão. A origem sugere Socket.IO ou WebSocket puro e lista eventos possíveis na seção 39. Transporte, nomes finais e envelopes abaixo são **propostas**.

O banco é fonte de verdade para mensagens, rolagens, fichas e estado da sessão. Redis pode coordenar presença e distribuição entre instâncias, sem substituir a persistência.

## Conexão e autorização

1. Cliente conecta usando o mecanismo autenticado definido em DP03, sempre por transporte seguro em produção.
2. Servidor verifica credencial, origem permitida e identidade; não confia em `userId` enviado pelo cliente.
3. Cliente solicita ingresso em uma sessão.
4. Servidor confere campanha, privacidade, estado e vínculo, determina papel efetivo e audiência.
5. Servidor fornece snapshot autorizado e habilita apenas os canais correspondentes.

Identidade no handshake não basta: cada comando precisa validar acesso atual. Expiração do token, remoção de membro e mudança de privacidade exigem revalidação/revogação, inclusive em conexões existentes.

Proposta: convidado pendente não acessa canal de jogador. Usuário sem vínculo só entra na audiência pública se a sessão for elegível. Acesso anônimo permanece DP05.

## Salas lógicas propostas

| Sala/audiência | Conteúdo | Destinatários |
| --- | --- | --- |
| `user:{id}` | Convites e avisos privados | Titular autenticado |
| `campaign:{id}:members` | Atualizações da campanha permitidas a membros | Membros ativos elegíveis |
| `session:{id}:participants` | Chat e estado de jogo autorizado | Participantes e Mestre |
| `session:{id}:public` | Projeção publicada | Espectadores e usuários autorizados |
| `campaign:{id}:gm` | Informações reservadas de administração | Responsável/Mestres autorizados |
| Canal privado de chat | Mensagens Mestre/jogador | Apenas interlocutores autorizados |

Cliente não pode ingressar escolhendo arbitrariamente o nome de uma sala. O servidor atribui salas. Uma mensagem privada, nota secreta ou ficha completa não deve ser enviada à sala pública para depois ser escondida pela interface.

## Eventos de origem e detalhamento

| Evento | Uso proposto | Emissor autorizado | Etapa |
| --- | --- | --- | --- |
| `session:start` | Notificar estado AO VIVO já persistido | Servidor após ação do Mestre | MVP 1 |
| `session:end` | Notificar encerramento | Servidor após ação do Mestre | MVP 1 |
| `user:join` | Informar presença com projeção por audiência | Servidor | MVP 1 |
| `user:leave` | Informar saída ou expiração da presença | Servidor | MVP 1 |
| `chat:message` | Enviar comando e notificar mensagem persistida | Participante no comando; servidor no evento | MVP 1 |
| `dice:roll` | Solicitar expressão e transmitir resultado persistido | Participante no comando; servidor no evento | MVP 1 |
| `character:update` | Notificar ficha atualizada via serviço compartilhado | Servidor após escrita autorizada | MVP 1 |
| `map:update` | Notificar configuração/estado do mapa | Servidor após ação autorizada | MVP 2 |
| `token:move` | Solicitar/notificar movimento validado | Controlador autorizado/servidor | MVP 2 |
| `combat:start` | Notificar início de combate | Servidor após ação do Mestre | MVP 2 |
| `combat:update` | Notificar rodada, iniciativa, vida e condições | Servidor após ação autorizada | MVP 2 |
| `combat:end` | Notificar encerramento | Servidor após ação do Mestre | MVP 2 |

Na proposta, iniciar/encerrar usa as rotas HTTP da origem e emite eventos depois de persistir. Usar a mesma etiqueta em comando e resposta exige envelopes distintos; a versão final pode separar os nomes se simplificar o cliente.

## Eventos complementares propostos

- `session:join` e `session:leave`: comandos de ingresso/saída.
- `session:snapshot`: estado completo autorizado para ingresso/reconexão.
- `session:updated`: mudanças de agenda, pausa ou privacidade.
- `access:revoked`: comunicação de revogação com desconexão/saída de salas restritas.

Não há chat público de espectadores previsto no MVP 1. Rolagens de participantes podem aparecer na projeção pública somente quando o Mestre as disponibilizar; a política exata é DP11.

## Exemplos de contrato

### Comando de dados

```json
{
  "requestId": "cmd_exemplo",
  "sessionId": "sess_exemplo",
  "expression": "2d20kh1 + 5"
}
```

O cliente não envia resultado, autor confiável ou permissões.

### Evento de rolagem persistida

```json
{
  "eventId": "evt_exemplo",
  "type": "dice:roll",
  "schemaVersion": 1,
  "occurredAt": "2030-05-18T22:10:00Z",
  "sessionId": "sess_exemplo",
  "data": {
    "rollId": "roll_exemplo",
    "actorId": "usr_exemplo",
    "expression": "2d20kh1 + 5",
    "results": [7, 13],
    "keptIndexes": [1],
    "modifier": 5,
    "total": 18
  }
}
```

Índices de dados mantidos são baseados em zero nesta proposta. O formato público pode omitir informações do personagem/autor conforme DP11.

### Confirmação do comando

```json
{ "requestId": "cmd_exemplo", "ok": true, "resourceId": "roll_exemplo" }
```

Erros usam `ok: false` e `error.code/message`, alinhados à [API](09-api.md). Confirmação positiva significa persistência concluída; não promete que todos os destinatários já receberam o evento.

## Reconexão e ordenação

Proposta de fluxo:

1. Reautenticar e revalidar autorização.
2. Assinar canais autorizados com buffer temporário ou cursor de corte.
3. Obter snapshot e histórico por cursor, evitando lacuna entre consulta e assinatura.
4. Aplicar eventos posteriores ao corte e deduplicar por ID persistido/eventId.

Mensagens e rolagens têm identificador de comando para não duplicar persistência em retry. Eventos podem chegar repetidos; o cliente não deve somar dano ou repetir efeito só por recebê-los novamente. Sem mecanismo específico, não prometer entrega exatamente uma vez.

## Presença e múltiplas instâncias

Presença usa heartbeat e expiração; desconexão abrupta não deve deixar usuário online indefinidamente. Contar espectadores únicos ou conexões é decisão de produto; proposta: separar usuários de sockets para múltiplas abas.

Adapter/broker distribui eventos entre instâncias. Testar origem, expiração, reinício, afinidade quando necessária, reconexão e revogação em todas as instâncias. Metas de atraso e tamanho máximo dos eventos seguem DP09.

## Referências

[Arquitetura](07-arquitetura.md), [segurança](11-seguranca.md), [permissões](12-permissoes.md) e [testes](16-testes.md).
