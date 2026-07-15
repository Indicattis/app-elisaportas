## Objetivo

No cadastro de venda (`/vendas/minhas-vendas/nova` e demais fluxos que usam o mesmo hook), permitir anexar **vários comprovantes** em um bloco único ao final do formulário, sem vínculo com método de pagamento específico.

## Alterações

### Banco
1. Nova migração criando `public.venda_comprovantes`:
   - `venda_id uuid` (FK `vendas.id ON DELETE CASCADE`, indexado)
   - `url text NOT NULL`, `nome text NOT NULL`, `content_type text`, `tamanho_bytes bigint`
   - `uploaded_by uuid` (FK `auth.users.id`)
   - `id`, `created_at` padrão
   - GRANTs para `authenticated` e `service_role`; RLS ativado
   - Policies:
     - SELECT/INSERT/UPDATE/DELETE: qualquer usuário autenticado que enxerga a venda-mãe (`EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_comprovantes.venda_id)` — mesma superfície de leitura das vendas hoje).
   - Trigger `update_updated_at_column` no `updated_at`.

2. Manter `vendas.comprovante_url` / `comprovante_nome` para retrocompatibilidade (usados em `PagamentoResumo`, `ComprovanteUploadModal`, PDFs). Preencher automaticamente com o **primeiro** comprovante inserido, para não quebrar telas legadas.

### Frontend

3. **Novo componente** `src/components/vendas/ComprovantesUploadBlock.tsx`:
   - Recebe `files: File[]` + `onChange(files)`.
   - Botão "Anexar comprovante" que aceita PNG/JPG/PDF e permite selecionar múltiplos arquivos (`multiple`).
   - Lista os arquivos com nome, tamanho e botão de remover.
   - Valida tipo e tamanho (10 MB) por arquivo.

4. **`src/pages/vendas/VendaNovaMinimalista.tsx`** (e páginas irmãs `VendasNova.tsx`, `MinhasVendasEditar.tsx` se compartilham o formulário do hook):
   - Adicionar estado `comprovantes: File[]` e renderizar `ComprovantesUploadBlock` num bloco único abaixo da seção de pagamento.
   - Passar `comprovantes` ao chamar o hook de criação.

5. **`src/components/vendas/MetodoPagamentoCard.tsx`**:
   - Remover o campo `comprovante_file` do card (fica só a flag `ja_pago`).
   - Tirar o `Input` de upload e a validação de arquivo daqui.

6. **`src/hooks/useVendas.ts`**:
   - Aceitar `comprovantes: File[]` no payload de criação/rascunho.
   - Validação: se algum método tiver `ja_pago = true` **ou** tipo `a_vista`, exigir pelo menos **1** comprovante em `comprovantes`.
   - Após criar a venda: subir todos os arquivos para o bucket `comprovantes-pagamento` (`{vendaId}/{timestamp}_{nome}`), inserir em lote em `venda_comprovantes`, e atualizar `vendas.comprovante_url/nome` com o primeiro upload bem-sucedido para retrocompatibilidade.
   - Remover o laço atual que tenta subir `metodo.comprovante_file`.

### Fora do escopo
- Telas de visualização de venda (`PagamentoResumo`, `ComprovanteUploadModal`, PDFs) permanecem lendo o campo legado. Podemos evoluir depois para listar todos os comprovantes.
- Nenhuma alteração na numeração, contas a receber ou fluxo de aprovação.
