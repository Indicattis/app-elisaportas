## Mudança

Em `/administrativo/compras/fornecedores`, substituir os dois `EditableCell` (cidade e estado) por selects pesquisáveis (combobox) com dados do IBGE.

### Implementação

1. Criar `src/components/EstadoCidadeInline.tsx` — par de comboboxes:
   - **Estado**: lista as 27 UFs (carregadas uma vez de `https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome`, com cache em módulo).
   - **Cidade**: carrega municípios da UF selecionada de `…/estados/{uf}/municipios?orderBy=nome` quando a UF muda; cache por UF.
   - Usa `Popover` + `Command` (shadcn já no projeto) para busca por digitação.
   - Estilo glassmorphism consistente com `EditableCell` (texto inline, abre popover ao clicar).
   - Props: `cidade`, `estado`, `onChange(cidade, estado)` — chamado quando qualquer um muda. Trocar de UF limpa a cidade.

2. Em `src/pages/administrativo/FornecedoresMinimalista.tsx` (linhas 203–218), trocar o bloco dos dois `EditableCell` por `<EstadoCidadeInline cidade={fornecedor.cidade ?? ""} estado={fornecedor.estado ?? ""} onChange={(cidade, estado) => updateFornecedor({ id: fornecedor.id, cidade, estado })} />`.

## Fora de escopo

- Sem mudanças em outras telas que editam cidade/estado.
- Sem mudança no banco (continua salvando string livre da cidade e UF).
