import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Coins, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTiposCustos, TipoCusto } from "@/hooks/useTiposCustos";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function CustosMinimalista() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const {
    tiposCustos, loading,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
  } = useTiposCustos();

  const [searchTerm, setSearchTerm] = useState("");
  const [tipoCustoDialog, setTipoCustoDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string } | null>(null);
  const [editingTipoCusto, setEditingTipoCusto] = useState<TipoCusto | null>(null);

  const [tipoCustoForm, setTipoCustoForm] = useState({
    nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa" as 'fixa' | 'variavel',
  });

  useEffect(() => { const timer = setTimeout(() => setMounted(true), 100); return () => clearTimeout(timer); }, []);

  const totalTipos = tiposCustos.length;
  const totalLimiteMensal = tiposCustos.reduce((acc, t) => acc + t.valor_maximo_mensal, 0);

  const filteredTiposCustos = tiposCustos.filter(t =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || t.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveTipoCusto = async () => {
    const success = editingTipoCusto ? await updateTipoCusto(editingTipoCusto.id, tipoCustoForm) : await saveTipoCusto(tipoCustoForm);
    if (success) { setTipoCustoDialog(false); resetTipoCustoForm(); }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    const success = await deleteTipoCusto(deleteDialog.id);
    if (success) setDeleteDialog(null);
  };

  const handleEditTipoCusto = (tipo: TipoCusto) => {
    setEditingTipoCusto(tipo);
    setTipoCustoForm({ nome: tipo.nome, descricao: tipo.descricao || "", valor_maximo_mensal: tipo.valor_maximo_mensal, tipo: tipo.tipo });
    setTipoCustoDialog(true);
  };

  const resetTipoCustoForm = () => {
    setEditingTipoCusto(null);
    setTipoCustoForm({ nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 bg-white/10" />
          <Skeleton className="h-24 bg-white/10" />
        </div>
        <Skeleton className="h-96 bg-white/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb items={[{ label: "Home", path: "/home" }, { label: "Administrativo", path: "/administrativo" }, { label: "Financeiro", path: "/administrativo/financeiro" }, { label: "Custos" }]} mounted={mounted} />
      <button onClick={() => navigate('/administrativo/financeiro')} className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms' }}>
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20"><ArrowLeft className="w-5 h-5" strokeWidth={1.5} /></div>
      </button>

      <div className="container mx-auto p-6 pt-20 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tipos de Custos</h1>
            <p className="text-white/60">Cadastre os tipos de custos da empresa com limites mensais</p>
          </div>
          <Button onClick={() => setTipoCustoDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />Novo Tipo de Custo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Tipos de Custos</CardTitle>
              <Coins className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalTipos}</div>
              <p className="text-xs text-white/50">tipos cadastrados</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Limite Total Mensal</CardTitle>
              <Coins className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totalLimiteMensal)}</div>
              <p className="text-xs text-white/50">soma dos limites máximos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input placeholder="Buscar tipos de custos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
              </div>
            </div>

            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">Nome</TableHead>
                     <TableHead className="text-white/70">Descrição</TableHead>
                     <TableHead className="text-white/70 text-right">Valor Máximo Mensal</TableHead>
                     <TableHead className="text-white/70 text-center">Tipo</TableHead>
                     <TableHead className="text-white/70 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTiposCustos.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-white/50 py-8">Nenhum tipo de custo encontrado</TableCell></TableRow>
                  ) : (
                    filteredTiposCustos.map((tipo) => (
                      <TableRow key={tipo.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{tipo.nome}</TableCell>
                         <TableCell className="text-white/60 text-sm">{tipo.descricao || "—"}</TableCell>
                         <TableCell className="text-right font-medium text-white">{formatCurrency(tipo.valor_maximo_mensal)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={tipo.tipo === 'fixa' ? 'default' : 'secondary'}>{tipo.tipo === 'fixa' ? 'Fixa' : 'Variável'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditTipoCusto(tipo)} className="text-white/70 hover:text-white hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ type: "tipo", id: tipo.id })} className="text-white/70 hover:text-red-400 hover:bg-white/10"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={tipoCustoDialog} onOpenChange={(open) => { setTipoCustoDialog(open); if (!open) resetTipoCustoForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTipoCusto ? "Editar" : "Novo"} Tipo de Custo</DialogTitle>
            <DialogDescription>Preencha os dados do tipo de custo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={tipoCustoForm.nome} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, nome: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={tipoCustoForm.descricao} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor Máximo Mensal</Label>
                <Input id="valor" type="number" value={tipoCustoForm.valor_maximo_mensal} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, valor_maximo_mensal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={tipoCustoForm.tipo} onValueChange={(v: 'fixa' | 'variavel') => setTipoCustoForm({ ...tipoCustoForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoCustoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTipoCusto}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
