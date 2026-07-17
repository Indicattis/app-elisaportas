
## Problemas confirmados no código

### 1. Acréscimo global não é salvo nem re-hidratado no rascunho
- `src/hooks/useVendas.ts` → `createRascunhoMutation` **não recebe** o `ajusteGlobal` do formulário. Só chegam `portas` (sem o ajuste aplicado) e `pagamentoData`.
- `src/pages/vendas/VendaNovaMinimalista.tsx` → `handleSalvarRascunho` envia `portas` (não `portasComAjusteGlobal`) e nunca passa o objeto `ajusteGlobal`.
- O `useEffect` de hidratação (linhas 257–347) restaura cliente, produtos, pagamento e crédito, mas **não restaura `ajusteGlobal`** — por isso o rascunho reabre sempre com "Desconto/Acréscimo Global = 0".

### 2. Endereço/Número são descartados no INSERT do rascunho
Em `useVendas.ts:791`:
```ts
const { endereco, numero, temperatura, cliente_id: _, ...vendaDataLimpo } = vendaData;
```
`temperatura` é reinserido depois em `vendaPayload`, mas `endereco` e `numero` são extraídos e **nunca recolocados** — as colunas ficam `NULL` no banco, então no reload do rascunho aparecem vazias.

### 3. Aviso "⚠ Valores não conferem com o total" com valores corretos
`src/components/vendas/PagamentoSection.tsx:348`:
```ts
const valoresConferem = !paymentData.usar_dois_metodos || (metodo1.valor + valorMetodo2 === valorTotal);
```
Comparação exata de floats — arredondamentos de centavo (ex.: 1234.5600000001 vs 1234.56) disparam o alerta mesmo quando visualmente idênticos.

## Correções

### A. Persistir e re-hidratar o acréscimo global no rascunho
1. `useVendas.ts` `createRascunhoMutation`:
   - Aceitar `ajusteGlobal?: AjusteGlobal` nos parâmetros.
   - Adicionar `ajuste_global` dentro do JSON `rascunho_pagamento` já existente (evita nova coluna): `{ tipo, unidade, valor }`.
2. `VendaNovaMinimalista.tsx` `handleSalvarRascunho`:
   - Passar `ajusteGlobal` para `createRascunho`.
3. `VendaNovaMinimalista.tsx` `useEffect` de hidratação:
   - Ler `snap.ajuste_global` e chamar `setAjusteGlobal(...)` com fallback para `{ tipo:'desconto', unidade:'%', valor:0 }`.

### B. Preservar `endereco` e `numero` no rascunho
Em `useVendas.ts` `createRascunhoMutation`, ao montar `vendaPayload` reincluir explicitamente `endereco` e `numero` (mesmo padrão feito com `temperatura`).

### C. Corrigir alerta de divergência de pagamento
Em `PagamentoSection.tsx`, trocar a comparação estrita por uma com tolerância de 1 centavo:
```ts
const valoresConferem = !paymentData.usar_dois_metodos
  || Math.abs((metodo1.valor + valorMetodo2) - valorTotal) < 0.01;
```

## Detalhes técnicos

- Nenhuma migração de banco necessária — o snapshot do ajuste é serializado dentro do JSON já existente em `vendas.rascunho_pagamento`.
- Rascunhos antigos sem `ajuste_global` continuam válidos (fallback para valor zero).
- A tolerância de R$ 0,01 na conferência é o padrão financeiro do próprio sistema (usado em outras validações de boleto).

## Arquivos afetados

- `src/hooks/useVendas.ts`
- `src/pages/vendas/VendaNovaMinimalista.tsx`
- `src/components/vendas/PagamentoSection.tsx`
