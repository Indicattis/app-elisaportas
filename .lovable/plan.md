## Contexto

A página `/direcao/aprovacoes/representantes` busca usuários com `.eq('tipo_usuario', 'representante')`, mas o banco de dados não possui nenhum usuário com esse valor. Os "representantes" do sistema são na verdade colaboradores com `role = 'vendedor'`.

## Problema

1. **Usuários inativos não aparecem**: A query busca `tipo_usuario = 'representante'`, mas no banco todos os representantes/vendedores têm `tipo_usuario = 'colaborador'` (default da tabela). Resultado: nenhum usuário é retornado.
2. **Ordenação**: O usuário pediu ordem do mais novo ao mais antigo. O código já usa `.order('created_at', { ascending: false })`, que está correto.

## Solução

Alterar a query no `AprovacoesRepresentantes.tsx`:

```diff
- .eq('tipo_usuario', 'representante')
+ .eq('role', 'vendedor')
```

Isso buscará todos os colaboradores com papel de vendedor (ativos e inativos), e o filtro local `todos/ativos/inativos` já funciona corretamente.

## Arquivo afetado
- `src/pages/direcao/aprovacoes/AprovacoesRepresentantes.tsx` — linha 42

## Fora do escopo
- Nenhuma mudança no layout, filtros, RLS, ou outras funcionalidades da página.
