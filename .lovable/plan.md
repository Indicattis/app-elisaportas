## Adicionar "Gerar Contrato Avulso" em Direção > Vendas > Contratos

### Objetivo
Permitir gerar um contrato (PDF) sem vínculo com uma venda, preenchendo manualmente os dados do cliente e da venda.

### UX
- Em `src/pages/vendas/ContratosVendas.tsx`, no header (apenas quando `scope === 'all'`), adicionar botão "Gerar Contrato Avulso" ao lado dos controles existentes.
- Botão abre um novo modal `GerarContratoAvulsoModal`.

### Novo modal: `src/components/contratos/GerarContratoAvulsoModal.tsx`
- Seleção de Template (usa `useContratosTemplates`, só ativos).
- Formulário manual com campos editáveis correspondentes às variáveis do contrato:
  - **Cliente**: nome*, CPF/CNPJ, telefone, email, endereço, bairro, cidade, estado, CEP.
  - **Venda**: número (livre, default `AVULSO-<timestamp>`), data (default hoje), valor total, valor produtos, valor instalação, valor frete, forma de pagamento, número de parcelas, valor de entrada, previsão de entrega.
  - **Produtos**: lista (textarea livre), quantidade total.
  - **Atendente**: nome (default = usuário logado), telefone.
- Empresa e `data_geracao` preenchidos automaticamente (via `useCompanySettings` + `new Date()`).
- Preview do conteúdo (igual ao `GerarContratoModal`) usando `substituirVariaveis`.
- Botão "Gerar PDF" chama `generateContratoPDF` com `numeroContrato = CONT-AVULSO-<timestamp>`.

### Sem persistência
- Não grava em `contratos_vendas` nem em `vendas` — é apenas geração de PDF avulso. (Pode ser ampliado depois se necessário.)

### Fora de escopo
- Sem alterações de banco, RLS ou hooks de Pend. Faturamento.
- Sem mudanças em "Meus Contratos" (vendedor) — botão só aparece no escopo Direção.
