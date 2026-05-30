Unificar cadastro de despesas em `tipos_custos`, alinhando os formulários de Fixas/Variáveis com os campos de `/financeiro/custos` e migrando Impostos de `despesas_padrao` para `tipos_custos` com novo `tipo='imposto'`.

## Backend

### Migration (schema)
- Em `public.tipos_custos`: dropar `tipos_custos_tipo_check` e recriar permitindo `'imposto'`:
  ```sql
  ALTER TABLE public.tipos_custos DROP CONSTRAINT tipos_custos_tipo_check;
  ALTER TABLE public.tipos_custos ADD CONSTRAINT tipos_custos_tipo_check
    CHECK (tipo = ANY (ARRAY['fixa','variavel','imposto']));
  ```

### Data (via insert tool, após a migration)
- Para cada uma das 13 linhas em `despesas_padrao` com `tipo='imposto'`:
  - INSERT em `tipos_custos` com `nome`, `valor_maximo_mensal=valor`, `tipo='imposto'`, `aparece_no_dre=true`, `ativo=true`, `created_by=<criador da linha original quando disponível>`.
- DELETE das mesmas linhas em `despesas_padrao`.

## Frontend

### `src/hooks/useTiposCustos.ts`
- Alargar `TipoCusto.tipo` para `'fixa' | 'variavel' | 'imposto'`.

### `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- Remover o `SimpleBlock` de "Despesas de Imposto padrão" (que escrevia em `despesas_padrao`).
- Adicionar um terceiro `TiposCustoBlock` para impostos:
  ```tsx
  <TiposCustoBlock
    titulo="Tipos de Custos — Impostos"
    icon={<Landmark className="w-4 h-4" />}
    tipo="imposto"
    items={tiposCustos.filter(t => t.tipo === 'imposto')}
    save={saveTipoCusto}
    update={updateTipoCusto}
    remove={deleteTipoCusto}
  />
  ```
- No `TiposCustoBlock`, completar a linha de criação para casar com os campos do dialog de `/financeiro/custos`:
  - Campos atuais já presentes: **Nome**, **Descrição**, **Valor projetado** (`valor_maximo_mensal`).
  - Adicionar Switch **Aparece no DRE** na célula vazia da coluna correspondente (estado local, default `true`, enviado no `save`).
  - Tipo continua fixado pelo bloco (não exibido — equivalente ao Select do dialog).
- Manter edição inline existente (já cobre todos os campos).

## Detalhes técnicos
- `useDespesasPadrao` continua sem mudanças; a aba Impostos simplesmente deixa de usá-lo.
- `DespesasResumoTopo.tsx` já trata `t.tipo === 'imposto'` em `tipos_custos`; o filtro de `padroes` para impostos passa a vir vazio (compatível, sem refatoração necessária).
- O dialog em `/financeiro/custos` continua intacto e segue restrito a `'fixa' | 'variavel'`.