# 11 — Segurança

## Requisitos de origem

- RNF002: senhas nunca armazenadas diretamente; Argon2 ou bcrypt.
- RNF003: access token e refresh token.
- RNF004: HTTPS em produção.
- RNF008: registro de ações administrativas importantes do Mestre.
- RF017/RF024/RF025: privacidade, administração limitada à própria campanha e espectador sem ações de jogo.

Os controles técnicos a seguir são propostas de implementação desses requisitos. Esta documentação não certifica segurança nem define política legal ou de conformidade.

O recorte de conta/perfil já implementa Argon2id, tokens rotacionados/revogáveis, projeção pública, validação de uploads, checagem de origem e limites por processo. A [decisão 001](architecture/decisions/001-base-e-autenticacao.md) documenta parâmetros reais; o [relatório](verification/001-autenticacao-perfil.md) registra os testes. Permissões de campanha, auditoria do Mestre e coordenação distribuída seguem para os próximos módulos.

## Autenticação

### Cadastro e senha

Proposta: preferir Argon2id; bcrypt continua uma alternativa permitida na origem. Parâmetros de custo devem ser escolhidos e medidos no ambiente real. Usar biblioteca mantida, salt gerado pelo algoritmo e comparação segura.

Definir identificador de login, normalização, política de senha, verificação de conta e recuperação de acesso (DP02). Não há fluxo de recuperação ou verificação obrigatório descrito no MVP; se adotado, terá contrato próprio.

Aplicar limites de abuso ao cadastro e login. Erro de login não deve revelar se uma conta específica existe. Nunca registrar senha, payload completo de autenticação ou hash em logs.

### Tokens

Proposta: access token de validade curta, refresh token rotacionado com sessão persistida e revogável. A origem não exige JWT; escolher formato em DP03.

Se usar JWT, verificar assinatura, algoritmo permitido, emissor, destinatário e expiração. Claims não substituem a verificação atual de vínculo em campanha.

Guardar refresh token como hash ou identificador verificável no servidor, com expiração e revogação. Proposta: detectar reutilização após rotação e revogar a família da sessão; detalhes dependem de DP03.

Para navegador, propõe-se refresh token em cookie `HttpOnly`, `Secure` em produção e política `SameSite` adequada. Access token pode ficar em memória com transporte definido no contrato. Evitar credenciais em URL e definir proteção CSRF para rotas que usem cookies.

Logout revoga a sessão de refresh. Um access token já emitido pode continuar válido até expirar se não houver revogação imediata; documentar esse comportamento e escolher mecanismo quando a política exigir encerramento instantâneo.

## Autorização por recurso

Autenticação responde quem é o usuário. Autorização decide a ação permitida naquele recurso.

- Resolver campanha do personagem, sessão, NPC, mapa ou item antes de aplicar privilégios.
- Validar dono, vínculo ativo, papel, permissão individual, audiência e estado.
- Não confiar em `ownerId`, `role`, `campaignId` ou flags de autorização fornecidos pelo cliente.
- Criador só altera seu sistema; Mestre só administra suas campanhas.
- URL conhecida não permite acesso privado.
- Proteção deve existir em consulta, escrita, exportação e evento de tempo real.
- Revogação precisa atingir conexões já abertas e caches de autorização.

Ver [matriz de permissões](12-permissoes.md).

## Proteção de conteúdo e entrada

Propostas:

1. Validar payloads por schema e limitar corpo, mensagens, nomes, arquivos e expressões.
2. Usar consultas parametrizadas/ORM; não montar SQL com texto do usuário.
3. Renderizar texto escapado; se houver conteúdo rico, sanitizar HTML e limitar recursos permitidos.
4. Parser próprio para dados e futuras fórmulas; nunca usar `eval` ou executar código do usuário.
5. Criar DTOs públicos e privados separados; não serializar modelo completo do banco.
6. Limitar tentativas por identidade e origem, sem bloquear indiscriminadamente um grupo que compartilha conexão.

## Arquivos

Avatares pertencem ao MVP; mapas e handouts entram depois. Proposta: verificar tamanho, tipo real e formatos permitidos, gerar nome/chave segura e limitar resolução quando necessário.

URLs de arquivos privados precisam de autorização e validade limitada, ou entrega por backend autorizado. Não publicar notas, documentos ou mapas secretos em bucket público. Evitar SVG/HTML ativo sem sanitização específica. Se o backend buscar imagens por URL, proteger contra acesso a rede interna e destinos não permitidos.

## Transporte e configuração

- Produção usa HTTPS e conexão de tempo real segura; TLS pode terminar no proxy conforme infraestrutura.
- CORS e origem do WebSocket devem aceitar apenas clientes configurados; não são substitutos de autorização.
- Credenciais do banco, storage e chaves de assinatura ficam fora do repositório e do bundle do frontend.
- Contas de serviço têm privilégios necessários; ambientes não compartilham segredos de produção.
- Logs e mensagens de erro não incluem stack, tokens, cookies ou campos secretos de campanha.

## Auditoria

Registrar, pelo menos como proposta inicial, criação/exclusão de campanha, mudança de visibilidade, convite/revogação/remoção, alteração de permissões, início/encerramento de sessão e edição administrativa relevante de ficha.

Evento proposto: `id`, `actorId`, `campaignId`, `action`, `resourceType`, `resourceId`, `occurredAt`, `outcome`, `requestId` e alterações permitidas. Redigir ou omitir valores secretos; não registrar senha/token. Definir quem pode consultar, prazo e integridade dos registros (DP08).

Auditoria administrativa não deve ser editável por um jogador nem apagada por uma exclusão comum sem política explícita.

## Riscos e verificações

| Risco | Controle proposto | Evidência de teste |
| --- | --- | --- |
| Mestre de A altera B | Escopo da campanha em toda ação | Acesso cruzado negado em HTTP e tempo real |
| Espectador obtém segredos | Projeções e canais por audiência | Inspeção do payload, não apenas da tela |
| Jogador removido continua conectado | Revogação distribuída e revalidação | Conexão aberta perde acesso |
| Convite usado por terceiro ou repetido | Destinatário, estado e transação | Aceite inválido negado e sem duplicatas |
| Cliente envia total de dado | Cálculo exclusivo no servidor | Campo de total não determina resultado |
| Sistema altera fichas em uso | Versionamento/snapshot definido | Alteração não muda ficha silenciosamente |
| Upload ou texto ativo executa código | Validação, sanitização e entrega segura | Arquivo/conteúdo malicioso rejeitado ou inerte |
| Vazamento em log | Redação e minimização | Inspeção dos logs de falha e autenticação |

## Decisões pendentes

DP02/DP03 cobrem identificação e tokens; DP08 cobre retenção e exclusão; DP09 cobre limites; DP10 cobre moderação. Não há política de idade mínima, denúncia, bloqueio de usuário ou tratamento de conteúdo completa na origem.

## Referências

[Requisitos não funcionais](03-requisitos-nao-funcionais.md), [WebSocket](10-websocket.md), [permissões](12-permissoes.md), [testes](16-testes.md) e [deploy](17-deploy.md).
