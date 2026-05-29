import { useEffect, useState } from "react";
import { Info, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useConfigLucro,
  type ConfigLucroTipo,
  type ConfigLucroModo,
} from "@/hooks/useConfigLucro";

interface Props {
  tipo: ConfigLucroTipo;
  contextoLabel: string;
  /** Modos disponíveis nesta tela. Default: apenas estático. */
  modosDisponiveis?: ConfigLucroModo[];
}

const MODO_INFO: Record<ConfigLucroModo, { label: string; descricao: string }> = {
  estatico: {
    label: "Estático (% de custo fixa)",
    descricao:
      "Você informa a % de custo. O lucro é calculado automaticamente como (100% − custo%) × valor total.",
  },
  formula_dimensao: {
    label: "Fórmula por dimensão (Epóxi clássica)",
    descricao:
      "Lucro = (altura × largura) × valor por m². O custo é o que sobra do valor total da venda.",
  },
};

export function ConfigLucroEstatico({
  tipo,
  contextoLabel,
  modosDisponiveis = ["estatico"],
}: Props) {
  const { toast } = useToast();
  const { data, isLoading, save } = useConfigLucro(tipo);

  const [modo, setModo] = useState<ConfigLucroModo>("estatico");
  const [custoStr, setCustoStr] = useState<string>("");
  const [valorM2Str, setValorM2Str] = useState<string>("25");
  const [openModo, setOpenModo] = useState<ConfigLucroModo | null>(null);

  useEffect(() => {
    if (!data) return;
    setModo(modosDisponiveis.includes(data.modo) ? data.modo : modosDisponiveis[0]);
    setCustoStr(String(data.percentual_custo));
    const v = Number(data.parametros?.valor_m2);
    setValorM2Str(String(Number.isFinite(v) && v > 0 ? v : 25));
  }, [data?.modo, data?.percentual_custo, data?.parametros]);

  const custoNum = parseFloat(custoStr.replace(",", "."));
  const custoValido = !Number.isNaN(custoNum) && custoNum >= 0 && custoNum <= 100;
  const lucroPct = custoValido ? Math.round((100 - custoNum) * 10) / 10 : 0;

  const valorM2Num = parseFloat(valorM2Str.replace(",", "."));
  const valorM2Valido = !Number.isNaN(valorM2Num) && valorM2Num > 0;

  const exemploValor = 1000;
  const exemploCusto = custoValido ? (exemploValor * custoNum) / 100 : 0;
  const exemploLucro = custoValido ? exemploValor - exemploCusto : 0;

  const exemploAltura = 3;
  const exemploLargura = 2.5;
  const exemploLucroFormula = valorM2Valido
    ? exemploAltura * exemploLargura * valorM2Num
    : 0;

  const handleSave = async () => {
    const alvo = openModo ?? modo;
    if (alvo === "estatico") {
      if (!custoValido) {
        toast({ title: "Valor inválido", description: "Informe um % entre 0 e 100.", variant: "destructive" });
        return;
      }
      const rounded = Math.round(custoNum * 10) / 10;
      try {
        await save.mutateAsync({
          modo: "estatico",
          percentual_custo: rounded,
          parametros: data?.parametros ?? {},
        });
        toast({ title: "Configuração salva", description: `Custo ${rounded}% / Lucro ${(100 - rounded).toFixed(1)}%` });
        setOpenModo(null);
      } catch (e: any) {
        toast({ title: "Erro ao salvar", description: e?.message || "", variant: "destructive" });
      }
      return;
    }

    if (alvo === "formula_dimensao") {
      if (!valorM2Valido) {
        toast({ title: "Valor inválido", description: "Informe um valor por m² maior que zero.", variant: "destructive" });
        return;
      }
      const rounded = Math.round(valorM2Num * 100) / 100;
      try {
        await save.mutateAsync({
          modo: "formula_dimensao",
          percentual_custo: data?.percentual_custo ?? 60,
          parametros: { ...(data?.parametros ?? {}), valor_m2: rounded },
        });
        toast({
          title: "Configuração salva",
          description: `Fórmula ativa: lucro = altura × largura × R$ ${rounded.toFixed(2)}`,
        });
        setOpenModo(null);
      } catch (e: any) {
        toast({ title: "Erro ao salvar", description: e?.message || "", variant: "destructive" });
      }
    }
  };

  const modoAlvo = openModo ?? modo;
  const podeSalvar =
    (modoAlvo === "estatico" && custoValido) ||
    (modoAlvo === "formula_dimensao" && valorM2Valido);

  return (
    <div className="space-y-4">
      {/* Modo de cálculo */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="text-sm text-white/80 font-medium">Modo de cálculo</div>
        <div className="text-[11px] text-white/50">Clique em um modo para configurar.</div>
        <div className="space-y-2">
          {modosDisponiveis.map((m) => {
            const ativo = modo === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setOpenModo(m)}
                className={
                  "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors " +
                  (ativo
                    ? "border-blue-500/30 bg-blue-500/5"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]")
                }
              >
                <div
                  className={
                    "h-8 w-8 rounded-md border flex items-center justify-center " +
                    (ativo
                      ? "bg-blue-500/20 border-blue-500/30"
                      : "bg-white/5 border-white/10")
                  }
                >
                  {ativo ? <Check className="h-4 w-4 text-blue-300" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium">{MODO_INFO[m].label}</div>
                  <div className="text-xs text-white/60">{MODO_INFO[m].descricao}</div>
                </div>
                {ativo ? (
                  <div className="text-[10px] uppercase tracking-wide text-blue-300">Ativo</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-white/70">
          A nova configuração é aplicada apenas a faturamentos realizados a partir do momento em que for salva.
          Vendas já faturadas mantêm os valores originais.
        </div>
      </div>

      <Dialog open={openModo !== null} onOpenChange={(o) => !o && setOpenModo(null)}>
        <DialogContent className="bg-slate-950/95 border-white/10 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>
              Configuração — {MODO_INFO[modoAlvo].label}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {MODO_INFO[modoAlvo].descricao}
            </DialogDescription>
          </DialogHeader>

          {modoAlvo === "estatico" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  {custoValido ? `${lucroPct.toFixed(1)}%` : "—"}
                </div>
                <div className="text-[11px] text-white/40">lucro% = 100% − custo%</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-white/60">Valor por m² (R$)</label>
                <div className="relative max-w-[240px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">R$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={valorM2Str}
                    onChange={(e) => setValorM2Str(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white pl-9"
                  />
                </div>
                <div className="text-[11px] text-white/40">Padrão histórico: R$ 25,00.</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-white/50">Fórmula</div>
                <div className="font-mono text-sm text-blue-300">
                  lucro = (altura × largura) × R$ {valorM2Valido ? valorM2Num.toFixed(2) : "?"}
                </div>
                <div className="font-mono text-sm text-white/70">custo = valor_total − lucro</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpenModo(null)}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!podeSalvar || save.isPending || isLoading}
              className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}