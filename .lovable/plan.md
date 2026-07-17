## Objetivo

Recriar o fluxo de rascunho em `/vendas/minhas-vendas/nova`:
- Vendedor pode salvar como rascunho **sem** validação de desconto/pagamento.
- Rascunho fica **somente visualização** (não é editável direto).
- Ao "Transformar em Venda", o sistema aplica **todas** as regras vigentes (descontos, senhas de responsável/master, boleto 70/30/21d, comprovantes obrigatórios, campos obrigatórios etc.) reutilizando o mesmo pipeline do cadastro novo.

## Escopo de arquivos

1. **`src/hooks/useVendas.ts` — `createRascunhoMutation`**
   - Continua sem validar regras.
   - Passa a persistir também o snapshot completo do pagamento em uma coluna JSON `rascunho_pagamento` em `vendas` (metodos, valor_entrada, data_pagamento, credito, comprovantes anexados). Assim o rascunho re-hidrata 1:1 no formulário.
   - Não gera `contas_receber` (só na conversão).

2. **Migração DB (nova coluna)**
   - `ALTER TABLE public.vendas ADD COLUMN rascunho_pagamento jsonb;`
   - Sem policy nova (herda RLS existente de `vendas`).

3. **`src/pages/vendas/VendaNovaMinimalista.tsx`**
   - Botão "Salvar como Rascunho" no header/rodapé, ao lado de "Cadastrar Venda".
   - Chama `createRascunho` com o estado atual (sem `validarDesconto`, sem verificação de senha, sem checar comprovante).
   - Ao concluir, redireciona para `/vendas/minhas-vendas/rascunho/:id` (nova página).
   - **Hidratação de rascunho**: se a URL trouxer `?rascunhoId=...`, carrega venda + produtos + `rascunho_pagamento` no estado do formulário. Ao submeter como "Cadastrar Venda" com sucesso, converte o mesmo registro (`is_rascunho=false`) em vez de criar novo — deleta o `rascunho_pagamento` e roda o fluxo padrão de `contas_receber`/comprovantes.

4. **Nova página `src/pages/vendas/RascunhoView.tsx`** (rota `/vendas/minhas-vendas/rascunho/:id`)
   - Read-only: mostra cliente, produtos (com medidas/desconto), pagamento, valores, comprovantes anexados.
   - Botões: **"Transformar em Venda"** → navega para `/vendas/minhas-vendas/nova?rascunhoId=:id` (form re-hidrata e aplica todas as regras no submit).
   - **"Excluir rascunho"** (reuso do delete atual).
   - **"Voltar"** para `/vendas/minhas-vendas`.

5. **`src/pages/vendas/MinhasVendas.tsx`**
   - Card de rascunho: troca botão "Editar" por **"Visualizar"** → `/vendas/minhas-vendas/rascunho/:id`.

6. **`src/pages/vendas/MinhasVendasEditar.tsx`**
   - Rota mantida por compatibilidade, mas quando `venda.is_rascunho === true` passa a redirecionar para a nova view read-only (evita bypass das regras pelo caminho antigo).

7. **`src/App.tsx`**
   - Registra a nova rota `/vendas/minhas-vendas/rascunho/:id`.

## Detalhe do fluxo de conversão (rascunho → venda)

No `VendaNovaMinimalista` em modo re-hidratado (`?rascunhoId`), o botão "Cadastrar Venda" segue exatamente o pipeline atual — nada é pulado:

1. Valida campos obrigatórios via `regras_vendas`.
2. Roda `validarDesconto` → se exigir, abre `AutorizacaoDescontoModal` (responsável e/ou master).
3. Valida boleto 70/30/21d, entrada mínima, data de pagamento, comprovantes.
4. Ao confirmar, chama uma variante `converterRascunhoEmVenda(rascunhoId, ...)` no hook (novo método) que:
   - Faz `UPDATE vendas SET is_rascunho=false, numero_pedido=..., valor_venda=..., rascunho_pagamento=null`.
   - Substitui `produtos_vendas` do rascunho pelos do formulário (delete + insert).
   - Cria `contas_receber` + comprovantes normalmente.
   - Registra `vendas_autorizacoes_desconto` se houver.

## Fora de escopo

- Não altera `useVendas.createVenda` para vendas normais.
- Não altera outras telas que consomem `is_rascunho` (`useHomeIndices`, dashboards) — elas continuam ignorando rascunhos.

## Diagrama

```text
[/vendas/minhas-vendas/nova]
    │
    ├── "Salvar como Rascunho" ──► createRascunho ──► /vendas/minhas-vendas/rascunho/:id (view-only)
    │                                                       │
    │                                                       ├── "Excluir"
    │                                                       └── "Transformar em Venda"
    │                                                              │
    │                                                              ▼
    │            /vendas/minhas-vendas/nova?rascunhoId=:id  (form hidratado)
    │                                                              │
    │                                                              ▼
    │                                    valida regras + senhas + comprovantes
    │                                                              │
    ▼                                                              ▼
"Cadastrar Venda" ─────────────────────► converterRascunhoEmVenda / createVenda
```
