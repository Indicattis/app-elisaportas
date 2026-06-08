## Objetivo

Recriar a seção de despesas **Autorizados** como uma categoria normal de despesas (igual a Fixas, Variáveis, Fornecedores, Financiamentos, Fretes e Logística), permitindo cadastrar tipos de custos com `tipo='autorizado'` e lançar gastos nessa categoria. A antiga seção "Pagamentos de Autorizados Terceiros" (componente customizado) não volta — fica substituída pela nova lógica padronizada.

## Mudanças

### 1. Banco (migração)
- Atualizar o CHECK constraint `tipos_custos_tipo_check` para incluir `'autorizado'` no array de valores permitidos.

### 2. Tipagem (front)
Adicionar `'autorizado'` na união de tipos em todos os pontos onde aparecem os outros (`'fixa' | 'variavel' | ... | 'frete'`):
- `src/hooks/useTiposCustos.ts`
- `src/components/financeiro/GastoFormDialog.tsx`
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- `src/pages/direcao/DREMesDirecao.tsx`

### 3. Tela de configuração `EstrategiaDespesasConfiguracoes.tsx`
- Filtrar `tiposAutorizados = tiposCustos.filter(t => t.tipo === 'autorizado')`.
- Renderizar bloco "Autorizados" com `tipo="autorizado"` (mesmo padrão dos demais).
- Incluir `'autorizado'` no array de grupos do seletor (label: `Autorizados`).

### 4. Resumo do topo `DespesasResumoTopo.tsx`
- Novo state `gastosAutorizados`, `setGastosAutorizados(agruparPor('autorizado'))`.
- Bloco visual "Autorizados" análogo a Fornecedores/Financiamentos/Fretes, com `onAddGasto` enviando categoria `'autorizado'`.

### 5. DRE mensal `DREMesDirecao.tsx`
- Novos states/props: `despesasAutorizados`, `tiposCustosAutorizados`, `totalDespAutorizados`.
- `itemsBy('autorizado')` e `tiposBy('autorizado')` no fetch.
- Bloco na renderização (`11. Autorizados`) idêntico aos demais.
- Linha extra `(–) Autorizados` no card de totais e na tabela final.
- Incluir `totalDespAutorizados` no cálculo de `lucroLiquidoFinal`.
- Passar props para o componente filho que recebe os outros totais.

### 6. Dialog de novo gasto `GastoFormDialog.tsx`
- Reconhecer `defaultCategoria='autorizado'` (apenas estender união de tipos — não precisa lógica nova).

## Observações
- Sem mudança no schema de `gastos` (já usa `tipo_custo_id`).
- Sem reaproveitamento dos dados antigos da tabela `pagamentos_autorizados_terceiros_mes` / `autorizados_terceiros` — esses ficam intocados (lógica separada do fluxo financeiro de autorizados se existir).
- A coluna do DRE final continua mostrando apenas "Desp. Variáveis" e "Fretes e Logística" (conforme exclusão recente); incluir ou não "Autorizados" lá é decisão à parte — por padrão **não** vou adicionar, apenas no card de totais e nas seções detalhadas.