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

Migration aplicada no Neon PostgreSQL 18.6 após backup custom de 43.998 bytes, com cabeçalho e manifesto conferidos via `pg_restore --list`. Cópia local ignorada em `.artifacts/backups/before-dice-1791478032621.dump`; não foi realizado ensaio de restauração. O cliente PostgreSQL 18 recebeu os certificados CA necessários, mantendo `verify-full`. Os IDs anteriores de onze tabelas foram conferidos após a migration e preservados; sete migrations concluídas.

Código publicado: `77fdf967684e10114e9eddd19cc3f5dff2aada44`. API `dpl_2oYsTjDSrLaSy7oy5yQjGdcxbSav` e web `dpl_3C66w8BkBrPHbZLGquCQb2Fy3NRw`, builds aprovados, estado READY e aliases `paralax-rpg-api.vercel.app` / `paralax-rpg-web.vercel.app` atualizados.

Teste online com Chromium em desktop e Pixel 7, reduzido a 320 px durante o formulário ao vivo: duas contas por cenário, convite e aceite, ficha com perícia +7, rolagem 2d6 com adicional −3, resultado final com modificador +4 e soma conferida. Mestre recebeu o histórico e rolou 1d20−2, recebido pelo jogador. Reenvio do mesmo pedido retornou exatamente a primeira rolagem, sem nova linha. Encerramento bloqueou novas rolagens, recarga preservou as duas existentes e remoção do jogador eliminou o conteúdo privado da tela. Visitante anônimo viu somente a apresentação; endpoints de histórico/opções retornaram 401. SQL no Neon confirmou autor, campo, resultados, total e sequência.

Capturas online desktop/móvel salvas em `.artifacts/online-*-rolagens*.png`; captura móvel ao vivo inspecionada, sem overflow e com logout visível. Sem erros JavaScript nas páginas. Contas sintéticas e seus dados associados removidos por IDs/e-mails/nomes exatos; ausência confirmada no banco.

Consulta dos dois deployments após os testes, janela de uma hora: nenhum HTTP 500, nenhum registro web de nível error. API apresentou seis registros com aviso existente de depreciação de `sslmode` na inicialização do driver, todos associados a HTTP 200, sem falha de conexão. Portanto, não se afirma ausência de logs de erro da API. Os arquivos de logs ficam ignorados em `.artifacts/rolls-*.jsonl`.
