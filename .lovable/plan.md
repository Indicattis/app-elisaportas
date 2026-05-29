## Regra confirmada

- Venda com 2 métodos: método 1 = entrada, método 2 = restante.
- Se `pagamento_na_entrega = true` → método 2 é o valor a receber na entrega.

## Estado atual

- **PedidoCard** (downbar dos pedidos): já tem coluna "Valor a Receber" que exibe `vendas.valor_a_receber` quando > 0. Funciona quando o campo está populado.
- **VendaPendentePedidoCard** (downbar das vendas pendentes em `/direcao/gestao-fabrica`): mostra apenas um badge "Sim/—" para `pagamento_na_entrega`, sem informar o valor.

## Mudanças

### 1. Hooks — expor `valor_a_receber_entrega`

Arquivos:
- `src/hooks/useVendasPendentePedido.ts`
- `src/hooks/useVendasPendenteFaturamento.ts`
- `src/hooks/useVendasAssinaturaContrato.ts`

Em cada hook:

a) Incluir `valor_a_receber` no `select` de `vendas`.

b) Estender a leitura de `contas_receber` para também somar `valor_parcela` por `(venda_id, metodo_pagamento)`:

```ts
const totalPorMetodoPorVenda = new Map<string, Map<string, number>>();
// dentro do forEach existente:
const metodo = conta.metodo_pagamento ?? "_";
const map = totalPorMetodoPorVenda.get(conta.venda_id) ?? new Map();
map.set(metodo, (map.get(metodo) ?? 0) + Number(conta.valor_parcela ?? 0));
totalPorMetodoPorVenda.set(conta.venda_id, map);
```

c) No mapeamento final da venda, calcular:

```ts
const metodos = pagamentoMetodosPorVenda.get(v.id) || [];
const metodoEntrega = metodos.length > 1 ? metodos[1] : null;
let valorAReceberEntrega: number | null = null;
if (v.pagamento_na_entrega) {
  if (metodoEntrega) {
    valorAReceberEntrega =
      totalPorMetodoPorVenda.get(v.id)?.get(metodoEntrega) ?? null;
  }
  if (!valorAReceberEntrega || valorAReceberEntrega <= 0) {
    valorAReceberEntrega = Number(v.valor_a_receber ?? 0) || null;
  }
}
```

d) Adicionar `valor_a_receber_entrega: number | null` à interface `VendaPendentePedido` (e análogos) e retorno.

### 2. `VendaPendentePedidoCard.tsx` — coluna "Pago na entrega"

Substituir o badge "Sim/—" pelo valor formatado quando houver:

```tsx
{/* Pago na entrega */}
<div className="text-center">
  {venda.pagamento_na_entrega ? (
    venda.valor_a_receber_entrega ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 rounded px-1 py-0.5">
            {formatCurrency(venda.valor_a_receber_entrega)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Valor a receber na entrega</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/50">
        Sim
      </Badge>
    )
  ) : (
    <span className="text-[9px] text-muted-foreground/50">—</span>
  )}
</div>
```

(Header da coluna mantém "Entrega" se já existir, sem rename necessário.)

### 3. `PedidoCard.tsx` — fallback quando `pagamento_na_entrega` e manual vazio

Em `exibirValorAReceber()` (linha ~610), adicionar fallback final:

```ts
if (venda?.pagamento_na_entrega && venda?.valor_a_receber_entrega && venda.valor_a_receber_entrega > 0) {
  const v = formatCurrency(venda.valor_a_receber_entrega);
  return prefixo ? `${prefixo}${v}` : v;
}
return null;
```

Adicionar `valor_a_receber_entrega` ao `select` de `usePedidosEtapas.ts` calculando da mesma forma (sum de contas_receber por método 2). Para evitar duplicar a lógica, expor um helper utilitário ou refazer o mesmo cálculo lá.

### 4. Helper único

Criar `src/utils/valorAReceberEntrega.ts`:

```ts
export function calcularValorAReceberEntrega(
  pagamentoNaEntrega: boolean | null,
  metodos: string[],
  totalPorMetodo: Map<string, number>,
  valorAReceberVenda: number | null,
): number | null {
  if (!pagamentoNaEntrega) return null;
  const metodoEntrega = metodos.length > 1 ? metodos[1] : null;
  let v = metodoEntrega ? totalPorMetodo.get(metodoEntrega) ?? 0 : 0;
  if (v <= 0) v = Number(valorAReceberVenda ?? 0);
  return v > 0 ? v : null;
}
```

Usado pelos 4 hooks (3 hooks de venda + `usePedidosEtapas`).

## Fora de escopo

- Não muda o cadastro de venda nem `vendas.valor_a_receber` no banco.
- Não muda o popover de edição manual em `PedidoCard` (continua disponível para sobrescrever).

## Validação

Em `/direcao/gestao-fabrica`:
- Venda pendente com `pagamento_na_entrega=true` mostra o valor na coluna "Entrega" da downbar (em vez de só "Sim").
- Pedido cuja venda tem `pagamento_na_entrega=true` mostra valor na coluna "Valor a Receber" mesmo sem input manual.