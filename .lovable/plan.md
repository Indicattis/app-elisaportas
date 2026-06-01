## Nova seção: Desconto / Acréscimo global na venda

Adicionar uma seção dedicada na página `/vendas/minhas-vendas/nova`, posicionada **abaixo do resumo de pagamento** e antes dos botões de ação, com um único campo global que aplica **Desconto** OU **Acréscimo** sobre o total da venda. Substitui o botão atual "Adicionar Desconto" (modal por produto) por um controle único e mais visível.

### Comportamento

- Toggle "Desconto" / "Acréscimo" (mutuamente exclusivo).
- Toggle de unidade `%` / `R$`.
- Campo numérico para o valor.
- Quando há crédito aplicado, mantém a regra existente: desconto continua bloqueado (acréscimo permanece liberado).
- Acréscimo é livre, sem autorização por senha.
- Desconto continua respeitando os limites e fluxo de autorização já existentes (`validarDesconto`, `AutorizacaoDescontoModal`), reutilizando o badge "% disponível" já presente no header de pagamento.

### Cálculo

- Total base = soma dos produtos + frete.
- Desconto: subtrai do total (% sobre base, ou valor fixo).
- Acréscimo: soma ao total (% sobre base, ou valor fixo).
- O valor resultante substitui o total que alimenta `pagamentoData` e o "Valor a Receber".

### Persistência

Aplicar o desconto/acréscimo global distribuindo proporcionalmente entre os produtos (`desconto_valor` por porta), mantendo a estrutura atual do banco — sem novas colunas. Acréscimo é gravado como `desconto_valor` negativo proporcional, preservando compatibilidade com faturamento/DRE.

### Detalhes técnicos

- Novo componente `src/components/vendas/DescontoAcrescimoSection.tsx` (glassmorphism: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`).
- Estado local em `VendaNovaMinimalista.tsx`: `{ tipo: 'desconto'|'acrescimo', unidade: '%'|'R$', valor: number }`.
- Helper em `src/utils/descontoVendasRules.ts` (ou novo `aplicarAjusteGlobal.ts`) para distribuir o ajuste proporcionalmente entre `portas` e devolver o array atualizado usado em `recalcularValorTotal` e no submit.
- Remover o botão "Adicionar Desconto" e o `DescontoVendaModal` da página (mantém o arquivo do modal por enquanto, sem import).
- Acréscimo dispara apenas validações básicas (valor > 0); desconto continua chamando `validarDesconto` e abrindo `AutorizacaoDescontoModal` quando excede o limite.
- Badge de "% disponível" no header de pagamento continua refletindo o desconto global aplicado.

### Arquivos afetados

- `src/pages/vendas/VendaNovaMinimalista.tsx` — montar a nova seção, remover botão e modal de desconto antigo, recalcular totais.
- `src/components/vendas/DescontoAcrescimoSection.tsx` — novo.
- `src/utils/descontoVendasRules.ts` — helper de distribuição proporcional.