## Objetivo

Adicionar um campo opcional **Empresa** (referente a uma empresa emissora cadastrada) nas tabelas de **Despesas Fixas**, **Variáveis** e **Impostos** em `/direcao/estrategia/despesas/configuracoes`.

## Mudanças

### 1. Banco de dados (migração)
- `ALTER TABLE public.tipos_custos ADD COLUMN empresa_id uuid REFERENCES public.empresas_emissoras(id) ON DELETE SET NULL;`
- Campo opcional (nullable). Sem default.

### 2. Hook `src/hooks/useTiposCustos.ts`
- Adicionar `empresa_id: string | null` em `TipoCusto`.
- Incluir `empresa_id` no `select(...)`, no `saveTipoCusto` e no `updateTipoCusto`.

### 3. UI — `EstrategiaDespesasConfiguracoes.tsx` (componente `TiposCustoBlock`)
- Carregar lista de empresas via `useEmpresasEmissoras` (somente ativas).
- Adicionar nova coluna **Empresa** entre "Descrição" e "Valor projetado":
  - Cabeçalho `Empresa` (~160px).
  - Célula com `<select>` (estilo glassmorphism igual aos demais inputs) com opção "—" (nenhum) + lista de empresas. Onchange chama `update(i.id, { empresa_id: v || null })`.
  - Linha de inserção: select adicional para escolher empresa no cadastro inicial; estado local `empresaId` resetado junto com os demais ao salvar.
- Sem alterações em totais, DRE ou lógicas de cálculo (campo é apenas informativo/opcional).

## Detalhes técnicos
- Manter padrão `from('tipos_custos' as any)` já usado no hook.
- Select usa `bg-white/5 border-white/10 text-white text-xs h-8 rounded px-2` para consistência visual.
- Nenhuma alteração em PDFs, DRE ou outras telas — escopo restrito à página de configurações.
