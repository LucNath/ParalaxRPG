# 04 — Regras de negócio

As regras marcadas como **origem** vêm do anexo. As **derivadas** explicitam consequências desses requisitos. As **propostas** precisam de validação e não substituem as decisões pendentes do [índice](README.md).

## Sistemas e fichas

| ID | Regra | Natureza |
| --- | --- | --- |
| RB01 | Qualquer usuário autenticado pode criar um sistema | Origem |
| RB02 | Um sistema é reutilizável por várias campanhas; seu criador administra sua definição | Origem |
| RB03 | Toda campanha está associada a um sistema; todo personagem está associado a usuário, campanha, sistema e ficha | Origem |
| RB04 | A ficha varia com a definição do sistema; atributos fixos de um RPG não devem ser impostos pela plataforma | Origem |
| RB05 | O Mestre da campanha não ganha direito de editar o sistema original de outro criador | Derivada |
| RB06 | Campanha utiliza uma versão identificada do sistema, evitando mudanças silenciosas nas fichas | Decisões 002/003; vínculo implementado |

No MVP 1, o editor define atributos, perícias, recursos e dados. Fórmulas como `Vida Máxima = Constituição * 5 + Nível * 10`, `Defesa = 10 + Destreza + Armadura` e `Ataque = 1d20 + Força + Proficiência` são exemplos futuros, não linguagem de programação já especificada.

Fichas persistidas seguem a [decisão 005](architecture/decisions/005-personagens-e-fichas.md): criador da sessão como dono, versão fixa da campanha, até 20 fichas por dono/campanha, campos exatos e valores inteiros validados contra essa versão. Só dono ativo e mestre leem/editam. Remoção preserva fichas para o mestre; reingresso restaura acesso. Nível é opcional, sem impor progressão a sistemas que não o usam. Campanhas Finalizada/Cancelada não recebem fichas novas, mas permitem edição das existentes.

## Campanhas e membros

| ID | Regra | Natureza |
| --- | --- | --- |
| RB07 | O Mestre possui administração completa dos módulos disponíveis da própria campanha | Origem |
| RB08 | Criar uma campanha estabelece seu responsável administrativo; o mesmo usuário pode ser jogador em outra campanha | Derivada |
| RB09 | Campanhas possuem estado e visibilidade independentes | Origem |
| RB10 | Solicitação de ingresso só se aplica a campanha pública recrutando e exige decisão do Mestre | Origem |
| RB11 | Convite não equivale a participação: o vínculo é estabelecido na aceitação autorizada | Derivada |
| RB12 | Capacidade máxima de jogadores deve ser verificada também no aceite, de forma atômica | Derivada da capacidade definida na origem |
| RB13 | Um usuário possui apenas um vínculo ativo por campanha; remoção revoga acesso e conexão | Vínculo/acesso HTTP adotados na decisão 004; canais futuros |
| RB14 | O responsável não pode perder o próprio vínculo sem transferência de responsabilidade ou exclusão definida | Proteção do mestre adotada na decisão 004; transferência futura |

Campos de campanha descritos na origem: nome, imagem, banner, descrição, sistema, Mestre, capacidade de jogadores, classificação indicativa, tags, idioma, frequência e status. A obrigatoriedade de cada campo não foi definida. Para o MVP, propõe-se exigir nome, sistema, visibilidade e capacidade; os demais podem ser opcionais.

Estados de campanha: **Planejada, Recrutando, Em andamento, Pausada, Finalizada, Cancelada**. A origem não define o grafo de transição nem impede reabertura. A [decisão 003](architecture/decisions/003-campanhas-versionadas.md) adota seleção de qualquer estado pelo mestre, inclusive reabertura, com registro transacional da configuração. Isso não inicia sessões nem concede ingresso. A decisão 006 impede finalizar/cancelar campanha com uma LIVE; encerrá-la primeiro. Criação/edição, nome, descrição, capacidade, estado e visibilidade pública/privada estão disponíveis; os demais campos continuam futuros.

Convites e membros seguem a [decisão 004](architecture/decisions/004-convites-e-membros.md): convite por username de conta existente, sete dias de validade, no máximo 50 pendentes e um por destinatário/campanha. Aceitar cria/reativa o vínculo de jogador na mesma transação e verifica a capacidade, excluindo o mestre. Falta de vaga preserva o convite pendente; reduzir capacidade abaixo dos jogadores ativos é proibido. Finalizada/Cancelada bloqueiam novos envios e aceites. Remoção impede novas leituras privadas; retorno exige novo convite. Membros ativos leem regras fixas, sem editar campanha ou sistema original.

## Visibilidade

| Recurso | Pública | Não listada | Privada |
| --- | --- | --- | --- |
| Campanha | Pode aparecer em descoberta; detalhes privados continuam protegidos | Não aparece em pesquisas; acesso por convite ou link, conforme política | Apenas Mestre e jogadores convidados/autorizados |
| Sistema | Pode aparecer no catálogo | Não aparece no catálogo; acesso direto conforme política | Restrito ao criador e autorizações explícitas |

Um identificador ou link de campanha privada não concede autorização. Para recursos não listados, a implementação deve definir se o link é apenas localização ou uma credencial de acesso limitada (DP04/DP05/DP06). Não listar não equivale a tornar privado.

Para sistemas, a [decisão 002](architecture/decisions/002-sistemas-versionados.md) já define essa política: público aparece no catálogo; não listado permite leitura completa a qualquer pessoa com o link; privado é acessível somente ao autor. Autorizações adicionais privadas ainda não existem. Apenas o autor edita, e cada salvamento gera uma versão imutável. Campanhas seguem a decisão 003; sessões seguem a decisão 006.

