## Aplicar config de Instalações/Pinturas nas colunas do kit de portas

Hoje a tabela em `src/pages/TabelaPrecos.tsx` calcula as colunas "Lucro Instalação" / "% Lucro Inst." e "Lucro Pintura" / "% Lucro Pint." com percentuais fixos (80% e 30%). Vou trocar por percentuais lidos da configuração ativa (mesma fonte já usada pelo faturamento e pelo showcase).

### Fonte dos percentuais
- Instalação: `useConfigLucro('instalacao')` → `lucroPct = 100 − percentual_custo`.
- Pintura: `useConfigLucro('pintura_epoxi')`.
  - Modo `estatico`: `lucroPctKit = 100 − percentual_custo`, aplicado sobre `valor_pintura` de cada kit.
  - Modo `formula_dimensao`: `lucroKit$ = altura × largura × parametros.valor_m2`; daí `lucroPctKit = lucroKit$ / valor_pintura × 100` (cap em 0–100; se `valor_pintura = 0`, mostrar "—").

### Alterações em `TabelaPrecos.tsx`
1. Importar `useConfigLucro` no topo do componente.
2. Carregar `cfgInstal = useConfigLucro('instalacao')` e `cfgPintura = useConfigLucro('pintura_epoxi')`.
3. Computar uma vez:
   - `instalLucroPct = 100 − (cfgInstal.data?.percentual_custo ?? 20)` (fallback no padrão histórico para não regredir enquanto carrega).
   - Função `getPinturaLucro(item)` que retorna `{ valor, pct }` com base no modo.
4. Substituir nas linhas 399–407 (instalação) por `item.valor_instalacao × instalLucroPct/100` e `instalLucroPct` formatado.
5. Substituir nas linhas 414–422 (pintura) pelos valores retornados por `getPinturaLucro(item)`.
6. Reaproveitar `text-emerald-400`/`text-orange-400` e o formato em pt-BR; manter "—" quando a config ainda não carregou ou o cálculo for indefinido.

### Showcase
Sem mudanças necessárias — o `KitsShowcaseCard` já lê a mesma `config_lucro`, então qualquer alteração feita nas abas Instalações/Pinturas reflete automaticamente no showcase e agora também nas colunas do kit de portas.

### Fora do escopo
- Sem migrations: nenhum campo novo nas tabelas; a tabela continua usando os valores de `valor_instalacao` e `valor_pintura` por kit.
- Sem alteração na lógica de faturamento (já consome `config_lucro`).
- Sem mudança no header/abas/largura.