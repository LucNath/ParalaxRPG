# 23 - Backlog e critérios de aceite da VTT

**Estado:** histórias e testes planejados, sem implementação ou resultados de execução nesta etapa. **Data:** 13 de outubro de 2026. Origem, situação atual e IDs de requisitos estão no [catálogo](21-vtt-requisitos.md); ordem e decisões abertas estão no [plano](22-vtt-plano-de-implementacao.md).

Os IDs `VTT-HU01` a `VTT-HU18` e `VTT-T01` a `VTT-T18` são novos e não substituem HU/CT da especificação inicial. O detalhamento de aceite abaixo é uma proposta operacional para capacidades do PDF.

## Próximas histórias: mesa básica e fundação

### VTT-HU01 - Preparar uma cena

Como mestre, quero criar uma cena com mapa e escala para preparar o encontro.

**Entrega:** VTT-I02. **Requisitos:** VTT-R23, VTT-R25, VTT-R31, VTT-R57.

- Criar, nomear e editar cena da própria campanha com imagem, dimensões, escala e grade quadrada ou nenhuma; confirmar os valores salvos.
- Validar arquivo pela decodificação real e pelos limites adotados; rejeitar conteúdo inválido ou acima do limite sem deixar cena incompleta ou asset sem política de limpeza.
- Reabrir a cena preserva configuração e revisão. Outro mestre, pendente, removido ou visitante não edita nem obtém arquivo privado por conhecer o ID.
- Erro de upload/persistência mantém uma mensagem acionável e permite nova tentativa; não informa sucesso antes da confirmação.

### VTT-HU02 - Selecionar a cena da sessão

Como mestre, quero escolher a cena compartilhada para conduzir a sessão.

**Entrega:** VTT-I02. **Requisitos:** VTT-R04, VTT-R25, VTT-R31, VTT-R52.

- Selecionar somente uma cena pertencente à mesma campanha da sessão; o servidor valida esse vínculo.
- Jogadores ativos veem a configuração compartilhada e recuperam a seleção após recarga, conforme o ciclo de vida adotado em VTT-D03.
- Seleção de cena de outra campanha ou por jogador/terceiro é negada sem alterar o estado anterior.
- Troca concorrente exige revisão; uma solicitação antiga não desfaz silenciosamente a seleção vencedora.

### VTT-HU03 - Consultar a mesa autorizada

Como jogador ativo, quero abrir a mesa e navegar pelo mapa compartilhado.

**Entrega:** VTT-I01 e VTT-I02. **Requisitos:** VTT-R04, VTT-R05, VTT-R51, VTT-R52, VTT-R57.

- Consultar cenário autorizado, aproximar/afastar e navegar com os dispositivos definidos no protótipo, preservando o sistema de coordenadas do mapa.
- Estado de carregamento, ausência de cena e erro de rede são distinguíveis; falha de rede não é tratada como expulsão.
- Falta de autenticação retorna 401; recurso privado fora do escopo retorna 404, conforme padrão atual. Campanha/sessão pública não dá acesso à mesa privada.
- Resposta, cursor/histórico e arquivo não incluem notas, chaves de assets ou entidades secretas. Cache de respostas privadas não é compartilhado com outra conta.
- Remoção revoga novas consultas e a tela limpa o conteúdo ao receber/verificar a revogação dentro do limite definido para a entrega. Conteúdo já recebido não pode ser recolhido do dispositivo.

### VTT-HU04 - Criar e controlar tokens

Como mestre, quero posicionar tokens e conceder seu controle aos jogadores adequados.

**Entrega:** VTT-I03. **Requisitos:** VTT-R24, VTT-R32, VTT-R52.

