## Objetivo
Em `/direcao/estrategia/despesas/:mes`, na tabela Folha Salarial:
1. Ordenar os colaboradores com `em_folha = true` no topo, antes dos `em_folha = false`.
2. Remover a "linha de inserção fantasma" no rodapé (Select + NumInputs + botão salvar).
3. Permitir adicionar o lançamento direto nas linhas dos colaboradores "fantasmas" (sem lançamento no mês).

## Mudanças em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`

### 1. Ordenação
- Antes do `colabs.map`, ordenar: `em_folha=true` primeiro (mantendo ordem alfabética dentro de cada grupo).

### 2. Remover linha de inserção espectral
- Apagar todo o `<tr>` "Add row" da `BlocoFolha` (linhas ~494–547).
- Remover estados/handlers não usados após isso: `adminUserId`, `form`, `saving`, `selected`, `onSelectColab`, `clear`, `save`, `insalubValNew`, `fgtsValNew`, `prev13NewCom`, `feriasNew`, `totalNew`, `emptyForm`, e o import `Select*` se não mais usado nesse bloco.
- Manter o import de `Select*` apenas se ainda for usado por `BlocoDespesa` (é).

### 3. Inserção inline nos colaboradores sem lançamento
- Para cada `colab` sem `r` (linha "fantasma"), tornar as células editáveis usando o mesmo padrão de `EditableCell`, mas sem `r.id`:
  - Criar um novo componente `GhostEditableCell` (ou parametrizar `EditableCell`) que, ao primeiro `onSave`, dispara `onInsert` criando o lançamento daquele colaborador para o mês com os valores default do cadastro + o novo valor do campo editado.
  - Após inserir, a linha vira "real" (vem do reload).
- Campos editáveis nas linhas fantasmas: Salário, Combustível, Insalub %, FGTS %, Previsão 13°.
- Ícone de status à esquerda: manter (vermelho = sem lançamento, verde = com lançamento).
- Botão de excluir: continua só aparecendo quando já existe `r`.

### 4. Comportamento de UX
- Clicar em qualquer campo editável de uma linha fantasma cria o lançamento com os defaults do cadastro + a alteração feita, exibindo toast "Lançamento de folha adicionado".
- Demais edições subsequentes funcionam normalmente via `onPatch` (já existente).

## Resultado
- Colaboradores "em folha" aparecem primeiro.
- A linha duplicada de inserção some.
- Os próprios "fantasmas" se tornam o ponto de entrada — basta clicar e editar qualquer valor para criar o lançamento daquele colaborador no mês.
