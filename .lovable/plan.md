## Atualizar rota e breadcrumb de Regras de Vendas

Como o botão "Regras de Vendas" agora vive no header de `/direcao/estrategia/precos`, a rota e o breadcrumb da página devem refletir essa nova posição (sob Estratégia → Tabela de Preços), em vez de Vendas.

### Mudanças

**1. `src/App.tsx`** — mover o path da rota:
- De: `/direcao/vendas/regras-vendas`
- Para: `/direcao/estrategia/precos/regras-vendas`

**2. `src/pages/direcao/RegrasVendasDirecao.tsx`** — atualizar layout:
- `backPath`: `/direcao/estrategia/precos`
- `breadcrumbItems`:
  ```
  Home → Direção → Estratégia → Tabela de Preços → Regras de Vendas
  ```

**3. `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`** — atualizar o `navigate()` do botão "Regras de Vendas" para a nova URL.

**4. Comentários em `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`** (linhas 120 e 1316) — atualizar referências do path antigo para o novo (apenas comentários).

### Não incluído
- A chave de permissão `direcao_regras_vendas` permanece a mesma (não há motivo para renomear; quebraria configurações já salvas).
- Sem redirect da URL antiga, pois a rota nova substitui a antiga diretamente.