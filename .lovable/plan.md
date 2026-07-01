## Adicionar coluna "Instalação (Venda)" na tabela de Acordos do Mês

Adicionar uma nova coluna à direita de **Valor**, mostrando o valor do produto do tipo "instalação" da venda vinculada ao acordo.

### Onde
`src/pages/direcao/AcordosMesAutorizados.tsx` — tabela em `/autorizados/acordos/:ano/:mes`.

### Passos
1. **Buscar valores de instalação por venda**
   - Após carregar `acordos`, coletar todos os `venda_id` não nulos.
   - Consultar `produtos_vendas` filtrando por esses `venda_id` e `tipo_produto = 'instalacao'`.
   - Somar `valor_total` por `venda_id` e guardar em `Map<vendaId, number>` (estado local `instalacoesMap`).

2. **Nova coluna na tabela**
   - Adicionar `<TableHead>` "Instalação (Venda)" imediatamente após a coluna "Valor" (antes de "Valor excesso").
   - Adicionar `<TableCell>` correspondente em cada linha:
     - Se o acordo tem `venda_id` e há valor no map → exibe `formatCurrency(valor)` em azul/branco.
     - Se tem `venda_id` mas sem produto de instalação → exibe `R$ 0,00` em cinza.
     - Se não tem `venda_id` (acordo avulso) → exibe `—`.

3. **Ajustar colSpan** do cabeçalho de grupo de autorizado (`colSpan = 16 + …`) para `17 + …`, refletindo a nova coluna.

### Detalhes técnicos
- A tabela `produtos_vendas` já tem RLS ativo; usar `supabase.from('produtos_vendas').select('venda_id, valor_total').in('venda_id', ids).eq('tipo_produto', 'instalacao')`.
- Manter `useEffect` disparado quando `acordos` muda, semelhante ao já existente para `precosMap`.
- Sem alterações no banco de dados.
