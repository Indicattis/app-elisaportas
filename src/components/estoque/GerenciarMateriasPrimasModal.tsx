import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useMateriasPrimas, MateriaPrima } from "@/hooks/useMateriasPrimas";
import { useFornecedores } from "@/hooks/useFornecedores";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNIDADES = ["un", "bobina", "rolo", "kg", "m", "m²", "l", "cx", "pç"];

export function GerenciarMateriasPrimasModal({ open, onOpenChange }: Props) {
  const { materiasPrimas, criar, editar, excluir } = useMateriasPrimas();
  const { fornecedores } = useFornecedores();

  const [editando, setEditando] = useState<MateriaPrima | null>(null);
  const [removerId, setRemoverId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    unidade: "un",
    quantidade: 0,
    custo_unitario: 0,
    fornecedor_id: "",
  });

  const reset = () => {
    setEditando(null);
    setForm({ nome: "", unidade: "un", quantidade: 0, custo_unitario: 0, fornecedor_id: "" });
  };

  const handleEditar = (m: MateriaPrima) => {
    setEditando(m);
    setForm({
      nome: m.nome,
      unidade: m.unidade,
      quantidade: Number(m.quantidade),
      custo_unitario: Number(m.custo_unitario),
      fornecedor_id: m.fornecedor_id || "",
    });
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) return;
    const payload = {
      nome: form.nome.trim(),
      unidade: form.unidade,
      quantidade: form.quantidade,
      custo_unitario: form.custo_unitario,
      fornecedor_id: form.fornecedor_id || null,
    };
    if (editando) {
      await editar({ id: editando.id, ...payload });
    } else {
      await criar(payload);
    }
    reset();
  };

  const handleRemover = async () => {
    if (!removerId) return;
    try {
      await excluir(removerId);
    } finally {
      setRemoverId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Matérias-Primas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulário */}
            <div className="p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold text-sm">
                {editando ? "Editar Matéria-Prima" : "Nova Matéria-Prima"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: Bobina de aço"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={form.unidade}
                    onValueChange={(v) => setForm({ ...form, unidade: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade em estoque</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo unitário (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.custo_unitario}
                    onChange={(e) => setForm({ ...form, custo_unitario: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={form.fornecedor_id || "none"}
                    onValueChange={(v) => setForm({ ...form, fornecedor_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {fornecedores.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editando && (
                  <Button variant="outline" onClick={reset}>Cancelar</Button>
                )}
                <Button onClick={handleSubmit} disabled={!form.nome.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {editando ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </div>

            {/* Lista */}
            <div>
              <h3 className="font-semibold mb-3 text-sm">Cadastradas</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiasPrimas.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell>{m.unidade}</TableCell>
                      <TableCell className="text-right">
                        {Number(m.quantidade).toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(m.custo_unitario).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>{m.fornecedor?.nome || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{m.itens_vinculados ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleEditar(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRemoverId(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {materiasPrimas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma matéria-prima cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removerId} onOpenChange={() => setRemoverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir matéria-prima?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação só pode ser feita se nenhum item do estoque estiver vinculado a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemover}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}