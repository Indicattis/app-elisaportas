# Melhorar avisos de erro de campos obrigatórios em /vendas/minhas-vendas/nova

## Problema atual

Em `src/pages/vendas/VendaNovaMinimalista.tsx`, o `handleSubmit` exibe toasts genéricos:

- "Todos os campos de localização são obrigatórios (Estado, Cidade, CEP, Bairro e Endereço)" — não diz qual está faltando.
- Não valida explicitamente cliente (nome, telefone), data de previsão de entrega, tipo de entrega ou forma de pagamento (mostra erro só ao processar).
- Toasts somem rápido e não direcionam o usuário até o campo.

## O que fazer

### 1. Validação granular em `handleSubmit`

Substituir os toasts genéricos por uma checagem que coleta **todos** os campos faltantes em uma lista e mostra um único toast claro:

- Nome do cliente
- Telefone do cliente
- CPF/CNPJ (se preenchido, validar formato — manter regra atual)
- Estado, Cidade, CEP, Bairro, Endereço (cada um listado individualmente)
- Data de previsão de entrega (`dataEntrega`)
- Tipo de entrega
- Forma de pagamento (ao menos um método em `pagamentoData.metodos`)
- Pelo menos um produto

Formato do toast (sonner `toast.error` com `description` em lista):

```
Título: "Campos obrigatórios não preenchidos"
Descrição: lista com bullets dos campos faltantes
```

### 2. Destaque visual nos campos faltantes

- Manter um state `camposFaltantes: Set<string>` populado no submit.
- Aplicar borda vermelha (`border-destructive` / `ring-destructive`) nos inputs/labels listados quando o respectivo campo estiver no set.
- Limpar a marcação do campo assim que o usuário começa a digitar/selecionar nele.
- Rolar suavemente até o primeiro campo faltante (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) e dar foco quando possível.

### 3. Mensagens específicas mantidas

- Documento inválido (CPF/CNPJ com dígitos errados) continua com mensagem própria.
- Endereço/bairro com menos de 2 caracteres continua com mensagem própria, mas integrada à lista de campos destacados.

## Fora de escopo

- Validação de descontos/autorização (`validarDesconto`) permanece igual.
- `VendaEditarMinimalista.tsx` não será alterada (não foi pedido).
- Nenhuma mudança de banco ou hook.

## Arquivos afetados

- `src/pages/vendas/VendaNovaMinimalista.tsx` (apenas frontend).
