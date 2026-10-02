import { useQuery } from '@tanstack/react-query';
import { Handshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Mostra a modalidade "Autorizado" da venda: autorizado, valor acordado e observação. */
export function InfoAutorizadoVenda({ vendaId, className = '' }: { vendaId?: string | null; className?: string }) {
  const { data } = useQuery({
    queryKey: ['venda-info-autorizado', vendaId],
    enabled: !!vendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('tipo_entrega, valor_acordado_autorizado, frete_autorizado, observacao_autorizado, autorizado:autorizados!vendas_autorizado_instalacao_id_fkey(nome, cidade, estado)')
        .eq('id', vendaId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (!data || data.tipo_entrega !== 'autorizado') return null;

  return (
    <div className={`rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
        <Handshake className="h-4 w-4" /> Modalidade: Autorizado
      </div>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-white/50">Autorizado responsável</p>
          <p className="font-medium text-white">
            {data.autorizado?.nome || '—'}
            {data.autorizado?.cidade ? ` — ${data.autorizado.cidade}/${data.autorizado.estado ?? ''}` : ''}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/50">Valor acordado (fora do faturamento)</p>
          <p className="font-medium text-white">{brl(Number(data.valor_acordado_autorizado || 0))}</p>
        </div>
        <div>
          <p className="text-xs text-white/50">Frete (soma na venda)</p>
          <p className="font-medium text-white">{brl(Number(data.frete_autorizado || 0))}</p>
        </div>
      </div>
      <div className="text-sm">
        <p className="text-xs text-white/50">Observação</p>
        <p className="text-white/90 whitespace-pre-wrap">{data.observacao_autorizado?.trim() || '—'}</p>
      </div>
    </div>
  );
}
