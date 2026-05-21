# Custo em Folha — novos campos por colaborador

Atualmente cada linha em `custos_folha_mensais` tem apenas um campo `valor` (total). Vou desmembrar isso em parcelas e adicionar a chave PIX como observação.

## Banco de dados

Migração em `custos_folha_mensais` adicionando colunas:

- `salario_base` numeric NOT NULL default 0
- `ajuda_custo` numeric NOT NULL default 0
- `horas_extras` numeric NOT NULL default 0
- `chave_pix` text NULL

O campo `valor` continua existindo e passa a representar o **total** (= salario_base + ajuda_custo + horas_extras), preenchido pelo frontend no upsert para manter compatibilidade com qualquer leitura existente (ex.: DRE/relatórios que já usam `valor`).

Backfill: para registros existentes, `salario_base = valor` (assume que o lançamento atual representa o salário). Os demais ficam em 0 e `chave_pix` em NULL.

## UI — `src/pages/administrativo/CustoFolhaMensal.tsx`

Substituir a tabela atual (1 input por colaborador) por uma grid com 5 colunas por linha:

```text
Colaborador | Salário Base | Ajuda de Custo | Horas Extras | Total | Chave PIX
```

- Cada um dos 3 valores em input numérico (R$).
- **Total** calculado em tempo real (somente leitura, formatado em BRL).
- **Chave PIX**: input de texto livre (placeholder "CPF, e-mail, telefone ou aleatória"). Persistido por colaborador/mês junto com os valores.
- Rodapé com totais agregados de Salário Base, Ajuda de Custo, Horas Extras e Total geral do mês.

Estado local muda de `Record<string, string>` para:
```ts
Record<colaboradorId, { salarioBase: string; ajudaCusto: string; horasExtras: string; chavePix: string }>
```

`handleSave` faz upsert com os 4 campos + `valor` (= soma das 3 parcelas). Linha é deletada apenas quando todas as 3 parcelas são 0 **e** chave PIX vazia.

## Fora de escopo

- Nenhuma alteração em DRE, relatórios ou outras telas que consomem `custos_folha_mensais.valor` (mantemos o `valor` como total para não quebrar nada).
- Hooks/lógica fora desta página não mudam.
