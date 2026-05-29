## Categorias de Faturamento (unificadas) + coluna "Tipo" na venda

Criar uma tabela de **Categorias de Faturamento** alinhada às categorias do DRE, com **Acessórios + Itens Avulso unificadas em "Itens Avulsos"**, e fazer a coluna **Tipo** da página `/financeiro/faturamento/:id` exibir o nome dessa categoria em vez do `tipo_produto` cru.

### 1. Migration — tabela `categorias_faturamento`

Tabela registry com categorias e o conjunto de `tipo_produto` (de `produtos_vendas`) que cada uma agrupa.

```sql
CREATE TABLE public.categorias_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ordem int NOT NULL DEFAULT 0,
  tipos_produto text[] NOT NULL DEFAULT '{}',
  cor_hex text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categorias_faturamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_faturamento TO authenticated;
GRANT ALL ON public.categorias_faturamento TO service_role;

ALTER TABLE public.categorias_faturamento ENABLE ROW LEVEL SECURITY;

-- leitura aberta a authenticated; mutação apenas admin via is_admin()
CREATE POLICY "categorias_faturamento_select" ON public.categorias_faturamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_faturamento_admin_all" ON public.categorias_faturamento
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_categorias_faturamento_updated_at
  BEFORE UPDATE ON public.categorias_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed alinhado ao DRE
INSERT INTO public.categorias_faturamento (nome, ordem, tipos_produto, cor_hex) VALUES
  ('Portas',         1, ARRAY['porta','porta_enrolar','porta_social'], '#60a5fa'),
  ('Pintura',        2, ARRAY['pintura_epoxi'],                        '#fb923c'),
  ('Instalações',    3, ARRAY['instalacao'],                           '#22d3ee'),
  ('Itens Avulsos',  4, ARRAY['acessorio','adicional','manutencao'],   '#34d399');
```

### 2. Frontend — `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`

- Buscar `categorias_faturamento` (apenas `ativo=true`, ordenado por `ordem`) via React Query/`useEffect`.
- Construir `Map<tipo_produto, { nome, cor_hex }>` derivado da tabela.
- Substituir o helper local `getTipoProdutoLabel` (linhas 1011–1022) pela lookup na categoria; fallback no rótulo antigo se nenhum match.
- Render: `<TableCell>{categoriaPorTipo.get(produto.tipo_produto)?.nome ?? getTipoProdutoLabel(produto.tipo_produto)}</TableCell>` (linha 1273), opcionalmente com chip colorido usando `cor_hex`.

### 3. DRE — `src/pages/direcao/DREMesDirecao.tsx`

Unificar as linhas "Acessórios" e "Itens Avulso" em uma única **Itens Avulsos** para refletir as novas categorias:

- Reduzir `FaturamentoProduto` para `{ portas, pintura, instalacoes, avulsos, total }`.
- No loop que soma valores, mapear `acessorio | adicional | manutencao` → `avulsos`.
- Atualizar tabela "Faturamento por Categoria" (linhas 446–450) para 4 linhas.
- Estados e modais correspondentes (`acessoriosModalOpen`/`avulsosModalOpen`) consolidados em um único `avulsosModal*` que lista todos os `tipo_produto` avulsos.

### Fora de escopo

- Tela de CRUD para `categorias_faturamento` (registro é gerenciado via migration/seed). Pode ser adicionada depois.
- Nenhuma mudança na criação de venda nem em `produtos_vendas` — apenas mapeamento de apresentação.