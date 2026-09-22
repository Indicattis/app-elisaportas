# Corrigir medidas das linhas nas ordens de produção

## Diagnóstico confirmado

No pedido **#0442**, as linhas cadastradas no pedido estão corretas:

- Meia-cana: **8,07 m**
- Meia-cana: **2,87 m**

Porém, a ordem de perfiladeira **OPE-2026-0256** recebeu respectivamente **8,23 × 3,00 m** e **2,95 × 2,80 m**, que são as dimensões das portas vinculadas.

A criação normal das ordens já copia as medidas de `pedido_linhas`. A divergência está na rotina usada para **regenerar as linhas da ordem**: ela lê `tamanho`, `largura` e `altura` do produto da venda (a porta), em vez da linha cadastrada no pedido.

## Implementação

1. Corrigir a rotina de regeneração para sempre copiar `tamanho`, `largura` e `altura` diretamente da respectiva linha do pedido.
2. Manter da porta vinculada apenas os dados que pertencem à porta, como cor e tipo de pintura.
3. Sincronizar todas as linhas de ordens já existentes que estejam divergentes, usando `pedido_linhas` como fonte oficial — incluindo o pedido #0442 e ordens concluídas.
4. Não alterar quantidades, conclusão, responsáveis, pontuação ou histórico das ordens nessa correção de dados.
5. Validar no banco que a ordem do pedido #0442 passe a mostrar **8,07 m** e **2,87 m**, e verificar que não restem divergências de medidas entre linhas do pedido e linhas das ordens.

## Detalhes técnicos

- Atualizar a função `regenerar_linhas_ordem` no banco.
- Corrigir `linhas_ordens.tamanho`, `largura` e `altura` somente quando a linha estiver vinculada por `pedido_linha_id` e algum desses valores for diferente.
- Usar comparação segura para valores nulos, garantindo uma sincronização fiel sem tocar em linhas manuais sem vínculo.
