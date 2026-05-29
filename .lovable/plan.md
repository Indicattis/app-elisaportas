## Objetivo

Transformar o bloco "Configuração — Estático (% de custo fixa)" (que hoje aparece embaixo do seletor de modo) em um **modal** que abre ao clicar no modo de cálculo, nas abas Instalações e Pinturas.

Como ambas as abas usam o mesmo componente `ConfigLucroEstatico`, a mudança é feita em um único lugar e vale para as duas.

## Mudanças

Arquivo: `src/components/direcao/ConfigLucroEstatico.tsx`

1. Manter o card "Modo de cálculo" como está, mas fazer com que **clicar em qualquer modo** (estático ou fórmula) abra um `Dialog` ao invés de apenas marcar como ativo inline.
2. Remover o card de "Configuração — {modo}" da árvore principal e mover seu conteúdo (campos `% de custo` / `% lucro calculada` para estático; `valor por m²` + bloco de fórmula para `formula_dimensao`) para dentro de um `<Dialog>` do shadcn.
3. O modal contém:
   - Título: `Configuração — {label do modo}`
   - Descrição curta (reaproveita `MODO_INFO[modo].descricao`)
   - Os mesmos inputs já existentes
   - Footer com `Cancelar` (fecha sem salvar) e `Salvar configuração` (mesma lógica `handleSave`, fecha o modal em caso de sucesso)
4. Ao abrir o modal, pré-popular os campos com o valor salvo atual (já feito pelo `useEffect` existente — só precisamos garantir que o estado local não seja sobrescrito enquanto o modal está aberto; usar um estado `open` controlado).
5. O badge "Ativo" no card de modo continua refletindo o modo persistido em `data.modo` (não o estado temporário do modal).
6. Manter o aviso azul informativo ("A nova configuração é aplicada apenas a faturamentos…") fora do modal, no rodapé.

## Detalhes técnicos

- Usar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` de `@/components/ui/dialog`.
- Novo estado: `const [openModo, setOpenModo] = useState<ConfigLucroModo | null>(null)`. Clicar no botão de modo seta esse estado; `onOpenChange(false)` zera para `null`.
- `handleSave` ganha um `setOpenModo(null)` após sucesso.
- Nenhuma alteração em `EstrategiaKits.tsx`, hooks, ou banco.

## Fora de escopo

- Não alterar lógica de cálculo, persistência ou regras de negócio.
- Não mudar a aba de Portas/Kits.
