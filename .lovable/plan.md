## Problema

Em `/logistica/frete/internos`:
1. A lista não carrega todas as 1.159 cidades (mesmo com paginação no fetch, algumas cidades não aparecem na busca).
2. Não há paginação visual — a tabela tenta renderizar tudo de uma vez.
3. A busca não encontra cidades digitadas (provavelmente por acentos/caixa).

## Solução

### 1. Busca robusta (acento-insensível)
Em `src/pages/logistica/FreteMinimalista.tsx`, normalizar tanto o `searchTerm` quanto `frete.cidade`/`frete.estado` removendo acentos antes de comparar:

```ts
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
```

Assim "sao paulo", "São Paulo", "SAO PAULO" e "são paulo" casam.

### 2. Garantir carregamento completo
Em `src/hooks/useFretesCidades.ts`, manter o loop de paginação já adicionado, mas adicionar `console.log` de contagem só durante validação e usar `head: false` + `count: 'exact'` na primeira página para logar o total esperado vs carregado. Se ainda houver discrepância, fazer fallback para `select('*').limit(2000)` sem `.range()`.

### 3. Paginação visual da tabela
Adicionar paginação client-side com 50 registros por página:
- Estado: `currentPage`, constante `PAGE_SIZE = 50`.
- Resetar `currentPage` para 1 sempre que `searchTerm` ou `filterEstado` mudar.
- Renderizar apenas `fretesFiltrados.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE)`.
- Rodapé com: "Mostrando X–Y de Z" + botões Anterior/Próxima + indicador "Página N de M".
- Estilo glassmorphism existente (`bg-white/5`, `border-white/10`, texto branco).

### Arquivos alterados
- `src/pages/logistica/FreteMinimalista.tsx` — busca normalizada + paginação visual.
- `src/hooks/useFretesCidades.ts` — validação do carregamento completo.
