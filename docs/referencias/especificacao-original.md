# Plataforma Web de RPG

## 1. Visão geral

O projeto consiste em uma plataforma web destinada à criação, gerenciamento, execução e acompanhamento de campanhas de RPG.

O diferencial principal da plataforma será permitir que os próprios usuários criem seus sistemas de RPG, em vez de limitar as campanhas a sistemas preexistentes.

Um criador poderá definir:

- universo;
- história;
- regras;
- atributos;
- perícias;
- classes;
- raças;
- itens;
- habilidades;
- poderes;
- condições;
- mecânicas de dados;
- sistemas de combate;
- progressão;
- fichas;
- criaturas;
- NPCs;
- mapas;
- campanhas.

Além disso, os usuários poderão criar campanhas privadas ou públicas, convidar jogadores e realizar sessões ao vivo.

Sessões públicas poderão ser assistidas por outros usuários da plataforma.

O Mestre da campanha terá autoridade administrativa sobre todos os elementos relacionados à sua própria campanha.

---

# 2. Objetivo do sistema

Criar uma plataforma centralizada para RPG de mesa online onde usuários possam:

1. Criar seus próprios sistemas de RPG.
2. Criar campanhas utilizando sistemas próprios ou sistemas disponibilizados por outros usuários.
3. Convidar pessoas para participar das campanhas.
4. Criar personagens.
5. Organizar sessões.
6. Jogar sessões online.
7. Tornar campanhas públicas ou privadas.
8. Tornar sessões públicas ou privadas.
9. Assistir sessões públicas de outras campanhas.
10. Descobrir campanhas acontecendo ao vivo.
11. Criar e personalizar perfis.
12. Gerenciar todo o conteúdo relacionado às próprias campanhas.

---

# 3. Tipos de usuário

## 3.1 Visitante

Usuário que ainda não possui conta ou não está autenticado.

Poderá:

- visualizar a página inicial;
- visualizar campanhas públicas;
- visualizar sistemas públicos;
- visualizar perfis públicos;
- consultar sessões públicas;
- criar uma conta;
- realizar login.

O acesso de visitantes às transmissões poderá ser configurável futuramente.

---

## 3.2 Usuário

Usuário autenticado da plataforma.

Poderá:

- possuir perfil;
- personalizar seu perfil;
- seguir outros usuários;
- participar de campanhas;
- criar personagens;
- assistir sessões públicas;
- criar sistemas;
- criar campanhas;
- receber convites;
- solicitar participação em campanhas públicas.

---

## 3.3 Criador de sistema

Qualquer usuário poderá assumir essa função.

Será responsável pela criação de um sistema de RPG.

Poderá definir:

- nome;
- descrição;
- temática;
- atributos;
- perícias;
- recursos;
- classes;
- raças;
- arquétipos;
- habilidades;
- magias;
- poderes;
- itens;
- armas;
- armaduras;
- condições;
- regras;
- dados;
- regras de combate;
- regras de progressão;
- modelos de ficha;
- criaturas;
- conteúdos adicionais.

---

## 3.4 Mestre

Usuário responsável por administrar uma campanha.

O Mestre terá privilégios especiais exclusivamente dentro das campanhas que controla.

Entre suas permissões estarão:

- criar campanha;
- alterar campanha;
- excluir campanha;
- criar sessões;
- iniciar sessão;
- encerrar sessão;
- convidar jogadores;
- remover jogadores;
- aceitar solicitações;
- editar personagens quando permitido;
- criar NPCs;
- editar NPCs;
- criar itens;
- entregar itens;
- retirar itens;
- alterar valores das fichas;
- controlar iniciativa;
- controlar combate;
- controlar mapas;
- controlar criaturas;
- controlar anotações;
- alterar informações da campanha;
- definir visibilidade da campanha;
- definir visibilidade das sessões;
- ocultar informações dos jogadores;
- revelar informações durante uma sessão;
- controlar permissões individuais.

O Mestre deverá possuir controle administrativo completo sobre seu próprio ambiente de campanha.

---

## 3.5 Jogador

Participante de uma campanha.

Poderá:

