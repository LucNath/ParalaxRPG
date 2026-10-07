# 01 — Visão do produto

## Propósito

Centralizar a criação, a administração e a execução de campanhas de RPG de mesa online. Os usuários podem construir sistemas próprios e reutilizá-los em diferentes campanhas, organizar grupos e sessões e acompanhar sessões públicas.

**Princípio central:** a plataforma fornece as ferramentas, mas o criador define as regras. A arquitetura e as fichas não devem depender de atributos, classes ou mecânicas de um único RPG.

O nome temporário é **Project RPG Platform**, com identificador `rpg-platform`. O nome comercial está pendente.

## Objetivos de origem

1. Criar sistemas personalizados e campanhas com sistemas próprios ou disponibilizados por outros criadores.
2. Convidar jogadores, criar personagens e organizar sessões.
3. Jogar online com chat, fichas e rolagens.
4. Definir a visibilidade de campanhas e sessões de forma independente.
5. Descobrir campanhas e sessões públicas ao vivo e acompanhá-las como espectador.
6. Criar perfis personalizáveis e gerenciar o conteúdo das próprias campanhas.

## Público e papéis

| Papel | Necessidade | Limite principal |
| --- | --- | --- |
| Visitante | Conhecer a plataforma e consultar conteúdo público | Sem ações autenticadas; acesso às transmissões pendente |
| Usuário | Manter perfil e participar da comunidade | Acesso privado exige autorização |
| Criador de sistema | Definir regras e estrutura reutilizável | Administração dos próprios sistemas |
| Mestre | Preparar e controlar a campanha e a sessão | Poder administrativo restrito às próprias campanhas |
| Jogador | Criar personagem e participar da mesa | Ações dependem das permissões na campanha |
| Espectador | Acompanhar uma sessão pública | Consulta apenas o que foi publicado pelo Mestre |

Um usuário pode exercer papéis diferentes simultaneamente: Mestre de uma campanha, jogador em outra e criador de um sistema. O papel não concede acesso global ao conteúdo dos demais usuários.

## Diferencial do produto

O construtor visual permite definir atributos, perícias, recursos, dados e, em etapas posteriores, classes, raças, habilidades, itens, combate e progressão sem exigir programação do usuário. Um sistema pode usar d20, d6, porcentagem, cartas ou uma mecânica própria; o suporte operacional dessas variantes será ampliado por etapas.

Na primeira versão, a personalização cobre nome, descrição, atributos, perícias, recursos e dados. Fórmulas e cartas são evolução futura, e não compromissos do MVP 1.

## Módulos conceituais

| Nome temporário | Responsabilidade |
| --- | --- |
| Forge | Construção de sistemas |
| Campaigns | Administração de campanhas |
| Table | Mesa e sessão virtual |
| Live | Descoberta de sessões públicas |
| Codex | Wiki e documentação interna, em etapa futura |

Esses nomes organizam o produto; não representam decisão de marca ou serviços separados.

## Resultado esperado da primeira versão

Três usuários conseguem executar o fluxo descrito na [definição do MVP](14-mvp.md): criar conta e sistema, abrir uma campanha, aceitar convite, criar personagem, iniciar sessão, conversar, rolar dados, assistir como espectador e encerrar a sessão.

O sucesso inicial é a execução desse fluxo com persistência e autorização verificadas. Quantidade de usuários, receita, retenção e horas jogadas podem ser métricas futuras; não há metas quantitativas definidas na origem.

## Limites e dependências

- A plataforma administra a campanha, enquanto o Mestre administra seu ambiente de jogo.
- Controle da campanha não permite alterar o sistema original de outro criador.
- Sessão ao vivo no MVP significa acompanhamento do estado da mesa, chat e eventos. Voz, vídeo e streaming externo estão previstos para evolução.
- Recursos sociais, mapas avançados, mercado, plugins e aplicativo móvel ficam fora do MVP 1.
- Publicar sistemas de terceiros exige definir políticas de autoria e uso (DP06).
- Idiomas disponíveis, moderação e critérios de classificação indicativa precisam ser definidos (DP10).

## Referências

Origem: seções 1–3, 50–51, 56, 58–59. Veja [requisitos funcionais](02-requisitos-funcionais.md) e [roadmap](15-roadmap.md).
