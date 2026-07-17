# Detalhamento de Portas em /direcao/vendas/todas

Ao clicar no card KPI **"Portas"**, abrir um modal com a listagem de cada porta vendida no período/filtro atualmente aplicado, exibindo as mesmas colunas financeiras da tabela principal.

## Escopo

- Apenas o card **"Portas"** vira clicável (cursor pointer + hover). Nenhum outro comportamento da página muda.
- O modal respeita os filtros já ativos: mês selecionado (`selectedMonth`), vendedor (`selectedAtendente`), busca, etc. — reaproveita `filteredVendas`.
- Cada linha do modal = **um item de porta** (`produtos_vendas.tipo_produto = 'porta_enrolar'` ou `'porta_social'`) das vendas filtradas, agrupado por venda no cabeçalho.

## Colunas do modal

Idênticas às da tabela /direcao/vendas/todas para consistência visual:

1. **Cliente** — nome do cliente da venda (linha de grupo)
2. **Porta** — descrição + dimensões (largura × altura) + cor + quantidade
3. **Valor Tabela** — preço de tabela da porta (via `tabelaPrecosHelper` já usado em `useVendasPendentePedido`)
4. **Frete** — `vendas.valor_frete` rateado proporcionalmente entre as portas da venda (mesma lógica usada no faturamento)
5. **Desconto** — `desconto_valor`/`desconto_percentual` do item de porta
6. **Valor Final** — `valor_total` do item (já com desconto aplicado)
7. **Excedido** — reuso de `calcularExcedidoDesconto` (venda-level, mostrado na linha da venda)
8. **Lucro** — `lucro_item` da porta (fallback: `valor_final − custo_producao`)

Rodapé do modal com totais das colunas numéricas.

## Detalhes técnicos

- Novo componente: `src/components/direcao/PortasDetalhesModal.tsx` (Dialog shadcn, glassmorphism igual ao restante).
- Em `VendasDirecao.tsx`:
  - Adicionar `useState` `portasModalOpen`.
  - Envolver o card "Portas" (linhas ~1260–1270) com `<button onClick={() => setPortasModalOpen(true)}>` mantendo estilos atuais.
  - Renderizar `<PortasDetalhesModal open=... vendas={filteredVendas} />`.
- O modal reaproveita helpers já existentes:
  - `calcularExcedidoDesconto` (mesmo arquivo)
  - `tabelaPrecosHelper` (para `valor_tabela` por porta)
  - `formatCurrency`
- Sem novas queries: os dados já vêm em `filteredVendas.produtos`. Se `valor_tabela` não estiver pré-computado, calcular no modal via helper existente.

## Fora do escopo

- Não altera exportação PDF/Excel.
- Não altera hooks de dados.
- Cards "Vendas" e "Valor" continuam não-clicáveis.