- Criar token básico de personagem ou marcador, definir tamanho/posição e conceder ou retirar controladores. Vínculo de ficha e cena permanecem dentro da mesma campanha.
- Jogador movimenta apenas tokens concedidos e visíveis; não altera dono, concessão, audiência ou ficha vinculada em um pedido de movimento.
- Token sem concessão fica sob controle do mestre; conhecer ID de token alheio ou de outra cena/campanha não permite movê-lo.
- Coordenadas inválidas, infinitas ou fora do limite adotado são rejeitadas. O servidor é autoridade de posição confirmada.
- Depois de revogar controlador ou remover membro, novos movimentos desse usuário são negados. A política de tokens de personagens removidos deve estar definida em VTT-D03.

### VTT-HU05 - Compartilhar posição e recuperar estado

Como participante, quero ver movimentos confirmados e retomar a mesa depois de uma queda.

**Entrega:** VTT-I03 e VTT-I04. **Requisitos:** VTT-R06, VTT-R32, VTT-R53, VTT-R58.

- Dois clientes autorizados convergem para a mesma posição/revisão após um comando confirmado, dentro da meta validada em VTT-D02.
- Resposta perdida mantém o identificador/payload do comando; reenvio recupera o resultado sem duplicar movimento ou evento de histórico. Identificador reutilizado com outro conteúdo é rejeitado.
- Movimentos concorrentes não sobrescrevem silenciosamente uma revisão nova; conflito mostra estado atual e preserva a intenção pendente conforme a política adotada.
- Reconexão valida identidade, participação e controle antes de recuperar snapshot e eventos. Evento fora de ordem/duplicado não faz o token regredir.
- Finalização, pausa da mesa, revogação e movimento simultâneos respeitam a política adotada e a mesma ordenação do servidor; nenhuma escrita atravessa a revogação que venceu.

### VTT-HU06 - Separar segredos e conferir a visão do jogador

Como mestre, quero preparar conteúdo privado e conferir a projeção do jogador antes de revelar.

**Entrega:** VTT-I01 a VTT-I03 para entidades; VTT-I11 para áreas/visão; VTT-I10 e VTT-I12 para rolagens/handouts. **Requisitos:** VTT-R04, VTT-R23, VTT-R28, VTT-R37, VTT-R49, VTT-R57.

- Nota, camada ou token secreto não é enviado no DTO, histórico ou evento do jogador; revelar envia somente a projeção aprovada.
- A prévia usa a mesma política de projeção do servidor para a audiência escolhida, sem executar ações como se fosse outra conta.
- Trocar de conta, retornar a uma cena ou recuperar eventos não traz conteúdo antes oculto. Nome, contagem e URL/chave também não denunciam entidades secretas.
- Imagem de mapa compartilhada por inteiro não oferece sigilo das áreas nela desenhadas. Fog seguro de terreno só entra no aceite após VTT-D10; uma máscara visual no navegador não satisfaz esse critério.
- Ocultar impede novas consultas autorizadas daquela audiência; a especificação não promete apagar cópias que o jogador já recebeu.

### VTT-HU07 - Salvar sem perder trabalho

Como autor autorizado, quero salvamento automático e indicação clara do que está confirmado.

**Entrega:** VTT-I04. **Requisitos:** VTT-R06, VTT-R08, VTT-R58, VTT-R59.

- Exibir confirmado, pendente, inválido, offline e conflito sem confundir prévia local com estado persistido.
- Autosave dos editores de sistema, campanha, ficha, sessão e cena precisa cumprir a política adotada antes de concluir a Fase 1. Uma entrada inválida não é gravada silenciosamente.
- Alteração concorrente preserva o rascunho e exige resolução explícita; revisão antiga não sobrescreve atualização aceita pelo servidor.
- Recuperação de rascunho após queda/recarga segue VTT-D07 e é testada no meio de armazenamento escolhido. Logout/revogação impede rascunho privado de aparecer para outra conta ou de ser reenviado sem autorização.
- Cada salvamento confirmado inclui revisão/auditoria pertinentes; falha/rollback não deixa histórico parcial.

