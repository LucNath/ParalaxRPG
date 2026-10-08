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

## Publicação e conferência online

- Código publicado: `bb93526d41854818f50f42c69ae2b48b4eb489e3`.
- Web: `dpl_GxeGA72yxqmLH8tTA9uJi1jHSBdc`, READY; build remoto com tipos passou em 32 s.
- URL canônica: [paralax-rpg-web.vercel.app](https://paralax-rpg-web.vercel.app). Deployment: [paralax-rpg-nj4aos0iv-lucky-8804ce74.vercel.app](https://paralax-rpg-nj4aos0iv-lucky-8804ce74.vercel.app).
- Só a web foi republicada, no projeto `paralax-rpg-web` da equipe `lucky-8804ce74`; API e banco não precisaram de publicação ou migration.
- Conferência anônima online repetiu as quatro páginas em desktop/Pixel 7/320 px, incluindo MIME, metadados e arquivos dos ícones. Logos carregadas, sem overflow nem erros JavaScript.
- Cadastro real → dashboard → recarga → logout → link da logo passou em desktop e celular. Marca compacta e card conferidos no desktop; cabeçalho de cadastro/entrada no celular. Os seis controles da navegação inferior continuam acessíveis.
- Contas sintéticas online removidas por ID/e-mail/username exatos e ausência confirmada no Neon; nenhum avatar foi criado. Screenshots online em `.artifacts/online-desktop-logo-dashboard.png`, `.artifacts/online-mobile-logo-dashboard.png` e `.artifacts/online-mobile-logo-cadastro.png`.
- Logs do deployment web, consultados após os testes com filtros `error` e HTTP 500, não retornaram registros na janela de 1 h. Isso descreve a janela conferida, não um monitoramento contínuo.

No Windows, requisições Node usaram `NODE_USE_SYSTEM_CA=1` para certificados locais, mantendo a verificação TLS. A fonte da marca, as exportações, o conceito original e os registros de implementação ficam no Git; arquivos de ambiente e evidências locais continuam ignorados.
