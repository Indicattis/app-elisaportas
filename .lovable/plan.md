# Detalhar itens do kit no orçamento

## O que muda para o vendedor
- Em "Novo Orçamento" (e na edição), aparece a opção **"Detalhar itens"** (liga/desliga).
- Quando ligada, cada porta que bateu com um kit da tabela de preços mostra, no lugar de "Porta de Enrolar L x A", a lista de itens do kit (ex.: lâminas, guias, eixo, motor, soleira...) com quantidade e unidade.
- Os valores continuam os mesmos: o preço fica no total da porta (os kits não têm preço por item), então o total do orçamento não muda.
- O PDF (pré-visualização e download) segue a mesma escolha: com a opção ligada, a tabela de itens mostra o detalhamento do kit agrupado sob cada porta; desligada, fica como hoje.
- Portas sem kit correspondente continuam aparecendo como produto único.

## Detalhes técnicos
- `AdicionarPortaDialog`: ao adicionar, guardar o `id` do kit encontrado (`kit_id`) no `CartPorta`.
- `CartPorta` ganha `kit_id?: string` e `kit_itens?: {descricao, quantidade, unidade, categoria}[]`.
- Ao ligar "Detalhar itens", buscar os itens via RPC `get_kit_itens(p_kit_id)` (cache por kit com react-query) e multiplicar pela quantidade de portas.
- Salvar a preferência `detalhar_itens` junto ao orçamento (coluna boolean, padrão false, em `orcamentos`) e os `kit_id` dentro dos dados da porta já salvos, para que o detalhe/edição/PDF refaçam o mesmo resultado.
- `meuOrcamentoPDFGenerator`: quando `detalharItens` for verdadeiro, gerar uma linha de cabeçalho por porta (com valor) seguida de sublinhas com os itens (sem valor).
- Orçamentos antigos sem `kit_id`: tentar reencontrar o kit pelas medidas (mesma regra de 15 cm de tolerância do diálogo).
