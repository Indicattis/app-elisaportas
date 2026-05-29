# Vínculo entre produtos da venda e os kits de referência

## Problema

Hoje, ao cadastrar uma venda, os itens em `produtos_vendas` são gravados apenas com valores numéricos (largura, altura, valor_produto, valor_pintura, valor_instalacao…) **sem nenhum link** para a linha do kit que serviu de referência. Validação atual:

| tipo_produto    | linhas | com link p/ catálogo |
|-----------------|-------:|---------------------:|
| porta_enrolar   |    546 | 0                    |
| pintura_epoxi   |    466 | 0                    |
| instalacao      |    401 | 0                    |
| porta_social    |     17 | 0                    |
| manutencao      |     30 | 0                    |
| adicional       |    397 | 201 (parcial)        |
| acessorio       |    230 | 31 (parcial)         |

Sem essa referência fica difícil:
- apurar lucro por item de catálogo;
- alertar incoerências no faturamento (preço/medidas divergentes da tabela);
- rastrear qual linha do kit gerou cada venda quando os preços mudam.

## Solução

Adicionar uma coluna de referência ao kit em `produtos_vendas` e preenchê-la em todos os fluxos de criação/edição de venda. Tabela de origem para portas, pintura e instalação é `tabela_precos_portas` (já indexa altura × largura e tem `valor_porta`, `valor_pintura`, `valor_instalacao`).

### 1. Banco

Migração nova:
- `ALTER TABLE produtos_vendas ADD COLUMN tabela_precos_porta_id uuid NULL REFERENCES tabela_precos_portas(id) ON DELETE SET NULL;`
- Índice em `tabela_precos_porta_id`.
- Backfill: para linhas existentes com `tipo_produto IN ('porta_enrolar','porta_social','pintura_epoxi','instalacao')`, casar por (`largura`,`altura`) na `tabela_precos_portas` com tolerância de 15 cm (regra já usada — ver memória *price-table-tolerance*) e gravar o id do kit mais próximo. Onde não bater, deixar `NULL` (legado).
- Para `pintura_epoxi` e `instalacao`, herdar o mesmo `tabela_precos_porta_id` da porta irmã da mesma venda (mesmo grupo de medidas), refletindo a memória *instalacao-produto-separado*.

### 2. Criação/edição de venda

Locais a ajustar (todos já leem `tabela_precos_portas`):
- `src/pages/vendas/VendaNovaMinimalista.tsx`
- `src/pages/vendas/VendaEditarMinimalista.tsx`
- `src/pages/vendas/PedidoCorrecaoNovo.tsx`
- `src/utils/expandirPortas.ts` (split de quantidade)

No momento em que o sistema escolhe a linha do kit pela medida (já há lookup com tolerância), guardar o `id` retornado e gravá-lo em `tabela_precos_porta_id` ao inserir/atualizar em `produtos_vendas` — para a porta, para a pintura epóxi gerada e para a instalação separada.

### 3. Alertas de incoerência no faturamento

Em `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`, quando o item tem `tabela_precos_porta_id`:
- buscar a linha referenciada;
- comparar `valor_produto` vs `valor_porta`, `valor_pintura` vs `valor_pintura` do kit, `valor_instalacao` vs `valor_instalacao` do kit;
- se divergente além de uma tolerância (configurável, padrão 5%), exibir um aviso amarelo "Valor diverge do kit (R$ X esperado, R$ Y cobrado)" ao lado da linha — sem bloquear o faturamento.

Também aproveitar o link para mostrar uma pequena "etiqueta" do kit (descrição) ao lado do item, facilitando o rastreio visual.

### 4. Detalhamento e cálculo de lucro

Quando `tabela_precos_porta_id` estiver presente, o cálculo de `lucro_produto` pode opcionalmente usar o `lucro` cadastrado na linha do kit como referência adicional (sem mudar a regra atual — apenas exibir comparativo). Mudanças de fórmula ficam fora deste plano.

## Fora de escopo

- Recalcular vendas já faturadas.
- Mudar fórmulas de lucro/custo existentes.
- Criar tabela própria de kits para pintura/instalação (continuam vindo de `tabela_precos_portas`).
- Vínculo de `manutencao` (sem tabela de kit equivalente hoje).

## Resultado esperado

Toda nova venda passa a ter, em cada porta/pintura/instalação, um ponteiro direto à linha do kit que a originou — habilitando alertas no faturamento e relatórios de lucro por kit no futuro.
