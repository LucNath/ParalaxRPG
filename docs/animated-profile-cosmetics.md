# Visuais animados do perfil

Implementação: duas paisagens e duas bordas, somadas aos quatro itens estáticos. Paisagens geradas com a ferramenta integrada image_gen; bordas vetoriais criadas no sistema SVG do projeto. Originais PNG preservados em apps/web/public/art; o site usa WebP de 1600 × 533. Não são arquivos GIF: o navegador anima a arte com CSS (névoa, partículas, aproximação suave e órbita das bordas), preservando uma imagem estática leve.

| Item | Paleta | Conquista |
| --- | --- | --- |
| Santuário de jade | Verde, turquesa e ciano | Primeiro personagem |
| Cidadela das brasas | Vermelho, cobre e dourado | Primeira mesa |
| Órbita de jade | Verde e turquesa | Uma identidade na Paralax |
| Coroa das brasas | Âmbar, vermelho e dourado | Primeiros dados |

Perfil → Personalizar perfil: escolher fundo e borda, conferir prévia e salvar. As miniaturas ficam estáticas; somente o visual equipado ou em prévia recebe movimento. O visitante pode pausar e retomar todas as animações pelo botão sobre a capa; a pausa é local àquela visualização. A preferência do sistema por movimento reduzido desativa animações, inclusive antes da hidratação. Imagens indisponíveis usam os padrões existentes. Sem flashes ou som.

Cada conquista agora concede dois itens na transação da ação real. A migration 20261008050000_animated_cosmetics amplia as restrições de catálogo/categoria e concede os novos prêmios a conquistas existentes com a data original. Não muda escolhas equipadas. A liberação administrativa permanente cobre automaticamente os oito itens e futuras expansões, sem marcar conquistas como obtidas.

## Arquivos e prompts

- apps/web/public/art/jade-sanctuary.png e jade-sanctuary.webp
- apps/web/public/art/ember-citadel.png e ember-citadel.webp
- apps/web/public/cosmetics/jade-orbit.svg
- apps/web/public/cosmetics/ember-crown.svg

Modo de geração: ferramenta integrada, uma chamada por paisagem, sem imagens de referência.

### Santuário de jade

Use case: stylized-concept. Asset type: premium RPG public-profile cover artwork, wide landscape 3:1 composition. Primary request: an enchanting emerald and turquoise sanctuary at night: ancient moss-covered stone arch above a luminous lake, graceful waterfalls, bioluminescent plants, distant misty mountains and delicate aurora across the sky. Cinematic hand-painted fantasy concept art with refined realistic details, rich depth, dark forest greens and jade with restrained cyan light, luminous atmosphere without neon overload. No characters, no text, no logos, no borders, no UI. Architectural focal point slightly right of center; lower left quiet and darker for an overlapping profile avatar; crucial landscape features around central horizontal third so a wide banner crop remains beautiful. This is the static base artwork for gentle animated mist and drifting motes implemented in the website. Generate one polished landscape image.

### Cidadela das brasas

Use case: stylized-concept. Asset type: premium RPG profile banner artwork, landscape aspect ratio 3:1. Primary request: majestic dark basalt citadel on a volcanic island, red-orange molten rivers below, warm gold sun eclipsed by a black moon, amber clouds and fine floating embers, jagged distant peaks. Beautiful cinematic painterly fantasy concept art, dramatic scale with elegant architecture, charcoal and deep burgundy shadows, restrained copper and gold highlights. No people, lettering, logos, border or UI. Compose fortress slightly right of center; quiet darker lower left for overlapping avatar; horizon and fortress around central horizontal third for a wide cover crop. Static base for website animated glowing haze and rising embers. One polished landscape.

## Verificação

Testes de integração verificam recompensas múltiplas, bloqueios de propriedade/categoria, retroatividade idempotente, preservação dos itens e datas anteriores e liberação administrativa. Testes de navegador exercitam seleção → gravação → banco → perfil público, carregamento de ambas as paletas, avanço efetivo das animações, pausa/retomada, alteração de movimento reduzido, falhas de imagem e largura de 320 px.

