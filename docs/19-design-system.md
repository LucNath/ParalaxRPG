# 19 — Design system

## Sessões atuais

SessionList/SessionEditor usam cards com badge textual, título, campanha, data/fuso e descrição. Detalhe mostra estado e datas reais; mestre vê ações pertinentes. Formulário empilha no celular e trata horário inválido, erros, conflito e descarte. Público reutiliza tema/arte existente, sem contagem inventada de espectadores. Preparação, pausa, mesa e chat nas diretrizes abaixo permanecem futuros.

## Direção adotada

Fonte: [direção visual original do usuário](referencias/direcao-visual-original.md), preservada integralmente. Complementa a [interface funcional](13-interface.md).

Fantasia moderna, sóbria e premium. A arte pertence ao conteúdo; navegação e formulários usam superfícies neutras, tipografia legível e bordas discretas. Sem pergaminho, couro ou dourado como identidade global.

Princípio fornecido: “A plataforma deve desaparecer durante o jogo. O conteúdo da campanha deve ser o protagonista.”

## Tokens de implementação

Fonte executável: `apps/web/src/app/globals.css`, seção `:root`. CSS compartilhado por todas as telas.

| Uso | Token | Valor |
| --- | --- | --- |
| Fundo | `--bg` | `#0D0F14` |
| Superfície secundária | `--surface-soft` | `#141821` |
| Cards | `--surface` | `#1B202B` |
| Hover de superfície | `--surface-hover` | `#232A37` |
| Borda | `--border` | `#29303D` |
| Texto | `--text` | `#F2F4F7` |
| Texto secundário | `--muted` | `#A7B0BF` |
| Conteúdo indisponível | `--disabled` | `#677182` |
| Ação primária | `--accent` | `#7C5CFC` |
| Hover primário | `--accent-hover` | `#9278FF` |
| Pressionado primário | `--accent-pressed` | `#6847DC` |
| Texto de link/seleção | `--accent-text` | `#BBA9FF` |
| Botão desabilitado | `--button-disabled` | `#393E4A` |
| Detalhe secundário | `--mint` | `#3DD6C6` |
| Sucesso | `--success` | `#3CCB7F` |
| Aviso | `--warning` | `#F0B44D` |
| Erro | `--error` | `#EF5B63` |
| Sessão ao vivo | `--live` | `#FF4057` |
| Raio de card | `--radius-card` | `12px` |
| Raio de controle | `--radius-control` | `8px` |

O tom claro `--accent-text` é um detalhamento de implementação para legibilidade de links pequenos sobre fundos escuros. Botões primários usam texto escuro `#050608` no roxo-base/hover e branco no pressionado, para manter contraste de texto acima de 4,5:1 nesses estados. O roxo-base se concentra em ações, seleção e foco; não colore todas as áreas. Sucesso/erro incluem texto, além da cor. Vermelho ao vivo é reservado à transmissão quando implementada.

Geist Sans é servido localmente pelo pacote `geist` e `next/font`, sem requisições a fontes externas em tempo de execução. UI, formulários e conteúdo usam a mesma família, incluindo sistemas. Cinzel fica reservado, conforme a origem, a títulos específicos de campanha/sistema; essa fonte ainda não foi adicionada. Ícones de interface usam Lucide em 14–25px. A marca própria usa um portal P em SVG e lettering desenhado em paths, substituindo a bússola provisória. [Kit de logos e favicon](design/logo-paralax.md).

Escala: texto de formulário 13px, labels 12px, corpo 13–14px, título de card 14–21px, página 30–34px, hero 36–64px. Espaçamento predominante 8/12/16/20/24/28/32px; o conteúdo mantém largura limitada em telas grandes.

## Telas já implementadas

