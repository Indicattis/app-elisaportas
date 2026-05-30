## Objetivo

Em `/direcao/estrategia/dre/2026-05`, a seção **3. Folha Salarial** deve usar exatamente os mesmos valores exibidos em `/direcao/estrategia/despesas/2026-05`, e não mais a tabela legada `custos_folha_mensais`.

## Fonte atual vs. fonte correta

- Hoje (`DREMesDirecao.tsx`, linhas ~922-941): busca `custos_folha_mensais` (colaborador_nome, valor).
- Em Despesas/Mês (`DespesasResumoTopo.tsx`): a folha vem de `despesas_padrao` onde `tipo = 'folha'`, sobrescrita por linhas correspondentes em `despesas_manuais_folha` (match por `colaborador_nome` normalizado). O total por colaborador é calculado por `calcTotalFolha`:

```text
total = salario + aux_combustivel + insalubridade(% sobre salario)
      + fgts(% sobre salario) + previsao_13_valor
      + ferias (salario/3 + fgts)
se em_folha === false → total = salario
```

## Mudanças

1. **`src/pages/direcao/DREMesDirecao.tsx`**
   - Remover o bloco que busca `custos_folha_mensais`.
   - Em `fetchDespesasMes` (ou função equivalente), passar a:
     - Buscar `despesas_padrao` (`tipo='folha'`) — colunas: nome, salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor, em_folha.
     - Buscar `despesas_manuais_folha` do `mes_referencia = ${mes}-01`.
     - Construir a lista final mesclando: para cada padrão, se houver linha manual com mesmo `colaborador_nome` (normalizado: trim + lowercase), usar a manual; caso contrário, usar a padrão.
     - Adicionar também eventuais linhas manuais que não correspondam a nenhum padrão (ex.: lançamentos avulsos).
     - Calcular `valor_real` de cada item via `calcTotalFolha` (replicar a função localmente no arquivo, já que ela não é exportada).
     - `setDespesasFolha([{ id, nome: colaborador_nome, valor_real }])`, ordenado por nome.
   - `totalDespFolha` continua sendo o `reduce` de `valor_real`, então o impacto no resto do DRE é automático.

2. **Nada muda visualmente** — apenas a fonte dos números. Os blocos visuais que listam `despesasFolha` exibem `nome` e `valor_real` como hoje.

## Fora do escopo

- Não alterar `custos_folha_mensais` nem a página de despesas.
- Não criar migrations.
- Não mexer em folha/ranking de outros lugares (apenas o DRE do mês).
