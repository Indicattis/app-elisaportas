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
import { calcularValorFreteInterno } from "@/utils/freteInterno";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
    observacoes: "",
    ativo: true,
    quilometragem: "",
    valor_frete: "",
  });
  const [valorManual, setValorManual] = useState(false);
  const [cidadeOpen, setCidadeOpen] = useState(false);
  const [cidadeBusca, setCidadeBusca] = useState("");

  const cidadesOptions = useMemo(() => {
    const lista = getCidadesPorEstado(formData.estado);
    if (formData.cidade && !lista.includes(formData.cidade)) {
      return [formData.cidade, ...lista];
    }
    return lista;
  }, [formData.estado, formData.cidade]);

  const buscaLimpa = cidadeBusca.trim();
  const podeAdicionar =
    buscaLimpa.length > 1 &&
    !cidadesOptions.some(c => c.toLowerCase() === buscaLimpa.toLowerCase());

  useEffect(() => {
    if (frete) {
      const km = frete.quilometragem ?? 0;
      const calculado = calcularValorFreteInterno(km);
      setFormData({
        estado: frete.estado,
        cidade: frete.cidade,
        observacoes: frete.observacoes || "",
        ativo: frete.ativo,
        quilometragem: frete.quilometragem != null ? frete.quilometragem.toString() : "",
        valor_frete: frete.valor_frete != null ? frete.valor_frete.toString() : "",
      });
      setValorManual(
        frete.valor_frete != null && Math.abs(Number(frete.valor_frete) - calculado) > 0.009,
      );
    } else {
      setFormData({
        estado: "",
        cidade: "",
        observacoes: "",
        ativo: true,
        quilometragem: "",
        valor_frete: "",
      });
      setValorManual(false);
    }
  }, [frete, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estado || !formData.cidade || !formData.quilometragem) {
      return;
    }

    const km = parseFloat(formData.quilometragem);
    const valorDigitado = parseFloat(formData.valor_frete);
    const data = {
      estado: formData.estado,
      cidade: formData.cidade.trim(),
      valor_frete:
        valorManual && !isNaN(valorDigitado)
          ? valorDigitado
          : calcularValorFreteInterno(isNaN(km) ? 0 : km),
      observacoes: formData.observacoes.trim() || null,
      ativo: formData.ativo,
      quilometragem: isNaN(km) ? null : km,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-black/90 border-white/10 backdrop-blur-xl text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? "Editar Frete" : "Novo Frete"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-white/80">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    estado: value,
                    cidade: value === prev.estado ? prev.cidade : "",
                  }))
                }
              >
                <SelectTrigger id="estado" className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white">
                  {ESTADOS_BR.map(estado => (
                    <SelectItem key={estado.sigla} value={estado.sigla} className="text-white focus:bg-white/10 focus:text-white">
                      {estado.sigla} - {estado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-white/80">Cidade *</Label>
              <Popover open={cidadeOpen} onOpenChange={(o) => { setCidadeOpen(o); if (!o) setCidadeBusca(""); }}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    id="cidade"
                    variant="outline"
                    disabled={!formData.estado}
                    className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white disabled:opacity-50 font-normal"
                  >
                    <span className={cn("truncate", !formData.cidade && "text-white/40")}>
                      {formData.cidade || (formData.estado ? "Selecione ou digite" : "Selecione o estado primeiro")}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] bg-black/90 border-white/10 backdrop-blur-xl text-white z-50">
                  <Command className="bg-transparent">
                    <CommandInput
                      placeholder="Buscar ou digitar cidade..."
                      value={cidadeBusca}
                      onValueChange={setCidadeBusca}
                      className="text-white"
                    />
                    <CommandList className="max-h-60">
                      {podeAdicionar && (
                        <CommandGroup>
                          <CommandItem
                            value={`__add__${buscaLimpa}`}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, cidade: buscaLimpa }));
                              setCidadeOpen(false);
                              setCidadeBusca("");
                            }}
                            className="text-white aria-selected:bg-white/10"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Usar "{buscaLimpa}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                      <CommandEmpty className="py-4 text-center text-sm text-white/50">
                        Digite o nome para adicionar manualmente.
                      </CommandEmpty>
                      <CommandGroup>
                        {cidadesOptions.map(cidade => (
                          <CommandItem
                            key={cidade}
                            value={cidade}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, cidade }));
                              setCidadeOpen(false);
                              setCidadeBusca("");
                            }}
                            className="text-white aria-selected:bg-white/10"
                          >
                            <Check className={cn("h-4 w-4 mr-2", formData.cidade === cidade ? "opacity-100" : "opacity-0")} />
                            {cidade}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-white/50">
                Distritos/localidades fora da lista do IBGE (ex.: Cassino) podem ser digitados manualmente.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quilometragem" className="text-white/80">Km (ida) *</Label>
            <Input
              id="quilometragem"
              type="number"
              step="0.01"
              min="0"
              value={formData.quilometragem}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, quilometragem: e.target.value }))
              }
              placeholder="0.00"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <p className="text-xs text-white/50">
              Ida e volta = km × 2 · Valor = km × 6, mínimo R$ 750,00 (R$ {calcularValorFreteInterno(parseFloat(formData.quilometragem)).toFixed(2)})
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="valor_frete" className="text-white/80">Valor manual (R$)</Label>
              <Switch
                id="valor_manual"
                checked={valorManual}
                onCheckedChange={(checked) => {
                  setValorManual(checked);
                  if (checked && !formData.valor_frete) {
                    setFormData(prev => ({
                      ...prev,
                      valor_frete: calcularValorFreteInterno(parseFloat(prev.quilometragem)).toFixed(2),
                    }));
                  }
                }}
              />
            </div>
            <Input
              id="valor_frete"
              type="number"
              step="0.01"
              min="0"
              disabled={!valorManual}
              value={
                valorManual
                  ? formData.valor_frete
                  : calcularValorFreteInterno(parseFloat(formData.quilometragem)).toFixed(2)
              }
              onChange={(e) => setFormData(prev => ({ ...prev, valor_frete: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 disabled:opacity-60"
            />
            <p className="text-xs text-white/50">
              Ative para definir um valor livre, ignorando o cálculo e o mínimo de R$ 750,00.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-white/80">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações opcionais..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo" className="text-white/80">Ativo</Label>
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
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
