# Mover botão "Novo Gasto" para dentro das seções

## Objetivo
Tirar o botão laranja "Novo Gasto" do topo de `/direcao/estrategia/despesas/:mes` e replicá-lo dentro do cabeçalho de cada uma das três seções: **Despesas Fixas**, **Despesas Variáveis** e **Despesas de Imposto**. Cada botão abre o mesmo `GastoFormDialog`, já filtrando os tipos de custo pela categoria correspondente.

## Passos

### 1. `src/pages/direcao/estrategia/EstrategiaDespesasMes.tsx`
- Remover o `<button>` "Novo Gasto" do header (e o ícone `Plus` se ficar sem uso).
- Manter o `GastoFormDialog` montado, agora com estado adicional `dialogCategoria: 'fixa' | 'variavel' | 'imposto' | null`.
- Passar para `<DespesasResumoTopo>` uma nova prop `onRequestNovoGasto(categoria)` que abre o dialog e guarda a categoria selecionada.

### 2. `src/components/financeiro/GastoFormDialog.tsx`
- Adicionar prop opcional `defaultCategoria?: 'fixa' | 'variavel' | 'imposto'`.
- Filtrar `tiposAtivos` por essa categoria quando informada (mantendo comportamento atual quando ausente).
- Resetar/aplicar o filtro sempre que o dialog abrir.

### 3. `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- Receber a nova prop `onRequestNovoGasto?: (categoria: 'fixa' | 'variavel' | 'imposto') => void`.
- Repassá-la para os três blocos (`BlocoGastosReadonly` das fixas/variáveis e `BlocoDespesa` dos impostos) como callback `onAddGasto`.
- Em cada componente de seção, renderizar no cabeçalho (ao lado do título/ícone) um botão compacto "Novo Gasto" no mesmo estilo laranja, que chama `onAddGasto()`. Manter os toggles internos existentes (quick-add inline) intactos.

## Detalhes técnicos
- Sem mudanças de banco, hooks ou lógica de cálculo.
- A categoria é apenas dica de UX para pré-filtrar o select de tipos no diálogo; o usuário ainda pode finalizar normalmente.
- `reloadKey` continua sendo incrementado no `onSaved` do dialog, o que já atualiza as três seções.

## Arquivos alterados
- `src/pages/direcao/estrategia/EstrategiaDespesasMes.tsx`
- `src/components/financeiro/GastoFormDialog.tsx`
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
