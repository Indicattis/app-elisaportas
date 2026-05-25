## Objetivo

Criar um "Template padrão de montagem" — uma lista única de itens (custo_item + quantidade) gerenciada à parte, que pode ser aplicada manualmente a qualquer kit na tela de montagem com um clique.

## 1. Banco de dados

Nova tabela `tabela_precos_montagem_template`:
- `custo_item_id` (uuid, FK lógico para `custos_itens`, UNIQUE)
- `quantidade` (numeric, default 1)
- timestamps padrão

RLS: leitura/escrita pelos mesmos perfis que já gerenciam `tabela_precos_portas_montagem` (admins/diretoria).

Seed inicial: copiar os itens do kit `b5a6faef-105f-484b-a10f-42544ce84617` para o template, para que o template já nasça com a sugestão atual.

## 2. Nova página: gestão do template

Rota: `/direcao/estrategia/kits/template`

UI espelhada da página de montagem do kit (mesmo padrão glassmorphism, mesma tabela), mas sem cálculos de "Lucro adicional"/preço da porta — só:
- Cabeçalho identificando que é o "Template padrão"
- Botão "Adicionar item" (mesmo Popover/Command da montagem)
- Tabela de itens com colunas: Item, Unid., Custo un., Qtd (editável), Subtotal custo, Preço, Preço total, remover
- Card lateral com totais (itens, custo total, venda total)

Hook novo `useMontagemTemplate` espelhando `useKitMontagem` mas sem `kit_id`.

## 3. Acesso à página do template

Em `/direcao/estrategia/kits` (lista de kits): adicionar um botão no topo "Template padrão" que navega para a nova rota.

## 4. Aplicar template no kit

Em `EstrategiaKitMontagem.tsx`, ao lado do botão "Adicionar item", novo botão **"Aplicar template padrão"**:
- Abre um dialog de confirmação resumindo quantos itens serão adicionados
- Ao confirmar: insere em `tabela_precos_portas_montagem` todos os itens do template **que ainda não existem** no kit (filtra por `custo_item_id` já presente). Itens duplicados são pulados silenciosamente; um toast informa "X itens adicionados, Y já existiam".
- Não altera quantidades de itens já presentes (não sobrescreve trabalho manual).

## 5. Detalhes técnicos

- Inserção em massa via `supabase.from('tabela_precos_portas_montagem').insert([...])` com array filtrado.
- Invalida queries `kit-montagem/{kitId}` e `kits-montagem-resumo` após aplicar.
- Tipos atualizados automaticamente após a migração.

## Arquivos

- **migration**: cria `tabela_precos_montagem_template` + RLS + seed do kit b5a6faef
- **novo** `src/hooks/useMontagemTemplate.ts`
- **novo** `src/pages/direcao/estrategia/EstrategiaKitsTemplate.tsx`
- **edit** `src/App.tsx` — rota nova
- **edit** `src/pages/direcao/estrategia/EstrategiaKits.tsx` (lista) — botão "Template padrão"
- **edit** `src/pages/direcao/estrategia/EstrategiaKitMontagem.tsx` — botão "Aplicar template padrão" + dialog
