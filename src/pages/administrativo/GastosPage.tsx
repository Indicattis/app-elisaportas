import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, CalendarIcon, FileText, ArrowUpDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import { useGastos, Gasto, GastosOrdenarPor } from "@/hooks/useGastos";
import { useBancos } from "@/hooks/useBancos";
import { useTiposCustos } from "@/hooks/useTiposCustos";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { FloatingProfileMenu } from "@/components/FloatingProfileMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface ColaboradorOption {
  user_id: string;
  nome: string;
}

export default function GastosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);

  const now = new Date();
  const mesQuery = searchParams.get("mes");
  const [mesFiltro, setMesFiltro] = useState(
    mesQuery && /^\d{4}-\d{2}$/.test(mesQuery)
      ? mesQuery
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const [ordenarPor, setOrdenarPor] = useState<GastosOrdenarPor>('cadastro');
  const { gastos, loading, saveGasto, updateGasto, deleteGasto } = useGastos(mesFiltro, ordenarPor);
  const { tiposCustos } = useTiposCustos();
  const { bancos } = useBancos();
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form state
  const [tipoCustoId, setTipoCustoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [responsavelId, setResponsavelId] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(false);

  const descricoesUnicas = useMemo(() => {
    return Array.from(new Set(gastos.map((g) => g.descricao).filter(Boolean))) as string[];
  }, [gastos]);

  const sugestoesFiltradas = useMemo(() => {
    if (descricao.length < 1) return [];
    return descricoesUnicas
      .filter((s) => s.toLowerCase().includes(descricao.toLowerCase()) && s.toLowerCase() !== descricao.toLowerCase())
      .slice(0, 5);
  }, [descricao, descricoesUnicas]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchColaboradores = async () => {
      const { data } = await supabase
        .from("admin_users")
        .select("user_id, nome, setor")
        .eq("ativo", true)
        .or("setor.eq.administrativo,role.eq.diretor")
        .order("nome");
      setColaboradores((data || []) as ColaboradorOption[]);
    };
    fetchColaboradores();
  }, []);

  const resetForm = () => {
    setTipoCustoId("");
    setDescricao("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setResponsavelId("");
    setBancoId("");
    setObservacoes("");
    setEditingGasto(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (g: Gasto) => {
    setEditingGasto(g);
    setTipoCustoId(g.tipo_custo_id);
    setDescricao(g.descricao || "");
    setValor(String(g.valor));
    setData(g.data);
    setResponsavelId(g.responsavel_id);
    setBancoId(g.banco_id || "");
    setObservacoes(g.observacoes || "");
    setDialogOpen(true);
  };

  const handleTipoCustoChange = (id: string) => {
    setTipoCustoId(id);
    if (!editingGasto) {
      const tipo = tiposCustos.find((t) => t.id === id);
      if (tipo?.descricao) setDescricao(tipo.descricao);
    }
  };

  const handleSave = async () => {
    if (!tipoCustoId || !valor || !responsavelId || !bancoId) return;
    setSaving(true);
    const payload = {
      tipo_custo_id: tipoCustoId,
      descricao: descricao || null,
      valor: parseFloat(valor),
      data,
      responsavel_id: responsavelId,
      banco_id: bancoId,
      status: "pago",
      observacoes: observacoes || null,
    };
    const ok = editingGasto
      ? await updateGasto(editingGasto.id, payload)
      : await saveGasto(payload);
    setSaving(false);
    if (ok) {
      setDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteGasto(deletingId);
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const tiposAtivos = tiposCustos.filter((t) => t.ativo);

  const gerarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    const [y, m] = mesFiltro.split("-").map(Number);
    const mesLabel = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Relatório de Gastos — ${mesLabel}`, 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 25);

    const tipoFiltroNome = filtroTipo && filtroTipo !== "all"
      ? tiposCustos.find((t) => t.id === filtroTipo)?.nome
      : null;
    if (tipoFiltroNome) {
      doc.text(`Filtro: ${tipoFiltroNome}`, 14, 30);
    }

    const startY = tipoFiltroNome ? 36 : 32;

    const tableData = gastosFiltrados.map((g) => [
      g.tipo_custo_nome || "—",
      g.descricao || "—",
      formatCurrency(g.valor),
      format(new Date(g.data + "T12:00:00"), "dd/MM/yyyy"),
      g.banco_nome || "—",
      g.responsavel_nome || "—",
    ]);

    tableData.push([
      "", "", formatCurrency(totalGastos), "", "", "",
    ]);

    autoTable(doc, {
      head: [["Tipo de Custo", "Descrição", "Valor", "Data", "Banco", "Responsável"]],
      body: tableData,
      startY,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      styles: { overflow: "linebreak", cellWidth: "wrap" },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 90 },
        2: { halign: "right", cellWidth: 28 },
        3: { halign: "center", cellWidth: 22 },
        4: { cellWidth: 35 },
        5: { cellWidth: 45 },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
      didParseCell(data) {
        if (data.section === "body" && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [220, 230, 245];
        }
      },
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pages}`, 148, 200, { align: "center" });
    }

    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroDre, setFiltroDre] = useState<"all" | "sim" | "nao">("all");

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      if (filtroTipo && filtroTipo !== "all" && g.tipo_custo_id !== filtroTipo) return false;
      if (filtroBanco && filtroBanco !== "all" && g.banco_id !== filtroBanco) return false;
      if (filtroResponsavel && filtroResponsavel !== "all" && g.responsavel_id !== filtroResponsavel) return false;
      if (filtroDre === "sim" && g.tipo_custo_aparece_no_dre === false) return false;
      if (filtroDre === "nao" && g.tipo_custo_aparece_no_dre !== false) return false;
      return true;
    });
  }, [gastos, filtroTipo, filtroBanco, filtroResponsavel, filtroDre]);

  const totalGastos = useMemo(
    () => gastosFiltrados.reduce((sum, g) => sum + g.valor, 0),
    [gastosFiltrados]
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "Financeiro", path: "/administrativo/financeiro" },
          { label: "Gastos" },
        ]}
        mounted={mounted}
      />
      <FloatingProfileMenu mounted={mounted} />

      <button
        onClick={() => navigate("/administrativo/financeiro")}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateX(0)" : "translateX(-20px)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="w-full max-w-6xl px-4 pt-20 pb-10">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s ease 200ms",
          }}
        >
          <h1 className="text-xl font-semibold text-white">Gastos</h1>
          <div className="flex items-center gap-3">
            {/* Month Navigator */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/20 rounded-lg px-1 py-0.5">
              <button
                onClick={() => {
                  const [y, m] = mesFiltro.split("-").map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setMesFiltro(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
                }}
                className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2 min-w-[130px] justify-center">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm text-white font-medium capitalize">
                  {(() => {
                    const [y, m] = mesFiltro.split("-").map(Number);
                    const d = new Date(y, m - 1, 1);
                    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                  })()}
                </span>
              </div>
              <button
                onClick={() => {
                  const [y, m] = mesFiltro.split("-").map(Number);
                  const next = new Date(y, m, 1);
                  setMesFiltro(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
                }}
                className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={gerarPDF}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 text-sm gap-1.5"
            >
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm gap-1.5"
            >
              <Plus className="w-4 h-4" /> Novo Gasto
            </Button>
          </div>
        </div>

        {/* Filtro por tipo */}
        <div
          className="mb-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s ease 250ms",
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos os tipos</SelectItem>
                {tiposAtivos.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/10">
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroBanco} onValueChange={setFiltroBanco}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Todos os bancos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos os bancos</SelectItem>
                {bancos.filter(b => b.ativo).map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-white hover:bg-white/10">
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">Todos os responsáveis</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id} className="text-white hover:bg-white/10">
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroDre} onValueChange={(v) => setFiltroDre(v as "all" | "sim" | "nao")}>
              <SelectTrigger className="w-[200px] bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">DRE: Todos</SelectItem>
                <SelectItem value="sim" className="text-white hover:bg-white/10">Aparece no DRE</SelectItem>
                <SelectItem value="nao" className="text-white hover:bg-white/10">Não aparece no DRE</SelectItem>
              </SelectContent>
            </Select>
            {(filtroTipo && filtroTipo !== "all") || (filtroBanco && filtroBanco !== "all") || (filtroResponsavel && filtroResponsavel !== "all") || filtroDre !== "all" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFiltroTipo(""); setFiltroBanco(""); setFiltroResponsavel(""); setFiltroDre("all"); }}
                className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
              >
                Limpar filtros
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-3">
              <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as GastosOrdenarPor)}>
                <SelectTrigger className="w-[210px] bg-white/5 border-white/20 text-white">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/20">
                  <SelectItem value="cadastro" className="text-white hover:bg-white/10">Data de Cadastro</SelectItem>
                  <SelectItem value="pagamento" className="text-white hover:bg-white/10">Data de Pagamento</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="text-xs text-white/50">Total:</span>
              <span className="text-sm font-bold text-white">{formatCurrency(totalGastos)}</span>
              <span className="text-xs text-white/40">({gastosFiltrados.length} {gastosFiltrados.length === 1 ? 'registro' : 'registros'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s ease 300ms",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-white/40 text-sm">
              Nenhum gasto registrado neste mês.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Responsável</TableHead>
                  <TableHead className="text-white/60">Tipo de Custo</TableHead>
                  <TableHead className="text-white/60">Descrição</TableHead>
                  <TableHead className="text-white/60">Valor</TableHead>
                  <TableHead className="text-white/60">Data</TableHead>
                  <TableHead className="text-white/60">Banco</TableHead>
                  <TableHead className="text-white/60 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosFiltrados.map((g) => (
                  <TableRow key={g.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/70 text-sm">
                      <div className="flex items-center gap-2">
                        {g.responsavel_foto ? (
                          <img src={g.responsavel_foto} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-medium ring-1 ring-white/20">
                            {g.responsavel_nome?.charAt(0) || "?"}
                          </div>
                        )}
                        <span>{g.responsavel_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-sm font-medium">
                      {g.tipo_custo_nome}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm max-w-[200px] truncate">
                      {g.descricao || "—"}
                    </TableCell>
                    <TableCell className="text-white text-sm">
                      {formatCurrency(g.valor)}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm">
                      {format(new Date(g.data + "T12:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm">
                      {g.banco_nome || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(g.id);
                            setDeleteOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="border-white/10 bg-white/5 hover:bg-white/10">
                  <TableCell className="text-white text-sm font-bold" colSpan={3}>
                    Total
                  </TableCell>
                  <TableCell className="text-white text-sm font-bold">
                    {formatCurrency(totalGastos)}
                  </TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingGasto ? "Editar Gasto" : "Novo Gasto"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingGasto
                ? "Atualize as informações do gasto."
                : "Preencha os dados para registrar um novo gasto."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/80 text-sm">Tipo de Custo *</Label>
              <Select value={tipoCustoId} onValueChange={handleTipoCustoChange}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Selecione o tipo de custo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/20">
                  {tiposAtivos.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/10">
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Label className="text-white/80 text-sm">Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  setShowSugestoes(true);
                }}
                onFocus={() => setShowSugestoes(true)}
                onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                placeholder="Descrição do gasto"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                autoComplete="off"
              />
              {showSugestoes && sugestoesFiltradas.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-md overflow-hidden shadow-lg">
                  {sugestoesFiltradas.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDescricao(s);
                        setShowSugestoes(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80 text-sm">Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Data *</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/80 text-sm">Responsável pelo Pagamento *</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/20">
                  {colaboradores.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id} className="text-white hover:bg-white/10">
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/80 text-sm">Banco *</Label>
              <Select value={bancoId} onValueChange={setBancoId}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/20">
                  {bancos.filter(b => b.ativo).map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-white hover:bg-white/10">
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/80 text-sm">Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações opcionais"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !tipoCustoId || !valor || !responsavelId || !bancoId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#111] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir gasto?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
