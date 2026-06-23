import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCriteriosNegociacao, useObservacoesNegociacao, CriterioNegociacao } from "@/hooks/useCriteriosNegociacao";
import { ArrowLeft, Plus, Edit, Trash2, Loader2, MapPin, Save, ExternalLink, FileSignature } from "lucide-react";
import { gerarContratoAutorizado } from "@/utils/gerarContratoAutorizado";

interface Autorizado {
  id: string;
  nome: string;
  responsavel: string | null;
  cidade: string | null;
  estado: string | null;
}

export default function AutorizadoNegociacao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState<Autorizado | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCriterio, setEditingCriterio] = useState<CriterioNegociacao | null>(null);
  const [criterioForm, setCriterioForm] = useState({ criterio: '', valor: '' });
  const [observacoesLocal, setObservacoesLocal] = useState('');

  const { criterios, isLoading: criteriosLoading, addCriterio, updateCriterio, deleteCriterio } = useCriteriosNegociacao(id || '');
  const { observacoes, isLoading: observacoesLoading, updateObservacoes } = useObservacoesNegociacao(id || '');

  useEffect(() => {
    if (id) {
      fetchAutorizado();
    }
  }, [id]);

  useEffect(() => {
    setObservacoesLocal(observacoes);
  }, [observacoes]);

  const fetchAutorizado = async () => {
    try {
      const { data, error } = await supabase
        .from('autorizados')
        .select('id, nome, responsavel, cidade, estado')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAutorizado(data);
    } catch (error) {
      console.error('Erro ao buscar autorizado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (criterio?: CriterioNegociacao) => {
    if (criterio) {
      setEditingCriterio(criterio);
      setCriterioForm({ criterio: criterio.criterio, valor: criterio.valor });
    } else {
      setEditingCriterio(null);
      setCriterioForm({ criterio: '', valor: '' });
    }
    setDialogOpen(true);
  };

  const handleSaveCriterio = async () => {
    if (!criterioForm.criterio.trim() || !criterioForm.valor.trim()) return;

    if (editingCriterio) {
      await updateCriterio.mutateAsync({
        id: editingCriterio.id,
        criterio: criterioForm.criterio,
        valor: criterioForm.valor,
      });
    } else {
      await addCriterio.mutateAsync(criterioForm);
    }

    setDialogOpen(false);
    setCriterioForm({ criterio: '', valor: '' });
    setEditingCriterio(null);
  };

  const handleDeleteCriterio = async (criterioId: string) => {
    await deleteCriterio.mutateAsync(criterioId);
  };

  const handleSaveObservacoes = async () => {
    await updateObservacoes.mutateAsync(observacoesLocal);
  };

  if (loading || criteriosLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Autorizado não encontrado</p>
        <Button onClick={() => navigate('/dashboard/vendas/parceiros/autorizados')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/vendas/parceiros/autorizados')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Critérios de Negociação</h1>
          <p className="text-muted-foreground">
            Gerencie os critérios e condições comerciais
          </p>
        </div>
      </div>

      {/* Info do Autorizado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{autorizado.nome}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {autorizado.responsavel && <span>{autorizado.responsavel}</span>}
                {autorizado.cidade && autorizado.estado && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {autorizado.cidade}, {autorizado.estado}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/parceiros/${id}/edit/autorizado`)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Editar Cadastro
            </Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={() => id && gerarContratoAutorizado(id)}>
              <FileSignature className="h-4 w-4 mr-2" />
              Gerar Contrato
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Critérios de Negociação */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Critérios de Negociação</CardTitle>
              <CardDescription>Condições comerciais acordadas com o parceiro</CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Critério
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {criterios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum critério cadastrado. Clique em "Novo Critério" para adicionar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Critério</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criterios.map((criterio) => (
                  <TableRow key={criterio.id}>
                    <TableCell className="font-medium">{criterio.criterio}</TableCell>
                    <TableCell>{criterio.valor}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(criterio)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir critério?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCriterio(criterio.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações gerais sobre a negociação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Digite observações sobre a negociação..."
            value={observacoesLocal}
            onChange={(e) => setObservacoesLocal(e.target.value)}
            rows={5}
          />
          <Button 
            onClick={handleSaveObservacoes} 
            disabled={updateObservacoes.isPending || observacoesLocal === observacoes}
          >
            {updateObservacoes.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Observações
          </Button>
        </CardContent>
      </Card>

      {/* Dialog para adicionar/editar critério */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCriterio ? 'Editar Critério' : 'Novo Critério'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="criterio">Critério</Label>
              <Input
                id="criterio"
                placeholder="Ex: Desconto máximo"
                value={criterioForm.criterio}
                onChange={(e) => setCriterioForm(prev => ({ ...prev, criterio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                placeholder="Ex: 15%"
                value={criterioForm.valor}
                onChange={(e) => setCriterioForm(prev => ({ ...prev, valor: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCriterio} 
              disabled={addCriterio.isPending || updateCriterio.isPending || !criterioForm.criterio.trim() || !criterioForm.valor.trim()}
            >
              {(addCriterio.isPending || updateCriterio.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
