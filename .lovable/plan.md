# Corrigir "Senha de autorização inválida" ao salvar venda

## O que está acontecendo

A tela de venda e a validação final usam **fontes diferentes** para os limites de desconto:

- A tela lê os limites da tabela canônica `regras_vendas` (adicional do responsável = **7%**).
- A validação final, no momento de salvar, lê de `configuracoes_vendas` — tabela cujo acesso é restrito à direção/admins. Para um vendedor comum a leitura volta vazia por permissão, e o código cai nos valores padrão embutidos (adicional = **5%**).

Resultado no caso da imagem: desconto de 10,7% com limite de 5%.

```text
Tela   (adicional 7): 10,7% menor que 12  ->  pede senha do RESPONSÁVEL
Salvar (adicional 5): 10,7% maior que 10  ->  exige senha MASTER (Diretor)
```

O vendedor digita a senha do responsável (que é a pedida na tela), mas a validação final só aceita master e devolve "Senha de autorização inválida".

Confirmado no banco: as duas tabelas hoje têm os mesmos valores (3 / 5 / 7); o problema é a **permissão de leitura** de `configuracoes_vendas`, não o valor.

## Correção

1. Passar a validação final a ler os limites de `regras_vendas` — a mesma fonte que a tela usa e que todo usuário autenticado pode ler. Manter `configuracoes_vendas` apenas como fallback.
2. Se os limites não puderem ser lidos de nenhuma fonte, abortar com mensagem clara em vez de aplicar padrões silenciosos que divergem do que foi mostrado ao vendedor.
3. Melhorar a mensagem de erro: quando a senha for válida mas de nível insuficiente, informar "Esta senha não tem nível suficiente — é necessária a senha do Diretor (master)", em vez de "senha inválida".

## Detalhes técnicos

- `src/hooks/useVendas.ts` (bloco 2.5, ~linhas 190-263): trocar a consulta de `configuracoes_vendas` por `regras_vendas` (mapeando `limite_desconto_fria` para `presencial`), com fallback; diferenciar no erro o caso "senha correta porém nível insuficiente".
- Mesma troca no fluxo de edição de venda, se ele repetir a leitura de `configuracoes_vendas`.
- Sem migração de banco: nenhuma alteração de dados ou de política é necessária.