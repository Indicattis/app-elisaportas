## Objetivo
Substituir o fluxo legado de "Novo Orçamento" por uma experiência cart-style em `/vendas/meus-orcamentos/novo`, onde o vendedor adiciona portas (com cálculo automático via tabela de preços), itens avulsos (do catálogo `custos_itens`), frete (matriz `frete_cidades`) e o nome do cliente. Ao concluir, salva no banco e gera PDF idêntico ao modelo "Elisa Portas - 0622".

## Mudanças

### Rota + listagem
- `MeusOrcamentos.tsx`: trocar `navigate('/dashboard/orcamentos/novo')` por `/vendas/meus-orcamentos/novo`. Cards/itens linkam para `/vendas/meus-orcamentos/:id` (visualização + reexportar PDF).
- Adicionar rotas novas em `App.tsx`:
  - `/vendas/meus-orcamentos/novo` → `MeuOrcamentoNovo`
  - `/vendas/meus-orcamentos/:id` → `MeuOrcamentoDetalhe`

### Página hub (`MeuOrcamentoNovo.tsx`)
Layout glassmorphism (igual referência 2):
- Topo: campo `Nome do cliente` (obrigatório).
- 3 cards de ação: **Adicionar porta**, **Adicionar item avulso**, **Adicionar frete**.
- Lista do "carrinho" abaixo agrupada por tipo, cada linha com descrição, qty, preço e botão remover.
- Resumo lateral/inferior: total portas, total pintura+instalação, total itens, frete, **Total da proposta**.
- Botões: **Salvar e gerar PDF**, **Salvar rascunho**.

### Modal "Adicionar porta" (referência 1)
- Largura/Altura (m, com vírgula).
- Toggle "Guia escondido (+30 cm largura)" e "Rolo escondido (+50 cm altura)".
- Toggle "Pintura Epóxi" e "Instalação Equipe Elisa Portas".
- Quantidade.
- Cálculo automático: busca em `tabela_precos_portas` o registro `ativo=true` que case largura/altura (com tolerância de 15 cm, regra já existente). Soma `valor_porta + valor_pintura (se on) + valor_instalacao (se on)`. Mostra preço calculado em destaque.
- Se não houver linha compatível, mostra alerta "Preço não cadastrado para essa medida".

### Modal "Adicionar item avulso"
- Combobox sobre `custos_itens` filtrado por `vendavel_avulso=true`, ordenado por `categoria, descricao`.
- Campos: quantidade (default 1), preço (default `preco_venda`, editável).
- Botão Adicionar.

### Modal "Adicionar frete"
- Selects de Estado → Cidade carregando `frete_cidades` (`ativo=true`).
- Mostra valor automaticamente; permite override manual.

### Persistência (sem mudança de schema)
Reusa tabela `orcamentos` existente:
- `cliente_nome`, `atendente_id`, `valor_produto` (soma portas), `valor_pintura`, `valor_instalacao`, `valor_frete`, `valor_total`, `status='pendente'`.
- `numero_orcamento`: próximo inteiro (`SELECT COALESCE(MAX(numero_orcamento),0)+1 FROM orcamentos`).
- Itens detalhados gravados em `campos_personalizados` (jsonb) como `{ portas:[...], itens:[...], frete:{...} }` — evita migration nova.

### Geração de PDF (`meuOrcamentoPDFGenerator.ts`, novo)
Replica o layout do `Elisa_Portas_-_0622.pdf` usando jsPDF + jspdf-autotable (já no projeto):
- **Página 1**: logo Elisa (esquerda) + bloco da empresa (direita, dados de `empresas_emissoras` da empresa default). Título "Proposta Nº XXXX". Quadro "Para [cliente]" e quadro lateral Número/Data. "Vendedor(a): [nome]". Tabela "Itens da proposta comercial" (Descrição | Código | Un | Qtd | Preço lista | Desc.% | Preço un. | Preço total). Tabela resumo (Nº itens, soma qtds, total outros itens, desconto, total itens, frete, total proposta). Bloco "Outros itens ou serviços" + formas de pagamento (entrada 70%+boleto 21d, valor à vista 3% desc., 10x cartão sem juros — copiando texto do PDF de referência).
- **Página 2**: texto fixo de "Condições comerciais", "Termo de Garantia", "Assistência Técnica", "Cancelamento", "Prazo de Entrega" (mesmo conteúdo do PDF de referência).
- Botão "Exportar PDF" na página de detalhe e ao concluir cadastro.

### Detalhe (`MeuOrcamentoDetalhe.tsx`)
- Carrega orçamento + `campos_personalizados`, mostra resumo idêntico ao do hub em modo leitura, botão **Exportar PDF**, botão **Editar** (reabre fluxo novo carregando o estado).

## Arquivos
- `src/pages/vendas/MeusOrcamentos.tsx` — atualizar links.
- `src/pages/vendas/MeuOrcamentoNovo.tsx` (novo)
- `src/pages/vendas/MeuOrcamentoDetalhe.tsx` (novo)
- `src/components/vendas/orcamento-novo/AdicionarPortaDialog.tsx` (novo)
- `src/components/vendas/orcamento-novo/AdicionarItemAvulsoDialog.tsx` (novo)
- `src/components/vendas/orcamento-novo/AdicionarFreteDialog.tsx` (novo)
- `src/components/vendas/orcamento-novo/CarrinhoOrcamento.tsx` (novo)
- `src/utils/meuOrcamentoPDFGenerator.ts` (novo)
- `src/App.tsx` — registrar as 2 novas rotas.

## Fora de escopo
- Não criar tabelas novas.
- Não alterar o fluxo legado em `/dashboard/orcamentos`.
- Análise/aprovação de orçamento (continua usando o status já existente).