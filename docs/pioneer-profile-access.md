# Liberação para as dez primeiras contas

As dez primeiras contas recebem todos os cosméticos atuais e futuros de perfil. Contas existentes entram na ordem de `User.createdAt`, com ID como desempate. A liberação anterior do proprietário é preservada independentemente da posição. A regra só concede personalização; permissões de campanhas e dados privados continuam sob as regras existentes.

Há dez registros permanentes em `PioneerAccessSlot`. Cada cadastro confirmado ocupa no máximo uma vaga, na mesma transação da conta. Vagas não são reutilizadas após exclusão: a referência da conta fica nula e a data de concessão permanece. Cadastros que falham ou sofrem rollback não consomem vaga. Não há campo público para ativar o benefício.

A migration `20261008060000_pioneer_access` concede retroativamente o benefício aos primeiros usuários, sincroniza os oito itens e instala os triggers de cadastro/perfil. O bloqueio na migration evita lacunas durante a atualização. Triggers no banco também cobrem cadastros recebidos por versões anteriores da API. As conquistas e escolhas equipadas não são alteradas. GET da coleção e PATCH de personalização continuam sincronizando itens de futuras expansões para contas liberadas.

Os testes de negócio usam schema PostgreSQL isolado e a migration real: retroatividade, preservação de datas/seleções, 16 cadastros concorrentes disputando sete vagas, limite total de dez, rollback, exclusão sem reposição e recriação do perfil da mesma conta. As demais histórias de integração representam usuários após a faixa dos pioneiros; a preparação cria e exclui contas sintéticas somente no banco local, consumindo as vagas de fixture. Há bloqueio explícito contra execução dessa preparação no banco hospedado.

Na publicação, verificar o histórico de migrations, fazer backup, preservar os dados existentes e conferir beneficiários/vagas restantes. Testes de cadastro no banco online devem acontecer em transação revertida, para não usar vagas reais com contas sintéticas.
