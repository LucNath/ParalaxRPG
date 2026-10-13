# Decisão 009 - Contratos da mesa VTT

**Data:** 13 de outubro de 2026. **Status:** adotada para contratos do recorte básico; integração e protótipos visual/de transporte pendentes.

**Evolução:** o [protótipo visual](../../25-vtt-prototipo-visual.md) foi entregue e medido no recorte fictício, conforme [verificação 013](../../verification/013-prototipo-visual-vtt.md). Integração/persistência, transporte e ensaio em dispositivo físico continuam pendentes; as decisões de contrato abaixo permanecem válidas.

## Contexto

O [plano VTT](../../22-vtt-plano-de-implementacao.md) propõe cenas/mapas e tokens sobre campanhas, membros e sessões existentes. O próximo passo autorizado é definir contratos e permissões antes de implementar as rotas. A mesa precisa proteger preparação do mestre, validar concessões e preservar o histórico de uma sessão encerrada.

O projeto já tem proprietário de campanha, membros ACTIVE/REMOVED, sessões SCHEDULED/LIVE/ENDED/CANCELLED, revisões, bloqueio transacional da campanha e Blob privado usado pelos avatares. A rota de entrega dos avatares é pública; reaproveitar esse endpoint para mapa daria acesso sem autorização da campanha.

## Decisão

1. Reutilizar proprietário como mestre e membro ACTIVE como jogador. Conquistas, pioneiros, cosméticos, amizade e visibilidade pública não concedem mesa. Co-mestre e espectador ficam para contratos posteriores.
2. Separar SceneTemplate de campanha e SceneInstance de sessão. Instanciar copia configuração/notas; publicar escolhe uma instância da mesma sessão. Mudança do modelo não altera cópias. Sessão terminal congela instâncias; jogador ativo consulta somente a cena final publicada de ENDED.
3. Adotar imagens estáticas privadas, grade quadrada/nenhuma, escala configurável e coordenadas do centro em pixels do mapa. Tokens básicos têm aparência, visibilidade e controle explícito, com ficha opcional da mesma campanha e sem recursos duplicados.
4. Definir schemas Zod estritos e DTOs GM/PLAYER no pacote compartilhado. Separar revisões por audiência; projeções de jogador excluem notas, tokens ocultos, origem de preparação, fichas/controladores e revisão GM. Validar escopo no servidor a cada leitura/comando/download.
5. Comando carrega requestId e revisão do recurso quando aplicável. Confirmar estado, revisão, auditoria e recibo na mesma transação. Autorizar acesso atual antes de recuperar recibo; retry retorna recibo, sem snapshot privilegiado. Ordenar locks pela campanha antes da sessão/mesa/instância/token.
6. Reutilizar storage privado existente em prefixo separado, com upload validado e entrega autenticada por escopo; não emitir URLs públicas nem usar a rota pública de avatar. Adotar limite piloto de 3 MiB, 20 milhões de pixels e 200 tokens/instância, sujeitos à medição. Retenção/cotas/custo precisam ser fechados antes de habilitar o upload.
7. Manter transporte/renderização desacoplados dos contratos. Nenhuma biblioteca de canvas, WebSocket ou serviço novo é escolhida sem protótipo e medição. PAUSED congela a futura mesa LIVE; preparação SCHEDULED/modelos continua editável. Os demais módulos não mudam nesta etapa.

Os [contratos detalhados](../../24-vtt-contratos-da-mesa.md) especificam campos, rotas, códigos de erro e ciclos de vida. [Testes do pacote](../../../packages/contracts/test/vtt.test.cjs) exercitam a matriz com dados sintéticos; não substituem testes das futuras rotas, banco e arquivos reais.

## Consequências

O contrato básico de VTT-D01 e VTT-D03 está definido. VTT-D05 tem política de autorização/validação, mas custos, cotas e retenção continuam pendentes; VTT-D02 e VTT-D04 precisam de protótipos. VTT-I01 é parcial, sem anunciar mesa implementada no site.

Cópias por sessão e contadores por audiência aumentam o estado a persistir, mas evitam alterar histórico pela edição de preparação e usar revisões secretas como cursor público. Mapas publicados são visíveis por inteiro: esconder salas do raster exige a projeção de VTT-D10, não uma camada visual no navegador.

Não criar tabelas vazias para módulos futuros. VTT-I02 acrescentará migrations aditivas e integração de cenas/assets; VTT-I03 acrescentará tokens, concessões e sincronização medida. Contratos podem evoluir por mudança explícita documentada enquanto as rotas ainda não forem publicadas.
