# Verificação 011 — Conquistas e cosméticos

Fluxo: ação válida → transação/concessão → coleção privada → prévia → equipar → perfil público → recarga → restaurar padrão. Recorte da [decisão 008](../architecture/decisions/008-conquistas-e-cosmeticos.md).

## Local

- Migration aditiva aplicada no PostgreSQL de desenvolvimento, sem reset.
- Sete testes de integração passaram: catálogo/default, quatro marcos, ordem avatar/bio e permanência, propriedade/categoria, PATCH parcial/privacidade, concorrência/rollback/cascata e migration real num schema isolado com fatos anteriores e perfil novo. Schema temporário revertido na mesma transação; teste de datas independente do fuso local.
- Dois E2E passaram, desktop e Pixel 7 reduzido a 320 px (32,8 s): cadastro, item bloqueado pela API/UI, bio/avatar, campanha/ficha/rolagem, coleção 4/4, prévia sem escrita, salvar, editar biografia sem perder aparência, recarga, visitante anônimo, fallback de imagem e restaurar padrão. SQL confirma seleção e quatro itens permanentes.
- Corrigida falha de recuperação de imagem quando o erro ocorria antes da hidratação. Contas sintéticas e arquivos de avatar criados pelos testes removidos. Capturas desktop da coleção e móvel do perfil público inspecionadas; sem overflow e logout visível na área privada.
- Porta padrão ocupada por outro aplicativo: browser local usou 3002 com origem no processo, sem alterar .env.
- Check consolidado aprovado: tipos das três workspaces e todos os 66 testes de integração. Builds de API e web aprovados. Contrato do perfil público no teste existente ampliado para background/avatarFrame, mantendo a validação exata dos campos permitidos.

## Publicação

Código de aplicação: `3c69315d4909f6a03b1531898a6a102d945a51f3`. Backup custom de 48.168 bytes em `.artifacts/backups/before-cosmetics-1791480416095.dump`, cabeçalho e manifesto conferidos com PostgreSQL 18 e verify-full; nenhum ensaio de restauração. Migration oitava aplicada no Neon após o backup. IDs das doze tabelas anteriores e campos originais dos perfis conferidos e preservados. Concessão retroativa comparada aos fatos existentes: uma conquista e um item; seleções permaneceram nulas.

API `dpl_9BYmgCfu5VKnXLjThykfD6MDKYw6` e web `dpl_EMcSrXNqeg4S4aXeuEDJnqzzSTpM`: builds aprovados, READY e aliases `paralax-rpg-api.vercel.app` / `paralax-rpg-web.vercel.app` atualizados.

Chromium online, desktop e Pixel 7 reduzido a 320 px: conta nova com 0/4, item bloqueado rejeitado por HTTP e indisponível na UI, biografia/avatar via formulário e Blob, criação real de campanha/ficha/sessão LIVE/rolagem, coleção 4/4, prévia sem escrita, salvar fundo/borda, editar biografia preservando seleção e recarregar. Visitante viu a aparência equipada sem conquistas/e-mail, e GET privado retornou 401. Falha simulada da imagem retomou o banner padrão. Restaurar padrão removeu apenas a seleção, mantendo quatro itens na coleção. SQL Neon confirmou seleção e concessão.

Captura online do perfil público móvel inspecionada; sem overflow. Logout visível na área privada de 320 px. Contas sintéticas e dados associados excluídos por IDs/e-mails/nomes exatos, ausência confirmada; apenas os dois avatares produzidos pelo teste foram removidos do Blob e sua ausência foi confirmada com leitura privada.

Logs dos deployments após o teste, janela de uma hora: nenhum HTTP 500 e nenhum registro web de nível error. API apresentou cinco registros de aviso existente sobre depreciação de sslmode, associados a quatro HTTP 200 e um HTTP 201; sem falha de conexão. Não se afirma ausência de logs de erro da API. Capturas, backups e logs permanecem ignorados em `.artifacts/`.

## Liberação permanente solicitada pelo titular

Profile.allCosmeticsUnlocked, default false e indisponível via HTTP, permite sincronizar todo o catálogo para a conta configurada administrativamente. Oitavo teste de conquistas verifica rejeição de ativação pelo cliente, PATCH antes da visita à coleção, sincronização repetida sem duplicação, reposição de item, conquistas reais preservadas, outra conta bloqueada, privacidade do campo e vínculo ao ID mesmo após mudança do username.

Check final aprovado: tipos e 67 testes de integração. Nenhuma alteração de interface ou nova dependência nesta extensão.

Backup antes da nona migration: `.artifacts/backups/before-owner-access-1791481474557.dump`, 53.456 bytes, formato/manifesto conferidos. Migration 20261008040000_cosmetic_access aplicada no Neon; liberação ativada exclusivamente para a conta indicada pelo usuário, conferida por identidade exata. Os quatro itens foram adicionados sem mudar aparência, avatar, biografia ou conquistas. Dados pessoais e seleções anteriores conferidos.
