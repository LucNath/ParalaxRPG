# Verificação 005 — Campanhas

Verificado em 7 de outubro de 2026, Windows, PostgreSQL local e Chromium desktop/Pixel 7. História: o mestre escolhe uma versão de seu sistema, cria uma campanha, consulta e edita sua configuração, publica a apresentação e mantém as regras originais após novas edições do sistema.

## Entrega

Criação, listagem própria/pública com busca e paginação, detalhe do mestre, edição, estados, capacidade e apresentação pública/privada. Sistema fixado por `SystemVersion.id`. Controle otimista de concorrência e `CampaignChange` transacional. Dashboard com campanhas reais e navegação disponível em desktop/celular. Políticas na [decisão 003](../architecture/decisions/003-campanhas-versionadas.md).

A migration aditiva `20261007180000_campaigns` cria tabelas, enums, índices e constraints sem alterar registros existentes. Aplicada no banco local com `npm run db:migrate`.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| Tipos | `npm run typecheck` passou em API, web e contratos |
| Build | `npm run build` passou em contratos, API e Next.js, incluindo rotas privadas e página pública de campanha |
| Integração com PostgreSQL | `npm run test:api`: 26 passaram, incluindo 8 de campanhas |
| E2E: conta/perfil e sistemas | 6 cenários passaram na regressão desktop/celular |
| E2E: campanhas | Fluxo criação → edição → publicação → privado → conflito → login passou nos dois tamanhos |
| E2E: seletor | Vazio, falha simulada/recuperação, paginação de 21 sistemas e busca sem perder a versão selecionada passaram nos dois tamanhos |
| Autoria | Mestre atribuído pela sessão; cliente não escolhe outro proprietário |
| Elegibilidade | Versão inexistente ou de sistema alheio, mesmo público, rejeitada |
| Privacidade | Terceiro não consulta configuração/regras nem edita; privado retorna 404 e rotas sem sessão retornam 401 |
| Projeção pública | Exclui definição privada, identificador da versão, e-mail, segredos e auditoria |
| Versão fixa | Nome, número e valores originais permanecem após editar sistema e reiniciar API |
| Integridade | Banco impede excluir versão referenciada; valida capacidade e mantém chave de versão |
| Concorrência | Escritas simultâneas produzem um 200 e um 409; somente a vencedora gera revisão/histórico |
| Rascunho | UI preserva edição após conflito e permite recarregar mediante confirmação |
| Estados/histórico | Mudanças de estado/capacidade registradas; histórico por revisão não cria vínculo de jogador |
| Validação | Campos extras, troca de sistema, UUID/enum inválido, capacidade e comprimento fora dos limites rejeitados |
| Persistência | Configuração/regras recuperadas na recarga e após logout/login; verificadas também por consulta SQL |
| Navegador | Sem erros de página no fluxo principal; sem overflow horizontal nas telas verificadas |

O fluxo principal passou primeiro em execução isolada. A regressão completa aprovou os oito cenários de conta/perfil, sistemas e campanhas; os dois casos adicionais do seletor inicialmente tentavam criar fixtures por API com o token anterior a uma renovação. A preparação foi corrigida para navegar por link, mantendo a sessão, e ambos passaram em nova execução direcionada. Não foi alterado o mecanismo de autenticação para acomodar testes.

Capturas de criação, detalhe e página pública em `.artifacts/{desktop,mobile}-campanha-{nova,detalhe,publica}.png` foram inspecionadas. A barra fixa pode aparecer no meio do screenshot completo por composição de captura. Contas sintéticas e seus próprios sistemas/campanhas/histórico são removidos ao final. Os testes locais guardam o destino do banco e não usam Neon.

## Limites

Exclusão, transferência de mestre, sistemas de terceiros, troca/migração de sistema, imagens próprias, campanhas não listadas, membros, convites, personagens e sessões continuam futuros. A capacidade ainda não indica ocupação: não há jogadores cadastrados nesta etapa. O catálogo da interface exige login; apresentação pública por link e API pública dispensam sessão.

Não há autosave, tela de auditoria ou restauração. Avisos de rascunho cobrem recarregar/fechar e cliques em links, mas ainda não histórico do navegador ou logout. Tornar privado impede novas leituras públicas, sem recolher conteúdo já recebido.
