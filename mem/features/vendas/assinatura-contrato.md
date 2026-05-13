---
name: Etapa Assinatura Contrato (vendas)
description: Nova etapa virtual antes de Pend. Faturamento; venda só avança ao anexar contrato em vendas.contrato_url
type: feature
---
Toda venda nova entra em "Assinatura Contrato" e só vai para "Pend. Faturamento" quando `vendas.contrato_url` é preenchido (upload no bucket privado `contratos-vendas`).

- Etapa virtual no front (mesmo padrão de `pendente_pedido`/`pendente_faturamento`); coluna `etapa` em `etapa_responsaveis` é TEXT, então aceita `'assinatura_contrato'`.
- Hook `useVendasAssinaturaContrato`: `is_rascunho=false`, `pedido_dispensado=false`, `contrato_url IS NULL`, não reprovada, não faturada, sem pedido.
- `useVendasPendenteFaturamento` agora exige `contrato_url IS NOT NULL`.
- Vendas legadas (com pedido criado ou faturadas) tiveram `contrato_url='legado'` para não voltarem à nova etapa.
- Modal `AnexarContratoModal` faz upload em `contratos-vendas/{venda_id}/{ts}-contrato.{ext}` e atualiza `contrato_url`, `contrato_assinado_em`, `contrato_anexado_por`.
- Tipos aceitos: PDF, JPG, PNG. Limite: 10 MB.