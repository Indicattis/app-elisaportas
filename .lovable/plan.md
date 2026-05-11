## Objetivo
Mover as seções **Requer pintura**, **Cálculo automático** (tamanho + quantidade, incluindo modo Por Tamanho de Porta) e **Regras de quebra de etiqueta** da página `/administrativo/compras/estoque/editar-item/:id` (`EstoqueEditMinimalista.tsx`) para a página de edição de produto da fábrica `/fabrica/produtos/editar/:id` (`ProdutosFabricaEdit.tsx`).

## Escopo

### Em `ProdutosFabricaEdit.tsx` — adicionar
Estender `formData` com:
- `requer_pintura: boolean`
- `modulo_calculo: string`, `valor_calculo: number`, `eixo_calculo: string` (cálculo automático de tamanho)
- `item_padrao_porta_enrolar: boolean`
- `quantidade_padrao: number`
- `qtd_eixo_calculo`, `qtd_operador`, `qtd_valor_calculo` (cálculo automático de quantidade — modo fórmula)
- `qtd_modo_calculo: 'formula' | 'por_tamanho'`, `qtd_porta_p`, `qtd_porta_g`, `qtd_porta_gg` (modo por tamanho de porta)

Hidratação no `useEffect` e persistência no `handleSave` (incluir os campos no `update`).

Adicionar 3 novos Cards (visual coerente com os Cards já existentes da página) entre "Controle de Estoque" e "Histórico de Movimentações":

1. **Card "Produção"** — checkbox `requer_pintura`.
2. **Card "Cálculo Automático"** — replicando os blocos atuais:
   - Cálculo de tamanho (Módulo / Valor / Eixo).
   - Checkbox item padrão para porta de enrolar.
   - Quantidade padrão.
   - Cálculo automático de quantidade com toggle entre **Por fórmula** e **Por tamanho de porta (P/G/GG)** — mesmos campos já implementados.
3. **Card "Regras de Quebra de Etiqueta"** — usar componente `RegrasEtiquetasEditor` passando `estoqueId={id}` e `nomeProduto={formData.nome_produto}`.

### Em `EstoqueEditMinimalista.tsx` — remover
- Checkbox "requer_pintura".
- Toda a seção "Configurações de Cálculo Automático" (tamanho + quantidade + por tamanho de porta + item padrão + quantidade padrão).
- Bloco do `RegrasEtiquetasEditor`.

Manter o restante (informações básicas, descrição, histórico, etc.). Ajustar `formData` e `handleSubmit` removendo as chaves não usadas.

## Notas técnicas
- A coluna `requer_pintura` já existe na tabela `estoque`. Os campos de cálculo automático e P/G/GG também já existem (criados em migrations recentes). Nenhuma alteração de banco é necessária.
- A página da fábrica usa `Card`/`CardHeader`/`CardContent` (não glassmorphism). Manter esse padrão visual nos novos cards.
- `RegrasEtiquetasEditor` já está importado/usado pela página administrativa — apenas mover o import.
- Garantir que o `update` do Supabase em `handleSave` salve os novos campos (incluindo nulificar P/G/GG quando o modo for `formula`, como já é feito hoje).