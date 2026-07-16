
## Objetivo

Adicionar uma seção "Contrato" no sidebar de detalhes da venda em `/administrativo/financeiro/faturamento/vendas` para pré-visualizar o contrato anexado sem precisar abrir em outra aba.

## Alteração

### Arquivo único: `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`

1. Novo estado `contratoPreviewUrl: string | null` e `contratoPreviewLoading: boolean`.
2. `useEffect` disparado quando `selectedVenda?.id` muda: se `selectedVenda.contrato_url` existir e for diferente de `'legado'`, chamar `supabase.storage.from('contratos-vendas').createSignedUrl(path, 3600)` e guardar em `contratoPreviewUrl`. Se não houver contrato, zerar.
3. Dentro de `selectedVendaContent`, logo antes do bloco atual do botão "Abrir Faturamento" (linha ~1333), inserir uma nova seção:
   - Título: "Contrato" (mesmo estilo dos outros títulos: `text-xs font-semibold text-white/50 uppercase tracking-wider mb-3`).
   - Se `contrato_url` presente:
     - Container arredondado com borda (`bg-white/5 border border-white/10 rounded-lg overflow-hidden`).
     - Se a extensão do arquivo for `.pdf` (ou o content-type inferido pela URL): renderizar `<iframe src={contratoPreviewUrl} className="w-full h-64" />`.
     - Se for imagem (`.jpg`, `.jpeg`, `.png`): renderizar `<img src={contratoPreviewUrl} className="w-full h-64 object-contain bg-black/20" />`.
     - Se ainda carregando: skeleton com altura fixa.
     - Se erro/URL indisponível: fallback com texto e ícone.
   - Se `contrato_liberado_faturamento` (sem url e sem dispensa): badge cinza "Liberado sem contrato".
   - Se `contrato_dispensado`: badge cinza "Contrato dispensado".
   - Se nada: badge âmbar "Aguardando contrato".
4. O botão "Ver Contrato" existente permanece após a preview (abre em nova aba para tela cheia). Sem alterações nos botões "Anexar/Dispensar".

## Fora do escopo

- Sem mudança em `AnexarContratoModal`, hooks de contratos, schema, ou permissões do bucket.
- Sem preview em outras telas (Contratos / Gestão de Fábrica).
