## Objetivo

Transformar a tela `/direcao/estrategia/despesas` em uma grade de meses (sem blocos de cadastro abaixo). Ao clicar em um mês, o usuário é levado para uma nova página dedicada onde cadastra/edita a Folha Salarial, as Despesas Fixas e as Despesas Variáveis daquele mês — seguindo o padrão visual usado em `/administrativo/financeiro/custos/:mes`.

## Mudanças

1. **Nova rota e página**
   - Rota: `/direcao/estrategia/despesas/:mes` (`:mes` no formato `yyyy-MM`).
   - Arquivo: `src/pages/direcao/estrategia/EstrategiaDespesasMes.tsx`.
   - Usa `MinimalistLayout` com `backPath="/direcao/estrategia/despesas"` e breadcrumb Home › Direção › Estratégia › Despesas › {Mês/Ano}.
   - Renderiza os 3 blocos (Folha Salarial, Despesas Fixas, Despesas Variáveis) que hoje vivem em `DespesasResumoTopo.tsx`, com toda a lógica de adicionar/editar/excluir já implementada.

2. **`EstrategiaDespesas.tsx` (página atual)**
   - Remove o uso de `DespesasResumoTopo` e o estado `mesSelecionado`.
   - Mantém apenas o seletor de ano + grade de 12 meses com os totais.
   - Cada card de mês passa a navegar (`navigate('/direcao/estrategia/despesas/' + mesKey)`) em vez de alternar bloco interno.
   - Mantém o `useEffect` que carrega `totaisMes` a partir de `despesas_manuais_folha` + `despesas_manuais_lancamentos`.

3. **`DespesasResumoTopo.tsx`**
   - Conteúdo é movido tal como está para o novo componente da página de mês (mesmos hooks/queries/Dialogs).
   - Componente antigo é removido (não é mais usado em nenhum outro lugar — só nesta tela).

4. **Registrar a rota** em `src/App.tsx` ao lado de `/direcao/estrategia/despesas`, com a mesma `ProtectedRoute`/`routeKey`.

## Fora de escopo

- Sem mudanças no schema do banco, hooks de dados, RLS ou em qualquer outra tela.
- Sem alteração nos cálculos/regras já implementadas para folha e lançamentos.
