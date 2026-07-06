## Objetivo
Adicionar um botão "Gerar PDF" em cada visita técnica concluída na listagem `/vendas/visitas-tecnicas`, produzindo um relatório simples com logo da empresa e uma ilustração do vão comparando medidas originais (vão) e finais (porta).

## Escopo
- Somente visitas com conclusão (`tem_conclusao === true`) exibem o botão. Visitas ainda pendentes/agendadas não geram PDF.
- Apenas frontend/apresentação — nenhuma alteração de banco.

## Arquivos
1. **Novo:** `src/utils/visitaTecnicaPDFGenerator.ts`
   - Usa `jspdf` (já presente no projeto, mesmo padrão dos outros geradores).
   - Função `gerarPDFVisitaTecnica(visitaId: string)`:
     - Busca `visitas_tecnicas_agendadas` + responsável (`admin_users`).
     - Busca `visitas_tecnicas_conclusoes` da visita → suas `visitas_tecnicas_portas` (ordenadas).
     - Monta PDF A4 retrato:
       - **Cabeçalho:** logo (`src/assets/logo-empresa.png`) + título "Relatório de Visita Técnica" + nº/data.
       - **Bloco cliente:** título, endereço completo, telefone, responsável, data/hora.
       - **Para cada porta (ordem):**
         - Subtítulo "Vão N — <tipo_serviço/posição>".
         - Tabela compacta: Largura do vão, Altura do vão, Largura total da porta, Altura total da porta, diferença (porta − vão) em cm.
         - **Ilustração vetorial** desenhada com primitivas do jsPDF (retângulos + cotas):
           - Retângulo externo tracejado = vão (largura_vao × altura_vao).
           - Retângulo interno sólido = porta (largura_total × altura_total), centralizado.
           - Cotas laterais/superiores com valores em cm, legenda "Vão" (tracejado) e "Porta" (sólido).
           - Escala automática para caber em ~80×80 mm mantendo proporção.
         - Detalhes extras curtos: caixa motor, guia, meia-cana, cores (se presentes).
       - Quebra de página quando necessário.
     - Rodapé com paginação e data de geração.
     - `doc.save(\`visita-tecnica-<titulo>-<data>.pdf\`)`.

2. **Editar:** `src/pages/vendas/VisitasTecnicasCalendario.tsx`
   - Importar ícone `FileDown` (lucide) e a função nova.
   - No card/linha da listagem, quando `getStatusMeta(v) === 'realizada'` ou `'concluida'`, adicionar botão "PDF" ao lado das ações existentes, chamando `gerarPDFVisitaTecnica(v.id)` com toast de sucesso/erro.
   - Manter responsividade mobile já implementada (botão ícone-only em telas pequenas).

## Ilustração — detalhes técnicos
```text
      ← largura_vao (cm) →
   ┌───────────────────────────┐   ▲
   │  ┌─────────────────────┐  │   │
   │  │                     │  │   altura_vao
   │  │       PORTA         │  │   │
   │  │  (largura_total ×   │  │   │
   │  │   altura_total)     │  │   │
   │  └─────────────────────┘  │   │
   └───────────────────────────┘   ▼
   Tracejado = Vão  |  Sólido = Porta
```
Cotas desenhadas com `doc.line` + `doc.text`; tracejado via `doc.setLineDashPattern([1,1], 0)`.

## Fora de escopo
- Fotos das portas (`visitas_tecnicas_portas_fotos`) — manter simples conforme pedido.
- Alteração de status, permissões ou dados.
