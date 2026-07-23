## Objetivo
Adicionar uma terceira opção de frete — **Frete por Porta (por região)** — no cadastro da venda (`/vendas/minhas-vendas/nova`), disponível apenas quando o **Tipo de Entrega = Entrega** (sem instalação). O valor é calculado por `valor da região × quantidade de portas`, usando a tabela do documento anexado.

## Tabela de valores (fixos no código)
| Região | Estados | R$/porta |
|---|---|---|
| Sul | RS, SC, PR | 750,00 |
| Centro-oeste | GO, MT, MS, DF | 950,00 |
| Sudeste | SP, RJ, MG, ES | 1.200,00 |
| Nordeste | BA, PE, CE, MA, PI, RN, PB, AL, SE | 1.500,00 |
| Norte | AM, PA, RO, AC, RR, AP, TO | 1.800,00 |

Reaproveita o mapeamento UF→Região já existente em `src/utils/regioesBrasil.ts`.

## Mudanças

1. **Novo utilitário** `src/utils/fretePorPorta.ts`
   - Constante `FRETE_POR_PORTA_REGIAO: Record<RegiaoBrasil, number>` com os valores acima.
   - Função `calcularFretePorPorta(uf, qtdPortas)` → retorna `{ valorUnitario, total, regiao }` ou `null` se UF inválida.

2. **`VendaNovaMinimalista.tsx`** (e espelhar em `VendaEditarMinimalista.tsx` para edição)
   - Ampliar `tipo_frete` para `'interno' | 'transportadora' | 'por_porta'`.
   - Adicionar terceira opção no `RadioGroup` "Tipo de Frete", com ícone e rótulo "Frete por Porta (região)".
   - **Só renderizar** a opção quando `formData.tipo_entrega === 'entrega'`. Se o usuário voltar para `instalacao`/`manutencao` com `por_porta` selecionado, resetar para `'interno'` e recalcular valor.
   - Contagem de portas: `portas.filter(p => p.tipo_produto === 'porta').reduce((s,p) => s + (p.quantidade||1), 0)`.
   - Ao selecionar `por_porta`: calcular `valor_frete = valorRegiao × qtdPortas` a partir de `formData.estado` e travar o campo "Valor do Frete" (readOnly, com badge "🔒 Região {X} · {qtd} porta(s) × R$ {valor}").
   - Recalcular automaticamente quando `estado`, `qtdPortas` ou `tipo_frete` mudarem (via `useEffect`, mesmo padrão do `freteSugerido`).
   - Mensagem de fallback se UF sem região mapeada ("Estado sem tabela de frete por porta — selecione outro tipo").

3. **Persistência**
   - Nenhuma migração de banco. O campo `vendas.tipo_frete` já é texto livre; passa a aceitar `'por_porta'`.
   - `useVendas.ts`: propagar o novo valor no insert/update (já usa `formData.tipo_frete` como string, apenas atualizar o tipo TS onde restrito).

4. **Exibição em views existentes** (leitura)
   - Em `VendaResumo.tsx`, `VendaDetalhesMinimalista.tsx`, `RascunhoView.tsx` e `VendaDetailsModal.tsx`: exibir rótulo "Frete por Porta" quando `tipo_frete === 'por_porta'` (label map). Sem outra alteração de lógica.

## Fora do escopo
- Tela de configuração dos valores (usuário escolheu fixo no código por enquanto).
- Alterações em PDF/contrato, DRE, faturamento ou lógica de correções — o valor final do frete continua no campo `valor_frete` da venda, então esses fluxos seguem funcionando sem mudança.
