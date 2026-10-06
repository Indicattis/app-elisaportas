import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { Factory, Truck, ListOrdered, ArrowRight, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ETAPA_LABELS: Record<string, string> = {
  aprovacao_diretor: "Aprovação Diretor",
  aberto: "Aberto",
  aprovacao_ceo: "Aprovação CEO",
  em_producao: "Em Produção",
  inspecao_qualidade: "Qualidade",
  aguardando_pintura: "Pintura",
  embalagem: "Embalagem",
  aguardando_coleta: "Aguardando Coleta",
  instalacoes: "Instalações",
  correcoes: "Correções",
  finalizado: "Finalizado",
  pos_vendas: "Pós-Vendas",
  aguardando_cliente: "Aguardando Cliente",
};

const ETAPA_COLORS: Record<string, string> = {
  aprovacao_diretor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  aberto: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  aprovacao_ceo: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  em_producao: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  inspecao_qualidade: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  aguardando_pintura: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  embalagem: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  aguardando_coleta: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  instalacoes: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  correcoes: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  finalizado: "bg-green-500/20 text-green-300 border-green-500/30",
  pos_vendas: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  aguardando_cliente: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

function EtapaBadge({ etapa }: { etapa: string }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ETAPA_COLORS[etapa] || "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"}`}>
      {ETAPA_LABELS[etapa] || etapa}
    </span>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: any; count: number; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full" />
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Icon className="w-4 h-4 text-blue-300" strokeWidth={1.5} />
        <h2 className="text-white/90 text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-[10px] font-medium text-white/50 bg-white/10 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="px-2 pb-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-white/40 text-xs text-center py-4">{text}</p>;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // A) Pedidos que saíram de "Em Produção"
  const { data: sairamProducao = [] } = useQuery({
    queryKey: ["dashboard-sairam-producao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_etapas")
        .select("pedido_id, data_saida, pedido:pedidos_producao(id, numero_pedido, cliente_nome, etapa_atual)")
        .eq("etapa", "em_producao")
        .not("data_saida", "is", null)
        .order("data_saida", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  // B) Etapas logísticas com agendamento
  const { data: logisticaAgendada = [] } = useQuery({
    queryKey: ["dashboard-logistica-agendada"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_producao")
        .select("id, numero_pedido, cliente_nome, etapa_atual, data_carregamento")
        .in("etapa_atual", ["aguardando_coleta", "instalacoes", "correcoes"])
        .not("data_carregamento", "is", null)
        .order("data_carregamento", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  // C) Ordem atual dos pedidos "Em Produção"
  const { data: emProducao = [] } = useQuery({
    queryKey: ["dashboard-em-producao-ordem"],
    queryFn: async () => {
      const { data: pedidos, error } = await supabase
        .from("pedidos_producao")
        .select("id, numero_pedido, cliente_nome")
        .eq("etapa_atual", "em_producao");
      if (error) throw error;
      if (!pedidos || pedidos.length === 0) return [];

      const ids = pedidos.map((p) => p.id);
      const { data: etapas, error: errEtapas } = await supabase
        .from("pedidos_etapas")
        .select("pedido_id, data_entrada")
        .eq("etapa", "em_producao")
        .in("pedido_id", ids)
        .is("data_saida", null);
      if (errEtapas) throw errEtapas;

      const entradaPorPedido = new Map<string, string>();
      (etapas || []).forEach((e: any) => {
        const atual = entradaPorPedido.get(e.pedido_id);
        if (!atual || e.data_entrada < atual) entradaPorPedido.set(e.pedido_id, e.data_entrada);
      });

      return pedidos
        .map((p: any) => ({ ...p, data_entrada: entradaPorPedido.get(p.id) || null }))
        .sort((a, b) => (a.data_entrada || "").localeCompare(b.data_entrada || ""));
    },
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <AnimatedBreadcrumb
        items={[{ label: "Home", path: "/home" }, { label: "Dashboard" }]}
        mounted={mounted}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-16 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
          }}
        >
          <Section title="Saíram de Em Produção" icon={Factory} count={sairamProducao.length}>
            {sairamProducao.length === 0 ? (
              <EmptyState text="Nenhum pedido avançou de Em Produção recentemente" />
            ) : (
              sairamProducao.map((item: any) => (
                <button
                  key={item.pedido_id}
                  onClick={() => item.pedido?.id && navigate(`/producao/pedidos/${item.pedido.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      #{item.pedido?.numero_pedido} · {item.pedido?.cliente_nome}
                    </p>
                    <p className="text-white/40 text-[11px] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Saiu {format(new Date(item.data_saida), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <EtapaBadge etapa={item.pedido?.etapa_atual} />
                </button>
              ))
            )}
          </Section>
        </div>

        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms",
          }}
        >
          <Section title="Logística com Agendamento" icon={Truck} count={logisticaAgendada.length}>
            {logisticaAgendada.length === 0 ? (
              <EmptyState text="Nenhum pedido agendado nas etapas logísticas" />
            ) : (
              logisticaAgendada.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/producao/pedidos/${p.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      #{p.numero_pedido} · {p.cliente_nome}
                    </p>
                    <p className="text-white/40 text-[11px] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Agendado para {format(new Date(`${p.data_carregamento.split("T")[0]}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <EtapaBadge etapa={p.etapa_atual} />
                </button>
              ))
            )}
          </Section>
        </div>

        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms",
          }}
        >
          <Section title="Ordem Atual — Em Produção" icon={ListOrdered} count={emProducao.length}>
            {emProducao.length === 0 ? (
              <EmptyState text="Nenhum pedido em produção no momento" />
            ) : (
              emProducao.map((p: any, index: number) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/producao/pedidos/${p.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center">
                    {index + 1}º
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      #{p.numero_pedido} · {p.cliente_nome}
                    </p>
                    {p.data_entrada && (
                      <p className="text-white/40 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Em produção {formatDistanceToNow(new Date(p.data_entrada), { locale: ptBR, addSuffix: true })}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
