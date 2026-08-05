# Gerar Contrato Avulso em /vendas/contratos

## Situação atual
A página `/vendas/contratos` (Meus Contratos) reutiliza o mesmo componente de `/direcao/vendas/contratos`, mas o botão "Gerar Contrato Avulso" está dentro de um bloco exibido apenas quando o escopo não é "meus". O modal de geração já existe e funciona.

## O que muda
- Exibir o botão "Gerar Contrato Avulso" também no escopo "meus" (`/vendas/contratos`).
- Manter o botão "Histórico" restrito à visão de direção.
- Nenhuma mudança de dados, permissões ou lógica de geração — o mesmo modal existente é reaproveitado.

## Detalhe técnico
Em `src/pages/vendas/ContratosVendas.tsx`, mover o botão de contrato avulso para fora da condição `!isMeus`, deixando o container de ações sempre renderizado e apenas o botão "Histórico" condicionado a `!isMeus`.