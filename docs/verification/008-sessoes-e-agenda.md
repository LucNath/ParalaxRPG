# Verificação 008 — Sessões e agenda

Entrega de 7 de outubro de 2026. Mestre agenda com fuso, inicia/encerra ou cancela; jogadores ativos acompanham. Só uma sessão pode estar ao vivo na campanha. Apresentação pública oferece metadados de encontros elegíveis, sem regras privadas ou fichas. Políticas na [decisão 006](../architecture/decisions/006-sessoes-e-agenda.md).

## Entrega

Agenda pessoal e por campanha, criação/edição, detalhes, início, fim real com duração, cancelamento e histórico de estados. Salvamento explícito, revisão otimista, descarte consentido, rascunho preservado em conflito e histórico transacional. Atualização ao recuperar foco e a cada 30 segundos enquanto visível. Mestre administra; jogador ativo consulta; remoção revoga acesso sem apagar encontros.

Migration aditiva 20261008010000_sessions: GameSession/GameSessionChange, restrições de estado/datas/revisão e índice único parcial de uma LIVE por campanha. Trava da campanha serializa início, fechamento, edição e remoção; campanha não pode ser finalizada/cancelada com LIVE.

## Evidências locais

Tipos passaram em contratos, API e web. `npm run test:api` passou 51 testes, incluindo nove casos do novo módulo; após o build final, `npm run test --workspace @paralax/api` confirmou os mesmos 51 com a API compilada. Regressão completa `npm run test:e2e -- --max-failures=1`: 22 passaram em 3,6 minutos, 11 desktop e 11 Pixel 7. `npm run build` passou em contratos, NestJS e Next.js, incluindo cinco rotas privadas e duas públicas de sessões. Um ajuste CSS manteve o badge público visível no celular; build web repetido e apresentação online conferidos.

- Fuso Fortaleza/UTC e meia hora de Kolkata, calendário inválido, horário inexistente/ambíguo por DST.
- Agenda persistida após reiniciar API; data agendada independente de início real.
- Somente mestre escreve; jogador ativo consulta, terceiros/pendentes/removidos não recebem dados privados. Campanha pública não publica agenda privada.
- Escritas concorrentes: um vencedor por revisão; retries do mesmo comando não duplicam histórico. Transições terminais não reabrem sessão.
- Duas agendas disputam LIVE; índice rejeita uma segunda LIVE mesmo por gravação direta. Início contra fechamento tem um vencedor; fechamento com LIVE é bloqueado.
- Público exige LIVE/PUBLIC e campanha PUBLIC; privatização e encerramento removem descoberta/detalhe. DTO omite regras, fichas, e-mail, membros, revisão e auditoria.
- Remoção revoga agenda/histórico; reingresso restaura consulta sem controle administrativo.
- Cota de 100 agendas respeitada sob concorrência; cancelamento libera vaga; paginação 20/1 e filtro não expõem campanhas alheias.

Os testes de navegador cobrem edição em duas abas, preservação/recarga consentida de rascunho, acompanhamento por jogador, apresentação anônima, encerramento, cancelamento, perda de acesso, lista e recuperação de falha 503 simulada. Contas sintéticas dos novos cenários locais entram pela interface após preparação de hash no banco local, sem reduzir os limites de autenticação. Nesses cenários, contextos são fechados antes da limpeza por IDs.

A leitura SQL do teste foi corrigida para interpretar explicitamente em UTC o TIMESTAMP armazenado pelo Prisma; o payload da API já retornava o instante correto. Uma execução inicial registrou TypeError entre cenários antigos, sem stack. Execução focada de campanhas/sessões e regressão completa com diagnóstico passaram sem repetir esse erro. A causa não foi confirmada; o diagnóstico temporário foi removido antes do build.

SQL conferiu instante UTC, fuso, revisão 4 e histórico SCHEDULED/SCHEDULED/LIVE/ENDED, todos pelo mestre. Capturas desktop/mobile de apresentação pública e sessão finalizada foram inspecionadas; sem overflow nas telas verificadas. Seis controles da barra cabem em 320 px. Artefatos `.artifacts/{desktop,mobile}-sessao-{publica,finalizada}.png` e `.artifacts/sessoes-navegacao-320px.png` ficam ignorados/excluídos do upload. Revisão React verificou efeitos com abort/limpeza, callbacks estáveis, labels/erros e prevenção de escritas repetidas.

## Publicação e verificação online

