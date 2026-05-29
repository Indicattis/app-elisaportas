import { CreditCard, Calendar as CalendarIcon, CheckCircle2, Clock, FileText, Image as ImageIcon, Eye, Building2, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { formatarMetodoPagamento } from "@/utils/pagamentoResumo";

interface VendaLike {
  id: string;
  data_venda?: string | null;
  metodo_pagamento?: string | null;
  forma_pagamento?: string | null;
  empresa_receptora_id?: string | null;
  quantidade_parcelas?: number | null;
  numero_parcelas?: number | null;
  intervalo_boletos?: number | null;
  valor_venda?: number | null;
  valor_credito?: number | null;
  valor_frete?: number | null;
  valor_entrada?: number | null;
  valor_a_receber?: number | null;
  pagamento_na_entrega?: boolean | null;
  comprovante_url?: string | null;
  comprovante_nome?: string | null;
}

interface ParcelaLike {
  id: string;
  numero_parcela: number | null;
  metodo_pagamento: string | null;
  valor_parcela: number | null;
  data_vencimento: string | null;
  data_pagamento?: string | null;
  status: string | null;
  empresa_receptora_id?: string | null;
}

interface PagamentoResumoProps {
  venda: VendaLike;
  contasReceber: ParcelaLike[];
  /** Esconde detalhamento de parcelas (mostra apenas resumo por método). */
  compact?: boolean;
  /** Esconde o card de comprovante. */
  hideComprovante?: boolean;
  className?: string;
}

const formatDateBR = (iso?: string | null) => {
  if (!iso) return "—";
  // YYYY-MM-DD → DD/MM/YYYY sem fuso
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
};

export function PagamentoResumo({
  venda,
  contasReceber,
  compact = false,
  hideComprovante = false,
  className,
}: PagamentoResumoProps) {
  const empresaIds = Array.from(
    new Set(
      [
        venda.empresa_receptora_id || null,
        ...contasReceber.map((p) => p.empresa_receptora_id || null),
      ].filter(Boolean) as string[]
    )
  );

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-receptoras-by-id", empresaIds.sort().join(",")],
    enabled: empresaIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("empresas_emissoras")
        .select("id, nome")
        .in("id", empresaIds);
      return data || [];
    },
  });
  const empresaNome = (id?: string | null) =>
    id ? empresas.find((e: any) => e.id === id)?.nome || null : null;

  // Agrupa parcelas por método, mantendo ordem original (1ª aparição)
  const grupos: { metodo: string; parcelas: ParcelaLike[] }[] = [];
  if (contasReceber.length > 0) {
    const ordered = [...contasReceber].sort(
      (a, b) => (a.numero_parcela || 0) - (b.numero_parcela || 0)
    );
    for (const p of ordered) {
      const m = p.metodo_pagamento || "outros";
      let grupo = grupos.find((g) => g.metodo === m);
      if (!grupo) {
        grupo = { metodo: m, parcelas: [] };
        grupos.push(grupo);
      }
      grupo.parcelas.push(p);
    }
  } else if (venda.metodo_pagamento) {
    // Fallback: sem parcelas geradas — mostra o método principal sintetizado.
    grupos.push({ metodo: venda.metodo_pagamento, parcelas: [] });
  }

  const isImg = (nome?: string | null) =>
    !!nome && /\.(png|jpg|jpeg|webp)$/i.test(nome);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CreditCard className="w-4 h-4 text-white/60" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Forma de Pagamento
            </h3>
          </div>
          {venda.pagamento_na_entrega && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
              <Truck className="w-3 h-3" /> Pago na entrega
            </span>
          )}
        </div>

        {grupos.length === 0 ? (
          <p className="text-sm text-white/40">
            Nenhuma informação de pagamento registrada nesta venda.
          </p>
        ) : (
          <div className="space-y-3">
            {grupos.map((g, idx) => {
              const subtotal = g.parcelas.reduce(
                (s, p) => s + (p.valor_parcela || 0),
                0
              );
              const pagas = g.parcelas.filter((p) => p.status === "pago").length;
              const empresa =
                empresaNome(g.parcelas[0]?.empresa_receptora_id) ||
                (idx === 0 ? empresaNome(venda.empresa_receptora_id) : null);
              return (
                <div
                  key={`${g.metodo}-${idx}`}
                  className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {formatarMetodoPagamento(g.metodo)}
                      </span>
                      {g.parcelas.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                          {g.parcelas.length}x
                        </span>
                      )}
                      {g.parcelas.length > 0 && (
                        <span className="text-[11px] text-white/50">
                          {pagas}/{g.parcelas.length} pagas
                        </span>
                      )}
                      {empresa && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                          <Building2 className="w-3 h-3" />
                          {empresa}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-white/90">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {!compact && g.parcelas.length > 0 && (
                    <div>
                      <div className="grid grid-cols-[40px_1fr_1fr_110px] gap-3 px-3 py-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-white/40">
                        <span>#</span>
                        <span>Vencimento</span>
                        <span className="text-right">Valor</span>
                        <span className="text-center">Status</span>
                      </div>
                      {g.parcelas.map((p, i) => {
                        const isPago = p.status === "pago";
                        const isLast = i === g.parcelas.length - 1;
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "grid grid-cols-[40px_1fr_1fr_110px] gap-3 items-center px-3 py-2 text-sm",
                              !isLast && "border-b border-white/5",
                              isPago && "bg-emerald-500/[0.03]"
                            )}
                          >
                            <span className="font-mono text-white/50">
                              {p.numero_parcela ?? "—"}
                            </span>
                            <span className="flex items-center gap-1.5 text-white/80">
                              <CalendarIcon className="w-3.5 h-3.5 text-white/30" />
                              {formatDateBR(p.data_vencimento)}
                            </span>
                            <span className="text-right font-medium text-white/90">
                              {formatCurrency(p.valor_parcela || 0)}
                            </span>
                            <span className="flex justify-center">
                              {isPago ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Pago
                                  {p.data_pagamento ? ` · ${formatDateBR(p.data_pagamento)}` : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {contasReceber.length === 0 && venda.metodo_pagamento && (
          <p className="text-[11px] text-white/40">
            Parcelas não foram geradas no cadastro desta venda. Para
            regenerar, edite a venda em Minhas Vendas.
          </p>
        )}
      </div>

      {!hideComprovante && venda.comprovante_url && (
        <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
            Comprovante
          </h3>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.03]">
            {isImg(venda.comprovante_nome) ? (
              <ImageIcon className="w-5 h-5 text-white/60 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-white/60 shrink-0" />
            )}
            <span className="text-sm text-white/70 flex-1 truncate">
              {venda.comprovante_nome || "Comprovante"}
            </span>
            <a
              href={venda.comprovante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/10"
            >
              <Eye className="w-3 h-3" /> Visualizar
            </a>
          </div>
          {isImg(venda.comprovante_nome) && (
            <a
              href={venda.comprovante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-xs"
            >
              <img
                src={venda.comprovante_url}
                alt="Preview do comprovante"
                className="rounded-lg border border-white/10 w-full h-auto object-contain max-h-48"
              />
            </a>
          )}
        </div>
      )}
    </div>
  );
}