Ajustar o PDF de Lista de Compras gerado em `/direcao/gestao-fabrica` para reduzir de 6 colunas para 4 colunas.

Atualmente o PDF exibe:
- # | MATERIAL | NECESSÁRIO | COMPRAR (MATERIAL) | MATÉRIA-PRIMA | COMPRAR (MATÉRIA-PRIMA)

O usuário quer simplificar para:
- # | MATERIAL | NECESSÁRIO | MATÉRIA-PRIMA

Onde:
- **NECESSÁRIO**: quantidade do material em sua unidade de medida (metragem/qtd total necessária)
- **MATÉRIA-PRIMA**: quantidade da matéria-prima vinculada necessária para suprir a demanda. Se o item não tiver matéria-prima vinculada, exibe o mesmo valor da coluna NECESSÁRIO.

### Arquivos
- `src/utils/listaComprasPDF.ts` — Reformular `head`, `rows`, e `columnStyles` do autoTable
- `src/pages/direcao/GestaoFabricaDirecao.tsx` — Ajustar a montagem dos objetos `ItemListaCompras` para garantir que `materia_prima_id`, `materia_prima_conversao` e unidade da MP estejam sempre populados quando aplicável