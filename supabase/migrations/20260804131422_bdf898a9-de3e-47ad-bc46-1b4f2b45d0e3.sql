CREATE OR REPLACE FUNCTION public.registrar_pontuacao_linha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tamanho_num NUMERIC;
  v_metragem NUMERIC;
  v_token TEXT;
BEGIN
  IF NEW.concluida = true AND OLD.concluida = false AND NEW.concluida_por IS NOT NULL THEN
    IF NEW.tipo_ordem = 'perfiladeira' THEN
      v_tamanho_num := NULL;

      -- Preferir altura quando disponível (medida linear real da porta)
      IF NEW.altura IS NOT NULL AND NEW.altura > 0 THEN
        v_tamanho_num := NEW.altura;
      ELSIF NEW.tamanho IS NOT NULL AND NEW.tamanho <> '' THEN
        -- Extrair apenas o primeiro número do texto (evita "6.46x6.52" virar "6.466.52")
        v_token := substring(replace(NEW.tamanho, ',', '.') from '[0-9]+(?:\.[0-9]+)?');
        IF v_token IS NOT NULL THEN
          v_tamanho_num := v_token::NUMERIC;
        END IF;
      END IF;

      IF v_tamanho_num IS NOT NULL AND v_tamanho_num > 0 THEN
        IF v_tamanho_num > 100 THEN
          v_metragem := (v_tamanho_num / 1000.0) * COALESCE(NEW.quantidade, 1);
        ELSE
          v_metragem := v_tamanho_num * COALESCE(NEW.quantidade, 1);
        END IF;

        INSERT INTO pontuacao_colaboradores (
          user_id, linha_id, ordem_id, tipo_ordem, tipo_ranking,
          item_nome, quantidade, pontos_total, metragem_linear
        ) VALUES (
          NEW.concluida_por, NEW.id, NEW.ordem_id, NEW.tipo_ordem, 'perfiladeira',
          NEW.item, NEW.quantidade, v_metragem, v_metragem
        )
        ON CONFLICT (linha_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;