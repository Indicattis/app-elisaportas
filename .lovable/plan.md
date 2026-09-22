# Pesquisa de obrigações no Capital de Giro

## Objetivo
Adicionar uma barra de pesquisa na lista de obrigações em `/direcao/caixa-elisa/capital-giro`.

## Alterações
- Incluir um campo de pesquisa acima da lista, integrado ao visual atual da página.
- Filtrar imediatamente os itens pelo nome, sem alterar os indicadores financeiros nem os dados exportados.
- Exibir uma mensagem específica quando nenhuma obrigação corresponder à busca.
- Permitir limpar a pesquisa pelo próprio campo.

## Detalhes técnicos
- O filtro será local e não fará novas consultas ao banco.
- A comparação ignorará maiúsculas, minúsculas e espaços extras.
- A lista original continuará sendo usada para totais e exportação em PDF.
