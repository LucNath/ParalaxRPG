# 06 — Histórias de usuário

Backlog derivado da especificação. IDs HU pertencem a esta documentação. A prioridade indica dependência do fluxo, sem estimativa de esforço ou promessa de data.

## MVP 1 e complementos propostos

HU05 inclui publicação de sistemas, requisito geral cujo recorte de primeira entrega é proposto em [MVP](14-mvp.md). As demais histórias abaixo detalham o núcleo e seu funcionamento.

| ID | História | Requisitos | Aceitação essencial |
| --- | --- | --- | --- |
| HU01 | Como visitante, quero criar conta para participar da plataforma | RF001 | Dados válidos criam uma conta; duplicatas e entradas inválidas são rejeitadas |
| HU02 | Como usuário, quero entrar e sair com segurança para proteger meu acesso | RF002 | Login válido concede acesso; renovação segue política; logout revoga refresh token |
| HU03 | Como usuário, quero editar meu perfil e avatar para me apresentar | RF003 | Alterações persistem; apenas o titular edita; arquivo inválido é rejeitado |
| HU04 | Como criador, quero definir um sistema visualmente para usar minhas regras | RF004 | Nome, descrição, atributos, perícias, recursos e dados são salvos sem programação |
| HU05 | Como criador, quero editar e escolher a visibilidade do meu sistema | RF005, RF006 | Catálogo respeita visibilidade; terceiros não editam; mudanças em uso seguem DP06 |
| HU06 | Como Mestre, quero criar campanha com um sistema acessível | RF007, RF008 | Campanha e responsabilidade são persistidas; referência inacessível é rejeitada |
| HU07 | Como Mestre, quero editar, excluir e definir a visibilidade da campanha | RF024; origem 3.4 e 46 | Somente administrador autorizado altera; exclusão segue retenção definida; público não recebe campos privados |
| HU08 | Como Mestre, quero convidar jogadores para montar meu grupo | RF009 | Convite pendente é criado para destinatário definido; não concede acesso sozinho |
| HU09 | Como convidado, quero aceitar ou recusar o convite | RF009, RF011 | Aceite cria vínculo uma vez; recusa não cria vínculo; capacidade é verificada |
| HU10 | Como Mestre, quero remover jogadores da campanha | RF011, RF024 | Remoção revoga HTTP e tempo real; registro administrativo é mantido |
| HU11 | Como jogador, quero criar personagem adequado ao sistema | RF012 | Ficha usa campos do sistema; personagem referencia usuário e campanha |
| HU12 | Como jogador autorizado ou Mestre, quero atualizar atributos e recursos | RF012, RF024; origem 46 | Edição respeita escopo; mudança persiste e chega aos clientes autorizados |
| HU13 | Como Mestre, quero agendar sessão e escolher sua privacidade | RF013, RF017 | Data/fuso são preservados; privacidade é independente da campanha |
| HU14 | Como Mestre, quero iniciar e finalizar sessão | RF014, RF015, RF024; origem 46 e 59 | Estados persistem; início/encerramento são transmitidos; encerrada sai da descoberta |
| HU15 | Como participante, quero conversar na sessão em tempo real | RF018 | Mensagem persistida chega aos destinatários; reconexão recupera histórico |
| HU16 | Como participante, quero rolar dados e consultar resultados anteriores | RF019, RF020 | Parser aceita exemplos da origem; resultado vem do servidor; histórico preserva detalhes |
| HU17 | Como usuário, quero descobrir campanhas públicas e sessões ao vivo | RF015, RF016 | Listagem exclui privadas; apenas sessões públicas elegíveis e ativas aparecem |
| HU18 | Como espectador, quero acompanhar uma sessão pública | RF016, RF025 | Somente projeção pública é recebida; ações de jogador/Mestre são negadas |
| HU19 | Como usuário, quero ver minhas campanhas, convites e próximas sessões no dashboard | Origem 17 | Dados vêm dos meus vínculos e permissões; estado vazio orienta o próximo passo |

## Exemplos de aceitação em cenário

### Convite consumido uma vez — HU09

