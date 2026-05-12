## Objetivo

Em `/administrativo/compras/requisicoes`, capturar todos os campos exigidos pelo PDF padrão Bling e gerar um PDF com o mesmo layout do anexo.

## 1. Migration — novos campos por item

Adicionar em `requisicoes_compra_itens` (quantidade segue INTEGER):

```sql
ALTER TABLE public.requisicoes_compra_itens
  ADD COLUMN IF NOT EXISTS valor_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_fornecedor text,
  ADD COLUMN IF NOT EXISTS localizacao text;
```

Os campos legados `preco_unitario`/`preco_total` permanecem para retrocompatibilidade (não usados no novo fluxo).

## 2. Form — `src/components/compras/RequisicaoCompraForm.tsx`

Trocar a área "Adicionar Item" por uma tabela editável com colunas:

- Produto (Select do estoque — já existe)
- Un (auto, exibe `produto.unidade` somente leitura)
- Quantidade (number, INTEGER ≥ 1)
- Valor unitário (number, BRL com 2 casas)
- IPI % (number, default 0)
- Código fornecedor (text, opcional)
- Localização (text, opcional)
- Observações (text, opcional)
- Valor total = `quantidade × valor_unitario × (1 + ipi_percent/100)` (somente leitura)
- Remover linha

Rodapé do bloco mostra: Nº de itens, Soma das quantidades, Total de produtos, Total de IPI, Total do pedido.

## 3. Hook — `src/hooks/useRequisicoesCompra.ts`

- Adicionar `valor_unitario`, `ipi_percent`, `codigo_fornecedor`, `localizacao` em `RequisicaoCompraItem`.
- No `createMutation`: persistir esses campos e calcular `valor_total` da requisição (`Σ qtd × valor_unitario × (1+ipi/100)`).
- No fetch: trazer os mesmos campos (já vem com `select *`).

## 4. Detalhes (Sheet) — `RequisicoesMinimalista.tsx`

Adicionar colunas Un, Valor unit., IPI, Total na tabela de itens e um botão **Exportar PDF** ao lado de "Ver Detalhes" / no Sheet.

## 5. PDF — `src/utils/pedidoCompraPDF.ts` (novo)

Função `gerarPedidoCompraPDF(requisicao, fornecedor, company)` usando `jsPDF` + `jspdf-autotable` (ambos já no projeto, ver `listaComprasPDF.ts`).

Layout (1 página A4 retrato), replicando o anexo:

```text
[topo direito] data/hora geração
Pedido de compra Nº {numero_requisicao}

{company.nome} - {company.telefone}
{company.endereco}
{company.cep} - {company.cidade}
CNPJ: {company.cnpj}
{company.cidade}, {data_emissao}

Fornecedor
{fornecedor.nome}
CNPJ: {fornecedor.cnpj}, {fornecedor.cidade}, {fornecedor.estado}

| Número do pedido | {numero_requisicao} |
| Data             | {created_at}        |
| Data prevista    | {data_necessidade}  |

Itens do pedido de compra
| Descrição | Código | Cód. fornec. | Localização | Un | Qtde | Valor unit. | IPI % | Valor total |

Rodapé totais:
  N° de itens, Soma das Qtdes, Total de produtos, Total do IPI, Total do pedido

Observações
{observacoes}
```

Notas:

- IE não é exibido (decisão do usuário).
- Valores formatados com 10 casas decimais como o original (`toFixed(10)` com vírgula como separador, mantendo o visual do Bling). Cabeçalhos e totais em bold.
- `Código` = `produto.sku` se existir, senão vazio.
- `Un` = `produto.unidade`.

## 6. Integração

- Botão "Exportar PDF" chama `gerarPedidoCompraPDF` com a requisição já carregada (estende a query do hook para trazer `fornecedor.endereco/cidade/estado/cep` e `estoque.sku/unidade`).
- Buscar `company_settings` via `useCompanySettings` (já existe).

## Fora de escopo

- Não altera fluxo de aprovação, status, ou integrações fiscais.
- Não adiciona campo IE em `company_settings`.
- Quantidade segue INTEGER (decisão do usuário).
- `preco_unitario`/`preco_total` legados permanecem na tabela.