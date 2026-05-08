## O que fazer

Adicionar um botão **"Gerar lista de material"** dentro de cada aba de etapa em `/direcao/gestao-fabrica`. Ao clicar, gera um PDF idêntico ao anexo: lista todos os materiais necessários para os pedidos da etapa atual, agrupados por categoria, mostrando:

- **Necessário**: soma da metragem/quantidade total exigida pelos pedidos da etapa
- **Comprar**: arredondamento para cima de `necessário ÷ quantidade_padrao` (ex: 11996 m ÷ 300 m por bobina = 40 bobinas)

## Layout do PDF (igual ao anexo)

```text
                    Lista de Compras
              Cálculo de Materiais por Categoria
   Gerado em: dd/mm/aa HH:MM   |   Categorias: N   |   Materiais: N
   Etapa: <nome da etapa>

   ── Bobina ── (3 itens)
   #  MATERIAL                          NECESSÁRIO    COMPRAR
   1  Meia Cana Lisa 0,70               11996.16 m    40 metragens
      Padrão: 300.00 m por Metragem
   ...

   ── Caixa ── (2 itens)
   ...
```

Rodapé: "Sistema Azul • Compras • Cálculo de Materiais"

## Detalhes técnicos

**Arquivos novos:**
- `src/utils/listaComprasPDF.ts` — gera o PDF usando `jsPDF` + `jspdf-autotable` (já usados no projeto). Recebe `{ etapaLabel, materiais: MaterialAgrupado[] }` e dispara o download.
- `src/hooks/useMateriaisPorEtapa.ts` (helper) — consulta única que, dada uma etapa, faz:
  1. `pedidos_producao` com `etapa_atual = etapa`
  2. `pedido_linhas` desses pedidos com `estoque_id` preenchido, JOIN em `estoque(id, nome_produto, categoria, unidade, quantidade_padrao)`
  3. Agrega por `estoque_id` somando `quantidade_necessaria` (igual à lógica já existente em `useMateriaisPendentesPorEtapa.ts` — quantidade × largura × altura ou × tamanho)
  4. Agrupa por `categoria` e calcula `comprar = Math.ceil(necessario / quantidade_padrao)`

**Arquivo editado:**
- `src/pages/direcao/GestaoFabricaDirecao.tsx` — adicionar botão `<Button variant="ghost">` com ícone `ShoppingCart` no header de cada `TabsContent` de etapa (ao lado do bloco "Responsável da Etapa", linha ~973). `onClick` chama o hook + gera PDF. Loading state durante a busca.

**Etapas cobertas:** todas em `ORDEM_ETAPAS` (aberto, aprovação CEO, em produção, etc.). Pulamos `pendente_pedido`, `aguardando_cliente`, `arquivo_morto` (não fazem sentido para lista de compras).

**Sem mudanças de DB.** Usa colunas que já existem (`estoque.categoria`, `estoque.unidade`, `estoque.quantidade_padrao`).

## Observações
- Itens sem `categoria` definida vão para um grupo "Sem categoria".
- Itens com `quantidade_padrao = 0/null` exibem "—" na coluna "Comprar".
- O termo "metragem"/"unidade" no texto "Comprar" segue a `unidade` do produto.