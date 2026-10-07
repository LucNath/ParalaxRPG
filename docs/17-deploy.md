# 17 — Deploy e operação

## Status

A origem fornece componentes de infraestrutura, mas não escolhe provedor, orçamento ou estratégia de publicação. Para os módulos atuais, foi publicado e verificado um [ambiente online de testes](https://paralax-rpg-web.vercel.app) na Vercel, com PostgreSQL Neon e avatares em Blob; veja [configuração e atualização](deploy-vercel.md) e [evidências](verification/004-publicacao-vercel.md). O ambiente local mantém PostgreSQL isolado, migrations e scripts. A operação da plataforma completa descrita abaixo continua uma **proposta futura**. O workflow CI está preparado, sem execução remota confirmada.

Comandos locais de instalação, build, testes e execução estão no [README](../README.md). Para o ambiente de testes solicitado posteriormente, Vercel, Neon e Blob já têm configuração própria no [procedimento de publicação](deploy-vercel.md). As propostas de operação da plataforma completa abaixo continuam futuras.

## Ambientes propostos

| Ambiente | Uso | Dados e acesso |
| --- | --- | --- |
| Desenvolvimento | Construção e testes locais | Dados sintéticos, serviços isolados e configuração própria |
| Homologação | Fluxo ponta a ponta e validação operacional | Topologia representativa, acesso restrito e dados de teste |
| Produção | Uso real | HTTPS, segredos protegidos, persistência, monitoramento e backups |

Banco, buckets, segredos e credenciais devem ser separados por ambiente. Não copiar dados reais para testes sem política definida.

## Serviços necessários

| Serviço | Necessidade | Observação |
| --- | --- | --- |
| Frontend | Servir interface Next.js ou stack escolhida | Domínio e forma de build dependem de DP01 |
| Backend | API e gateway bidirecional | Hospedagem deve suportar conexões persistentes e os limites escolhidos |
| PostgreSQL | Dados críticos | Versão, capacidade e estratégia de backup pendentes |
| Redis | Presença, cache e distribuição entre instâncias | Não usar como única persistência do histórico |
| Object storage | Avatares e arquivos | Público/privado por audiência; mapas depois |
| Proxy/balanceador | TLS, roteamento e distribuição | Suporte a upgrade de conexão, timeouts e afinidade quando necessária |
| Observabilidade | Logs, métricas e alertas | Conteúdo sensível redigido |

Proposta local: serviços de dados em Docker Compose, com configuração documentada. Isso não exige que produção use Docker nem determinado provedor.

## Configuração proposta

Nomes abaixo são ilustrativos; o contrato final deve vir de um `.env.example` sem segredos na implementação.

| Configuração | Finalidade | Exposição |
| --- | --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL | Backend; segredo |
| `REDIS_URL` | Conexão Redis | Backend; segredo quando incluir credencial |
| `AUTH_ACCESS_SIGNING_KEY` | Assinatura/verificação se o formato de token exigir | Backend; segredo |
| `AUTH_ACCESS_TTL` / `AUTH_REFRESH_TTL` | Validade conforme DP03 | Backend |
| `WEB_ORIGIN` | Origem permitida de frontend | Configuração de CORS/tempo real |
| `API_PUBLIC_URL` | Endereço público de API | Pode ser público; nunca incluir credenciais |
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` | Destino de arquivos | Backend; exposição conforme provedor |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Credenciais de storage quando aplicáveis | Backend; segredos |
| `LOG_LEVEL` | Verbosidade operacional | Sem liberar campos secretos |

Não colocar segredos em variáveis públicas do frontend. Chaves, certificados e credenciais devem ter rotação e escopo mínimo.

## Sequência proposta de implantação

1. Escolher provedor/topologia e resolver DP01, DP03, DP08 e metas relevantes de DP09.
2. Provisionar serviços de dados, storage e acesso restrito.
3. Configurar DNS, TLS, origens permitidas e segredos do ambiente.
4. Construir frontend e backend com versões de dependências fixadas.
5. Fazer backup/preparação antes de mudança destrutiva e executar migrations versionadas.
6. Publicar backend e conferir readiness sem expor informações internas.
7. Publicar frontend compatível com API/eventos.
8. Executar smoke test de autenticação, campanha privada e conexão bidirecional.
9. Executar cenário com clientes em instâncias distintas quando a topologia tiver múltiplos backends.
10. Monitorar erros e latência; registrar versão implantada e procedimento de rollback.

Não executar seeds de desenvolvimento em produção. Migrações devem ser executadas uma vez por release, com coordenação para evitar disputa entre instâncias.

## Compatibilidade e rollback

Proposta: alterações de schema compatíveis por etapas, separando expansão e remoção. Durante atualização, clientes antigos podem permanecer conectados; considerar compatibilidade de eventos ou reconexão controlada.

Rollback de código não desfaz automaticamente uma migration. Definir previamente se a reversão usa código compatível, migration reversível ou restauração de backup. Restauração pode perder mudanças posteriores ao backup; o limite aceito é RPO definido em DP09.

## Saúde e monitoramento

Proposta: liveness indica processo ativo; readiness verifica capacidade de atender dependências essenciais. Endpoints não publicam connection strings, credenciais ou diagnósticos internos.

Medir taxa de erro, latência HTTP, conexões ativas, atraso de eventos, falhas de persistência, pool do banco, memória e presença. Alertas e limiares dependem de DP09. Logs usam correlação de requisição e IDs sem texto privado de chat por padrão.

## Backup e recuperação

- Definir frequência, retenção, criptografia e acesso a backups do PostgreSQL.
- Considerar arquivos de object storage junto dos dados que os referenciam.
- Testar restauração em ambiente isolado e conferir integridade de campanha, ficha, histórico e referências de arquivos.
- Documentar falha de banco, Redis, storage e nó de backend com responsáveis e procedimento.
- Redis transitório pode ser reconstruído; isso não elimina necessidade de backup dos dados críticos.
- RPO/RTO, prazos de retenção e estratégia de restauração permanecem DP08/DP09.

## Critério de prontidão operacional

Antes de produção: configuração segura verificada, migrations conhecidas, smoke tests aprovados, recuperação exercitada, observabilidade ativa e limitações declaradas. A lista é uma proposta de engenharia para a futura aplicação, sem criar um fluxo de aprovação para esta organização documental.

## Referências

Origem: seções 33–39 e 42. Veja [arquitetura](07-arquitetura.md), [segurança](11-seguranca.md), [requisitos não funcionais](03-requisitos-nao-funcionais.md) e [testes](16-testes.md).
