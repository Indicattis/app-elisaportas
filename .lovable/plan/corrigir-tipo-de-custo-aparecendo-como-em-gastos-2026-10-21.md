# Corrigir "Tipo de Custo" aparecendo como "—" em Gastos

## Causa (confirmada no banco)
Em setembro (e também julho e agosto) existe 1 gasto **sem tipo de custo**. Quando o sistema vai buscar os nomes dos tipos, esse gasto vazio entra na lista e faz a busca inteira falhar. Aí **todos** os gastos do mês ficam com "—", mesmo os que têm tipo. Outubro não tem esse problema, então lá os tipos aparecem certinho.

## Correção
1. Ignorar gastos sem tipo na hora de buscar os nomes dos tipos. Assim, todos os outros voltam a mostrar o tipo.
2. O gasto que realmente não tem tipo continua mostrando "Sem tipo" em destaque, para a Alana poder editar e escolher um tipo.

## Detalhes técnicos
- `src/hooks/useGastos.ts`: `tipoCustoIds` e `responsavelIds` com `.filter(Boolean)` (um `null` no `.in()` gera erro de uuid e o mapa fica vazio).
- Mostrar "Sem tipo" quando `tipo_custo_id` for nulo.
