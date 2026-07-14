## Diagnóstico

Em `src/hooks/useConfiguracoesVendas.ts` (linhas 165-172) o hook expõe um objeto `configuracoesMescladas` reconstruído a cada render:

```ts
const configuracoesMescladas = configuracoes
  ? { ...configuracoes, limite_desconto_avista: ..., ... }
  : configuracoes;
```

Isso é retornado como `configuracoes` para o consumidor. Como `{...}` cria uma referência nova a cada render, o `useEffect` em `RegrasVendasDirecao.tsx` (linhas 86-96) que depende de `[configuracoes]` dispara **em todo render** e reseta os estados locais `senhaResponsavel`, `senhaMaster`, `responsavelSenhaResponsavel`, `responsavelSenhaMaster`, `limiteAvista`, etc. para os valores do servidor.

Resultado: quando o usuário digita na senha ou seleciona um responsável, o próximo render (disparado pelo próprio `setState`) reconstrói `configuracoesMescladas` → o `useEffect` dispara → sobrescreve o input com o valor antigo. Visualmente, "não é possível fazer nenhuma alteração".

O botão "Salvar Alterações" fica permanentemente desabilitado pelo mesmo motivo: `hasChanges` sempre compara valores iguais, porque o estado local foi reescrito antes de comparar.

## Correção

Memoizar `configuracoesMescladas` em `useConfiguracoesVendas` para que a referência só mude quando os dados subjacentes mudam.

### Alteração

**`src/hooks/useConfiguracoesVendas.ts`**

1. Importar `useMemo` do React.
2. Envolver a construção de `configuracoesMescladas` em `useMemo`, com deps: `[configuracoes, limitesRegras.avista, limitesRegras.presencial, limitesRegras.adicionalResponsavel]`.

```ts
const configuracoesMescladas = useMemo(() => (
  configuracoes
    ? {
        ...configuracoes,
        limite_desconto_avista: limitesRegras.avista,
        limite_desconto_presencial: limitesRegras.presencial,
        limite_adicional_responsavel: limitesRegras.adicionalResponsavel,
      }
    : configuracoes
), [configuracoes, limitesRegras.avista, limitesRegras.presencial, limitesRegras.adicionalResponsavel]);
```

### Efeito

- A referência de `configuracoes` só muda quando o servidor retorna dados diferentes.
- O `useEffect` de inicialização em `RegrasVendasDirecao.tsx` só executa no mount e após um update real, não a cada tecla digitada.
- Inputs de senha, selects de responsável e limites de desconto ficam editáveis. `hasChanges` passa a detectar diferenças e habilita o botão "Salvar Alterações".

### Fora de escopo

- Não mexer no schema, RLS, ou nas mutations. As policies já permitem update para o usuário (has_route_access retorna true).
- Não mexer no layout do `RegrasVendasDirecao.tsx`.