### VTT-HU08 - Desfazer uma alteração autorizada

Como mestre ou controlador autorizado, quero desfazer mudanças sem apagar alterações posteriores de outra pessoa.

**Entrega:** VTT-I04 para mesa; VTT-I09 e VTT-I10 para combate. **Requisitos:** VTT-R03, VTT-R24, VTT-R39, VTT-R58.

- Oferecer histórico e reversão para as operações explicitamente suportadas pelo incremento; informar operações que ainda não podem ser desfeitas.
- Desfazer é um novo comando autorizado, com revisão e auditoria, não uma edição direta de um registro histórico.
- Negar ou pedir resolução quando uma mudança posterior torna a reversão incompatível; não restaurar um snapshot inteiro sobre mudanças válidas de terceiros.
- Resultado de rolagem permanece imutável. Desfazer aplicação de dano/efeito reverte a aplicação conforme regra adotada, sem inventar outro resultado de dado.

### VTT-HU09 - Exportar uma campanha completa

Como proprietário, quero guardar um pacote que permita recuperar a campanha.

**Entrega:** VTT-I05. **Requisitos:** VTT-R02, VTT-R13, VTT-R14, VTT-R16, VTT-R58.

- Gerar snapshot consistente de regras/versões, configurações, fichas, sessões/históricos exportáveis, cenas/tokens e arquivos, conforme os módulos da versão.
- Incluir manifesto, versões, inventário e mecanismos de conferência dos arquivos; indicar conteúdo ausente e limites antes de declarar sucesso.
- Pacote integral é privado ao proprietário autorizado. Exportação seletiva informa o que foi excluído e não se apresenta como backup integral.
- Excluir senhas/hashes, tokens/cookies, segredos de infraestrutura, dados de outras campanhas e concessões externas capazes de escalar privilégios.
- Falha durante leitura de asset/geração não produz um arquivo com aparência de backup completo; aquisição e retenção do pacote seguem política de acesso.

### VTT-HU10 - Restaurar em uma campanha nova

Como proprietário, quero validar um pacote e recuperar uma cópia da campanha.

**Entrega:** VTT-I05. **Requisitos:** VTT-R13, VTT-R14, VTT-R15, VTT-R16, VTT-R57, VTT-R58.

- Mostrar prévia com formato/versão, módulos, arquivos, incompatibilidades e conflitos antes de gravar.
- Restaurar em ambiente de teste/cópia nova, remapeando IDs e dependências. A campanha original permanece intacta.
- Validar arquivos/referências, limites e conteúdo importado sem executar fórmulas/scripts do pacote durante a inspeção.
- Proprietário, vínculos e controles são revalidados; membros externos não recebem acesso automaticamente. A presença de role/admin/owner no pacote não concede esse poder ao importador.
- Falha intermediária não apresenta restauração parcial como concluída; rollback ou recuperação controlada segue a estratégia definida em VTT-D06.
- Comparação após restauração confere valores, relações, versão de regras, posições, históricos exportáveis e integridade dos assets. Diferenças legítimas de IDs/datas são documentadas.

### VTT-HU11 - Começar por uma mesa de demonstração

Como testador, quero aprender o fluxo com uma campanha de exemplo e ações claras.

**Entrega:** VTT-I06. **Requisitos:** VTT-R05, VTT-R46, VTT-R51, VTT-R59, VTT-R60.

- Criar uma cópia privada da demonstração, com dados sintéticos, instruções, mapa/fichas e tokens; não modificar um exemplo compartilhado por todos.
- Testar mestre e jogador em contextos separados; a demonstração não ignora convites, escopo ou autorização.
- Explicar preparação, seleção de cena, controle de token, mensagens, dados, erro de rede, encerramento e exportação/restauração.
- Percorrer consulta e ações essenciais em desktop/celular e por teclado, com foco visível, erros acionáveis e alternativa aos gestos adotados.
- Medir carga e recuperação usando massa explicitamente registrada; metas/limites são definidos a partir da evidência, não apenas de uma demonstração com um token.