- acessar campanhas das quais participa;
- criar personagens;
- editar personagens conforme as permissões;
- participar de sessões;
- usar chat;
- utilizar dados;
- consultar fichas;
- consultar inventário;
- consultar habilidades;
- interagir com mapas;
- fazer anotações.

---

## 3.6 Espectador

Usuário que acompanha uma sessão pública sem participar diretamente dela.

Poderá:

- assistir à sessão;
- consultar informações disponibilizadas publicamente;
- acessar perfil da campanha;
- acompanhar participantes;
- visualizar informações que o Mestre decidir disponibilizar.

Não poderá:

- alterar fichas;
- utilizar dados da campanha;
- controlar personagens;
- alterar mapas;
- administrar sessão;
- acessar informações privadas.

---

# 4. Sistemas de RPG

Um dos principais módulos da plataforma será o construtor de sistemas.

Um sistema funcionará como uma estrutura reutilizável que poderá ser utilizada por diferentes campanhas.

Exemplo:

```text
Sistema
 ├── Informações gerais
 ├── Regras
 ├── Atributos
 ├── Perícias
 ├── Recursos
 ├── Classes
 ├── Raças
 ├── Habilidades
 ├── Itens
 ├── Equipamentos
 ├── Condições
 ├── Combate
 ├── Progressão
 ├── Dados
 └── Modelo de ficha
```

---

# 5. Criador de sistemas

O sistema deverá possuir um editor visual.

Exemplo:

```text
Criador de Sistema

Nome:
Crônicas de Aether

Descrição:
Sistema de fantasia...

Dados utilizados:
[ D20 ]
[ D6 ]
[ D8 ]

ATRIBUTOS

+ Adicionar atributo

Força
Destreza
Inteligência
Vontade

PERÍCIAS

+ Adicionar perícia

Acrobacia
Investigação
Persuasão

RECURSOS

+ Adicionar recurso

Vida
Mana
Sanidade
```

O objetivo é evitar que o usuário precise programar para criar um RPG.

---

# 6. Sistema de fórmulas

A plataforma deverá posteriormente possuir um mecanismo de fórmulas.

Por exemplo:

```text
Vida Máxima = Constituição * 5 + Nível * 10
```

Outro exemplo:

```text
Defesa = 10 + Destreza + Armadura
```

E:

```text
Ataque = 1d20 + Força + Proficiência
```

Isso permitirá que sistemas extremamente diferentes sejam construídos utilizando a plataforma.

---

# 7. Campanhas

Uma campanha deverá possuir:

```text
Campanha
 ├── Sistema
 ├── Mestre
 ├── Jogadores
 ├── Personagens
 ├── História
 ├── Sessões
 ├── Mapas
 ├── NPCs
 ├── Criaturas
 ├── Itens
 ├── Documentos
 ├── Diário
 └── Configurações
```

---

# 8. Criação de campanha

Campos iniciais:

- nome;
- imagem;
- banner;
- descrição;
- sistema utilizado;
- Mestre;
- quantidade máxima de jogadores;
- classificação indicativa;
- tags;
- idioma;
- frequência das sessões;
- status.

Status possíveis:

```text
Planejada
Recrutando
Em andamento
Pausada
Finalizada
Cancelada
```

---

# 9. Visibilidade da campanha

O Mestre poderá definir:

## Pública

Qualquer usuário poderá encontrar a campanha.

Poderá existir:

```text
Solicitar participação
```

## Não listada

A campanha não aparecerá nas pesquisas.

Somente quem possuir convite ou link poderá acessá-la.

## Privada

Somente Mestre e jogadores convidados poderão visualizar.

---

# 10. Sessões

Cada campanha poderá conter várias sessões.

Exemplo:

```text
Campanha: Crônicas de Aether

Sessão 1
A chegada a Eldoria

Sessão 2
A Floresta Negra

Sessão 3
O Templo Perdido
```

Cada sessão deverá possuir:

- título;
- descrição;
- data;
- horário;
- participantes;
- duração;
- status;
- privacidade.

---

# 11. Estados de uma sessão

```text
AGENDADA
PREPARANDO
AO VIVO
PAUSADA
FINALIZADA
CANCELADA
```

---

