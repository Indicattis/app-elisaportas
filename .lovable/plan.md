## Problema encontrado

Na primeira seção do DRE de `/direcao/estrategia/dre/2026-06`, a separação entre **Acessórios** e **Itens Avulsos** está incorreta porque a maioria dos produtos vendidos não tem `custos_itens_id` preenchido (dados legados). Quando isso ocorre, o classificador usa o fallback:

```ts
return p.tipo_produto === 'acessorio' ? 'acessorios' : 'avulsos';
```

Como praticamente todos os itens vendidos são cadastrados como `tipo_produto = 'acessorio'`, eles caem sempre em **Acessórios**, mesmo que no catálogo (`custos_itens.tipo_item`) estejam marcados como `avulso`.

Diagnóstico em junho/2026:
- 49 produtos com `tipo_produto = 'acessorio'`
- Apenas 4 têm `custos_itens_id` vinculado
- Ex.: "Meia cana lisa - 0,70mm" (8 vendas) está como `avulso` no catálogo, mas o DRE conta como acessório
- "Controle Avulso", "Nobreak", "Central WI-FI", "Meia cana", etc. seriam avulsos por catálogo, mas hoje entram em acessórios

Ou seja: a coluna Acessórios está inflada e a coluna Itens Avulsos está subestimada.

## Correção proposta

1. **Fallback por descrição** em `src/pages/direcao/DREMesDirecao.tsx`
   - Carregar do catálogo `custos_itens` também o campo `descricao` (além de `id, tipo_item`).
   - Montar um segundo Map `Map<descricaoNormalizada, 'avulso' | 'acessorio'>`.
   - Em `classificarAvulso(p)`:
     1. Se `custos_itens_id` presente e mapeado → usar tipo do catálogo.
     2. Senão, normalizar `p.descricao` (trim + lowercase) e buscar no map por descrição.
     3. Só se ambos falharem, cair no fallback atual por `tipo_produto`.
   - Aplicar a mesma classificação também no bloco do Top 5 (linhas ~1501-1519) e no `detalheAvulsoBuilder` (linhas ~1890-1905), que hoje usam apenas `tipo_produto`.

2. **Sem alterações de schema nem migrações** — apenas ajuste de classificação em tela e nos modais/PDF, que já derivam da mesma lógica.

### Detalhes técnicos

- Normalização simples: `(s || '').trim().toLowerCase()`.
- Se duas entradas do catálogo tiverem a mesma descrição com tipos diferentes, a última prevalece (aceitável; catálogo é pequeno).
- Nada muda para vendas novas: quem tiver `custos_itens_id` continua sendo classificado pelo vínculo direto (mais confiável).

### Resultado esperado

Após o fix, itens vendidos como "Meia cana lisa", "Controle Avulso", "Nobreak", etc. passarão a aparecer em **Itens Avulsos**, e apenas os itens marcados como `acessorio` no catálogo (ex.: "Antiesmagamento de 4 metros") permanecerão em **Acessórios**. Os modais de detalhe, o Top 5 e o PDF refletirão a mesma separação automaticamente.