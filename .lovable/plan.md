## Incluir medidas (Largura × Altura) nas exportações

Atualmente `exportEstrategiaPrecosPDF` e `exportEstrategiaPrecosExcel` em `src/utils/estrategiaPrecosExport.ts` exportam apenas Descrição/Porta/Instalação/Pintura/Total dos kits, sem `largura` e `altura` que existem em `ItemTabelaPreco`.

### Mudanças (apenas em `src/utils/estrategiaPrecosExport.ts`)

**PDF — seção "Kits de Portas":**
- Header passa de `["#", "Descrição", "Porta", ...]` para `["#", "Descrição", "L (m)", "A (m)", "Porta", "Instalação", "Pintura", "Total"]`.
- Linhas incluem `k.largura` e `k.altura`.
- Ajustar `columnStyles` (centralizar L/A, deslocar índices das colunas de valor).

**Excel — aba "Kits":**
- Mesma alteração de header e linhas.
- Atualizar `!cols` com larguras para as duas novas colunas.

Catálogo não tem medidas e permanece inalterado.