# 03 — Requisitos não funcionais

Origem: seção 33. Os requisitos abaixo são obrigatórios na especificação; tecnologias citadas como alternativas permanecem alternativas. Metas numéricas ausentes estão registradas como pendentes.

| ID | Requisito | Verificação prevista |
| --- | --- | --- |
| RNF001 | Funcionar em desktop, notebook, tablet e dispositivos móveis | Executar fluxos principais em diferentes larguras; verificar leitura, formulários, navegação e sala sem perda de ações |
| RNF002 | Nunca armazenar senhas diretamente; usar Argon2 ou bcrypt | Inspecionar persistência e fluxo de autenticação; apenas hashes com salt; nenhuma senha em logs, respostas ou auditoria |
| RNF003 | Autenticação com access token e refresh token | Testar emissão, expiração, renovação e logout; invalidar refresh token revogado conforme política escolhida |
| RNF004 | HTTPS em produção | Verificar TLS no acesso público e transporte seguro de tempo real; impedir uso inseguro das credenciais |
| RNF005 | Comunicação bidirecional para chat e sessões | Dois clientes autorizados recebem eventos; reconexão restaura estado; cliente sem acesso não recebe dados |
| RNF006 | Arquitetura que permita múltiplas instâncias do backend | Executar clientes conectados a instâncias diferentes; verificar autenticação, fan-out, presença e consistência |
| RNF007 | Dados críticos persistidos em banco | Reiniciar serviços e comprovar contas, sistemas, campanhas, membros, fichas, sessões, mensagens e rolagens preservados |
| RNF008 | Registrar ações administrativas importantes do Mestre | Verificar trilha com ator, recurso, ação, data e resultado; acesso aos registros respeita permissões |

## Propostas de qualidade adicionais

As propostas abaixo ajudam a implementar os requisitos, mas não são novos RNFs aprovados.

- **Acessibilidade:** navegação por teclado, foco visível, rótulos de campos, feedback compreensível e sinalização de estados além de cor.
- **Consistência:** convite, ingresso, capacidade e transição de sessão devem resistir a operações concorrentes.
- **Observabilidade:** logs estruturados, correlação de requisições, métricas e alertas sem conteúdo secreto.
- **Recuperação:** backups verificados e procedimento de restauração documentado.
- **Compatibilidade:** eventos e contratos evoluem sem deixar o cliente conectado em estado incompatível.
- **Resiliência:** falha de Redis não deve apagar dados persistidos; falha de entrega deve ser recuperável pela consulta ao banco.

## Metas a definir — DP09

| Tema | Informação necessária antes de homologar produção |
| --- | --- |
| Capacidade | Usuários simultâneos, sessões ativas, participantes e espectadores por sessão |
| Latência | Limite para respostas HTTP e entrega de chat/eventos; percentis e condições de medição |
| Disponibilidade | Janela de serviço e objetivo de disponibilidade |
| Recuperação | RPO, perda máxima tolerada; RTO, tempo máximo de restauração |
| Limites de uso | Tamanho de mensagens, upload, histórico, páginas e expressões de dados |
| Compatibilidade | Navegadores e versões mínimas; dispositivos de referência |
| Retenção | Prazos para logs, auditoria, mensagens, contas excluídas e backups |

Não há SLA numérico na origem. Valores escolhidos na implementação devem ser documentados e aprovados antes de serem usados como critério de aceitação.

## Evidências de conclusão

Guardar resultado dos testes, configuração relevante sem segredos, ambiente utilizado e limitações conhecidas. A inspeção do código sozinha não comprova responsividade, entrega entre instâncias ou recuperação de backup.

## Referências

[Segurança](11-seguranca.md), [testes](16-testes.md) e [deploy](17-deploy.md).
