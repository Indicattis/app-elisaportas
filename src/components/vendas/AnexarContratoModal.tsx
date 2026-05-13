import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSignature, Upload, Loader2, FileCheck2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AnexarContratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  clienteNome: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_SIZE_MB = 10;

export function AnexarContratoModal({ open, onOpenChange, vendaId, clienteNome }: AnexarContratoModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error("Formato inválido. Aceito: PDF, JPG, PNG.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo do contrato.");
      return;
    }
    try {
      setIsUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const ext = file.name.split(".").pop() || "bin";
      const path = `${vendaId}/${Date.now()}-contrato.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("contratos-vendas")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("vendas")
        .update({
          contrato_url: path,
          contrato_assinado_em: new Date().toISOString(),
          contrato_anexado_por: userId,
        } as any)
        .eq("id", vendaId);

      if (updErr) throw updErr;

      toast.success("Contrato anexado! Venda enviada para faturamento.");
      queryClient.invalidateQueries({ queryKey: ["vendas-assinatura-contrato"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-pendente-faturamento"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-pendente-pedido"] });
      setFile(null);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Erro ao anexar contrato:", e);
      toast.error(e?.message || "Erro ao anexar contrato");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isUploading) { onOpenChange(o); if (!o) setFile(null); } }}>
      <DialogContent className="sm:max-w-md bg-slate-950/80 backdrop-blur-xl border-white/10 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.15),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileSignature className="h-5 w-5 text-blue-400" />
            Anexar Contrato Assinado
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Cliente: <span className="text-white/90 font-medium">{clienteNome}</span>
            <br />
            Após anexar, a venda avança automaticamente para Pendente de Faturamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg border-2 border-dashed border-white/15 hover:border-blue-400/40 hover:bg-white/5 transition-all"
            >
              <Upload className="h-8 w-8 text-blue-400/70" />
              <span className="text-sm text-white/80">Clique para selecionar o contrato</span>
              <span className="text-[11px] text-white/40">PDF, JPG ou PNG · até {MAX_SIZE_MB} MB</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-400/30">
              <FileCheck2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <p className="text-[11px] text-white/50">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUploading}
                onClick={() => setFile(null)}
                className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><FileSignature className="h-4 w-4 mr-2" /> Anexar e enviar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}