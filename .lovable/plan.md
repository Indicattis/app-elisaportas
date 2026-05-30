## Objetivo

Replicar as colunas, layout e estilo de `/direcao/estrategia/despesas/configuracoes` dentro da página mensal `/direcao/estrategia/despesas/2026-05`, mantendo o agrupamento por categoria/setor, com uma coluna extra "Valor pago no mês" à direita.

## Escopo das alterações

Arquivo principal: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`

Hoje a página do mês usa `BlocoGastosReadonly` (tabela simples: Tipo de Custo / Lançamentos / Valor projetado / Valor pago no mês) e `BlocoDespesa` para folha. Vamos substituir por componentes que reproduzem o visual das Configurações.

### 1. Sessões Fixas / Variáveis / Impostos

Criar componente `TiposCustoBlockMensal` (no mesmo arquivo ou em `src/components/direcao/estrategia/TiposCustoBlockMensal.tsx`) espelhando o `TiposCustoBlock` das Configurações:

- Cabeçalho idêntico: ícone + título + contagem `(N)` + botão "Exportar PDF" à direita (mantém o que já existe hoje na página do mês). Botões de cadastro/gerência são removidos (é página de visualização do mês).
- Agrupamento por categoria usando `useDespesasCategorias` + `getCategoriaPalette`, com `CategoriaGroup` colapsável (dot colorido, nome, contagem, subtotal à direita). Mesma estética do `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5`.
- Tabela com as colunas exatas das Configurações + 1 extra:

  | Col | Origem |
  |---|---|
  | Nome | `tipo.nome` |
  | Descrição (ícone hover) | `tipo.descricao` |
  | Categoria (pill colorida) | `tipo.categoria_id` |
  | Empresa | `tipo.empresa_id` |
  | Valor projetado | `tipo.valor_maximo_mensal` |
  | DRE (badge) | `tipo.aparece_no_dre` |
  | **Valor pago no mês (novo)** | soma de `gastos` do mês desse `tipo_custo_id` |

  Todas as células somente leitura (sem inputs, sem drag handle, sem botão eliminar/lixo).
- Rodapé do bloco: "Total mensal estimado (ativos)" à esquerda + "Total pago no mês" à direita.

A página do mês passa para esse componente: lista de `tipos_custos` ativos do tipo correspondente + mapa `{tipo_id → totalPagoNoMes}` agregado a partir de `gastosFixas` / `gastosVariaveis` / `gastosImpostos` que já existem no `DespesasResumoTopo`.

### 2. Sessão Folha Salarial

Substituir o `BlocoDespesa` (ou tabela atual) por um componente `FolhaBlockMensal` que espelha o `FolhaBlock`:

- Cabeçalho `bg-white/5 backdrop-blur-xl ...` com ícone `Users`, título "Folha Salarial", contagem, botão "Exportar PDF" (mantido). Sem botões de gerenciar setores / novo colaborador.
- Agrupamento por setor usando `useSetores` + `getSetorPalette`, mesmos cabeçalhos de grupo (dot, label, total do grupo).
- Tabela com as colunas exatas da Folha em Configurações: Colaborador / Em folha / Setor / Salário / Salário Mínimo / Combustível / Insalub % / Insalub R$ / FGTS % / FGTS R$ / 13º / FGTS 13º / Férias / **Total** + coluna extra **Valor pago no mês** (soma de `gastos` com `colaborador_id = item.id` no mês).
- Linhas somente leitura: reaproveitar a lógica de cálculo (`calcTotalFolha`, etc.) mas sem `NumCell` editáveis nem botão remover.
- Rodapé: "Total da folha (projetado)" + "Total pago no mês".

Fonte de dados de "pago no mês" para folha: agregação de `gastos` do mês com `colaborador_id` setado (já buscados hoje pelo `DespesasResumoTopo`).

### 3. Limpeza

- Remover usos de `BlocoGastosReadonly` e `BlocoDespesa` em `DespesasResumoTopo.tsx`.
- Manter `BlocoGastosReadonly` / `BlocoDespesa` no projeto se forem usados em outro lugar; caso contrário, deixar para uma limpeza futura (não excluir agora).
- Estilo: nenhum hex novo. Tudo via tokens existentes (`bg-white/5`, `border-white/10`, `text-white/...`, `bg-emerald-...`) já presentes nas Configurações.

## Detalhes técnicos

- Reutilizar componentes auxiliares existentes em `EstrategiaDespesasConfiguracoes.tsx` extraindo o necessário (`CategoriaGroup`, `categoriaSelectClass`, helpers de cálculo da folha) para um arquivo compartilhado `src/components/direcao/estrategia/_despesasShared.tsx`. Os componentes mensais consomem versões "readonly" (mesmas classes Tailwind, células sem `<input>`).
- "Valor pago no mês" usa `formatCurrency`. Quando `> valor_projetado`, exibir em `text-orange-300`; quando zero, `text-white/40`.
- Manter a lógica já implementada de "mostrar todos os tipos mesmo sem gastos" e "impostos lidos de `gastos`" (commits recentes).
- Sem mudanças de banco, hooks ou regras de negócio.

## Não escopo

- Não alterar configurações de cadastro nem permitir edição na página mensal.
- Não mexer em export PDF (já presente nas sessões do mês).
- Não tocar em outras rotas.
