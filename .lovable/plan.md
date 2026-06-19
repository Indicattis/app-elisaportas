## Adicionar colunas de datas em /logistica/instalacoes

### Contexto
A página `/logistica/instalacoes` exibe uma tabela de instalações finalizadas. O usuário solicitou adicionar 2 colunas de datas:
1. **Data do cadastro do pedido** — vem de `pedidos_producao.created_at`
2. **Data de finalização** — já existe na tabela como `finalizado_em` (coluna "Finalizado em" já presente)

### Implementação

1. **`src/hooks/useInstalacoesFinalizadas.ts`**
   - Adicionar `data_cadastro?: string | null` na interface `InstalacaoFinalizada`
   - Expandir o `.select()` para incluir `pedidos_producao:pedido_id(created_at)`
   - No `.map()` de resposta, extrair `r.pedidos_producao?.created_at ?? null`

2. **`src/pages/logistica/OrdensInstalacoesLogistica.tsx`**
   - Adicionar coluna "Cadastro" no `<thead>` (antes ou próximo às outras datas)
   - Adicionar célula no `<tbody>` formatando a data com `new Date(r.data_cadastro).toLocaleDateString("pt-BR")`
   - A coluna "Finalizado em" já existe e permanece inalterada

### Nota
A coluna "Finalizado em" (`finalizado_em`) já está presente na tabela atualmente. Será mantida e apenas a coluna de cadastro será adiciona. Se for necessário renomear/reorganizar as colunas existentes, ajustamos na execução.
