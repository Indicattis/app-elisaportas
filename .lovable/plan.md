## Renomear "Caixa Roboost" → "Caixa Elisa"

### Alterações de rota e label (frontend)
- `src/App.tsx`: alterar path `/direcao/caixa-roboost` → `/direcao/caixa-elisa` e routeKey `direcao_caixa_roboost` → `direcao_caixa_elisa`. Renomear import/arquivo para `CaixaElisaDirecao`.
- `src/pages/direcao/DirecaoHub.tsx`: label `Caixa Roboost` → `Caixa Elisa`, path e routePrefix idem.
- Renomear arquivo `src/pages/direcao/CaixaRoboostDirecao.tsx` → `CaixaElisaDirecao.tsx`. Atualizar nome do componente e breadcrumb interno ("Caixa Roboost" → "Caixa Elisa") e textos da UI (título, subtítulo).

### Banco
- Atualizar `app_routes`: linha existente `direcao_caixa_roboost` será trocada por `direcao_caixa_elisa` (UPDATE de key/path/label). Mantém eventuais permissões já concedidas migrando referências em `user_route_access` (UPDATE route_key).
- **Tabelas de dados** `caixa_roboost_etiquetas` e `caixa_roboost_entradas`: manter os nomes para evitar risco em migrações de dados, OU renomear para `caixa_elisa_*`. 

### Pergunta
Renomeio também as **tabelas do banco** (`caixa_roboost_entradas` / `caixa_roboost_etiquetas`) para `caixa_elisa_*`, ou deixo os nomes internos do DB como estão (só muda label/rota/UI)? Se não responder, mantenho os nomes das tabelas no DB e mudo apenas rota, label e UI — é o caminho mais seguro.
