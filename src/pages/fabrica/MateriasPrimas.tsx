import { useState, useMemo } from "react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Search, Package, Link2 } from "lucide-react";
import { useMateriasPrimas, MateriaPrima } from "@/hooks/useMateriasPrimas";
import { useFornecedores } from "@/hooks/useFornecedores";
import { VincularMaterialDialog } from "@/components/estoque/VincularMaterialDialog";

const UNIDADES = ["un", "bobina", "rolo", "kg", "m", "m²", "l", "cx", "pç"];

const emptyForm = {
  nome: "",
  unidade: "un",
  quantidade: 0,
  custo_unitario: 0,
  fornecedor_id: "",
};

export default function MateriasPrimasPage() {
  const { materiasPrimas, criar, editar, excluir } = useMateriasPrimas();
  const { fornecedores } = useFornecedores();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<MateriaPrima | null>(null);
  const [removerId, setRemoverId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vincularMP, setVincularMP] = useState<MateriaPrima | null>(null);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materiasPrimas;
    return materiasPrimas.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materiasPrimas, search]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const abrirEditar = (m: MateriaPrima) => {
    setEditando(m);
    setForm({
      nome: m.nome,
      unidade: m.unidade,
      quantidade: Number(m.quantidade),
      custo_unitario: Number(m.custo_unitario),
      fornecedor_id: m.fornecedor_id || "",
    });
    setDialogOpen(true);
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
    setDialogOpen(false);
    setEditando(null);
    setForm(emptyForm);
  };

  const handleRemover = async () => {
    if (!removerId) return;
    try {
      await excluir(removerId);
    } finally {
      setRemoverId(null);
    }
  };

  const headerActions = (
    <button
      onClick={abrirNovo}
      className="h-10 px-5 rounded-lg font-medium text-white border
                 bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400/30
                 shadow-lg shadow-blue-500/30
                 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40
                 transition-all duration-200 flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Nova
    </button>
  );

  const totalEstoque = materiasPrimas.reduce(
    (acc, m) => acc + Number(m.quantidade) * Number(m.custo_unitario),
    0
  );

  return (
    <MinimalistLayout
      title="Matérias-Primas"
      subtitle="Gestão de insumos e materiais"
      backPath="/fabrica/produtos"
      headerActions={headerActions}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Fábrica", path: "/fabrica" },
        { label: "Produtos", path: "/fabrica/produtos" },
        { label: "Matérias-Primas" },
      ]}
    >
      <div className="space-y-4">
        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <Package className="w-4 h-4" /> Itens cadastrados
            </div>
            <div className="text-2xl font-semibold text-white mt-1">
              {materiasPrimas.length}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <div className="text-white/60 text-xs">Valor total em estoque</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {totalEstoque.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <div className="text-white/60 text-xs">Vinculados a produtos</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {materiasPrimas.reduce(
                (acc, m) => acc + (m.itens_vinculados ?? 0),
                0
              )}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar matéria-prima por nome..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/70">Nome</TableHead>
                <TableHead className="text-white/70">Unidade</TableHead>
                <TableHead className="text-right text-white/70">Estoque</TableHead>
                <TableHead className="text-right text-white/70">Custo</TableHead>
                <TableHead className="text-white/70">Fornecedor</TableHead>
                <TableHead className="text-center text-white/70">Itens</TableHead>
                <TableHead className="text-right text-white/70">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((m) => (
                <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{m.nome}</TableCell>
                  <TableCell className="text-white/80">{m.unidade}</TableCell>
                  <TableCell className="text-right text-white/80">
                    {Number(m.quantidade).toLocaleString("pt-BR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-white/80">
                    {Number(m.custo_unitario).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {m.fornecedor?.nome || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{m.itens_vinculados ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                        title="Vincular materiais"
                        onClick={() => setVincularMP(m)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                        onClick={() => abrirEditar(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-white/10"
                        onClick={() => setRemoverId(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center text-white/50 py-10">
                    Nenhuma matéria-prima encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setEditando(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editando ? "Editar Matéria-Prima" : "Nova Matéria-Prima"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 md:col-span-2">
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
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
                onChange={(e) =>
                  setForm({ ...form, quantidade: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Custo unitário (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.custo_unitario}
                onChange={(e) =>
                  setForm({ ...form, custo_unitario: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={form.fornecedor_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, fornecedor_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {fornecedores.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.nome.trim()}>
              {editando ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
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

      <VincularMaterialDialog
        materiaPrima={vincularMP}
        onOpenChange={(open) => !open && setVincularMP(null)}
      />
    </MinimalistLayout>
  );
}