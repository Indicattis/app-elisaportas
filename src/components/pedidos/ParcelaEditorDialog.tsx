import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParcelaEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  parcela?: any | null;
  proximoNumero: number;
  onSaved: () => void;
}

const METODOS = [
  { value: "boleto", label: "Boleto" },
  { value: "a_vista", label: "À Vista (PIX, Débito)" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "dinheiro", label: "Dinheiro" },
];

export function ParcelaEditorDialog({ open, onOpenChange, vendaId, parcela, proximoNumero, onSaved }: ParcelaEditorDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    numero_parcela: proximoNumero,
    valor_parcela: 0,
    data_vencimento: "",
    metodo_pagamento: "",
    status: "pendente",
    valor_pago: 0,
    data_pagamento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        numero_parcela: parcela?.numero_parcela ?? proximoNumero,
        valor_parcela: Number(parcela?.valor_parcela ?? 0),
        data_vencimento: parcela?.data_vencimento ?? "",
        metodo_pagamento: parcela?.metodo_pagamento ?? "",
        status: parcela?.status ?? "pendente",
        valor_pago: Number(parcela?.valor_pago ?? 0),
        data_pagamento: parcela?.data_pagamento ?? "",
        observacoes: parcela?.observacoes ?? "",
      });
    }
  }, [open, parcela, proximoNumero]);

  const handleSave = async () => {
    if (!form.data_vencimento) {
      toast({ title: "Data de vencimento obrigatória", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        venda_id: vendaId,
        numero_parcela: form.numero_parcela,
        valor_parcela: form.valor_parcela,
        data_vencimento: form.data_vencimento,
        metodo_pagamento: form.metodo_pagamento || null,
        status: form.status,
        valor_pago: form.status === "pago" ? (form.valor_pago || form.valor_parcela) : 0,
        data_pagamento: form.status === "pago" ? (form.data_pagamento || null) : null,
        observacoes: form.observacoes || null,
      };
      if (parcela?.id) {
        const { error } = await supabase.from("contas_receber").update(payload).eq("id", parcela.id);
        if (error) throw error;
        toast({ title: "Parcela atualizada" });
      } else {
        const { error } = await supabase.from("contas_receber").insert(payload);
        if (error) throw error;
        toast({ title: "Parcela criada" });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{parcela ? "Editar parcela" : "Nova parcela"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-white/60">Nº Parcela</Label>
              <Input
                type="number"
                value={form.numero_parcela}
                onChange={(e) => setForm({ ...form, numero_parcela: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="text-xs text-white/60">Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_parcela}
                onChange={(e) => setForm({ ...form, valor_parcela: Number(e.target.value) })}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-white/60">Vencimento</Label>
            <Input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <Label className="text-xs text-white/60">Método</Label>
            <Select value={form.metodo_pagamento} onValueChange={(v) => setForm({ ...form, metodo_pagamento: v })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-white/60">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.status === "pago" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/60">Valor Pago</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_pago}
                  onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-xs text-white/60">Data Pagamento</Label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs text-white/60">Observações</Label>
            <Input
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}