Publicado em **[Paralax RPG — Sessões](https://paralax-rpg-web.vercel.app/sessoes)** e **[Ao vivo agora](https://paralax-rpg-web.vercel.app/ao-vivo)**, código `f3a7910`, pelos projetos existentes Vercel, sem envio ao GitHub. Target production funciona como endereço estável de testes.

| Campo | Web | API |
| --- | --- | --- |
| Framework / status | Next.js / READY | NestJS / READY |
| Build remoto | 30 segundos | 35 segundos |
| Deployment | dpl_6yCSV2ficqbaEtdWjqydh8HTYseG | dpl_EXYAiryom6Ff31M68MxKgVo6UpMi |
| Inspeção | [Web](https://vercel.com/lucky-8804ce74/paralax-rpg-web/6yCSV2ficqbaEtdWjqydh8HTYseG) | [API](https://vercel.com/lucky-8804ce74/paralax-rpg-api/EXYAiryom6Ff31M68MxKgVo6UpMi) |

Sexta migration aplicada por conexão direta ao Neon após confirmar cinco migrations anteriores, projeto/equipe e ambiente de testes. IDs de usuários, sistemas, versões, campanhas, auditoria, membros, convites, personagens e histórico de fichas preservados. Sem reset, seed ou cópia local. Schema aditivo permite retornar ao código anterior sem apagar sessões; o módulo fica indisponível nesse caso, e as proteções novas de fechamento não existem no código antigo.

Saúde da API e descoberta pública retornaram HTTP 200. Smoke pelo domínio público, sem login Vercel ou bypass, passou em Chromium desktop e Pixel 7, com mestre, jogador e visitante anônimo em contextos separados:

- Cadastro real, convite e aceite pela interface; campanha PUBLIC vinculada a sistema PRIVATE.
- Agenda criada em America/Fortaleza, instante UTC correto, edição e preservação do horário local.
- Apenas mestre inicia/encerra/cancela; jogador consulta e percebe LIVE ao recuperar foco, sem controles administrativos.
- Segunda agenda não inicia enquanto a primeira está LIVE.
- Catálogo público e detalhe anônimo mostram somente metadados; payload omite definição privada e e-mail. Leitura privada sem Bearer retorna 401.
- Encerramento persiste após recarga, limpa detalhe público e retorna 404 nas novas consultas públicas; segunda agenda cancelada.
- Remoção limpa sessão privada aberta; novo convite aceito recupera leitura do encontro finalizado.
- Agenda da campanha e lista global acessíveis pelo início, com os dois encontros persistidos.
- SQL Neon confirmou instante UTC, fuso, revisão 4, início/fim/duração, ator mestre nas quatro revisões SCHEDULED/SCHEDULED/LIVE/ENDED, outra sessão CANCELLED e jogador reativado.
- Sem erros de página nem overflow nas telas verificadas; badge Ao vivo visível no celular após o ajuste CSS.

Capturas `.artifacts/online-{desktop,mobile}-sessao-{publica,finalizada}.png` inspecionadas. Quatro contas sintéticas e dados associados removidos por id/e-mail/username exatos, depois de fechar os contextos. TLS permaneceu verificado com certificados do sistema no Node local.

Consultas aos dois deployments finais, janela de uma hora e limite de 100 registros: zero HTTP 500 nos dois projetos e zero eventos error no web. Na API, cinco registros de nível error correspondiam exclusivamente ao aviso do driver pg sobre aliases de sslmode (require/prefer/verify-ca e futura mudança de interpretação), com HTTP 200/201. Não foram erros de negócio ou falhas internas; nenhuma outra mensagem error apareceu nesses registros. Esse aviso já existia no ambiente e não foi corrigido neste incremento. A consulta inicial teve saída truncada; a contagem final usou arquivos ignorados completos, com cinco registros. Não foram adicionados drains ou monitoramento contínuo. Evidências cobrem os fluxos executados e a janela consultada.

## Limites

Sem chat, rolagens, presença, seleção de participantes, preparação/pausa, audiência de espectadores ou WebSocket. Ao vivo agora apresenta encontros e não transmite conteúdo de uma mesa. Público não recebe fichas; histórico de alterações ainda não tem endpoint de consulta/restauração. Estados terminais exigem uma nova agenda. Dados já entregues não podem ser recolhidos; nova operação sempre reautoriza no servidor. Sem teste de carga ou garantia de disponibilidade contínua. Próximo incremento: chat e dados com persistência e entrega autorizada entre participantes.
