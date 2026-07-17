## Problema

Ao abrir um rascunho em `/vendas/minhas-vendas/nova?rascunhoId=...`, os campos do cliente aparecem vazios mesmo quando o rascunho tem `cliente_id`, `cliente_nome`, `cliente_telefone`, endereço, etc.

## Causa

O `useEffect` de hidratação em `VendaNovaMinimalista.tsx` já preenche o `formData` com os dados do cliente do rascunho, mas o componente `ClienteVendaSection` inicia sempre em `modo='buscar'` com `clienteSelecionado=null`. Nesse modo ele renderiza apenas o campo de busca — como o `clienteSelecionado` interno nunca é setado, o card de "cliente selecionado" (que mostra nome, telefone, endereço) não aparece, dando a impressão de que o cliente não foi puxado.

## Solução

1. **`src/components/vendas/ClienteVendaSection.tsx`**
   - Adicionar nova prop opcional `initialClienteId?: string`.
   - Adicionar `useEffect` que, quando `initialClienteId` é fornecido e `clienteSelecionado` ainda é `null`, busca o cliente em `clientes` (via `supabase.from('clientes').select('*').eq('id', initialClienteId).maybeSingle()`) e chama `setClienteSelecionado(cliente)` — sem chamar `onChange`, para não sobrescrever os dados já hidratados pelo pai (que podem ter sido editados no rascunho, como endereço).
   - Se a busca não retornar cliente (foi cadastrado inline sem `cliente_id`), cair no fallback: quando `dados.cliente_nome` existir mas não houver `initialClienteId`, alternar `modo` para `'cadastrar'` para exibir os campos pré-preenchidos.

2. **`src/pages/vendas/VendaNovaMinimalista.tsx`**
   - Passar `initialClienteId={formData.cliente_id}` para `<ClienteVendaSection />` quando `isFromRascunho` for verdadeiro.

## Escopo

Frontend apenas. Sem alterações no banco ou nas regras de venda. Não afeta o fluxo de nova venda do zero nem a conversão de orçamento (que já usa `disabled`).
