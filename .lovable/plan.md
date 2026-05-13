## Plano: Botão Anexar/Ver Contrato na sidebar direita

**Arquivo:** `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

No `selectedVendaContent` (sidebar direita quando uma venda está selecionada), acima do botão "Abrir Faturamento", adicionar um novo botão condicional baseado em `selectedVenda.contrato_url`:

- **Se `contrato_url` existir** → botão **"Ver Contrato"** (variant outline, ícone `FileCheck`). Ao clicar: gera signed URL via `supabase.storage.from('contratos-vendas').createSignedUrl(contrato_url, 3600)` e abre em nova aba.

- **Se NÃO existir** → botão **"Anexar Contrato"** (cor âmbar para sinalizar pendência, ícone `FileSignature`). Ao clicar: abre o `AnexarContratoModal` já existente passando `vendaId` e `clienteNome`.

**Mudanças adicionais no mesmo arquivo:**
- Importar `AnexarContratoModal` de `@/components/vendas/AnexarContratoModal`
- Importar ícones `FileSignature` e `FileCheck` (já presentes no arquivo conforme implementação anterior)
- Adicionar state `anexarContratoOpen: boolean`
- Renderizar `<AnexarContratoModal>` no fim do componente, controlado por esse state, recebendo `selectedVenda?.id` e `selectedVenda?.cliente_nome`

**Não muda:** lógica de bloqueio do faturamento, banner âmbar, regras de negócio, modal de anexo (já implementado), bucket de storage. Apenas presentação na sidebar.