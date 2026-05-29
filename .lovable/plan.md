## Contexto

No DRE mensal (`src/pages/direcao/DREMesDirecao.tsx`):
- Hoje `manutencao` é somada junto de `acessorio` + `adicional` na coluna **Itens Avulsos**.
- Acessórios e adicionais já estão unificados em **Itens Avulsos** (correto, manter).
- Pedido: **manutenção** deve passar a somar na coluna **Instalações** (faturamento + lucro), tanto no card principal quanto no modal de detalhes.
- Margens dos itens órfãos (sem vínculo no catálogo) — avulsos e manutenção: **deixar lucro = 0 por enquanto**. Sem migração de dados; ajustamos depois.

## Mudanças

Arquivo único: `src/pages/direcao/DREMesDirecao.tsx`.

1. **Agregação principal (linhas 1033-1039)**:
   - `avulsos` passa a aceitar apenas `['acessorio', 'adicional']`.
   - Bloco `tipo === 'instalacao'` passa a aceitar `['instalacao', 'manutencao']` somando em `fat.instalacoes` / `luc.instalacoes`.

2. **Top 5 itens avulsos (linha 1061)**: remover `'manutencao'` da lista — manutenção não aparece mais no ranking de avulsos.

3. **Modal detalhe Itens Avulsos (linha 1264)**: remover `'manutencao'` do filtro.

4. **Modal/contagem detalhe de Instalações**: localizar onde o `instalacoesDetalhe` é construído (busca por filtro `tipo_produto === 'instalacao'` na seção 1208-1260) e estender para incluir `'manutencao'` com a mesma lógica de cálculo (qty, bruto, desconto, lucro_item).

5. **Sem migração de banco**: lucros órfãos permanecem como estão (0 para manutenção sem custo; avulsos órfãos seguem o valor atual). Revisaremos em iteração futura.

## Fora de escopo

- Não mexer em `FaturamentoCategoria` / outros lugares que já consolidaram avulsos.
- Não tocar em migração SQL nem recalcular `lucro_item` retroativo.
- Sem mudança visual nas colunas (`Portas | Pintura | Instalações | Itens Avulsos | Total`).

## Validação

Após aplicar, abrir `/direcao/estrategia/dre/2026-04` e `/2026-05` e conferir:
- Coluna **Instalações** soma faturamento de manutenções do mês.
- Coluna **Itens Avulsos** não inclui mais manutenção (valor cai).
- Top 5 avulsos não lista manutenções.
- Modal de Instalações lista linhas de manutenção; modal de Itens Avulsos não.
