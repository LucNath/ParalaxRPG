# Verificação 012 — Fundos e bordas animados

Data: 8 de outubro de 2026. Código publicado: 4e5f6ff4766f820adac3a513ac822795aab2d967. [Catálogo, arquivos e prompts](../animated-profile-cosmetics.md).

## Resultado

Duas paisagens e duas bordas animadas disponíveis no ambiente de testes: Santuário de jade, Cidadela das brasas, Órbita de jade e Coroa das brasas. A conta solicitante tem liberação permanente dos oito itens; suas escolhas de fundo/borda foram preservadas. As quatro conquistas continuam refletindo ações reais, com duas recompensas cada.

## Validação local

- Tipos de API, web e contratos; build da API; 67 testes de integração passaram.
- Após ampliar as verificações de retroatividade, os oito testes de conquistas passaram novamente com PostgreSQL real. Incluem execução idempotente da migration, manutenção de datas/recompensas/seleções e isolamento da liberação administrativa.
- Build de produção do Next.js passou.
- Fluxo anterior de conquistas e o novo fluxo animado passaram em desktop e celular; largura mínima de 320 px. Verificados carregamento das duas paletas, gravação e recarga, dados no PostgreSQL, perfil anônimo, avanço real da animação, pausa/retomada, alteração da preferência por movimento reduzido e fallback quando arte/borda falham.
- Revisão visual das capturas e das artes WebP; revisão de hooks, limpeza do observador de preferência, acessibilidade do botão e miniaturas estáticas.

## Publicação e verificação online

Backup PostgreSQL 18 em formato custom: `.artifacts/backups/before-animated-cosmetics-1791482829881.dump`, 53.864 bytes. Cabeçalho e manifesto conferidos com pg_restore; restauração não exercitada. Conexão com verificação de certificado. Migration 20261008050000_animated_cosmetics aplicada após comparar as nove migrations anteriores.

Verificadas preservação das contas, dados pessoais, escolhas equipadas, flag administrativa, conquistas e recompensas anteriores. A expansão acrescenta novos itens sem equipá-los automaticamente.

- API: dpl_EoMCWQ3FHxuKdPjLEAE7o79ezDr5, READY, alias https://paralax-rpg-api.vercel.app.
- Web: dpl_Bp7D7nvEqk5FTwwU89Kt7KPKvRGs, READY, alias https://paralax-rpg-web.vercel.app.
- Navegador → API → Neon → perfil público verificado online: jade em desktop e brasas em 320 px. Salvamento/recarga, mídias válidas, animação em execução, pausa/retomada, movimento reduzido, privacidade e bloqueio de item antes da liberação passaram.
- Contas sintéticas removidas por ID, username e e-mail exatos; ausência confirmada. A única liberação administrativa restante pertence à conta solicitante. Nenhum avatar foi criado nesta verificação.

## CI e preparação dos testes

Na primeira execução completa do GitHub, os 67 testes de API e os quatro cenários de conquistas/animações passaram. Dois testes anteriores receberam 429 no cadastro: a conta extra do cenário animado elevou a sequência de cadastros acima do limite real de dez por minuto. O teste novo passou a preparar uma conta sintética no banco local e fazer login normal, preservando o limite do produto. A preparação fica restrita ao banco local; a conta e seus dados são excluídos ao terminar.

A execução corrigida [37862349011](https://github.com/LucNath/ParalaxRPG/actions/runs/37862349011) passou: 67 testes de integração e 30 de navegador.

## Correção do controle de movimento

A captura enviada pelo usuário exibia **Movimento reduzido**, desativando o fundo e a borda conforme a preferência do sistema. O controle anterior era indisponível nesse estado. Agora **Ativar animações** permite ativação explícita e salva a escolha no navegador. **Pausar animações** também persiste; **Seguir sistema** remove a escolha manual. A exceção de CSS só abrange os efeitos do perfil após ativação explícita; as demais animações da interface continuam respeitando movimento reduzido.

Os cenários de desktop e celular passaram com movimento reduzido: ativação de fundo/borda, recarga com movimento ativo, pausa persistente e retorno ao padrão automático. Sem alterações de API ou banco nesta correção.
