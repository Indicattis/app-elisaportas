## Objetivo

Em `/direcao/estrategia/despesas/configuracoes`, expandir o bloco "Folha Salarial padrão" para ter as mesmas colunas usadas no resumo mensal (`/direcao/estrategia/despesas/2026-05`), permitindo definir os valores padrão completos de cada colaborador.

## Contexto

Todos os campos necessários já existem na tabela `despesas_padrao` (`salario`, `aux_combustivel`, `insalubridade_pct`, `fgts_pct`, `previsao_13_valor`) e no hook `useDespesasPadrao`. Hoje o bloco de Folha em Configurações mostra apenas **Colaborador** e **Salário**. Nenhuma alteração de banco é necessária.

A coluna "Em folha" da página mensal vem de `admin_users.em_folha`, não de `despesas_padrao` — portanto não faz sentido editá-la no padrão e não será incluída.

## Mudanças (somente `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`)

Reformular `FolhaBlock` / `FolhaRow` para refletir as colunas do `BlocoFolha` em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`:

Cabeçalho (na ordem):
1. Colaborador
2. Salário (editável, R$)
3. Combustível (editável, R$)
4. Insalub % (editável)
5. Insalub valor (calculado = salário × insalub%)
6. FGTS % (editável)
7. FGTS valor (calculado = salário × fgts%)
8. Previsão 13° + FGTS 13° (editável previsao_13_valor; exibe `previsao_13 × (1 + fgts%/100)`)
9. Férias + 1/3 + FGTS (calculado = salário/3 + fgts_valor)
10. Total (calculado pela mesma `calcTotalFolha`)
11. Ações (excluir)

Comportamento:
- Reutilizar `InlineNum` para cada campo editável, chamando `update(id, { campo: valor })`.
- Linha de inserção ganha inputs `NumCell` para os mesmos 5 campos editáveis (fgts default 8) e usa `insert({ tipo: 'folha', nome, salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor })`.
- Rodapé: além do "Total de salários" atual, adicionar "Total da folha" somando `calcTotalFolha` de cada item (espelha o total mensal).
- Manter overflow-x-auto e `min-w-[1200px]` na tabela para acomodar todas as colunas.

A função `calcTotalFolha` será duplicada localmente (mesma fórmula do componente mensal) para evitar import cruzado, ou extraída para `src/lib/folhaCalc.ts` se preferir — proposta padrão: duplicação local simples por ser pequena.

Os blocos `SimpleBlock` (Fixas/Variáveis/Impostos) permanecem inalterados.

## Sem mudanças necessárias
- Banco de dados / migrations.
- Hook `useDespesasPadrao`.
- Página mensal.
