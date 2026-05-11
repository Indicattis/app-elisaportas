## Objetivo
Adicionar, no cálculo automático de quantidade do item de estoque, um modo alternativo: definir quantidade fixa por tamanho de porta (P, G, GG), além do modo atual por fórmula (eixo × operador × valor).

## Comportamento

Na seção "Cálculo automático de quantidade" da página `/administrativo/compras/estoque/editar-item/:id`, o usuário escolhe entre dois modos via toggle:

- **Modo Fórmula** (atual): eixo + operador + valor de cálculo.
- **Modo Por Tamanho de Porta** (novo): três inputs numéricos — Qtd P, Qtd G, Qtd GG.

Classificação reusada do sistema (memory): `P < 2m`, `G ≥ 2m`, `GG ≥ 3m`, medida pela **largura** da porta.

Ao inserir o item num pedido:
1. Se modo = `por_tamanho`, calcula tamanho da porta pela largura → retorna Qtd P/G/GG.
2. Se modo = `formula`, usa o cálculo atual.
3. Fallback continua sendo `quantidade_padrao`.

## Mudanças

### Banco de dados (migration)
Tabela `estoque`, novas colunas:
- `qtd_modo_calculo` text (`'formula' | 'por_tamanho'`, default `'formula'`)
- `qtd_porta_p` integer null
- `qtd_porta_g` integer null
- `qtd_porta_gg` integer null

### Frontend

**`src/pages/administrativo/EstoqueEditMinimalista.tsx`**
- Adicionar os 4 campos ao `formData`, ao `useEffect` de hidratação e ao `handleSubmit`.
- UI: Tabs ou radio "Fórmula" / "Por tamanho de porta" controlando qual bloco aparece.
- Bloco novo: 3 inputs numéricos lado a lado (Qtd P, Qtd G, Qtd GG) com legenda das faixas.

**`src/utils/` (novo helper `classificarTamanhoPorta.ts`)**
Função `classificarTamanhoPorta(largura: number): 'P' | 'G' | 'GG'` — retorna a faixa conforme regras do sistema.

**`src/components/pedidos/PedidoLinhasEditor.tsx`** e **`src/components/pedidos/LinhasAgrupadasPorPorta.tsx`** e **`src/components/pedidos/AdicionarLinhaModal.tsx`**
- Estender a query de itens para trazer `qtd_modo_calculo`, `qtd_porta_p/g/gg`.
- Em `calcularQuantidadeAutomaticaItem(...)`/`calcularQuantidadeAutomatica(...)`: se `qtd_modo_calculo === 'por_tamanho'`, classificar pela largura e retornar a Qtd correspondente; senão manter a lógica atual.

### Types
Regenerar `src/integrations/supabase/types.ts` após migration.

## Notas técnicas
- Sem M para manter consistência com a memória "Door sizing classification" e o hub de frete que também usa P/G/GG.
- Largura é o eixo padrão de classificação (consistente com frete e tabela de preços).
- Itens existentes ficam em `qtd_modo_calculo = 'formula'` por default → zero impacto retroativo.