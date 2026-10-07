# Verificação 004 — Publicação online para testes

Publicado e verificado em 7 de outubro de 2026. URL para compartilhar: **[https://paralax-rpg-web.vercel.app](https://paralax-rpg-web.vercel.app)**. Acesso sem autenticação Vercel; cada participante cria sua própria conta.

## Versão publicada

| Campo | Web | API |
| --- | --- | --- |
| Projeto | `paralax-rpg-web` | `paralax-rpg-api` |
| Domínio | `paralax-rpg-web.vercel.app` | `paralax-rpg-api.vercel.app` |
| Target / status | `production` / `READY` | `production` / `READY` |
| Commit do código | `42aae74` | `42aae74` |
| Framework | Next.js | NestJS |
| Runtime / região | Node.js 24 / `iad1` | Node.js 24 / `iad1` |
| Duração do build | 24 segundos | 26 segundos |
| Deployment | `dpl_7cv3xcxVNpWeRpKGm12LK5qD8zaS` | `dpl_Yy19RCRDib4AxhNPm3daFW12Raop` |
| Inspeção | [Build web](https://vercel.com/lucky-8804ce74/paralax-rpg-web/7cv3xcxVNpWeRpKGm12LK5qD8zaS) | [Build API](https://vercel.com/lucky-8804ce74/paralax-rpg-api/Yy19RCRDib4AxhNPm3daFW12Raop) |

O target `production` corresponde ao endereço estável da Vercel; o uso solicitado é testar os módulos disponíveis. Publicação feita pela CLI, sem envio do código ao GitHub ou execução remota do workflow CI. Alterações documentais posteriores não modificam o código publicado.

## Persistência e configuração

Banco Neon `paralax-rpg-tests`, isolado do PostgreSQL local, com as duas migrations existentes aplicadas após confirmar schema vazio. Não houve cópia de contas locais. Pool de conexões na aplicação e conexão direta para migrations.

Avatares persistem no Blob privado `paralax-rpg-avatars` e são entregues pelas rotas da API. Segredo de sessão online gerado separadamente, variáveis sensíveis no backend e arquivos locais de credenciais ignorados pelo Git. O frontend encaminha `/api/v1` à API pelo mesmo domínio; refresh usa cookie HttpOnly, Secure e SameSite=Lax.

Os builds foram ajustados para instalar ferramentas compartilhadas na raiz do monorepo, detectar a entrada NestJS e carregar dependências ESM do NestJS 12 no runtime CommonJS. Configuração e futuras atualizações estão no [procedimento de publicação](../deploy-vercel.md).

## Evidências

Smoke test em Chromium, com desktop 1440×1000 e emulação Pixel 7, acessando o domínio público sem sessão Vercel nem headers de bypass.

| Verificação | Resultado |
| --- | --- |
| Site anônimo | HTTP 200 |
| `/api/v1/health/ready` pelo site | HTTP 200, `status=ok`, `database=connected` |
| Cadastro e sessão | Conta criada pela interface em ambos os tamanhos; cookie HTTPS com flags esperadas |
| Perfil e avatar | Biografia salva; upload normalizado para WebP 256×256, disponível após recarga |
| Persistência Blob | Leitura direta no store confirmou o arquivo criado; rota pública de avatar retornou 200 |
| Sistema privado | Atributo criado e salvo na versão 1; valores mantidos após recarga |
| Autorização anônima | Sistema privado retornou 404 e área de sistemas do usuário retornou 401 |
| Publicação | Mudança para público gerou versão 2; leitura anônima e catálogo confirmados |
| Persistência Neon | Consulta confirmou proprietário, revisão 2 e snapshots das versões 1 e 2 |
| Logout e login | Saída e novo acesso pela interface; sistema continuou disponível |
| Interface | Editor inspecionado em desktop/celular, sem overflow horizontal nos fluxos verificados |
| Erros no navegador | Nenhum erro de página nos dois fluxos |
| Tipos e build locais | `npm run typecheck` e `npm run build` passaram; typecheck da API repetido após ajuste da entrada |
| Testes de integração locais | `npm run test:api`: 18 passaram com banco local real |
| Builds remotos finais | API e web concluíram e ficaram `READY` |

Contas sintéticas, sistemas, versões e arquivos Blob criados pelo smoke test foram removidos ao final, limitando a limpeza aos identificadores e credenciais de teste registrados. Capturas inspecionadas em `.artifacts/online-desktop-editor.png` e `.artifacts/online-mobile-editor.png`; esses artefatos permanecem locais. A barra móvel fixa aparece em uma região intermediária da captura completa por causa da composição do screenshot.

## Observação após a publicação

Consulta de logs dos dois deployments finais, com filtro HTTP 500 na janela de 30 minutos, não retornou eventos. Isso cobre o período consultado; não constitui monitoramento contínuo. Os fluxos online também não apresentaram respostas 500. Não foram adicionados drains nem serviço externo de monitoramento nesta entrega.

A consulta adicional de nível `error` na janela de uma hora retornou zero eventos no web e dois avisos do driver PostgreSQL na API, ambos associados a respostas HTTP 200. O aviso informa que `sslmode=require` atualmente equivale a `verify-full` nessa versão do driver e terá semântica diferente em uma versão principal futura. Não houve outro evento nessa consulta; revisar a configuração TLS antes de atualizar o driver.

## Escopo e custos

Disponíveis para testar: conta, autenticação, perfil/avatar, editor de sistemas, versões e leitura pública. Campanhas, personagens persistidos e sessões ainda são futuras. O salvamento do editor é explícito.

Neon foi criado no plano `free_v3`; não houve contratação ou alteração de plano pago. Functions e Blob seguem o plano e o uso da conta Vercel existente. Preview não está conectado ao banco publicado. Operação da plataforma completa, backups/restauração, recuperação de senha e retenção de arquivos continuam pendentes.