# 12. Privacidade da sessão

Uma campanha pública não necessariamente possuirá todas as sessões públicas.

Exemplo:

```text
Campanha pública
    Sessão privada
```

ou:

```text
Campanha privada
    Sessão privada
```

ou:

```text
Campanha pública
    Sessão pública
```

O Mestre decidirá individualmente a visibilidade de cada sessão.

---

# 13. Sessões ao vivo

A plataforma deverá possuir uma seção:

```text
AO VIVO AGORA
```

Exemplo:

```text
Crônicas de Aether
Fantasia Medieval

🔴 AO VIVO

Mestre: Lucas
Jogadores: 5
Espectadores: 132
```

O usuário poderá selecionar:

```text
Assistir
```

e entrar como espectador.

---

# 14. Página Explorar

A plataforma poderá possuir uma área central de descoberta.

Exemplo:

```text
EXPLORAR

[ AO VIVO ]
[ CAMPANHAS ]
[ SISTEMAS ]
[ MESTRES ]
[ CRIADORES ]
```

Filtros:

- sistema;
- gênero;
- idioma;
- número de jogadores;
- campanhas recrutando;
- classificação;
- popularidade;
- mais recentes;
- mais assistidas.

---

# 15. Perfil de usuário

Cada usuário possuirá uma página de perfil.

Elementos personalizáveis:

- foto;
- banner;
- nome;
- username;
- biografia;
- localização opcional;
- links;
- sistemas favoritos;
- campanhas;
- personagens;
- conquistas;
- seguidores;
- seguindo.

---

# 16. Histórico do usuário

Exemplo:

```text
PERFIL

Campanhas como Mestre: 8
Campanhas como Jogador: 16
Personagens criados: 23
Sistemas criados: 3
Horas jogadas: 426
Sessões realizadas: 194
```

---

# 17. Dashboard

Após autenticação:

```text
Dashboard

Minhas campanhas
Próximas sessões
Convites
Personagens
Sistemas
Notificações
```

---

# 18. Tela da campanha

Possível organização:

```text
Crônicas de Aether
────────────────────────────

Visão geral

Sessões

Personagens

NPCs

Mapas

Itens

História

Documentos

Diário

Configurações
```

---

# 19. Sala de sessão

A sala será uma das partes mais importantes do sistema.

Possível estrutura:

```text
┌──────────────────────────────────────────────────────┐
│                 MAPA / BATTLEMAP                     │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ PERSONAGENS │ CHAT │ DADOS │ COMBATE │ INICIATIVA   │
└──────────────────────────────────────────────────────┘
```

---

# 20. Chat

Cada campanha poderá possuir:

- chat geral;
- chat da sessão;
- chat privado Mestre → Jogador;
- chat privado Jogador → Mestre;
- mensagens do sistema.

Exemplo:

```text
Lucas:
Vou investigar a sala.

Sistema:
Lucas rolou Investigação.

1d20 + 5

Resultado: 18
```

---

# 21. Sistema de dados

Exemplos suportados:

```text
d4
d6
d8
d10
d12
d20
d100
```

Sintaxe:

```text
1d20

2d6

1d20 + 5

3d8 + 4

2d20kh1
```

O histórico das rolagens deverá ser armazenado.

---

# 22. Personagens

Cada personagem será associado a:

- usuário;
- campanha;
- sistema;
- ficha.

Ficha genérica:

```text
Nome
Imagem
Descrição
Nível

Atributos

Perícias

Vida

Recursos

Inventário

Equipamentos

Habilidades

Condições

História

Anotações
```

A ficha deverá mudar dependendo do sistema criado.

---

# 23. NPCs

O Mestre poderá criar NPCs.

Um NPC poderá possuir:

- nome;
- imagem;
- descrição;
- atributos;
- habilidades;
- vida;
- inventário;
- comportamento;
- notas secretas.

NPCs poderão ser:

```text
Públicos
Parcialmente revelados
Secretos
```

---

# 24. Mapas

Cada campanha poderá possuir vários mapas.

Funcionalidades futuras:

- upload de imagem;
- grid;
- zoom;
- movimentação;
- tokens;
- fog of war;
- iluminação;
- marcadores;
- áreas;
- distância;
- iniciativa.

