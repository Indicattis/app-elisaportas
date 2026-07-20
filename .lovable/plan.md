## Objetivo
Exigir autorização por senha do **Diretor** sempre que a venda usar o pagamento "Na Entrega" (seja como tipo do Método 1, seja via flag `pagamento_na_entrega` no Método 2).

## Mudanças

### 1. `src/hooks/useVendas.ts` (validação central)
No fluxo de validação de regras/senhas que já existe para descontos e boleto:
- Detectar se a venda tem pagamento na entrega:
  - `paymentData.metodos[0]?.tipo === 'na_entrega'`, ou
  - `paymentData.pagamento_na_entrega === true`
- Se sim e o usuário logado não for Diretor, exigir senha via mesmo mecanismo já usado (`verificar_senha_vendas` + `get_autorizador_vendas`), forçando cargo mínimo **Diretor**.
- Registrar autorização em `vendas_autorizacoes_desconto` com `motivo = 'pagamento_na_entrega'` e `senha_usada` (padrão do projeto — ver memory `autorizacao-senha-vendas`).
- Aplicar tanto no cadastro de venda quanto na conversão de rascunho → venda.

### 2. `src/components/vendas/PagamentoSection.tsx` (UX)
- Ao selecionar "Na Entrega" no Método 1 (ou quando a flag ficar ativa), exibir aviso inline: *"Requer autorização do Diretor no envio da venda."*
- Não bloquear o clique — a senha é solicitada no submit, igual ao fluxo de desconto excedente.

### 3. `src/components/vendas/AutorizacaoDescontoModal.tsx` (reuso)
- Aceitar um `motivo` opcional (`'desconto' | 'pagamento_na_entrega'`) para adaptar o texto do header/descrição, mantendo o mesmo visual glassmorphism.
- Quando `motivo = 'pagamento_na_entrega'`, o texto explica que a forma de pagamento escolhida exige autorização do Diretor.

### 4. Rascunhos
- Rascunho **não** exige senha (mantém regra atual). A validação só dispara na conversão para venda, como já ocorre para descontos.

## Detalhes técnicos
- Reaproveitar RPC `get_autorizador_vendas` e `verificar_senha_vendas` já existentes.
- Não alterar schema; apenas gravar novo valor em `motivo` de `vendas_autorizacoes_desconto` (coluna text).
- Boleto continua com sua regra própria (não exige senha) — só "Na Entrega" passa a exigir.

## Fora de escopo
- Não altera regras de desconto, boleto ou split automático.
- Não altera configurações em `/direcao/vendas/regras`.