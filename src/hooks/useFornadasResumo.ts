import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FornadaResumo {
  id: string;
  iniciado_em: string;
  fim_intervalo: string | null;
  responsavel_nome: string | null;
  responsavel_foto: string | null;
  qtd_portas: number;
  recarga_realizada: boolean;
}

export function useFornadasResumo(custoPorFornada: number) {
  return useQuery({
    queryKey: ["fornadas-resumo"],
    queryFn: async (): Promise<FornadaResumo[]> => {
      const { data: fornadas, error: errF } = await supabase
        .from("pintura_inicios")
        .select("id, iniciado_em, iniciado_por, recarga_realizada")
        .order("iniciado_em", { ascending: false });
      if (errF) throw errF;
      if (!fornadas || fornadas.length === 0) return [];

      const oldest = fornadas[fornadas.length - 1].iniciado_em;
      const { data: ordens, error: errO } = await supabase
        .from("ordens_pintura")
        .select("id, data_conclusao")
        .eq("status", "concluida")
        .not("data_conclusao", "is", null)
        .gte("data_conclusao", oldest);
      if (errO) throw errO;

      const userIds = Array.from(
        new Set(fornadas.map((f) => f.iniciado_por).filter(Boolean) as string[])
      );
      const usersMap = new Map<string, { nome: string; foto: string | null }>();
      if (userIds.length > 0) {
        const { data: byId } = await supabase
          .from("admin_users")
          .select("id, nome, foto_perfil_url")
          .in("id", userIds);
        byId?.forEach((u) =>
          usersMap.set(u.id, { nome: u.nome, foto: u.foto_perfil_url ?? null })
        );
        const missing = userIds.filter((id) => !usersMap.has(id));
        if (missing.length > 0) {
          const { data: byUserId } = await supabase
            .from("admin_users")
            .select("id, user_id, nome, foto_perfil_url")
            .in("user_id", missing);
          byUserId?.forEach((u) => {
            if (u.user_id)
              usersMap.set(u.user_id, { nome: u.nome, foto: u.foto_perfil_url ?? null });
          });
        }
      }

      // fornadas sorted desc; build intervals (iniciado_em, fim)
      return fornadas.map((f, idx) => {
        const fim = idx === 0 ? null : fornadas[idx - 1].iniciado_em;
        const inicio = f.iniciado_em;
        const qtd = (ordens ?? []).filter((o) => {
          if (!o.data_conclusao) return false;
          if (o.data_conclusao < inicio) return false;
          if (fim && o.data_conclusao >= fim) return false;
          return true;
        }).length;
        const user = f.iniciado_por ? usersMap.get(f.iniciado_por) : undefined;
        return {
          id: f.id,
          iniciado_em: f.iniciado_em,
          fim_intervalo: fim,
          responsavel_nome: user?.nome ?? null,
          responsavel_foto: user?.foto ?? null,
          qtd_portas: qtd,
          recarga_realizada: !!f.recarga_realizada,
        };
      });
    },
  });
}