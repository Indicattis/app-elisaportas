import { useState, useEffect } from "react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, GripVertical, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CanaisAquisicaoService } from "@/services/canaisAquisicaoService";
import type { CanalAquisicao } from "@/hooks/useCanaisAquisicao";

export default function CanaisAquisicaoMinimalista() {
  const [canais, setCanais] = useState<CanalAquisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [canalToDelete, setCanalToDelete] = useState<CanalAquisicao | null>(null);
  const [editingCanal, setEditingCanal] = useState<CanalAquisicao | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    ordem: 0,
    ativo: true,
    pago: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCanais();
  }, []);

  const fetchCanais = async () => {
    try {
      setLoading(true);
      const data = await CanaisAquisicaoService.getAll();
      setCanais(data || []);
    } catch (error) {
      console.error("Erro ao buscar canais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os canais de aquisição.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", ordem: 0, ativo: true, pago: false });
    setEditingCanal(null);
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do canal é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (editingCanal) {
        await CanaisAquisicaoService.update(editingCanal.id, formData);
        toast({
          title: "Sucesso",
          description: "Canal atualizado com sucesso!"
        });
      } else {
        await CanaisAquisicaoService.create(formData);
        toast({
          title: "Sucesso",
          description: "Canal criado com sucesso!"
        });
      }
      resetForm();
      fetchCanais();
    } catch (error) {
      console.error("Erro ao salvar canal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o canal.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (canal: CanalAquisicao) => {
    setEditingCanal(canal);
    setFormData({
      nome: canal.nome,
      ordem: canal.ordem,
      ativo: canal.ativo,
      pago: canal.pago
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!canalToDelete) return;

    try {
      await CanaisAquisicaoService.delete(canalToDelete.id);
      toast({
        title: "Sucesso",
        description: "Canal excluído com sucesso!"
      });
      fetchCanais();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o canal.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setCanalToDelete(null);
    }
  };

  const handleToggleAtivo = async (canal: CanalAquisicao) => {
    try {
      await CanaisAquisicaoService.update(canal.id, { ativo: !canal.ativo });
      toast({
        title: "Sucesso",
        description: canal.ativo ? "Canal desativado." : "Canal ativado."
      });
      fetchCanais();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do canal.",
        variant: "destructive"
      });
    }
  };

  return (
    <MinimalistLayout
      title="Canais de Aquisição"
      subtitle="Gerencie os canais de aquisição de clientes"
      backPath="/marketing/investimentos"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Marketing", path: "/marketing" },
        { label: "Investimentos", path: "/marketing/investimentos" },
        { label: "Canais de Aquisição" }
      ]}
      headerActions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Canal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingCanal ? "Editar Canal" : "Novo Canal de Aquisição"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {editingCanal 
                  ? "Atualize as informações do canal de aquisição."
                  : "Preencha as informações do novo canal de aquisição."
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-white">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Google Ads, Instagram, Indicação..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ordem" className="text-white">Ordem de exibição</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Canal Ativo</Label>
                  <p className="text-sm text-white/60">O canal será exibido nas opções de seleção</p>
                </div>
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Canal Pago</Label>
                  <p className="text-sm text-white/60">Indica se há investimento em marketing neste canal</p>
                </div>
                <Switch
                  checked={formData.pago}
                  onCheckedChange={(checked) => setFormData({ ...formData, pago: checked })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCanal ? "Salvar Alterações" : "Criar Canal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : canais.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-white/60 mb-4">Nenhum canal de aquisição cadastrado.</p>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro canal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {canais.map((canal) => (
              <Card 
                key={canal.id} 
                className={`bg-white/5 border-white/10 backdrop-blur-xl transition-opacity ${
                  !canal.ativo ? 'opacity-50' : ''
                }`}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-5 h-5 text-white/30 cursor-grab" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{canal.nome}</span>
                        {canal.pago && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Pago
                          </Badge>
                        )}
                        {!canal.ativo && (
                          <Badge variant="secondary" className="bg-white/10 text-white/60">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-white/50">Ordem: {canal.ordem}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAtivo(canal)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      {canal.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(canal)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCanalToDelete(canal);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir Canal</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir o canal "{canalToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
              <br /><br />
              <strong className="text-yellow-400">Atenção:</strong> Se houver leads ou vendas associadas a este canal, 
              a exclusão não será permitida. Use a opção "Desativar" em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
