import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { RequisicaoCompraFormData, RequisicaoCompraItem } from "@/hooks/useRequisicoesCompra";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useEstoque } from "@/hooks/useEstoque";

interface RequisicaoCompraFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RequisicaoCompraFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export const RequisicaoCompraForm = ({ 
  open, 
  onOpenChange, 
  onSubmit,
  isSubmitting = false 
}: RequisicaoCompraFormProps) => {
  const { fornecedores } = useFornecedores();
  const { produtos: estoque } = useEstoque();

  const [formData, setFormData] = useState<RequisicaoCompraFormData>({
    fornecedor_id: "",
    data_necessidade: "",
    observacoes: "",
    itens: [],
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        fornecedor_id: "",
        data_necessidade: "",
        observacoes: "",
        itens: [],
      });
    }
  }, [open]);

  const handleAdicionarLinha = () => {
    const novoItem: RequisicaoCompraItem = {
      produto_id: "",
      quantidade: 1,
      valor_unitario: 0,
      ipi_percent: 0,
      codigo_fornecedor: "",
      localizacao: "",
      observacoes: "",
    };
    setFormData((prev) => ({ ...prev, itens: [...prev.itens, novoItem] }));
  };

  const handleAlterarItem = (index: number, patch: Partial<RequisicaoCompraItem>) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.map((it, i) => {
        if (i !== index) return it;
        const merged = { ...it, ...patch };
        if (patch.produto_id) {
          const produto = estoque.find((p) => p.id === patch.produto_id);
          if (produto) {
            merged.produto_nome = produto.nome_produto;
            merged.produto_unidade = produto.unidade;
            merged.produto_sku = (produto as any).sku ?? null;
          }
        }
        return merged;
      }),
    }));
  };

  const handleRemoverItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index),
    }));
  };

  const totais = useMemo(() => {
    let qtd = 0;
    let produtos = 0;
    let ipi = 0;
    formData.itens.forEach((it) => {
      const q = Number(it.quantidade) || 0;
      const vu = Number(it.valor_unitario) || 0;
      const ip = Number(it.ipi_percent) || 0;
      qtd += q;
      produtos += q * vu;
      ipi += q * vu * (ip / 100);
    });
    return { qtd, produtos, ipi, total: produtos + ipi };
  }, [formData.itens]);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.itens.length === 0 || formData.itens.some((it) => !it.produto_id)) {
      return;
    }

    await onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Requisição de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select
                value={formData.fornecedor_id}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, fornecedor_id: value }))
                }
              >
                <SelectTrigger id="fornecedor">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_necessidade">Data de Necessidade</Label>
              <Input
                id="data_necessidade"
                type="date"
                value={formData.data_necessidade}
                onChange={(e) => setFormData(prev => ({ ...prev, data_necessidade: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Itens da Requisição ({formData.itens.length})</h3>
              <Button type="button" size="sm" onClick={handleAdicionarLinha}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
            </div>

            {formData.itens.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Produto *</TableHead>
                      <TableHead className="w-16">Un</TableHead>
                      <TableHead className="w-20">Qtde *</TableHead>
                      <TableHead className="w-28">Valor unit.</TableHead>
                      <TableHead className="w-20">IPI %</TableHead>
                      <TableHead className="w-32">Cód. fornec.</TableHead>
                      <TableHead className="w-32">Localização</TableHead>
                      <TableHead className="min-w-[160px]">Observações</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itens.map((item, index) => {
                      const total =
                        (Number(item.quantidade) || 0) *
                        (Number(item.valor_unitario) || 0) *
                        (1 + (Number(item.ipi_percent) || 0) / 100);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.produto_id}
                              onValueChange={(v) => handleAlterarItem(index, { produto_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {estoque
                                  .filter((p) => p.ativo)
                                  .map((produto) => (
                                    <SelectItem key={produto.id} value={produto.id}>
                                      {produto.nome_produto}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.produto_unidade || "-"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                handleAlterarItem(index, {
                                  quantidade: parseInt(e.target.value) || 1,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.valor_unitario ?? 0}
                              onChange={(e) =>
                                handleAlterarItem(index, {
                                  valor_unitario: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.ipi_percent ?? 0}
                              onChange={(e) =>
                                handleAlterarItem(index, {
                                  ipi_percent: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.codigo_fornecedor ?? ""}
                              onChange={(e) =>
                                handleAlterarItem(index, { codigo_fornecedor: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.localizacao ?? ""}
                              onChange={(e) =>
                                handleAlterarItem(index, { localizacao: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.observacoes ?? ""}
                              onChange={(e) =>
                                handleAlterarItem(index, { observacoes: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {fmtBRL(total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {formData.itens.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm border rounded-lg p-3 bg-muted/30">
                <div><span className="text-muted-foreground">Itens:</span> <strong>{formData.itens.length}</strong></div>
                <div><span className="text-muted-foreground">Qtdes:</span> <strong>{totais.qtd}</strong></div>
                <div><span className="text-muted-foreground">Produtos:</span> <strong>{fmtBRL(totais.produtos)}</strong></div>
                <div><span className="text-muted-foreground">IPI:</span> <strong>{fmtBRL(totais.ipi)}</strong></div>
                <div><span className="text-muted-foreground">Total:</span> <strong>{fmtBRL(totais.total)}</strong></div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                formData.itens.length === 0 ||
                formData.itens.some((it) => !it.produto_id)
              }
            >
              {isSubmitting ? "Criando..." : "Criar Requisição"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
