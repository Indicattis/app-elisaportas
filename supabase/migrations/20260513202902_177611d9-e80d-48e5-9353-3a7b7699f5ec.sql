UPDATE vendas SET contrato_url = NULL WHERE contrato_url = 'legado';

UPDATE vendas
SET contrato_dispensado = true,
    contrato_dispensado_em = COALESCE(contrato_dispensado_em, now())
WHERE contrato_url IS NULL
  AND contrato_dispensado IS DISTINCT FROM true;