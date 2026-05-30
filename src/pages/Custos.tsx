import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Coins } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useTiposCustos, TipoCusto } from "@/hooks/useTiposCustos";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function Custos() {
  const {
    tiposCustos, loading,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
  } = useTiposCustos();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [tipoCustoDialog, setTipoCustoDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string } | null>(null);
  const [editingTipoCusto, setEditingTipoCusto] = useState<TipoCusto | null>(null);

  const [tipoCustoForm, setTipoCustoForm] = useState({
    nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa" as 'fixa' | 'variavel',
  });

  const totalTipos = tiposCustos.filter(t => t.ativo).length;
  const totalLimiteMensal = tiposCustos.filter(t => t.ativo).reduce((acc, t) => acc + t.valor_maximo_mensal, 0);

  const filteredTiposCustos = tiposCustos.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "ativo" && t.ativo) || (filterStatus === "inativo" && !t.ativo);
    return matchesSearch && matchesStatus;
  });

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
    setTipoCustoForm({ nome: tipo.nome, descricao: tipo.descricao || "", valor_maximo_mensal: tipo.valor_maximo_mensal, tipo: tipo.tipo as 'fixa' | 'variavel' });
    setTipoCustoDialog(true);
  };

  const toggleTipoCustoStatus = async (tipo: TipoCusto) => { await updateTipoCusto(tipo.id, { ativo: !tipo.ativo }); };

  const resetTipoCustoForm = () => {
    setEditingTipoCusto(null);
    setTipoCustoForm({ nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa" });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tipos de Custos</h1>
          <p className="text-muted-foreground">Cadastre os tipos de custos da empresa com limites mensais</p>
        </div>
        <Button onClick={() => setTipoCustoDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />Novo Tipo de Custo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Custos</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTipos}</div>
            <p className="text-xs text-muted-foreground">tipos cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Total Mensal</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLimiteMensal)}</div>
            <p className="text-xs text-muted-foreground">soma dos limites máximos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tipos de custos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Valor Máximo Mensal</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiposCustos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum tipo de custo encontrado</TableCell></TableRow>
              ) : (
                filteredTiposCustos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(tipo.valor_maximo_mensal)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tipo.tipo === 'fixa' ? 'default' : 'secondary'}>{tipo.tipo === 'fixa' ? 'Fixa' : 'Variável'}</Badge>
                    </TableCell>
                    <TableCell className="text-center"><Switch checked={tipo.ativo} onCheckedChange={() => toggleTipoCustoStatus(tipo)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTipoCusto(tipo)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ type: "tipo", id: tipo.id })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={tipoCustoDialog} onOpenChange={(open) => { setTipoCustoDialog(open); if (!open) resetTipoCustoForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTipoCusto ? "Editar" : "Novo"} Tipo de Custo</DialogTitle>
            <DialogDescription>Cadastre um tipo de custo com limite mensal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={tipoCustoForm.nome} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, nome: e.target.value })} placeholder="Ex: Energia Elétrica" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={tipoCustoForm.descricao} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, descricao: e.target.value })} placeholder="Descrição do tipo de custo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_maximo">Valor Máximo Mensal</Label>
              <Input id="valor_maximo" type="number" step="0.01" value={tipoCustoForm.valor_maximo_mensal} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, valor_maximo_mensal: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Custo</Label>
              <Select value={tipoCustoForm.tipo} onValueChange={(v: 'fixa' | 'variavel') => setTipoCustoForm({ ...tipoCustoForm, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTipoCustoDialog(false); resetTipoCustoForm(); }}>Cancelar</Button>
            <Button onClick={handleSaveTipoCusto} disabled={!tipoCustoForm.nome}>{editingTipoCusto ? "Salvar" : "Criar"}</Button>
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
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
