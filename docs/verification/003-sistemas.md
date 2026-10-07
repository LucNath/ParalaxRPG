# Verificação 003 — Sistemas de RPG

Verificado localmente em 7 de outubro de 2026, Windows, Node.js 26.5.0, PostgreSQL de desenvolvimento e Chromium em desktop/Pixel 7.

## Entrega

Criação e edição de sistemas com nome, descrição, atributos, perícias, recursos e dados. Prévia da ficha, ordenação por botões, salvamento explícito, versões imutáveis e visibilidade privada/não listada/pública. Catálogo com busca/paginação, área dos sistemas do titular e página de leitura pública. A identidade visual existente foi aplicada às novas telas.

A migration aditiva `20261007150000_systems` foi aplicada com `npm run db:migrate`, preservando o banco de contas/perfis. A [decisão 002](../architecture/decisions/002-sistemas-versionados.md) registra as políticas adotadas.

## Evidências

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Passou em API, web e contratos |
| `npm run build` | Passou em contratos, NestJS e Next.js, incluindo novas rotas |
| `npm run test:api` | 18 passaram: 11 de conta/perfil e 7 de sistemas, com banco real |
| `npm run test:e2e` | 6 passaram: fluxos de conta/perfil, validação e sistemas em desktop e celular |
| Regressão final `npm run test:e2e -- tests/e2e/systems.spec.ts` | 2 passaram após ampliar o caso de conflito para edição local posterior |
| Autoria e autorização | Usuário não consulta/edita sistema alheio privado; autoria não pode ser escolhida no payload; sessão obrigatória nas rotas privadas |
| Validação e integridade | Rejeitados campos desconhecidos, IDs/nomes duplicados, referências cruzadas, máximo inconsistente, dados inválidos e limites excedidos; entradas inválidas não criam registros |
| Persistência e versões | Valores e vínculos sobrevivem a recarga e reinício da API; snapshots anteriores permanecem intactos |
| Concorrência | Duas gravações com a mesma revisão produzem uma confirmação e um 409; a UI mantém rascunho e acesso à recuperação mesmo após novas edições locais |
| Publicação | Público aparece na busca; não listado sai da busca e mantém leitura por link; privado passa a retornar 404 na consulta pública |
| Privacidade de autoria | Projeção pública não expõe e-mail, senha ou credenciais |
| Paginação | 21 sistemas produzem páginas de 20 e 1; filtros de autor/visibilidade preservados |
| Independência de regras | Permitidos sistema sem dados e recurso sem máximo; nenhum campo fixo imposto |
| Interface | Adição, ordenação, vínculo de perícia, recurso, dado personalizado, prévia, criação, edição e recarga funcionam em ambos os tamanhos |
| Erros de página/hidratação | Ausentes no fluxo verificado |
| Overflow horizontal | Ausente no editor e na página pública em desktop/celular |

Capturas do editor, catálogo e página pública foram inspecionadas em `.artifacts/desktop-sistema-editor.png`, `mobile-sistema-editor.png`, `desktop-sistemas.png` e `mobile-sistema-publico.png`. A barra móvel fixa pode aparecer em uma região intermediária da captura completa por causa da composição do screenshot.

O primeiro teste do conflito encontrou dois elementos com `role=alert`, incluindo o anunciador de rotas do Next.js; o seletor foi restringido ao conteúdo principal e a suíte passou. A revisão também identificou que digitar após um conflito ocultava o botão de recuperação; o feedback agora permanece disponível, com regressão nos dois tamanhos.

Os testes criam usuários sintéticos e removem apenas seus registros ao terminar. Sistemas e versões desses usuários são removidos por suas relações no banco. Contas existentes não são usadas para os testes.

## Limites

Campanhas, personagens persistidos e sessões ainda não existem. A prévia é uma representação da definição. Não há autosave, fórmulas, drag and drop, exclusão, histórico/restauração, cópia ou política de licença/reutilização por terceiros. O catálogo da interface fica no painel autenticado; a API pública e a página de detalhe dispensam login.

Avisos de alterações pendentes cobrem fechar/recarregar e seguir links, mas ainda não o histórico do navegador ou saída da conta. Tornar privado impede novas leituras públicas, sem recolher conteúdo já recebido. Não houve deploy nem envio ao GitHub nesta entrega.
