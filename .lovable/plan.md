## Sinalizar vendas aguardando assinatura de contrato

Em `/administrativo/financeiro/faturamento/vendas`, marcar visualmente as vendas que ainda não têm contrato anexado e impedir o faturamento delas.

### 1. Página de listagem (`FaturamentoVendasMinimalista.tsx`)

- Incluir `contrato_url` no `select` da query de vendas.
- Criar helper `aguardandoContrato(venda)` = `!isFaturada(venda) && !venda.contrato_url`.
- Nova coluna "Contrato" (entre "Faturada" e "Tempo s/ Faturar"):
  - Faturada → ícone `Check` verde.
  - Sem contrato → badge âmbar com `FileSignature` + texto "Aguardando" (tooltip: "Aguardando assinatura do contrato — não pode ser faturada").
  - Com contrato porém ainda não faturada → ícone `FileCheck` azul (tooltip: "Contrato anexado").
- Linha inteira ganha um leve destaque âmbar à esquerda (`border-l-2 border-l-amber-500/60`) quando aguardando contrato.
- Ao clicar numa linha aguardando contrato, em vez de navegar para o detalhamento, exibir toast: "Anexe o contrato em Gestão da Fábrica > Assinatura de Contrato antes de faturar." (a navegação para o detalhamento continua possível via outra ação se necessário — manter clique mas exibindo aviso e ainda navegando, conforme decisão abaixo).

### 2. Página de detalhamento (`FaturamentoVendaMinimalista.tsx`)

- Ler `contrato_url` da venda.
- Se ausente e venda não faturada:
  - Banner âmbar no topo: "Esta venda está aguardando assinatura do contrato. O faturamento só pode ser concluído após o contrato ser anexado em Gestão da Fábrica > Assinatura de Contrato."
  - Botão "Faturar" fica `disabled` com tooltip explicando o motivo.

### Pergunta pendente

Ao clicar numa linha aguardando contrato na listagem, prefere:
- (A) Bloquear o clique e mostrar apenas o toast, OU
- (B) Permitir abrir o detalhamento (que mostrará o banner + botão Faturar desabilitado).

Sem mudanças de banco de dados — `contrato_url` já existe na tabela `vendas`.