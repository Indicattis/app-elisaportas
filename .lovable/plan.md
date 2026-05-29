## Objetivo

Adicionar dois novos botões no header da página `/direcao/estrategia/kits`, ao lado do botão "Template padrão", levando a duas novas páginas de configuração do cálculo de lucro:

- **Lucro de Instalações** → `/direcao/estrategia/kits/lucro-instalacoes`
- **Lucro de Pinturas** → `/direcao/estrategia/kits/lucro-pinturas`

O cálculo atual permanece inalterado nesta etapa — as páginas apenas exibirão, de forma somente-leitura, como o lucro é apurado hoje, deixando o terreno pronto para uma futura edição configurável.

## Mudanças

### 1. `src/pages/direcao/estrategia/EstrategiaKits.tsx`
Trocar o único `Link` "Template padrão" por um grupo com 3 botões (mesmo estilo glassmorphism atual):

- `Template padrão` → `/direcao/estrategia/kits/template` (ícone `LayoutTemplate`)
- `Lucro de Instalações` → `/direcao/estrategia/kits/lucro-instalacoes` (ícone `Wrench`)
- `Lucro de Pinturas` → `/direcao/estrategia/kits/lucro-pinturas` (ícone `Paintbrush`)

Container: `fixed top-20 right-6 z-40 flex items-center gap-2`.

### 2. Nova página `src/pages/direcao/estrategia/EstrategiaLucroInstalacoes.tsx`
Usa `MinimalistLayout` (mesmo padrão de `EstrategiaKitsTemplate`):
- Título: "Cálculo do lucro de instalações"
- backPath: `/direcao/estrategia/kits`
- Conteúdo: card explicando a regra atual em vigor — lucro = 40% do valor total da instalação, custo = 60% do valor total (auto-faturado em `FaturamentoVendaMinimalista.tsx`, linhas 648–673).
- Sem inputs editáveis nesta etapa; aviso de "Configuração editável em breve".

### 3. Nova página `src/pages/direcao/estrategia/EstrategiaLucroPinturas.tsx`
Mesmo padrão:
- Título: "Cálculo do lucro de pinturas"
- backPath: `/direcao/estrategia/kits`
- Conteúdo: card descrevendo a regra atual da pintura (lucro fixo conforme já calculado hoje em vendas/faturamento — sem alterar a lógica).
- Sem inputs editáveis.

### 4. `src/App.tsx`
Registrar as duas novas rotas logo após a rota `/kits/template`, ambas protegidas com `routeKey="direcao_estrategia"`:

```tsx
<Route path="/direcao/estrategia/kits/lucro-instalacoes" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaLucroInstalacoes /></ProtectedRoute>} />
<Route path="/direcao/estrategia/kits/lucro-pinturas" element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaLucroPinturas /></ProtectedRoute>} />
```

## Fora do escopo

- Alterar a fórmula atual de cálculo de lucro de instalações ou pinturas.
- Persistência de configurações editáveis (será feito numa próxima iteração).
