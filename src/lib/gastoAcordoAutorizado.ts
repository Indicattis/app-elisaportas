import { supabase } from '@/integrations/supabase/client';

const TIPO_CUSTO_PAGAMENTO_AUTORIZADOS = '55302712-8a2b-4fb4-b579-91921f4abc41';

export async function criarGastoAcordoAutorizado(params: {
  acordoId: string;
  valor: number;
  clienteNome: string;
  autorizadoNome: string;
  responsavelId: string | undefined;
  bancoId: string;
  dataPagamento?: string; // YYYY-MM-DD
  parcial?: boolean;
}): Promise<void> {
  if (!params.responsavelId) return;
  if (!params.bancoId) {
    console.warn('[gastoAcordoAutorizado] Banco não informado; gasto não criado.');
    return;
  }
  const data =
    params.dataPagamento ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from('gastos' as any).insert([
    {
      tipo_custo_id: TIPO_CUSTO_PAGAMENTO_AUTORIZADOS,
      descricao: `Acordo autorizado${params.parcial ? ' (parcial)' : ''} — ${params.clienteNome} (${params.autorizadoNome})`,
      valor: params.valor,
      data,
      responsavel_id: params.responsavelId,
      banco_id: params.bancoId,
      status: 'pago',
      acordo_autorizado_id: params.acordoId,
      created_by: params.responsavelId,
    } as any,
  ]);
  if (error) {
    console.error('[gastoAcordoAutorizado] Erro ao criar gasto:', error);
    throw error;
  }
}

export async function removerGastoAcordoAutorizado(acordoId: string): Promise<void> {
  const { error } = await supabase
    .from('gastos' as any)
    .delete()
    .eq('acordo_autorizado_id', acordoId);
  if (error) {
    console.error('[gastoAcordoAutorizado] Erro ao remover gasto:', error);
    throw error;
  }
}