# Verificação 012 - Contratos da mesa VTT

**Data:** 13 de outubro de 2026. **Recorte:** contratos, políticas de referência e matriz de acesso da [decisão 009](../architecture/decisions/009-contratos-da-mesa-vtt.md), detalhados em [24 - contratos](../24-vtt-contratos-da-mesa.md). Sem rotas ou migrations VTT nesta etapa.

## Evidência executada

- `npm run check`: tipos de API, web e contratos; 30 testes iniciais de contrato e os 86 testes de integração existentes da API com PostgreSQL local passaram. O teste adicional de recibo/projeção foi validado depois em `npm run test:contracts`, totalizando 31 testes do pacote.
- `npm run test:contracts`: fixtures sintéticas em memória, sem servidor, banco ou produção. A suíte passa a integrar `npm run check` e o workflow CI existente.
- `npm run build`: contratos, backend NestJS e frontend Next.js de produção compilados; compatibilidade com o pacote compartilhado conferida.
- Markdown: links locais/âncoras e referências VTT conferidos; o PDF de sete páginas permanece com SHA-256 `f3477e5f3aa33ae7052d88ef0f39c53086d63bd56ee948f171cf3b3ddc63f056`, igual à fonte preservada.

Os resultados acima descrevem validação local. O CI do GitHub é executado a cada envio; este relatório não presume resultado de uma execução remota ainda em andamento.

## Cobertura do protótipo de políticas

| Área | O que foi exercitado |
| --- | --- |
| Payloads | Movimento não aceita identidade, dono, audiência, concessão ou ficha; NaN/Infinity/strings/limites inválidos são rejeitados; UUIDs normalizados impedem controlador duplicado por caixa |
| Mapas/tokens | Limite de pixels, grade/escala, marcador sem ficha e revisão/alteração obrigatória; geometria do token inteiro dentro do mapa, incluindo frações e bordas |
| Papéis e escopo | Mestre, jogador ativo, anônimo, terceiro, removido, pendente e relações divergentes; privilégio de cosméticos/amizade não concede mesa |
| Ciclo de vida | SCHEDULED/LIVE/ENDED/CANCELLED, campanha terminal e PAUSED; preparação do mestre e leitura congelada possuem permissões distintas |
| Projeções | GM inclui preparação; PLAYER omite notas, origem, tokens secretos, ficha/controladores e revisões GM; nome oculto vira null; mudança só privada mantém projeção PLAYER idêntica |
| Integridade de resposta | DTO é cópia independente; mesa vazia não revela preparação; agregado de outra campanha/sessão/cena falha fechado; recibo não aceita snapshot privilegiado |
| Arquivos | Política de referência permite jogador consultar somente o fundo ativo da sessão autorizada; negar preparação e assets de outra campanha |
| Revogação | Concessão guardada no token não permite acesso após remoção; controle exige token visível da cena ativa e participação atual |

O teste de alteração privada manipula contadores e estado em memória; demonstra que a projeção usa a audiência correta, não que a futura transação incrementa os contadores corretamente. O teste de asset verifica decisão de autorização, não bytes servidos por HTTP ou permissões do Blob.

## Limites e aceite restante

VTT-T01/VTT-T02/VTT-T03 continuam pendentes como cenários completos. Ainda não foram verificados navegador → rota autenticada → persistência VTT → resposta, races reais com remoção/encerramento/movimento, idempotência em banco, copiar/congelar instâncias, parser/decodificação/upload/download de mapas, reconexão, renderização, teclado/toque, latência/custo ou recuperação/exportação.

VTT-I01 é parcial: contrato e protótipo de políticas concluídos; protótipo visual e medições pendentes. Não houve alteração de conta, dados, arquivo privado ou vaga pioneira de produção; os testes de integração reutilizaram fixtures locais existentes. Publicação da mesa dependerá das entregas seguintes e dos respectivos testes de integração/E2E.
