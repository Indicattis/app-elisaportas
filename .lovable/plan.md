## Permitir dispensa de contrato em /direcao/vendas/todas

### Objetivo
Na tabela de vendas em `src/pages/direcao/VendasDirecao.tsx`, permitir que o usuário com acesso à página dispense o contrato de uma venda que ainda não tem contrato assinado nem foi dispensada.

### Alterações em `src/pages/direcao/VendasDirecao.tsx`

1. Estados novos:
   - `dispensarVenda: VendaRow | null`
   - `dispensandoId: string | null`

2. Célula `faturada` (por volta da linha 733):
   - Quando `!venda.contrato_url && !venda.contrato_dispensado && !venda.dispensada_sistema`, além do rótulo "Sem contrato" já existente, exibir um botão pequeno "Dispensar" (ícone `FileX` ou `MinusCircle`) logo abaixo/ao lado que, ao clicar, faz `e.stopPropagation()` e chama `setDispensarVenda(venda)`.
   - Quando `venda.contrato_dispensado === true`, trocar o texto "Sem contrato" por "Contrato dispensado" em tom mais neutro (white/40).

3. Novo `AlertDialog` de confirmação (fim do JSX, seguindo padrão de `src/pages/vendas/ContratosVendas.tsx` linhas 782–825):
   - Título: "Dispensar contrato?"
   - Mensagem: "A venda de {cliente_nome} será marcada como sem necessidade de contrato assinado. Esta ação fica registrada e pode ser revertida pela equipe administrativa."
   - Ao confirmar:
     - `setDispensandoId(dispensarVenda.id)`
     - `supabase.from('vendas').update({ contrato_dispensado: true, contrato_dispensado_em: new Date().toISOString(), contrato_dispensado_por: user?.id ?? null }).eq('id', dispensarVenda.id)`
     - Em caso de sucesso: toast, `queryClient.invalidateQueries({ queryKey: ['vendas'] })`, fechar dialog.
     - Em caso de erro: toast de erro.
     - `finally`: limpar `dispensandoId`.
   - Import `AlertDialog*` de `@/components/ui/alert-dialog` (já usado em outros pontos do projeto).

### Fora de escopo
- Nenhum novo schema. Colunas `contrato_dispensado`, `contrato_dispensado_em`, `contrato_dispensado_por` já existem em `vendas` e a política RLS já permite update para direção (mesma UI hoje é usada por atendente na página de contratos).
- Nenhuma alteração em `useVendas`, `ContratosVendas.tsx` ou em qualquer outra tela.
- Sem gate por senha/permissão adicional — quem tem acesso à rota `/direcao/vendas/todas` já é considerado autorizado.
