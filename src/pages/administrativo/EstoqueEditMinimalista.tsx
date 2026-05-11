import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";
import { useSubcategorias } from "@/hooks/useSubcategorias";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useEstoque } from "@/hooks/useEstoque";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MinimalistLayout } from "@/components/MinimalistLayout";
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

export default function EstoqueEditMinimalista() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { editarProduto, excluirProduto, buscarMovimentacoes } = useEstoque();
  const { categorias } = useCategorias();
  const { subcategorias } = useSubcategorias();
  const { fornecedores } = useFornecedores();

  const [formData, setFormData] = useState<{
    nome_produto: string;
    descricao_produto: string;
    setor_responsavel_producao: string;
  }>({
    nome_produto: "",
    descricao_produto: "",
    setor_responsavel_producao: "",
  });

  const [dadosCarregados, setDadosCarregados] = useState(false);

  const { data: produto, isLoading } = useQuery({
    queryKey: ["produto", id],
    queryFn: async () => {
      if (!id) throw new Error("ID não fornecido");
      
      const { data, error } = await supabase
        .from("estoque")
        .select(`
          *,
          subcategoria:estoque_subcategorias(id, nome),
          fornecedor:fornecedores(id, nome)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Produto não encontrado");
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (produto && !dadosCarregados) {
      const newFormData = {
        nome_produto: produto.nome_produto || "",
        descricao_produto: produto.descricao_produto || "",
        setor_responsavel_producao: produto.setor_responsavel_producao || "",
      };
      
      setFormData(newFormData);
      setDadosCarregados(true);
    }
  }, [produto, dadosCarregados]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dadosParaSalvar = {
        id: id!,
        nome_produto: formData.nome_produto,
        descricao_produto: formData.descricao_produto || undefined,
        setor_responsavel_producao: (formData.setor_responsavel_producao || null) as 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null,
      };
      
      await editarProduto(dadosParaSalvar);
      queryClient.invalidateQueries({ queryKey: ["produto", id] });

      toast({
        title: "Produto atualizado",
        description: "As informações do produto foram atualizadas com sucesso.",
      });

      navigate("/administrativo/compras/estoque");
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const { data: movimentacoes = [], isLoading: loadingMovimentacoes } = 
    buscarMovimentacoes(id || undefined);

  const handleExcluir = async () => {
    if (!id) return;
    
    try {
      await excluirProduto(id);
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
      navigate("/administrativo/compras/estoque");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Administrativo', path: '/administrativo' },
    { label: 'Compras', path: '/administrativo/compras' },
    { label: 'Estoque', path: '/administrativo/compras/estoque' },
    { label: 'Editar Item' }
  ];

  if (isLoading || !dadosCarregados) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-white/60">Carregando dados do produto...</p>
      </div>
    );
  }

  return (
    <MinimalistLayout
      title="Editar Produto"
      subtitle="Visualize e modifique as informações do produto"
      backPath="/administrativo/compras/estoque"
      breadcrumbItems={breadcrumbItems}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do Produto */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-6 rounded-lg space-y-6">
            <h3 className="text-lg font-semibold text-white">Informações do Produto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_produto" className="text-white/80">Nome do Produto *</Label>
                <Input
                  id="nome_produto"
                  value={formData.nome_produto}
                  onChange={(e) => setFormData({ ...formData, nome_produto: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setor_responsavel_producao" className="text-white/80">Setor de Produção</Label>
                <Select
                  value={formData.setor_responsavel_producao || undefined}
                  onValueChange={(value) => setFormData({ ...formData, setor_responsavel_producao: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="perfiladeira">Perfiladeira</SelectItem>
                    <SelectItem value="soldagem">Soldagem</SelectItem>
                    <SelectItem value="separacao">Separação</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_produto" className="text-white/80">Descrição</Label>
              <Textarea
                id="descricao_produto"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                rows={3}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Produto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExcluir} className="bg-red-500 hover:bg-red-600">
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/administrativo/compras/estoque")}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>

        {/* Histórico de Movimentações */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-6 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Histórico de Movimentações</h3>
            </div>
            <p className="text-sm text-white/60">Todas as movimentações deste produto no estoque</p>
            
            {loadingMovimentacoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : movimentacoes.length === 0 ? (
              <p className="text-center text-white/40 py-8">
                Nenhuma movimentação registrada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Data</TableHead>
                    <TableHead className="text-white/60">Tipo</TableHead>
                    <TableHead className="text-white/60">Quantidade</TableHead>
                    <TableHead className="text-white/60">Estoque Anterior</TableHead>
                    <TableHead className="text-white/60">Estoque Novo</TableHead>
                    <TableHead className="text-white/60">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((mov: any) => (
                    <TableRow key={mov.id} className="border-white/10">
                      <TableCell className="text-white">
                        {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={mov.tipo_movimentacao === "entrada" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                        }>
                          {mov.tipo_movimentacao === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{mov.quantidade}</TableCell>
                      <TableCell className="text-white">{mov.quantidade_anterior}</TableCell>
                      <TableCell className="text-white">{mov.quantidade_nova}</TableCell>
                      <TableCell className="text-white/60">
                        {mov.observacoes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </form>
    </MinimalistLayout>
  );
}
