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
  troca_id: string | null;
  troca_registrado_em: string | null;
  troca_valor: number;
  qtd_fornadas_troca: number;
  custo_fornada: number | null; // null => em apuração
  em_apuracao: boolean;
}

export function useFornadasResumo() {
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

      // Buscar trocas de gás ordenadas por data (asc)
      const { data: trocasData, error: errT } = await supabase
        .from("pintura_trocas_gas" as any)
        .select("id, registrado_em, valor")
        .order("registrado_em", { ascending: true });
      if (errT) throw errT;
      const trocas = ((trocasData as any[]) || []).map((t) => ({
        id: t.id as string,
        registrado_em: t.registrado_em as string,
        valor: Number(t.valor) || 0,
      }));
      const ultimaTrocaId = trocas.length > 0 ? trocas[trocas.length - 1].id : null;

      // Determinar troca afiliada para cada fornada
      const trocaPorFornadaId = new Map<string, { id: string; registrado_em: string; valor: number } | null>();
      for (const f of fornadas) {
        if (trocas.length === 0) {
          trocaPorFornadaId.set(f.id, null);
          continue;
        }
        // Última troca com registrado_em <= iniciado_em
        let escolhida = null as null | (typeof trocas)[number];
        for (let i = trocas.length - 1; i >= 0; i--) {
          if (trocas[i].registrado_em <= f.iniciado_em) {
            escolhida = trocas[i];
            break;
          }
        }
        // Fallback: primeira troca (fornadas anteriores à 1ª troca)
        if (!escolhida) escolhida = trocas[0];
        trocaPorFornadaId.set(f.id, escolhida);
      }

      // Contar fornadas por troca
      const contagemPorTroca = new Map<string, number>();
      for (const f of fornadas) {
        const t = trocaPorFornadaId.get(f.id);
        if (!t) continue;
        contagemPorTroca.set(t.id, (contagemPorTroca.get(t.id) ?? 0) + 1);
      }

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
        const troca = trocaPorFornadaId.get(f.id) ?? null;
        const qtdFornadasTroca = troca ? (contagemPorTroca.get(troca.id) ?? 0) : 0;
        const emApuracao = !!troca && troca.id === ultimaTrocaId;
        const custoFornada = troca && !emApuracao && qtdFornadasTroca > 0
          ? troca.valor / qtdFornadasTroca
          : (!troca ? 0 : null);
        return {
          id: f.id,
          iniciado_em: f.iniciado_em,
          fim_intervalo: fim,
          responsavel_nome: user?.nome ?? null,
          responsavel_foto: user?.foto ?? null,
          qtd_portas: qtd,
          recarga_realizada: !!f.recarga_realizada,
          troca_id: troca?.id ?? null,
          troca_registrado_em: troca?.registrado_em ?? null,
          troca_valor: troca?.valor ?? 0,
          qtd_fornadas_troca: qtdFornadasTroca,
          custo_fornada: custoFornada,
          em_apuracao: emApuracao,
        };
      });
    },
  });
}