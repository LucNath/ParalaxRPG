# 20 — Conquistas e personalização do perfil

Solicitação do usuário em 8 de outubro de 2026. Status: recorte estático e expansão animada implementados, conforme a [decisão 008](architecture/decisions/008-conquistas-e-cosmeticos.md). Há quatro conquistas por marcos de uso, coleção privada, prévia e seleção de fundo/borda no perfil público. Duas paisagens e duas bordas animadas ampliam o catálogo para oito itens: [artes e recompensas](animated-profile-cosmetics.md). Marcos de sessões permanecem futuros. Evidências na [verificação 011](verification/011-conquistas-e-cosmeticos.md). O desenho inicial abaixo registra também as extensões propostas, sem afirmar que já estão disponíveis.

## Experiência solicitada

Conquistas desbloqueiam itens visuais para o perfil público. O usuário escolhe quais usar entre os que possui. Os itens incluem fundos estáticos, fundos animados e bordas de avatar estáticas ou animadas. As artes serão produzidas para o Paralax; a referência é o perfil existente com paisagem de fantasia roxa/ciano.

Recorte proposto: o primeiro fundo personalizável ocupa o banner superior mostrado na referência. Fundo de toda a página pode ser uma categoria posterior. A paisagem atual permanece disponível como visual padrão para contas existentes e novas; nenhum usuário precisa obter uma conquista para manter sua aparência atual. Personalização é cosmética e não altera regras, atributos ou resultados das mesas.

## Fluxo do usuário

1. Abrir **Perfil → Conquistas** para ver nome, descrição, condição e progresso das conquistas.
2. Ao cumprir a condição, receber a conquista e seus cosméticos uma única vez.
3. Abrir **Perfil → Personalizar → Fundos / Bordas**. Itens bloqueados mostram uma prévia e a conquista necessária; itens obtidos podem ser experimentados.
4. Visualizar o próprio perfil antes de salvar. Equipar um fundo e uma borda, ou voltar ao padrão/sem borda.
5. Abrir o perfil público para ver a composição salva. A escolha permanece após logout e recarga.

A conquista pertence à conta do usuário, independentemente do personagem usado. Uma conquista pode conceder mais de um item; um mesmo item pode ter mais de uma forma de obtenção. Ao desbloquear, a seleção atual não muda automaticamente.

## Primeiro catálogo — exemplos a definir

| Conquista sugerida | Marco sugerido | Recompensa sugerida |
| --- | --- | --- |
| Uma identidade na Paralax | Salvar uma apresentação e um avatar | Borda estática de portal violeta |
| Primeiro personagem | Criar a primeira ficha válida | Fundo estático de refúgio do aventureiro |
| Primeira mesa | Criar a primeira campanha | Fundo estático de cidadela flutuante |
| Primeiros dados | Registrar a primeira rolagem válida | Borda estática com detalhes de dados |
| Além do portal | Marco de participação a definir | Fundo com portal animado |
| Histórias compartilhadas | Marco de sessões concluídas a definir | Borda animada com runas |

As quatro primeiras condições foram adotadas na decisão 008: biografia/avatar, criação de ficha, criação de campanha e primeira rolagem válida. Não há classificação de raridade. As duas condições adicionais continuam propostas; os itens animados atuais são concedidos pelos quatro marcos existentes. Feitos como vitória, crítico ou conclusão de aventura dependem de regras do sistema e evidências que o produto ainda não registra. Um d20 máximo não significa crítico em todo sistema de RPG.

Para contar sessões concluídas, definir primeiro o que comprova participação: estar na campanha no encerramento, entrar efetivamente na sessão ou ter ações válidas são critérios diferentes. Não inferir presença de um membro só porque ele recebeu convite. Limiares e prevenção de sessões artificiais precisam ser definidos antes de liberar recompensas por contagem.

## Integração com o projeto atual

Antes deste incremento, `Profile` salvava apresentação, localização e chave do avatar, e o banner público era fixo. Agora há referências a fundo/borda obtidos pela própria conta, e `PublicProfile` entrega os metadados equipados. O banner original (`/art/paralax-world.webp`) é o padrão.

Modelo conceitual proposto para expansão. O recorte adotado usa catálogo em código e apenas UserAchievement/UserCosmetic, com referências no Profile; não há eventos ou definições de catálogo em tabelas neste incremento.

| Entidade | Responsabilidade e integridade |
| --- | --- |
| AchievementDefinition | Código estável, nome, descrição, regra e versão, marco alvo; catálogo mantido pelo projeto |
| CosmeticDefinition | Código estável, categoria BACKGROUND/AVATAR_FRAME, imagem/loop, prévia, alternativa estática e posição do recorte |
| AchievementReward | Liga conquistas aos cosméticos concedidos; combinação única |
| UserAchievement | Conta, conquista, data e versão da regra cumprida; combinação única conta/conquista |
| UserCosmetic | Conta, cosmético, data de obtenção; combinação única conta/cosmético |
| AchievementEvent | Evidência de evento e chave de origem para deduplicação; progresso privado, separado da apresentação pública |
| Profile | Referências opcionais ao fundo e à borda equipados; valores nulos representam o visual padrão |

