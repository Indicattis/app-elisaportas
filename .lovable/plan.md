## Objetivo
Criar fluxo completo de Pós-Vendas: bot.ão no Home → Hub → Lista de pedidos na etapa `pos_vendas` → Formulário de pesquisa de satisfação que, ao ser enviado, arquiva o pedido automaticamente.

## 1. Backend (migração Supabase)

Nova tabela `pesquisas_satisfacao`:
- `pedido_id` (uuid, FK `pedidos_producao`, único)
- `respondido_por` (uuid, admin_users)
- `nota_atendimento` (int 1–5)
- `nota_produto` (int 1–5)
- `nota_instalacao` (int 1–5)
- `recomendaria` (boolean)
- `comentario` (text)
- `quis_comprar_avulsos` (boolean)
- `itens_avulsos` (jsonb — array `[{custo_item_id, descricao, quantidade, preco_venda}]`)
- `avaliou_no_google` (boolean)
- `anexos` (jsonb — array `[{path, nome, tipo}]`)
- `created_at`, `updated_at`

GRANTs para `authenticated`/`service_role`, RLS permitindo leitura/escrita a usuários autenticados (mesmo padrão das demais tabelas operacionais), trigger `updated_at`.

Bucket de Storage `pesquisas-satisfacao` (privado) + policies em `storage.objects` para `authenticated` ler/escrever apenas nesse bucket.

Nova route_key em `app_routes`: `pos_vendas_hub` e `pos_vendas_pedidos`.

## 2. Frontend

### 2.1 Home (`src/pages/Home.tsx`)
- Adicionar item `{ label: "Pós Vendas", icon: Headset, path: "/pos-vendas" }` logo após Logística no `menuItems`.
- Adicionar `'/pos-vendas': 'pos_vendas_'` em `routePrefixMap`.
- Mesmo estilo azul (sem `isGold`).

### 2.2 Nova página `src/pages/pos-vendas/PosVendasHub.tsx`
- Layout idêntico a `LogisticaHub` (breadcrumb, fundo preto, partículas, botão Voltar).
- Um único botão "Pedidos em Pós-Vendas" → `/pos-vendas/pedidos`.

### 2.3 Nova página `src/pages/pos-vendas/PosVendasPedidos.tsx`
- Lista todos `pedidos_producao` com `etapa_atual = 'pos_vendas'`.
- Cada card mostra cliente, número do pedido, data de finalização, status do formulário (Pendente/Respondido).
- Botão "Responder pesquisa" abre dialog/drawer com o formulário.
- Filtro por status (pendente/respondido) e busca por cliente.

### 2.4 Componente `PesquisaSatisfacaoForm.tsx`
Campos:
- Notas (1–5) via estrelas: atendimento, produto, instalação.
- Switch "Recomendaria a empresa?".
- Textarea comentário livre.
- Switch "Cliente quis comprar itens avulsos?" → quando ligado, mostra seletor múltiplo de itens de `custos_itens` com `vendavel_avulso = true` (autocomplete + lista selecionada com quantidade editável; usa `preco_venda` do item).
- Switch "Cliente avaliou no Google?".
- Upload múltiplo de arquivos (drag-and-drop) → envia ao bucket `pesquisas-satisfacao/{pedido_id}/...`, salva metadados em `anexos`.
- Ao salvar: insere em `pesquisas_satisfacao`, depois atualiza `pedidos_producao` arquivando (`arquivo_morto = true` / equivalente já usado quando o pedido é arquivado em `pos_vendas`) e remove o card da lista. Toast de sucesso.

### 2.5 Rotas (`src/App.tsx`)
- `/pos-vendas` → `PosVendasHub`
- `/pos-vendas/pedidos` → `PosVendasPedidos`
- Guardar com `ProtectedRoute` no mesmo padrão.

## 3. Detalhes técnicos

- Itens avulsos: query `from('custos_itens').select('id,descricao,preco_venda,unidade,categoria').eq('vendavel_avulso', true).order('descricao')`. Persistir snapshot (descrição + preço no momento) no jsonb para histórico estável.
- Anexos: usar `supabase.storage.from('pesquisas-satisfacao').upload(...)` com path `${pedido_id}/${crypto.randomUUID()}-${file.name}`; rate-limit simples e limite 10 MB/arquivo.
- Arquivamento automático: usar exatamente o mesmo update que o botão "Arquivar" já dispara em `pos_vendas` (a verificar no `PedidoCard` para reaproveitar a mesma coluna/flag).
- Permissões: adicionar entradas `pos_vendas_hub` e `pos_vendas_pedidos` em `app_routes`; usuários com bypass veem tudo.

## 4. Fora do escopo
- Edição/exclusão de pesquisas já respondidas (somente leitura futura — pode entrar em iteração seguinte).
- Relatórios/dashboards das respostas.
- Disparo de e-mail/WhatsApp ao cliente.
