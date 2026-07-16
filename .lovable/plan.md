# Histórico de contratos

Nova página acessada por um botão em `/direcao/vendas/contratos`, listando todas as vendas cujo contrato teve algum desfecho (assinado, dispensado ou liberado sem contrato), com data e responsável de cada evento.

## 1. Botão em `/direcao/vendas/contratos`

Em `src/pages/vendas/ContratosVendas.tsx`, adicionar um botão discreto no header (ao lado dos filtros/actions existentes) com label **"Histórico"** + ícone `History` (lucide). Ação: `navigate('/direcao/vendas/contratos/historico')`.

## 2. Nova rota

- Path: `/direcao/vendas/contratos/historico`
- Registrar em `src/App.tsx` reutilizando o guard `routeKey="direcao_vendas"`.

## 3. Nova página `src/pages/vendas/HistoricoContratos.tsx`

### Header
- Título "Histórico de contratos"
- Subtítulo "Vendas assinadas, dispensadas ou liberadas sem contrato"
- Seletor de mês/ano no header (mês corrente por padrão), no mesmo estilo do relatório de itens avulsos (ChevronLeft / label / ChevronRight).
- Filtrar pelo evento (assinado_em, dispensado_em ou liberado_em) dentro do mês selecionado.

### Fonte de dados
Query única em `vendas`, filtrando `is_rascunho=false` e `dispensada_sistema=false`, trazendo:

```
id, cliente_nome, cpf_cliente, cidade, data_venda, valor_venda, atendente_id,
contrato_url,
contrato_assinado_em, contrato_anexado_por,
contrato_dispensado, contrato_dispensado_em, contrato_dispensado_por,
contrato_liberado_faturamento, contrato_liberado_em, contrato_liberado_por
```

Uso de `.or(...)` para filtrar por período em qualquer um dos três `*_em`:
`contrato_assinado_em.gte...contrato_assinado_em.lte...,contrato_dispensado_em...,contrato_liberado_em...`
(implementado como `.or()` no cliente ou pós-filtro em JS após um fetch amplo do mês).

Segunda query em `admin_users` para mapear `user_id → nome` dos responsáveis e do atendente.

### Regras de classificação (client-side)
Cada venda pode gerar mais de uma linha caso tenha mais de um evento no mês. Para simplicidade e fidelidade ao histórico:

- **Assinado** — quando `contrato_assinado_em` cai no período.
- **Dispensado** — quando `contrato_dispensado=true` e `contrato_dispensado_em` cai no período.
- **Liberado sem contrato** — quando `contrato_liberado_faturamento=true`, sem `contrato_url`, sem `contrato_dispensado`, e `contrato_liberado_em` cai no período.

Cada evento vira uma linha própria (uma venda pode aparecer em até 2 linhas: dispensada e depois liberada, por ex.). Ordenação por data do evento desc.

### Layout
Tabela minimalista glass (bg-white/5, backdrop-blur-xl, border-white/10):

```text
| Data      | Cliente        | Vendedor   | Desfecho              | Responsável   | Valor       |
|-----------|----------------|------------|-----------------------|---------------|------------:|
| 15/07/26  | João Silva     | Fulano     | Assinado              | Ciclano       | R$ 4.500,00 |
| 12/07/26  | Maria Souza    | Beltrano   | Dispensado            | Ciclano       | R$ 3.200,00 |
| ...                                                                                          |
```

Badges por desfecho (mesmas cores já usadas em `ContratosVendas`/`VendaPendentePedidoCard`):
- Assinado → emerald
- Dispensado → âmbar
- Liberado sem contrato → cinza/branco

Estado vazio: "Nenhum contrato movimentado no período".
Loading: skeleton nas linhas.

### Tipos

```ts
type EventoContrato = {
  venda_id: string;
  data_evento: string; // ISO
  cliente_nome: string;
  cpf_cliente: string | null;
  cidade: string | null;
  atendente_nome: string | null;
  desfecho: 'assinado' | 'dispensado' | 'liberado';
  responsavel_nome: string | null;
  valor_venda: number;
};
```

React Query key: `['historico-contratos', inicioISO, fimISO]`, `staleTime: 30_000`.

## Fora do escopo
- Sem filtro por desfecho, sem busca, sem exportação (não pedidos).
- Sem alteração da tela `/direcao/vendas/contratos` além do botão de acesso.
- Sem migração de banco — todos os campos já existem em `vendas`.
- Sem permissões novas.

## Detalhes técnicos
- Datas normalizadas com `T12:00:00.000Z` para comparações (regra do projeto).
- `formatBRL` e helper de data compartilhados com padrão já usado.
- Componente padrão `MinimalistLayout` com breadcrumbs Home → Direção → Vendas → Contratos → Histórico.
