## Bug: temperatura sempre salva como "Quente"

### Causa raiz

A temperatura da venda é armazenada em `vendas.venda_presencial` (boolean, NOT NULL, `DEFAULT true`), onde `true = Quente` e `false = Fria`. Toda a UI (cadastro, edição, listagens, sheets, painel de direção) grava e lê a partir desse campo.

Em `src/hooks/useVendas.ts` há **dois pontos** que sabotam o valor escolhido pelo vendedor:

- Linha 347 (criação de venda "cheia"):
  ```ts
  const { endereco, venda_presencial, cliente_id: _, ...vendaDataLimpo } = vendaData;
  ```
- Linha 680 (criação de rascunho):
  ```ts
  const { endereco, venda_presencial, cliente_id: _, ...vendaDataLimpo } = vendaData;
  ```

Nos dois casos `venda_presencial` é retirado do objeto e **nunca reintroduzido** no `vendaPayload` que é enviado para o `insert` na tabela `vendas`. Como a coluna tem `DEFAULT true`, o Postgres grava sempre `true` (Quente), independentemente do usuário ter clicado em "Fria" no cadastro. Por isso todas as telas que exibem `venda_presencial ? 'Quente' : 'Fria'` mostram Quente.

Confirmado no schema:
```text
venda_presencial | boolean | NOT NULL | default: true
```

### Correção

Incluir `venda_presencial` explicitamente no payload de insert nos dois fluxos em `src/hooks/useVendas.ts`, preservando `false` quando o usuário escolhe "Fria" e caindo para `true` (default) apenas quando vier `undefined/null`:

1. **Insert de venda final (~linha 357–379)** — adicionar no `vendaPayload`:
   ```ts
   venda_presencial: venda_presencial ?? true,
   ```
2. **Insert de rascunho (~linha 683–702)** — mesma linha adicional no `vendaPayload`.

Nenhum outro lugar precisa mudar: os componentes de leitura (`PedidoDetalhesSheet`, `VendaPendenteDetalhesSheet`, hooks `useVendasPendentePedido/Faturamento/AssinaturaContrato`, `usePedidosEtapas`, `useBalancoDescontos`, `VendasDirecao`, `VendaView`, `VendaEdit` etc.) já dependem apenas do valor persistido — assim que a gravação for corrigida, "Fria" passa a aparecer corretamente em toda a aplicação.

### Fora de escopo

- Vendas antigas já gravadas como Quente por causa do bug: não serão corrigidas retroativamente (não temos como saber a intenção original do vendedor). Se desejar, num passo seguinte podemos abrir uma tela/rotina para o setor comercial revisar essas vendas manualmente — mas isso é outro trabalho.
- Renomear o campo `venda_presencial` para algo como `temperatura` continua fora do escopo por impacto amplo.
