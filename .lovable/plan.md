## Problema

No contrato gerado em `/vendas/contratos`, a linha do motor sai como:

> • MOTOR: 1, de **000 kg** baixo fluxo (...)

O "000 kg" está hardcoded em `src/utils/contratoElisaPDFGenerator.ts` (linha 36). O peso correto está no kit de montagem da porta (`tabela_precos_portas_montagem` → `custos_itens` com `categoria = 'Motores'`), referenciado por `produtos_vendas.tabela_precos_porta_id`.

## Solução

### 1. `src/components/contratos/GerarContratoElisaModal.tsx`

Ao carregar a venda, para cada porta (`tipo_produto` em `porta_enrolar`/`porta_social`/`porta`) com `tabela_precos_porta_id`:

- Consultar `tabela_precos_portas_montagem` filtrando por `kit_id` e fazendo join com `custos_itens` para pegar os itens da `categoria = 'Motores'`.
- Extrair o peso em kg da `descricao` via regex `/(\d+)\s*kg/i` (ex.: "Motor AC 300 Kg" → 300).
- Multiplicar a quantidade do item de motor pela quantidade da porta na venda.

Montar a string `quantidade_motores` no formato pedido (listar por porta), ex.:
- `1 de 300 kg + 2 de 500 kg`
- Se um kit não tiver motor identificável, manter fallback `<qtd> de — kg` e logar `console.warn`.

### 2. `src/utils/contratoElisaPDFGenerator.ts`

Trocar o template fixo na linha 36 de:
```
• MOTOR: ${d.quantidade_motores}, de 000 kg baixo fluxo (...)
```
para:
```
• MOTOR: ${d.quantidade_motores} baixo fluxo (...)
```
(o peso já vem embutido em `quantidade_motores`).

Nenhuma mudança na interface `ContratoElisaData` — o campo `quantidade_motores` continua existindo, só passa a transportar a descrição completa "1 de 300 kg + 2 de 500 kg".

### 3. UI do modal

Manter o input `Quantidade de motores` editável (usuário pode ajustar antes de gerar). Apenas atualizar o `label` para "Motores (qtd + peso)" e o placeholder com um exemplo.

## Arquivos afetados

- `src/components/contratos/GerarContratoElisaModal.tsx` — buscar kits e montar a string.
- `src/utils/contratoElisaPDFGenerator.ts` — remover "de 000 kg" do template.

## Fora de escopo

- Não altera schema do banco.
- Não altera regras de faturamento, kits, ou outras telas.
