# Segundo método de pagamento sumindo para atendentes/vendedores

## Diagnóstico

A célula "Pagamento" em `/direcao/vendas/todas` monta a linha `+ <segundo método>` a partir de uma consulta client-side a `contas_receber`:

```ts
// src/pages/direcao/VendasDirecao.tsx (linhas 308-348)
const { data } = await supabase
  .from('contas_receber')
  .select('venda_id, metodo_pagamento, ...')
  .in('venda_id', slice);   // sem .limit, sem tratamento de error
```

Depois:

```ts
const todos = metodosExtraPorVenda.get(venda.id) || [];
const secundario = todos.find(m => m !== principal) || null;
```

RLS de `contas_receber` hoje: `auth.uid() IS NOT NULL` (permissiva, aplica a todas as roles). Grants OK para `authenticated`. Ou seja, atendentes deveriam receber o mesmo resultado que admins. Como não veem, sobraram três hipóteses plausíveis:

1. **Erro silencioso no fetch** — o código ignora `error` e devolve `data=null` sem logar; qualquer falha (token expirado, network) faz o cache do segundo método ficar vazio até a próxima montagem.
2. **Truncamento em 1000 linhas** — hoje são 659 registros em `contas_receber`, então não estoura. Mas para atendentes/vendedores que usam a página com muito tempo aberto e o total cresce, o `.in()` grande pode truncar sem aviso.
3. **Race entre `useVendas` e o `useEffect` de contas_receber** — o `useEffect` só dispara depois do fetch de vendas; se `vendas` é reatribuído (novo objeto) sem que `contas_receber` termine, o render fica no estado antigo (vazio) por alguns segundos. Atendentes com conexão mais lenta ficam mais expostos.

## Correções

Escopo restrito a `src/pages/direcao/VendasDirecao.tsx` (client-side, não mexe em RLS/schema):

### 1. Instrumentar o fetch de `contas_receber`

- Capturar `error` no `await supabase.from('contas_receber')...` e `console.error('[VendasDirecao] contas_receber erro:', error, { slice })`.
- Isso permite confirmar rapidamente na sessão do atendente afetado se é RLS/auth (mensagem "permission denied") ou algo de rede.

### 2. Paginar com `range` em vez de confiar no default

- Trocar o `.in('venda_id', slice)` por um loop com `.range(start, start+PAGE-1)` até a página vir com menos de `PAGE` linhas. Assim eliminamos o teto de 1000 do PostgREST como possível causa e prevenimos o problema à medida que a base cresce.
- Chunk de `venda_id` mantido em 500; página de leitura de 1000 linhas por request.

### 3. Estado inicial e revalidação

- Guardar um flag `metodosCarregados` para diferenciar "ainda carregando" de "carregou vazio". Enquanto `!metodosCarregados`, se `venda.pagamento_na_entrega === true`, exibir um placeholder `+ ...` (skeleton) em vez de suprimir a linha — isso já dá o sinal visual de "existe segundo método" antes do fetch terminar.
- Adicionar `venda.updated_at`/`vendas.length` no dep-array do `useEffect` para revalidar quando qualquer venda muda (hoje o array depende só do array `vendas`, que é substituído em cada refetch — ok, mas confirmar).

### 4. Fallback quando `contas_receber` volta só com o método principal

- Se `todos.length <= 1` e `venda.pagamento_na_entrega === true`, tentar inferir o segundo método a partir de campos que já vêm em `vendas`:
  - `parcelas_dinheiro > 0` → `"dinheiro"`
  - Caso contrário, exibir o rótulo genérico "Na entrega".
- Isso garante que atendentes vejam o segundo método mesmo se, por qualquer motivo, `contas_receber` não devolver a linha esperada (venda antiga sem registro completo, por exemplo).

## Fora do escopo

- Sem alterações em RLS ou grants de `contas_receber` (já permissivo para authenticated).
- Sem mudanças no hook `useVendas`.
- Sem alteração no tooltip (que continua exibindo os detalhes de parcelas quando disponíveis).

## Como validar

1. Após deploy, pedir para o(s) atendente(s) afetado(s) abrir `/direcao/vendas/todas` e conferir o DevTools > Console — se aparecer erro de `contas_receber`, mostrar a mensagem para direcionar a correção real (RLS, sessão, etc.).
2. Comparar a mesma venda entre admin e atendente e verificar se a linha `+ <método>` aparece nas duas.
