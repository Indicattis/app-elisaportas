import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VendaPendenteFaturamento } from "@/hooks/useVendasPendenteFaturamento";

interface VendaPendenteFaturamentoCardProps {
  venda: VendaPendenteFaturamento;
}

export const VendaPendenteFaturamentoCard = ({ venda }: VendaPendenteFaturamentoCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/financeiro/faturamento/${venda.id}`);
  };

  const { data: ultimoComentario } = useQuery({
    queryKey: ['venda-ultimo-comentario', venda.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from('venda_comentarios' as any)
        .select('comentario, created_at')
        .eq('venda_id', venda.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);
      return data as { comentario: string } | null;
    },
  });

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-yellow-500/20 hover:bg-white/10 transition-colors text-left group"
    >
      {/* Avatar atendente */}
      {venda.atendente_foto_url ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={venda.atendente_foto_url} />
          <AvatarFallback className="text-xs bg-yellow-500/20 text-yellow-400">
            {venda.atendente_nome?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-4 w-4 text-yellow-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {venda.cliente_nome || 'Sem nome'}
        </p>
        {ultimoComentario?.comentario && (
          <p className="text-[10px] text-muted-foreground truncate" title={ultimoComentario.comentario}>
            {ultimoComentario.comentario}
          </p>
        )}
        <p className="text-xs text-muted-foreground truncate">
          {venda.cidade}{venda.estado ? ` - ${venda.estado}` : ''}
          {venda.quantidade_portas > 0 && ` • ${venda.quantidade_portas} porta${venda.quantidade_portas > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Valor e data */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-semibold text-yellow-400">
          R$ {venda.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {(() => {
            try {
              if (!venda.data_venda) return '';
              const d = new Date(venda.data_venda + 'T12:00:00');
              return isNaN(d.getTime()) ? '' : format(d, 'dd/MM/yy', { locale: ptBR });
            } catch { return ''; }
          })()}
        </span>
      </div>

      {/* Indicador de ação */}
      <span className="text-xs text-yellow-400/60 group-hover:text-yellow-400 transition-colors">
        Faturar →
      </span>
    </button>
  );
};
