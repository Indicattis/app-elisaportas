## Botão de confirmação para sugestões

Em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`, adicionar um botão de confirmar (✓ verde) ao lado da lixeira nas linhas de sugestão dos 3 blocos (Folha, Fixas, Variáveis). Ao clicar, a sugestão é convertida em lançamento real do mês usando o valor atualmente exibido na célula editável.

**Folha Salarial** (linhas onde `r` é `undefined` e existe `padroesByNome.get(...)`):
- Botão ✓ chama `onInsert({ colab, salario, aux_combustivel, insalubridade_pct, fgts_pct, previsao_13_valor })` com os valores atualmente mostrados (vindos do padrão).

**Despesas Fixas e Variáveis** (linhas `sugestoes.map(...)`):
- Botão ✓ chama `aplicarSugestao(sug, sug.valor)` — mesma função já existente usada quando o usuário edita o valor.

Visual: botão `bg-emerald-500/20 text-emerald-300` (mesmo padrão do botão Salvar do formulário inline), ao lado da lixeira existente.

## Status (segunda etapa — não implementar ainda)

A coluna "Status" hoje só existe no bloco Folha (bolinha verde se lançado, vermelha se não). Após confirmar a primeira etapa, faremos:

- 🔴 Vermelho = pendente (sugestão ainda não confirmada)
- 🟡 Amarelo = "Alana" (confirmada por Alana)
- 🟢 Verde = "Luan" (confirmada por Luan)

Isso exige decidir:
1. Adicionar coluna Status também em Fixas/Variáveis? (hoje não tem)
2. Como diferenciar Alana vs Luan? Pelo usuário autenticado que clicou em confirmar? Por seleção manual? Persistir em qual coluna (ex.: `confirmado_por` em `despesas_manuais_folha` e `despesas_manuais_lancamentos`)?

Vou pedir essas definições quando chegarmos nessa etapa.
