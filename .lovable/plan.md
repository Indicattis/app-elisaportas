## Objetivo

1. Ao gerar contrato em **Pendente**, mostrar feedback de loading na linha e migrar automaticamente a venda para a aba **Contrato Gerado**, com botões de baixar/visualizar.
2. Permitir **retornar** a venda para a aba anterior (excluindo o contrato atual) tanto em **Contrato Gerado** quanto em **Contrato Assinado**.

## Mudanças

### `src/pages/vendas/ContratosVendas.tsx`

**Loading + troca automática de aba ao gerar:**
- Novo estado `generatingVendaId: string | null`.
- Quando o usuário clica **Gerar Contrato**, além de abrir o modal, marcar `generatingVendaId = v.id`. Enquanto estiver setado, a linha exibe um spinner discreto no lugar do botão de ação.
- Passar uma callback `onGerado(vendaId)` ao `GerarContratoElisaModal` que:
  - dispara `setRefreshKey(k => k+1)` (já existente) para recarregar `vendas`,
  - invalida `contratos-vendas` (já feito pelo hook),
  - faz `setActiveTab('gerados')`,
  - limpa `generatingVendaId`.
- Se o usuário fechar o modal sem gerar, também limpar `generatingVendaId`.

**Baixar/visualizar em "Contrato Gerado":**
- A função `renderContratoFiles(vendaId, true)` já lista os arquivos com botão **Download**. Adicionar um botão **Visualizar** (abre `arquivo_url` em nova aba — equivalente ao download mas com `target=_blank` sem `download`). Manter exclusão individual.

**Retornar de aba (novo botão "Retornar" por linha):**
- Em **Contrato Gerado** → botão "Retornar para Pendente":
  - Confirmação ("Isso excluirá o(s) contrato(s) gerado(s). Continuar?").
  - Para cada contrato em `contratosByVenda[v.id]`, chamar `deleteContrato(c.id)` (já remove storage + linha em `contratos_vendas`).
  - Após sucesso, `setRefreshKey(k => k+1)` e manter na aba atual (a venda some dela e aparece em Pendente).
- Em **Contrato Assinado** → botão "Retornar para Gerado":
  - Confirmação ("Isso removerá o contrato assinado. Continuar?").
  - `UPDATE vendas SET contrato_url=null, contrato_assinado_em=null WHERE id=v.id`.
  - Se também houver arquivo no storage referenciado por `contrato_url` (chave do bucket `contratos-vendas`), removê-lo via `supabase.storage.from('contratos-vendas').remove([contrato_url])` antes do update.
  - `setRefreshKey(k => k+1)`.

Botões "Retornar" usam variante `ghost` com borda sutil (`border-white/10 text-white/70 hover:bg-white/10`) e ícone `Undo2` do lucide.

### `src/components/contratos/GerarContratoElisaModal.tsx`

- Adicionar prop opcional `onGerado?: () => void`.
- No `uploadContrato({...}, { onSuccess })`: chamar `onGerado?.()` antes de `onOpenChange(false)`.
- Nenhuma outra alteração de UX.

## Observações técnicas

- A query `useContratosVendas({})` já é invalidada por `uploadContrato` e `deleteContrato`, então a transição entre abas é reativa.
- A coluna `contrato_url` em `vendas` armazena a chave de storage (não URL pública) — por isso o download em **Assinado** já usa `createSignedUrl`. O remove do storage segue o mesmo padrão.
- Não há mudança de schema nem de RLS.