---

# 25. Fog of War

O Mestre deverá poder esconder áreas do mapa.

Exemplo:

```text
Mestre:

████████████████
██ Sala A      ██
██             ██
████████████████
      ?
      ?
      ?
```

Os jogadores somente visualizarão áreas já reveladas.

---

# 26. Combate

A sessão poderá possuir um módulo de combate.

Exemplo:

```text
COMBATE

1. Arthus
2. Goblin
3. Lyra
4. Goblin
5. Dragão
```

O Mestre poderá:

- iniciar combate;
- inserir participantes;
- retirar participantes;
- mudar iniciativa;
- alterar vida;
- aplicar condições;
- finalizar combate.

---

# 27. Inventário

Personagens poderão possuir:

```text
Inventário

Espada Longa
Poção de Cura x3
Mapa Antigo
25 moedas de ouro
```

O Mestre poderá criar e transferir itens.

---

# 28. Documentos da campanha

O Mestre poderá criar páginas internas.

Exemplos:

```text
História do Reino

Religiões

Mapa político

Facções

Lendas

Regras da campanha
```

Cada documento poderá ser:

```text
Público
Jogadores
Mestre
Usuários específicos
```

---

# 29. Diário da campanha

Eventos importantes poderão ser registrados.

Exemplo:

```text
Sessão 12

O grupo conseguiu atravessar
as Montanhas Cinzentas.

Encontraram o templo abandonado.
```

---

# 30. Sistema de permissões

A plataforma deverá possuir RBAC — Role-Based Access Control.

Roles:

```text
ADMIN
USER
SYSTEM_CREATOR
GAME_MASTER
PLAYER
SPECTATOR
```

Dentro da campanha:

```text
OWNER
GM
ASSISTANT_GM
PLAYER
SPECTATOR
```

---

# 31. Permissões especiais

O Mestre poderá conceder permissões específicas.

Exemplo:

```text
Jogador A

Editar personagem: SIM
Mover token: SIM
Criar item: NÃO
Ver NPC secreto: NÃO
Controlar NPC: NÃO
```

---

# 32. Requisitos funcionais iniciais

## RF001 — Cadastro

O sistema deverá permitir cadastro.

---

## RF002 — Login

O sistema deverá permitir autenticação.

---

## RF003 — Perfil

O usuário deverá possuir perfil personalizável.

---

## RF004 — Criar sistema

Usuários deverão poder criar sistemas próprios de RPG.

---

## RF005 — Editar sistema

Criadores deverão poder alterar seus sistemas.

---

## RF006 — Publicar sistema

Um sistema poderá ser:

```text
Privado
Não listado
Público
```

---

## RF007 — Criar campanha

Usuários poderão criar campanhas.

---

## RF008 — Definir sistema da campanha

Uma campanha deverá estar associada a um sistema.

---

## RF009 — Convidar jogadores

O Mestre poderá convidar usuários.

---

## RF010 — Solicitar participação

Usuários poderão solicitar entrada em campanhas públicas que estiverem recrutando.

---

## RF011 — Gerenciar jogadores

O Mestre poderá aceitar, recusar e remover participantes.

---

## RF012 — Criar personagem

Jogadores poderão criar personagens.

---

## RF013 — Criar sessão

O Mestre poderá criar sessões.

---

## RF014 — Iniciar sessão

O Mestre poderá iniciar uma sessão.

---

## RF015 — Sessão ao vivo

Sessões ativas deverão aparecer como AO VIVO.

---

## RF016 — Sessão pública

Sessões públicas poderão ser assistidas por outros usuários.

---

## RF017 — Sessão privada

Sessões privadas somente poderão ser acessadas por membros autorizados.

---

## RF018 — Chat

Participantes poderão conversar em tempo real.

---

## RF019 — Dados

Participantes poderão realizar rolagens.

---

## RF020 — Histórico

Rolagens deverão possuir histórico.

---

## RF021 — Mapas

O Mestre poderá adicionar mapas.

---

## RF022 — NPCs

O Mestre poderá criar e administrar NPCs.

---

## RF023 — Inventário

