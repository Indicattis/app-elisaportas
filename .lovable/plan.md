## Botão "Salvar" para valores do kit

Substituir o salvamento automático no `onBlur` dos campos de preço (porta, instalação, pintura) por um fluxo explícito com botão de salvar.

### Comportamento

- Os 3 inputs (`valor_porta`, `valor_instalacao`, `valor_pintura`) passam a usar estado local controlado.
- Adicionar um botão **"Salvar"** no rodapé do card "Preços do kit" (largura total, estilo azul `bg-blue-600 hover:bg-blue-700`).
- O botão fica **desabilitado** quando nenhum valor foi alterado em relação ao kit atual, e mostra "Salvando..." durante a mutation.
- Ao clicar, dispara `editarItem` apenas com os campos que mudaram e invalida `['tabela-precos-kit', kitId]`.
- Remover o `onBlur` automático atual.
- O bloco "Lucro adicional" continua usando os valores salvos do `kit` (atualizado após salvar).

### Detalhes técnicos

- Arquivo: `src/pages/direcao/estrategia/EstrategiaKitMontagem.tsx`.
- Estado local `precos` ressincronizado quando `kit` muda (via `useEffect` comparando os valores do kit).
- `isDirty` = qualquer um dos 3 valores difere do kit.
- `editarItem` (já existente, `mutateAsync`) recebe `Partial<ItemTabelaPrecoInput>` com apenas os campos alterados.
