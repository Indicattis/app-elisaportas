# Incluir Itens Avulsos no PDF

## Problema
Em `/direcao/estrategia/precos`, o botão "Exportar PDF" gera apenas a seção de Kits. Os Itens Avulsos exibidos na sidebar não aparecem no PDF (o Excel também não os inclui).

## Solução

### 1. `src/utils/estrategiaPrecosExport.ts`
- Aceitar um segundo parâmetro `itensAvulso: CustoItem[]` em `exportEstrategiaPrecosPDF` e `exportEstrategiaPrecosExcel`.
- No PDF: após a tabela de Kits, adicionar nova seção "Itens Avulso" agrupada por categoria, com colunas: Nome, Unidade, Preço/un. Usar `autoTable` com quebra de página automática.
- No Excel: adicionar uma segunda aba "Itens Avulso" com as mesmas colunas.

### 2. `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`
- Passar `itensAvulso` (já calculado no componente) para as funções de exportação.

## Escopo
Apenas frontend/apresentação. Sem alteração de dados ou regras de negócio.
