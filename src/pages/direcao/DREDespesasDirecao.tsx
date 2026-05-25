import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Switch } from "@/components/ui/switch";
import { useTiposCustos, TipoCusto } from "@/hooks/useTiposCustos";
import { formatCurrency } from "@/lib/utils";

export default function DREDespesasDirecao() {
  const {
    tiposCustos, loading,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
  } = useTiposCustos();

  const [searchTerm, setSearchTerm] = useState("");
  const [tipoCustoDialog, setTipoCustoDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string } | null>(null);
  const [editingTipoCusto, setEditingTipoCusto] = useState<TipoCusto | null>(null);

  const [tipoCustoForm, setTipoCustoForm] = useState({
    nome: "", descricao: "",
    valor_maximo_mensal: 0, tipo: "fixa" as 'fixa' | 'variavel',
    aparece_no_dre: true,
  });

  const filteredTiposCustos = tiposCustos.filter(t =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
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
    setTipoCustoForm({ nome: tipo.nome, descricao: tipo.descricao || "", valor_maximo_mensal: tipo.valor_maximo_mensal, tipo: tipo.tipo, aparece_no_dre: tipo.aparece_no_dre });
    setTipoCustoDialog(true);
  };

  const resetTipoCustoForm = () => { setEditingTipoCusto(null); setTipoCustoForm({ nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa", aparece_no_dre: true }); };

  return (
    <MinimalistLayout
      title="Despesas"
      subtitle="Tipos de custos e limites"
      backPath="/direcao/estrategia/dre"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'DRE', path: '/direcao/estrategia/dre' },
        { label: 'Despesas' },
      ]}
      headerActions={
        <Button size="sm" onClick={() => setTipoCustoDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />Novo
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40" />
          </div>

          {(() => {
            const fixas = filteredTiposCustos.filter(t => t.tipo === 'fixa');
            const variaveis = filteredTiposCustos.filter(t => t.tipo === 'variavel');
            const totalFixas = fixas.reduce((sum, t) => sum + t.valor_maximo_mensal, 0);
            const totalVariaveis = variaveis.reduce((sum, t) => sum + t.valor_maximo_mensal, 0);

            const renderTable = (items: TipoCusto[], title: string, total: number) => (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{title} <span className="text-white/50 font-normal">({items.length})</span></h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/70">Nome</TableHead>
                      <TableHead className="text-white/70 text-right">Despesa Projetada</TableHead>
                      <TableHead className="text-white/70 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-white/50 py-8">Nenhuma despesa encontrada</TableCell></TableRow>
                    ) : (
                      items.map((tipo) => (
                        <TableRow key={tipo.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-white">
                            {tipo.nome}
                            {!tipo.aparece_no_dre && <span className="ml-2 text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded">Oculto no DRE</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium text-white">{formatCurrency(tipo.valor_maximo_mensal)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditTipoCusto(tipo)} className="text-white/70 hover:text-white hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ type: "tipo", id: tipo.id })} className="text-white/70 hover:text-red-400 hover:bg-white/10"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {items.length > 0 && (
                      <TableRow className="border-white/10 bg-white/5">
                        <TableCell className="font-semibold text-white/70">Total</TableCell>
                        <TableCell className="text-right font-bold text-white">{formatCurrency(total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            );

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderTable(fixas, "Despesas Fixas", totalFixas)}
                {renderTable(variaveis, "Despesas Variáveis", totalVariaveis)}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tipo de Custo Dialog */}
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
                <Label htmlFor="valor">Despesa Projetada</Label>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="aparece_no_dre">Aparece no DRE</Label>
              <Switch id="aparece_no_dre" checked={tipoCustoForm.aparece_no_dre} onCheckedChange={(v) => setTipoCustoForm({ ...tipoCustoForm, aparece_no_dre: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoCustoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTipoCusto}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
    </MinimalistLayout>
  );
}