Personagens poderão possuir inventário.

---

## RF024 — Controle de campanha

O Mestre terá privilégios administrativos dentro da campanha.

---

## RF025 — Espectadores

Usuários poderão assistir sessões públicas.

---

# 33. Requisitos não funcionais

## RNF001 — Responsividade

O sistema deverá funcionar em:

- desktop;
- notebook;
- tablet;
- dispositivos móveis.

---

## RNF002 — Segurança

Senhas nunca deverão ser armazenadas diretamente.

Utilizar:

```text
Argon2

ou

bcrypt
```

---

## RNF003 — Autenticação

Utilizar:

```text
Access Token
+
Refresh Token
```

---

## RNF004 — HTTPS

Toda comunicação deverá utilizar HTTPS em produção.

---

## RNF005 — Tempo real

Chat e informações de sessões deverão utilizar comunicação bidirecional.

Sugestão:

```text
WebSocket
```

---

## RNF006 — Escalabilidade

A arquitetura deverá permitir múltiplas instâncias do backend.

---

## RNF007 — Persistência

Dados críticos deverão ser armazenados em banco de dados.

---

## RNF008 — Auditoria

Ações administrativas importantes do Mestre deverão poder ser registradas.

---

# 34. Arquitetura inicial recomendada

Arquitetura inicial:

```text
              INTERNET
                  │
                  ▼
          ┌─────────────────┐
          │    FRONTEND     │
          │    Next.js      │
          └────────┬────────┘
                   │
                HTTPS
                   │
                   ▼
          ┌─────────────────┐
          │     BACKEND     │
          │    NestJS       │
          └───────┬─────────┘
                  │
        ┌─────────┼──────────────┐
        │         │              │
        ▼         ▼              ▼
 PostgreSQL     Redis       Object Storage
        │         │              │
        │         │              │
        ▼         ▼              ▼
    Dados       Cache         Imagens
              WebSocket       Mapas
                              Avatares
```

---

# 35. Stack recomendada

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

Bibliotecas possíveis:

```text
Zustand
TanStack Query
React Hook Form
Zod
```

---

# 36. Backend

Sugestão:

```text
Node.js
NestJS
TypeScript
```

O NestJS é adequado por permitir uma organização modular.

Exemplo:

```text
modules/
 ├── auth
 ├── users
 ├── profiles
 ├── systems
 ├── campaigns
 ├── characters
 ├── sessions
 ├── chat
 ├── dice
 ├── maps
 ├── combat
 ├── inventory
 └── notifications
```

---

# 37. Banco de dados

Recomendação principal:

```text
PostgreSQL
```

Pode ser utilizado:

```text
Prisma ORM
```

---

# 38. Redis

Utilizado para:

- cache;
- sessões;
- presença;
- WebSockets;
- filas;
- sessões ao vivo;
- usuários conectados.

---

# 39. Comunicação em tempo real

Utilizar:

```text
Socket.IO
```

ou WebSocket puro.

Eventos possíveis:

```text
session:start
session:end

user:join
user:leave

chat:message

dice:roll

character:update

map:update

token:move

combat:start

combat:update

combat:end
```

---

# 40. Estrutura inicial do banco

Principais entidades:

```text
User

Profile

RPGSystem

SystemAttribute

SystemSkill

SystemResource

SystemClass

SystemRace

SystemAbility

Campaign

CampaignMember

CampaignInvitation

Character

CharacterAttribute

CharacterSkill

CharacterInventory

Session

SessionParticipant

SessionSpectator

Chat

Message

DiceRoll

Map

MapToken

NPC

Item

Combat

CombatParticipant

Notification
```

---

# 41. Relacionamentos principais

```text
User
 │
 ├── Profile
 │
 ├── RPGSystem
 │
 ├── Campaign
 │
 └── Character
```

Campanha:

```text
Campaign
 │
 ├── RPGSystem
 ├── GameMaster
 ├── Members
 ├── Characters
 ├── Sessions
 ├── Maps
 ├── NPCs
 └── Items
```

---

# 42. Estrutura aproximada do projeto

