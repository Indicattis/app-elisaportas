## Objetivo
Permitir gerar e anexar contratos diretamente em **Meus Orçamentos**, espelhando o fluxo de Contratos em Vendas, sem depender de a venda existir.

## 1. Banco — nova tabela `contratos_orcamentos`
Migração criando tabela isolada (mesma estrutura de `contratos_vendas`):

- `id uuid pk`
- `orcamento_id uuid not null` → FK `orcamentos(id)` on delete cascade
- `template_id uuid null` → FK `contratos_templates(id)`
- `arquivo_url text not null`
- `nome_arquivo text not null`
- `tamanho_arquivo int not null`
- `observacoes text null`
- `uploaded_by uuid null`
- `created_at`, `updated_at`
- GRANTs para `authenticated` e `service_role` (sem anon)
- RLS: SELECT/INSERT/UPDATE/DELETE para `authenticated` cujo `orcamento.atendente_id = auth.uid()` **OU** `public.has_role(auth.uid(),'admin'::user_role)`
- Trigger `update_updated_at_column` para `updated_at`
- Bucket de storage reaproveitado: `contratos-vendas` (mesmo bucket, prefixo `orcamentos/<id>/...`).

## 2. Hook
`src/hooks/useContratosOrcamentos.ts` — clone enxuto de `useContratosVendas` operando sobre `contratos_orcamentos` e prefixo `orcamentos/{id}/` no bucket. Mesmas mutations: `uploadContrato`, `deleteContrato`, listagem por `orcamentoId`.

## 3. Modais
Criados em `src/components/contratos/`:

- **`GerarContratoElisaOrcamentoModal.tsx`** — adaptado do `GerarContratoElisaModal`:
  - Lê de `orcamentos` + `orcamento_produtos` + `clientes` (via `cliente_id` do orçamento)
  - Reaproveita lógica de cálculo de motores via `tabela_precos_portas_montagem` (kit_id em `orcamento_produtos.tabela_precos_porta_id` se existir; caso contrário usa qtdPortas)
  - Mantém o mesmo `generateContratoElisaPDF`
  - Upload via `useContratosOrcamentos`
- **`UploadContratoOrcamentoModal.tsx`** — clone do `UploadContratoModal` operando no novo hook.

## 4. UI em Meus Orçamentos
`src/pages/vendas/MeusOrcamentos.tsx`:

- Botão `FileSignature` em cada linha da lista (ao lado do valor), com `stopPropagation` para não navegar ao detalhe.
- Abre um pequeno **`ContratosOrcamentoModal`** (novo, espelho do `ContratosVendaModal`): lista contratos do orçamento + botões "Gerar Contrato" e "Vincular Contrato".
- Indicador visual sutil (badge) quando o orçamento já tem ≥1 contrato — query agregada por `orcamento_id in (...)` no carregamento.
- Disponível para **qualquer status** (sem restrição).

## 5. Pontos técnicos
- Arquivos no Storage: `contratos-vendas/orcamentos/{orcamento_id}/{timestamp}-{nome}.pdf` (bucket já existe, política do bucket já permite uploads autenticados).
- Os types do Supabase são regenerados automaticamente após a migration.
- `uploaded_by` preenchido com `auth.uid()` quando disponível.
- Nada do fluxo de Vendas é alterado.

## Arquivos
```text
supabase/migrations/<timestamp>_contratos_orcamentos.sql   (novo)
src/hooks/useContratosOrcamentos.ts                        (novo)
src/components/contratos/GerarContratoElisaOrcamentoModal.tsx (novo)
src/components/contratos/UploadContratoOrcamentoModal.tsx  (novo)
src/components/vendas/ContratosOrcamentoModal.tsx          (novo)
src/pages/vendas/MeusOrcamentos.tsx                        (editar)
```
