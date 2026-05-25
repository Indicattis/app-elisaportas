## Mudanças em `/direcao/estrategia/materias-primas`

### 1. Listagem global de todas as matérias-primas
- Em vez de exigir a seleção de um item para mostrar a tabela, a página passa a listar **todas** as matérias-primas cadastradas (de todos os itens) por padrão.
- O hook `useEstrategiaMateriasPrimas()` já suporta chamada sem `custoItemId` (retorna todas), então será usado nesse modo.
- Nova coluna **"Item"** na tabela, mostrando `descrição do item · unidade · categoria`, resolvida via lookup em `useCustosItens()`.
- O seletor de item no topo do header continua existindo, mas só serve para **adicionar nova matéria-prima** ao item escolhido (botão "Adicionar" fica habilitado apenas quando um item é selecionado). Também funciona como filtro opcional da tabela.
- Resumo lateral (Custo unitário atual, Qtd total, Custo total, Custo/un calculado) só aparece quando há um item selecionado (igual hoje).

### 2. Fornecedor como Select
- Substituir o `Input` de texto da coluna **Fornecedor** por um `Select` populado por `useFornecedores()` (tabela `fornecedores`, ativos).
- Valor salvo permanece em `fornecedor` (texto) por compatibilidade — gravamos o `nome` do fornecedor escolhido. Opção "— Sem fornecedor —" limpa o campo.
- O mesmo Select é usado para todas as linhas da listagem global.

### 3. Arquivos afetados
- `src/pages/direcao/estrategia/EstrategiaMateriasPrimas.tsx` — refatorar para listagem global, adicionar coluna Item, trocar input por Select de fornecedores.

Sem mudanças de schema, hooks novos ou rotas.
