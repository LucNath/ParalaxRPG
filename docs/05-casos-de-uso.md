# 05 — Casos de uso

Os casos abaixo detalham os fluxos das seções 52–59. IDs UC são identificadores desta documentação. As políticas pendentes seguem o [índice](README.md).

## UC01 — Criar conta e entrar

**Ator:** visitante. **Requisitos:** RF001, RF002. **Pré-condição:** não estar autenticado.

1. Visitante informa os dados de cadastro definidos pelo produto.
2. Servidor valida unicidade e entradas e persiste conta com hash de senha.
3. Usuário faz login com as credenciais.
4. Servidor emite access token e refresh token segundo a política de segurança.
5. Interface abre o dashboard.

**Exceções:** dados inválidos, identificador duplicado, credenciais incorretas, indisponibilidade. Não criar conta parcial nem expor hashes. **Pós-condição:** conta persistida e sessão autenticada após login. Login automático após cadastro não foi definido.

## UC02 — Personalizar perfil

**Ator:** usuário. **Requisito:** RF003. **Pré-condição:** autenticação válida.

1. Usuário abre seu perfil e edita nome, biografia e avatar.
2. Servidor valida os campos e eventual arquivo.
3. Alterações são persistidas e refletidas no perfil público permitido.

**Exceções:** arquivo inválido, username indisponível ou tentativa de editar outro perfil. **Pós-condição:** somente os campos autorizados do próprio perfil foram alterados. Banner, links e localização podem ser acrescentados conforme etapa da interface.

## UC03 — Criar e publicar sistema

**Ator:** usuário/criador. **Requisitos:** RF004–RF006. **Pré-condição:** autenticação.

1. Usuário informa nome e descrição.
2. Adiciona atributos, perícias, recursos e dados no editor visual.
3. Salva o sistema com a visibilidade escolhida.
4. Pode editar ou publicar conforme permissões de autoria.

**Exceções:** chaves duplicadas, definição inválida, edição por terceiro, alteração incompatível de sistema já usado. **Pós-condição:** definição persistida, reutilizável conforme acesso; catálogo público só mostra sistemas públicos. Versionamento segue DP06.

## UC04 — Criar e configurar campanha

**Ator:** usuário/Mestre. **Requisitos:** RF007, RF008, RF024. **Pré-condição:** sistema acessível.

1. Usuário seleciona sistema e preenche os campos da campanha.
2. Define visibilidade, capacidade e estado inicial.
3. Servidor cria a campanha e seu vínculo administrativo de forma consistente.
4. Mestre acessa o painel e pode editar a campanha.

**Exceções:** sistema inacessível, capacidade inválida ou perda de permissão. **Pós-condição:** campanha vinculada ao sistema e ao Mestre. Excluir campanha exige política de dependências e retenção (DP08).

## UC05 — Convidar e admitir jogador

**Atores:** Mestre e destinatário. **Requisitos:** RF009, RF011. **Pré-condição:** campanha existente, Mestre autorizado e espaço disponível.

1. Mestre seleciona destinatário conforme mecanismo de convite definido.
2. Servidor registra convite pendente, sem criar participação ativa.
3. Destinatário autenticado consulta e aceita o convite.
4. Servidor verifica identidade, estado do convite e capacidade novamente.
5. Vínculo de jogador é criado e convite marcado como aceito na mesma transação.

**Alternativa:** destinatário recusa; Mestre revoga convite pendente. **Exceções:** convite expirado, revogado, já usado, destinatário incorreto ou campanha lotada. **Pós-condição:** aceite não duplica vínculos. Transporte, expiração e reenvio estão pendentes (DP04).

## UC06 — Solicitar ingresso

**Atores:** usuário e Mestre. **Requisitos:** RF010, RF011. **Etapa:** após MVP 1.

1. Usuário encontra campanha pública recrutando e solicita participação.
2. Mestre recebe solicitação e decide aceitá-la ou recusá-la.
3. Aceite verifica capacidade e cria o vínculo.

