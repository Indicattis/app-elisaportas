import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Check, X, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendasCatalogo, ProdutoCatalogo } from "@/hooks/useVendasCatalogo";

type EditField = "preco_venda" | "custo_produto" | "unidade";

const UNIDADES = ["Unitário", "Metro", "Kg", "Litro"] as const;

const formatCurrency = (value: number) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CatalogoPrecosTabProps {
  compact?: boolean;
}

export function CatalogoPrecosTab({ compact = false }: CatalogoPrecosTabProps = {}) {
  const [busca, setBusca] = useState("");
  const { produtos, isLoading, editarProduto } = useVendasCatalogo({ busca });

  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = (produto: ProdutoCatalogo, field: EditField) => {
    setEditing({ id: produto.id, field });
    setEditValue(String(produto[field] ?? (field === "unidade" ? "Unitário" : 0)));
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.field === "unidade") {
      if (editValue) {
        await editarProduto.mutateAsync({ id: editing.id, unidade: editValue } as any);
      }
    } else {
      const valor = parseFloat(editValue);
      if (!isNaN(valor) && valor >= 0) {
        await editarProduto.mutateAsync({ id: editing.id, [editing.field]: valor } as any);
      }
    }
    setEditing(null);
  };

  const calcMargem = (preco: number, custo: number) => {
    if (!preco || preco <= 0) return null;
    return ((preco - (custo || 0)) / preco) * 100;
  };

  const produtosOrdenados = useMemo(
    () => [...(produtos || [])].sort((a, b) => a.nome_produto.localeCompare(b.nome_produto)),
    [produtos]
  );

  const renderEditableCell = (produto: ProdutoCatalogo, field: "preco_venda" | "custo_produto") => {
    const isEditing = editing?.id === produto.id && editing.field === field;
    const value = produto[field] ?? 0;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Input
            ref={inputRef}
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="w-28 h-7 text-right text-sm bg-white/10 border-white/20 text-white"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={saveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={cancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <span
        className="cursor-pointer text-white/70 hover:text-white hover:underline decoration-dashed underline-offset-4 transition-colors"
        onClick={() => startEdit(produto, field)}
        title="Clique para editar"
      >
        {formatCurrency(value as number)}
      </span>
    );
  };

  const renderUnidadeCell = (produto: ProdutoCatalogo) => {
    const isEditing = editing?.id === produto.id && editing.field === "unidade";
    const value = produto.unidade || "Unitário";
    if (isEditing) {
      return (
        <div className="flex items-center justify-center gap-1">
          <Select
            value={editValue}
            onValueChange={async (val) => {
              setEditValue(val);
              await editarProduto.mutateAsync({ id: produto.id, unidade: val } as any);
              setEditing(null);
            }}
            open
            onOpenChange={(o) => { if (!o) setEditing(null); }}
          >
            <SelectTrigger className="w-32 h-7 bg-white/10 border-white/20 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <span
        className="cursor-pointer text-white/70 hover:text-white hover:underline decoration-dashed underline-offset-4 transition-colors text-xs"
        onClick={() => startEdit(produto, "unidade")}
        title="Clique para editar"
      >
        {value}
      </span>
    );
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-white">Itens do Catálogo</CardTitle>
            <CardDescription className="text-white/50">
              {produtosOrdenados.length} {produtosOrdenados.length === 1 ? "produto" : "produtos"} — clique no preço ou custo para editar
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por nome, descrição ou SKU..."
              className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-white/50">Carregando...</p>
          </div>
        ) : produtosOrdenados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/50">{busca ? "Nenhum produto encontrado" : "Catálogo vazio"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="w-14 text-white/60"></TableHead>
                  <TableHead className="text-white/60">Produto</TableHead>
                  <TableHead className="text-white/60 hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-white/60 hidden lg:table-cell">SKU</TableHead>
                  <TableHead className="text-center text-white/60 hidden md:table-cell">Unidade</TableHead>
                  <TableHead className="text-right text-white/60">Custo</TableHead>
                  <TableHead className="text-right text-white/60">Preço Venda</TableHead>
                  <TableHead className="text-right text-white/60 hidden md:table-cell">Margem</TableHead>
                  <TableHead className="text-center text-white/60 hidden lg:table-cell">Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosOrdenados.map((produto) => {
                  const margem = calcMargem(produto.preco_venda, produto.custo_produto || 0);
                  return (
                    <TableRow key={produto.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="w-10 h-10 rounded bg-white/5 overflow-hidden flex items-center justify-center">
                          {produto.imagem_url ? (
                            <img src={produto.imagem_url} alt={produto.nome_produto} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">{produto.nome_produto}</TableCell>
                      <TableCell className="text-white/60 hidden md:table-cell">{produto.categoria || "—"}</TableCell>
                      <TableCell className="text-white/60 hidden lg:table-cell">{produto.sku || "—"}</TableCell>
                      <TableCell className="text-center hidden md:table-cell">{renderUnidadeCell(produto)}</TableCell>
                      <TableCell className="text-right">{renderEditableCell(produto, "custo_produto")}</TableCell>
                      <TableCell className="text-right">{renderEditableCell(produto, "preco_venda")}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {margem !== null ? (
                          <Badge
                            className={
                              margem >= 30
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : margem >= 10
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                            }
                          >
                            {margem.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            produto.quantidade > 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {produto.quantidade > 0 ? `${produto.quantidade} ${produto.unidade || "un"}` : "Sem estoque"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
