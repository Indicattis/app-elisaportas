## Objetivo

Adicionar uma nova etapa **"Assinatura Contrato"** no início do fluxo de vendas, antes de "Pend. Faturamento". Toda venda recém-criada cai nessa etapa e só avança para "Pend. Faturamento" quando o responsável anexa o contrato de venda assinado.

## Fluxo novo

```text
Criação da Venda
       │
       ▼
[ Assinatura Contrato ]  ← responsável anexa PDF/imagem do contrato
       │  (contrato anexado)
       ▼
[ Pend. Faturamento ]
       │
       ▼
[ Aprovação Diretor ] → ... fluxo atual
```

## Mudanças no banco

1. **Tabela `vendas`** — adicionar colunas:
   - `contrato_url` (texto, nullable) — caminho do arquivo no storage
   - `contrato_assinado_em` (timestamp, nullable) — quando foi anexado
   - `contrato_anexado_por` (uuid, nullable) — quem anexou
2. **Bucket de storage privado** `contratos-vendas` com policies:
   - Leitura: usuários autenticados (admin/diretor/responsável da etapa)
   - Upload/Update/Delete: usuários autenticados
3. **Sem alterar enum `EtapaPedido`** — a etapa "assinatura_contrato" é virtual no front (igual ao tratamento atual de `pendente_pedido`/`pendente_faturamento`), pois a coluna `etapa` em `etapa_responsaveis` é TEXT e aceita qualquer valor.

## Mudanças no front

### Hook novo `useVendasAssinaturaContrato`
- Mesma query base de `useVendasPendenteFaturamento`, mas filtra `contrato_url IS NULL`.

### Hook ajustado `useVendasPendenteFaturamento`
- Adicionar `contrato_url IS NOT NULL` ao filtro (vendas sem contrato somem dessa lista).

### Página `GestaoFabricaDirecao.tsx`
- Adicionar nova aba **"Assinatura Contrato"** no grupo azul, antes de "Pend. Faturamento":
  - Ícone: `FileSignature` (lucide)
  - Mesmo estilo glass aplicado às demais abas
  - Badge com contagem de vendas pendentes de contrato
  - Suporte a responsável da etapa via `getResponsavel('assinatura_contrato' as any)`
- Adicionar `TabsContent value="assinatura_contrato"` reutilizando `VendasPendenteDraggableList` em modo novo `mode="contrato"`.
- Atualizar o `Select` mobile incluindo a nova etapa.

### Componente novo `AnexarContratoModal`
- Abre ao clicar em "Anexar contrato" no card da venda na aba Assinatura Contrato
- Estilo glass (igual aos modais já unificados)
- Campos:
  - Upload de arquivo (PDF/JPG/PNG, máx. 10 MB)
  - Preview do nome
  - Botão "Anexar e enviar para faturamento"
- Ao confirmar:
  1. Upload em `contratos-vendas/{venda_id}/{timestamp}-{filename}`
  2. Update na venda: `contrato_url`, `contrato_assinado_em = now()`, `contrato_anexado_por = auth.uid()`
  3. Invalida queries `vendas-assinatura-contrato` e `vendas-pendente-faturamento`
  4. Toast de sucesso e fecha modal
- Permite também substituir/remover contrato (quando já existir).

### Componente `VendasPendenteDraggableList`
- Adicionar branch `mode="contrato"` que renderiza no card o botão **"Anexar contrato"** em vez do botão de criar pedido. Quando já existir contrato anexado, mostrar link "Ver contrato" (URL assinada do storage) e botão para substituir.

### Modal de seleção de responsável
- `SelecionarResponsavelEtapaModal` já aceita qualquer string em `etapa`, então funciona automaticamente para `assinatura_contrato`.

## Detalhes técnicos

- **Aba virtual** segue o mesmo padrão de `pendente_pedido`/`pendente_faturamento` (não passa pelo enum `EtapaPedido` e usa cast `as any` quando necessário).
- **URLs do contrato**: bucket privado, gerar URL assinada via `supabase.storage.from('contratos-vendas').createSignedUrl(path, 3600)` quando o usuário clicar em "Ver contrato".
- **Retrocompatibilidade**: vendas existentes sem `contrato_url` cairão na nova aba "Assinatura Contrato" — vou ajustar a migration para marcar vendas já faturadas (ou já com pedido criado) como tendo contrato implícito (`contrato_url = 'legado'`, `contrato_assinado_em = data_venda`) para que não voltem indevidamente. Vendas não faturadas existentes ficam pendentes de contrato (comportamento esperado para novo processo).
- **Memória**: salvar uma nova memory `mem://features/vendas/assinatura-contrato` documentando que a etapa é virtual e exige `contrato_url` para avançar.

## Pontos de atenção / dúvidas para depois

- Tipos de arquivo aceitos no upload: vou liberar PDF, JPG, PNG. Se quiser restringir só a PDF, ajuste depois.
- Limite de tamanho: 10 MB. Posso aumentar se necessário.
- Validação de quem pode anexar: hoje qualquer usuário autenticado da fábrica pode. Se precisar restringir só ao responsável da etapa + admins, peça que eu adicione checagem.