```text
rpg-platform/

apps/

  web/

  api/

packages/

  ui/

  types/

  validation/

  config/

docs/

  architecture/

  requirements/

  database/

  api/

  security/

  diagrams/

docker/

scripts/
```

---

# 43. Organização frontend

```text
web/

src/

  app/

  components/

  features/

    auth/

    profile/

    systems/

    campaigns/

    characters/

    sessions/

    chat/

    map/

    combat/

  hooks/

  services/

  store/

  types/

  utils/
```

---

# 44. Organização backend

```text
api/

src/

  modules/

    auth/

    users/

    profiles/

    systems/

    campaigns/

    characters/

    sessions/

    chat/

    dice/

    maps/

    combat/

    inventory/

    notifications/

  common/

  database/

  guards/

  interceptors/

  decorators/

  websocket/
```

---

# 45. API inicial

## Auth

```text
POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/refresh
```

---

## Users

```text
GET /users/:username

PATCH /users/me
```

---

## Systems

```text
POST /systems

GET /systems

GET /systems/:id

PATCH /systems/:id

DELETE /systems/:id
```

---

## Campaigns

```text
POST /campaigns

GET /campaigns

GET /campaigns/:id

PATCH /campaigns/:id

DELETE /campaigns/:id
```

---

## Campaign Members

```text
POST /campaigns/:id/invitations

GET /campaigns/:id/members

DELETE /campaigns/:id/members/:userId
```

---

## Characters

```text
POST /campaigns/:id/characters

GET /characters/:id

PATCH /characters/:id

DELETE /characters/:id
```

---

## Sessions

```text
POST /campaigns/:id/sessions

GET /sessions/:id

POST /sessions/:id/start

POST /sessions/:id/end
```

---

# 46. MVP

Não é recomendado desenvolver todo o sistema simultaneamente.

A primeira versão deverá possuir apenas o necessário para provar o funcionamento da plataforma.

## MVP 1

### Usuário

- cadastro;
- login;
- perfil;
- avatar.

### RPG

- criar sistema;
- nome;
- descrição;
- atributos;
- perícias;
- recursos;
- dados.

### Campanha

- criar;
- editar;
- excluir;
- pública;
- privada;
- convidar jogadores.

### Personagem

- criar;
- ficha;
- atributos;
- recursos.

### Sessão

- criar;
- iniciar;
- finalizar.

### Tempo real

- chat;
- rolagem de dados;
- atualização de personagens.

### Público

- listar campanhas públicas;
- mostrar sessões ao vivo;
- permitir espectadores.

---

# 47. MVP 2

Adicionar:

- inventário;
- itens;
- NPCs;
- habilidades;
- iniciativa;
- combate;
- mapas;
- tokens.

---

# 48. MVP 3

Adicionar:

- Fog of War;
- biblioteca de mapas;
- músicas;
- efeitos;
- handouts;
- diário;
- wiki;
- documentos;
- histórico completo.

---

# 49. MVP 4

Adicionar recursos sociais:

- amigos;
- seguidores;
- comentários;
- avaliações;
- ranking de sistemas;
- ranking de campanhas;
- conquistas;
- estatísticas.

---

# 50. Evolução futura

Posteriormente o sistema poderá suportar:

- voz;
- vídeo;
- compartilhamento de tela;
- gravação de sessão;
- replay;
- integração com Twitch;
- integração com YouTube;
- bots;
- API pública;
- marketplace;
- módulos comunitários;
- sistemas comunitários;
- plugins;
- mobile app.

---

# 51. Possível identidade dos produtos internos

Uma nomenclatura consistente poderá ser adotada.

Por exemplo:

```text
Platform
 ├── Forge
 │    Criação de sistemas
 │
 ├── Campaigns
 │    Gerenciamento de campanhas
 │
 ├── Table
 │    Mesa virtual
 │
 ├── Live
 │    Sessões públicas
 │
 └── Codex
      Wiki e documentação
```

Os nomes são temporários e servem somente para estruturar o produto.

---

# 52. Fluxo principal

