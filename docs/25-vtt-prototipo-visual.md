# 25 - Protótipo visual da mesa

**Estado em 13 de outubro de 2026:** protótipo navegável entregue para o recorte visual de VTT-I01. A rota `/mesa-demo` usa dados fictícios, sem ler ou alterar campanhas, fichas, sessões ou arquivos privados do banco. Rotas de persistência e uploads VTT continuam pendentes em VTT-I02/VTT-I03.

Referências: [contratos](24-vtt-contratos-da-mesa.md), [decisão 009](architecture/decisions/009-contratos-da-mesa-vtt.md), [plano](22-vtt-plano-de-implementacao.md) e [verificação 013](verification/013-prototipo-visual-vtt.md).

## Como experimentar

Abra `/mesa-demo`, também disponível pelo botão **Conhecer demonstração da mesa** na página de uma sessão. A demonstração é pública e não exige criar uma conta. O seletor de visão configura somente personagens e relações fictícios; não concede papel de mestre nem acesso a campanhas reais.

- Mestre: trocar entre Ruínas do luar e Travessia de jade, alterar grade/escala, selecionar marcadores, navegar e mover os autorizados na demonstração.
- Jogador: consultar a cena de exemplo compartilhada e mover Rook/Nara; demais marcadores são somente leitura. Não recebe notas, fichas, controladores ou token oculto.
- Terceiro e removido: tela sem mapa ou marcadores, com explicação do acesso.
- Opções de demonstração: 25/200 marcadores, carregamento, erro, vazio, encerramento, revogação e movimento concorrente.

Movimento, grade e escala mudam somente o estado em memória daquela página. Recarregar, trocar cena/visão ou reiniciar a demonstração restaura os fixtures. Não há salvamento, sincronização entre clientes, upload ou desfazer nesta entrega. Os avisos de erro/conflito são simulações explícitas para testar o fluxo de recuperação.

## Interações

| Entrada | Comportamento |
| --- | --- |
| Mouse/caneta/toque simples | Arrastar o fundo navega; arrastar marcador concedido mostra prévia e atualiza a posição no fim do gesto |
| Dois dedos | Pinça faz zoom em torno do centro dos dedos; iniciar pinça cancela eventual prévia de arraste do marcador |
| Roda / botões de zoom | Zoom entre 10% e 400%, preservando a posição do ponto de referência |
| Enquadrar mapa / Home | Restaura a visão completa da cena |
| Centralizar marcador selecionado | Centraliza e amplia o marcador, útil no celular |
| Setas com foco no mapa | Navegação em incrementos de tela |
| Setas com foco no marcador | Movimento em pixels do mapa; Shift permite ajuste fino de um pixel; marcador sem controle não se move |
| Seletor e botões de direção | Alternativa ao arraste e ao pequeno alvo inicial no mapa completo |
| Encaixar arraste | Alinha o centro à célula; posição final é limitada para manter o marcador inteiro dentro da cena |
| Cancelar ponteiro | Descarta a prévia, sem confirmar movimento |

Em conflito de exemplo, o arraste não é aplicado; o usuário carrega a posição atual e então pode fazer um novo movimento. Encerramento bloqueia edição, troca de cena e movimento, preservando consulta/zoom. Se a imagem falhar, grade/controles permanecem disponíveis com retry.

## Renderização e audiência

SVG foi adotado como renderer inicial do protótipo, com imagem de fundo, pattern para grade e elementos vetoriais para marcadores. Não foi feita comparação de renderers, nem se afirma que SVG é a melhor opção para mapas avançados. Canvas/WebGL continuam alternativas se os ensaios do recorte real exigirem mudança.

Transformações transitórias de navegação/arraste usam refs e `requestAnimationFrame`; estado React é confirmado no fim do gesto. A arte/grade/tokens ficam num componente memoizado, evitando reconstruir 200 marcadores a cada movimento de ponteiro. O rótulo do marcador selecionado evita sobreposição de textos; todos os nomes autorizados ficam disponíveis no seletor e no nome acessível.

Pointer capture conserva o gesto quando o ponteiro sai do alvo. `touch-action: none` é limitado ao mapa; o restante da página continua rolável e com o zoom normal do navegador. Base técnica: [captura de ponteiro](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) e [gestos de pinça](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures).

`buildVttDemo` roda somente no servidor e aplica `projectVttTable` antes de serializar props. Jogador não recebe o agregado GM para ocultação no cliente. O renderer recebe somente a projeção escolhida. Como tudo é fictício/público, qualquer visitante pode escolher a demonstração GM; isso não representa autenticação ou autorização de campanhas reais.

Os dois SVGs de cenário foram desenhados no repositório para a demonstração e ficam em `public/demo`. Esses arquivos públicos não são um padrão de armazenamento para os futuros mapas privados: em VTT-I02, o componente receberá bytes/URL de objeto obtidos pela rota autenticada, conforme VTT-D05.

## Próximo incremento

O protótipo visual e os testes por audiência completam o recorte visual autorizado de VTT-I01. VTT-D04 tem decisão inicial e medição em Chromium com CPU limitada; ensaio em celular/computador físico modesto continua pendente, sem declaração de capacidade universal.

Próximo recorte de VTT-I02: migrations aditivas para modelos/instâncias/mesa, API autorizada e revisão, editor de cenas e seleção persistida na sessão. Antes de habilitar upload, fechar cotas, custo, retenção e limpeza compensatória de VTT-D05. Tokens persistidos/sincronizados e escolha do transporte permanecem em VTT-I03/VTT-D02.
