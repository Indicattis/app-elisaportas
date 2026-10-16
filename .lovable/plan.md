# Coluna "Custo Porta" e gestão de colunas na Tabela de Kits

## O que muda
1. **Nova coluna "Custo Porta"** (texto rosa) entre "Valor Porta" e "Lucro": Valor Porta − Lucro da porta (mesmo lucro exibido na tela, incluindo o calculado pela montagem). Sem lucro → "-".
2. **Botão "Colunas"** no topo da tabela (mesmo componente já usado em Minhas Vendas): marcar/desmarcar e arrastar para reordenar, com "Restaurar Padrão". A escolha fica salva na sessão do navegador.
3. **Exportação PDF e Excel** passa a sair só com as colunas visíveis, na mesma ordem da tela (inclui "Custo Porta" quando visível). Colunas de lucro por tipo seguem as visíveis; "Lucro Total" e itens avulsos permanecem como hoje.

Colunas gerenciáveis: Largura, Altura, Valor Porta, Custo Porta, Lucro, % Lucro, Valor Instalação, Lucro Instalação, % Lucro Inst., Valor Pintura, Lucro Pintura, % Lucro Pint., Total, Montagem. "#", "Descrição" e "Ações" ficam fixas.

## Detalhes técnicos
- `src/pages/TabelaPrecos.tsx`: definição de colunas (id, label, render da célula, valor para export); persistência via `sessionStorage` (variação do `useColumnConfig` com storage de sessão, chave `estrategia_kits_columns`); `ColumnManager` em `extraHeaderActions`/barra da tabela, apenas quando `enableReorder` (tela de Estratégia) para não afetar outras telas. Props existentes (`hideLucroColumn`, `readOnly`, etc.) continuam filtrando as colunas disponíveis.
- `useColumnConfig`: novo parâmetro opcional `storage: 'local' | 'session'` (padrão local, sem quebrar usos atuais).
- `src/utils/estrategiaPrecosExport.ts`: PDF/Excel recebem lista de colunas `{label, valor(item)}` e montam cabeçalho/linhas dinamicamente; adicionar `custoPorta` ao mapa de lucros.
- Cor rosa via `text-pink-400` seguindo o padrão de cores já usado na tabela; no PDF, texto rosa [236,72,153].
