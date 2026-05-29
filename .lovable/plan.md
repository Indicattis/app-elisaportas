## Mudanças

### 1. `src/pages/administrativo/AdministrativoHub.tsx`
- Remover o item `{ label: "Documentos", ... }` do array `menuItems` (some das versões mobile e desktop, que já compartilham o mesmo array).
- Remover o import não usado `FolderOpen`.

### 2. `src/components/marketing/DocumentosPanel.tsx` (novo)
- Extrair o miolo do `DocumentosMinimalista` (filtros + estados de loading/empty + grid de documentos) em um componente sem `MinimalistLayout`, recebendo nada como prop.
- Mantém os links de "Novo" / "Adicionar Documento" apontando para `/administrativo/documentos/novo` (rota standalone permanece funcional).
- Exporta também o `headerActions` (refresh + botão Novo) para ser reutilizado pelo Mídias quando a aba ativa for "Documentos".

### 3. `src/pages/marketing/MidiasMinimalista.tsx`
- Adicionar sistema de abas copiado de `src/pages/direcao/estrategia/EstrategiaKits.tsx`:
  - Componente local `TabsBar` idêntico (grid arredondado glassy com indicador azul deslizante e `lastDisplayedIndex` persistido fora do componente).
  - Abas: `{ key: 'midias', label: 'Mídias', icon: ImageIcon }` e `{ key: 'documentos', label: 'Documentos', icon: FileText }`.
  - Estado da aba via `useSearchParams` (`?tab=documentos`; sem param = mídias), seguindo o mesmo padrão do Kits.
- `headerActions` do `MinimalistLayout` muda conforme a aba: na aba Mídias mostra Select de bucket + botão Upload; na aba Documentos mostra os actions vindos do `DocumentosPanel` (refresh + Novo).
- Renderizar `<TabsBar />` no topo do conteúdo, dentro do `MinimalistLayout`.
- Quando `tab === 'midias'`: mostrar o conteúdo atual (modais + grid de arquivos). Quando `tab === 'documentos'`: mostrar `<DocumentosPanel />`.
- Manter `backPath="/marketing"` e o breadcrumb atual.

### 4. `src/pages/administrativo/DocumentosMinimalista.tsx`
- Refatorar para apenas envelopar o novo `DocumentosPanel` dentro do `MinimalistLayout` existente, preservando título, breadcrumb e `headerActions`. Sem mudança visual da página standalone.

### Fora do escopo
- Rotas em `App.tsx` (mantém `/administrativo/documentos` e `/administrativo/documentos/novo` ativas).
- Hooks (`useDocumentos`), banco de dados, permissões/`routeKey`.
- Estilo/UX do conteúdo interno das duas seções.
