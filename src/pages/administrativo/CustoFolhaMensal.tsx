import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Save, Users } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Colaborador {
  id: string;
  nome: string;
}

export default function CustoFolhaMensal() {
  const { user } = useAuth();
  const today = startOfMonth(new Date());
  const [mesRef, setMesRef] = useState<Date>(today);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const mesIso = format(mesRef, "yyyy-MM-dd");
  const mesLabel = format(mesRef, "MMMM 'de' yyyy", { locale: ptBR });

  const mesesDisponiveis = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -12; i <= 2; i++) arr.push(addMonths(today, i));
    return arr;
  }, []);

  const { data: colaboradores = [], isLoading: loadingColabs } = useQuery({
    queryKey: ["custo-folha-colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, nome")
        .eq("eh_colaborador", true)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as Colaborador[];
    },
  });

  const { data: lancamentos = [], isLoading: loadingLanc, refetch } = useQuery({
    queryKey: ["custo-folha-lancamentos", mesIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custos_folha_mensais")
        .select("colaborador_id, valor")
        .eq("mes_referencia", mesIso);
      if (error) throw error;
      return (data || []) as { colaborador_id: string; valor: number }[];
    },
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    lancamentos.forEach((l) => {
      map[l.colaborador_id] = String(Number(l.valor) || 0);
    });
    setValores(map);
  }, [lancamentos, mesIso]);

  const total = colaboradores.reduce((acc, c) => acc + (parseFloat(valores[c.id] || "0") || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const toUpsert: any[] = [];
      const toDelete: string[] = [];
      colaboradores.forEach((c) => {
        const v = parseFloat(valores[c.id] || "0") || 0;
        if (v > 0) {
          toUpsert.push({
            mes_referencia: mesIso,
            colaborador_id: c.id,
            colaborador_nome: c.nome,
            valor: v,
            created_by: user?.id ?? null,
          });
        } else {
          toDelete.push(c.id);
        }
      });

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("custos_folha_mensais")
          .upsert(toUpsert, { onConflict: "mes_referencia,colaborador_id" });
        if (error) throw error;
      }
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("custos_folha_mensais")
          .delete()
          .eq("mes_referencia", mesIso)
          .in("colaborador_id", toDelete);
        if (error) throw error;
      }

      toast.success("Custo em folha salvo com sucesso");
      await refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar custo em folha");
    } finally {
      setSaving(false);
    }
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const loading = loadingColabs || loadingLanc;

  return (
    <MinimalistLayout
      title="Custo em Folha"
      subtitle="Lançamento mensal por colaborador"
      backPath="/administrativo/financeiro"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Administrativo", path: "/administrativo" },
        { label: "Financeiro", path: "/administrativo/financeiro" },
        { label: "Custo em Folha" },
      ]}
    >
      <div className="space-y-6">
        {/* Seletor de mês */}
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-white/70">
            <Users className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm uppercase tracking-wide">Mês de referência</span>
          </div>
          <Select
            value={mesIso}
            onValueChange={(v) => setMesRef(new Date(`${v}T12:00:00`))}
          >
            <SelectTrigger className="w-[240px] bg-white/5 border-white/10 text-white capitalize">
              <SelectValue>{mesLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mesesDisponiveis.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                return (
                  <SelectItem key={iso} value={iso} className="capitalize">
                    {format(d, "MMMM 'de' yyyy", { locale: ptBR })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
          ) : colaboradores.length === 0 ? (
            <div className="py-16 text-center text-white/50 text-sm">
              Nenhum colaborador ativo encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-white/40 font-medium text-xs uppercase">
                    Colaborador
                  </th>
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[220px]">
                    Custo no mês (R$)
                  </th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-white/80">{c.nome}</td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={valores[c.id] ?? ""}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="0,00"
                        className="bg-white/5 border-white/10 text-white text-right ml-auto w-[200px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="p-3 font-semibold text-white/80 uppercase text-xs">
                    Total do mês
                  </td>
                  <td className="p-3 text-right font-bold text-white tabular-nums">
                    {formatBRL(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || loading || colaboradores.length === 0}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar lançamentos
          </Button>
        </div>
      </div>
    </MinimalistLayout>
  );
}