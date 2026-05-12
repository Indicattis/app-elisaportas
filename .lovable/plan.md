## Auditoria do sistema de autorização por senha (Vendas)

Mapeei todo o fluxo (criação direta `VendasNova` / `VendaNovaMinimalista`, conversão de rascunho `MinhasVendasEditar`, modal `AutorizacaoDescontoModal`, modal legado `VerificacaoLiderModal`, hooks `useLiderVendas` / `useConfiguracoesVendas` e gravação em `vendas_autorizacoes_desconto`).

### Problemas encontrados

1. **CRÍTICO — Senha gravada na auditoria é fake (hardcoded `'1qazxsw2'`).**
   Em três lugares a venda é criada passando `senha_usada: '1qazxsw2'` em vez da senha realmente digitada:
   - `src/pages/vendas/VendaNovaMinimalista.tsx:551`
   - `src/pages/VendasNova.tsx:469`
   - (`MinhasVendasEditar` nem grava a senha — passa `descontoAutorizado=true` e segue, sem registro na tabela `vendas_autorizacoes_desconto`).
   Resultado: o histórico em `vendas_autorizacoes_desconto.senha_usada` não reflete a senha usada, e há uma senha real exposta em texto puro no código-fonte.

2. **Validação de senha 100% no client (sem hash).**
   `AutorizacaoDescontoModal` e `VerificacaoLiderModal` comparam `senha === configuracoes.senha_master` / `configuracoes.senha_responsavel`. Para isso o cliente precisa SELECT em `configuracoes_vendas`, ou seja, qualquer usuário com acesso à página tem acesso às senhas em texto puro via DevTools/Network. As senhas também trafegam em cada `useConfiguracoesVendas`.

3. **Rascunho (`MinhasVendasEditar`) não registra a autorização.**
   O handler `onAutorizado` apenas marca `descontoAutorizado=true` e dispara `handleCadastrarVenda` via `setTimeout(...,100)`. Não cria linha em `vendas_autorizacoes_desconto`, então a venda convertida do rascunho fica sem rastro de quem autorizou e qual percentual foi liberado. Diferente do fluxo de criação direta.

4. **`MinhasVendasEditar` não oferece "Solicitar Aprovação".**
   `AutorizacaoDescontoModal` é renderizado sem `onSolicitarAprovacao`, então o usuário do rascunho é obrigado a ter a senha master quando ultrapassa o limite do responsável; não consegue escalar para a Direção como acontece em `VendasNova` / `VendaNovaMinimalista`.

5. **`VerificacaoLiderModal` é código morto/duplicado.**
   Não é importado em lugar nenhum do fluxo ativo de vendas (apenas existe). Mantém a mesma falha de comparação client-side e duplica busca de líder.

6. **Tipagem inconsistente.**
   `MinhasVendasEditar` declara `tipoAutorizacaoNecessaria: 'responsavel_setor' | 'master'` (sem `null`) com default `'responsavel_setor'`, divergindo das outras telas; o modal sempre é montado mesmo sem necessidade real.

7. **Race condition no rascunho.**
   `setTimeout(() => handleCadastrarVenda(), 100)` depende do `setDescontoAutorizado(true)` ter sido aplicado. Em React 18 + StrictMode o agendamento pode falhar silenciosamente se o usuário fechar o modal rápido.

### Plano de correção

**A. Backend — esconder as senhas e validar via RPC (alta prioridade)**

1. Migração:
   - Criar funções `public.verificar_senha_responsavel_vendas(_senha text)` e `public.verificar_senha_master_vendas(_senha text)` `SECURITY DEFINER`, retornando `boolean`. Comparam contra `configuracoes_vendas` internamente.
   - Revogar SELECT das colunas `senha_responsavel` e `senha_master` para `authenticated`/`anon` (usar coluna privilege ou view sem essas colunas) e ajustar políticas para que somente roles de liderança (admin/diretor/ceo) leiam o texto puro na tela de Regras de Vendas.
   - Manter as funções `verificarSenhaResponsavel` / `verificarSenhaMaster` no hook chamando as RPCs, sem expor a senha.

**B. Frontend — usar a senha digitada de verdade**

2. `AutorizacaoDescontoModal.onAutorizado` passa a entregar `(autorizadorId, senhaDigitada)`; validação acontece via RPC do passo A.
3. `VendaNovaMinimalista` e `VendasNova`: substituir o literal `'1qazxsw2'` por `senhaDigitada` recebido do modal.
4. `MinhasVendasEditar`:
   - Receber `senhaDigitada` no callback.
   - Persistir a autorização em `vendas_autorizacoes_desconto` no momento da conversão do rascunho (mesmos campos que as outras telas), reaproveitando a lógica de `useVendas`.
   - Adicionar `onSolicitarAprovacao` (mesmo fluxo de `useRequisicaoAprovacaoVenda`) para casos acima do limite máximo.
   - Trocar `setTimeout` por chamada direta encadeada (`await ... ; await handleCadastrarVenda()`), sem depender de `setDescontoAutorizado`.

**C. Limpeza e consistência**

5. Remover `src/components/vendas/VerificacaoLiderModal.tsx` (não utilizado) ou refatorá-lo para chamar a mesma RPC, se for usado em outro lugar (verificar antes).
6. Padronizar tipo em `MinhasVendasEditar`: `'responsavel_setor' | 'master' | null` com default `null`, e renderizar o modal só quando necessário.
7. Centralizar a montagem do payload `autorizacaoDesconto` (autorizado_por, solicitado_por, percentual, senha, tipo) em uma função utilitária em `src/utils/descontoVendasRules.ts` para os 3 fluxos consumirem.

### Validação após implementação

- Cadastrar venda nova com desconto > limite → modal pede senha do responsável → digitar senha correta → registro aparece em `vendas_autorizacoes_desconto` com `senha_usada` real e `tipo_autorizacao='responsavel_setor'`.
- Cadastrar venda com desconto > limite máximo → exigir senha master ou opção "Solicitar Aprovação".
- Repetir os dois cenários partindo de um rascunho em `MinhasVendasEditar`; conferir mesmo registro de auditoria.
- Conferir via DevTools que `senha_responsavel` / `senha_master` não são mais retornadas no payload de `configuracoes_vendas` para usuários comuns.
- Confirmar que página `/direcao/vendas/regras-vendas` continua mostrando/alterando as senhas para liderança.

### Detalhes técnicos

```text
Fluxo desejado:
[modal] -> RPC verificar_senha_*  -> ok? -> onAutorizado(userId, senhaDigitada)
                                              |
            +---------------------------------+
            |                                 |
[VendasNova/Minimalista]              [MinhasVendasEditar]
 createVenda({ autorizacaoDesconto:    handleCadastrarVenda + insert em
   { senha_usada: senhaDigitada, ... }})  vendas_autorizacoes_desconto
```

Tabelas afetadas: `configuracoes_vendas` (políticas), `vendas_autorizacoes_desconto` (apenas inserts adicionais). Sem alteração de schema.