**Dado** um convite pendente destinado ao usuário B e uma vaga disponível, **quando** B aceita, **então** um vínculo de jogador é criado e o convite fica aceito. **Quando** o mesmo aceite é repetido, **então** nenhum segundo vínculo é criado.

### Privacidade da sessão — HU13/HU18

**Dada** uma campanha pública com sessão privada, **quando** um não membro abre a URL ou tenta entrar no canal da sessão, **então** não recebe ficha, chat, rolagens ou metadados privados, mesmo conhecendo o identificador.

### Controle do Mestre — HU07/HU12

**Dado** o Mestre da campanha A, **quando** tenta alterar a campanha B ou um personagem dela, **então** a operação é negada. Seu papel em A não concede privilégios em B.

### Histórico de rolagem — HU16

**Dada** uma sessão ativa, **quando** o jogador rola `2d20kh1 + 5`, **então** o servidor registra os dois resultados, o dado mantido, o modificador e o total. **Quando** o cliente reconecta, **então** recupera o mesmo registro.

### Encerramento — HU14

**Dada** uma sessão pública ao vivo, **quando** o Mestre a encerra, **então** deixa de aparecer em “Ao vivo agora” e novas mensagens e rolagens de jogo são rejeitadas conforme a proposta do MVP.

## Backlog posterior

| ID | História | Etapa |
| --- | --- | --- |
| HU20 | Como usuário, quero solicitar participação em uma campanha pública recrutando | Após MVP 1; RF010/RF011 |
| HU21 | Como Mestre, quero criar itens e transferi-los para inventários | MVP 2; RF023 |
| HU22 | Como Mestre, quero administrar NPCs e escolher o que revelar | MVP 2; RF022 |
| HU23 | Como Mestre, quero controlar iniciativa, vida e condições no combate | MVP 2; origem 26/47 |
| HU24 | Como Mestre, quero adicionar mapas e controlar tokens | MVP 2; RF021 |
| HU25 | Como Mestre, quero revelar partes do mapa e distribuir handouts | MVP 3; origem 24–25/48 |
| HU26 | Como Mestre, quero organizar história, documentos, wiki e diário com acesso definido | MVP 3; origem 28–29/48 |
| HU27 | Como usuário, quero seguir pessoas, avaliar conteúdo e acompanhar conquistas | MVP 4; origem 49 |
| HU28 | Como criador, quero definir fórmulas, progressão e opções avançadas de ficha | Evolução do construtor; fase pendente |

## Ampliação solicitada — personalização por conquistas

| ID | História | Aceitação proposta |
| --- | --- | --- |
| HU29 | Como usuário, quero obter conquistas que liberem itens para meu perfil | Uma ação elegível confirmada no servidor concede conquista e cosméticos uma única vez, inclusive em concorrência |
| HU30 | Como usuário, quero escolher fundos e bordas da minha coleção | Prévia, seleção independente, remoção e persistência; chamadas diretas não equipam itens bloqueados ou de outra categoria |
| HU31 | Como visitante, quero ver o perfil personalizado | Aparência pública correta, sem progresso/evidências privadas; animações têm pausa e alternativa estática |

HU29/HU30 e a aparência estática de HU31 implementadas no recorte da [decisão 008](architecture/decisions/008-conquistas-e-cosmeticos.md). Animações de fundo/borda disponíveis com pausa e movimento reduzido: [expansão](animated-profile-cosmetics.md). Marcos cumulativos seguem futuros em [20](20-conquistas-e-personalizacao.md). Não promove os demais recursos sociais do MVP 4.

## Ordem e definição de pronto

Implementar HU01–HU03, HU04–HU05, HU06–HU10, HU11–HU12, HU13–HU16 e HU17–HU19 conforme dependências. A navegação pode ser construída junto dos módulos correspondentes.

Uma história está pronta quando seus critérios positivos e negativos passaram, dados persistem, autorização foi exercitada, erros são compreensíveis e documentação/contratos refletem o comportamento. O [fluxo completo do MVP](14-mvp.md) continua obrigatório mesmo com histórias individualmente concluídas.

## Referências

[Casos de uso](05-casos-de-uso.md), [requisitos](02-requisitos-funcionais.md) e [testes](16-testes.md).
