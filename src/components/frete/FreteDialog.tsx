import { useState, useEffect, useMemo } from "react";
import { useFretesCidades, FreteCidade } from "@/hooks/useFretesCidades";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCidadesPorEstado } from "@/utils/estadosCidades";

const ESTADOS_BR = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

interface FreteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frete: FreteCidade | null;
}

export function FreteDialog({ open, onOpenChange, frete }: FreteDialogProps) {
  const { createFrete, updateFrete } = useFretesCidades();
  const isEditing = !!frete;

  const [formData, setFormData] = useState({
    estado: "",
    cidade: "",
    valor_frete: "",
    observacoes: "",
    ativo: true,
    quilometragem: "",
  });

  useEffect(() => {
    if (frete) {
      setFormData({
        estado: frete.estado,
        cidade: frete.cidade,
        valor_frete: frete.valor_frete.toString(),
        observacoes: frete.observacoes || "",
        ativo: frete.ativo,
        quilometragem: frete.quilometragem != null ? frete.quilometragem.toString() : "",
      });
    } else {
      setFormData({
        estado: "",
        cidade: "",
        valor_frete: "",
        observacoes: "",
        ativo: true,
        quilometragem: "",
      });
    }
  }, [frete, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estado || !formData.cidade || !formData.valor_frete) {
      return;
    }

    const data = {
      estado: formData.estado,
      cidade: formData.cidade.trim(),
      valor_frete: parseFloat(formData.valor_frete),
      observacoes: formData.observacoes.trim() || null,
      ativo: formData.ativo,
      quilometragem: formData.quilometragem ? parseFloat(formData.quilometragem) : null,
    };

    try {
      if (isEditing && frete) {
        await updateFrete.mutateAsync({ id: frete.id, ...data });
      } else {
        await createFrete.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatCurrencyInput = (value: string) => {
    // Remove tudo exceto números e ponto
    const cleaned = value.replace(/[^\d.]/g, '');
    return cleaned;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Frete" : "Novo Frete"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value, cidade: "" }))}
              >
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map(estado => (
                    <SelectItem key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Select
                value={formData.cidade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cidade: value }))}
                disabled={!formData.estado}
              >
                <SelectTrigger id="cidade">
                  <SelectValue placeholder={formData.estado ? "Selecione a cidade" : "Selecione o estado primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {getCidadesPorEstado(formData.estado).map(cidade => (
                    <SelectItem key={cidade} value={cidade}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_frete">Valor do Frete (R$) *</Label>
            <Input
              id="valor_frete"
              type="number"
              step="0.01"
              min="1"
              value={formData.valor_frete}
              onChange={(e) => {
                const valor = formatCurrencyInput(e.target.value);
                const km = valor ? (parseFloat(valor) / 6).toFixed(2) : "";
                setFormData(prev => ({
                  ...prev,
                  valor_frete: valor,
                  quilometragem: km,
                }));
              }}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_frete">Valor do Frete (R$)</Label>
            <Input
              id="valor_frete"
              type="number"
              value={formData.valor_frete}
              readOnly
              disabled
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Calculado automaticamente: quilometragem × R$ 6,00
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações opcionais..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Ativo</Label>
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createFrete.isPending || updateFrete.isPending}
            >
              {createFrete.isPending || updateFrete.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
