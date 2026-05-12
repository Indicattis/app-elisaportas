## Plano

1. Copiar a logo para `src/assets/logo-elisa.png` (a partir do upload).
2. Em `src/utils/pedidoCompraPDF.ts`:
   - Importar a logo: `import logoElisa from "@/assets/logo-elisa.png";` (Vite resolve para uma URL).
   - No início de `gerarPedidoCompraPDF`, carregar a imagem em base64 via `fetch(logoElisa).then(r => r.blob())` + `FileReader` (helper `loadImageAsBase64`).
   - Tornar `gerarPedidoCompraPDF` `async` para aguardar o carregamento.
   - Adicionar a logo no canto superior esquerdo com `doc.addImage(base64, "PNG", margin, y, 45, 14)` mantendo proporção do logo (≈3.3:1).
   - Empurrar o título "Pedido de compra Nº X" para baixo da logo (ajustar `y` inicial para ~30) e manter o restante do layout intacto.
3. Em `src/pages/administrativo/RequisicoesMinimalista.tsx`, ajustar `handleExportarPDF` para `await gerarPedidoCompraPDF(...)` (a função passa a ser async).

Sem mudanças de schema nem de outras telas.
