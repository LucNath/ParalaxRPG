# Logo Paralax RPG

Criada em 8 de outubro de 2026. A marca usa um P angular, um portal em duas camadas e um núcleo ciano. Substitui a bússola provisória da navegação e do card de boas-vindas. O nome PARALAX e a assinatura RPG têm letras desenhadas em paths: os arquivos vetoriais não dependem de fonte instalada.

## Arquivos finais

Fontes de produção em [apps/web/public/brand](../../apps/web/public/brand), também servidas por /brand/ no site:

| Uso | SVG | PNG |
| --- | --- | --- |
| Logo completa sobre fundo escuro | [paralax-logo.svg](../../apps/web/public/brand/paralax-logo.svg) | [1152 × 256](../../apps/web/public/brand/paralax-logo.png) |
| Logo completa sobre fundo claro | [paralax-logo-light.svg](../../apps/web/public/brand/paralax-logo-light.svg) | [1152 × 256](../../apps/web/public/brand/paralax-logo-light.png) |
| Logo monocromática clara | [paralax-logo-mono.svg](../../apps/web/public/brand/paralax-logo-mono.svg) | [1152 × 256](../../apps/web/public/brand/paralax-logo-mono.png) |
| Símbolo colorido | [paralax-mark.svg](../../apps/web/public/brand/paralax-mark.svg) | [512 × 512](../../apps/web/public/brand/paralax-mark.png) |
| Símbolo monocromático claro | [paralax-mark-mono.svg](../../apps/web/public/brand/paralax-mark-mono.svg) | [512 × 512](../../apps/web/public/brand/paralax-mark-mono.png) |

SVG e PNG das logos têm fundo transparente. Não esticar nem cortar margens; usar a versão adequada ao fundo. A paleta é #7C5CFC, #BBA9FF e #3DD6C6; texto da versão escura #F2F4F7 e texto da clara #141821, com assinatura #6847DC.

O pacote inclui [favicon.ico](../../apps/web/public/brand/favicon.ico) com 16/32/48 px e [apple-touch-icon.png](../../apps/web/public/brand/apple-touch-icon.png) com 180 px. O ícone de aplicativo usa fundo #0D0F14 com cantos arredondados. Next.js registra automaticamente [favicon.ico](../../apps/web/src/app/favicon.ico), [icon.svg](../../apps/web/src/app/icon.svg) e [apple-icon.png](../../apps/web/src/app/apple-icon.png) pela convenção de arquivos do App Router.

[Brand/BrandMark](../../apps/web/src/components/brand.tsx) aplica a identidade com dimensões reservadas e nome acessível no link. Landing/login/cadastro/páginas públicas usam logo completa; a barra do painel usa símbolo compacto; o card de boas-vindas usa o mesmo símbolo. A navegação inferior móvel conserva seus seis controles.

## Geração e fontes

Exploração feita com **imagegen, ferramenta integrada**, categoria logo-brand, fundo transparente, sem uso de chave API ou CLI fallback. O [PNG original](brand/paralax-concept.png) foi copiado ao projeto, preservando o arquivo gerado. O conceito foi reconstruído em SVG nativo para bordas limpas, cores sólidas e exportação reproduzível. A palavra PARALAX tem sete letras; RPG é assinatura secundária.

Prompt completo usado na ferramenta:

```text
Use case: logo-brand. Asset type: final symbol mark for the website Paralax RPG, a modern fantasy platform for custom roleplaying systems and campaigns. Create one original, professional, flat geometric emblem: an angular dimensional portal formed by two slightly offset bold polygonal frames, with a clever subtle letter P suggested by the negative space. The geometry should lightly evoke the facets of a roleplaying die without numerals or a literal detailed die. Strong recognizable compact silhouette, open negative space, only 2 or 3 thick simple shapes, elegant and restrained, legible as a 24px app icon. Palette: bright violet #7C5CFC, lighter violet #BBA9FF and a restrained cyan #3DD6C6 accent. Transparent background, no enclosing square, emblem centered with modest safe padding. Clean crisp vector-like edges and solid colors. No text, no wordmark, no compass, no stock icon, no dragon, no medieval ornament, no gold, no gradients, no glow, no shadows, no textures, no 3D render, no mockup, no presentation sheet, no watermark. Output only the single standalone finished mark, intended to be the new identity of Paralax RPG.
```

Para reconstruir variantes e ícones a partir dos dois SVGs fonte, execute `node scripts/build-brand-assets.mjs` na raiz. Sharp, já instalado no projeto, exporta PNGs com alpha, variantes de cor e o ICO com três tamanhos. O processo não chama serviços externos. Não há dependências novas.

Evidências de navegador, build e publicação ficam na [verificação 009](../verification/009-logo-e-favicon.md).
