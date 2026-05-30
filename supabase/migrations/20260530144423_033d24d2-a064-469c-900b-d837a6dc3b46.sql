INSERT INTO public.tipos_custos (nome, descricao, valor_maximo_mensal, tipo, ativo, aparece_no_dre)
SELECT nome, NULL, COALESCE(valor, 0), 'imposto', true, true
FROM public.despesas_padrao
WHERE tipo='imposto';

DELETE FROM public.despesas_padrao WHERE tipo='imposto';