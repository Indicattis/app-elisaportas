import { useRef, useState } from "react";
import { FileCheck2, Eye, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ParceiroTable = "autorizados" | "representantes";

interface ContratoParceiroManagerProps {
  parceiroId: string;
  table: ParceiroTable;
  tipo: "autorizado" | "franqueado" | "representante";
  contratoUrl: string | null;
  contratoNome: string | null;
  contratoTamanho: number | null;
  onChanged: (contrato: { url: string | null; nome: string | null; tamanho: number | null }) => void;
}

const BUCKET = "contratos-autorizados";
const MAX_SIZE = 20 * 1024 * 1024;

function formatSize(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function storagePath(value: string | null) {
  if (!value) return null;
  const marker = `/${BUCKET}/`;
  const markerIndex = value.indexOf(marker);
  return markerIndex >= 0 ? decodeURIComponent(value.slice(markerIndex + marker.length)) : value;
}

export function ContratoParceiroManager({
  parceiroId,
  table,
  tipo,
  contratoUrl,
  contratoNome,
  contratoTamanho,
  onChanged,
}: ContratoParceiroManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("O contrato deve ter no máximo 20 MB.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const newPath = `${tipo}/${parceiroId}/${Date.now()}-${safeName}`;
    const previousPath = storagePath(contratoUrl);
    setBusy(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from(table)
        .update({
          contrato_url: newPath,
          contrato_nome_arquivo: file.name,
          contrato_tamanho_arquivo: file.size,
          contrato_uploaded_at: new Date().toISOString(),
        })
        .eq("id", parceiroId);
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([newPath]);
        throw updateError;
      }

      if (previousPath && previousPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
      onChanged({ url: newPath, nome: file.name, tamanho: file.size });
      toast.success(contratoUrl ? "Contrato substituído." : "Contrato anexado.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível anexar o contrato.");
    } finally {
      setBusy(false);
    }
  };

  const handleView = async () => {
    const path = storagePath(contratoUrl);
    if (!path) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível abrir o contrato.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    const path = storagePath(contratoUrl);
    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from(table)
        .update({
          contrato_url: null,
          contrato_nome_arquivo: null,
          contrato_tamanho_arquivo: null,
          contrato_uploaded_at: null,
        })
        .eq("id", parceiroId);
      if (updateError) throw updateError;
      if (path) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
        if (removeError) throw removeError;
      }
      onChanged({ url: null, nome: null, tamanho: null });
      toast.success("Contrato removido.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível remover o contrato.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs uppercase text-white/50">Contrato</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${contratoUrl ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300" : "border-amber-400/20 bg-amber-500/15 text-amber-300"}`}>
          {contratoUrl ? "Anexado" : "Pendente"}
        </span>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleSelect} />
      {contratoUrl ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{contratoNome || "Contrato.pdf"}</p>
            {formatSize(contratoTamanho) && <p className="text-xs text-white/40">{formatSize(contratoTamanho)}</p>}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={handleView} disabled={busy}>
            <Eye className="mr-2 h-4 w-4" /> Visualizar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Substituir
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="icon" variant="ghost" disabled={busy} aria-label="Remover contrato">
                <Trash2 className="h-4 w-4 text-red-300" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-white/10 bg-black/95 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Remover contrato?</AlertDialogTitle>
                <AlertDialogDescription>O arquivo será excluído e o parceiro voltará a ficar com contrato pendente.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? "Enviando..." : "Anexar contrato em PDF"}
        </Button>
      )}
    </section>
  );
}