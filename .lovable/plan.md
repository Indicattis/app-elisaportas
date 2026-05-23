## Mudanças em `/direcao/estrategia/despesas`

Reorganizar a página para que o resumo de despesas (Folha Salarial, Fixas, Variáveis) fique sempre visível no topo, acima da grade de meses.

### Comportamento

- **Topo (sempre visível)**: três blocos lado a lado — Folha Salarial, Despesas Fixas, Despesas Variáveis — com subtotal e a lista de itens de cada categoria.
- **Modo padrão (nenhum mês selecionado)**: os blocos mostram os **valores configurados**:
  - **Fixas / Variáveis**: itens de `tipos_custos` (ativos), usando `valor_maximo_mensal` como valor.
  - **Folha Salarial**: soma de `salario` dos colaboradores ativos com `em_folha = true` (consulta em `admin_users`), exibindo cada colaborador como linha.
  - Rótulo do bloco: "Configuração padrão".
- **Modo mês selecionado**: os blocos do topo passam a mostrar os **valores reais daquele mês** (mesma fonte usada hoje pelo `DREMesDirecao` em `viewMode='despesas'`: `custos_itens`/`gastos` para fixas/variáveis e `custos_folha_mensais` para folha). Rótulo do bloco passa a "Mês YYYY-MM".
- **Grade de meses**: permanece abaixo, com toggle de seleção igual ao atual.
- **Seção embedded do `DREMesDirecao`**: removida — todas as informações de despesas passam a ser renderizadas pelos blocos do topo (evita duplicação).

### Implementação

1. **Novo componente `src/components/direcao/estrategia/DespesasResumoTopo.tsx`**
   - Props: `mes: string | null` (formato `yyyy-MM`).
   - Quando `mes` é `null`:
     - busca `tipos_custos` (ativos) agrupando por `tipo` (`fixa` / `variavel`).
     - busca `admin_users` ativos com `em_folha=true` (campos `nome`, `salario`).
   - Quando `mes` está definido:
     - reutiliza a mesma lógica de fetch do `DREMesDirecao` (`custos_itens` por mês + isFolha + `custos_folha_mensais`). Para evitar duplicação, extrair essa lógica em um hook `useDespesasMes(mes)` em `src/hooks/useDespesasMes.ts` e usá-lo tanto aqui quanto no `DREMesDirecao`.
   - Renderiza três `Card`s (Folha, Fixas, Variáveis) com glassmorphism padrão (`bg-white/5 backdrop-blur-xl border-white/10`), cada um com lista de itens (nome + valor) e subtotal no rodapé. Indicador textual "Configuração padrão" ou "Valores de {mes}".

2. **Editar `src/pages/direcao/estrategia/EstrategiaDespesas.tsx`**
   - Renderizar `<DespesasResumoTopo mes={mesSelecionado} />` antes da grade de meses.
   - Remover o bloco `{mesSelecionado && <DREMesDirecao ... viewMode="despesas" />}` (informação já contemplada no topo).
   - Manter título, breadcrumb e grade de meses inalterados (apenas remover o estado visual "ativo" desnecessário? — manter como está, só selecionar/desselecionar).

3. **Sem alterações de schema** — apenas leituras de tabelas existentes (`tipos_custos`, `admin_users`, `custos_itens`, `custos_folha_mensais`).

### Arquivos
- Criar: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- Criar: `src/hooks/useDespesasMes.ts` (extrai fetch já existente em `DREMesDirecao`)
- Editar: `src/pages/direcao/estrategia/EstrategiaDespesas.tsx`
- Editar (opcional, refactor): `src/pages/direcao/DREMesDirecao.tsx` para consumir o novo hook — caso traga risco, mantemos sem refactor e duplicamos a lógica apenas no hook novo.