## Objetivo

Substituir os botões "Adicionar" (que abrem Dialogs) por uma **linha de adição embutida** no rodapé de cada tabela — Folha Salarial, Despesas Fixas e Despesas Variáveis. O usuário preenche os campos diretamente na linha e clica em um botão de confirmar (ícone de check) para salvar.

## Comportamento

### Folha Salarial
- Última linha da tabela passa a ser uma "linha de cadastro" sempre visível.
- Colunas:
  - **Colaborador**: `<Select>` compacto inline (mesma lista de `admin_users` que o Dialog usa hoje). Ao selecionar, pré-preenche os demais campos com os dados do colaborador.
  - **Salário, Combustível, Insalub %, FGTS %**: `<input>` numéricos inline (mesmo visual da `EditableCell` já em uso).
  - **Insalub valor, FGTS valor, Previsão 13° + FGTS 13°, Férias + 1/3 + FGTS, Total**: calculados ao vivo enquanto o usuário digita.
  - Última coluna: botão verde de check (salvar) + botão de limpar (X). Salvar desabilitado enquanto não houver colaborador selecionado.
- Após salvar com sucesso: limpa a linha e mantém pronta para o próximo cadastro.

### Despesas Fixas / Variáveis
- Mesma ideia: linha de cadastro fixa no rodapé da tabela.
- Colunas:
  - **Tipo**: `<Select>` inline com os `tipos_custos` da categoria correspondente (`fixa`/`variavel`).
  - **Descrição**: input de texto.
  - **Data**: input `type="date"` (default = primeiro dia do mês selecionado).
  - **Valor pago**: input numérico.
  - Ações: check (salvar) + X (limpar). Salvar desabilitado enquanto Tipo e Valor não estiverem preenchidos.

## Mudanças de código

`src/components/direcao/estrategia/DespesasResumoTopo.tsx`:
- Remover botão "Adicionar" do header dos 3 blocos, e remover `DialogFolha` / `DialogDespesa` (componentes deixam de ser usados — apagar).
- Remover estados `openFolha` e `openDespesa` e props relacionadas.
- `BlocoFolha`: adicionar `tfoot` (ou última `tr`) com a linha de cadastro inline. Componente recebe a lista de colaboradores como prop (carregada no componente pai uma única vez).
- `BlocoDespesa`: adicionar linha de cadastro inline; componente recebe lista de `tipos_custos` filtrada por categoria.
- Componente pai (`DespesasResumoTopo`):
  - Carregar `admin_users` (formato `Colab[]`) e `tipos_custos` uma vez via `useEffect` e passar para os blocos.
  - Novos handlers `handleInsertFolha(payload)` e `handleInsertLanc(payload)` que executam o `insert` no Supabase, chamam `reload()` e `onDataChange()`.
- Reaproveitar `calcTotalFolha` para o total ao vivo da linha de cadastro de folha.
- Manter edição inline já existente nas linhas salvas e a exclusão por ícone de lixeira.

## Fora de escopo

- Sem mudanças no schema do banco, RLS, hooks de dados, ou no comportamento da página de meses.
- Sem mudanças nos cálculos/regras já implementadas.
