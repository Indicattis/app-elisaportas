import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, CalendarIcon, FileText, ArrowUpDown, Landmark } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

import { useEntradas, Entrada, EntradasOrdenarPor } from "@/hooks/useEntradas";
import { useBancos } from "@/hooks/useBancos";
import { MinimalistLayout } from "@/components/MinimalistLayout";
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

export default function EntradasPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const now = new Date();
  const mesQuery = searchParams.get("mes");
  const [mesFiltro, setMesFiltro] = useState(
    mesQuery && /^\d{4}-\d{2}$/.test(mesQuery)
      ? mesQuery
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const [ordenarPor, setOrdenarPor] = useState<EntradasOrdenarPor>('cadastro');
  const { entradas, loading, saveEntrada, updateEntrada, deleteEntrada } = useEntradas(mesFiltro, ordenarPor);
  const { bancos } = useBancos();
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingEntrada, setEditingEntrada] = useState<Entrada | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form state
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [responsavelId, setResponsavelId] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [status, setStatus] = useState<"recebido" | "previsto">("recebido");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSugestoesCat, setShowSugestoesCat] = useState(false);
  const [showSugestoesDesc, setShowSugestoesDesc] = useState(false);

  const categoriasUnicas = useMemo(() => {
    return Array.from(new Set(entradas.map((e) => e.categoria).filter(Boolean))) as string[];
  }, [entradas]);

  const descricoesUnicas = useMemo(() => {
    return Array.from(new Set(entradas.map((e) => e.descricao).filter(Boolean))) as string[];
  }, [entradas]);

  const sugestoesCatFiltradas = useMemo(() => {
    if (categoria.length < 1) return categoriasUnicas.slice(0, 8);
    return categoriasUnicas
      .filter((s) => s.toLowerCase().includes(categoria.toLowerCase()) && s.toLowerCase() !== categoria.toLowerCase())
      .slice(0, 8);
  }, [categoria, categoriasUnicas]);

  const sugestoesDescFiltradas = useMemo(() => {
    if (descricao.length < 1) return [];
    return descricoesUnicas
      .filter((s) => s.toLowerCase().includes(descricao.toLowerCase()) && s.toLowerCase() !== descricao.toLowerCase())
      .slice(0, 5);
  }, [descricao, descricoesUnicas]);

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
    setCategoria("");
    setDescricao("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setResponsavelId("");
    setBancoId("");
    setStatus("recebido");
    setObservacoes("");
    setEditingEntrada(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (e: Entrada) => {
    setEditingEntrada(e);
    setCategoria(e.categoria || "");
    setDescricao(e.descricao || "");
    setValor(String(e.valor));
    setData(e.data);
    setResponsavelId(e.responsavel_id || "");
    setBancoId(e.banco_id || "");
    setStatus((e.status as "recebido" | "previsto") || "recebido");
    setObservacoes(e.observacoes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoria.trim() || !valor || !bancoId) return;
    setSaving(true);
    const payload: Partial<Entrada> = {
      categoria: categoria.trim(),
      descricao: descricao || null,
      valor: parseFloat(valor),
      data,
      responsavel_id: responsavelId || null,
      banco_id: bancoId,
      status,
      observacoes: observacoes || null,
    };
    const ok = editingEntrada
      ? await updateEntrada(editingEntrada.id, payload)
      : await saveEntrada(payload);
    setSaving(false);
    if (ok) {
      setDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteEntrada(deletingId);
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");

  const entradasFiltradas = useMemo(() => {
    return entradas.filter((e) => {
      if (filtroCategoria && filtroCategoria !== "all" && e.categoria !== filtroCategoria) return false;
      if (filtroBanco && filtroBanco !== "all" && e.banco_id !== filtroBanco) return false;
      if (filtroResponsavel && filtroResponsavel !== "all" && e.responsavel_id !== filtroResponsavel) return false;
      return true;
    });
  }, [entradas, filtroCategoria, filtroBanco, filtroResponsavel]);

  const totalEntradas = useMemo(
    () => entradasFiltradas.reduce((sum, e) => sum + Number(e.valor || 0), 0),
    [entradasFiltradas]
  );

  const filtrosAtivos =
    (filtroCategoria && filtroCategoria !== "all") ||
    (filtroBanco && filtroBanco !== "all") ||
    (filtroResponsavel && filtroResponsavel !== "all");

  const gerarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    const [y, m] = mesFiltro.split("-").map(Number);
    const mesLabel = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Relatório de Entradas — ${mesLabel}`, 14, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 25);

    const tableData = entradasFiltradas.map((e) => [
      e.categoria || "—",
      e.descricao || "—",
      formatCurrency(Number(e.valor)),
      format(new Date(e.data + "T12:00:00"), "dd/MM/yyyy"),
      e.banco_nome || "—",
      e.responsavel_nome || "—",
    ]);

    tableData.push(["", "", formatCurrency(totalEntradas), "", "", ""]);

    autoTable(doc, {
      head: [["Categoria", "Descrição", "Valor", "Data", "Banco", "Responsável"]],
      body: tableData,
      startY: 32,
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
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
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
      didParseCell(data) {
        if (data.section === "body" && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [209, 250, 229];
        }
      },
    });

    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const headerActions = (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-1 py-0.5">
          <button
            onClick={() => {
              const [y, m] = mesFiltro.split("-").map(Number);
              const prev = new Date(y, m - 2, 1);
              setMesFiltro(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
            }}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-2 min-w-[120px] justify-center">
            <CalendarIcon className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/80 font-medium capitalize">
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
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as EntradasOrdenarPor)}>
          <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
            <ArrowUpDown className="w-3 h-3 mr-1.5 text-white/40" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/20">
            <SelectItem value="cadastro" className="text-white hover:bg-white/10">Data de Cadastro</SelectItem>
            <SelectItem value="recebimento" className="text-white hover:bg-white/10">Data de Recebimento</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[170px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/20">
            <SelectItem value="all" className="text-white hover:bg-white/10">Todas as categorias</SelectItem>
            {categoriasUnicas.map((c) => (
              <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroBanco} onValueChange={setFiltroBanco}>
          <SelectTrigger className="w-[150px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
            <SelectValue placeholder="Todos os bancos" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/20">
            <SelectItem value="all" className="text-white hover:bg-white/10">Todos os bancos</SelectItem>
            {bancos.filter(b => b.ativo).map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-white hover:bg-white/10">{b.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
          <SelectTrigger className="w-[160px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
            <SelectValue placeholder="Todos os responsáveis" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/20">
            <SelectItem value="all" className="text-white hover:bg-white/10">Todos os responsáveis</SelectItem>
            {colaboradores.map((c) => (
              <SelectItem key={c.user_id} value={c.user_id} className="text-white hover:bg-white/10">{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtrosAtivos ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFiltroCategoria(""); setFiltroBanco(""); setFiltroResponsavel(""); }}
            className="h-8 text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="h-6 w-px bg-white/10" />

      <Button
        onClick={gerarPDF}
        variant="ghost"
        size="sm"
        className="h-9 text-white/70 hover:text-white hover:bg-white/10 text-sm gap-1.5"
      >
        <FileText className="w-3.5 h-3.5" /> PDF
      </Button>
      <Button
        onClick={() => navigate("/financeiro/bancos")}
        variant="ghost"
        size="sm"
        className="h-9 text-white/70 hover:text-white hover:bg-white/10 text-sm gap-1.5"
      >
        <Landmark className="w-3.5 h-3.5" /> Bancos
      </Button>

      <Button
        onClick={openCreate}
        className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium gap-1.5 px-4 shadow-lg shadow-emerald-600/20"
      >
        <Plus className="w-4 h-4" /> Nova Entrada
      </Button>
    </div>
  );

  return (
    <MinimalistLayout
      title="Entradas"
      subtitle="Valores recebidos no mês"
      backPath="/financeiro"
      headerActions={headerActions}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Financeiro", path: "/financeiro" },
        { label: "Entradas" },
      ]}
      fullWidth
    >
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
            <span className="text-xs text-white/50">Total:</span>
            <span className="text-sm font-bold text-emerald-300">{formatCurrency(totalEntradas)}</span>
            <span className="text-xs text-white/40">({entradasFiltradas.length} {entradasFiltradas.length === 1 ? 'registro' : 'registros'})</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : entradasFiltradas.length === 0 ? (
            <div className="text-center py-20 text-white/40 text-sm">
              Nenhuma entrada registrada neste mês.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Responsável</TableHead>
                  <TableHead className="text-white/60">Categoria</TableHead>
                  <TableHead className="text-white/60">Descrição</TableHead>
                  <TableHead className="text-white/60">Valor</TableHead>
                  <TableHead className="text-white/60">Data</TableHead>
                  <TableHead className="text-white/60">Banco</TableHead>
                  <TableHead className="text-white/60 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradasFiltradas.map((e) => (
                  <TableRow key={e.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/70 text-sm">
                      <div className="flex items-center gap-2">
                        {e.responsavel_foto ? (
                          <img src={e.responsavel_foto} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-medium ring-1 ring-white/20">
                            {e.responsavel_nome?.charAt(0) || "?"}
                          </div>
                        )}
                        <span>{e.responsavel_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-sm font-medium">
                      {e.categoria}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm max-w-[200px] truncate">
                      {e.descricao || "—"}
                    </TableCell>
                    <TableCell className="text-emerald-300 text-sm font-medium">
                      {formatCurrency(Number(e.valor))}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm">
                      {format(new Date(e.data + "T12:00:00"), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm">
                      {e.banco_nome || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeletingId(e.id); setDeleteOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-white/10 bg-white/5 hover:bg-white/10">
                  <TableCell className="text-white text-sm font-bold" colSpan={3}>Total</TableCell>
                  <TableCell className="text-emerald-300 text-sm font-bold">{formatCurrency(totalEntradas)}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-[#111] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingEntrada ? "Editar Entrada" : "Nova Entrada"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {editingEntrada
                  ? "Atualize as informações da entrada."
                  : "Preencha os dados para registrar um novo valor recebido."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Label className="text-white/80 text-sm">Categoria *</Label>
                <Input
                  value={categoria}
                  onChange={(e) => { setCategoria(e.target.value); setShowSugestoesCat(true); }}
                  onFocus={() => setShowSugestoesCat(true)}
                  onBlur={() => setTimeout(() => setShowSugestoesCat(false), 150)}
                  placeholder="Ex: Aluguel, Reembolso, Venda de sucata..."
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  autoComplete="off"
                />
                {showSugestoesCat && sugestoesCatFiltradas.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-md overflow-hidden shadow-lg max-h-56 overflow-y-auto">
                    {sugestoesCatFiltradas.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setCategoria(s); setShowSugestoesCat(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Label className="text-white/80 text-sm">Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => { setDescricao(e.target.value); setShowSugestoesDesc(true); }}
                  onFocus={() => setShowSugestoesDesc(true)}
                  onBlur={() => setTimeout(() => setShowSugestoesDesc(false), 150)}
                  placeholder="Descrição da entrada"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  autoComplete="off"
                />
                {showSugestoesDesc && sugestoesDescFiltradas.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-md overflow-hidden shadow-lg">
                    {sugestoesDescFiltradas.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setDescricao(s); setShowSugestoesDesc(false); }}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80 text-sm">Responsável</Label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Selecione" />
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
                  <Label className="text-white/80 text-sm">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "recebido" | "previsto")}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/20">
                      <SelectItem value="recebido" className="text-white hover:bg-white/10">Recebido</SelectItem>
                      <SelectItem value="previsto" className="text-white hover:bg-white/10">Previsto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                disabled={saving || !categoria.trim() || !valor || !bancoId}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
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
              <AlertDialogTitle className="text-white">Excluir entrada?</AlertDialogTitle>
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
    </MinimalistLayout>
  );
}