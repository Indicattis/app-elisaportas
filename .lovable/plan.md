## Problemas em `/logistica/frete/internos`

1. O modal de edição (`FreteDialog`) ainda usa o estilo padrão claro do shadcn, destoando do resto do app (glassmorphism preto + branco já usado, ex.: o próprio `AlertDialog` de exclusão na mesma página).
2. Ao clicar em "Editar", o campo Cidade não aparece preenchido com o valor salvo.

## O que vou fazer

**Arquivo único:** `src/components/frete/FreteDialog.tsx`

### 1. Aplicar o aesthetic unificado (glassmorphism)
- `DialogContent`: `bg-black/90 border-white/10 backdrop-blur-xl text-white`
- `DialogTitle` em branco; labels em `text-white/80`.
- `Input`, `Textarea`, `SelectTrigger`: `bg-white/5 border-white/10 text-white placeholder:text-white/40`.
- `SelectContent`: `bg-black/90 border-white/10 backdrop-blur-xl text-white`, com `SelectItem` em hover branco translúcido.
- Botão "Cancelar": `variant outline` adaptado (`border-white/20 bg-white/10 text-white hover:bg-white/15`); "Salvar" mantém o azul/primary.
- Texto de ajuda do cálculo em `text-white/50`.

### 2. Corrigir preenchimento da Cidade
Causa: o `Select` de cidade depende de `formData.estado` estar setado **antes** de o `<SelectItem>` da cidade existir. Hoje o `useEffect` faz `setFormData` em um único call, mas o `cidadesOptions` (useMemo) já cobre o caso prepensando a cidade se não estiver na lista — porém o `<Select>` shadcn não exibe valor quando `disabled` é true no mesmo render em que recebe o value. Vou:

- Trocar `disabled={!formData.estado}` para considerar também quando estamos editando (`disabled={!formData.estado && !isEditing}` — irrelevante aqui já que estado é setado junto). O fix real:
- Garantir que `cidadesOptions` sempre inclua `formData.cidade` quando houver valor (já faz, mas vou reforçar com trim/normalize para evitar mismatch caso o estado no banco esteja em formato diferente).
- Forçar reset do `Select` apenas quando o usuário troca o estado manualmente (já está), mas **não** zerar a cidade no primeiro render do efeito de prefill.
- Adicionar um `key={frete?.id ?? "novo"}` no `<Select>` da cidade para forçar remontagem quando o registro em edição muda, garantindo que o `SelectValue` reflita o valor atual.

### Fora do escopo
- Nenhuma mudança em hooks, banco, ou na página `FreteMinimalista.tsx`.
- Nenhum ajuste de lógica de cálculo (km × 6) ou validações.
