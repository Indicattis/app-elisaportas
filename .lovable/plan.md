
# Investigação: 612 vendas "Pendente Faturamento" em `/direcao/gestao-fabrica`

## Causa raiz

A aba "Pendente Faturamento" lê de `useVendasPendenteFaturamento` (`src/hooks/useVendasPendenteFaturamento.ts`). O filtro atual considera "pendente" toda venda que:

- `is_rascunho = false` e `pedido_dispensado = false`
- tem `contrato_url IS NOT NULL` **OU** `contrato_dispensado = true`
- não está reprovada
- não tem `pedidos_producao`
- e ainda não é `isVendaFaturada` (frete aprovado + todos `produtos_vendas.faturamento = true`)

Consulta agregada no banco hoje retorna **640** vendas nesse estado. Detalhando:

| categoria                                                         | qtd |
|-------------------------------------------------------------------|----:|
| Total pendente                                                    | 640 |
| Sem nenhuma linha em `produtos_vendas`                            | 508 |
| Com produtos, mas sem `frete_aprovado` / itens sem `faturamento`  | 132 |
| Marcadas como `contrato_dispensado = true`                        | 640 |
| Com `contrato_url` real                                           |   0 |

Ou seja, **100% dos pendentes têm `contrato_dispensado = true`** — nenhum chegou ali por contrato anexado. O salto vem da migration `supabase/migrations/20260513202902_177611d9-...sql`:

```sql
UPDATE vendas
SET contrato_dispensado = true,
    contrato_dispensado_em = COALESCE(contrato_dispensado_em, now())
WHERE contrato_url IS NULL
  AND contrato_dispensado IS DISTINCT FROM true;
```

Ela dispensou o contrato de **toda** venda sem `contrato_url`, inclusive vendas legadas que nem têm itens em `produtos_vendas` (508 casos). A migration anterior (`20260513200358`) só dispensava casos seguros (frete aprovado + todos itens faturados); a segunda removeu essa cláusula e varreu o histórico inteiro, criando o backlog artificial.

Vendas sem `produtos_vendas` não podem ser faturadas pelo fluxo atual (a tela depende dos itens), então ficam presas para sempre na aba.

## Plano de correção

### 1. Filtrar vendas sem itens no hook (UI defensiva)
Em `src/hooks/useVendasPendenteFaturamento.ts`, após carregar `vendas`, descartar quem tem `produtos_vendas.length === 0` antes do `.map`. Isso elimina imediatamente os 508 registros "fantasma" mesmo sem tocar no banco. Mudança pequena e isolada na função `.filter()` existente.

### 2. Migration de correção dos dados
Criar nova migration `supabase/migrations/<timestamp>_corrigir_contrato_dispensado_legado.sql`:

```sql
-- Reverte o dispensamento aplicado em massa quando a venda não tem itens
-- (vendas legadas que não conseguem ser faturadas pelo fluxo atual e ficaram
-- presas em "Pendente Faturamento").
UPDATE public.vendas v
SET contrato_dispensado = false,
    contrato_dispensado_em = NULL,
    contrato_dispensado_por = NULL
WHERE v.contrato_dispensado = true
  AND v.contrato_url IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.produtos_vendas pv WHERE pv.venda_id = v.id
  );
```

Isso restaura ~508 vendas para o estado original ("contrato pendente"), sem afetar quem foi dispensado conscientemente via UI (esses têm `contrato_dispensado_por` preenchido — opcionalmente pode-se filtrar `AND contrato_dispensado_por IS NULL` para extra segurança; ver "Pergunta abaixo").

### 3. Validar resultado
Após aplicação, a aba "Pendente Faturamento" deverá cair para ~132 vendas (as que realmente têm itens não faturados / frete não aprovado). Verificar no preview e nas demais telas que consomem o mesmo hook (`AnexarContratoModal`, `FaturamentoVendasMinimalista`).

## Fora de escopo
- Não alterar `isVendaFaturada` nem outras lógicas de faturamento.
- Não tocar nas vendas legítimas (132 com produtos).
- Sem mudanças em RLS, grants, ou em outras tabelas.

## Risco
Reverter `contrato_dispensado` para essas 508 vendas legadas é seguro: elas não são faturáveis pelo fluxo atual de qualquer forma e não aparecerão mais nem na aba "Pendente Faturamento" (graças à mudança 1) nem na aba "Aguardando Contrato" (porque também não têm itens — a maioria das telas exige `produtos_vendas`). Se aparecerem em alguma listagem, ainda será o estado correto: contrato realmente não está assinado nem dispensado por um humano.
