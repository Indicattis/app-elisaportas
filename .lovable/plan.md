## Objetivo
Adicionar botões "Exportar PDF" e "Exportar Excel" em `/direcao/estrategia/precos`, gerando arquivos únicos que combinam as duas tabelas (Kits de portas + Catálogo).

## Implementação

### 1. Novo utilitário `src/utils/estrategiaPrecosExport.ts`
Funções `exportEstrategiaPrecosPDF(kits, catalogo)` e `exportEstrategiaPrecosExcel(kits, catalogo)`:

- **PDF (jsPDF + autoTable, landscape A4)**:
  - Título "Tabela de Preços — Estratégia" + data
  - Seção 1: "Kits de Portas" — tabela com colunas Ordem, Item, P, G, GG, Total (P+G+GG)
  - Seção 2: "Catálogo" — agrupado por categoria, colunas Produto, Unidade, Custo, Preço de Venda

- **Excel (xlsx)**: duas planilhas — "Kits" e "Catálogo" — com as mesmas colunas/dados acima.

### 2. `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`
- Buscar os dados via hooks existentes (`useTabelaPrecos` e `useVendasCatalogo`) no nível da página.
- Adicionar header com dois botões (mesmo estilo dos de `EstrategiaItens.tsx`: `Exportar PDF` e `Exportar Excel`) com toast de sucesso/erro.
- Manter o layout atual (grid xl:col-span-2 + xl:col-span-1) abaixo do header.

### 3. Sem mudança de lógica de negócio
Os componentes `TabelaPrecos` e `CatalogoPrecosTab` continuam buscando seus próprios dados normalmente; o fetch na página é só para o export.

## Arquivos
- criar: `src/utils/estrategiaPrecosExport.ts`
- editar: `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`