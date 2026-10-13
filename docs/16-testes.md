# 16 — Testes

## Status e objetivo

Este documento é o **plano de testes** da plataforma completa. Conta/perfil, sistemas, campanhas, convites/membros e personagens/fichas têm integração com PostgreSQL real e testes de navegador desktop/mobile. Resultados nos relatórios [001](verification/001-autenticacao-perfil.md), [003](verification/003-sistemas.md), [005](verification/005-campanhas.md) e [006](verification/006-convites-e-membros.md). Fichas: 8 casos de API com valores dinâmicos, autoria, acesso privado, FK de versão, reinício, concorrência, quota, remoção e reingresso; 2 cenários E2E em cada dispositivo com criação/validação, edição jogador/mestre, conflito, revogação, paginação e recuperação de erro. Evidências na [verificação 007](verification/007-personagens-e-fichas.md). Sessões acrescentam nove casos de API: fuso/DST, acesso, validação, reinício, estados, concorrência/fechamento, público, remoção/reingresso, cota e paginação. Dois cenários E2E por dispositivo cobrem mestre/jogador/visitante, conflito, estados, revogação e listagem/recuperação. Resultados na [verificação 008](verification/008-sessoes-e-agenda.md). Rolagens básicas acrescentam oito casos de API e dois cenários E2E por dispositivo, incluindo resultado compartilhado, ficha, histórico, cursor, replay após resposta perdida/encerramento e revogação. A conferência de tipos e todos os 59 testes de integração passou; evidências na [verificação 010](verification/010-rolagens-e-historico.md). Chat, expressões avançadas de dados, presença e tempo real abaixo permanecem planejados.

O objetivo do plano é comprovar o fluxo do MVP 1, persistência, privacidade, acesso por campanha e comunicação em tempo real. Testar o payload recebido é necessário: a tela pode esconder um segredo que o servidor já vazou.

O incremento de conquistas acrescenta sete testes de API, incluindo execução da migration real em schema isolado para retroatividade, e um cenário E2E por dispositivo. Verificam concessão atômica, duplicatas, itens bloqueados, categoria, permanência, PATCH parcial, privacidade, cascata, prévia, seleção, recarga, padrão e fallback de mídia. Evidências na [verificação 011](verification/011-conquistas-e-cosmeticos.md).

## Níveis propostos

| Nível | Foco | Exemplos |
| --- | --- | --- |
| Unidade | Regras determinísticas isoladas | Parser de dados, transições, validação de definição e resolução de permissões |
| Integração | Serviços, banco e adaptadores | Convite atômico, capacidade, versões, refresh/revogação e persistência |
| Contrato | HTTP e eventos | Schemas, códigos de erro, projeções públicas e privadas |
| Ponta a ponta | Jornada real no navegador | A cria campanha, B joga, C assiste, A encerra |
| Segurança de acesso | Tentativas proibidas | Outro Mestre, espectador, usuário removido e identificador privado conhecido |
| Resiliência/operação | Falhas e recuperação | Reconexão, reinício, múltiplas instâncias e restauração de backup |
| Interface | Dispositivos e acessibilidade | Formulário, teclado, foco, sala móvel e feedback de conexão |

Ferramentas do recorte inicial: Node Test Runner para integração com PostgreSQL e Playwright para desktop/mobile. Comandos executáveis estão no [README](../README.md); o workflow CI executa tipos, integração, build e E2E no GitHub a cada envio/PR.

## Dados de referência

- A: Mestre da campanha A e criador de um sistema.
- B: jogador convidado para A, com personagem próprio.
- C: usuário sem vínculo, espectador de sessão pública.
- D: Mestre de uma campanha B diferente, sem acesso administrativo a A.
- V: visitante não autenticado.
- Campanha A pública com uma sessão pública e outra privada.
- Campanha B privada e conteúdo com notas secretas.

Usar dados sintéticos em ambiente isolado. Não usar tokens ou informações de produção como fixtures.

## Rastreabilidade dos requisitos funcionais

IDs CT são cenários deste plano. Critérios completos estão em [requisitos funcionais](02-requisitos-funcionais.md).

| Cenário | RFs | Verificação |
| --- | --- | --- |
| CT01 | RF001, RF002 | Cadastro, duplicata, login válido/inválido, refresh e logout |
| CT02 | RF003 | Editar próprio perfil/avatar; negar edição por terceiro e arquivo inválido |
| CT03 | RF004, RF005 | Criar sistema dinâmico, recarregar, editar como autor e negar terceiro |
| CT04 | RF006 | Público, privado e não listado conforme escopo adotado; catálogo e acesso direto |
| CT05 | RF007, RF008 | Criar campanha e responsável; rejeitar sistema inacessível/inexistente |
| CT06 | RF009, RF011 | Convidar, aceitar/recusar, revogar e remover; destinatário incorreto e replay |
| CT07 | RF010, RF011 | Solicitar somente em pública recrutando; aceitar/recusar e verificar capacidade, após MVP 1 |
| CT08 | RF012 | Criar ficha segundo o sistema; rejeitar campo de outra versão/campanha |
| CT09 | RF013, RF014 | Agendar e iniciar; validar fuso, transição, concorrência e permissão |
| CT10 | RF015, RF016, RF025 | Listar ao vivo somente elegíveis; C entra com projeção pública |
| CT11 | RF017 | Campanha pública/sessão privada: negar HTTP, histórico e ingresso de não membro |
| CT12 | RF018 | Dois participantes conversam, conteúdo persiste, retry/reconexão não duplica |
| CT13 | RF019, RF020 | Parser, cálculo no servidor e histórico recuperável; espectador não rola |
| CT14 | RF024 | Mestre altera campanha/ficha; D não administra A; remoção revoga socket aberto |
| CT15 | RF021 | Mestre adiciona mapa; acesso e controle conforme audiência, no MVP 2 |
| CT16 | RF022 | NPC secreto/parcial/público; notas nunca expostas a audiência sem acesso, no MVP 2 |
| CT17 | RF023 | Inventário e transferência consistentes; quantidades inválidas rejeitadas, no MVP 2 |
| CT18 | RF014, RF015, RF024, RF025; origem 59 | Encerrar: FINALIZADA, fora da descoberta, novas ações bloqueadas e histórico autorizado |

