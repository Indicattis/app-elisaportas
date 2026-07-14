## Mudança
Trocar autorização de "liberação de regras de pagamento" (entrada de boleto, intervalo, janela de data) de **Gerente** para **Diretor** (senha master).

## Arquivos

**1. `src/components/vendas/PagamentoSection.tsx`**
- No `<AutorizacaoDescontoModal>`: mudar `tipoAutorizacao="responsavel_setor"` → `"master"`.
- Textos: "Regras liberadas pelo Gerente" → "Regras liberadas pelo Diretor" (badge, banner amber, resumo do pagamento, título "Regras infringidas").
- Texto do modal: "Digite a senha do Gerente" → "Digite a senha do Diretor".
- Tooltip do badge "Regras liberadas": trocar Gerente por Diretor.

**2. `src/hooks/useVendas.ts` (linhas 575-591)**
- `verificar_senha_vendas`: `p_tipo: 'responsavel'` → `'master'`.
- `tipo_autorizacao: 'responsavel_setor'` → `'master'`.
- Observação padrão: "liberada pelo Gerente" → "liberada pelo Diretor".

## Não alterar
- Fluxo de desconto (que já usa Gerente/Diretor conforme o percentual) permanece intacto — só a liberação de regras de pagamento muda para exigir sempre senha do Diretor.