## Objetivo

Quando o vendedor adiciona um **item avulso** (acessório/adicional) em uma venda, o sistema deve listar e gravar a partir de **`custos_itens`** (tabela de cima em `/direcao/estrategia/itens`), e não mais de `vendas_catalogo` (tabela de baixo).

## Arquivos a alterar

**Cadastro/edição de venda (escrita):**
- `src/components/vendas/SelecionarAcessoriosModal.tsx` — lista vem de `custos_itens` (ordenada por `categoria` + `ordem`), grava `custos_itens_id` na linha do produto.
- `src/components/vendas/ProdutoVendaForm.tsx` — dropdowns de acessório e adicional consultam `custos_itens` e gravam `custos_itens_id`.
- `src/components/orcamentos/NovoOrcamentoForm.tsx` — mesmo tratamento ao converter/criar orçamento.
- `src/hooks/useVendas.ts` — tipo `ProdutoVenda` ganha `custos_itens_id` (já existe a coluna no banco desde a Fase 1).

**Exibição (leitura) — para o item avulso aparecer com o nome correto em vendas novas:**
- `src/hooks/useProdutosVenda.ts` — join muda para `custos_itens(descricao, unidade)` via `custos_itens_id`, com fallback para `vendas_catalogo` quando a venda for antiga.
- `src/components/pedidos/VendaPendenteDetalhesSheet.tsx` — mesmo fallback.
- `src/hooks/usePedidosAprovacaoDiretor.ts` — mesmo fallback.

## Como diferenciar "acessório" vs "adicional" em `custos_itens`

`custos_itens` tem `categoria` e `subcategoria` livres (definidos por você na própria tela). Antes de implementar, vou te perguntar quais categorias correspondem a "acessório" e quais a "adicional" (pode ser uma lista, ex.: acessório = ["Acessórios", "Motores"], adicional = ["Serviços", "Instalação extra"]). Se preferir, posso só listar **todos** os itens de `custos_itens` em ambos os dropdowns sem filtrar.

## O que NÃO faz parte deste plano

- Vendas antigas continuam exibindo o nome via `vendas_catalogo` (fallback). Nada quebra.
- A tabela `vendas_catalogo` continua existindo no banco e a aba "Catálogo de Itens" continua visível em `/direcao/estrategia/itens` (podemos remover depois, num passo separado, quando você confirmar que tudo está estável).
- Sem migrações de banco. A coluna `custos_itens_id` já foi adicionada anteriormente.

## Próximo passo

Antes de implementar, me diga: **quais categorias de `custos_itens` são "acessórios" e quais são "adicionais"?** Ou prefere que ambos os dropdowns mostrem todos os itens?