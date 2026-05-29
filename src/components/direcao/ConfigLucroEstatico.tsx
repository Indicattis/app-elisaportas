import { useEffect, useState } from "react";
import { Info, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfigLucro, type ConfigLucroTipo } from "@/hooks/useConfigLucro";

interface Props {
  tipo: ConfigLucroTipo;
  contextoLabel: string;
}

export function ConfigLucroEstatico({ tipo, contextoLabel }: Props) {
  const { toast } = useToast();
  const { data, isLoading, save } = useConfigLucro(tipo);
  const [custoStr, setCustoStr] = useState<string>("");

  useEffect(() => {
    if (data) setCustoStr(String(data.percentual_custo));
  }, [data?.percentual_custo]);

  const custoNum = parseFloat(custoStr.replace(",", "."));
  const valido = !Number.isNaN(custoNum) && custoNum >= 0 && custoNum <= 100;
  const lucroPct = valido ? Math.round((100 - custoNum) * 10) / 10 : 0;
  const exemploValor = 1000;
  const exemploCusto = valido ? (exemploValor * custoNum) / 100 : 0;
  const exemploLucro = valido ? exemploValor - exemploCusto : 0;

  const handleSave = async () => {
    if (!valido) {
      toast({ title: "Valor inválido", description: "Informe um % entre 0 e 100.", variant: "destructive" });
      return;
    }
    const rounded = Math.round(custoNum * 10) / 10;
    try {
      await save.mutateAsync(rounded);
      toast({ title: "Configuração salva", description: `Custo ${rounded}% / Lucro ${(100 - rounded).toFixed(1)}%` });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message || "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Modo de cálculo */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="text-sm text-white/80 font-medium">Modo de cálculo</div>
        <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="h-8 w-8 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Check className="h-4 w-4 text-blue-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-medium">Estático (% de custo fixa)</div>
            <div className="text-xs text-white/60">
              Você informa a % de custo. O lucro é calculado automaticamente como (100% − custo%) × valor total.
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-blue-300">Padrão</div>
        </div>
        <div className="text-[11px] text-white/40">
          Outros modos de cálculo (por dimensão, por faixa de valor) poderão ser adicionados no futuro.
        </div>
      </div>

      {/* Configuração estática */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4">
        <div className="text-sm text-white/80 font-medium">Configuração estática</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/60">% de custo</label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.1}
                value={custoStr}
                onChange={(e) => setCustoStr(e.target.value)}
                disabled={isLoading}
                className="bg-white/5 border-white/10 text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">%</span>
            </div>
            <div className="text-[11px] text-white/40">Valor entre 0 e 100. Aceita 1 casa decimal.</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/60">% de lucro (calculada)</label>
            <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white font-mono text-sm">
              {valido ? `${lucroPct.toFixed(1)}%` : "—"}
            </div>
            <div className="text-[11px] text-white/40">lucro% = 100% − custo%</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!valido || save.isPending || isLoading}
            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar configuração
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="text-sm text-white/80 font-medium">Pré-visualização</div>
        <div className="text-xs text-white/60">
          Para um item de {contextoLabel} no valor de <span className="text-white">R$ 1.000,00</span>:
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Custo</div>
            <div className="text-white font-mono text-base">
              R$ {exemploCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-300/70">Lucro</div>
            <div className="text-emerald-200 font-mono text-base">
              R$ {exemploLucro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-white/70">
          A nova configuração é aplicada apenas a faturamentos realizados a partir do momento em que for salva.
          Vendas já faturadas mantêm os valores originais.
        </div>
      </div>
    </div>
  );
}