**Exceções:** campanha mudou de estado/visibilidade, usuário já é membro ou pedido duplicado. **Pós-condição:** pedido sozinho não concede acesso privado.

## UC07 — Criar e atualizar personagem

**Ator:** jogador; Mestre para administração. **Requisitos:** RF012, RF024. **Pré-condição:** vínculo ativo e permissão de edição.

1. Jogador abre a campanha e cria personagem usando a definição do sistema.
2. Preenche nome, atributos, perícias e recursos disponíveis.
3. Servidor valida campos contra a versão do sistema e persiste a ficha.
4. Autor ou Mestre altera valores conforme permissões; atualização chega aos clientes autorizados.

**Exceções:** campo inexistente, valor fora da definição, conflito entre edições, jogador removido ou acesso a outra campanha. **Pós-condição:** ficha consistente e atualizada. Proposta para concorrência: versão de registro e rejeição de atualização obsoleta.

## UC08 — Agendar, iniciar e encerrar sessão

**Ator:** Mestre. **Requisitos:** RF013–RF017, RF024. **Pré-condição:** campanha administrável.

1. Mestre informa título, descrição, data, horário, participantes e privacidade.
2. Sessão fica agendada.
3. Mestre inicia a sessão; servidor valida a transição e persiste AO VIVO.
4. Participantes acessam a sala; sessão pública elegível aparece na descoberta.
5. Mestre encerra a sessão; servidor persiste FINALIZADA e notifica clientes.

**Exceções:** usuário sem permissão, transição inválida, outra sessão ativa segundo regra proposta ou conflito de privacidade. **Pós-condição:** novas ações de jogo são bloqueadas e a sessão deixa a listagem ao vivo.

## UC09 — Conversar e rolar dados

**Ator:** participante. **Requisitos:** RF018–RF020. **Pré-condição:** usuário autorizado na sessão ao vivo.

1. Participante envia mensagem ou expressão de dados.
2. Servidor valida identidade, vínculo, estado e conteúdo.
3. Mensagem ou rolagem é persistida.
4. Evento é entregue aos destinatários autorizados e aparece no histórico.

**Exceções:** expressão inválida, duplicidade de envio, limite excedido, desconexão ou sessão encerrada. **Pós-condição:** resultado recuperável após reconexão, sem confiar em totais calculados pelo cliente.

## UC10 — Assistir sessão pública

**Ator:** usuário/espectador. **Requisitos:** RF016, RF025. **Pré-condição:** sessão pública elegível ao vivo.

1. Usuário consulta “Ao vivo agora”.
2. Seleciona “Assistir”.
3. Servidor autoriza ingresso como espectador e fornece projeção pública.
4. Espectador acompanha o conteúdo disponibilizado pelo Mestre.
5. Ao encerrar a sessão ou mudar a autorização, a conexão recebe o novo estado e deixa de receber conteúdo restrito.

**Exceções:** sessão privada, encerrada, retirada de descoberta ou acesso anônimo não habilitado. **Pós-condição:** espectador não se torna jogador e não pode enviar ações de jogo. Chat de espectadores não foi definido.

## UC11 — Remover jogador

**Ator:** Mestre. **Requisitos:** RF011, RF024. **Pré-condição:** jogador pertence à campanha administrada.

1. Mestre escolhe jogador e confirma a remoção na interface.
2. Servidor revoga o vínculo e registra a ação.
3. Acesso HTTP e de tempo real é revogado.

**Exceções:** usuário já removido ou alvo é o responsável sem transferência definida. **Pós-condição:** nenhuma nova ação privada é autorizada. Destino de personagens e histórico segue DP08.

## Casos futuros

Administração de NPCs, mapas, inventário e combate será detalhada no MVP 2. Documentos, diário e fog of war entram no MVP 3. Recursos sociais e estatísticas entram no MVP 4. Não há contratos prontos para esses casos nesta entrega.

## Referências

[Histórias](06-historias-de-usuario.md), [regras](04-regras-de-negocio.md), [API](09-api.md) e [testes](16-testes.md).
