import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, History } from "lucide-react";
import { RegrasEtiquetasEditor } from "@/components/estoque/RegrasEtiquetasEditor";
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
    requer_pintura: boolean;
    modulo_calculo: string;
    valor_calculo: number;
    eixo_calculo: string;
    item_padrao_porta_enrolar: boolean;
    quantidade_padrao: number;
    qtd_eixo_calculo: string;
    qtd_operador: string;
    qtd_valor_calculo: number;
    qtd_modo_calculo: 'formula' | 'por_tamanho';
    qtd_porta_p: number | null;
    qtd_porta_g: number | null;
    qtd_porta_gg: number | null;
  }>({
    nome_produto: "",
    descricao_produto: "",
    setor_responsavel_producao: "",
    requer_pintura: false,
    modulo_calculo: "",
    valor_calculo: 0,
    eixo_calculo: "",
    item_padrao_porta_enrolar: false,
    quantidade_padrao: 1,
    qtd_eixo_calculo: "",
    qtd_operador: "",
    qtd_valor_calculo: 0,
    qtd_modo_calculo: 'formula',
    qtd_porta_p: null,
    qtd_porta_g: null,
    qtd_porta_gg: null,
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
        requer_pintura: produto.requer_pintura === true,
        modulo_calculo: produto.modulo_calculo || "",
        valor_calculo: Number(produto.valor_calculo) || 0,
        eixo_calculo: produto.eixo_calculo || "",
        item_padrao_porta_enrolar: produto.item_padrao_porta_enrolar === true,
        quantidade_padrao: (produto as any).quantidade_padrao ?? 1,
        qtd_eixo_calculo: (produto as any).qtd_eixo_calculo || "",
        qtd_operador: (produto as any).qtd_operador || "",
        qtd_valor_calculo: Number((produto as any).qtd_valor_calculo) || 0,
        qtd_modo_calculo: ((produto as any).qtd_modo_calculo === 'por_tamanho' ? 'por_tamanho' : 'formula') as 'formula' | 'por_tamanho',
        qtd_porta_p: (produto as any).qtd_porta_p ?? null,
        qtd_porta_g: (produto as any).qtd_porta_g ?? null,
        qtd_porta_gg: (produto as any).qtd_porta_gg ?? null,
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
        requer_pintura: formData.requer_pintura,
        modulo_calculo: (formData.modulo_calculo || null) as 'acrescimo' | 'desconto' | null,
        valor_calculo: formData.valor_calculo != null ? formData.valor_calculo : null,
        eixo_calculo: (formData.eixo_calculo || null) as 'largura' | 'altura' | null,
        item_padrao_porta_enrolar: formData.item_padrao_porta_enrolar,
        quantidade_padrao: formData.quantidade_padrao,
        qtd_eixo_calculo: (formData.qtd_eixo_calculo || null) as 'largura' | 'altura' | 'qtd_meia_cana' | null,
        qtd_operador: (formData.qtd_operador || null) as 'multiplicar' | 'dividir' | 'somar' | 'subtrair' | null,
        qtd_valor_calculo: formData.qtd_valor_calculo || null,
        qtd_modo_calculo: formData.qtd_modo_calculo,
        qtd_porta_p: formData.qtd_modo_calculo === 'por_tamanho' ? formData.qtd_porta_p : null,
        qtd_porta_g: formData.qtd_modo_calculo === 'por_tamanho' ? formData.qtd_porta_g : null,
        qtd_porta_gg: formData.qtd_modo_calculo === 'por_tamanho' ? formData.qtd_porta_gg : null,
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

            <div className="flex items-center space-x-2 p-4 rounded-lg bg-white/5 border border-white/10">
              <input
                type="checkbox"
                id="requer_pintura"
                checked={formData.requer_pintura}
                onChange={(e) => setFormData({ ...formData, requer_pintura: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <Label htmlFor="requer_pintura" className="cursor-pointer font-medium text-white">
                Este item requer pintura na produção
              </Label>
            </div>

            {/* Seção de Cálculo Automático */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
              <h4 className="font-medium text-white">Configurações de Cálculo Automático</h4>
              <p className="text-sm text-white/60">
                Configure o cálculo automático do tamanho do item em relação às dimensões da porta.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modulo_calculo" className="text-white/80">Módulo de Cálculo</Label>
                  <Select
                    value={formData.modulo_calculo || undefined}
                    onValueChange={(value) => setFormData({ ...formData, modulo_calculo: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="acrescimo">Acréscimo</SelectItem>
                      <SelectItem value="desconto">Desconto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valor_calculo" className="text-white/80">Valor de Cálculo (m)</Label>
                  <Input
                    id="valor_calculo"
                    type="number"
                    step="0.01"
                    value={formData.valor_calculo}
                    onChange={(e) => setFormData({ ...formData, valor_calculo: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 0.14"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eixo_calculo" className="text-white/80">Eixo de Cálculo</Label>
                  <Select
                    value={formData.eixo_calculo || undefined}
                    onValueChange={(value) => setFormData({ ...formData, eixo_calculo: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="largura">Largura</SelectItem>
                      <SelectItem value="altura">Altura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                <input
                  type="checkbox"
                  id="item_padrao_porta_enrolar"
                  checked={formData.item_padrao_porta_enrolar}
                  onChange={(e) => setFormData({ ...formData, item_padrao_porta_enrolar: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-white/5"
                />
                <Label htmlFor="item_padrao_porta_enrolar" className="cursor-pointer font-medium text-white">
                  Item padrão para porta de enrolar (será sugerido automaticamente nos pedidos)
                </Label>
              </div>

              <div className="space-y-2 pt-3">
                <Label htmlFor="quantidade_padrao" className="text-white/80">Quantidade padrão</Label>
                <Input
                  id="quantidade_padrao"
                  type="number"
                  min={1}
                  value={formData.quantidade_padrao}
                  onChange={(e) => setFormData({ ...formData, quantidade_padrao: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10 text-white w-32"
                />
                <p className="text-xs text-white/40">Quantidade inserida automaticamente ao adicionar este item a um pedido</p>
              </div>

              {/* Cálculo automático de quantidade */}
              <div className="space-y-4 pt-3 border-t border-white/10">
                <div>
                  <h5 className="font-medium text-white text-sm">Cálculo automático de quantidade</h5>
                  <p className="text-xs text-white/40 mt-1">
                    Quando configurado, a quantidade será calculada com base nas dimensões da porta ao inserir o item no pedido. Se não configurado, será usada a quantidade padrão acima.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qtd_eixo_calculo" className="text-white/80">Eixo</Label>
                    <Select
                      value={formData.qtd_eixo_calculo || undefined}
                      onValueChange={(value) => setFormData({ ...formData, qtd_eixo_calculo: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione o eixo" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="largura">Largura</SelectItem>
                        <SelectItem value="altura">Altura</SelectItem>
                        <SelectItem value="qtd_meia_cana">Qtd Meia Cana (⌈Altura÷0.076⌉)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="qtd_operador" className="text-white/80">Operador</Label>
                    <Select
                      value={formData.qtd_operador || undefined}
                      onValueChange={(value) => setFormData({ ...formData, qtd_operador: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="multiplicar">Multiplicar</SelectItem>
                        <SelectItem value="dividir">Dividir</SelectItem>
                        <SelectItem value="somar">Somar</SelectItem>
                        <SelectItem value="subtrair">Subtrair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="qtd_valor_calculo" className="text-white/80">Valor</Label>
                    <Input
                      id="qtd_valor_calculo"
                      type="number"
                      step="0.01"
                      value={formData.qtd_valor_calculo}
                      onChange={(e) => setFormData({ ...formData, qtd_valor_calculo: parseFloat(e.target.value) || 0 })}
                      placeholder="Ex: 0.10"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                {formData.qtd_eixo_calculo && formData.qtd_operador && formData.qtd_valor_calculo ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-300">
                      Fórmula: {formData.qtd_eixo_calculo === 'largura' ? 'Largura' : formData.qtd_eixo_calculo === 'qtd_meia_cana' ? 'Qtd Meia Cana (⌈Altura÷0.076⌉)' : 'Altura'} da porta{' '}
                      {formData.qtd_operador === 'multiplicar' ? '×' : formData.qtd_operador === 'dividir' ? '÷' : formData.qtd_operador === 'somar' ? '+' : '−'}{' '}
                      {formData.qtd_valor_calculo} → arredondado para cima
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                      onClick={() => setFormData({ ...formData, qtd_eixo_calculo: "", qtd_operador: "", qtd_valor_calculo: 0 })}
                    >
                      Limpar
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Regras de Etiquetas */}
            {id && (
              <RegrasEtiquetasEditor 
                estoqueId={id} 
                nomeProduto={formData.nome_produto} 
              />
            )}

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
