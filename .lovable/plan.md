## Mudança

Hoje o +5% extra de desconto é liberado quando `venda_presencial === true` (Quente). O usuário quer o oposto: o +5% deve ser liberado quando a venda for **Frio**.

## Arquivo

`src/pages/vendas/VendaNovaMinimalista.tsx` — trocar todas as 5 ocorrências em que se passa `formData.venda_presencial === true` para `validarDesconto(...)` por `formData.venda_presencial === false`.

Linhas afetadas (todas chamadas a `validarDesconto`):
- 281 (useMemo de validação)
- 522 (validação no submit)
- 564 (validação ao avançar)
- 1071 (badge "dentro do limite")
- 1140 (cálculo do percentual exibido)

Também ajustar a prop `vendaPresencial` enviada na linha 1122 (passada a outro componente) para `formData.venda_presencial === false`, mantendo a semântica de "venda com +5%".

## Fora do escopo

- Nada muda no banco nem na coluna `venda_presencial` (continua boolean).
- A regra de obrigatoriedade do radio (Frio/Quente) permanece igual.
- Nenhuma outra tela é afetada (faturamento, gestão-fábrica continuam só exibindo o rótulo).
