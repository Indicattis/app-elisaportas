# Lançar gastos na página mensal de despesas

## Objetivo
Em `/direcao/estrategia/despesas/2026-05` (rota `EstrategiaDespesasMes`), permitir que o usuário cadastre novos gastos com o mesmo formulário usado em `/financeiro/gastos`, já pré-filtrado no mês corrente.

## Abordagem
Extrair o formulário/diálogo "Novo Gasto" da página `GastosPage` para um componente reutilizável e usá-lo nas duas rotas.

### 1. Criar componente `GastoFormDialog`
- Local: `src/components/financeiro/GastoFormDialog.tsx`
- Props: `open`, `onOpenChange`, `gasto?` (para edição futura), `defaultMes?` (string `YYYY-MM` para sugerir data dentro do mês), `onSaved?`.
- Encapsula: estados de formulário, busca de colaboradores, autocomplete de descrição, validação e `saveGasto`/`updateGasto` via `useGastos`.
- Mantém exatamente o mesmo layout/estilo visual do diálogo atual (glassmorphism).

### 2. Refatorar `GastosPage`
- Substituir o `<Dialog>` inline pelo novo componente `GastoFormDialog`.
- Sem mudança visual nem de comportamento.

### 3. Atualizar `EstrategiaDespesasMes.tsx`
- Adicionar botão "Novo Gasto" (estilo laranja como em GastosPage) no canto superior direito, ao lado do botão de status Pendente/Alana/Luan.
- Ao clicar, abre o `GastoFormDialog` com `defaultMes={mesValido}`.
- Após salvar, recarregar os dados de `DespesasResumoTopo` (passar um `refreshKey` incrementado via prop, ou expor um `onSaved` que faz `setRefreshKey(k => k+1)`).

### 4. Refresh do resumo
- Em `DespesasResumoTopo`, aceitar prop opcional `refreshKey: number` e incluí-la nas dependências do efeito que busca os dados, para que o resumo do mês atualize após o lançamento.

## Detalhes técnicos
- Hook `useGastos` já suporta save/update; usaremos com filtro do mês atual para que o autocomplete e refetch funcionem.
- Data padrão do gasto: se `defaultMes` for diferente do mês corrente, usar o dia 1 desse mês; senão, hoje.
- Nenhuma alteração de banco de dados ou RLS é necessária.

## Arquivos alterados
- `src/components/financeiro/GastoFormDialog.tsx` (novo)
- `src/pages/administrativo/GastosPage.tsx` (refatorar para usar o novo componente)
- `src/pages/direcao/estrategia/EstrategiaDespesasMes.tsx` (botão + dialog)
- `src/components/direcao/estrategia/DespesasResumoTopo.tsx` (prop `refreshKey`)