| Tela | Aplicação desta direção |
| --- | --- |
| Início | Arte panorâmica, headline fornecida, cadastro e apresentação da plataforma; cartões de identidade/criação/conexão distinguem disponibilidade |
| Cadastro e login | Arte lateral no desktop; formulário com foco, validação, envio e mensagem de erro; formulário prioritário no celular |
| Dashboard | Identidade, primeiros passos, campanhas reais e convites recebidos; próximas sessões reais com estado e fuso, sem contadores inventados |
| Perfil | Editor, avatar, feedback de salvamento, link público e dados privados separados |
| Perfil público | Banner padrão, avatar, nome, username, biografia, localização e data de entrada; sem atribuir papéis ou estatísticas inexistentes |
| Sistemas | Cards com observatório astral, busca, abas meus/públicos, visibilidade e versão; estados de carregamento, vazio e erro |
| Editor de sistemas | Categorias laterais, campos ordenáveis, salvamento explícito e prévia; categorias e conteúdo empilhados no celular |
| Sistema público | Banner astral, autor, descrição, visibilidade, versão e definição da ficha |
| Campanhas | Cards com arte existente, busca e abas próprias/públicas; mestre, estado e versão do sistema |
| Editor de campanhas | Apresentação/configuração e seleção de sistema em dois painéis; conteúdo empilhado no celular; feedback e proteção de rascunho |
| Campanha pública | Banner, apresentação, mestre, estado, capacidade e nome/versão do sistema; sem definição privada |
| Campanha privada | Papel do usuário, regras fixas, lista de membros e ocupação; formulário de convite e remoção/revogação só para o mestre |
| Convites | Cards com mestre, campanha, status e validade; aceitar/recusar, erros de lotação e histórico paginado |

No desktop, navegação global de 96px com ícone e rótulo. Início, Sistemas, Campanhas, Convites e Perfil são links reais; Personagens, Sessões e Ao vivo são links reais. No celular, barra inferior com Início, Sistemas, Campanhas, Convites, Perfil e saída; itens futuros são omitidos. Fichas e sessões são acessíveis pelos cards do dashboard e pela campanha, mantendo os seis controles da barra dentro de 320 px. O cabeçalho oferece breadcrumbs e acesso ao perfil público. Configurações terá entrada própria quando houver funcionalidade correspondente.

“Conhecer campanhas” na landing leva à listagem implementada no painel; leitura de apresentações públicas por link dispensa login. “Conhecer a Paralax” continua levando à apresentação na mesma página. Convites usam o painel autenticado; personagens/fichas têm leitura privada e edição pelo dono ativo/mestre; sessões oferecem agenda/estado; Ao vivo agora no rodapé abre apresentação pública sem login.

## Base de componentes

Já disponíveis: `Brand`, `Avatar`, `Badge` (neutro, destaque, sucesso), `EmptyState`, `WorkspaceShell`, `AuthForm`, `SystemEditor`, `SystemPreview` e padrões CSS compartilhados para Button, Input, Textarea, Select, Checkbox, cards, feedback e foco. `Badge` e `EmptyState` ficam em `apps/web/src/components/ui`.

| Padrão | Regras |
| --- | --- |
| Button | Primário para próxima ação; secundário para alternativa; hover, pressionado, foco e desabilitado explícitos |
| Input/Textarea | Label permanente, hint/erro associado, borda/foco claros; placeholder não substitui label |
| Card | Raio 12px, borda sutil, fundo neutro; títulos e ações consistentes |
| Badge | Estado textual curto; não fingir interação |
| Avatar | Imagem normalizada no servidor, fallback de iniciais |
| EmptyState | Ícone, título e explicação; ação apenas quando puder ser executada |
| Feedback | Status de sucesso e alert de erro anunciados por leitores de tela |
| Navegação | Link semântico, `aria-current`, foco visível, saída como botão |

A próxima expansão adicionará Switch, Tabs genéricos, Dropdown, Modal/Dialog, Tooltip acessível, Toast, CommandMenu, ContextMenu e Skeleton conforme surgirem fluxos reais. Cards de sistema e barras de recurso já têm implementação nas telas atuais, ainda sem componentes genéricos próprios. Componentes futuros de RPG: CampaignCard genérico, DiceRollMessage, InitiativeTracker, MapToolbar e PermissionBadge. O catálogo é planejamento; componentes não implementados não devem ser tratados como disponíveis.

Fichas atuais mostram identidade/história e seções de atributos, perícias e recursos da versão fixa, sem campos de regras adicionais. Cards de personagens usam dados persistidos, com vazio, busca, paginação e recuperação. Números reais aparecem na leitura; padrões pertencem apenas à criação.

## Padrões das próximas telas

