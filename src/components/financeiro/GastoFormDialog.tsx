import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useGastos, Gasto } from "@/hooks/useGastos";
import { useBancos } from "@/hooks/useBancos";
import { useTiposCustos } from "@/hooks/useTiposCustos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface ColaboradorOption {
  user_id: string;
  nome: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM — used to pre-fill the date when creating */
  defaultMes?: string;
  gasto?: Gasto | null;
  onSaved?: () => void;
  /** When provided, pre-filters tipos by category (UX hint when opening from a section). */
  defaultCategoria?: 'fixa' | 'variavel' | 'imposto';
}

function defaultDateFor(mes?: string) {
  const today = new Date();
  const curMes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (!mes || mes === curMes) return today.toISOString().split("T")[0];
  return `${mes}-01`;
}

export default function GastoFormDialog({ open, onOpenChange, defaultMes, gasto, onSaved, defaultCategoria }: Props) {
  const { gastos, saveGasto, updateGasto } = useGastos(defaultMes);
  const { tiposCustos } = useTiposCustos();
  const { bancos } = useBancos();
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);

  const [tipoCustoId, setTipoCustoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(defaultDateFor(defaultMes));
  const [responsavelId, setResponsavelId] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const tiposAtivos = useMemo(() => {
    const ativos = tiposCustos.filter((t) => t.ativo);
    if (defaultCategoria && !gasto) {
      return ativos.filter((t) => t.tipo === defaultCategoria);
    }
    return ativos;
  }, [tiposCustos, defaultCategoria, gasto]);

  const descricoesUnicas = useMemo(
    () => Array.from(new Set(gastos.map((g) => g.descricao).filter(Boolean))) as string[],
    [gastos],
  );

  const sugestoesFiltradas = useMemo(() => {
    if (descricao.length < 1) return [];
    return descricoesUnicas
      .filter((s) => s.toLowerCase().includes(descricao.toLowerCase()) && s.toLowerCase() !== descricao.toLowerCase())
      .slice(0, 5);
  }, [descricao, descricoesUnicas]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("admin_users")
        .select("user_id, nome, setor")
        .eq("ativo", true)
        .or("setor.eq.administrativo,role.eq.diretor")
        .order("nome");
      if (!cancelled) setColaboradores((data || []) as ColaboradorOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset form when dialog opens or when editing target changes
  useEffect(() => {
    if (!open) return;
    if (gasto) {
      setTipoCustoId(gasto.tipo_custo_id);
      setDescricao(gasto.descricao || "");
      setValor(String(gasto.valor));
      setData(gasto.data);
      setResponsavelId(gasto.responsavel_id);
      setBancoId(gasto.banco_id || "");
      setObservacoes(gasto.observacoes || "");
    } else {
      setTipoCustoId("");
      setDescricao("");
      setValor("");
      setData(defaultDateFor(defaultMes));
      setResponsavelId("");
      setBancoId("");
      setObservacoes("");
    }
  }, [open, gasto, defaultMes]);

  const handleTipoCustoChange = (id: string) => {
    setTipoCustoId(id);
    if (!gasto) {
      const tipo = tiposCustos.find((t) => t.id === id);
      if (tipo?.descricao) setDescricao(tipo.descricao);
    }
  };

  const handleSave = async () => {
    if (!tipoCustoId || !valor || !responsavelId || !bancoId) return;
    setSaving(true);
    const payload = {
      tipo_custo_id: tipoCustoId,
      descricao: descricao || null,
      valor: parseFloat(valor),
      data,
      responsavel_id: responsavelId,
      banco_id: bancoId,
      status: "pago",
      observacoes: observacoes || null,
    };
    const ok = gasto
      ? await updateGasto(gasto.id, payload)
      : await saveGasto(payload);
    setSaving(false);
    if (ok) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#111] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {gasto ? "Editar Gasto" : "Novo Gasto"}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {gasto ? "Atualize as informações do gasto." : "Preencha os dados para registrar um novo gasto."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/80 text-sm">Tipo de Custo *</Label>
            <Select value={tipoCustoId} onValueChange={handleTipoCustoChange}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Selecione o tipo de custo" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                {tiposAtivos.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/10">
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Label className="text-white/80 text-sm">Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => { setDescricao(e.target.value); setShowSugestoes(true); }}
              onFocus={() => setShowSugestoes(true)}
              onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
              placeholder="Descrição do gasto"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              autoComplete="off"
            />
            {showSugestoes && sugestoesFiltradas.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-md overflow-hidden shadow-lg">
                {sugestoesFiltradas.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setDescricao(s); setShowSugestoes(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80 text-sm">Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Data *</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-white/80 text-sm">Responsável pelo Pagamento *</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                {colaboradores.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id} className="text-white hover:bg-white/10">
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80 text-sm">Banco *</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                {bancos.filter(b => b.ativo).map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-white hover:bg-white/10">
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80 text-sm">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações opcionais"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !tipoCustoId || !valor || !responsavelId || !bancoId}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}