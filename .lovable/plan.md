## Objetivo

No modal `GerarContratoModal` (acessado a partir de `/vendas/contratos`), adicionar um selectbox de **Cliente** vindo da tabela `clientes`, cujos dados sobrescrevem os campos de cliente do contrato.

## Mudanças

### `src/components/contratos/GerarContratoModal.tsx`
- Adicionar um terceiro `Select` ao lado de Venda/Template: **Cliente** (opcional), listando `clientes` (nome, cpf/cnpj, telefone, email, endereço completo).
- Buscar a lista de clientes com `useQuery` direto da tabela `clientes` (id, nome, cpf, telefone, email, endereco, bairro, cidade, estado, cep).
- Layout passa de 2 para 3 colunas (`grid-cols-3`), aumentar `max-w-4xl` → `max-w-5xl` se necessário para caber.
- Quando um cliente é selecionado, sobrescrever as variáveis `cliente_*` do objeto `variaveis` antes de passar ao preview e ao `generateContratoPDF`. Implementar via `useMemo` que faz merge: `{ ...variaveis, ...overridesDoCliente }`.
- Preview e geração de PDF passam a usar o objeto merged.

### Sem mudanças
- Sem alterações de banco, hooks de variáveis, ou template engine.
- `useContratoVariaveis` permanece intacto; o override é local ao modal.

## Comportamento
- Cliente é opcional; se vazio, mantém os dados vindos da venda.
- Se selecionado, todos os campos `cliente_nome`, `cliente_cpf`, `cliente_telefone`, `cliente_email`, `cliente_endereco`, `cliente_bairro`, `cliente_cidade`, `cliente_estado`, `cliente_cep` são sobrescritos.
