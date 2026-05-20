## Adicionar aba "Catálogo" em `/direcao/estrategia/precos`

A página `TabelaPrecos` já possui suporte nativo às duas abas (**Portas** e **Catálogo** — via `CatalogoPrecosTab`). Hoje a rota `/direcao/estrategia/precos` está suprimindo a aba do catálogo via prop `hideCatalogoTab`.

### Alteração
- `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`: remover a prop `hideCatalogoTab`, passando a exibir as duas abas (Tabela de portas e Catálogo).

Nenhuma outra alteração necessária — o conteúdo da aba Catálogo já é renderizado pelo componente `CatalogoPrecosTab` existente.
