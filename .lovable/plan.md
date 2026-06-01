## Nova regra de vendas

Quando uma venda usa **senha master** (desconto total acima do limite configurado, padrão **15%**), o **valor excedente em R$** é abatido do **lucro da venda** no faturamento.

Fórmula:
```text
desconto_excedente_pct = max(0, %_desconto_total - limite_master)
valor_excedente_R$     = total_bruto_venda * (desconto_excedente_pct / 100)
lucro_liquido_venda    = soma(lucro_item dos faturados) + lucro_instalacao - valor_excedente_R$
```

Onde `total_bruto_venda = soma((valor_produto + valor_pintura + valor_instalacao) * qtd)` (mesma base usada hoje em `calcularTotalVenda` / `validarDesconto`).

## Mudanças

### 1. Página de Regras (`/vendas/regras`)
- Nova seção **"Desconto Master"** explicando:
  - Acima do limite (15% por padrão), exige senha master.
  - O valor excedente em R$ é **debitado do lucro** da venda no faturamento.
- Mostrar o valor configurado (puxado de `regras_vendas.limite_desconto_master_lucro`).

### 2. Banco — `regras_vendas`
Adicionar coluna:
- `limite_desconto_master_lucro NUMERIC NOT NULL DEFAULT 15` — % acima do qual o excedente é debitado do lucro.

(Migração separada via `supabase--migration` antes do código.)

### 3. Cálculo no Faturamento
Criar util `src/utils/descontoMasterLucro.ts`:
```ts
calcularDebitoMasterLucro(venda, produtos, limitePct) -> {
  percentualDesconto, percentualExcedente, valorExcedente
}
```

Integrar em:
- `src/pages/direcao/FaturamentoVendaDirecao.tsx` — subtrair `valorExcedente` de `lucroBruto`; exibir linha "Excedente desconto master (>15%) — débito no lucro: -R$ X" no card de lucro.
- `src/hooks/useFaturamentoDetalhado.ts` e `src/hooks/useFaturamentoPorProduto.ts` — descontar o excedente do `lucro_total` agregado por venda (rateado proporcionalmente entre produtos faturados para não distorcer agrupamento por tipo).
- `src/utils/faturamentoPDFGenerator.ts` — mesmo ajuste no PDF de faturamento.
- `src/hooks/useDRE.ts` — refletir lucro líquido após débito.

### 4. Hook
Adicionar `limite_desconto_master_lucro` em `useRegrasVendas` (interface + `limites`) e expor via `useConfiguracoesVendasPublicas` para uso no faturamento.

## Fora do escopo
- Não altera o fluxo de autorização do desconto (modais, RPC `verificar_senha_vendas`, gravação em `vendas_autorizacoes_desconto`).
- Não altera o `lucro_item` salvo por produto — o débito é aplicado **na exibição/agregação** do faturamento, mantendo rastreabilidade.

## Pontos a confirmar
1. **Limite fixo configurável (15%) ou usar `avista + fria + adicionalResponsavel` já existente?** Proposta: nova coluna dedicada `limite_desconto_master_lucro` (padrão 15%), independente dos limites de autorização — assim você pode mover o gatilho do débito sem mexer nas regras de senha.
2. **Base do excedente:** total bruto antes de descontos (proposta acima) — confirma?
