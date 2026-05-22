## Objetivo
Permitir exportar a tabela de `/direcao/estrategia/itens` em **PDF** e **Excel**, respeitando a ordenação atual por categorias e o filtro de busca.

## Bibliotecas
Já instaladas no projeto:
- `jspdf` + `jspdf-autotable` (PDF)
- `xlsx` (Excel)

Sem novas dependências.

## Mudanças

### 1. Novo utilitário `src/utils/estrategiaItensExport.ts`
Duas funções puras que recebem os grupos já ordenados (`[categoria, itens][]`):

- `exportEstrategiaItensPDF(grupos)`
  - jsPDF paisagem A4
  - Título "Itens — Estratégia" + data atual
  - Uma tabela por categoria (autoTable) com colunas:
    Descrição · Custo · Lucro · Imposto (R$) · Desc. Gerente (R$) · Cartão (R$) · Valor de Venda
  - Linha final com totais (custo, lucro, valor de venda)
  - Salva como `itens-estrategia-YYYY-MM-DD.pdf`

- `exportEstrategiaItensExcel(grupos)`
  - Uma aba única com cabeçalho colorido e blocos por categoria, ou uma aba por categoria (vou usar aba única com coluna "Categoria" para facilitar pivots)
  - Valores numéricos puros (sem "R$") com `z = 'R$ #,##0.00'` para custo/lucro/impostos/etc.
  - Linha de totais ao final
  - Salva como `itens-estrategia-YYYY-MM-DD.xlsx`

### 2. `src/pages/direcao/estrategia/EstrategiaItens.tsx`
- Importar `FileText` e `FileSpreadsheet` de `lucide-react`
- Adicionar dois botões na barra superior, ao lado de "Cores das colunas":
  - **Exportar PDF** (vermelho suave)
  - **Exportar Excel** (verde suave)
- Cada botão chama o util passando `groupedByCategoria` (já filtrado + ordenado).
- Toast de sucesso/erro.

## Detalhes técnicos
- Os valores de imposto/desconto/cartão são salvos como **%** no banco — a exportação calculará `preço × % / 100` para mostrar em R$, igual à UI atual.
- Lucro = `preço − custo − (preço × (tImp+tDesc+tCard)/100)`.
- Respeita o filtro de busca atual (usa `groupedByCategoria`, não `items` cru).

## Arquivos
- **Novo:** `src/utils/estrategiaItensExport.ts`
- **Editado:** `src/pages/direcao/estrategia/EstrategiaItens.tsx`
