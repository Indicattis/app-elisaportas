## Objetivo

Em `/direcao/dre/:mes`, transformar cada linha de tipo de custo em "Despesas Fixas" e "Despesas Variáveis" num botão clicável que abre um modal listando todos os lançamentos da tabela `gastos` daquele `tipo_custo_id` no mês.

## Mudanças

### `src/pages/direcao/DREMesDirecao.tsx`

1. **`DespesaSectionReadOnly`**: tornar a célula `Nome` (`<td>` da linha) clicável. Ao clicar, dispara um callback `onClickTipo(d.id, d.nome)` recebido por props.
   - Estilo: cursor-pointer, hover `text-white`, sem mudar layout.
   - Não aplicar para a seção "Folha Salarial" (não é tipo de custo).

2. **Novo componente `GastosDoTipoDialog`** (dentro do mesmo arquivo):
   - Props: `open`, `onOpenChange`, `mes` (`YYYY-MM`), `tipoCustoId`, `tipoNome`.
   - Ao abrir, consulta `gastos` filtrando por `tipo_custo_id` + intervalo do mês, com join leve em `admin_users` (responsável) e `bancos` (banco) para exibir nomes.
   - Layout: tabela compacta com colunas Data, Descrição, Responsável, Banco, Status, Valor. Rodapé com total e contagem.
   - Vazio: mensagem "Nenhum gasto lançado neste tipo para o mês".
   - Botão "Abrir em Gastos" → navega para `/administrativo/financeiro/gastos?mes=${mes}` (filtro do mês já existe).
   - Estilo glassmórfico (bg-white/5, border-white/10), seguindo o padrão do DRE.

3. **No corpo de `DREMesDirecao`**: novo estado `tipoModal: { id: string; nome: string } | null`. Passar `onClickTipo` para as duas seções (fixas e variáveis) renderizadas em tela (componente `DespesaSectionReadOnly`). A folha mantém comportamento atual.

## Fora de escopo

- Layout de impressão (`PrintReport` / `PrintDespesaTable`) permanece igual — modal não faz sentido em PDF.
- Edição/exclusão de gastos a partir do modal: somente leitura, com link para a tela de Gastos para qualquer alteração.
- "Folha Salarial" não recebe modal (a fonte é `custos_folha_mensais`, não `gastos`).