Desbloqueio calculado no servidor a partir de ações confirmadas no banco. Registro da conquista e concessão dos itens devem ser atômicos. Repetir eventos, requisições ou processar ações concorrentes não pode multiplicar progresso nem recompensas. Exclusão de uma ficha/campanha não retira automaticamente itens já obtidos; registrar a evidência necessária sem copiar conteúdo privado da mesa. Retroatividade exige uma regra por conquista: o estado atual permite comprovar algumas ações, mas não reconstruir toda a participação histórica.

Aplicar cosmético valida no servidor a propriedade e a categoria. O cliente envia IDs do catálogo, sem poder conceder conquistas, registrar progresso ou fornecer URLs arbitrárias. PATCH do perfil deve atualizar os campos enviados sem limpar escolhas omitidas. Recompensas desativadas precisam de política explícita; mídia indisponível usa a aparência padrão sem corromper a seleção.

Contratos HTTP implementados (a exposição opcional de distintivos permanece futura):

- `GET /users/me/achievements`: catálogo, progresso privado, obtidas e recompensas.
- `GET /users/me/cosmetics`: coleção, itens bloqueados e seleções atuais.
- `PATCH /users/me`: ampliar contrato com `backgroundId` e `avatarFrameId`, incluindo `null` para remover.
- `GET /users/:username`: perfil público inclui aparência equipada; conquistas não são expostas. Progresso, eventos, IDs de campanhas/sessões, títulos privados e origem da recompensa não são públicos.

Proposta de privacidade: exibição de conquistas é opcional e começa desativada, pois até um distintivo de participação pode revelar atividade. Cosméticos equipados são públicos por definição. Definir seleção e limite de distintivos na primeira etapa de interface.

## Artes e movimento

Fundos estáticos precisam de recorte responsivo e prévia. Bordas preservam o centro transparente para não esconder a foto e são independentes da imagem enviada pelo usuário. A primeira aplicação da borda é no perfil público; extensão para menu, listas e sala é posterior.

Para fundos animados, avaliar GIF/WebP animado e loops de vídeo WebM/MP4 com o mesmo resultado visual pretendido. A escolha final depende da arte, transparência, tamanho e reprodução nos navegadores testados. Não há ferramenta de geração de vídeo/GIF adotada; a produção das animações é uma entrega própria, com ciclo conferido visualmente. Uma imagem estática gerada não conta como animação pronta.

Cada item animado inclui alternativa estática. Respeitar `prefers-reduced-motion` e oferecer opção de pausar animações; sem áudio. Em vídeo, prever `muted`, `playsInline`, loop, poster e tratamento de autoplay negado. Pausar fora da tela e evitar carregar todas as animações na grade da coleção. A arte não pode comprometer a leitura, capturar cliques ou esconder botões do perfil.

Referências técnicas: [preferência por movimento reduzido](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) e [reprodução de vídeo, poster e autoplay](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

## Ordem proposta de implementação

1. Definir as primeiras conquistas, critérios e retroatividade; escolher artes e a apresentação da coleção.
2. Implementar catálogo, concessão no servidor e editor com fundos/bordas estáticos, mantendo o perfil padrão existente.
3. Verificar fluxo completo: ação real → desbloqueio → coleção → equipar → perfil público → recarga, com concorrência e tentativas de equipar item bloqueado.
4. Produzir e integrar fundos/bordas animados, alternativa estática, pausa e verificações móveis/de movimento reduzido.
5. Ampliar marcos de sessão somente após definir evidências de participação; chat e tempo real seguem no backlog do núcleo.

Critérios de saída: itens bloqueados não equipáveis por chamada direta; recompensas únicas em concorrência; seleções independentes e persistentes; perfis de outras contas não editáveis; visitantes veem a aparência correta sem receber evidências privadas; conta existente conserva o banner padrão; desktop e 320 px sem overflow; falha de mídia e movimento reduzido com fallback; novas regras não interferem nas rolagens e fichas.

## Decisões pendentes

- Novas condições de obtenção relacionadas ao chat e tempo real.
- Ampliação do catálogo e desafios de jogo; os quatro marcos iniciais estão na decisão 008.
- Catálogo e arte vinculados às próximas recompensas.
- Retroatividade de condições futuras; marcos iniciais concedidos a partir de fatos existentes.
- Evidência de participação/conclusão de sessão e limites para marcos cumulativos.
- Distintivos públicos opcionais: seleção e quantidade.
- Novos formatos de loops em vídeo/GIF; a expansão atual usa WebP/SVG com movimento em CSS.

Origem: pedido adicional do usuário, relacionado a RF003 e às conquistas previstas nas seções 15–16/49 da especificação. Não altera a numeração RF001–RF025 nem declara concluído o módulo social do MVP 4.
