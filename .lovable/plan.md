## Diagnóstico

Na venda `e60a7adf…` (temperatura=false → Fria, forma=à vista, produtos totalizam R$ 506 com desconto de R$ 56 = 11,07%):

- **Coluna "Excedido"** em `/direcao/vendas/todas` usa `calcularExcedidoDesconto` (linhas 101-118 de `VendasDirecao.tsx`), que só soma **À Vista + Frio** como limite (3% + 5% = 8%). Qualquer coisa acima de 8% cai como excedido → mostra R$ 15,55 excedido.
- **Tooltip** usa `calcDescontoTiersAplicados` + separação Gerente/Diretor com `limResponsavel = 7%`. Nesse mesmo caso: Gerente 3,07% (R$ 15,55), Diretor 0 → nada de excesso real.
- Em `/marketing/balanco-descontos` (`BalancoDescontos.tsx` linhas 88-116) a regra é a correta: o limite inclui a faixa Gerente quando houver autorização ou o desconto ultrapasse o limite base — só é "excedido" o que passar de À Vista + Frio + Gerente.

Ou seja: `calcularExcedidoDesconto` em `VendasDirecao.tsx` está desalinhado. Vendas com desconto entre 8% e 15% aparecem "excedidas" indevidamente (é justamente a percepção "todas parecem ter excesso").

## Alteração

Arquivo único: `src/pages/direcao/VendasDirecao.tsx`

Ajustar `calcularExcedidoDesconto` (linhas 101-118) para incluir a faixa Gerente no limite, seguindo o padrão de `BalancoDescontos.tsx`:

```ts
const calcularExcedidoDesconto = (
  venda: any,
  limAvista: number,
  limPresencial: number,
  limResponsavel: number
): { excedidoPct: number; excedidoValor: number } => {
  const produtos = venda?.produtos || [];
  const totalBase = calcularTotalVenda(produtos);
  if (totalBase <= 0) return { excedidoPct: 0, excedidoValor: 0 };

  const descontoTotal = calcularDescontoTotalRegras(produtos);
  const pctDado = (descontoTotal / totalBase) * 100;

  const formaPg = (venda?.forma_pagamento || '').trim();
  const aptoAvista = formaPg !== '' && formaPg !== 'cartao_credito';
  const aptoFrio = venda?.temperatura === false;
  const limiteBase = (aptoAvista ? limAvista : 0) + (aptoFrio ? limPresencial : 0);
  const aptoGerente =
    !!venda?.autorizacao_desconto?.[0] || pctDado > limiteBase;
  const limite = limiteBase + (aptoGerente ? limResponsavel : 0);

  const excedidoPct = Math.max(0, pctDado - limite);
  const excedidoValor = (excedidoPct / 100) * totalBase;
  return { excedidoPct, excedidoValor };
};
```

E propagar `limResponsavel` nas duas chamadas existentes:

- `calcularLucroReal(venda, limAvista, limPresencial)` → adicionar `limResponsavel` na assinatura e passar adiante para `calcularExcedidoDesconto`.
- No `useMemo` do sort (~linha 477): `calcularExcedidoDesconto(venda, limAvista, limPresencial, limResponsavel)` e `calcularLucroReal(venda, limAvista, limPresencial, limResponsavel)`.
- Na célula `excedido_desconto` (~linha 1005): mesma coisa.
- Incluir `limResponsavel` nas deps do `useMemo` do sort.

Nenhuma mudança de dados no banco, nenhuma outra tela alterada.

Depois disso, a venda `e60a7adf…` (11%) sai da lista de "excedido" — tanto a coluna quanto o tooltip mostram consistente: Gerente 3,07%, Diretor R$ 0, Excedido "-".
