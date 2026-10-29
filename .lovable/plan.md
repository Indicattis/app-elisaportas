# Exportação de /direcao/estrategia/precos — fundo branco e novas colunas

## O que muda
- O PDF exportado em **Estratégia > Preços** volta a ter **fundo branco**, cabeçalho azul e linhas alternadas em cinza claro (estilo de impressão).
- A tabela passa a ter exatamente estas colunas, nesta ordem:

`#` | `Descrição` | `Largura` | `Altura` | `Preço sugerido` | `Fornecedor 1` | `Fornecedor 2` | `Fornecedor 3` | `Fornecedor 4` | `Fornecedor 5` | `Custo da Porta`

- **#**: número da linha (1, 2, 3...).
- **Descrição, Largura, Altura**: vêm do kit.
- **Preço sugerido** e **Fornecedor 1 a 5**: saem **em branco**, com espaço para preencher à mão.
- **Custo da Porta**: valor da porta menos o lucro (mesmo cálculo da coluna rosa da Tabela de Kits); "—" quando não houver montagem.
- Página em paisagem para caber as 11 colunas; rodapé com data e número da página.
- O **Excel** da mesma tela sai com as mesmas colunas (as em branco ficam vazias para preencher).

## O que não muda
- A exportação da **Tabela de Kits** (/direcao/estrategia/kits) continua com fundo escuro e o gerenciador de colunas atual.

## Detalhes técnicos
- Nova função dedicada (ex.: `exportPrecosFornecedoresPDF/Excel`) em `src/utils/estrategiaPrecosExport.ts`, sem alterar as funções usadas pela página de Kits.
- `EstrategiaPrecos.tsx` passa a chamar as novas funções; Custo da Porta calculado com a mesma lógica de lucro efetivo usada em `TabelaPrecos.tsx`.
- jsPDF + autoTable, `theme: 'grid'`, fundo branco, colunas em branco com largura suficiente para escrita manual.
