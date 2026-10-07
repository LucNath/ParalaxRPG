# 18 — Contribuição

## Estado do repositório

O repositório contém documentação e o núcleo inicial de conta/perfil em um monorepo npm. Versões e comandos reais estão no [README](../README.md) e na [decisão 001](architecture/decisions/001-base-e-autenticacao.md). CI está preparado; o MVP completo e a implantação de produção continuam pendentes.

## Fonte e mudanças documentais

A [especificação original](referencias/especificacao-original.md) é a referência de origem e foi preservada integralmente. Não alterá-la para fazer uma decisão nova parecer parte do pedido inicial.

Mudanças devem identificar se corrigem redação, detalham um requisito ou introduzem proposta/decisão. Manter RF001–RF025 e RNF001–RNF008 estáveis. Novos requisitos precisam de ID e origem registrados, sem reutilizar um ID existente com outro sentido.

## Convenções de documentação

- Markdown UTF-8, português claro e links relativos dentro de `docs/`.
- Títulos numerados conforme os documentos 01–18.
- Tabelas para catálogos, matrizes e rastreabilidade; Mermaid para diagramas pequenos.
- Exemplos identificados como fictícios ou ilustrativos; nunca segredos ou dados pessoais reais.
- Propostas e decisões pendentes identificadas no contexto em que afetam a implementação.
- Atualizar o [índice](README.md) ao acrescentar, mover ou renomear documentos.
- Evitar copiar contratos para vários lugares: API, eventos e permissões têm documentos próprios.

## Registro de decisão proposto

Quando uma decisão pendente for resolvida, registrar:

```text
ID / título:
Status: proposta | aceita | substituída
Contexto e requisito relacionado:
Alternativas avaliadas:
Decisão e justificativa:
Consequências e limitações:
Documentos/contratos afetados:
Data e responsável pela decisão:
```

Registros técnicos podem ser criados futuramente em `docs/architecture/decisions/`, quando houver decisões efetivas. Atualizar a linha DP correspondente no índice, mantendo histórico suficiente para entender escolhas substituídas.

## Fluxo de contribuição proposto

1. Descrever problema ou requisito atendido e etapa do roadmap.
2. Consultar regras, permissões e critérios de aceitação relacionados.
3. Implementar ou editar a documentação no escopo declarado.
4. Atualizar contratos e decisões que mudaram.
5. Verificar comportamento, acesso negativo e persistência conforme impacto.
6. Apresentar resultado, evidências e limitações para revisão.

Branching, convenção de commits, proteção de branch e processo de release ainda não foram escolhidos. Esta proposta não presume configuração de Git remoto ou integração já existente.

## Orientação para implementação futura

- Organizar os módulos conforme [arquitetura](07-arquitetura.md), sem criar estruturas vazias para todo o roadmap.
- Manter domínio de RPG independente de um sistema fixo.
- Compartilhar schemas/contratos úteis, mantendo validação autoritativa no servidor.
- Aplicar autorização no serviço e nas projeções de dados, não só na UI.
- Persistir antes de confirmar/transmitir uma mudança crítica.
- Registrar mudanças administrativas sem expor segredos.
- Usar migrations versionadas e dependências fixadas conforme stack aprovada.
- Documentar comandos reais apenas depois de executá-los no ambiente suportado.

## Revisão de mudança

Uma descrição de mudança deve explicar o problema, o comportamento resultante, o requisito e os testes executados. Para alterações simples, poucos parágrafos são suficientes.

Revisar especialmente: escopo da campanha, papéis de espectador, campos secretos, compatibilidade de sistema/ficha, concorrência, mudanças de schema e atualização dos contratos. Não marcar teste como aprovado sem executar e guardar evidência adequada.

## Verificação da documentação

Antes de entregar mudanças em `docs/`, conferir:

- Os 18 documentos e o índice permanecem acessíveis.
- Links relativos apontam para arquivos existentes.
- IDs originais e cobertura das seções estão preservados.
- Critérios de MVP, etapas futuras e propostas não foram confundidos.
- Exemplos de API/eventos concordam com regras e permissões.
- Diagrama, texto e tabelas não se contradizem.
- Texto está em UTF-8 legível, sem corrupção de acentos.

Verificação documental não substitui testes da aplicação. Este repositório só poderá declarar uma versão funcional quando o [fluxo do MVP](14-mvp.md) for implementado e testado.

## Referências

[Roadmap](15-roadmap.md), [testes](16-testes.md) e [deploy](17-deploy.md).
