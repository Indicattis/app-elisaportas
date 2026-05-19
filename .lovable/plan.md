## Modal de "Portas" no cabeçalho da primeira tabela do DRE

Ao clicar no cabeçalho **Portas** da primeira tabela em `/direcao/dre/:mes`, abrir um modal listando todas as vendas do mês que contenham `tipo_produto = 'porta_enrolar'` em seus itens, com demonstrativo dos produtos relacionados.

### Comportamento

- Cabeçalho **Portas** ganha cursor pointer + underline sutil ao hover (igual ao padrão dos tooltips existentes).
- Clique abre um `Dialog` (shadcn) com título "Vendas com Portas de Enrolar — {mesNome}".
- Demais cabeçalhos permanecem como estão.

### Conteúdo do modal

Listagem agrupada por venda, ordenada por `data_venda` crescente. Cada venda exibe:

- **Cabeçalho da venda**: data (dd/MM), cliente, nº da venda (se houver), valor total líquido da venda.
- **Tabela de itens "porta_enrolar"** da venda, colunas:
  - Descrição
  - Qtd
  - Valor Porta (bruto unit × qtd)
  - Valor Pintura
  - Valor Instalação
  - Desconto aplicado (proporcional à linha)
  - Valor Líquido da linha
  - Lucro da linha (`lucro_item`)

Rodapé do modal com totais consolidados: total Porta, total Pintura, total Instalação, total Líquido, total Lucro — somando apenas as linhas de `porta_enrolar` exibidas (deve bater com `fat.portas` quando isolado do `porta_social`).

### Implementação técnica

1. **Novo state** em `DREMesDirecao`:
   ```ts
   const [portasModalOpen, setPortasModalOpen] = useState(false);
   const [portasDetalhe, setPortasDetalhe] = useState<VendaComPortasRow[]>([]);
   ```

2. **Nova consulta** em `useEffect` (junto às outras), após a já existente em `produtos_vendas`:
   ```ts
   supabase.from('produtos_vendas')
     .select(`
       id, descricao, quantidade,
       valor_produto, valor_pintura, valor_instalacao,
       tipo_desconto, desconto_percentual, desconto_valor,
       lucro_item, valor_total_sem_frete,
       vendas!inner(id, data_venda, cliente_nome, valor_venda, valor_frete)
     `)
     .eq('tipo_produto', 'porta_enrolar')
     .gte('vendas.data_venda', start + ' 00:00:00')
     .lte('vendas.data_venda', end + ' 23:59:59')
     .order('vendas(data_venda)', { ascending: true });
   ```
   Agrupar em memória por `vendas.id`, calcular desconto proporcional por linha exatamente como o cálculo já existente em `fat.portas` (linhas 956-976), e armazenar em `portasDetalhe`.

3. **Tornar o `<th>` "Portas" clicável** no JSX da primeira tabela (linha ~1237). Adicionar `onClick={() => setPortasModalOpen(true)}` quando `col.key === 'portas'`, com `cursor-pointer hover:text-white underline decoration-dotted underline-offset-4`. Manter os outros cabeçalhos inalterados (incluindo o tooltip de Acessórios/Adicionais).

4. **Novo componente local `PortasDetalheDialog`** no mesmo arquivo, recebendo `open`, `onOpenChange`, `mesNome`, `vendas: VendaComPortasRow[]`, `formatCurrency`. Usa `Dialog` shadcn já importado. Layout: cards por venda + tabela interna por venda + rodapé com totais. Estilo glassmorphism alinhado ao restante (bg-white/5, border-white/10).

5. **Escopo**: apenas a tela (não afeta o PDF). Comportamento read-only.

### Tipos

```ts
interface VendaComPortasRow {
  vendaId: string;
  dataVenda: string;
  clienteNome: string;
  valorVenda: number;
  itens: {
    id: string;
    descricao: string;
    quantidade: number;
    valorPortaBruto: number;
    valorPinturaBruto: number;
    valorInstalacaoBruto: number;
    descontoLinha: number;
    valorLiquido: number;
    lucro: number;
  }[];
}
```
