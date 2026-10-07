# Verificação 002 — Direção visual

Verificado localmente em 7 de outubro de 2026, Windows, Node.js 26.5.0, Chromium e PostgreSQL de desenvolvimento.

## Entrega

Aplicação da [direção visual](../19-design-system.md) à landing, cadastro/login, dashboard, editor de perfil e perfil público. Paleta escura roxo/ciano, Geist Sans local, arte panorâmica, navegação compacta no desktop e inferior no celular. Contratos da API e persistência permanecem os da primeira etapa.

O anexo visual foi preservado em `docs/referencias/direcao-visual-original.md`. SHA-256 idêntico ao original: `8AB25651F9EAF8B9569E42495DEFB4F0F9EFCCE3EE23BAFA3B21EA4ECA3F78D4`.

## Evidências

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck --workspace @paralax/web` | Passou |
| `npm run build --workspace @paralax/web` | Passou; todas as rotas geradas, perfil público dinâmico |
| `npm run test:e2e` | 4 testes passaram: 2 cenários em desktop e Pixel 7 |
| Cadastro → perfil → avatar → recarga → perfil público → logout → login | Passou com banco real; dados persistidos, e-mail ausente do perfil público |
| Validação e login inválido | Mensagens corretas em ambos os tamanhos |
| Hidratação e erros de página | Sem erros no fluxo E2E e na revisão visual final |
| Fonte no navegador | `GeistSans`, status `loaded`, desktop e celular |
| Skip link | Visível por Tab; oculto após navegação por ponteiro, inclusive nas capturas com scroll |
| Âncora da apresentação | Leva à seção da mesma página em desktop e celular |
| Overflow horizontal | Ausente nas verificações de landing, dashboard e perfil público |
| Contraste de texto nos botões primários | Base 4,63:1; hover 6,13:1; pressionado 5,96:1 |

Capturas inspecionadas de início, cadastro, dashboard, perfil e perfil público em `.artifacts/desktop-*.png` e `.artifacts/mobile-*.png`. A barra móvel é fixa no viewport; o conteúdo reserva espaço para ela. As capturas completas podem mostrar essa barra sobre uma região intermediária da página por causa da composição do screenshot.

A revisão visual adicional usou `.artifacts/visual-review.mjs`, com Chromium, fonte carregada, navegação por teclado/ponteiro e checagem de erros/overflow. Um primeiro critério de scroll exigia alinhar a seção ao topo, além do limite de scroll disponível no desktop; foi corrigido para verificar a visibilidade real da seção e passou. O script e as capturas são artefatos locais ignorados pelo Git.

## Limites

Esta entrega estabelece a identidade visual e atualiza as telas existentes. Campanhas, sessões, sistemas, fichas e exploração continuam futuras, com indicações explícitas de desenvolvimento. Não houve deploy. A revisão de contraste de botões e foco não substitui uma auditoria completa de acessibilidade de todos os futuros módulos.
