# Novo modelo "Contrato de Kit" em /vendas/contratos

## O que muda para o vendedor
- Ao clicar em **Gerar Contrato** numa venda pendente, aparece a escolha do modelo:
  - **Contrato Elisa (com instalação)** — o modelo atual, sem mudanças.
  - **Contrato de Kit (sem instalação)** — novo, igual ao PDF enviado.
- O Contrato de Kit abre um formulário já preenchido com os dados da venda, que o vendedor pode revisar antes de gerar:
  - Comprador: nome, CPF/CNPJ, endereço, cidade/UF, CEP.
  - Material: portas com medidas (L x A), cor, antiesmagamento, nobreak.
  - Motor: capacidade (ex.: 600 kg), voltagem.
  - Preço total, entrada e saldo (valores também escritos por extenso).
- O PDF sai com o texto das 14 cláusulas do anexo, o rodapé "GRUPO ELISA LTDA — CNPJ ... Página X" e os campos de assinatura do vendedor, do comprador e de duas testemunhas.
- Depois de gerado, o contrato segue o mesmo caminho de hoje: Contrato Gerado → Anexar Assinado → Assinado.
- A nota "Minuta revisada... recomenda-se revisão jurídica", que está no fim do anexo, **não** sai no PDF.

## Nova coluna "Tipo de Contrato"
- Aparece nas abas **Contrato Gerado** e **Contrato Assinado**, com uma etiqueta "Elisa" (azul) ou "Kit" (laranja).
- Os contratos que já existem aparecem como "Elisa". Vendas sem contrato gerado pelo sistema, como os assinados antigos, aparecem com "—".

## Detalhes técnicos
- Migração: coluna `tipo_contrato text` em `contratos_vendas` (valores 'elisa' | 'kit'). Os contratos que já existem recebem 'elisa'.
- `src/utils/contratoKitPDFGenerator.ts`: gerador com jsPDF, no mesmo estilo do `contratoElisaPDFGenerator`, com o texto fixo das cláusulas e os campos variáveis no meio do texto.
- `src/components/contratos/GerarContratoKitModal.tsx`: preenche os campos com a venda, os produtos e a cor (mesmas consultas do modal Elisa), gera o PDF e salva com `tipo_contrato='kit'`. O modal Elisa passa a salvar com `'elisa'`.
- `ContratosVendas.tsx`: pequeno seletor de modelo antes de abrir o modal; o carregamento das vendas passa a buscar o tipo do contrato mais recente em `contratos_vendas`; nova coluna em `TableView`.
- Os valores por extenso usam um helper de número por extenso em reais, com um teste curto (ex.: 13000 → "treze mil reais").
