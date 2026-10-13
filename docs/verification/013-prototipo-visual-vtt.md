# Verificação 013 - Protótipo visual da VTT

**Data:** 13 de outubro de 2026. **Recorte:** [protótipo visual](../25-vtt-prototipo-visual.md), sem dados/persistência VTT reais.

Fluxo verificado: opções da demonstração → página Next.js no servidor → fixtures e projeção do contrato → props por audiência → mapa/controles → atualização local de exemplo. Banco, upload e transporte entre clientes não fazem parte desse fluxo.

## Verificação local

- `npm run check`: tipos das três workspaces, 31 testes dos contratos e 86 testes de API existentes com PostgreSQL local aprovados.
- Build de produção da web aprovada; a build de backend também executada por `check`.
- Nove casos novos de navegador passaram: quatro histórias em desktop/mobile e uma de toque no projeto móvel. O caso de toque é explicitamente omitido no projeto desktop.
- Quatro casos existentes de sessões passaram em desktop/mobile, incluindo o link novo para `/mesa-demo`, agenda, público, estados, acesso, paginação e recuperação.
- Capturas desktop e móvel de 320 px inspecionadas; sem overflow horizontal. Reduzido o excesso de rótulos sobrepostos e acrescentada centralização/ampliação do marcador para o celular.
- Teste negativo consulta o HTML/RSC inicial: PLAYER não contém nota secreta, token oculto, origem nem UUID de ficha; OUTSIDER não contém tokens. A configuração pública de visão somente troca fixtures.
- Falha real da requisição de imagem foi simulada: fallback mantém grade e controle, e retry recupera a imagem. O probe após hidratação cobre erro que acontece antes de React anexar o handler SVG.

Os casos novos estão em [vtt-demo.spec.ts](../../tests/e2e/vtt-demo.spec.ts). Entram automaticamente no runner/CI existente. Testes de sessões usam fixtures exclusivamente locais; a demonstração não cria usuários nem consome vagas pioneiras.

## Medição do renderer

Build de produção, Chromium no host Windows local, viewport desktop 1440 × 1000 ou Pixel 7 emulado em 320 × 850, com CPU throttling 4×. Cada caso faz três movimentos de ida/volta pelo mapa e coleta intervalos de `requestAnimationFrame`. Ensaio isolado de interação após carregamento, sem benchmark de rede/servidor ou comparação de engines.

| Perfil / marcadores | Quadros amostrados | Intervalo mediano | Intervalo p95 | Máximo observado |
| --- | --- | --- | --- | --- |
| Desktop / 25 | 321 | 16,7 ms | 16,7 ms | 33,4 ms |
| Desktop / 200 | 360 | 16,7 ms | 16,8 ms | 16,8 ms |
| Mobile emulado / 25 | 259 | 16,7 ms | 16,73 ms | 16,8 ms |
| Mobile emulado / 200 | 229 | 16,7 ms | 16,7 ms | 16,8 ms |

As quatro cenas renderizaram a quantidade esperada e não tiveram overflow. Dados brutos/script/capturas permanecem ignorados em `.artifacts`. Os números medem regularidade de quadros neste host; não são latência de confirmação da API, FPS garantido ou prova de desempenho num celular físico. O ensaio móvel de navegação usa mouse no viewport emulado; toque/pinça/cancelamento foram exercitados separadamente com eventos de toque via CDP.

## Revisão de componentes

Aplicada a checklist de React: separação servidor/cliente, fixtures protegidos por `server-only`, somente projeção autorizada em props, estado transitório em refs, componente de arte memoizado, handlers/observers limpos no unmount, IDs de pattern por instância, campos/controles rotulados, foco/teclado e layout responsivo. Sem dependência de renderer, serviço ou pacote novo.

## Limites

VTT-T01/VTT-T02/VTT-T03 completos continuam pendentes: não houve persistência, cópia/congelamento em banco, corrida transacional com remoção/encerramento, upload privado, sincronização/reconexão entre clientes ou ensaio de dispositivo físico modesto. Acesso revogado e conflito nesta tela são fixtures, não respostas das futuras rotas de mesa.

VTT-D04 adota SVG como decisão inicial do recorte medido, sujeita à validação no editor real. VTT-D02 e os itens operacionais de VTT-D05 continuam abertos. A mesa de campanhas reais ainda depende de VTT-I02/VTT-I03.
