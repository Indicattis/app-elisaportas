-- Remover a constraint única antiga que não considera o campo ativo
ALTER TABLE public.estoque_categorias 
DROP CONSTRAINT IF EXISTS estoque_categorias_nome_key;

-- Criar índice único parcial que só aplica unicidade para categorias ativas
CREATE UNIQUE INDEX estoque_categorias_nome_ativo_key 
ON public.estoque_categorias (nome) 
WHERE ativo = true;