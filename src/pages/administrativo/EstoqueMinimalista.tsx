import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Tags, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEstoque, ProdutoEstoque } from "@/hooks/useEstoque";
import { useCategorias } from "@/hooks/useCategorias";
import { useSubcategorias } from "@/hooks/useSubcategorias";
import { useFornecedores } from "@/hooks/useFornecedores";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { toast } from "sonner";
import { baixarEstoquePDF, imprimirEstoquePDF } from "@/utils/estoquePDFGenerator";

export default function EstoqueMinimalista() {
  const navigate = useNavigate();
  const { produtos, loading, adicionarProduto } = useEstoque();
  const { categorias } = useCategorias();
  const { subcategorias } = useSubcategorias();
  const { fornecedores } = useFornecedores();
  
  const [novoModal, setNovoModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("estoque_searchTerm") || "");

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    sessionStorage.setItem("estoque_searchTerm", value);
  };
  const [formData, setFormData] = useState({
    nome_produto: "",
    descricao_produto: "",
    categoria: "",
    subcategoria_id: "",
    quantidade: 0,
    quantidade_ideal: 0,
    custo_unitario: 0,
    unidade: "UN",
    setor_responsavel_producao: "",
    fornecedor_id: "",
    requer_pintura: false,
    modulo_calculo: "",
    valor_calculo: 0,
    eixo_calculo: "",
    item_padrao_porta_enrolar: false,
  });

  const getCategoriaColor = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.cor || "#6b7280";
  };

  const getCategoriaLabel = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || categoriaId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await adicionarProduto({
        nome_produto: formData.nome_produto,
        descricao_produto: formData.descricao_produto || null,
        quantidade: formData.quantidade,
        quantidade_ideal: formData.quantidade_ideal,
        custo_unitario: formData.custo_unitario,
        unidade: formData.unidade,
        categoria: formData.categoria || null,
        subcategoria_id: formData.subcategoria_id || null,
        setor_responsavel_producao: formData.setor_responsavel_producao ? formData.setor_responsavel_producao as any : null,
        fornecedor_id: formData.fornecedor_id || null,
        requer_pintura: formData.requer_pintura,
        modulo_calculo: formData.modulo_calculo ? formData.modulo_calculo as any : null,
        valor_calculo: formData.valor_calculo || null,
        eixo_calculo: formData.eixo_calculo ? formData.eixo_calculo as any : null,
        item_padrao_porta_enrolar: formData.item_padrao_porta_enrolar,
      });
      
      setFormData({
        nome_produto: "",
        descricao_produto: "",
        categoria: "",
        subcategoria_id: "",
        quantidade: 0,
        quantidade_ideal: 0,
        custo_unitario: 0,
        unidade: "UN",
        setor_responsavel_producao: "",
        fornecedor_id: "",
        requer_pintura: false,
        modulo_calculo: "",
        valor_calculo: 0,
        eixo_calculo: "",
        item_padrao_porta_enrolar: false,
      });
      setNovoModal(false);
      toast.success("Produto adicionado com sucesso");
    } catch (error) {
      toast.error("Erro ao adicionar produto");
    }
  };

  const handleDoubleClick = (produtoId: string) => {
    navigate(`/administrativo/compras/estoque/editar-item/${produtoId}`);
  };

  const handleDownloadPDF = () => {
    const categoriasMap: Record<string, string> = {};
    categorias.forEach(cat => {
      categoriasMap[cat.id] = cat.nome;
    });
    
    const produtosFiltrados = produtos.filter(p => 
      !searchTerm || 
      p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    baixarEstoquePDF({
      produtos: produtosFiltrados,
      categoriasMap,
    });
    
    toast.success("PDF gerado com sucesso!");
  };

  const handlePrint = () => {
    const categoriasMap: Record<string, string> = {};
    categorias.forEach(cat => {
      categoriasMap[cat.id] = cat.nome;
    });
    
    const produtosFiltrados = produtos.filter(p => 
      !searchTerm || 
      p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    imprimirEstoquePDF({
      produtos: produtosFiltrados,
      categoriasMap,
    });
  };

  const headerActions = (
    <div className="flex gap-2 flex-wrap">
      <Button 
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button 
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir
      </Button>
      <Button 
        variant="outline"
        size="sm"
        onClick={() => navigate("/dashboard/administrativo/compras/estoque/regras-etiquetas")}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
      >
        <Tags className="mr-2 h-4 w-4" />
        Etiquetas
      </Button>
      <Dialog open={novoModal} onOpenChange={setNovoModal}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Produto</DialogTitle>
            <DialogDescription className="text-white/60">
              Preencha os dados do novo produto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_produto">Nome do Produto</Label>
                <Input
                  id="nome_produto"
                  value={formData.nome_produto}
                  onChange={(e) => setFormData({ ...formData, nome_produto: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => {
                    setFormData({ ...formData, categoria: value, subcategoria_id: "" });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.categoria && (
              <div className="space-y-2">
                <Label htmlFor="subcategoria_id">Subcategoria</Label>
                <Select
                  value={formData.subcategoria_id}
                  onValueChange={(value) => setFormData({ ...formData, subcategoria_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {subcategorias
                      .filter((sub) => sub.categoria_id === formData.categoria)
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descricao_produto">Descrição</Label>
              <Input
                id="descricao_produto"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_ideal">Qtd. Ideal</Label>
                <Input
                  id="quantidade_ideal"
                  type="number"
                  value={formData.quantidade_ideal}
                  onChange={(e) => setFormData({ ...formData, quantidade_ideal: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="M²">M²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo_unitario">Custo Unitário</Label>
              <Input
                id="custo_unitario"
                type="number"
                step="0.01"
                value={formData.custo_unitario}
                onChange={(e) => setFormData({ ...formData, custo_unitario: Number(e.target.value) })}
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setor_responsavel_producao">Setor Responsável</Label>
                <Select
                  value={formData.setor_responsavel_producao}
                  onValueChange={(value) => setFormData({ ...formData, setor_responsavel_producao: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="perfiladeira">Perfiladeira</SelectItem>
                    <SelectItem value="soldagem">Soldagem</SelectItem>
                    <SelectItem value="separacao">Separação</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fornecedor_id">Fornecedor</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {fornecedores.map((forn) => (
                      <SelectItem key={forn.id} value={forn.id}>
                        {forn.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requer_pintura"
                checked={formData.requer_pintura}
                onChange={(e) => setFormData({ ...formData, requer_pintura: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <Label htmlFor="requer_pintura" className="cursor-pointer">
                Este item requer pintura
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoModal(false)} className="border-white/10 text-white hover:bg-white/10">
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Administrativo', path: '/administrativo' },
    { label: 'Compras', path: '/administrativo/compras' },
    { label: 'Estoque' }
  ];

  return (
    <MinimalistLayout
      title="Estoque"
      subtitle="Gerencie os produtos do estoque"
      backPath="/administrativo/compras"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-4">
        {/* Barra de busca */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-4 rounded-lg">
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <p className="text-xs text-white/40 mt-2">
              Dica: Clique duas vezes em um item para editá-lo
            </p>
          </div>
        </div>

        {/* Tabela */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-white/60">Produto</TableHead>
                  <TableHead className="text-right text-xs font-medium text-white/60">Quantidade</TableHead>
                  <TableHead className="text-right text-xs font-medium text-white/60">Custo Unitário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={3} className="text-center py-8 text-sm text-white/40">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : produtos.filter(p => 
                    !searchTerm || 
                    p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.descricao_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={3} className="text-center py-8 text-sm text-white/40">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos
                    .filter(p => 
                      !searchTerm || 
                      p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.descricao_produto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((produto) => (
                    <TableRow 
                      key={produto.id}
                      className="cursor-pointer border-white/10 hover:bg-white/5 transition-colors"
                      onDoubleClick={() => handleDoubleClick(produto.id)}
                    >
                      <TableCell className="px-3 py-2">
                        <div>
                          <div className="font-medium text-sm text-white">{produto.nome_produto}</div>
                          {produto.descricao_produto && (
                            <div className="text-xs text-white/40 line-clamp-1">
                              {produto.descricao_produto}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-3 py-2 text-white">
                        {produto.quantidade} <span className="text-white/40 text-xs">{produto.unidade}</span>
                      </TableCell>
                      <TableCell className="text-right px-3 py-2 text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.custo_unitario || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </MinimalistLayout>
  );
}
