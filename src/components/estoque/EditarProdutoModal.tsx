import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProdutoEstoque } from "@/hooks/useEstoque";
import { useCategorias } from "@/hooks/useCategorias";
import { useSubcategorias } from "@/hooks/useSubcategorias";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useState, useEffect } from "react";

interface EditarProdutoModalProps {
  produto: ProdutoEstoque | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar: (id: string, data: any) => Promise<void>;
}

export function EditarProdutoModal({ produto, open, onOpenChange, onEditar }: EditarProdutoModalProps) {
  const { categorias } = useCategorias();
  const { fornecedores } = useFornecedores();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const { subcategorias } = useSubcategorias(categoriaSelecionada || undefined);
  const [formData, setFormData] = useState({
    nome_produto: "",
    descricao_produto: "",
    quantidade: 0,
    quantidade_ideal: 0,
    unidade: "UN",
    categoria: "geral",
    custo_unitario: 0,
    subcategoria_id: null as string | null,
    peso_porta: null as number | null,
    setor_responsavel_producao: null as 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura' | null,
    fornecedor_id: null as string | null,
    codigo_fornecedor: "" as string,
    ipi_percent: 0 as number,
  });

  useEffect(() => {
    if (produto) {
      setFormData({
        nome_produto: produto.nome_produto,
        descricao_produto: produto.descricao_produto || "",
        quantidade: produto.quantidade,
        quantidade_ideal: produto.quantidade_ideal,
        unidade: produto.unidade,
        categoria: produto.categoria,
        custo_unitario: produto.custo_unitario,
        subcategoria_id: produto.subcategoria_id,
        peso_porta: produto.peso_porta,
        setor_responsavel_producao: produto.setor_responsavel_producao,
        fornecedor_id: produto.fornecedor_id,
        codigo_fornecedor: (produto as any).codigo_fornecedor || "",
        ipi_percent: Number((produto as any).ipi_percent) || 0,
      });

      const catId = categorias.find(c => c.nome.toLowerCase() === produto.categoria.toLowerCase())?.id;
      setCategoriaSelecionada(catId || null);
    }
  }, [produto, categorias]);

  const handleSubmit = async () => {
    if (!produto) return;
    await onEditar(produto.id, {
      ...formData,
      codigo_fornecedor: formData.codigo_fornecedor || null,
      ipi_percent: Number(formData.ipi_percent) || 0,
    });
    onOpenChange(false);
  };

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Produto</Label>
            <Input 
              value={formData.nome_produto} 
              onChange={(e) => setFormData({...formData, nome_produto: e.target.value})} 
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input 
              value={formData.descricao_produto} 
              onChange={(e) => setFormData({...formData, descricao_produto: e.target.value})} 
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select 
              value={formData.categoria} 
              onValueChange={(value) => {
                setFormData({...formData, categoria: value, subcategoria_id: null});
                const catId = categorias.find(c => c.nome.toLowerCase() === value.toLowerCase())?.id;
                setCategoriaSelecionada(catId || null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.nome.toLowerCase()}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subcategoria</Label>
            <Select 
              value={formData.subcategoria_id || "nenhuma"} 
              onValueChange={(value) => setFormData({
                ...formData, 
                subcategoria_id: value === "nenhuma" ? null : value
              })}
              disabled={!categoriaSelecionada}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma subcategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {subcategorias.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!categoriaSelecionada && (
              <p className="text-xs text-muted-foreground mt-1">
                Selecione uma categoria primeiro
              </p>
            )}
          </div>
          <div>
            <Label>Peso de Porta Recomendado (kg)</Label>
            <Input 
              type="number"
              step="0.01"
              placeholder="Ex: 150.5"
              value={formData.peso_porta || ""} 
              onChange={(e) => setFormData({
                ...formData, 
                peso_porta: e.target.value ? parseFloat(e.target.value) : null
              })} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe vazio se não aplicável
            </p>
          </div>
          <div>
            <Label>Setor Responsável pela Produção</Label>
            <Select 
              value={formData.setor_responsavel_producao || "nenhum"} 
              onValueChange={(value) => setFormData({
                ...formData, 
                setor_responsavel_producao: value === "nenhum" ? null : value as any
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                <SelectItem value="perfiladeira">Perfiladeira</SelectItem>
                <SelectItem value="solda">Solda</SelectItem>
                <SelectItem value="separacao">Separação</SelectItem>
                <SelectItem value="pintura">Pintura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input 
                type="number" 
                value={formData.quantidade} 
                onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})} 
              />
            </div>
            <div>
              <Label>Quantidade Ideal</Label>
              <Input 
                type="number" 
                value={formData.quantidade_ideal} 
                onChange={(e) => setFormData({...formData, quantidade_ideal: parseInt(e.target.value) || 0})} 
              />
            </div>
          </div>
          <div>
            <Label>Unidade</Label>
            <Select
              value={formData.unidade}
              onValueChange={(value) => setFormData({...formData, unidade: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UN">Unidade (UN)</SelectItem>
                <SelectItem value="KG">Quilograma (KG)</SelectItem>
                <SelectItem value="L">Litro (L)</SelectItem>
                <SelectItem value="M">Metro (M)</SelectItem>
                <SelectItem value="M2">Metro Quadrado (M²)</SelectItem>
                <SelectItem value="CX">Caixa (CX)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Custo Unitário (R$)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.custo_unitario} 
              onChange={(e) => setFormData({...formData, custo_unitario: parseFloat(e.target.value) || 0})} 
            />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Select 
              value={formData.fornecedor_id || "nenhum"} 
              onValueChange={(value) => setFormData({
                ...formData, 
                fornecedor_id: value === "nenhum" ? null : value
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {fornecedores.map((fornecedor) => (
                  <SelectItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código no Fornecedor</Label>
              <Input
                value={formData.codigo_fornecedor}
                onChange={(e) => setFormData({ ...formData, codigo_fornecedor: e.target.value })}
              />
            </div>
            <div>
              <Label>IPI (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.ipi_percent}
                onChange={(e) => setFormData({ ...formData, ipi_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">Salvar</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
