import { supabase } from "@/integrations/supabase/client";

/**
 * Reverte a liberação de faturamento sem contrato de uma venda.
 * Zera contrato_liberado_faturamento e os campos relacionados de auditoria.
 */
export async function desliberarContrato(vendaId: string): Promise<void> {
  const { error } = await supabase
    .from("vendas")
    .update({
      contrato_liberado_faturamento: false,
      contrato_liberado_em: null,
      contrato_liberado_por: null,
    })
    .eq("id", vendaId);
  if (error) throw error;
}