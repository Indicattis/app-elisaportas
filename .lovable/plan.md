## Plano: Dispensar Contrato em Vendas

### 1. Banco de dados (migration)

Adicionar à tabela `vendas`:
- `contrato_dispensado boolean NOT NULL DEFAULT false`
- `contrato_dispensado_em timestamptz`
- `contrato_dispensado_por uuid`

**Backfill:** marcar como dispensadas todas as vendas faturadas sem contrato:
```sql
UPDATE vendas SET contrato_dispensado = true, contrato_dispensado_em = now()
WHERE faturada = true AND contrato_url IS NULL;
```

### 2. UI — Sidebar direita (`FaturamentoVendasMinimalista.tsx`)

Quando `selectedVenda` tem contrato → manter botão "Ver Contrato".
Quando NÃO tem contrato e NÃO está dispensado → mostrar **dois botões empilhados**:
- "Anexar Contrato" (âmbar, já existe)
- "Dispensar Contrato" (variant outline, ícone `ShieldOff`/`FileX`) — abre `AlertDialog` de confirmação ("Tem certeza? A venda poderá ser faturada sem contrato assinado.") → ao confirmar, `UPDATE vendas SET contrato_dispensado=true, contrato_dispensado_em=now(), contrato_dispensado_por=<uid>` e invalida queries.

Quando NÃO tem contrato mas está dispensado → mostrar badge/botão informativo "Contrato Dispensado" (cinza, ícone `FileX`) — sem ação, ou com opção "Reverter dispensa" (botão pequeno `ghost`).

### 3. Lógica `aguardandoContrato`

Atualizar em **dois arquivos**:
- `FaturamentoVendasMinimalista.tsx` (linha 378–379)
- `FaturamentoVendaMinimalista.tsx` (linha 918)

Nova fórmula:
```ts
aguardandoContrato = !faturada && !contrato_url && !contrato_dispensado
```

Adicionar `contrato_dispensado` ao `select` das duas queries (linhas 254 e 733).

### 4. Coluna "Contrato" na listagem

Atualizar o ícone na coluna `contrato`:
- `contrato_url` presente → `FileCheck` azul (assinado)
- `contrato_dispensado` true → `FileX` cinza (dispensado)
- senão e não faturada → `FileSignature` âmbar (aguardando)
- senão (faturada legada que ficou sem nenhum dos dois — não deve ocorrer após backfill) → traço

### 5. Página de detalhe (`FaturamentoVendaMinimalista.tsx`)

- Banner âmbar de "Aguardando contrato" só aparece se `aguardandoContrato` (já fica oculto após dispensa).
- Botão "Faturar" libera quando dispensado (já fica liberado pela nova fórmula).
- Adicionar pequeno indicador "Contrato dispensado" no header/área de info quando aplicável.

### 6. Hooks de Gestão da Fábrica

- `useVendasAssinaturaContrato.ts` (linha 64): adicionar `.eq("contrato_dispensado", false)` para que vendas dispensadas NÃO apareçam mais na etapa "Assinatura de Contrato".
- `useVendasPendenteFaturamento.ts` (linha 63): trocar filtro `.not("contrato_url", "is", null)` por `.or("contrato_url.not.is.null,contrato_dispensado.eq.true")` para incluir vendas dispensadas em "Pendente Faturamento".

### Não muda

- Modal `AnexarContratoModal` (segue funcionando).
- Bucket `contratos-vendas` e RLS de storage.
- Regras de pagamento, descontos, faturamento em si.