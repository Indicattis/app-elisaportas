## Objetivo

Tornar as definições de `/direcao/estrategia/kits` (portas, instalações e pinturas) a **fonte de verdade** do lucro/custo de qualquer venda ainda não faturada, e oferecer um botão de faturamento em massa no hub `/financeiro/faturamento` que aplica essa parametrização a:

1. todas as vendas marcadas como **dispensadas do sistema** (`vendas.dispensada_sistema = true`), e
2. vendas já com pedido criado e ainda não faturadas.

Escopo confirmado: **somente vendas não faturadas** são reescritas. Vendas já faturadas no passado permanecem intocadas.

---

## 1. Função SQL única de recálculo

Centralizar a regra em uma RPC `public.recalcular_lucro_venda(venda_id uuid, finalizar boolean)` (SECURITY DEFINER) que reaproveita exatamente as fórmulas usadas hoje em `FaturamentoVendaMinimalista.tsx`:

- **Pintura epóxi** (`produtos_vendas.tipo_produto = 'pintura_epoxi'`):
  - se `vendas_config_lucro('pintura_epoxi').modo = 'formula_dimensao'`: `lucro = altura * largura * parametros.valor_m2`
  - senão: `custo = valor_total * percentual_custo/100`; `lucro = valor_total - custo`
- **Instalação** (`tipo_produto = 'instalacao'`): `custo = valor_total * percentual_custo/100`; `lucro = valor_total - custo`.
- **Porta enrolar** (`tipo_produto = 'porta_enrolar'`): lookup em `tabela_precos_portas` via `produtos_vendas.tabela_precos_porta_id` (ou casamento por dimensão com tolerância 15cm como já feito). `lucro = lucro_tabela * quantidade`.
- Avulsos (acessório/adicional/manutenção) **não** são afetados — continuam usando `custos_itens` no ato do faturamento manual.

A função só toca linhas onde `produtos_vendas.faturamento = false`. Quando `finalizar = true`, ao final agrega `lucro_total` e marca `vendas.lucro_total`, `produtos_vendas.faturamento = true`, `instalacao_faturada` etc. (mesma lógica do `handleFinalizarFaturamento`).

Outra RPC `public.recalcular_lucro_vendas_em_aberto(somente_dispensadas boolean default false)` percorre todas as vendas não faturadas e chama a função por id; é usada tanto pelo sync automático quanto pelo botão de massa.

## 2. Sync automático ao salvar a configuração

Em `src/hooks/useConfigLucro.ts` (mutation `save`) e nas telas de edição da tabela de preços de kits (`TabelaPrecos` quando renderizada com `enableReorder` por `EstrategiaKits`), após sucesso:

- invocar `recalcular_lucro_vendas_em_aberto()` (não-dispensadas inclusive — qualquer venda ainda em aberto);
- invalidar React Query: `vendas_config_lucro`, `produtos_vendas`, `venda-faturamento`, `vendas-pendente-faturamento`;
- toast resumindo quantas vendas foram atualizadas (retorno da função SQL).

Isso garante: alterei R$/m² de pintura → todas as vendas em aberto refletem o novo lucro imediatamente.

## 3. Botão "Faturar tudo" em `/financeiro/faturamento`

Local: header do hub `FaturamentoVendasMinimalista.tsx`.

- Dialog de confirmação listando contagem das vendas que serão faturadas:
  - "Dispensadas do sistema" (`dispensada_sistema = true`)
  - "Com pedido criado e prontas" (têm `pedidos_producao` e nenhuma linha não-faturada além das auto-faturáveis).
- Ao confirmar: chama `recalcular_lucro_vendas_em_aberto(somente_dispensadas=false)` com `finalizar=true` somente para o subconjunto elegível (RPC já implementa o filtro internamente).
- Mostra toast com `{faturadas, ignoradas, erros}`; invalida listas.

Pré-checagem mantida pelas regras já existentes (vendas sem produto, sem contrato, etc. são ignoradas e contadas em `ignoradas`).

## 4. Faturamento individual continua funcionando

`FaturamentoVendaMinimalista.tsx` passa a chamar `recalcular_lucro_venda(id, false)` no carregamento (substituindo os quatro `useEffect` de auto-faturar pintura/porta/instalação/avulsos pelas chamadas equivalentes server-side), e `recalcular_lucro_venda(id, true)` no botão "Finalizar faturamento". Isso elimina divergência entre a tela individual e o batch.

## 5. Telas/arquivos afetados

- `supabase/migrations/*` — nova migration com as duas RPCs + GRANT execute para `authenticated, service_role`.
- `src/hooks/useConfigLucro.ts` — disparar recálculo após save.
- `src/pages/TabelaPrecos.tsx` (somente quando aberto via `EstrategiaKits`) — disparar recálculo após editar/reordenar preços de portas.
- `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` — substituir os blocos `auto-faturar produto X` por chamadas à RPC.
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx` — novo botão + dialog "Faturar tudo".

## Riscos & decisões

- **Apenas vendas em aberto** são reescritas (escolha confirmada). Vendas já faturadas mantêm histórico — sem impacto retroativo em DRE.
- O recálculo automático ao salvar config pode levar alguns segundos se houver muitas vendas em aberto; será executado server-side em uma única transação para minimizar latência.
- A RPC é idempotente: rodar duas vezes produz o mesmo resultado.
- Vendas faturadas legadas (`instalacao_faturada` antigo, sem produto separado) continuam com a regra atual de 40% e não são tocadas pela RPC.
