## Objetivo

Reverter a unificação anterior e voltar à regra original de limites de desconto, onde **venda fria** e **método de pagamento** influenciam o limite sem senha, e a senha do **Gerente** libera até +7% adicionais.

## Regras corretas

| Componente | Quando aplica | Valor (config atual) |
|---|---|---|
| Base | Qualquer método ≠ cartão de crédito | +3% (`limite_desconto_avista`) |
| Fria | Venda marcada como fria | +5% (`limite_desconto_fria`) |
| Gerente | Senha do Gerente | +7% (`limite_adicional_responsavel`) |
| Diretor | Senha master | sem limite |

### Cenários resultantes (com config atual 3 / 5 / 7)

| Cenário | Sem senha | Gerente (até) | Diretor (acima de) |
|---|---|---|---|
| Quente + cartão de crédito | 0% | 7% | 7% |
| Quente + outro método | 3% | 10% | 10% |
| Fria + cartão de crédito | 5% | 12% | 12% |
| Fria + outro método | 8% | 15% | 15% |

## Alteração

**Arquivo:** `src/utils/descontoVendasRules.ts` — função `calcularLimitesDesconto`

Restaurar o comportamento condicional do parâmetro `vendaPresencial` (que representa "venda fria"):

```ts
const limitePresencial = vendaPresencial ? limitePresencialConfig : 0;
```

Remover o `void vendaPresencial` e o comentário que dizia que o parâmetro não tinha efeito. O restante (`limiteBase`, `limiteTotal`, `limiteMaximo`) continua igual e já corresponde às regras acima.

Nenhuma outra mudança: o modal (`AutorizacaoDescontoModal`) e a função `getTipoAutorizacaoNecessaria` já tratam corretamente os tipos `responsavel_setor` (Gerente) e `master` (Diretor) a partir do resultado de `validarDesconto`.

## Verificação

Conferir mentalmente os 4 cenários da tabela após a mudança, garantindo que:
- Dentro do limite sem senha → nenhum modal
- Entre limite sem senha e limite + 7% → modal do Gerente
- Acima de limite + 7% → modal do Diretor