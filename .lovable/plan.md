# Relatório de Itens Avulsos por Vendedor

Nova página acessada por um botão em `/direcao/vendas/todas`, mostrando quanto cada vendedor vendeu de **adicionais e acessórios** no mês selecionado.

## 1. Botão em `/direcao/vendas/todas`

Em `src/pages/direcao/VendasTodas.tsx` (ou arquivo equivalente da rota), adicionar um botão discreto no header, ao lado dos filtros existentes:

- Label: **"Relatório de itens avulsos"**
- Ícone: `Package` (lucide-react)
- Ação: `navigate('/direcao/vendas/relatorio-itens-avulsos')`
- Mantém o estilo glassmorphism (bg-white/5, border-white/10) já usado na página.

## 2. Nova rota

- Path: `/direcao/vendas/relatorio-itens-avulsos`
- Registrar em `src/App.tsx` (ou onde ficam as rotas da direção) reutilizando o mesmo guard/layout de `/direcao/vendas/todas`.

## 3. Nova página `RelatorioItensAvulsos.tsx`

Local: `src/pages/direcao/RelatorioItensAvulsos.tsx`

### Header
- Título "Relatório de itens avulsos por vendedor"
- Botão "Voltar" para `/direcao/vendas/todas`
- **Seletor de mês/ano** (mês corrente por padrão), no mesmo estilo minimalista das outras telas de direção.

### Fonte de dados
Query única no Supabase:

```
produtos_vendas
  .select('id, tipo_produto, quantidade, valor_total, valor_unitario,
           venda:vendas!inner(id, vendedor_id, data_venda, status)')
  .in('tipo_produto', ['adicional', 'acessorio'])
  .gte('venda.data_venda', inicioMes)
  .lte('venda.data_venda', fimMes)
```

- Filtrar `venda.status` para excluir vendas canceladas (seguir o mesmo critério usado em `/direcao/vendas/todas`).
- Datas normalizadas com `T12:00:00.000Z` (regra de projeto).
- Buscar nomes dos vendedores em `admin_users` (id → nome) num segundo select paralelo, ou via join se já disponível.

### Agregação (client-side, via `useMemo`)
Por `vendedor_id`:
- `quantidade_itens`: soma de `quantidade`
- `valor_total`: soma de `valor_total`
- Ordenar por `valor_total` desc.
- Linha "Total geral" ao final.

### Layout
Tabela minimalista (mesmo padrão glass das outras telas de direção):

```text
| Vendedor        | Qtde itens | Valor total (R$) |
|-----------------|-----------:|-----------------:|
| Fulano          |         42 |         3.450,00 |
| Ciclano         |         18 |         1.120,00 |
| ...             |            |                  |
| Total           |         60 |         4.570,00 |
```

- Formatar valor em `pt-BR` (`toLocaleString`).
- Estado vazio: "Nenhum item avulso vendido no período".
- Loading skeleton nas linhas.

## 4. Fora do escopo
- Sem exportação (CSV/PDF).
- Sem detalhamento por item, sem ticket médio (métricas não pedidas).
- Sem alterações em vendas, produtos ou permissões.
- Sem intervalo customizado — apenas seletor de mês.

## Detalhes técnicos
- Reutilizar helper de formatação de moeda já existente no projeto se houver (`formatBRL` / `toLocaleString('pt-BR')`).
- React Query `queryKey: ['relatorio-itens-avulsos', mesRef]` com `staleTime` curto.
- Tipos:
  ```ts
  type LinhaRelatorio = {
    vendedor_id: string;
    vendedor_nome: string;
    quantidade_itens: number;
    valor_total: number;
  };
  ```
- Sem migração de banco: `produtos_vendas.tipo_produto` já suporta `'adicional'` e `'acessorio'`.
