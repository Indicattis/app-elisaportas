## Objetivo

Adicionar botão "Exportar PDF" no header de `/direcao/caixa-elisa/planejamento`.

## Implementação

**`src/pages/direcao/caixa-elisa/PlanejamentoPage.tsx`**

1. Importar `FileDown`, `jsPDF`, `autoTable`.
2. Adicionar botão "Exportar PDF" (variant outline glassmorphism) no header ao lado de "Adicionar mês".
3. Gerar PDF A4 retrato com:
   - Título "Planejamento 2 Milhões de Giro" + data de geração.
   - Bloco de indicadores: Total Acumulado, Total Pago.
   - Para cada mês (na ordem já ordenada): título (ex.: "Janeiro de 2026") + tabela dos itens (Nome, Data, Valor, Status) + linha de subtotal do mês.
   - Rodapé com paginação.
4. Nome do arquivo: `planejamento-caixa-elisa-YYYY-MM-DD.pdf`.

## Escopo

Frontend apenas, reutilizando `jspdf` e `jspdf-autotable` já instalados.
