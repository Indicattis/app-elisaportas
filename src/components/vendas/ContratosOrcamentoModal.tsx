import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, FilePlus, Upload, FileCheck, Clock, HardDrive, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useContratosOrcamentos } from "@/hooks/useContratosOrcamentos";
import { GerarContratoElisaOrcamentoModal } from "@/components/contratos/GerarContratoElisaOrcamentoModal";
import { UploadContratoOrcamentoModal } from "@/components/contratos/UploadContratoOrcamentoModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamentoId: string;
}

export function ContratosOrcamentoModal({ open, onOpenChange, orcamentoId }: Props) {
  const [gerarOpen, setGerarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { contratos, isLoading, deleteContrato, isDeleting } = useContratosOrcamentos({ orcamentoId });

  const formatDate = (s: string) => format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const formatFileSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span>Contratos do Orçamento</span>
                  {contratos && contratos.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({contratos.length} {contratos.length === 1 ? 'contrato' : 'contratos'})
                    </span>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-3 mt-4">
              <Button onClick={() => setGerarOpen(true)} variant="outline" className="flex-1 h-11 bg-background/80 hover:bg-background border-dashed">
                <FilePlus className="w-4 h-4 mr-2" />Gerar Contrato
              </Button>
              <Button onClick={() => setUploadOpen(true)} variant="outline" className="flex-1 h-11 bg-background/80 hover:bg-background border-dashed">
                <Upload className="w-4 h-4 mr-2" />Vincular Contrato
              </Button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando contratos...</span>
              </div>
            ) : contratos && contratos.length > 0 ? (
              <div className="space-y-3">
                {contratos.map((c: any) => (
                  <div key={c.id} className={cn("group bg-card border rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-accent/30")}>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
                        <FileCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate pr-2" title={c.nome_arquivo}>{c.nome_arquivo}</h3>
                        {c.template?.nome && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Template: <span className="text-foreground/80">{c.template.nome}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDate(c.created_at)}</div>
                          <div className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />{formatFileSize(c.tamanho_arquivo)}</div>
                        </div>
                        {c.observacoes && (
                          <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2">{c.observacoes}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <Button onClick={() => window.open(c.arquivo_url, '_blank')} size="sm" variant="ghost" className="h-9 px-3">
                          <ExternalLink className="w-4 h-4 mr-1.5" />Abrir
                        </Button>
                        <Button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = c.arquivo_url; a.download = c.nome_arquivo; a.target = '_blank';
                            document.body.appendChild(a); a.click(); a.remove();
                          }}
                          size="sm" variant="default" className="h-9 px-3"
                        >
                          <Download className="w-4 h-4 mr-1.5" />Baixar
                        </Button>
                        <Button
                          onClick={() => { if (confirm('Excluir este contrato?')) deleteContrato(c.id); }}
                          size="sm" variant="ghost" className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <FileText className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Nenhum contrato vinculado</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Este orçamento ainda não possui contratos. Gere um novo contrato ou faça upload de um arquivo existente.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GerarContratoElisaOrcamentoModal open={gerarOpen} onOpenChange={setGerarOpen} orcamentoId={orcamentoId} />
      <UploadContratoOrcamentoModal open={uploadOpen} onOpenChange={setUploadOpen} orcamentoId={orcamentoId} />
    </>
  );
}