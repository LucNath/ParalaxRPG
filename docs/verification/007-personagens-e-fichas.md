# Verificação 007 — Personagens e fichas

Entrega de 7 de outubro de 2026. História: jogador ativo cria uma ficha com a versão fixa da campanha, salva seus valores e o mestre pode editá-la; conflitos preservam o rascunho e remoção revoga acesso sem apagar o personagem. Políticas na [decisão 005](../architecture/decisions/005-personagens-e-fichas.md).

## Entrega

Lista pessoal em `/personagens`, lista por campanha, criação, consulta e edição. Nome, descrição, história e nível opcional; atributos/perícias/recursos definidos pela versão fixa. Salvamento explícito, validação de campos e máximos, revisão otimista, confirmação de descarte e histórico transacional. Dono ativo consulta/edita próprias fichas; mestre consulta/edita todas da própria campanha. Campos de autoria e versão são definidos no servidor.

Migration aditiva `20261008000000_characters` aplicada localmente. Character/CharacterChange, FK composta para a versão da campanha, índices e restrições de revisão/nível. Remoção conserva dados; novo ingresso restaura acesso. Cota de 20 por usuário/campanha e serialização com remoção por trava da campanha.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| Tipos | `npm run typecheck` passou em contratos, API e web |
| Build | `npm run build` passou em contratos, NestJS e Next.js, incluindo as cinco novas rotas de personagens |
| Integração PostgreSQL | `npm run test:api`: 42 passaram, incluindo oito casos de personagens |
| Valores dinâmicos | Defaults da versão fixa, IDs/categorias exatos, campos extras/duplicados/ausentes rejeitados; recursos não negativos e dentro do máximo |
| Acesso | Sem leitura/escrita para anônimo, terceiro, outro jogador ou destinatário pendente; campanha pública não publica ficha |
| Versão/persistência | Nova versão do sistema não altera a ficha; FK rejeita versão divergente; dados sobrevivem ao reinício da API |
| Concorrência | Duas escritas da mesma revisão: um vencedor e um 409; sem histórico parcial. Remoção e edição serializadas |
| Cota/estados | Criações simultâneas respeitam 20 por dono/campanha; campanha encerrada não recebe novas fichas |
| Retenção | Remoção nega novas leituras/escritas/listas, mestre conserva acesso e reingresso recupera os mesmos dados |
| E2E completo | `npm run test:e2e -- --max-failures=1`: 18 passaram em 2,6 minutos, nove desktop e nove Pixel 7 |
| Ficha no navegador | Defaults, validação, criação, recarga, edição pelo mestre, rascunho preservado, recarga consentida, edição pelo jogador e perda de acesso com editor aberto |
| Lista | Entrada pelo dashboard, vazio, falha 503 simulada/recuperação, 21 fichas reais em duas campanhas, páginas 20/1 e busca |
| SQL | Versão original, nível nulo, valor final e três revisões com atores jogador/mestre/jogador conferidos |
| Responsividade | Capturas desktop/mobile inspecionadas; editor e seis controles da barra cabem em 320 px; sem overflow nas telas verificadas |
| React | Efeitos com abort/limpeza, identidade estável, IDs como chaves, labels/erros associados e prevenção de escritas repetidas conferidos |

Os testes guardam o destino local e removem seus próprios usuários por IDs. O cenário de listagem prepara uma conta com hash no PostgreSQL local e entra pela interface, evitando exceder o limite de cadastro da regressão; o fluxo principal continua com cadastro real. Fichas paginadas são criadas pela API, respeitando a cota por campanha. Falha 503 é simulada somente para verificar recuperação. Não foram reduzidos limites de autenticação.

Uma primeira checagem ajustou o seletor do teste ao nome acessível do link. Uma execução anterior atingiu 429 no último cadastro e registrou um TypeError isolado entre cenários, sem stack disponível. A execução final com diagnóstico passou integralmente sem repetir esse erro; sua causa não foi confirmada. O diagnóstico temporário foi removido antes do build. Capturas em `.artifacts/{desktop,mobile}-ficha-personagem.png`, `.artifacts/personagem-editor-320px.png` e `.artifacts/personagens-navegacao-320px.png`. Artefatos e traces permanecem ignorados/excluídos do upload.

## Publicação

Publicado em **[Paralax RPG — Personagens](https://paralax-rpg-web.vercel.app/personagens)**, código `fc8f70b`, pelos projetos Vercel existentes, sem envio ao GitHub. Target `production`, usado como endereço estável de testes.

| Campo | Web | API |
| --- | --- | --- |
| Framework / status | Next.js / READY | NestJS / READY |
| Build remoto | 42 segundos | 33 segundos |
| Deployment | `dpl_3nFmq3kzgTrZnKc5UxUxZ3KKSdPR` | `dpl_Dao6MiW93VHfPkjUgSzVKta7nQ4q` |
| Inspeção | [Web](https://vercel.com/lucky-8804ce74/paralax-rpg-web/3nFmq3kzgTrZnKc5UxUxZ3KKSdPR) | [API](https://vercel.com/lucky-8804ce74/paralax-rpg-api/Dao6MiW93VHfPkjUgSzVKta7nQ4q) |

Quinta migration aplicada por conexão direta ao Neon após confirmar as quatro anteriores, equipe/projeto e ambiente de testes. IDs anteriores de usuários, sistemas, versões, campanhas, histórico, membros e convites preservados. Sem reset, seed ou cópia local. Schema aditivo permite retornar ao código anterior sem apagar as fichas; suporte a personagens fica indisponível nesse caso até restaurar o código novo.

## Verificação online e observabilidade

Smoke pelo domínio público, sem login Vercel ou bypass, passou em Chromium desktop e Pixel 7 com mestre e jogador em contextos separados por dispositivo:

- Cadastro real e convite/aceite pela interface.
- Campanha privada vinculada à versão 1; edição do sistema original para versão 2 não alterou defaults ou máximo da ficha criada depois.
- Criação com valores, rejeição de recurso acima do máximo, recarga e leitura persistida.
- Edição pelo mestre, detecção de revisão nova no jogador, rascunho preservado e recarga consentida antes de salvar.
- Remoção com editor aberto limpou o conteúdo privado; novo convite aceito recuperou a mesma ficha com seus valores.
- Lista pessoal acessível pelo início em ambos os dispositivos; leitura de ficha sem Bearer retornou 401.
- SQL no Neon confirmou versão original, nível nulo, recurso final, revisão 3, atores jogador/mestre/jogador e vínculo reativado.
- Sem erros de página; sem overflow horizontal nas telas verificadas.

Capturas `.artifacts/online-{desktop,mobile}-ficha-{personagem,conflito}.png` inspecionadas. Quatro contas sintéticas e seus dados foram removidos por id, e-mail e username exatos. TLS permaneceu verificado com certificados do sistema no Node local.

Consultas aos dois deployments finais, janela de uma hora e limite de 100 registros por consulta: zero eventos de nível error e zero HTTP 500 retornados nos dois projetos. Não foram adicionados drains ou monitoramento externo contínuo. Essas evidências cobrem os fluxos executados e a janela consultada, sem teste de carga ou garantia de disponibilidade contínua.

## Limites

Sem retrato, inventário, notas privadas, fórmulas, autosave ou WebSocket. Histórico persistido não tem tela de consulta/restauração. Criação é própria, sem transferência de dono. Acesso é reavaliado no servidor a cada operação; telas de consulta/edição verificam foco e intervalo de 30 segundos enquanto visíveis. Dados já recebidos não podem ser recolhidos. Sessões são o próximo incremento; o MVP completo ainda está em andamento.
