## Adicionar itens novos em todos os blocos (sem virar padrão)

Em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`, adicionar formulário inline ao final de cada um dos 3 blocos para criar lançamentos avulsos no mês, sem persistir como sugestão padrão.

### Folha Salarial (`BlocoFolha`)
Hoje só renderiza colaboradores vindos de `colabs + padroesFolha + rows`. Adicionar uma linha extra de adicionar ao final da tabela com:
- Input texto: nome do colaborador
- Inputs numéricos: salário, combustível, insalub %, FGTS %, previsão 13°
- Botão ✓ salvar / ✗ limpar

Ao salvar, montar um `Colab` ad-hoc (sem registrar em `despesas_padrao`) e chamar o `onInsert` existente — o lançamento vai direto para `despesas_manuais_folha` daquele mês.

### Despesas Fixas e Variáveis (`BlocoDespesa`)
Hoje o formulário inline força escolha de um `tipo` da lista `tipos`. Adicionar um modo "nome livre":
- Trocar o `Select` por um componente combinado: dropdown com tipos cadastrados + opção "Outro (digitar nome)" que revela um input de texto livre.
- Quando nome livre, construir `TipoCusto` ad-hoc com `id` gerado (`crypto.randomUUID()`) e `tipo_nome` = texto digitado, passando para `onInsert` igual ao fluxo atual.
- Nada é gravado em `despesas_padrao` nem em `tipos_custo` — fica apenas no lançamento do mês.

### Observação
Nenhuma mudança de schema. O parent (`EstrategiaDespesasMes` ou equivalente) já lida com inserts em `despesas_manuais_folha` e `despesas_manuais_lancamentos` — a nova UI apenas usa os mesmos callbacks `onInsert`.
