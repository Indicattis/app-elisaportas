## Objetivo
Exibir na página `/direcao/vendas/:id` (`VendaDetalhesDirecao.tsx`) o tipo de operação da venda — Entrega, Instalação ou Manutenção — que hoje fica apenas no banco (`vendas.tipo_entrega`) e não aparece na UI.

## Mudanças

### `src/pages/direcao/VendaDetalhesDirecao.tsx`

1. **Tipagem**: adicionar `tipo_entrega: 'entrega' | 'instalacao' | 'manutencao' | null` na interface `Venda`.

2. **Badge no cabeçalho** (logo abaixo do nome do cliente, no `subtitle` ou ao lado do título): renderizar um badge com ícone + label conforme o valor:
   - `instalacao` → ícone `Wrench`, label "Instalação", cor laranja (mesmo tom do card de Instalação já existente)
   - `manutencao` → ícone existente `Wrench`/`Settings`, label "Manutenção", cor verde
   - `entrega` → ícone `Truck`, label "Entrega", cor roxa (mesmo tom do card de Frete)
   - `null`/indefinido → não renderizar

3. **Card resumo**: incluir um pequeno bloco/linha "Tipo de Operação" na seção de informações gerais (junto com `previsao_entrega`, ~linha 559) para reforçar a informação de forma textual.

Sem alterações de banco, hooks ou regras de negócio — apenas leitura e apresentação do campo já existente.

## Detalhes técnicos
- O campo `tipo_entrega` já vem no `select *` da query atual, não precisa ajustar a busca.
- Usar `Badge` do shadcn já importado e os ícones `Wrench`/`Truck` já importados (adicionar `Settings` ou reutilizar `Wrench` para manutenção).
- Cores em classes utilitárias semânticas seguindo o padrão glassmorphism atual (`bg-orange-500/20 text-orange-400 border-orange-500/30`, etc.).
