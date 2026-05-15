UPDATE instalacoes
SET data_carregamento = (carregamento_concluido_em AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL AND carregamento_concluido_em IS NOT NULL;

UPDATE ordens_carregamento
SET data_carregamento = (carregamento_concluido_em AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL AND carregamento_concluido_em IS NOT NULL;

UPDATE correcoes
SET data_carregamento = (updated_at AT TIME ZONE 'UTC')::date
WHERE carregamento_concluido = true AND data_carregamento IS NULL;