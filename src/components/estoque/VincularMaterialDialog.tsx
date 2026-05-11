import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link2, Trash2, Save, Plus } from "lucide-react";
import type { MateriaPrima } from "@/hooks/useMateriasPrimas";

interface Props {
  materiaPrima: MateriaPrima | null;
  onOpenChange: (open: boolean) => void;
}

interface EstoqueItem {
  id: string;
  nome_produto: string;
  unidade: string;
  materia_prima_id: string | null;
  materia_prima_conversao: number | null;
}

export function VincularMaterialDialog({ materiaPrima, onOpenChange }: Props) {
  const open = !!materiaPrima;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [novoMaterialId, setNovoMaterialId] = useState<string>("");
  const [novoConversao, setNovoConversao] = useState<number>(0);
  const [edits, setEdits] = useState<Record<string, number>>({});

  // Lista todos os materiais ativos do estoque
  const { data: estoqueItens = [] } = useQuery({
    queryKey: ["estoque-min-link"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque")
        .select("id, nome_produto, unidade, materia_prima_id, materia_prima_conversao")
        .eq("ativo", true)
        .order("nome_produto");
      if (error) throw error;
      return (data || []) as EstoqueItem[];
    },
  });

  const vinculados = useMemo(
    () => estoqueItens.filter((e) => e.materia_prima_id === materiaPrima?.id),
    [estoqueItens, materiaPrima?.id]
  );
  const disponiveis = useMemo(
    () => estoqueItens.filter((e) => !e.materia_prima_id),
    [estoqueItens]
  );

  useEffect(() => {
    if (open) {
      setNovoMaterialId("");
      setNovoConversao(0);
      setEdits({});
    }
  }, [open, materiaPrima?.id]);

  const vincular = useMutation({
    mutationFn: async () => {
      if (!novoMaterialId || !materiaPrima) return;
      const { error } = await supabase
        .from("estoque")
        .update({
          materia_prima_id: materiaPrima.id,
          materia_prima_conversao: novoConversao || null,
        })
        .eq("id", novoMaterialId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque-min-link"] });
      qc.invalidateQueries({ queryKey: ["materias-primas"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      setNovoMaterialId("");
      setNovoConversao(0);
      toast({ title: "Material vinculado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const salvarConversao = useMutation({
    mutationFn: async ({ id, conversao }: { id: string; conversao: number }) => {
      const { error } = await supabase
        .from("estoque")
        .update({ materia_prima_conversao: conversao || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["estoque-min-link"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      setEdits((p) => {
        const n = { ...p };
        delete n[vars.id];
        return n;
      });
      toast({ title: "Conversão atualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const desvincular = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estoque")
        .update({ materia_prima_id: null, materia_prima_conversao: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estoque-min-link"] });
      qc.invalidateQueries({ queryKey: ["materias-primas"] });
      qc.invalidateQueries({ queryKey: ["estoque"] });
      toast({ title: "Material desvinculado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!materiaPrima) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular materiais — {materiaPrima.nome}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Informe quantos {""}
            <span className="font-medium">(unidade do material)</span> são
            produzidos a partir de <span className="font-medium">1 {materiaPrima.unidade}</span>{" "}
            desta matéria-prima.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Novo vínculo */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-medium">Novo vínculo</div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <Label>Material</Label>
                <Select value={novoMaterialId} onValueChange={setNovoMaterialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um material" />
                  </SelectTrigger>
                  <SelectContent>
                    {disponiveis.length === 0 && (
                      <SelectItem value="__none" disabled>
                        Nenhum material disponível
                      </SelectItem>
                    )}
                    {disponiveis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome_produto} ({m.unidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Qtd produzida por 1 {materiaPrima.unidade}
                  {novoMaterialId && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({disponiveis.find((d) => d.id === novoMaterialId)?.unidade})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={novoConversao}
                  onChange={(e) => setNovoConversao(Number(e.target.value))}
                />
              </div>
              <Button
                onClick={() => vincular.mutate()}
                disabled={!novoMaterialId || novoConversao <= 0 || vincular.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Vincular
              </Button>
            </div>
          </div>

          {/* Vinculados */}
          <div>
            <div className="text-sm font-medium mb-2">
              Materiais vinculados ({vinculados.length})
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">
                      Qtd por 1 {materiaPrima.unidade}
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculados.map((v) => {
                    const current =
                      edits[v.id] ?? Number(v.materia_prima_conversao ?? 0);
                    const changed =
                      edits[v.id] !== undefined &&
                      edits[v.id] !== Number(v.materia_prima_conversao ?? 0);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.nome_produto}</TableCell>
                        <TableCell>{v.unidade}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={current}
                            onChange={(e) =>
                              setEdits((p) => ({
                                ...p,
                                [v.id]: Number(e.target.value),
                              }))
                            }
                            className="h-8 w-32 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!changed || salvarConversao.isPending}
                              onClick={() =>
                                salvarConversao.mutate({
                                  id: v.id,
                                  conversao: current,
                                })
                              }
                              title="Salvar conversão"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => desvincular.mutate(v.id)}
                              title="Desvincular"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {vinculados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Nenhum material vinculado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}