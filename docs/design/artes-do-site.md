# Artes complementares do site

Três artes novas criadas com **imagegen, ferramenta integrada**, usando a arte original `paralax-world.png` como referência de estilo. São cenas novas de fantasia moderna, com sombras carvão, iluminação violeta/ciano e escala cinematográfica.

## Arquivos e aplicação

| Arte | Original | Versão usada no site | Dimensões | WebP | Card |
| --- | --- | --- | --- | --- | --- |
| Floresta luminosa | [PNG](../../apps/web/public/art/luminous-forest.png) | [WebP](../../apps/web/public/art/luminous-forest.webp) | 1671 × 941 | 259 KiB | Identidade — Deixe sua marca |
| Observatório astral | [PNG](../../apps/web/public/art/astral-observatory.png) | [WebP](../../apps/web/public/art/astral-observatory.webp) | 1672 × 941 | 255 KiB | Criação — Imagine sem limites |
| Cidade suspensa | [PNG](../../apps/web/public/art/floating-city.png) | [WebP](../../apps/web/public/art/floating-city.webp) | 1672 × 941 | 211 KiB | Conexão — Encontre sua mesa |

Os PNGs ficam preservados no projeto. A conversão WebP usa qualidade 82 e mantém a composição. O site serve as imagens com `next/image`, tamanhos responsivos e carregamento lazy nos cards. Proporção reservada de 16:9 evita deslocamento do conteúdo durante o carregamento. A imagem principal da landing continua a original.

As artes dos cards são decorativas (`alt=""`); títulos, descrição, disponibilidade e ações continuam em HTML. A apresentação não representa campanhas reais nem altera a disponibilidade dos módulos.

## Prompts e proveniência

Os **três prompts finais completos**, o modo de geração, a referência de estilo, caminhos e metadados estão no [manifesto das artes](artwork-manifest.json). Categoria de geração: `stylized-concept`. Nenhum original anterior foi substituído.

## Verificação

- Tipos do frontend e build de produção verificados.
- Revisão visual em Chromium, desktop 1440 × 1000 e Pixel 7.
- As três imagens carregaram e foram inspecionadas na página; sem overflow horizontal ou erros de hidratação na revisão.
- Capturas locais em `.artifacts/desktop-inicio.png` e `.artifacts/mobile-inicio.png`, ignoradas pelo Git.

Os fluxos de autenticação e perfil não foram alterados. Esta mudança adiciona imagens à página inicial.
