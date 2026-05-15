## Objetivo

Tornar a tabela em `/administrativo/compras/fornecedores` editável inline ao clicar nas células — incluindo o **código numérico** do fornecedor.

## Mudanças

### 1. `src/hooks/useFornecedores.ts`
- Acrescentar `codigo?: number` em `FornecedorFormData` (atualmente só o create gera código). Isso libera o `updateFornecedor` a aceitar `codigo` no patch sem mudar o create.
- O mutation de update já faz `.update(data)` direto, então o novo campo flui automaticamente.

### 2. `src/pages/administrativo/FornecedoresMinimalista.tsx`
- Adicionar um componente local `EditableCell` (mesmo padrão do `ProdutosFabrica.tsx`: clique único entra em modo edição, `Enter` salva, `Esc` cancela, `blur` salva).
- Suportar variações:
  - texto (nome, responsavel, cnpj, cidade, estado)
  - número (codigo) com validação `>0` e máscara `#0000`
  - select (tipo: PF/PJ) usando um `<select>` simples estilizado.
- Substituir as `<TableCell>` de leitura pelas células editáveis, salvando via `updateFornecedor({ id, ...patch })`.
- Manter o botão de lápis (abre o `FornecedorForm` completo para campos não exibidos: bairro, CEP) e o botão de excluir.
- Para `cidade/estado`: dois campos separados na edição (já que são duas colunas no banco), mas mantidos lado a lado na exibição "Cidade - Estado".

### 3. Comportamento de salvamento
- `onSave` chama `updateFornecedor({ id: fornecedor.id, [campo]: novoValor })`.
- Toasts de sucesso/erro já existentes no hook cobrem feedback.
- Em caso de erro (ex.: código duplicado), o React Query revalida e o valor antigo retorna.

## Pontos fora do escopo

- Não alterar o `FornecedorForm` (continua sendo o caminho para editar campos não exibidos).
- Sem mudanças de banco de dados — `fornecedores.codigo` já é editável no schema atual.
- Não tocar em `/estoque/fornecedores` nem `/direcao/estoque/configuracoes/fornecedores`.

## Observações técnicas

- Se `codigo` tiver `UNIQUE` no banco, a tentativa de duplicar dispara erro do Postgres → o toast de erro do `updateMutation` mostra a mensagem.
- O `EditableCell` será local ao arquivo (sem extrair util compartilhada agora) para manter a mudança contida.
