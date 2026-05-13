## Objetivo

Adicionar a logo (imagem enviada) no cabeçalho do PDF de **Lista de Compras** (`gerarListaComprasPDF`).

## Passos

1. Salvar a logo enviada em `src/assets/logo-lista-material.png` (cópia direta do upload).
2. Em `src/utils/listaComprasPDF.ts`:
   - Importar a logo como módulo.
   - Pré-carregar a imagem em base64 (via `fetch` + `FileReader`) — alternativa: usar `Image` + canvas para obter dataURL síncrono no carregamento do módulo. Como `jsPDF.addImage` aceita data URL, faremos uma função util `loadImageDataURL(src)` async e tornaremos `gerarListaComprasPDF` assíncrono (`await loadImageDataURL`).
   - Adicionar `doc.addImage(dataUrl, "PNG", 14, 8, 38, 12)` no canto superior esquerdo do header.
   - Ajustar título/subtítulo permanecendo centralizados (sem alteração de coordenadas, a logo fica à esquerda sem sobrepor).
3. Atualizar os call sites de `gerarListaComprasPDF` para `await` a função (buscar com rg as chamadas em `GestaoFabricaDirecao.tsx` e demais).

## Arquivos afetados

- `src/assets/logo-lista-material.png` (novo)
- `src/utils/listaComprasPDF.ts`
- Call sites que invocam `gerarListaComprasPDF` (adicionar `await`).

## Fora de escopo

- Outros PDFs do sistema.
- Alteração de layout além de inserir a logo.
