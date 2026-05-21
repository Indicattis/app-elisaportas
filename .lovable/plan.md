## Exportação PDF/Excel em /logistica/frete/internos

Adicionar dois botões no header ("Exportar PDF" e "Exportar Excel") que exportam a lista de fretes por cidade atualmente filtrada (respeitando busca e filtro de estado).

### Colunas exportadas
Estado, Cidade, Valor do Frete (R$), Km, Observações, Ativo (Sim/Não).

### Implementação

**1. `src/utils/fretesInternosExport.ts`** (novo)
- `exportarFretesPDF(fretes)`: usa `jsPDF` + `jspdf-autotable` (já no projeto, vide `relatorioMateriaisPDF.ts`). Orientação retrato A4, título "Frete por Cidade — Valores Internos", data de geração, total de registros, tabela com as colunas acima. Salva como `fretes-internos-YYYY-MM-DD.pdf`.
- `exportarFretesExcel(fretes)`: usa `xlsx` (SheetJS). Gera workbook com uma aba "Fretes Internos", cabeçalho em negrito (via larguras de coluna), valor formatado como número, linhas ordenadas por Estado/Cidade. Salva como `fretes-internos-YYYY-MM-DD.xlsx`.
- Se `xlsx` não estiver instalado, instalar via `bun add xlsx`.

**2. `src/pages/logistica/FreteMinimalista.tsx`**
- Adicionar dois `<Button>` no `headerActions` (entre "Importar" e o botão "Novo"): "PDF" (ícone `FileText`) e "Excel" (ícone `FileSpreadsheet`), mesmo estilo outline do botão "Importar".
- Handlers chamam os utils acima passando `fretesFiltrados`.
- Toast de sucesso/erro.

### Observações
- Exporta o que está visível (lista já filtrada por busca + estado), não a base inteira — alinhado com o comportamento esperado de relatórios filtráveis.
- Nenhuma mudança em hooks ou banco de dados.
