# Decisão 006 — Sessões e agenda

Status: adotada no incremento de 7 de outubro de 2026. Sessões públicas somente em campanhas públicas seguem a opção recomendada apresentada ao usuário; sem resposta contrária, essa premissa foi informada antes da implementação.

## Agenda e acesso

Cada GameSession pertence a uma campanha. O mestre vem de Campaign.ownerId, sem campo de autoria editável. Somente ele agenda, edita a agenda, inicia, encerra ou cancela. Mestre e todos os jogadores ativos consultam agenda e detalhes; pendência de convite, remoção ou outro papel não concede acesso privado. Nesta etapa não há seleção de participantes por encontro nem registro de presença.

Título tem 2–120 caracteres, descrição até 4000, scheduledAt é um instante ISO com offset e timeZone é um fuso IANA válido. A API normaliza o instante para UTC e conserva o fuso; a interface mostra ambos na agenda. A faixa técnica é 2000–2100. Datas passadas são permitidas; o início é manual, sem job automático. Horários locais inexistentes ou ambíguos por mudança de horário são recusados pela conversão do editor: escolher outro horário ou UTC. Edição sem mudar horário/fuso conserva o instante original.

Campanhas Finalizada/Cancelada bloqueiam criação, edição e início de agendas, mas permitem encerrar uma sessão ao vivo ou cancelar uma agenda existente. A campanha não muda de estado automaticamente. Há até 100 sessões AGENDADAS por campanha; iniciar/cancelar libera essa cota. Encontros finalizados/cancelados conservam histórico. Arquivamento e retenção gerais continuam futuros.

## Estados e concorrência

Estados implementados: SCHEDULED (Agendada), LIVE (Ao vivo), ENDED (Finalizada) e CANCELLED (Cancelada). Criar gera SCHEDULED; só SCHEDULED aceita edição, início ou cancelamento. Só LIVE aceita encerramento. ENDED/CANCELLED são terminais, exigindo outra agenda para um novo encontro. Preparação, pausa e retomada ficam previstas para etapa posterior.

Início/fim/cancelamento são datas do servidor. Duração é o total de segundos entre início real e fim, sem usar o horário agendado; o fim é limitado ao início quando o relógio retrocede. Não há pausas nem estatística acumulada de horas. CHECKs protegem coerência entre estado, datas, duração e revisão no banco.

Escritas bloqueiam a linha da campanha, compartilhando a ordenação com alteração da campanha e remoção de membros. Só uma sessão LIVE é permitida por campanha: verificação transacional e índice único parcial GameSession_one_live_per_campaign. Finalizar/cancelar a campanha enquanto há LIVE retorna CAMPAIGN_LIVE_SESSION. Disputa entre início e fechamento tem apenas um vencedor.

Edição e comandos exigem expectedRevision. Revisão divergente gera SESSION_REVISION_CONFLICT (409); transição inválida gera SESSION_STATE_CONFLICT. Repetir o mesmo comando quando o estado já corresponde ao destino retorna a sessão atual, sem novo histórico, mesmo com a revisão original. Isso não reabre estados terminais nem torna comandos distintos idempotentes.

GameSessionChange grava ator autenticado, revisão única, snapshot e data junto da escrita. Não há endpoint de auditoria, exclusão ou restauração neste incremento. O editor salva explicitamente e preserva rascunho em conflito; recarga e descarte exigem confirmação na interface.

## Público e atualização

PRIVATE e PUBLIC são independentes da visibilidade da campanha. Criar, editar ou iniciar uma sessão PUBLIC exige campanha PUBLIC. A descoberta e o detalhe público exigem simultaneamente LIVE, sessão PUBLIC e campanha PUBLIC. Privatizar a campanha oculta a sessão imediatamente nas novas consultas; encerramento também retira descoberta e detalhe. A visibilidade armazenada da sessão permanece, sem cascata silenciosa.

Visitantes anônimos podem ler somente metadados dessa apresentação: título, descrição, agenda/fuso, início real, identidade pública do mestre, campanha e nome/versão do sistema. Sem definição privada, fichas, membros, revisão, histórico ou controles administrativos. Isso resolve parcialmente DP05: apresentação anônima e elegibilidade pública adotadas; ingresso de espectadores, conteúdo da mesa e audiência continuam futuros.

Listas paginadas, detalhes e editores reconsultam ao recuperar foco e a cada 30 segundos enquanto visíveis. Perda de acesso limpa conteúdo privado; perda de elegibilidade limpa apresentação pública. Cada operação é reautorizada no servidor. Dados já recebidos não podem ser recolhidos. Sem Socket.IO, presença, mensagens, rolagens, mapas ou transmissão audiovisual.

Contratos em [API](../../09-api.md); evidências em [verificação 008](../../verification/008-sessoes-e-agenda.md). Próximo incremento: chat e dados com persistência, autorização compartilhada e entrega entre participantes.
