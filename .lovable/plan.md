# Controle de Fornadas

## 1. Novo botão no Hub da Fábrica
Em `src/pages/fabrica/FabricaHub.tsx`:
- Adicionar item "Controle de Fornadas" ao `menuItems` (ícone `Flame` do lucide-react), path `/fabrica/controle-fornadas`.
- Adicionar entrada correspondente em `routeKeyMap` com a chave `fabrica_controle_fornadas`.

## 2. Nova página `/fabrica/controle-fornadas`
Criar `src/pages/fabrica/ControleFornadas.tsx` com layout consistente com o resto da fábrica (ProducaoLayout ou layout próprio do hub — seguirei o padrão visual da fábrica com tabs). A página terá duas seções (em abas):

- **Fornadas** — reutiliza `PinturaIniciosList` alimentado por `usePinturaInicios()` (já existente em `src/hooks/usePinturaInicios.ts` e componente em `src/components/production/PinturaIniciosList.tsx`).
- **Trocas de Gás** — reutiliza `TrocasGasList` alimentado por `usePinturaTrocasGas()`.

Cabeçalho com título "Controle de Fornadas", botão Atualizar (invalida as duas queries) e botão Voltar para `/fabrica`.

Apenas visualização — sem ações de criação (registro continua na tela de Pintura).

## 3. Registrar rota
Em `src/App.tsx` (ou onde estão as rotas de `/fabrica/*`), adicionar `<Route path="/fabrica/controle-fornadas" element={<ControleFornadas />} />` com o mesmo wrapper de proteção usado pelas outras rotas da fábrica.

## 4. Permissões
Criar migration que insere a rota `fabrica_controle_fornadas` em `app_routes` (interface `fabrica`/equivalente) para aparecer no controle de acessos. Sem RLS nova — as queries já usam tabelas existentes.

## Detalhes técnicos
- Hooks reutilizados: `usePinturaInicios`, `usePinturaTrocasGas`.
- Componentes reutilizados: `PinturaIniciosList`, `TrocasGasList`.
- Aba inicial: Fornadas.
