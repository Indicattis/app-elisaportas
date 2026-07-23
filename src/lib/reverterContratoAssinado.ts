import { supabase } from "@/integrations/supabase/client";

/**
 * Descarta o contrato assinado de uma venda e a devolve para a etapa
 * "Assinatura Contrato" / "Pendente de Contrato".
 *
 * - Remove o arquivo atual do bucket `contratos-vendas` (path salvo em vendas.contrato_url).
 * - Remove registros de `contratos_vendas` vinculados à venda (e seus arquivos no bucket).
 * - Limpa `contrato_url`, `contrato_assinado_em` e `contrato_anexado_por` na venda.
 */
export async function reverterContratoAssinado(
  vendaId: string,
  contratoPath: string | null,
): Promise<void> {
  // 1) Remove arquivo principal do bucket (path relativo)
  if (contratoPath && contratoPath !== "legado") {
    await supabase.storage.from("contratos-vendas").remove([contratoPath]);
  }

  // 2) Remove registros em contratos_vendas + seus arquivos
  const { data: contratos } = await supabase
    .from("contratos_vendas")
    .select("id, arquivo_url")
    .eq("venda_id", vendaId);

  if (contratos && contratos.length > 0) {
    const fileNames = contratos
      .map((c: any) => (c.arquivo_url ? String(c.arquivo_url).split("/").pop() : null))
      .filter(Boolean) as string[];
    if (fileNames.length > 0) {
      await supabase.storage.from("contratos-vendas").remove(fileNames);
    }
    await supabase
      .from("contratos_vendas")
      .delete()
      .eq("venda_id", vendaId);
  }

  // 3) Limpa campos de contrato na venda
  const { error } = await supabase
    .from("vendas")
    .update({
      contrato_url: null,
      contrato_assinado_em: null,
      contrato_anexado_por: null,
      contrato_liberado_faturamento: false,
      contrato_dispensado: false,
    })
    .eq("id", vendaId);
  if (error) throw error;
}