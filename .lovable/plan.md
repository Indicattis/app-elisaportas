## Edição de preços e lucro adicional na Montagem do Kit

Tornar editáveis os três valores do card "Preços do kit" no painel lateral da página de montagem, mostrando em tempo real o lucro adicional gerado em relação ao custo total da montagem.

### Comportamento

No card lateral "Preços do kit":

- **Valor porta**, **Valor instalação** e **Valor pintura** passam a ser `Input` numéricos (R$), editáveis inline.
- Ao sair do campo (`onBlur`), salva via mutation `editarItem` do hook `useTabelaPrecos` apenas se o valor mudou.
- O campo "Lucro manual" permanece como leitura (já existe no kit, não faz parte deste pedido).

Abaixo dos três campos, novo bloco **"Lucro adicional"** com:

- **Custo total da montagem** — soma dos custos dos itens (já calculado em `totais.custo`).
- **Receita total** — `valor_porta + valor_instalacao + valor_pintura` (valores atuais do kit, atualizados após cada edição).
- **Lucro adicional (R$)** — `receita_total − custo_total_montagem`. Verde se ≥ 0, vermelho se negativo.
- **Margem (%)** — `lucro_adicional / receita_total × 100`.

Cada linha de preço editável mostra à direita, em texto pequeno, o lucro individual = `valor − parcela_de_custo`, onde a parcela é o custo total rateado pelas três receitas (proporcional). Apenas indicativo visual; o cálculo principal é o agregado.

### Detalhes técnicos

- Arquivo: `src/pages/direcao/estrategia/EstrategiaKitMontagem.tsx`.
- Reutilizar `useTabelaPrecos().editarItem` (já existente, aceita `Partial<ItemTabelaPrecoInput>` incluindo `valor_porta`, `valor_instalacao`, `valor_pintura`).
- Após sucesso, invalidar `['tabela-precos']` (já feito pelo hook) e também `['tabela-precos-kit', kitId]` para refletir no card.
- Inputs no padrão glassmorphism escuro atual: `bg-white/5 border-white/10 text-white text-right h-8`.
- Formatador `fmt` existente para exibição.
- Estado local opcional para evitar flicker entre `onBlur` e refetch.

### Fora de escopo

- Não altera a tabela principal de itens (apenas o card lateral).
- Não altera `valor_porta` etc. em outras telas.
- Não mexe no campo "Lucro manual" do kit.
