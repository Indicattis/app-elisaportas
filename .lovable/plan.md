
## Objetivo
Transformar a tela `/vendas/contratos` em um kanban com 3 colunas representando o ciclo do contrato de cada venda.

## Colunas do Kanban

1. **Pendente de Contrato** — vendas sem nenhum contrato gerado ainda
   - Critério: venda ativa (não rascunho, não reprovada, contrato não dispensado) **e** sem registro em `contratos_vendas` **e** `vendas.contrato_url IS NULL`
   - Ação principal no card: botão **Gerar Contrato** (abre `GerarContratoElisaModal`)

2. **Contrato Gerado** — contrato já gerado/anexado em `contratos_vendas`, mas ainda não assinado
   - Critério: venda tem ao menos 1 registro em `contratos_vendas` **e** `vendas.contrato_url IS NULL`
   - Ações no card: baixar/abrir o(s) arquivo(s), excluir contrato, e botão **Anexar Assinado** (abre `AnexarContratoModal`, que preenche `vendas.contrato_url` e move o card para a próxima coluna)

3. **Contrato Assinado** — venda com `contrato_url` preenchido (assinatura registrada)
   - Critério: `vendas.contrato_url IS NOT NULL` (e diferente de `'legado'`, para não poluir a coluna com vendas antigas migradas)
   - Card mostra arquivo(s) de `contratos_vendas` + link para baixar o contrato assinado (`contrato_url` no bucket `contratos-vendas`), data de assinatura (`contrato_assinado_em`)
   - Sem ações de transição (final do fluxo)

## Layout (mantendo padrão glassmorphism do projeto)

- Mantém header, breadcrumb, partículas e botão de voltar atuais
- Mantém o input de busca (filtra por cliente / CPF / cidade em todas as colunas simultaneamente)
- Substitui a lista única por um grid de 3 colunas:
  - `grid grid-cols-1 lg:grid-cols-3 gap-4`
  - Cada coluna: header com ícone + título + contador, e lista scrollável de cards (`max-h-[calc(100vh-280px)] overflow-y-auto`)
  - Cards mantêm visual atual (nome, CPF, cidade, data, valor) com estilo `bg-white/[0.03] border border-white/5`
- Largura externa do container aumentada de `max-w-6xl` para `max-w-7xl` para acomodar 3 colunas

## Dados (sem mudanças de schema)

Carregar em paralelo dentro do `useEffect`:
- `vendas` ativas (mesmos filtros de hoje, removendo o `is('contrato_url', null)` para também trazer as assinadas)
- `contratos_vendas` (via hook `useContratosVendas` já existente) agrupados por `venda_id`

Derivar as 3 listas com `useMemo` aplicando os critérios acima, e em seguida aplicar o filtro de busca em cada lista.

## Arquivos afetados

- `src/pages/vendas/ContratosVendas.tsx` — reestruturação do JSX em kanban e ajuste da query/derivações
- Reutiliza: `GerarContratoElisaModal`, `AnexarContratoModal`, hook `useContratosVendas`

Sem mudanças de banco, RLS, rotas ou outros componentes.
