## Mover "Setor de Produção" para Edição de Produto da Fábrica

Mover o campo **Setor de Produção** (perfiladeira / soldagem / separação / pintura) da tela administrativa de estoque para a tela de edição de produto da fábrica, mantendo consistência com a migração já feita anteriormente (pintura, cálculo automático, regras de etiqueta).

### Em `src/pages/direcao/estoque/ProdutosFabricaEdit.tsx` (destino)
- Adicionar `setor_responsavel_producao: string` ao `formData`.
- Hidratar no `useEffect` a partir do produto carregado.
- Persistir no `handleSave` (cast `'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null`).
- Renderizar um `Select` dentro do Card de **Produção** (junto com `requer_pintura`), com as 4 opções.

### Em `src/pages/administrativo/EstoqueEditMinimalista.tsx` (origem)
- Remover o campo do `formData`, da hidratação e do `handleSave`.
- Remover o bloco JSX do Select "Setor de Produção".
- Ajustar o grid para que "Nome do Produto" ocupe a linha inteira (ou manter grid 2 colunas conforme melhor visual).

Nenhuma mudança de schema/migração — a coluna já existe.