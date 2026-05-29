## Contexto

A migração anterior unificou as categorias **no faturamento** (`FaturamentoCategoria`), mas o componente `src/pages/direcao/DREMesDirecao.tsx` ainda mantém duas colunas separadas — `acessorios` e `adicionais` (Itens Avulso) — porque continua agregando por `tipo_produto` (`acessorio` vs `adicional`/`manutencao`) em vez de usar a categoria unificada.

## O que mudar

Arquivo único: `src/pages/direcao/DREMesDirecao.tsx`.

1. **Tipo `FaturamentoProduto`**: substituir `acessorios` e `adicionais` por um único campo `avulsos`.
2. **Colunas da tabela** (linha 1367): remover as duas entradas separadas e deixar apenas `{ key: 'avulsos', label: 'Itens Avulsos' }`.
3. **Agregação (linhas 1044-1048)**: somar `acessorio`, `adicional` e `manutencao` em `fat.avulsos` / `luc.avulsos`. Ajustar também `fat.total` / `luc.total`.
4. **Top 5 (linhas 1069-1090)**: fundir `acessoriosMap` + `adicionaisMap` em `avulsosMap` único → `topAvulsos`.
5. **Modal de detalhes (linhas 1283-1331)**: unir `acessoriosDetalhe` e `avulsosDetalhe` em um único `avulsosDetalhe` filtrando `['acessorio','adicional','manutencao']`; manter apenas `avulsosModalOpen` (remover `acessoriosModalOpen`).
6. **Header clicável (1399-1413)**: simplificar para apenas `isAvulsos` que abre o modal único.
7. **Props derivadas (linhas 298-322, 449-456, 1792-1793)**: ajustar para usar apenas `topAvulsos` / `faturamento.avulsos` / `lucro.avulsos`. Remover o cálculo de fallback `(acessorios + adicionais)` na seção embedded.
8. **Modal "Acessórios" (1630-1635)**: removido — só fica o "Itens Avulsos".

## Fora de escopo

- Nenhuma migração de banco (a categoria já foi unificada na tabela `categorias_faturamento`).
- Sem mudanças em `FaturamentoVendaMinimalista.tsx` (já está unificado).
- Sem mexer em lógica de lucro/custo.
