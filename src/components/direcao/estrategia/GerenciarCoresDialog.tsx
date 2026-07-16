import { useState } from "react";
import { Palette, Plus, Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCatalogoCores, CatalogoCorInput } from "@/hooks/useCatalogoCores";

interface GerenciarCoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GerenciarCoresDialog({ open, onOpenChange }: GerenciarCoresDialogProps) {
  const { cores, isLoading, adicionarCor, editarCor, toggleAtiva } = useCatalogoCores();

  const [formOpen, setFormOpen] = useState(false);
  const [corEditando, setCorEditando] = useState<any>(null);
  const [formData, setFormData] = useState<CatalogoCorInput>({
    nome: "",
    codigo_hex: "#000000",
    ativa: true,
  });

  const resetForm = () => {
    setFormData({ nome: "", codigo_hex: "#000000", ativa: true });
    setCorEditando(null);
  };

  const handleOpenNova = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEditar = (cor: any) => {
    setCorEditando(cor);
    setFormData({ nome: cor.nome, codigo_hex: cor.codigo_hex, ativa: cor.ativa });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) return;
    if (corEditando) {
      await editarCor.mutateAsync({ id: corEditando.id, ...formData });
    } else {
      await adicionarCor.mutateAsync(formData);
    }
    resetForm();
    setFormOpen(false);
  };

  const isPending = adicionarCor.isPending || editarCor.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-popover text-popover-foreground border-border">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle>Cores da Pintura Epóxi</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {cores.length} cor{cores.length !== 1 ? "es" : ""} cadastrada{cores.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button onClick={handleOpenNova} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Cor
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cores.length === 0 ? (
            <div className="text-center py-20">
              <Palette className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma cor cadastrada</p>
              <p className="text-muted-foreground/60 text-sm">Adicione sua primeira cor clicando em "Nova Cor"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cores.map((cor) => (
                <div
                  key={cor.id}
                  className={`bg-card/40 border border-border rounded-xl overflow-hidden backdrop-blur-xl hover:bg-card/60 hover:border-primary/40 transition-all group ${!cor.ativa ? "opacity-50" : ""}`}
                >
                  <div
                    className="aspect-square relative cursor-pointer"
                    style={{ backgroundColor: cor.codigo_hex }}
                    onClick={() => handleOpenEditar(cor)}
                  >
                    {!cor.ativa && (
                      <Badge className="absolute top-2 left-2 bg-black/50 text-white text-xs">Inativa</Badge>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Pencil className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-foreground truncate">{cor.nome}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-xs text-muted-foreground uppercase">{cor.codigo_hex}</code>
                      <Switch
                        checked={cor.ativa}
                        onCheckedChange={(checked) => toggleAtiva.mutate({ id: cor.id, ativa: checked })}
                        className="scale-75"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) resetForm(); setFormOpen(o); }}>
        <DialogContent className="bg-popover text-popover-foreground border-border">
          <DialogHeader>
            <DialogTitle>{corEditando ? "Editar Cor" : "Nova Cor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-lg border border-border shadow-inner flex-shrink-0"
                style={{ backgroundColor: formData.codigo_hex }}
              />
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Nome da Cor *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Azul Royal"
                    className="bg-card/60 border-border"
                  />
                </div>
                <div>
                  <Label>Código HEX *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.codigo_hex}
                      onChange={(e) => setFormData({ ...formData, codigo_hex: e.target.value })}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.codigo_hex}
                      onChange={(e) => setFormData({ ...formData, codigo_hex: e.target.value })}
                      placeholder="#000000"
                      className="flex-1 bg-card/60 border-border"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Cor ativa</Label>
              <Switch
                checked={formData.ativa}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {corEditando ? "Salvar Alterações" : "Adicionar Cor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}