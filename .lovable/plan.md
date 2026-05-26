## Mover botão de Despesas para o header do DRE

### Problema
O botão de navegação para a página de "Despesas" atualmente aparece como um card no final da página `/direcao/estrategia/dre`. O usuário quer movê-lo para o header da página, ao lado do título "D.R.E".

### Alterações

1. **Remover o card de Despesas** do final do conteúdo de `src/pages/direcao/DREDirecao.tsx`.
2. **Adicionar o botão ao header** via a prop `headerActions` do `MinimalistLayout`, posicionando-o no canto superior direito da página.

O estilo do botão deve seguir o padrão visual já existente na aplicação (glassmorphism, bordas sutis, hover).