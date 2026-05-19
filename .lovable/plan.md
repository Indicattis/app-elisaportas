## Adicionar listagem de vendas do mês no PDF da DRE

Nova seção final no PDF (`src/pages/direcao/DREMesDirecao.tsx`), após "Estoque", listando todas as vendas do mês com colunas:

- **Data** (dd/MM)
- **Cliente**
- **Valor Tabela** — soma bruta dos produtos (`valor_produto + valor_pintura + valor_instalacao`) × quantidade, sem desconto
- **Valor da Venda** — `vendas.valor_venda` (líquido, sem frete)
- **Desc./Acrésc.** — `valor_tabela − valor_venda_liquido`. Positivo = desconto (verde escuro), negativo = acréscimo (vermelho)
- **Lucro** — `vendas.lucro_total + lucro_instalacao` (com cor pelo sinal)

Linha TOTAL ao final somando as quatro colunas numéricas.

### Implementação técnica

1. **Novo state** `vendasListagem: VendaListagemRow[]` em `DREMesDirecao`.

2. **Fetch** no `useEffect` existente (junto com os outros): consulta única
   ```ts
   supabase.from('vendas')
     .select('id, data_venda, cliente_nome, valor_venda, valor_frete, lucro_total, lucro_instalacao, produtos_vendas(valor_produto, valor_pintura, valor_instalacao, quantidade)')
     .gte('data_venda', start + ' 00:00:00')
     .lte('data_venda', end + ' 23:59:59')
     .order('data_venda', { ascending: true });
   ```
   Para cada venda:
   - `valorTabela = Σ (valor_produto + valor_pintura + valor_instalacao) × quantidade`
   - `valorLiquido = valor_venda − (valor_frete || 0)`
   - `desconto = valorTabela − valorLiquido`
   - `lucro = (lucro_total || 0) + (lucro_instalacao || 0)`

3. **Nova seção no `PrintReport`** — "7. Vendas do Mês" (renumerar Estoque → 8 se necessário; atualmente Estoque é "6", então: 6. Estoque → 6. Vendas do Mês? Verificar a numeração atual e manter sequência consistente. A ordem final fica: 1. Faturamento por Categoria, 2. Resumo Final, 3. Folha, 4. Fixas, 5. Variáveis, 6. Estoque, **7. Vendas do Mês**).

4. **Nova prop** `vendasListagem` em `PrintReport` + nova `<table>` reaproveitando os estilos `TH`/`TD`/`trZebra`/`positive`/`formatCurrency`. `pageBreakInside: 'avoid'` no `<tbody>` apenas para a linha TOTAL; cabeçalho com `display: table-header-group` para repetir entre páginas.

5. **Escopo**: somente o PDF. A tela (read-only) permanece igual.
