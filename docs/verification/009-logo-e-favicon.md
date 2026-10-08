# Verificação 009 — Logo e favicon

Entrega de 8 de outubro de 2026. Usuário pediu uma logo própria após identificar a bússola provisória no painel e o globo na aba. Nova identidade: portal P roxo/ciano, logo completa, variantes clara/escura/monocromática e ícones de navegador/Apple. [Arquivos e prompt](../design/logo-paralax.md).

## Implementação

Brand compartilha os mesmos SVGs na landing, login, cadastro e páginas públicas; modo compacto usa o símbolo na barra. Card de boas-vindas usa BrandMark. Paths de lettering não dependem de fontes externas. Imagens têm dimensões reservadas, alt decorativo e nome acessível no link. Os ícones são registrados pelas convenções favicon.ico/icon.svg/apple-icon.png do Next.js instalado. Nenhuma mudança na API, no banco ou nas regras de acesso.

## Evidências locais

- Exportação reproduzível de SVGs/PNGs/ICO/Apple passou sem dependências novas.
- PNGs das logos têm alpha: marca 512 × 512; completa 1152 × 256; Apple 180 × 180.
- Prévia com fundos claro/escuro e favicon em 64/48/32/16 px inspecionada.
- Build web passou, com icon.svg e apple-icon.png no conjunto de rotas.
- Chromium: landing, entrada, cadastro e Ao vivo conferidos em 1440 px, Pixel 7 e 320 px. Logos carregadas, sem overflow horizontal; favicon ICO, ícone SVG e Apple declarados no head. Assets responderam 200 com MIME correto; ICO confirmou 16/32/48 px e Apple 180 × 180.
- Autenticação/perfil: 4 testes E2E passaram após a integração final, incluindo cadastro, perfil, upload, recarga, perfil público, logout, login e validações, em desktop/celular. Contas e avatares sintéticos removidos pelos testes.
- Logo completa aparece no cabeçalho móvel de entrada/cadastro. Em 320 px o cabeçalho público reduz a logo e os espaços para preservar Entrar/Criar conta. Capturas inspecionadas em `.artifacts/local-320-logo-inicio.png`, `.artifacts/mobile-cadastro.png` e `.artifacts/desktop-dashboard.png`.

O servidor web padrão estava ocupado por outro projeto. As conferências finais locais usaram localhost:3002 e WEB_ORIGIN correspondente no processo da API, sem alterar arquivos de ambiente ou interromper o outro aplicativo.

Publicação online será registrada após concluir.
