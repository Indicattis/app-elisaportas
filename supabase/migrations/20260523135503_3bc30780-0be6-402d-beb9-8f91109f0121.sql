UPDATE vendas_catalogo SET unidade = 'Un' WHERE unidade = 'Unitário';
UPDATE vendas_catalogo SET unidade = 'M' WHERE unidade = 'Metro';
UPDATE vendas_catalogo SET unidade = 'Kg' WHERE unidade IN ('Quilo','Quilograma');
UPDATE vendas_catalogo SET unidade = 'L' WHERE unidade = 'Litro';
UPDATE vendas_catalogo SET unidade = 'M²' WHERE unidade IN ('Metro Quadrado','m2','M2');
UPDATE vendas_catalogo SET unidade = 'M³' WHERE unidade IN ('Metro Cúbico','m3','M3');
UPDATE vendas_catalogo SET unidade = 'Cx' WHERE unidade IN ('Caixa');
UPDATE vendas_catalogo SET unidade = 'Pç' WHERE unidade IN ('Peça','Peca');