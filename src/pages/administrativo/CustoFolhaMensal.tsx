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

interface LinhaValores {
  salarioBase: string;
  ajudaCusto: string;
  horasExtras: string;
  chavePix: string;
  previsao: string;
  adiantamento: string;
}

const linhaVazia = (): LinhaValores => ({
  salarioBase: "",
  ajudaCusto: "",
  horasExtras: "",
  chavePix: "",
  previsao: "",
  adiantamento: "",
});

const parseNum = (v: string) => parseFloat(v || "0") || 0;

export default function CustoFolhaMensal() {
  const { user } = useAuth();
  const today = startOfMonth(new Date());
  const [mesRef, setMesRef] = useState<Date>(today);
  const [valores, setValores] = useState<Record<string, LinhaValores>>({});
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
        .select("colaborador_id, valor, salario_base, ajuda_custo, horas_extras, chave_pix, previsao, adiantamento")
        .eq("mes_referencia", mesIso);
      if (error) throw error;
      return (data || []) as {
        colaborador_id: string;
        valor: number;
        salario_base: number | null;
        ajuda_custo: number | null;
        horas_extras: number | null;
        chave_pix: string | null;
        previsao: number | null;
        adiantamento: number | null;
      }[];
    },
  });

  useEffect(() => {
    const map: Record<string, LinhaValores> = {};
    lancamentos.forEach((l) => {
      map[l.colaborador_id] = {
        salarioBase: String(Number(l.salario_base ?? 0) || 0),
        ajudaCusto: String(Number(l.ajuda_custo ?? 0) || 0),
        horasExtras: String(Number(l.horas_extras ?? 0) || 0),
        chavePix: l.chave_pix ?? "",
        previsao: String(Number(l.previsao ?? 0) || 0),
      };
    });
    setValores(map);
  }, [lancamentos, mesIso]);

  const getLinha = (id: string): LinhaValores => valores[id] ?? linhaVazia();
  const totalLinha = (id: string) => {
    const l = getLinha(id);
    return parseNum(l.salarioBase) + parseNum(l.ajudaCusto) + parseNum(l.horasExtras);
  };

  const totais = colaboradores.reduce(
    (acc, c) => {
      const l = getLinha(c.id);
      acc.salarioBase += parseNum(l.salarioBase);
      acc.ajudaCusto += parseNum(l.ajudaCusto);
      acc.horasExtras += parseNum(l.horasExtras);
      acc.previsao += parseNum(l.previsao);
      return acc;
    },
    { salarioBase: 0, ajudaCusto: 0, horasExtras: 0, previsao: 0 }
  );
  const total = totais.salarioBase + totais.ajudaCusto + totais.horasExtras;

  const updateLinha = (id: string, patch: Partial<LinhaValores>) => {
    setValores((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? linhaVazia()), ...patch },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toUpsert: any[] = [];
      const toDelete: string[] = [];
      colaboradores.forEach((c) => {
        const l = getLinha(c.id);
        const sb = parseNum(l.salarioBase);
        const ac = parseNum(l.ajudaCusto);
        const he = parseNum(l.horasExtras);
        const v = sb + ac + he;
        const pv = parseNum(l.previsao);
        const pix = l.chavePix.trim();
        if (v > 0 || pv > 0 || pix.length > 0) {
          toUpsert.push({
            mes_referencia: mesIso,
            colaborador_id: c.id,
            colaborador_nome: c.nome,
            valor: v,
            salario_base: sb,
            ajuda_custo: ac,
            horas_extras: he,
            previsao: pv,
            chave_pix: pix || null,
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
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[140px]">
                    Salário Base
                  </th>
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[140px]">
                    Ajuda de Custo
                  </th>
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[140px]">
                    Horas Extras
                  </th>
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[140px]">
                    Total
                  </th>
                  <th className="text-right p-3 text-white/40 font-medium text-xs uppercase w-[140px]">
                    Previsão
                  </th>
                  <th className="text-left p-3 text-white/40 font-medium text-xs uppercase w-[240px]">
                    Chave PIX
                  </th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => {
                  const l = getLinha(c.id);
                  return (
                    <tr key={c.id} className="border-b border-white/5 last:border-0">
                      <td className="p-3 text-white/80">{c.nome}</td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={l.salarioBase}
                          onChange={(e) => updateLinha(c.id, { salarioBase: e.target.value })}
                          placeholder="0,00"
                          className="bg-white/5 border-white/10 text-white text-right ml-auto w-[130px]"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={l.ajudaCusto}
                          onChange={(e) => updateLinha(c.id, { ajudaCusto: e.target.value })}
                          placeholder="0,00"
                          className="bg-white/5 border-white/10 text-white text-right ml-auto w-[130px]"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={l.horasExtras}
                          onChange={(e) => updateLinha(c.id, { horasExtras: e.target.value })}
                          placeholder="0,00"
                          className="bg-white/5 border-white/10 text-white text-right ml-auto w-[130px]"
                        />
                      </td>
                      <td className="p-3 text-right text-white/80 font-medium tabular-nums">
                        {formatBRL(totalLinha(c.id))}
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={l.previsao}
                          onChange={(e) => updateLinha(c.id, { previsao: e.target.value })}
                          placeholder="0,00"
                          className="bg-white/5 border-white/10 text-white text-right ml-auto w-[130px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="text"
                          value={l.chavePix}
                          onChange={(e) => updateLinha(c.id, { chavePix: e.target.value })}
                          placeholder="CPF, e-mail, telefone ou aleatória"
                          className="bg-white/5 border-white/10 text-white w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-white/5">
                  <td className="p-3 font-semibold text-white/80 uppercase text-xs">
                    Total do mês
                  </td>
                  <td className="p-3 text-right font-semibold text-white/80 tabular-nums">
                    {formatBRL(totais.salarioBase)}
                  </td>
                  <td className="p-3 text-right font-semibold text-white/80 tabular-nums">
                    {formatBRL(totais.ajudaCusto)}
                  </td>
                  <td className="p-3 text-right font-semibold text-white/80 tabular-nums">
                    {formatBRL(totais.horasExtras)}
                  </td>
                  <td className="p-3 text-right font-bold text-white tabular-nums">
                    {formatBRL(total)}
                  </td>
                  <td className="p-3 text-right font-semibold text-white/80 tabular-nums">
                    {formatBRL(totais.previsao)}
                  </td>
                  <td className="p-3" />
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