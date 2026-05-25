import { useState, useMemo, useRef } from "react";
import { Plus, Edit, Trash2, Search, Package, Upload, Wand2, FileText, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useFretesCidades, FreteCidade } from "@/hooks/useFretesCidades";
import { FreteDialog } from "@/components/frete/FreteDialog";
import { BulkUploadFretesCidades } from "@/components/frete/BulkUploadFretesCidades";
import { exportarFretesPDF, exportarFretesExcel } from "@/utils/fretesInternosExport";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function FreteMinimalista() {
  const { fretes, isLoading, deleteFrete, toggleAtivo, updateFrete } = useFretesCidades();
  const queryClient = useQueryClient();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrete, setEditingFrete] = useState<FreteCidade | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [fixingAccents, setFixingAccents] = useState(false);
  const [editingKmId, setEditingKmId] = useState<string | null>(null);
  const [kmEditValue, setKmEditValue] = useState("");
  const kmInputRef = useRef<HTMLInputElement>(null);

  const hasBrokenNames = useMemo(
    () => (fretes ?? []).some((f) => f.cidade.includes("\uFFFD")),
    [fretes],
  );

  const handleCorrigirAcentos = async () => {
    setFixingAccents(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "corrigir-cidades-frete",
        { body: {} },
      );
      if (error) throw error;
      const updated = data?.updated ?? 0;
      const deleted = data?.deleted_duplicates ?? 0;
      const unresolved = data?.unresolved?.length ?? 0;
      toast.success(
        `Correção concluída: ${updated} corrigidas, ${deleted} duplicadas removidas, ${unresolved} pendentes.`,
      );
      if (unresolved > 0) {
        console.warn("Cidades não resolvidas:", data.unresolved);
      }
      queryClient.invalidateQueries({ queryKey: ["frete_cidades"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao corrigir acentos");
    } finally {
      setFixingAccents(false);
    }
  };

  const fretesFiltrados = useMemo(() => {
    if (!fretes) return [];
    return fretes.filter(frete => {
      const matchSearch = frete.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         frete.estado.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filterEstado === "todos" || frete.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [fretes, searchTerm, filterEstado]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteFrete.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleEdit = (frete: FreteCidade) => {
    setEditingFrete(frete);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingFrete(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingFrete(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleStartKmEdit = (frete: FreteCidade) => {
    setEditingKmId(frete.id);
    setKmEditValue(frete.quilometragem != null ? String(frete.quilometragem) : "");
    setTimeout(() => kmInputRef.current?.focus(), 0);
  };

  const handleSaveKm = (frete: FreteCidade) => {
    const parsed = kmEditValue.trim() === "" ? null : Number(kmEditValue.replace(/,/g, "."));
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error("KM inválido");
      setEditingKmId(null);
      return;
    }
    updateFrete.mutate({
      id: frete.id,
      estado: frete.estado,
      cidade: frete.cidade,
      valor_frete: parsed != null ? parsed * 6 : 0,
      observacoes: frete.observacoes,
      ativo: frete.ativo,
      quilometragem: parsed,
    });
    setEditingKmId(null);
  };

  const handleKmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, frete: FreteCidade) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveKm(frete);
    } else if (e.key === "Escape") {
      setEditingKmId(null);
    }
  };

  const headerActions = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          placeholder="Buscar cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-48 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
        />
      </div>
      <Select value={filterEstado} onValueChange={setFilterEstado}>
        <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white h-10">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {ESTADOS_BR.map(estado => (
            <SelectItem key={estado} value={estado}>{estado}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setBulkOpen(true)}
        className="h-10 px-4 rounded-lg bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs gap-1.5"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Importar</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          try {
            exportarFretesPDF(fretesFiltrados);
            toast.success(`PDF exportado (${fretesFiltrados.length} registros)`);
          } catch (e: any) {
            toast.error(e?.message || "Erro ao exportar PDF");
          }
        }}
        className="h-10 px-4 rounded-lg bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs gap-1.5"
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">PDF</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          try {
            exportarFretesExcel(fretesFiltrados);
            toast.success(`Excel exportado (${fretesFiltrados.length} registros)`);
          } catch (e: any) {
            toast.error(e?.message || "Erro ao exportar Excel");
          }
        }}
        className="h-10 px-4 rounded-lg bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs gap-1.5"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Excel</span>
      </Button>
      {hasBrokenNames && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCorrigirAcentos}
          disabled={fixingAccents}
          className="h-10 px-4 rounded-lg bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/20 text-xs gap-1.5"
        >
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">{fixingAccents ? "Corrigindo..." : "Corrigir Acentos"}</span>
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleNew}
        className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Novo</span>
      </Button>
    </>
  );

  return (
    <MinimalistLayout
      title="Frete por Cidade"
      subtitle="Gerencie os valores de frete"
      backPath="/logistica/frete"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Logística", path: "/logistica" },
        { label: "Frete", path: "/logistica/frete" },
        { label: "Valores Internos" }
      ]}
      headerActions={headerActions}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      ) : (
        <Card className="bg-white/5 border-blue-500/10 backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-blue-500/10 hover:bg-white/5">
                    <TableHead className="text-xs text-white/70 w-16">Nº</TableHead>
                    <TableHead className="text-xs text-white/70">Cidade</TableHead>
                    <TableHead className="text-xs text-white/70">Km (ida)</TableHead>
                    <TableHead className="text-xs text-white/70">Ida e volta</TableHead>
                    <TableHead className="text-xs text-white/70">Valor</TableHead>
                    <TableHead className="text-right text-xs text-white/70">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fretesFiltrados.map((frete, idx) => {
                    const km = frete.quilometragem ?? 0;
                    const idaVolta = km * 2;
                    const valor = km * 6;
                    return (
                    <TableRow 
                      key={frete.id}
                      className="cursor-pointer border-blue-500/10 hover:bg-white/5 text-white/90"
                    >
                      <TableCell className="font-medium text-white/60">{idx + 1}</TableCell>
                      <TableCell>{frete.cidade} - {frete.estado}</TableCell>
                      <TableCell className="text-white/80">
                        {editingKmId === frete.id ? (
                          <Input
                            ref={kmInputRef}
                            type="number"
                            min={ 0}
                            step={ 0.1}
                            value={kmEditValue}
                            onChange={(e) => setKmEditValue(e.target.value)}
                            onBlur={() => handleSaveKm(frete)}
                            onKeyDown={(e) => handleKmKeyDown(e, frete)}
                            className="h-7 w-24 bg-white/10 border-white/20 text-white text-xs px-2 py-0"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => handleStartKmEdit(frete)}
                            title="Clique para editar"
                          >
                            {frete.quilometragem != null ? `${frete.quilometragem} km` : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {frete.quilometragem != null ? `${idaVolta} km` : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-green-400">
                        {frete.quilometragem != null ? formatCurrency(valor) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
                            onClick={() => handleEdit(frete)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => setDeleteId(frete.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {fretesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-white/50">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-white/30" />
                          <span>Nenhum frete cadastrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <FreteDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        frete={editingFrete}
      />

      <BulkUploadFretesCidades open={bulkOpen} onOpenChange={setBulkOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-black/90 border-white/10 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir este frete? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500/80 hover:bg-red-500 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
