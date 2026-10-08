# Verificação 008 — Sessões e agenda

Entrega de 7 de outubro de 2026. Mestre agenda com fuso, inicia/encerra ou cancela; jogadores ativos acompanham. Só uma sessão pode estar ao vivo na campanha. Apresentação pública oferece metadados de encontros elegíveis, sem regras privadas ou fichas. Políticas na [decisão 006](../architecture/decisions/006-sessoes-e-agenda.md).

## Entrega

Agenda pessoal e por campanha, criação/edição, detalhes, início, fim real com duração, cancelamento e histórico de estados. Salvamento explícito, revisão otimista, descarte consentido, rascunho preservado em conflito e histórico transacional. Atualização ao recuperar foco e a cada 30 segundos enquanto visível. Mestre administra; jogador ativo consulta; remoção revoga acesso sem apagar encontros.

Migration aditiva 20261008010000_sessions: GameSession/GameSessionChange, restrições de estado/datas/revisão e índice único parcial de uma LIVE por campanha. Trava da campanha serializa início, fechamento, edição e remoção; campanha não pode ser finalizada/cancelada com LIVE.

## Evidências locais

Tipos passaram em contratos, API e web. `npm run test:api` passou 51 testes, incluindo nove casos do novo módulo; após o build final, `npm run test --workspace @paralax/api` confirmou os mesmos 51 com a API compilada. Regressão completa `npm run test:e2e -- --max-failures=1`: 22 passaram em 3,6 minutos, 11 desktop e 11 Pixel 7. `npm run build` passou em contratos, NestJS e Next.js, incluindo cinco rotas privadas e duas públicas de sessões. Um ajuste CSS manteve o badge público visível no celular; build web repetido passou e essa apresentação será conferida online.

- Fuso Fortaleza/UTC e meia hora de Kolkata, calendário inválido, horário inexistente/ambíguo por DST.
- Agenda persistida após reiniciar API; data agendada independente de início real.
- Somente mestre escreve; jogador ativo consulta, terceiros/pendentes/removidos não recebem dados privados. Campanha pública não publica agenda privada.
- Escritas concorrentes: um vencedor por revisão; retries do mesmo comando não duplicam histórico. Transições terminais não reabrem sessão.
- Duas agendas disputam LIVE; índice rejeita uma segunda LIVE mesmo por gravação direta. Início contra fechamento tem um vencedor; fechamento com LIVE é bloqueado.
- Público exige LIVE/PUBLIC e campanha PUBLIC; privatização e encerramento removem descoberta/detalhe. DTO omite regras, fichas, e-mail, membros, revisão e auditoria.
- Remoção revoga agenda/histórico; reingresso restaura consulta sem controle administrativo.
- Cota de 100 agendas respeitada sob concorrência; cancelamento libera vaga; paginação 20/1 e filtro não expõem campanhas alheias.

Os testes de navegador cobrem edição em duas abas, preservação/recarga consentida de rascunho, acompanhamento por jogador, apresentação anônima, encerramento, cancelamento, perda de acesso, lista e recuperação de falha 503 simulada. Contas sintéticas locais entram pela interface após preparação de hash no banco local, sem reduzir os limites de autenticação. Os contextos são fechados antes da limpeza por IDs.

A leitura SQL do teste foi corrigida para interpretar explicitamente em UTC o TIMESTAMP armazenado pelo Prisma; o payload da API já retornava o instante correto. Uma execução inicial registrou TypeError entre cenários antigos, sem stack. Execução focada de campanhas/sessões e regressão completa com diagnóstico passaram sem repetir esse erro. A causa não foi confirmada; o diagnóstico temporário foi removido antes do build.

SQL conferiu instante UTC, fuso, revisão 4 e histórico SCHEDULED/SCHEDULED/LIVE/ENDED, todos pelo mestre. Capturas desktop/mobile de apresentação pública e sessão finalizada foram inspecionadas; sem overflow nas telas verificadas. Seis controles da barra cabem em 320 px. Artefatos `.artifacts/{desktop,mobile}-sessao-{publica,finalizada}.png` e `.artifacts/sessoes-navegacao-320px.png` ficam ignorados/excluídos do upload. Revisão React verificou efeitos com abort/limpeza, callbacks estáveis, labels/erros e prevenção de escritas repetidas.

## Publicação e verificação online

Atualização dos projetos existentes Vercel e banco Neon de testes em preparação. IDs, commit, resultados do smoke e consultas de logs serão registrados após a verificação pelo endereço público.

## Limites

Sem chat, rolagens, presença, seleção de participantes, preparação/pausa, audiência de espectadores ou WebSocket. Ao vivo agora apresenta encontros e não transmite conteúdo de uma mesa. Público não recebe fichas; histórico de alterações ainda não tem endpoint de consulta/restauração. Estados terminais exigem uma nova agenda. Dados já entregues não podem ser recolhidos; nova operação sempre reautoriza no servidor. Sem teste de carga ou garantia de disponibilidade contínua. Próximo incremento: chat e dados com persistência e entrega autorizada entre participantes.
