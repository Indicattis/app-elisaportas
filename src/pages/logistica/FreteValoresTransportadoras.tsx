import { useState } from "react";
import { Plus, Truck, MapPinned } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTransportadoras } from "@/hooks/useTransportadoras";
import { useFreteRegioes, type FreteRegiao } from "@/hooks/useFreteRegioes";
import { useLargurasKits } from "@/hooks/useFreteRegiaoLarguras";
import { RegiaoFormDialog } from "@/components/logistica/RegiaoFormDialog";
import { RegiaoCard } from "@/components/logistica/RegiaoCard";

export default function FreteValoresTransportadoras() {
  const { transportadoras } = useTransportadoras();
  const [selectedTransportadora, setSelectedTransportadora] = useState<string>("");
  const { regioes, isLoading, saveRegiao, deleteRegiao } = useFreteRegioes(selectedTransportadora || undefined);
  const { data: larguras = [] } = useLargurasKits();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FreteRegiao | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: FreteRegiao) => { setEditing(r); setDialogOpen(true); };

  const headerActions = (
    <>
      <Select value={selectedTransportadora} onValueChange={setSelectedTransportadora}>
        <SelectTrigger className="w-52 bg-white/5 border-white/10 text-white h-10">
          <SelectValue placeholder="Selecione transportadora" />
        </SelectTrigger>
        <SelectContent>
          {(transportadoras ?? []).filter(t => t.ativo).map(t => (
            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTransportadora && (
        <Button size="sm" onClick={openNew}
          className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova região</span>
        </Button>
      )}
    </>
  );

  return (
    <MinimalistLayout
      title="Valores Transportadoras"
      subtitle="Regiões de atendimento e preços por largura"
      backPath="/logistica/frete"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Logística", path: "/logistica" },
        { label: "Frete", path: "/logistica/frete" },
        { label: "Valores Transportadoras" },
      ]}
      headerActions={headerActions}
    >
      {!selectedTransportadora ? (
        <div className="flex items-center justify-center h-64 text-white/50">
          <div className="flex flex-col items-center gap-2">
            <Truck className="h-8 w-8 text-white/30" />
            <span>Selecione uma transportadora</span>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
        </div>
      ) : regioes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-2xl bg-primary/10"><MapPinned className="h-7 w-7 text-primary" /></div>
          <div>
            <div className="text-white font-medium">Nenhuma região cadastrada</div>
            <div className="text-xs text-white/50 mt-1">Crie uma região escolhendo cidades dentro de cada estado.</div>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground mt-2">
            <Plus className="h-4 w-4 mr-1.5" /> Nova região
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {regioes.map(r => (
            <RegiaoCard
              key={r.id}
              regiao={r}
              larguras={larguras}
              onEdit={() => openEdit(r)}
              onDelete={() => setDeleteId(r.id)}
            />
          ))}
        </div>
      )}

      <RegiaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        outrasRegioes={regioes}
        onSave={(data) => saveRegiao.mutateAsync(data)}
        saving={saveRegiao.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-black/90 border-white/10 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir região</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              As cidades e preços por largura desta região serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-white/10 text-white hover:bg-white/15">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (deleteId) { await deleteRegiao.mutateAsync(deleteId); setDeleteId(null); } }}
              className="bg-red-500/80 hover:bg-red-500 text-white">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
