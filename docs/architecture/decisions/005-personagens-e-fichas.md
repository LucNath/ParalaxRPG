# Decisão 005 — Personagens e fichas

Status: adotada no incremento de 7 de outubro de 2026. A leitura e a edição seguem a opção padrão apresentada ao usuário: jogador edita suas próprias fichas; mestre edita todas. Concessões individuais continuam futuras.

## Vínculo e regras

Cada personagem pertence ao usuário da sessão e à campanha escolhida. Mestre e jogadores ativos podem criar seus próprios personagens, até 20 por usuário/campanha. Não há atribuição de dono, transferência, NPC ou exclusão pela API. Finalizada/Cancelada bloqueiam novas fichas; fichas existentes continuam editáveis.

`Character.systemVersionId` é a versão fixa da campanha. Uma FK composta `(campaignId, systemVersionId)` impede associação divergente mesmo fora da API. Alterar o sistema original não migra os campos, padrões ou limites das fichas.

Nome obrigatório de 2–80 caracteres, descrição até 2000, história até 4000 e nível opcional (null quando o sistema não usa níveis). Nível, quando informado, é inteiro positivo até um milhão. História é compartilhada entre dono ativo e mestre; não representa notas secretas.

Valores são JSON com três listas: attributes, skills e resources. Cada entrada tem fieldId e value. A definição fixa determina exatamente os UUIDs e categorias aceitos; todos os campos aparecem uma vez, sem novos campos ou omissões. Criação sem values usa padrões dessa versão. Valores de atributos/perícias são inteiros entre -1 milhão e 1 milhão. Recursos são não negativos e respeitam maxValue da versão, quando definido. Máximo nulo permanece nulo; o limite técnico de representação de um milhão não se torna regra de RPG. Associação de perícia a atributo é informativa, sem fórmula automática.

## Acesso e retenção

Somente o dono com participação ativa e o mestre consultam/editam a ficha. Outros jogadores, destinatários pendentes, visitantes e espectadores não recebem fichas, mesmo em campanha pública. Lista pessoal inclui apenas fichas próprias autorizadas; lista da campanha mostra todas ao mestre e apenas próprias ao jogador. Resumos omitem história, valores, definição e e-mail.

Remover jogador revoga novas leituras/escritas/listas imediatamente e preserva suas fichas para o mestre. Novo convite aceito restaura o acesso às mesmas fichas. Esta decisão resolve a retenção após remoção de DP08; exclusão de contas/campanhas e arquivos continua pendente. FKs têm cascatas estruturais, mas não há operações de exclusão disponíveis ao usuário neste incremento.

As telas consultam novamente ao recuperar foco e a cada 30 segundos enquanto visíveis. Perda de acesso limpa conteúdo privado. Editor preserva o rascunho em caso de revisão nova, sem substituir valores automaticamente. Falha de rede não equivale a revogação; a API continua sendo a autoridade de cada operação. Dados já recebidos não podem ser recolhidos.

## Concorrência e histórico

Criação/edição bloqueia a linha da campanha, compartilhando a ordenação transacional com remoção de membros. Isso evita salvar depois de removido e ultrapassar a cota em criações simultâneas. Atualização exige expectedRevision e retorna 409 CHARACTER_REVISION_CONFLICT quando diverge, sem sobrescrever o vencedor.

Cada gravação incrementa a revisão e cria `CharacterChange` na mesma transação: ator da sessão, revisão única, snapshot e data. O histórico ainda não tem endpoint ou tela de restauração. Salvamento é explícito; confirmação de descarte aparece ao sair com alterações ou recarregar a versão atual.

## Limites

Sem retrato/upload, inventário, notas privadas, fórmulas, autosave ou tempo real. Sessões foram entregues posteriormente; consulte a decisão 006 e a verificação 008 no índice da documentação. Contratos em [API](../../09-api.md); evidências em [verificação 007](../../verification/007-personagens-e-fichas.md).
