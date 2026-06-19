import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useContratosOrcamentos } from "@/hooks/useContratosOrcamentos";
import { Upload, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamentoId: string;
}

export function UploadContratoOrcamentoModal({ open, onOpenChange, orcamentoId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const { uploadContrato, isUploading } = useContratosOrcamentos({ orcamentoId });

  useEffect(() => { if (!open) setFile(null); }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são permitidos'); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo: 10MB'); return; }
    setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Selecione o arquivo'); return; }
    uploadContrato(
      { file, orcamentoId },
      { onSuccess: () => { onOpenChange(false); setFile(null); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular Contrato ao Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload-orc">Arquivo do Contrato (PDF) *</Label>
            <div className="flex items-center gap-2">
              <Input id="file-upload-orc" type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" required />
              {file && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileCheck className="h-4 w-4" />
                  <span className="truncate max-w-[160px]">{file.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Apenas PDF, máximo 10MB</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Enviando...' : (<><Upload className="h-4 w-4 mr-2" />Vincular Contrato</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}