## Botão de PDF de Formalização de Venda em /direcao/vendas/todas

### Objetivo
Adicionar, em cada linha da tabela em `src/pages/direcao/VendasDirecao.tsx`, um botão para baixar um PDF de "Formalização da Venda" com o mesmo conteúdo do orçamento (dados do cliente, atendente, tabela de produtos, resumo financeiro, observações, termos e garantia), porém com o texto adaptado para confirmação da venda.

### 1. Novo gerador de PDF
Arquivo novo: `src/utils/formalizacaoVendaPDFGenerator.ts`
- Base: cópia estrutural de `src/utils/orcamentoPDFGenerator.ts` (layout, logo, dados do cliente, atendente, tabela via `jspdf-autotable`, resumo, termos, garantia).
- Interface `FormalizacaoVendaPDFData`: `{ id, numeroVenda?, dataVenda, cliente, produtos (mesmo shape usado por `vendaIndividualPDFGenerator.ts` — inclui `largura/altura/cor/valor_produto/valor_pintura/valor_instalacao/desconto_*`), valores (valorVenda, valorFrete, valorInstalacao, valorEntrada, valorAReceber), formaPagamento?, observacoes?, atendente?, dataPrevistaEntrega? }`.
- Ajustes de texto para formalização (substituindo o vocabulário de proposta):
  - Título do documento: `FORMALIZAÇÃO DE VENDA` (em vez de `#Proposta`).
  - Nº: usa `numeroVenda` ou `VND-<últimos 8 do id>`.
  - Substitui "Este orçamento tem validade de 30 dias." por bloco de confirmação:
    - "Este documento formaliza a compra e venda dos produtos e serviços descritos acima, ratificando os valores, prazos e condições acordados entre as partes."
    - "Ao efetuar o pagamento, o cliente declara estar ciente e de acordo com as condições, garantias e responsabilidades descritas neste documento."
  - Rodapé: "Elisa Portas LTDA — Documento de formalização de venda".
  - Mantém a página 2 (Informações Importantes, Responsabilidade do Cliente, Termo de Garantia) exatamente como no orçamento.
  - Adiciona linha "Previsão de Entrega" quando `dataPrevistaEntrega` existir e linha "Forma de Pagamento" quando informada.
- Exporta `generateFormalizacaoVendaPDF(data)` que chama `pdf.save(\`formalizacao-venda-${numeroVenda}-YYYY-MM-DD.pdf\`)`.

### 2. Ação na tabela `VendasDirecao.tsx`
- Nova coluna disponível `formalizacao` em `COLUNAS_DISPONIVEIS` (label "Formalização"), `defaultVisible: true`, alinhamento central.
- Estado local `downloadingPdfId: string | null` para desabilitar botão durante a busca.
- Handler `handleDownloadFormalizacao(venda)`:
  - Busca produtos:
    ```ts
    supabase
      .from('produtos_vendas')
      .select('*, cor:catalogo_cores(nome, codigo_hex)')
      .eq('venda_id', venda.id)
    ```
  - Monta o objeto e chama `generateFormalizacaoVendaPDF(...)`.
  - Toasts de sucesso/erro (usa `useToast` já disponível na página).
- Renderiza no `renderCell` case `'formalizacao'`: botão pequeno com ícone `FileDown` de `lucide-react` (tooltip "Baixar formalização"), `onClick` com `e.stopPropagation()`, `disabled` enquanto `downloadingPdfId === venda.id` (mostra `Loader2`).

### Fora de escopo
- Nenhum schema ou RLS novo — reuso de `produtos_vendas`, `vendas` e `catalogo_cores`.
- Nenhuma alteração nos geradores de PDF existentes (`orcamentoPDFGenerator.ts`, `vendaIndividualPDFGenerator.ts`).
- Nenhuma alteração nas rotas.
