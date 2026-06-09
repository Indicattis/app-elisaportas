Plano para corrigir `/marketing/balanco-descontos`:

1. **Corrigir o cálculo visual do limite na tabela**
   - Trocar a lógica atual que usa o maior valor entre À Vista, Frio e Gerente.
   - Passar a somar os limites aplicáveis: À Vista + Frio + Gerente.
   - Resultado esperado: venda à vista + fria + gerente deve exibir **15%**.

2. **Ajustar a coluna do gerente**
   - Corrigir o rótulo/valor do gerente para refletir o adicional configurado, que hoje é **7%**.
   - Evitar mostrar “Gerente (8%)” como se fosse o adicional isolado.

3. **Usar o valor salvo no banco como fonte principal**
   - Priorizar `pct_limite_permitido` vindo de `vendas_balanco_desconto`, porque ele é recalculado pela função do banco.
   - Manter a soma no frontend apenas como fallback visual, caso algum registro antigo esteja inconsistente.

4. **Garantir consistência do excedido**
   - Recalcular a coluna “Excedido” usando o limite correto de 15% quando aplicável.

Não precisa criar tabela nem alterar RLS; a correção principal é na tela e no hook já existente.