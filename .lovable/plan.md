## Objetivo

Adicionar, em todas as linhas da tabela de itens (`/direcao/estrategia/itens`), um botão flutuante posicionado fora da tabela que aparece apenas no hover da linha e abre um modal com um cálculo estático baseado em um preço digitado pelo usuário.

## Comportamento

- Botão pequeno (ícone calculadora) ancorado à direita da linha, **absolute** em relação à `TableRow`, com `right: -2.25rem` (fora da área visível da tabela) para não ocupar coluna.
- Oculto por padrão (`opacity-0`), aparece no hover da linha (`group-hover:opacity-100`) com transição suave. A `TableRow` recebe `relative group`.
- Acessível: `aria-label="Calcular preço da bobina"`, foco-visível mantém o botão visível.

## Modal de cálculo

Abre um `Dialog` com:

- **Input** "Preço por kg (R$)" — único campo editável.
- Bloco de resultado mostrando cada passo da fórmula:
  ```text
  230 kg × {preço}        = X
  X + 3,25% (IPI)         = Y
  Y + R$ 175,00           = Resultado
  ```
- **Resumo final**:
  ```text
  230 kg ≡ 300 m
  Preço por metro = Resultado ÷ 300
  ```
- Todos os valores em `formatCurrency`. Recalcula em tempo real conforme o usuário digita. Sem persistência — modal puramente estático/local.

## Arquivos afetados

- `src/pages/direcao/estrategia/EstrategiaItens.tsx`
  - Adicionar ícone `Calculator` ao import de `lucide-react`.
  - Em `SortableItemRow` (linha ~558): tornar `TableRow` `relative group`; adicionar um `<div className="absolute top-1/2 -translate-y-1/2 right-[-2.25rem] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-auto">` com o botão; estado local `calcOpen` controlando o `Dialog`.
  - Novo componente interno `CalculoBobinaDialog` (mesmo arquivo) com input controlado e renderização dos passos.
- Garantir que o container da tabela tenha `overflow-visible` (verificar wrapper atual; se estiver com `overflow-x-auto`, manter mas usar `overflow-y-visible` ou mover o botão para dentro de uma `TableCell` colapsada com `position: relative` apenas. Decisão final no momento da implementação após confirmar o wrapper).

## Notas técnicas

- Não envolve banco de dados, hooks novos nem mudanças de schema.
- Mantém o padrão glassmorphism (`bg-popover text-popover-foreground border-border`) já usado nos outros diálogos da página.
- Sem alteração de colunas, ordenação ou exportação PDF/Excel.
