import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { useCustosMensais } from "@/hooks/useCustosMensais";
import { useTiposCustos, TipoCusto } from "@/hooks/useTiposCustos";
import { cn, formatCurrency } from "@/lib/utils";

const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CustosGridMinimalista() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const { totaisPorMes, loading: loadingMensais, fetchTotaisPorMes } = useCustosMensais();

  const {
    tiposCustos, loading: loadingTipos,
    saveTipoCusto, updateTipoCusto, deleteTipoCusto,
  } = useTiposCustos();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [tipoCustoDialog, setTipoCustoDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string } | null>(null);
  const [editingTipoCusto, setEditingTipoCusto] = useState<TipoCusto | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  const [tipoCustoForm, setTipoCustoForm] = useState({
    nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa" as 'fixa' | 'variavel', aparece_no_dre: true,
  });

  useEffect(() => { const timer = setTimeout(() => setMounted(true), 100); return () => clearTimeout(timer); }, []);
  useEffect(() => { fetchTotaisPorMes(ano); }, [ano, fetchTotaisPorMes]);

  const totalTipos = tiposCustos.filter(t => t.ativo).length;
  const totalLimiteMensal = tiposCustos.filter(t => t.ativo).reduce((acc, t) => acc + t.valor_maximo_mensal, 0);

  const filteredTiposCustos = tiposCustos.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || (filterStatus === "ativo" && t.ativo) || (filterStatus === "inativo" && !t.ativo);
    return matchesSearch && matchesStatus;
  });

  const handleMonthClick = (monthIndex: number) => {
    const mesFormatado = `${ano}-${String(monthIndex + 1).padStart(2, "0")}`;
    navigate(`/administrativo/financeiro/custos/${mesFormatado}`);
  };

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

  const toggleTipoCustoStatus = async (tipo: TipoCusto) => { await updateTipoCusto(tipo.id, { ativo: !tipo.ativo }); };
  const resetTipoCustoForm = () => { setEditingTipoCusto(null); setTipoCustoForm({ nome: "", descricao: "", valor_maximo_mensal: 0, tipo: "fixa", aparece_no_dre: true }); };

  const loading = loadingMensais || loadingTipos;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-white/10" />
        <div className="grid grid-cols-3 gap-3">{Array.from({ length: 12 }).map((_, i) => (<Skeleton key={i} className="h-24 bg-white/10" />))}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatedBreadcrumb items={[{ label: "Home", path: "/home" }, { label: "Administrativo", path: "/administrativo" }, { label: "Financeiro", path: "/administrativo/financeiro" }, { label: "Custos" }]} mounted={mounted} />
      <button onClick={() => navigate("/administrativo/financeiro")} className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300" style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-20px)", transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms" }}>
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20"><ArrowLeft className="w-5 h-5" strokeWidth={1.5} /></div>
      </button>

      <div className="container mx-auto p-6 pt-20 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Custos {ano}</h1>
            <p className="text-white/60">Selecione um mês para lançar os custos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAno(ano - 1)} className="bg-white/5 border-white/20 text-white hover:bg-white/10">{ano - 1}</Button>
            <Button variant="outline" onClick={() => setAno(currentYear)} className={cn("border-white/20 text-white", ano === currentYear ? "bg-blue-600 hover:bg-blue-700 border-blue-500" : "bg-white/5 hover:bg-white/10")}>{currentYear}</Button>
            <Button variant="outline" onClick={() => setAno(ano + 1)} className="bg-white/5 border-white/20 text-white hover:bg-white/10">{ano + 1}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {MESES_NOMES.map((nomeMes, index) => {
            const isCurrentMonth = ano === currentYear && index === currentMonth;
            const dados = totaisPorMes[index];
            const totalReal = dados?.total_real || 0;
            const totalLimite = dados?.total_limite || 0;
            const percentual = totalLimite > 0 ? (totalReal / totalLimite) * 100 : 0;
            return (
              <Card key={index} onClick={() => handleMonthClick(index)} className={cn("cursor-pointer transition-all duration-200", isCurrentMonth ? "bg-blue-500 border-blue-400 hover:bg-blue-400" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20")}>
                <CardContent className="p-4">
                  <p className={cn("text-sm font-medium mb-2", isCurrentMonth ? "text-white" : "text-white/60")}>{nomeMes}</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalReal)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className={cn("text-xs", isCurrentMonth ? "text-white/70" : "text-white/40")}>Limite: {formatCurrency(totalLimite)}</p>
                    {totalLimite > 0 && (<p className={cn("text-xs font-medium", percentual > 100 ? "text-red-400" : percentual > 80 ? "text-amber-400" : isCurrentMonth ? "text-white/80" : "text-green-400")}>{percentual.toFixed(0)}%</p>)}
                  </div>
                  {totalLimite > 0 && (
                    <div className={cn("mt-2 h-1 rounded-full overflow-hidden", isCurrentMonth ? "bg-white/20" : "bg-white/10")}>
                      <div className={cn("h-full rounded-full transition-all", percentual > 100 ? "bg-red-400" : percentual > 80 ? "bg-amber-400" : "bg-green-400")} style={{ width: `${Math.min(percentual, 100)}%` }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Tipos de Custos</h2>
              <p className="text-white/60">Cadastre os tipos de custos da empresa com limites mensais</p>
            </div>
            <Button onClick={() => setTipoCustoDialog(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Novo Tipo de Custo</Button>
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px] bg-white/5 border-white/20 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/70">Nome</TableHead>
                       <TableHead className="text-white/70">Descrição</TableHead>
                       <TableHead className="text-white/70 text-right">Valor Máximo Mensal</TableHead>
                       <TableHead className="text-white/70 text-center">Tipo</TableHead>
                       <TableHead className="text-white/70 text-center">Status</TableHead>
                       <TableHead className="text-white/70 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTiposCustos.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-white/50 py-8">Nenhum tipo de custo encontrado</TableCell></TableRow>
                    ) : (
                      filteredTiposCustos.map((tipo) => (
                        <TableRow key={tipo.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-white">{tipo.nome}</TableCell>
                           <TableCell className="text-white/60 text-sm">
                             {inlineEditId === tipo.id ? (
                               <input
                                 autoFocus
                                 value={inlineEditValue}
                                 onChange={(e) => setInlineEditValue(e.target.value)}
                                 onBlur={async () => {
                                   if (inlineEditValue !== (tipo.descricao || "")) {
                                     await updateTipoCusto(tipo.id, { descricao: inlineEditValue || null });
                                   }
                                   setInlineEditId(null);
                                 }}
                                 onKeyDown={async (e) => {
                                   if (e.key === 'Enter') {
                                     if (inlineEditValue !== (tipo.descricao || "")) {
                                       await updateTipoCusto(tipo.id, { descricao: inlineEditValue || null });
                                     }
                                     setInlineEditId(null);
                                   } else if (e.key === 'Escape') {
                                     setInlineEditId(null);
                                   }
                                 }}
                                 className="w-full bg-white/5 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                               />
                             ) : (
                               <span
                                 onClick={() => { setInlineEditId(tipo.id); setInlineEditValue(tipo.descricao || ""); }}
                                 className="cursor-pointer hover:text-white/80 transition-colors"
                                 title="Clique para editar"
                               >
                                 {tipo.descricao || "—"}
                               </span>
                             )}
                           </TableCell>
                           <TableCell className="text-right font-medium text-white">{formatCurrency(tipo.valor_maximo_mensal)}</TableCell>
                          <TableCell className="text-center"><Badge variant={tipo.tipo === 'fixa' ? 'default' : 'secondary'}>{tipo.tipo === 'fixa' ? 'Fixa' : 'Variável'}</Badge></TableCell>
                          <TableCell className="text-center"><Switch checked={tipo.ativo} onCheckedChange={() => toggleTipoCustoStatus(tipo)} /></TableCell>
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
      </div>

      <Dialog open={tipoCustoDialog} onOpenChange={(open) => { setTipoCustoDialog(open); if (!open) resetTipoCustoForm(); }}>
        <DialogContent className="sm:max-w-[500px] bg-[#111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingTipoCusto ? "Editar" : "Novo"} Tipo de Custo</DialogTitle>
            <DialogDescription className="text-white/60">Preencha os dados do tipo de custo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome" className="text-white/80">Nome</Label>
              <Input id="nome" value={tipoCustoForm.nome} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, nome: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao" className="text-white/80">Descrição</Label>
              <Textarea id="descricao" value={tipoCustoForm.descricao} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, descricao: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valor" className="text-white/80">Valor Máximo Mensal</Label>
                <Input id="valor" type="number" value={tipoCustoForm.valor_maximo_mensal} onChange={(e) => setTipoCustoForm({ ...tipoCustoForm, valor_maximo_mensal: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/20 text-white" />
              </div>
              <div className="grid gap-2">
                <Label className="text-white/80">Tipo</Label>
                <Select value={tipoCustoForm.tipo} onValueChange={(v: 'fixa' | 'variavel') => setTipoCustoForm({ ...tipoCustoForm, tipo: v })}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="aparece_no_dre_custos" className="text-white/80">Aparece no DRE</Label>
              <Switch id="aparece_no_dre_custos" checked={tipoCustoForm.aparece_no_dre} onCheckedChange={(v) => setTipoCustoForm({ ...tipoCustoForm, aparece_no_dre: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoCustoDialog(false)} className="border-white/20 text-white hover:bg-white/10">Cancelar</Button>
            <Button onClick={handleSaveTipoCusto} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#111] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
