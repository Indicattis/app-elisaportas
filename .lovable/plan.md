## Problema

No DRE (`/direcao/estrategia/dre/{mes}`), ao clicar em **Pintura**, o modal abre mas:

1. Não mostra o kit referenciado (ex.: `(0,70) - (M) - (4") - (300Kg)`).
2. Não mostra as dimensões (`altura × largura`) gravadas na linha.
3. Mostra **R$ 0,00** em bruto/líquido para várias linhas, porque lê `valor_produto` em vez de `valor_pintura` (em `produtos_vendas` do tipo `pintura_epoxi`, o preço real fica em `valor_pintura`; `valor_produto` quase sempre é 0).

A agregação do card "Pintura" usa `valor_total_sem_frete` e funciona — só o modal está errado.

## Mudanças (somente `src/pages/direcao/DREMesDirecao.tsx`)

### 1. Estender a query de detalhes (linha ~1170)

Adicionar `altura, largura, valor_total_sem_frete` e o relacionamento com a tabela de kits:

```ts
.select(`
  id, descricao, quantidade, tipo_produto,
  valor_produto, valor_pintura, valor_instalacao,
  valor_total_sem_frete,
  altura, largura, tabela_precos_porta_id,
  tipo_desconto, desconto_percentual, desconto_valor,
  lucro_item, lucro_pintura,
  tabela_precos_portas:tabela_precos_porta_id(descricao, altura, largura),
  vendas!inner(id, data_venda, cliente_nome, valor_venda, valor_frete)
`)
```

### 2. Corrigir o mapper de `pintura_epoxi` (linhas ~1212–1230)

- **Valor**: usar `valor_pintura` (com fallback para `valor_produto` em linhas legadas).
- **Descrição**: montar string composta:
  - kit (se houver `tabela_precos_portas.descricao`),
  - cor/descrição da linha (`p.descricao`) quando preenchida,
  - dimensões em metros (`{altura} × {largura} m`) quando preenchidas.
  - Fallback final: `'Pintura Epóxi'`.

Exemplo de saída: `Kit (0,70) - (M) - (4") - (300Kg) — Branco — 2,63 × 6,06 m`.

```ts
if (p.tipo_produto === 'pintura_epoxi') {
  const valorUnit = (p.valor_pintura ?? 0) > 0 ? p.valor_pintura : (p.valor_produto || 0);
  const bruto = valorUnit * qty;
  // desconto: mantém regra atual sobre `bruto`
  const kit = p.tabela_precos_portas?.descricao;
  const cor = (p.descricao || '').trim();
  const dim = (p.altura && p.largura)
    ? `${fmtNum(p.altura)} × ${fmtNum(p.largura)} m`
    : null;
  const descricao = [kit && `Kit ${kit}`, cor || null, dim]
    .filter(Boolean).join(' — ') || 'Pintura Epóxi';
  return { ..., valorUnitario: valorUnit, valorBruto: bruto, ... };
}
```

`fmtNum` = helper local que formata com vírgula e até 2 casas (`n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })`).

### 3. Sem mudanças em

- Agregação do card Pintura (continua via `valor_total_sem_frete`).
- Componente `ItensSimplesDetalheDialog` (já renderiza `descricao` livre).
- Modal de Portas, Instalações ou Itens Avulsos.

## Validação

Em `/direcao/estrategia/dre/2026-04` → clicar em **Pintura**:

- Cada linha mostra `Kit … — cor — A × L m` quando os dados existem.
- Valor unit. / Bruto / Líquido refletem `valor_pintura` (não mais R$ 0,00 em linhas vinculadas a kit).
- Subtotal do modal bate com o card Pintura.