Sessões têm privacidade própria: **pública ou privada**. Não há visibilidade “não listada” de sessão definida na origem.

| Campanha | Sessão | Comportamento |
| --- | --- | --- |
| Pública | Pública | Sessão ao vivo pode aparecer em descoberta e admitir espectadores |
| Pública | Privada | Campanha continua encontrável; sala, histórico e eventos exigem autorização |
| Privada | Privada | Apenas membros autorizados |
| Privada ou não listada | Pública | Não exemplificado na origem; decisão DP05 |

**Adotado na decisão 006:** sessão pública somente em campanha pública; apresentação anônima e descoberta exigem LIVE/PUBLIC e campanha PUBLIC. Privatização e encerramento ocultam nas novas consultas. Audiência/ingresso de espectadores permanecem futuros. Metadados privados nunca devem ser publicados por consequência de uma sessão ao vivo.

## Sessões

Uma sessão contém título, descrição, data, horário, participantes, duração, status e privacidade. O Mestre cria, inicia e encerra sessões. Participantes e espectadores são categorias distintas.

Estados de origem: **AGENDADA, PREPARANDO, AO VIVO, PAUSADA, FINALIZADA, CANCELADA**. O contrato técnico propõe `SCHEDULED`, `PREPARING`, `LIVE`, `PAUSED`, `ENDED` e `CANCELLED`, com rótulos em português na interface.

### Recorte implementado

A [decisão 006](architecture/decisions/006-sessoes-e-agenda.md) adota SCHEDULED → LIVE → ENDED e SCHEDULED → CANCELLED. Só agendas aceitam edição; terminais exigem outra sessão. Somente mestre escreve com expectedRevision e auditoria transacional; comandos repetidos no mesmo destino são idempotentes. Até 100 agendas e uma LIVE por campanha, com trava e índice parcial. Agenda guarda UTC e fuso IANA; início/fim reais vêm do servidor. Duração é fim menos início em segundos. Jogadores ativos consultam todos os encontros da campanha. Seleção por sessão, preparação e pausas seguem futuras; a tabela abaixo preserva planejamento completo.

### Transições propostas

| Estado atual | Ação | Próximo estado |
| --- | --- | --- |
| AGENDADA | Preparar | PREPARANDO |
| AGENDADA ou PREPARANDO | Iniciar | AO VIVO |
| AO VIVO | Pausar | PAUSADA |
| PAUSADA | Retomar | AO VIVO |
| AO VIVO ou PAUSADA | Encerrar | FINALIZADA |
| AGENDADA ou PREPARANDO | Cancelar | CANCELADA |

No MVP 1, basta agendar, iniciar e encerrar; os estados adicionais permanecem previstos. Reabertura de sessão finalizada/cancelada não está definida. Proposta: estados terminais exigem uma nova sessão.

- Apenas sessão **AO VIVO** e pública elegível aparece em “Ao vivo agora”.
- Proposta: apenas uma sessão AO VIVO ou PAUSADA por campanha, verificada sob concorrência.
- Data/horário devem preservar o fuso escolhido; proposta técnica: instante UTC e fuso IANA da agenda.
- Proposta: duração representa intervalos efetivamente ao vivo, excluindo pausas; confirmar antes de exibir estatísticas.
- Encerrar a sessão remove sua entrada de descoberta e bloqueia novas ações de jogo. Histórico continua acessível conforme política de retenção e autorização.

## Chat e dados

| ID | Regra | Natureza |
| --- | --- | --- |
| RB15 | Participantes autorizados podem conversar e rolar dados; espectadores não podem rolar | Origem |
| RB16 | Rolagens possuem histórico persistido | Origem |
| RB17 | O servidor calcula a rolagem e registra autor, expressão e resultado; não aceita total escolhido pelo cliente | Proposta técnica de integridade |
| RB18 | Mensagens privadas Mestre/jogador são visíveis apenas aos envolvidos e nunca a espectadores | Derivada da privacidade |
| RB19 | Estado, adesão e permissão são conferidos a cada ação, incluindo depois de uma remoção | Derivada |

Dados citados: d4, d6, d8, d10, d12, d20 e d100. Expressões exemplificadas: `1d20`, `2d6`, `1d20 + 5`, `3d8 + 4` e `2d20kh1`.

Proposta mínima de sintaxe: `NdS`, modificador inteiro com `+` ou `-` opcional e `khK` opcional para manter os K maiores resultados. `1 ≤ K ≤ N`. Quantidade, faces e modificadores têm limites a definir (DP09). Usar um parser explícito; `eval` e execução de código do usuário são proibidos pela proposta de segurança.

## Conteúdo futuro

- NPCs: públicos, parcialmente revelados ou secretos; notas secretas ficam reservadas ao Mestre.
- Documentos: públicos, para jogadores, para o Mestre ou para usuários específicos.
- Mapas: o Mestre controla mapa e revelação; jogadores veem apenas áreas reveladas quando houver fog of war.
- Combate: o Mestre controla participantes, iniciativa, vida, condições e encerramento.
- Inventário: o Mestre cria, entrega e retira itens; quantidades e transferências devem permanecer consistentes.

Essas regras serão aplicadas quando os respectivos módulos forem implementados; ver [roadmap](15-roadmap.md).

## Referências

Origem: seções 3–13, 20–31, 46, 56, 59. Veja [dados](08-modelo-de-dados.md), [permissões](12-permissoes.md) e [segurança](11-seguranca.md).