| Área | Direção fornecida e comportamento esperado |
| --- | --- |
| Explorar | Campanhas e transmissões com arte, filtros pertinentes, texto de estado vazio e dados reais |
| CampaignCard | Arte dominante; gênero, vagas/recrutamento e Mestre; entrada acessível por teclado e toque, além do hover |
| Sessão pública | Badge “AO VIVO” em `--live`, título, campanha e quantidade real de espectadores; sem compartilhar a cor com erros |
| Campanha | Banner e navegação interna contextual; Mestre identificado discretamente; permissões respeitadas pelo servidor |
| Editor de sistemas | Categorias laterais, campos organizados, prévia, estados “Salvando…”/“Salvo” e versão; implementação atual usa salvamento explícito, autosave futuro exige confirmação de persistência |
| Editor de fichas | Componentes e preview, ordenação por arrastar e alternativa por teclado; atributos, listas, recursos e fórmulas seguem a definição do sistema |
| Sessão | Modo próprio: mapa central no MVP 2, participantes à esquerda, chat à direita, ferramentas inferiores; no MVP 1 a área principal usa fichas/participantes |
| Ferramentas do Mestre | Ações essenciais visíveis, sem esconder controles importantes em menus profundos; painéis contextuais e permissões por campanha |
| Perfil completo | Abas de campanhas/sistemas/personagens/estatísticas quando houver dados; papéis vêm de vínculos reais |
| Temas | Dark global primeiro; personalização futura limitada ao conteúdo da campanha, preservando navegação e legibilidade |

Estas diretrizes de apresentação não antecipam módulos do roadmap, como mapas e combate. Convites e próximas sessões já mostram dados persistidos. Jogar, chat e contagem de espectadores entram quando seus fluxos existirem.

## Acessibilidade e verificação

Labels e erros associados, skip link, foco visível, controles semânticos e preferência por movimento reduzido. Ações não dependem só de cor ou hover. A navegação inferior reserva espaço no conteúdo para não encobrir ações. Layouts são verificados em desktop e celular, incluindo nomes e biografias reais; conteúdo do usuário pode quebrar linha.

Os fluxos existentes de cadastro → perfil → avatar → recarga → perfil público → logout → login continuam cobertos por Playwright. Criação, ordenação, salvamento, recarga, publicação e conflito de sistemas também têm cobertura desktop/celular. As capturas locais ficam em `.artifacts`, ignoradas pelo Git. Critérios visuais: tipografia carregada, ausência de overflow horizontal e controles/feedback visíveis.

## Arte e proveniência

A [coleção de artes complementares](design/artes-do-site.md) adiciona uma floresta luminosa, um observatório astral e uma cidade suspensa aos três cards da página inicial. Originais, versões WebP e prompts completos estão documentados junto da coleção.

Arte criada usando a skill **imagegen**, no modo **ferramenta integrada**, categoria `stylized-concept`. Arquivo original no projeto: `apps/web/public/art/paralax-world.png`. Versão consumida: `apps/web/public/art/paralax-world.webp`, 1672 × 941px, aproximadamente 159 KiB. WebP é apenas conversão de formato com qualidade 82, mantendo a composição. A landing usa `next/image`; auth e banner usam a mesma arte decorativa. Não representa uma campanha disponível.

Prompt final de geração:

```text
Use case: stylized-concept
Asset type: wide landscape artwork for the landing page of Paralax RPG, a modern fantasy role-playing platform.
Primary request: an atmospheric and premium modern fantasy world, mysterious and inviting, with luminous violet and cyan accents.
Scene/backdrop: a vast dark mountain valley with floating angular rock formations, an immense glowing violet circular portal on a distant ridge, a thin cyan river winding through the valley, mist and a deep starry sky.
Style/medium: cinematic digital concept art with painterly detail and elegant restrained lighting.
Composition/framing: wide 16:9 landscape, strong depth, focal portal on the right half; the left third is mostly dark sky and low contrast terrain so white website text can remain readable.
Lighting/mood: quiet wonder, dramatic scale, dark charcoal shadows, subtle volumetric light.
Color palette: charcoal #0D0F14 and slate blue, violet #7C5CFC, teal #3DD6C6; no gold.
Constraints: artwork only; no text, UI, logos, watermark, people, leather, parchment, ornate medieval frames or generic castle.
```

Referências técnicas de fontes: [pacote oficial Geist](https://github.com/vercel/geist-font) e [Next.js Fonts](https://nextjs.org/docs/app/getting-started/fonts).
