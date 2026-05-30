## Objetivo

Criar uma seção dedicada **"Informações de Entrega"** em `/vendas/minhas-vendas/nova` com escolha entre **Frete Interno** e **Frete por Transportadora**, persistindo o tipo escolhido.

## Mudanças

### 1. Banco — nova coluna `tipo_frete` em `vendas`

- Coluna `tipo_frete text not null default 'interno'` com check `in ('interno','transportadora')`.
- Backfill: registros existentes ficam como `'interno'` (default).
- Sem alteração de RLS/grants (tabela já configurada).

### 2. UI — `src/pages/vendas/VendaNovaMinimalista.tsx`

Nova `Section` "Informações de Entrega" (ícone `Truck`), posicionada logo após **Forma de Pagamento** e antes de **Dados Adicionais**. Remove o campo "Frete (R$)" do bloco Dados Adicionais (que mantém Data da Venda, Previsão de Entrega e Tipo de Entrega).

Conteúdo da nova seção:

- **Tipo de Frete** — dois cards radio no mesmo padrão visual dos cards de "Tipo de Entrega":
  - **Frete Interno** (ícone `Truck`) — valor auto‑preenchido a partir de `useFretesCidades` quando há cadastro para a cidade/estado; readonly + badge "Frete automático" quando há sugestão, editável manualmente quando não há.
  - **Frete por Transportadora** (ícone `Package`/`Building2`) — valor sempre editável manualmente, sem auto‑preenchimento por cidade.
- **Valor do Frete (R$)** — mesmo input atual, com lógica condicional ao tipo.
- Ao trocar de "interno" → "transportadora", o lock por cidade é desativado e o valor permanece editável (mantém o valor digitado/sugerido até alteração manual).

### 3. Persistência

- `VendaFormData` ganha `tipo_frete: 'interno' | 'transportadora'` (default `'interno'`).
- `createVenda` / `createRascunho` enviam `tipo_frete` junto.
- Carregamento por `orcamento_id` lê `tipo_frete` quando existir (fallback `'interno'`).

## Fora de escopo

- Página de edição (`VendaEditarMinimalista`), detalhes, faturamento — não tocadas neste passo.
- Cadastro/seleção de transportadora específica — neste momento o usuário só informa o valor manualmente.

## Detalhes técnicos

```text
public.vendas
  + tipo_frete text not null default 'interno'
    check (tipo_frete in ('interno','transportadora'))
```

Componente: nova `<Section title="Informações de Entrega" icon={Truck}>` com grid 2 colunas (tipo de frete em col‑span‑2, valor em col‑span‑1, status/sugestão abaixo). Reaproveita `freteSugerido` apenas quando `tipo_frete === 'interno'`.