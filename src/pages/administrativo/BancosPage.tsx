import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Landmark } from "lucide-react";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { useBancos, type BancoFormData, type Banco } from "@/hooks/useBancos";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const emptyForm: BancoFormData = {
  nome: "",
  codigo: "",
  agencia: "",
  conta: "",
  tipo_conta: "corrente",
  observacoes: "",
  ativo: true,
};

export default function BancosPage() {
  const navigate = useNavigate();
  const { bancos, isLoading, criarBanco, editarBanco, excluirBanco } = useBancos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Banco | null>(null);
  const [form, setForm] = useState<BancoFormData>(emptyForm);

  const openNew = () => {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (banco: Banco) => {
    setEditando(banco);
    setForm({
      nome: banco.nome,
      codigo: banco.codigo ?? "",
      agencia: banco.agencia ?? "",
      conta: banco.conta ?? "",
      tipo_conta: banco.tipo_conta ?? "corrente",
      observacoes: banco.observacoes ?? "",
      ativo: banco.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    if (editando) {
      editarBanco.mutate({ id: editando.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      criarBanco.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Bancos" },
        ]}
        mounted
      />
      <button
        onClick={() => navigate("/administrativo/financeiro")}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              <Landmark className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-semibold">Bancos</h1>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Novo Banco
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-white/50 text-sm">Carregando...</div>
          ) : bancos.length === 0 ? (
            <div className="p-8 text-center text-white/50 text-sm">Nenhum banco cadastrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Nome</TableHead>
                  <TableHead className="text-white/60">Código</TableHead>
                  <TableHead className="text-white/60">Agência</TableHead>
                  <TableHead className="text-white/60">Conta</TableHead>
                  <TableHead className="text-white/60">Tipo</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bancos.map((b) => (
                  <TableRow key={b.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    <TableCell className="text-white/70">{b.codigo || "—"}</TableCell>
                    <TableCell className="text-white/70">{b.agencia || "—"}</TableCell>
                    <TableCell className="text-white/70">{b.conta || "—"}</TableCell>
                    <TableCell className="text-white/70 capitalize">{b.tipo_conta || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {b.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <Pencil className="w-4 h-4 text-white/60" />
                        </button>
                        <button onClick={() => excluirBanco.mutate(b.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400/60" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Banco" : "Novo Banco"}</DialogTitle>
            <DialogDescription className="text-white/50">
              {editando ? "Atualize os dados do banco." : "Preencha os dados do novo banco."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/70">Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Ex: Banco do Brasil"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70">Código</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Ex: 001"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Agência</Label>
                <Input
                  value={form.agencia}
                  onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Ex: 1234-5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70">Conta</Label>
                <Input
                  value={form.conta}
                  onChange={(e) => setForm({ ...form, conta: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Ex: 12345-6"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Tipo</Label>
                <select
                  value={form.tipo_conta}
                  onChange={(e) => setForm({ ...form, tipo_conta: e.target.value })}
                  className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                >
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                className="bg-white/5 border-white/10 text-white min-h-[60px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white/70">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.nome.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {editando ? "Salvar" : "Cadastrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
