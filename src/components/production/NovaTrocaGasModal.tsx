import { useState } from "react";
import { Fuel } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NovaTrocaGasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { valor: number; observacoes?: string }) => void;
  isLoading?: boolean;
}

export function NovaTrocaGasModal({ open, onOpenChange, onConfirm, isLoading }: NovaTrocaGasModalProps) {
  const [valor, setValor] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const now = new Date();
  const dataFormatada = format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const horaFormatada = format(now, "HH:mm", { locale: ptBR });

  const parsed = Number(valor.replace(",", "."));
  const valorValido = !Number.isNaN(parsed) && parsed > 0;

  const handleConfirm = () => {
    if (!valorValido) return;
    onConfirm({ valor: parsed, observacoes: observacoes.trim() || undefined });
    setValor("");
    setObservacoes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setValor(""); setObservacoes(""); } onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Fuel className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle>Registrar Troca de Gás</DialogTitle>
          </div>
          <DialogDescription>
            Informe o valor da troca de gás do forno de pintura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="text-sm font-semibold">{dataFormatada}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horário</p>
              <p className="text-sm font-semibold">{horaFormatada}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor da troca (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Textarea
              id="obs"
              placeholder="Ex.: fornecedor, nº cilindro, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !valorValido}>
            {isLoading ? "Registrando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}