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

Build, check consolidado, backup, migration e conferência online serão registrados após concluir a publicação.
