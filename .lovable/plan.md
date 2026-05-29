## Unificar Acessórios + Adicionais em "Itens Avulsos"

Em `/financeiro/faturamento/vendas` os cards de **Acessórios** e **Adicionais** serão substituídos por um único indicador chamado **Itens Avulsos**, agregando linhas de `produtos_vendas` com `tipo_produto IN ('acessorio', 'adicional', 'manutencao')` (cobre o histórico legado e os novos itens vinculados a `custos_itens` via `custos_itens_id`).

### Mudanças (apenas frontend — sem alteração de schema)

Arquivo: `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

1. **Indicadores agregados** (linhas 537–583)
   - Remover `valorBrutoAcessorios`, `lucroAcessorios`, `valorBrutoAdicionais`, `lucroAdicionais`.
   - Criar `valorBrutoAvulsos` e `lucroAvulsos` somando linhas com `tipo_produto IN ('acessorio', 'adicional', 'manutencao')`.

2. **Card de indicador** (linhas 1247–1248)
   - Substituir os dois cards por um único card `key: 'avulsos'`, label "Itens Avulsos", ícone `Package` (cor neutra, ex.: emerald), quantidade = vendas que contêm qualquer linha avulsa.
   - Atualizar a soma `faturamentoTotal` (linha 1242) para usar `valorBrutoAvulsos`.

3. **Agrupamento ao clicar no card** (linhas 630–654)
   - Unificar os branches `indicadorAtivo === 'acessorios'` e `'adicionais'` em um único branch `'avulsos'` que percorre todas as linhas avulsas.
   - Chave de agrupamento: preferir `custos_itens_id`, depois `acessorio_id`/`adicional_id`, depois `descricao`.
   - Nome exibido: priorizar lookup em `custos_itens` (descricao) via novo Map, com fallback para os Maps existentes (`auxAcessorios`/`auxAdicionais`) e por fim `p.descricao`.

4. **Lookup de nomes de `custos_itens`** (linhas 159–225)
   - Adicionar `const [auxCustosItens, setAuxCustosItens] = useState<Map<string, string>>(new Map())`.
   - No `Promise.all` de fetch auxiliar, incluir `supabase.from('custos_itens').select('id, descricao')` e popular o Map.
   - Manter os Maps de `acessorios`/`adicionais` para resolver nomes do histórico legado.

5. **Select de `produtos_vendas`** (linha 281)
   - Garantir que `custos_itens_id` está no select (verificar; adicionar se faltar).

6. **Detalhe da venda** (linhas 959–1011)
   - Substituir `valorAcessorios` + `valorAdicionais` por `valorAvulsos` no breakdown da venda selecionada e no array de chips.

### Fora de escopo

- Nenhuma migration: `tipo_produto` continua sendo `'acessorio'` ou `'adicional'` no banco; a unificação é apenas de apresentação.
- Sem alteração no fluxo de criação/edição de venda (`ProdutoVendaForm`).
- Sem mudança em outras telas (DRE, faturamento por produto, etc.).