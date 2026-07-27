import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function digits(s?: string | null) {
  return (s || "").replace(/\D/g, "");
}

function normalizeName(s?: string | null) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export interface VendaMedicaoStatus {
  exigeMedicao: boolean;
  temMedicao: boolean;
  visitaId?: string;
  loading: boolean;
}

/**
 * Verifica se uma venda possui "folha de medição" (visita técnica concluída)
 * registrada no sistema, correspondendo por nome ou telefone do cliente.
 * Só exige medição se houver ao menos um item tipo_produto = 'porta_enrolar'.
 */
export function useVendaTemMedicao(vendaId?: string | null): VendaMedicaoStatus {
  const { data, isLoading } = useQuery({
    queryKey: ["venda-tem-medicao", vendaId],
    enabled: !!vendaId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: venda } = await supabase
        .from("vendas")
        .select("cliente_nome, cliente_telefone, produtos_vendas(tipo_produto)")
        .eq("id", vendaId as string)
        .maybeSingle();

      const produtos = ((venda as any)?.produtos_vendas || []) as Array<{ tipo_produto?: string }>;
      const exige = produtos.some((p) => p.tipo_produto === "porta_enrolar");
      if (!exige) return { exigeMedicao: false, temMedicao: true } as const;

      const nome = normalizeName((venda as any)?.cliente_nome);
      const tel = digits((venda as any)?.cliente_telefone);

      const [agendadasRes, leadsRes] = await Promise.all([
        supabase
          .from("visitas_tecnicas_agendadas")
          .select("id, titulo, telefone_contato, status")
          .eq("status", "concluida"),
        supabase
          .from("elisaportas_leads")
          .select("id, nome, telefone, visitas_tecnicas(id, status, visitas_tecnicas_conclusoes(id))"),
      ]);

      const agendadas = (agendadasRes.data || []) as any[];
      const matchAgendada = agendadas.find((v) => {
        const t = normalizeName(v.titulo);
        const p = digits(v.telefone_contato);
        return (nome && t && (t.includes(nome) || nome.includes(t))) || (tel && p && tel === p);
      });
      if (matchAgendada) {
        return { exigeMedicao: true, temMedicao: true, visitaId: matchAgendada.id } as const;
      }

      const leads = (leadsRes.data || []) as any[];
      const matchLead = leads.find((l) => {
        const n = normalizeName(l.nome);
        const p = digits(l.telefone);
        const matches = (nome && n && (n.includes(nome) || nome.includes(n))) || (tel && p && tel === p);
        if (!matches) return false;
        const vts = (l.visitas_tecnicas || []) as any[];
        return vts.some((v) => (v.visitas_tecnicas_conclusoes || []).length > 0);
      });
      if (matchLead) {
        return { exigeMedicao: true, temMedicao: true } as const;
      }

      return { exigeMedicao: true, temMedicao: false } as const;
    },
  });

  return {
    exigeMedicao: data?.exigeMedicao ?? false,
    temMedicao: data?.temMedicao ?? true,
    visitaId: (data as any)?.visitaId,
    loading: isLoading,
  };
}