## Histórias das fases seguintes

Estas histórias são épicos a decompor quando seus pré-requisitos forem entregues. Não há promessa de implementar toda a linha em uma única alteração.

| ID | História | Entregas | Requisitos | Aceite a refinar |
| --- | --- | --- | --- | --- |
| VTT-HU12 | Como mestre, quero reutilizar compêndios, NPCs, itens e habilidades | VTT-I07 | VTT-R17 a VTT-R20, VTT-R40, VTT-R51 | Cópia local não altera original sem consentimento; referências/versões consistentes; importação em lote sem duplicação ou vazamento |
| VTT-HU13 | Como mestre, quero preparar e registrar a campanha com Wiki e painel privado | VTT-I08 | VTT-R21, VTT-R22, VTT-R47, VTT-R48, VTT-R59 | Página/seção liberada aparece só à audiência correta; backlinks, busca e histórico não revelam notas secretas |
| VTT-HU14 | Como mestre, quero conduzir turnos e atualizar recursos em um lugar | VTT-I09 | VTT-R33 a VTT-R35, VTT-R50, VTT-R52 | Ficha, token e tracker derivam do mesmo valor; turno/condição/pausa idempotentes; rollback e revisão protegem contra aplicação dupla |
| VTT-HU15 | Como criador/mestre, quero regras e ações configuráveis com resolução explicável | VTT-I10 | VTT-R07 a VTT-R12, VTT-R36 a VTT-R40 | Fórmula limitada usa a versão da campanha; preview e reversão; audiência de rolagem validada; nenhum resultado/efeito é aceito do cliente como autoridade |
| VTT-HU16 | Como mestre/jogador, quero visão tática, imersão e apresentação com privacidade e acessibilidade | VTT-I11 a VTT-I13 | VTT-R23 a VTT-R32, VTT-R42 a VTT-R46, VTT-R49, VTT-R53, VTT-R55 | Payload/arquivos de cada visão corretos; efeitos desligáveis; handouts controlados; OBS nunca recebe caderno secreto; desempenho medido |
| VTT-HU17 | Como criador, quero compartilhar e atualizar conteúdo e módulos compatíveis | VTT-I14 | VTT-R01, VTT-R02, VTT-R11 a VTT-R15, VTT-R17, VTT-R54 a VTT-R56, VTT-R60 | Instalação/desativação explica dependências; APIs com escopo; isolamento, migração e restauração ensaiados; licenças e autoria preservadas |
| VTT-HU18 | Como mestre, quero simular um encontro sem modificar o jogo real | VTT-I15 | VTT-R03, VTT-R09, VTT-R39, VTT-R41 | Snapshot isolado, hipóteses/versões/amostra/limitações explícitas; execução por passos; nenhuma gravação na campanha sem ação separada autorizada |

## Cenários de teste planejados

Contas fictícias: A é mestre de uma campanha, B jogador ativo, C sem vínculo, D mestre de outra campanha, E pendente/removido e V visitante. Adicionar co-mestre/espectador somente quando a matriz correspondente for adotada. Exercitar o payload HTTP/evento/asset além da interface: esconder na tela não é evidência de privacidade.