CT04/CT07/CT15–CT17 não se tornam bloqueadores do fluxo original do MVP 1 quando estiverem explicitamente fora do escopo da entrega. Devem ser executados na etapa que os disponibilizar.

## Rastreabilidade não funcional

| Cenário | RNF | Verificação |
| --- | --- | --- |
| CT19 | RNF001 | Fluxos em desktop, notebook, tablet e celular, sem perda de ações essenciais |
| CT20 | RNF002 | Banco/logs/respostas sem senha; hash e configuração conforme política |
| CT21 | RNF003 | Access/refresh expiram; rotação, revogação e reuse seguem decisão adotada |
| CT22 | RNF004 | Produção usa HTTPS e transporte seguro, cookies conforme política |
| CT23 | RNF005 | Eventos bidirecionais entre clientes; atraso e perda dentro dos limites definidos |
| CT24 | RNF006 | Instâncias diferentes compartilham eventos/presença e revogação corretamente |
| CT25 | RNF007 | Reinício preserva contas, sistemas, campanha, vínculo, ficha, sessão, mensagens e dados |
| CT26 | RNF008 | Ações administrativas geram auditoria completa, autorizada e sem segredos |

## Teste ponta a ponta obrigatório do MVP 1

Executar os 14 passos da [tabela de conclusão](14-mvp.md) em sessões de navegador distintas para A, B e C. Acrescentar:

1. Recarregar a ficha de B e comprovar que usa a definição persistida.
2. A altera recurso de B durante a sessão; B recebe o novo valor.
3. C tenta editar ficha e rolar dados por chamada direta; servidor nega e não persiste efeitos.
4. D tenta administrar A por HTTP e tempo real; acesso negado.
5. B reconecta e recupera mensagens/rolagens sem perda ou duplicata.
6. A encerra; A, B e C percebem o encerramento e a descoberta é atualizada.
7. Reiniciar backend e consultar histórico autorizado.

Registrar ambiente, usuários sintéticos, passos, resultado, evidências e defeitos. Uma tela com selo AO VIVO não basta para validar uma sessão pública funcional.

## Parser e dados

Casos positivos de origem: `1d20`, `2d6`, `1d20 + 5`, `3d8 + 4`, `2d20kh1`. A proposta amplia para modificador negativo e combinação `kh` + modificador.

Casos negativos: expressão vazia, quantidade zero/negativa, faces inválidas, `kh0`, `kh` maior que quantidade, caracteres extras, código executável e custo acima do limite. Espaços, caixa de `d` e limites exatos devem seguir a gramática final.

Usar fonte de aleatoriedade controlável nos testes determinísticos para verificar soma, seleção e empate de `kh`. Na integração, verificar resultados dentro das faces e cálculo a partir dos detalhes; não exigir um total específico de uma rolagem aleatória real.

## Concorrência e falhas

- Dois aceites disputam a última vaga: somente um jogador ocupa a vaga, sem ultrapassar capacidade.
- Mesmo convite aceito simultaneamente: um vínculo e um estado final consistente.
- Duas tentativas de iniciar sessão: respeitar regra adotada de uma LIVE por campanha.
- Duas edições de ficha com mesma revisão: conflito tratado, sem sobrescrita silenciosa conforme estratégia escolhida.
- Persistência falha: não confirmar sucesso nem transmitir resultado definitivo.
- Persistência confirma e entrega falha: histórico/snapshot recupera o estado na reconexão.
- Cliente removido ou sessão tornada privada: revogar acesso nas instâncias e conexões existentes.
- Redis reinicia: histórico do banco permanece; presença se recompõe sem usuários fantasmas.

## Critérios de liberação propostos

Fluxo do MVP aprovado, nenhum defeito aberto que viole autorização/persistência, cenários do escopo executados e decisões dependentes resolvidas. Metas de carga, disponibilidade e recuperação precisam ser fixadas em DP09 antes de homologar produção.

Testes exploratórios de dispositivos e inspeção de payloads complementam automação. Falhas devem produzir casos de regressão úteis, sem criar testes que apenas repetem a implementação.

## Referências

[MVP](14-mvp.md), [segurança](11-seguranca.md), [permissões](12-permissoes.md) e [deploy](17-deploy.md).
