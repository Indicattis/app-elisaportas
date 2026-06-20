## Objetivo

Em **Logística → Frete → Valores Transportadoras**, trocar o cadastro atual (valor por estado x P/G/GG) por:

1. **Regiões** desenhadas em um mapa do Brasil (grupo de estados + nome).
2. **Preços por largura** (larguras distintas da Tabela de Kits) para cada região.

## Fluxo de uso

1. Usuário escolhe a transportadora no header (igual hoje).
2. Aparece uma lista das **regiões** já cadastradas dessa transportadora, com botão **"Nova região"**.
3. Ao clicar **Nova região** abre um modal com:
   - Campo **Nome da região** (ex.: "Sul", "Sudeste expandido").
   - **Mapa do Brasil** (SVG clicável) onde o usuário clica/desmarca estados. Estados já usados por outra região da mesma transportadora ficam **desabilitados** (cinza, com tooltip mostrando o nome da região dona).
   - Botão Salvar.
4. Cada região aparece como um card expansível mostrando:
   - Mini-mapa com os estados pintados + chips dos estados.
   - Tabela de larguras: uma linha por largura distinta ativa em `tabela_precos_portas`, com input **R$**.
   - Botões: editar região (nome/estados), excluir.
5. Salvar preço chama upsert por (região, largura).

## Modelo de dados

Duas novas tabelas; a antiga `frete_transportadoras` é descartada.

```text
frete_regioes
  id, transportadora_id (FK), nome, created_at, updated_at
  UNIQUE (transportadora_id, nome)

frete_regiao_estados
  id, regiao_id (FK cascade), estado (text, 2 letras)
  UNIQUE (regiao_id, estado)
  + índice/constraint garantindo unicidade do estado por transportadora
   (via trigger: estado não pode existir em outra região da mesma transportadora)

frete_regiao_larguras
  id, regiao_id (FK cascade), largura (numeric), valor (numeric)
  UNIQUE (regiao_id, largura)
```

GRANTs padrão (`authenticated`, `service_role`), RLS aberta para `authenticated` (mesmo padrão das tabelas atuais de frete).

## Frontend

Arquivos novos:
- `src/components/logistica/MapaEstadosBrasil.tsx` — SVG do Brasil com estados clicáveis; props `value: string[]`, `onChange`, `disabledStates: Record<string, string>` (estado → nome da região dona, para tooltip).
- `src/components/logistica/RegiaoFormDialog.tsx` — modal Nova/Editar região (nome + mapa).
- `src/components/logistica/RegiaoCard.tsx` — card expansível com mini-mapa, chips de estados, tabela de larguras com inputs e save por linha (debounce/blur).
- `src/hooks/useFreteRegioes.ts` — lista/CRUD de regiões + estados.
- `src/hooks/useFreteRegiaoLarguras.ts` — lista/upsert de preços por largura.
- `src/hooks/useLargurasKits.ts` — `SELECT DISTINCT largura FROM tabela_precos_portas WHERE ativo ORDER BY largura`.

Arquivos editados:
- `src/pages/logistica/FreteValoresTransportadoras.tsx` — reescrito para nova UX (lista de regiões + botão Nova região). Mantém header com seletor de transportadora.
- `src/hooks/useFreteTransportadoras.ts` — removido (sem outros consumidores).

Visual: mesmo padrão glassmorphism (`bg-white/5`, `backdrop-blur-xl`, `border-white/10`, accent azul).

## SVG do mapa

Usar um SVG estático do Brasil com `<path id="SP">…</path>` por UF (27 paths). Estados:
- Não selecionado: `fill-white/5 stroke-white/20`.
- Selecionado: `fill-blue-500/40 stroke-blue-400`.
- Desabilitado (em outra região): `fill-white/[0.03] stroke-white/10 cursor-not-allowed`.
Hover mostra sigla + nome via tooltip simples.

## Migração de dados antigos

Migration faz `DROP TABLE IF EXISTS public.frete_transportadoras CASCADE` antes de criar as novas tabelas. Nenhum dado preservado (escolha do usuário).

## Fora de escopo

- Consumo do novo frete em orçamentos/vendas (somente cadastro nesta etapa).
- Edição/uso da tabela antiga em qualquer outro lugar (não há consumidores).