| ID | Verificação planejada | Histórias |
| --- | --- | --- |
| VTT-T01 | Criar/importar imagem válida e salvar grade/escala; rejeitar conteúdo falso, dimensões/arquivo acima do limite e upload parcial | VTT-HU01 |
| VTT-T02 | Selecionar cena da própria campanha; negar seleção de outra campanha, conta ou revisão antiga | VTT-HU02 |
| VTT-T03 | Consulta de A/B autorizada; 401 para V e negativa privada para C/D/E, inclusive após remoção | VTT-HU03 |
| VTT-T04 | B move token concedido; não altera controle, audiência, vínculo ou token alheio; concessão revogada bloqueia nova escrita | VTT-HU04 |
| VTT-T05 | Duas edições concorrentes, resposta perdida, replay, eventos duplicados/fora de ordem e reconexão convergem sem perda silenciosa | VTT-HU05 |
| VTT-T06 | Buscar segredo por ID, feed/histórico, chave/link de asset ou cache não contorna projeção; URL anterior à revogação não satisfaz novo acesso sem política autorizada | VTT-HU03, VTT-HU06 |
| VTT-T07 | Autosave válido/inválido/offline/conflitante e recarga recuperam conforme política; troca de conta/revogação não expõe nem reenvia rascunho privado | VTT-HU07 |
| VTT-T08 | Undo/redo mantém auditoria e revisões; não sobrescreve atualização de terceiro nem altera resultado de dado | VTT-HU08 |
| VTT-T09 | Exportar dados/arquivos integralmente; conferir manifesto e ausência de credenciais, escopo externo e arquivos incompletos | VTT-HU09 |
| VTT-T10 | Restaurar pacote numa cópia, conferir dados/assets; negar versão/referência/arquivo inválido e papéis forjados; preservar original | VTT-HU10 |
| VTT-T11 | Preparação → sessão → cena → movimento → dados/chat → queda/retorno → encerramento → exportação/restauração, em dois clientes | VTT-HU01 a VTT-HU11 |
| VTT-T12 | Zoom, pan, arraste, toque, teclado, foco, escala de tela, baixa resolução e carga registrada de mapas/tokens | VTT-HU03, VTT-HU04, VTT-HU11 |
| VTT-T13 | Compêndio/NPC/Wiki com referências, cópias, busca, descoberta e paginação não revelam conteúdo secreto | VTT-HU12, VTT-HU13 |
| VTT-T14 | Turno, condição, pausa, recurso e remoção simultâneos; ficha/token/tracker consistentes; falha transacional sem aplicação parcial | VTT-HU14 |
| VTT-T15 | Fórmulas/custos/gatilhos e audiência das rolagens; preview de alvos, dano, cura, recursos e efeitos; aplicar/repetir/desfazer sem executar código arbitrário | VTT-HU15 |
| VTT-T16 | Visão/fog/handouts/streaming: inspecionar dados e arquivos entregues; desligar efeitos/áudio/flash individualmente mantém a mesa | VTT-HU16 |
| VTT-T17 | Plugin incompatível, dependência ausente, escopo excedido, desativação, exportação/importação e atualização não corrompem o núcleo | VTT-HU17 |
| VTT-T18 | Simulação recebe cópia autorizada, respeita limites/hipóteses e não grava fichas, tokens ou campanha reais | VTT-HU18 |

## Definição de pronto

Uma história implementada estará pronta quando seus critérios positivos e negativos tiverem evidência, os contratos/documentos refletirem o comportamento e os testes necessários passarem. O registro deve informar versão, ambiente, massa de teste, limitações e resultado; nenhum cenário desta lista é dado como executado apenas por existir no plano.

Para dados persistidos: conferir banco, arquivo e auditoria depois de recarga, falha, conflito e revogação. Para conteúdo compartilhado: verificar navegador, API, resposta e audiência do evento. Para backup: restaurar e comparar, não apenas baixar um arquivo.

Usar banco e contas sintéticas locais/isolados. Dados de produção, vagas pioneiras e contas reais não são fixtures. Executar checks pertinentes ao código alterado; a organização destes arquivos Markdown/PDF exige validação documental, não testes novos que espelhem o texto.

Depois de cada incremento, atualizar o levantamento no catálogo e o [estado geral](README.md) com evidências, mantendo a fonte e os IDs. Não declarar uma fase completa enquanto sua condição de saída no [plano](22-vtt-plano-de-implementacao.md) estiver pendente.
