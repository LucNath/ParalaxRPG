# Verificação 010 — Rolagens e histórico

Incremento de 8 de outubro de 2026. Fluxo: sessão ao vivo → escolher dados/ficha/campo → POST autenticado → cálculo e transação PostgreSQL → resultado e histórico compartilhado → recarga e reconsulta por outro participante. Política e limites na [decisão 007](../architecture/decisions/007-rolagens-e-historico.md).

## Evidências locais

- Migration aditiva 20261008020000_dice_rolls aplicada no PostgreSQL local paralax.
- Oito testes de integração passaram com banco real: sorteio/faixas/soma/persistência após reinício, versão fixa e ficha, entradas fraudulentas, concorrência/idempotência, acesso e remoção/reingresso, cursor com novas inserções, disputa com encerramento/remoção, integridade SQL e limite de frequência.
- Quatro testes E2E passaram (36,7 s), dois cenários em desktop e Pixel 7: resultado de ficha recebido pelo mestre/jogador, validação, apresentação anônima sem histórico, perda da resposta após gravação, replay após encerramento sem duplicata, recarga, revogação, paginação, erro 503 recuperável e sistema sem dados.
- SQL confirmou os resultados, total, campo da ficha e autor autenticado. Contas sintéticas removidas pelos testes. Sem uploads.
- Capturas `.artifacts/desktop-rolagens-compartilhadas.png`, `.artifacts/mobile-rolagens-historico.png` e rolagens paginadas inspecionadas. Histórico móvel conferido em 320 px, sem overflow e com logout em viewport.
- `npm run check`: tipos de API/web/contracts e todos os 59 testes de integração passaram. Build final de API/web passou, incluindo a convenção de ícones existente.

Porta web padrão ocupada por outro aplicativo: testes deste incremento usaram localhost:3002, com origem correspondente só no processo da API. Nenhum arquivo de ambiente local foi substituído, nem o outro processo foi interrompido.

## Publicação

Resultados de publicação e conferência no ambiente online serão acrescentados após concluir.
