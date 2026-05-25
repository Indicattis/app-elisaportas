## Mudanças em `/logistica/frete/internos`

### Novas colunas da tabela
1. **Número** — índice sequencial da linha (1, 2, 3...) baseado na lista filtrada
2. **Cidade** — `{cidade} - {estado}`
3. **Km (ida)** — editável inline (único campo preenchido manualmente)
4. **Ida e volta** — calculado: `km × 2`
5. **Valor** — calculado: `km × 2 × 3` = `km × 6` (em verde, formatado R$)
6. Ações (editar/excluir) — mantidas

Removidas da grade: Estado (vai junto da cidade), Valor do Frete (agora calculado), Observações, Ativo.

### Comportamento de salvamento
- Ao editar o Km inline, além de gravar `quilometragem`, o `valor_frete` será atualizado automaticamente para `km × 6` na mesma chamada `updateFrete`.
- Dialog "Novo/Editar Frete" (`FreteDialog.tsx`): remover o campo "Valor do Frete" e a sugestão automática invertida; manter apenas Estado, Cidade, Km, Observações, Ativo. Ao salvar, definir `valor_frete = quilometragem × 6` (se km vazio → 0).

### Filtros e ações do header
- Mantidos: busca, filtro por estado, Importar, PDF, Excel, Corrigir Acentos, Novo.

### Exportações (`fretesInternosExport.ts`)
- Atualizar colunas do PDF e Excel para: Nº, Cidade, Km (ida), Ida e volta, Valor.

### Arquivos a editar
- `src/pages/logistica/FreteMinimalista.tsx` — colunas, cálculo automático no save inline, formatação verde no valor.
- `src/components/frete/FreteDialog.tsx` — remover input "Valor do Frete", calcular `valor_frete` a partir do km no submit.
- `src/utils/fretesInternosExport.ts` — novo layout de colunas.

Nenhuma migração de schema; `valor_frete` continua no banco mas passa a ser sempre derivado de `quilometragem × 6`.