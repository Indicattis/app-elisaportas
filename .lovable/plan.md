## Objetivo

Tornar o card "Autorizados Cadastrados" (em `IndicadoresAutorizados`) clicável em `/autorizados`. Ao clicar, abrir um modal com a listagem completa de autorizados ativos, agrupados/ordenados por estado, exibindo colunas de **Vendedor Responsável** e **Atendente**.

## Escopo

- Apenas frontend, editando **`src/components/autorizados/IndicadoresAutorizados.tsx`**.
- Sem alterações em schema, RLS ou edge functions.
- Página `/autorizados` e `/direcao/autorizados` compartilham `AutorizadosPrecosDirecao`, que consome o mesmo componente — a mudança aparece nos dois lugares (aceitável e coerente com o padrão atual).

## Mudanças

### `src/components/autorizados/IndicadoresAutorizados.tsx`

1. Transformar o primeiro card (`Autorizados Cadastrados`) em botão clicável (cursor pointer + hover), abrindo um novo `Dialog` (`listagemOpen`).
2. Ao abrir o modal, buscar em paralelo:
   - `autorizados` ativos com `id, nome, cidade, estado, vendedor_id, vendedor_responsavel_id`.
   - `admin_users` com `id, nome` (filtrando pelos ids retornados, via `.in('id', [...])`).
3. Montar um `Map<id, nome>` de admin_users e construir a lista final ordenada por `estado ASC, nome ASC`.
4. Renderizar tabela dentro do Dialog com colunas:
   - **Estado** (sigla)
   - **Cidade**
   - **Autorizado** (nome)
   - **Vendedor Responsável** (nome do admin_users referenciado por `vendedor_responsavel_id` ou `—`)
   - **Atendente** (nome do admin_users referenciado por `vendedor_id` ou `—`)
5. Adicionar cabeçalho fixo de agrupamento visual: uma linha divisória com o UF cada vez que o estado mudar (visual leve, mantendo o padrão glass do projeto).
6. Manter loading state (`Carregando...`) enquanto busca. Mostrar contagem total no cabeçalho do modal: `{n} autorizados`.
7. Fechar via botão "Fechar" e/ou clicar fora do Dialog.

## Comportamento resultante

- Em `/autorizados`, clicar no card "Autorizados Cadastrados" abre modal com todos os autorizados ativos.
- Lista ordenada por estado (sigla) e nome, com colunas: Estado · Cidade · Autorizado · Vendedor Responsável · Atendente.
- Nomes resolvidos a partir de `admin_users` (via join client-side pelos ids). Se um vendedor não existir mais em `admin_users`, mostra "—".

## Detalhes técnicos

```text
Card "Autorizados Cadastrados" (button)
  └─ Dialog
     ├─ Header: "Autorizados cadastrados ({n})"
     └─ Table (sticky header):
        Estado | Cidade | Autorizado | Vendedor Responsável | Atendente
        SP     | ...    | ...        | ...                  | ...
```

Sem migração. Sem novas dependências.
