# Decisão 007 — Rolagens e histórico de sessão

Status: adotada em 8 de outubro de 2026, após aprovação da entrega de rolagens com modificadores da ficha e histórico compartilhado. Este incremento implementa o recorte básico de RF019 e o histórico privado de RF020. Chat, WebSocket e audiência de espectadores permanecem próximos incrementos.

## Entrada e cálculo

Cada tentativa recebe requestId UUID, count inteiro 1–50, sides inteiro 2–1000 configurado na versão fixa da campanha, modifier inteiro entre −1.000.000 e 1.000.000, characterId e fieldId opcionais. Campos extras são rejeitados: ator, resultados, total e horário vêm do servidor. O requestId é normalizado para minúsculas.

O servidor usa `node:crypto.randomInt(1, sides + 1)` para cada dado. A função tem limite inferior inclusivo, superior exclusivo e evita viés de módulo conforme a [documentação do Node.js](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback). Total é a soma de todos os resultados mais o modificador final, aplicado uma vez. Não há sucesso/crítico automático: as regras pertencem ao sistema criado pelo usuário.

Sem ficha, modifier é o modificador final. Com ficha, pode-se selecionar um atributo ou uma perícia: o servidor lê seu valor salvo e o soma ao modifier adicional. Não soma automaticamente o atributo associado à perícia, nem usa recursos como modificadores; nenhuma fórmula foi definida para isso. O snapshot conserva identidade/nome da ficha, revisão, categoria/nome/id e valor do campo. Edições posteriores não mudam rolagens antigas.

Dados vêm de Campaign.systemVersionId, não da versão atual do sistema. Uma definição sem dados é válida, mas não oferece rolagem nessa campanha. Expressões livres, `kh`, vantagem/desvantagem, dados explosivos, fórmulas e rolagens secretas ficam para extensões explícitas; não interpretar código ou aceitar resultados do cliente.

## Acesso e ciclo de vida

Somente mestre e jogadores ativos consultam opções/histórico. Jogador rola sem ficha ou usa as próprias fichas da campanha. Mestre pode usar suas fichas e as de jogadores ativos. Fichas de removidos permanecem acessíveis na administração existente, mas saem das fontes elegíveis de novas rolagens. A consulta de opções retorna apenas id/nome; detalhes da ficha usam a rota privada existente.

Novas rolagens exigem LIVE. Sessões agendadas, finalizadas ou canceladas permitem leitura, mas não escrita. Mesmo quando a sessão/campanha é pública, visitantes, convidados pendentes, terceiros e removidos não recebem histórico ou opções. O DTO público permanece somente apresentação. Remoção limpa o conteúdo privado na próxima consulta de foco/atualização; dados já recebidos não podem ser recolhidos.

## Persistência, ordem e repetição

DiceRoll guarda sessão, sequência, ator autenticado, requestId/payload normalizado, snapshot público de autor e da ficha/campo, quantidade/faces, modificadores adicional/da ficha/final, resultados individuais, total e horário do banco. Resultado é retornado somente depois da gravação. Não há edição ou exclusão de rolagens pela API.

Uma transação bloqueia a mesma linha de Campaign usada por edição da ficha, remoção e encerramento da sessão. Assim, uma escrita concorrente usa um estado completo autorizado; nenhuma rolagem nova atravessa uma remoção ou encerramento que venceu a trava. A sequência cresce por sessão e tem unicidade (sessionId, sequence). A chave (sessionId, actorId, requestId) garante uma única rolagem por tentativa. Repetir o mesmo payload retorna o mesmo snapshot, inclusive após editar a ficha ou encerrar a sessão; antes disso, o acesso atual é revalidado. Reusar a tentativa com payload diferente retorna ROLL_REQUEST_CONFLICT.

O cliente bloqueia envios simultâneos. Falha ambígua de rede/5xx/429 conserva o payload e requestId e oferece **Reenviar mesma rolagem**; essa recuperação também funciona depois do encerramento. Confirmar ou receber erro definitivo libera outra tentativa. A tentativa pendente fica em memória desta tela; navegar/recarregar recupera o histórico, mas não conserva o rascunho pendente.

Migration aditiva 20261008020000_dice_rolls cria tabela, índices, FK de sessão e CHECKs de limites, quantidade/faces dos resultados e aritmética exata (função SQL imutável dice_roll_sum). Snapshots não dependem de FK da ficha/ator para preservar histórico após renomeação/remoção. Excluir a sessão/campanha por manutenção elimina seu histórico por cascata; não existe exclusão por usuário na API. Política geral de retenção continua em DP08.

## Consulta e operação

Histórico retorna 20 resultados em sequência decrescente e nextCursor; before é a sequência exclusiva. Novas inserções não deslocam a página de resultados antigos. Há retorno às mais recentes e atualização manual, ao recuperar foco e a cada 30 segundos enquanto a tela está visível. Esta entrega não anuncia atualização instantânea por socket.

GETs e POST usam Bearer e Cache-Control no-store. POST aceita até 30 requisições por minuto pelo guard existente, com contador em memória por instância/IP; não é uma cota global ou distribuída. Recuperar uma tentativa também conta nesse limite. Não há novas dependências, serviços ou variáveis de ambiente.

Contratos na [API](../../09-api.md); evidências na [verificação 010](../../verification/010-rolagens-e-historico.md).