```text
USUÁRIO
   │
   ▼
CRIAR SISTEMA
   │
   ▼
CRIAR CAMPANHA
   │
   ▼
CONFIGURAR CAMPANHA
   │
   ▼
CONVIDAR JOGADORES
   │
   ▼
CRIAR PERSONAGENS
   │
   ▼
AGENDAR SESSÃO
   │
   ▼
INICIAR SESSÃO
   │
   ├───────────────┐
   │               │
   ▼               ▼
JOGADORES       ESPECTADORES
   │               │
   └───────┬───────┘
           ▼
      SESSÃO AO VIVO
```

---

# 53. Fluxo de espectador

```text
Home

      ↓

Sessões ao vivo

      ↓

Selecionar campanha

      ↓

Assistir sessão

      ↓

Modo espectador
```

---

# 54. Fluxo do Mestre

```text
Login

↓

Dashboard

↓

Minha campanha

↓

Painel do Mestre

├── Jogadores
├── Personagens
├── NPCs
├── Itens
├── Mapas
├── Sessões
├── História
└── Configurações

↓

Iniciar sessão

↓

Mesa virtual
```

---

# 55. Painel do Mestre

O painel administrativo deverá centralizar todas as ferramentas.

```text
PAINEL DO MESTRE

Campanha

Jogadores

Personagens

NPCs

Criaturas

Itens

Mapas

Sessões

Documentos

História

Configurações
```

Durante uma sessão:

```text
MESTRE

Mapa
Combate
NPCs
Jogadores
Dados
Notas
Música
Eventos
```

---

# 56. Princípio central da plataforma

A arquitetura deverá seguir este princípio:

> A plataforma fornece as ferramentas, mas o criador define as regras.

Não deverá existir dependência de um único sistema de RPG.

A plataforma deve funcionar tanto para um sistema tradicional baseado em:

```text
d20
```

quanto para um sistema baseado em:

```text
d6
```

ou:

```text
cartas
```

ou:

```text
porcentagem
```

ou até um sistema completamente personalizado criado pelo usuário.

Esse princípio deve orientar tanto a arquitetura do software quanto o modelo de banco de dados.

---

# 57. Prioridades técnicas

A ordem recomendada de desenvolvimento é:

```text
1. Usuários e autenticação

2. Perfis

3. Sistemas de RPG

4. Campanhas

5. Membros e convites

6. Personagens

7. Sessões

8. WebSocket

9. Chat

10. Dados

11. Sessões públicas

12. Espectadores

13. Inventário

14. NPCs

15. Combate

16. Mapas
```

---

# 58. Nome temporário do projeto

Enquanto o nome comercial não estiver definido, o projeto poderá utilizar:

```text
Project RPG Platform
```

Código:

```text
rpg-platform
```

---

# 59. Objetivo da primeira versão funcional

A primeira versão poderá ser considerada funcional quando for possível executar o seguinte fluxo completo:

```text
Usuário A cria conta.

↓

Usuário A cria sistema.

↓

Usuário A cria campanha.

↓

Usuário A convida Usuário B.

↓

Usuário B entra na campanha.

↓

Usuário B cria personagem.

↓

Usuário A cria uma sessão.

↓

Usuário A inicia a sessão.

↓

Usuários conversam no chat.

↓

Usuário B realiza uma rolagem.

↓

Usuário A altera alguma informação da campanha.

↓

Sessão aparece como AO VIVO.

↓

Usuário C entra como espectador.

↓

Usuário A encerra a sessão.
```

Quando esse fluxo estiver funcionando, o núcleo da plataforma estará estabelecido.

---

# 60. Documentos de Engenharia de Software que devem complementar este documento

A documentação completa do projeto deverá ser posteriormente dividida em:

```text
/docs

01-visao-do-produto.md

02-requisitos-funcionais.md

03-requisitos-nao-funcionais.md

04-regras-de-negocio.md

05-casos-de-uso.md

06-historias-de-usuario.md

07-arquitetura.md

08-modelo-de-dados.md

09-api.md

10-websocket.md

11-seguranca.md

12-permissoes.md

13-interface.md

14-mvp.md

15-roadmap.md

16-testes.md

17-deploy.md

18-contribuicao.md
```

Essa organização permite entregar a pasta `docs/` diretamente ao Codex junto com o código-fonte, mantendo uma referência clara sobre como o sistema deve funcionar.