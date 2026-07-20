## Objetivo
Permitir que o vendedor decida se as alterações feitas nos dados do cliente durante o cadastro/edição da venda devem ou não ser propagadas para o cadastro central do cliente. O toggle fica ativado por padrão (comportamento atual preservado).

## Mudanças

**1. `src/components/vendas/ClienteVendaSection.tsx`**
- Adicionar toggle (Switch do shadcn) no topo da seção do cliente com o label "Atualizar cadastro do cliente com estas alterações" e um hint curto ("Se desativado, as edições valem apenas para esta venda").
- Só exibir o toggle quando houver um `cliente_id` selecionado (só faz sentido para clientes existentes).
- Nova prop `atualizarCadastroCliente: boolean` + `onToggleAtualizarCadastro: (v: boolean) => void`.

**2. `src/pages/vendas/VendaNovaMinimalista.tsx`**
- Adicionar no `formData` o campo `atualizar_cadastro_cliente: boolean` com default `true`.
- Passar valor e handler para `ClienteVendaSection`.
- Incluir o valor no payload enviado ao `criarVenda` / `salvarRascunho`.
- Ao hidratar rascunho, respeitar valor salvo (fallback `true`).

**3. `src/hooks/useVendas.ts`**
- Adicionar `atualizar_cadastro_cliente?: boolean` (default `true`) na interface do payload.
- No bloco "4. Criar ou vincular cliente" (linhas ~330-351), condicionar o `update` da tabela `clientes` (endereço, número, telefone, email, público-alvo, etc.) ao flag ser `true`. Se `false`, apenas vincula o `cliente_id` existente sem alterar o cadastro.
- Mesma regra aplicada no fluxo de rascunho (se houver update de cliente equivalente).

**4. Persistência do rascunho**
- Salvar o flag no JSON do rascunho para que a preferência seja retomada ao converter em venda.

## Comportamento
- Toggle **ligado** (padrão): mantém o comportamento atual — alterações no formulário atualizam o cadastro do cliente.
- Toggle **desligado**: alterações ficam somente na venda; cadastro central do cliente permanece intacto.
- Cliente novo (sem `cliente_id`): toggle oculto, cliente é criado normalmente.
