## Objetivo

Criar **categorias** para despesas (tipos de custos) e agrupar as linhas por categoria dentro de cada bloco (Fixas, Variáveis, Impostos) em `/direcao/estrategia/despesas/configuracoes`, seguindo exatamente o mesmo padrão visual e de interação usado para os setores na seção de Folha Salarial:

- Cada bloco renderiza as linhas agrupadas por categoria, com cabeçalho colorido (paleta cíclica), contador e total.
- Categorias podem ser **criadas, renomeadas, removidas e reordenadas (drag-and-drop)**.
- Em cada linha (existente ou nova) há um seletor de categoria estilo "pill" colorido.
- Categorias são **globais** (compartilhadas entre Fixas, Variáveis e Impostos) — mesma lógica dos setores.
- Linhas sem categoria ficam no grupo "Sem categoria" sempre por último.

Fora de escopo: nenhuma mudança em `/direcao/estrategia/despesas` (lista mensal) ou no DRE — apenas a tela de configurações padrão.

## Mudanças no banco

Migração nova (não toca migrações antigas):

```sql
-- 1) Tabela de categorias (espelha system_setores)
CREATE TABLE public.system_despesas_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_despesas_categorias TO authenticated;
GRANT ALL ON public.system_despesas_categorias TO service_role;

ALTER TABLE public.system_despesas_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read despesas categorias"
  ON public.system_despesas_categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users with admin_companies can manage despesas categorias"
  ON public.system_despesas_categorias FOR ALL TO authenticated
  USING (public.has_route_access(auth.uid(), 'admin_companies'))
  WITH CHECK (public.has_route_access(auth.uid(), 'admin_companies'));

-- 2) Vínculo em tipos_custos
ALTER TABLE public.tipos_custos
  ADD COLUMN categoria_id uuid NULL REFERENCES public.system_despesas_categorias(id) ON DELETE SET NULL;

CREATE INDEX idx_tipos_custos_categoria_id ON public.tipos_custos(categoria_id);
```

Sem seed de categorias — usuário cria as suas próprias.

## Mudanças no frontend

**Novo arquivo** `src/hooks/useDespesasCategorias.ts`: cópia adaptada de `useSetores.ts`, expondo `categorias`, `createCategoria`, `renameCategoria`, `removeCategoria`, `reorderCategorias` e a mesma paleta cíclica (reaproveitar `getSetorPalette` ou exportar uma `getCategoriaPalette` equivalente).

**Atualizar** `src/hooks/useTiposCustos.ts`:
- Adicionar `categoria_id: string | null` na interface `TipoCusto`.
- Incluir `categoria_id` no `select` e propagar nos `save`/`update`.

**Refatorar** `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` — apenas o componente `TiposCustoBlock`:
- Adicionar coluna "Categoria" (pill-select colorida) seguindo o mesmo padrão do select de setor em `FolhaRowCells`.
- Agrupar as linhas por categoria, na ordem definida em `system_despesas_categorias`, com:
  - Cabeçalho do grupo (drag-handle + bolinha colorida + nome editável inline + contador + total + botão remover).
  - Grupo "Sem categoria" sempre por último (não arrastável), igual ao `SETOR_SEM`.
- DnD entre cabeçalhos de categoria usando `@dnd-kit` exatamente como `onSetorDragEnd` na Folha.
- Caixa "Adicionar tipo de custo" mantém o select de categoria (com opção `—`).
- Botão "+ Nova categoria" no header do bloco, abrindo input inline simples (igual ao fluxo de criação de setor já existente, se houver — caso contrário, prompt minimalista no estilo glassmorphism).
- Como categorias são globais, o botão "+ Nova categoria" e a reordenação podem viver em apenas um dos três blocos, ou ser repetidos nos três (decisão: repetir nos três para consistência — qualquer um cria/reordena as mesmas categorias compartilhadas).

Sem mudanças em `DREDespesasDirecao.tsx`, `useGastos.ts`, `EstrategiaDespesasMes.tsx` ou no hook `useDespesas`.

## Detalhes técnicos

- Reaproveitar `getSetorPalette` para colorir categorias (mesma paleta cíclica).
- Manter a estética glassmorphism (`bg-white/5`, `backdrop-blur-xl`, `border-white/10`).
- `categoria_id` é nullable — linhas antigas permanecem em "Sem categoria" sem migração de dados.
- Política RLS reusa `has_route_access(auth.uid(), 'admin_companies')` (mesmo padrão usado recentemente para `empresas_emissoras`), garantindo que quem já gerencia configurações de despesas possa gerenciar categorias.
- Após a migração, regenerar `src/integrations/supabase/types.ts` (automático).

## Resultado esperado

Cada bloco de tipos de custos (Fixas, Variáveis, Impostos) exibe suas linhas agrupadas e ordenáveis por categoria criada pelo usuário, igual à seção de Folha Salarial agrupada por setor — com cabeçalhos coloridos, totais por grupo e drag-and-drop para reordenar as categorias.
