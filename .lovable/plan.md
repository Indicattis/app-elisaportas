## Diagnóstico

Na venda `27582af7…`, o banco tem `temperatura = true`, que em toda a aplicação significa **Quente** (`VendaEditarMinimalista.tsx:374`: `venda.temperatura ? 'Quente' : 'Fria'`). O cálculo dos tiers de desconto em `FaturamentoVendaMinimalista.tsx:1129` está correto — usa `vendaPresencial: venda?.temperatura === false`, ou seja, só libera a faixa "Frio" quando a venda é fria. Como esta venda é Quente, o desconto não entra no tier "Frio", que é o comportamento esperado.

O problema está apenas no **badge visual** em `FaturamentoVendaMinimalista.tsx:1887-1890`, que está invertido em relação ao restante do sistema:

```tsx
{venda.temperatura ? (
  <Badge …>❄️ Fria</Badge>      // ❌ true está sendo rotulado como Fria
) : (
  <Badge …>🔥 Quente</Badge>    // ❌ false como Quente
)}
```

Isso faz o usuário ver "Fria" numa venda Quente e concluir que o tier de desconto não foi aplicado.

## Alteração

Arquivo: `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` (linhas 1887-1890)

Inverter o badge para casar com o padrão do sistema:

```tsx
{venda.temperatura ? (
  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">🔥 Quente</Badge>
) : (
  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">❄️ Fria</Badge>
)}
```

Nenhuma outra mudança — a lógica de tiers já está correta.
