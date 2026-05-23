import { useState, useEffect, useRef } from "react";
import { Search, Plus, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface CustoProduto {
  id: string;
  produto: string;
  custo: number;
  lucro: number;
  preco_sugerido: number | null;
}

type EditingField = { id: string; field: "custo" | "lucro" | "produto" | "preco_sugerido" } | null;

const calcBase = (item: CustoProduto) => item.custo + item.lucro;
const calcImpostos = (item: CustoProduto) => calcBase(item) * 0.10;
const calcComissao = (item: CustoProduto) => calcBase(item) * 0.08;
const calcCartao = (item: CustoProduto) => calcBase(item) * 0.04;
const calcPrecoSugeridoAuto = (item: CustoProduto) => calcBase(item) * 1.22;
const getPrecoSugerido = (item: CustoProduto) => item.preco_sugerido ?? calcPrecoSugeridoAuto(item);

export default function DRECustosDirecao() {
  const [itens, setItens] = useState<CustoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newProduto, setNewProduto] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const fetchItens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("dre_custos_produtos")
        .select("id, produto, custo, lucro, preco_sugerido")
        .order("produto", { ascending: true });
      if (error) throw error;
      setItens((data || []).map(d => ({ ...d, custo: Number(d.custo), lucro: Number(d.lucro), preco_sugerido: d.preco_sugerido != null ? Number(d.preco_sugerido) : null })));
    } catch (error) {
      toast.error("Erro ao carregar produtos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItens(); }, []);

  useEffect(() => {
    if (editingField && inputRef.current) inputRef.current.focus();
  }, [editingField]);

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus();
  }, [addingNew]);

  const handleStartEdit = (item: CustoProduto, field: "custo" | "lucro" | "produto" | "preco_sugerido") => {
    setEditingField({ id: item.id, field });
    if (field === "produto") setEditValue(item.produto);
    else if (field === "preco_sugerido") setEditValue(getPrecoSugerido(item).toString());
    else setEditValue(item[field].toString());
  };

  const handleSave = async () => {
    if (!editingField) return;
    const { id, field } = editingField;

    if (field === "produto") {
      const val = editValue.trim();
      if (!val) { toast.error("Nome não pode ser vazio"); return; }
      try {
        const { error } = await supabase.from("dre_custos_produtos").update({ produto: val }).eq("id", id);
        if (error) throw error;
        setItens(prev => prev.map(i => i.id === id ? { ...i, produto: val } : i));
        toast.success("Produto atualizado");
      } catch { toast.error("Erro ao atualizar"); }
    } else {
      const valor = parseFloat(editValue);
      if (isNaN(valor) || valor < 0) { toast.error("Valor inválido"); return; }
      try {
        const { error } = await supabase.from("dre_custos_produtos").update({ [field]: valor }).eq("id", id);
        if (error) throw error;
        setItens(prev => prev.map(i => i.id === id ? { ...i, [field]: valor } : i));
        toast.success("Valor atualizado");
      } catch { toast.error("Erro ao atualizar"); }
    }
    setEditingField(null);
  };

  const handleCancel = () => setEditingField(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  const handleAddProduto = async () => {
    const nome = newProduto.trim();
    if (!nome) { toast.error("Informe o nome do produto"); return; }
    try {
      const { data, error } = await supabase.from("dre_custos_produtos").insert({ produto: nome }).select("id, produto, custo, lucro, preco_sugerido").single();
      if (error) throw error;
      setItens(prev => [...prev, { ...data, custo: Number(data.custo), lucro: Number(data.lucro), preco_sugerido: data.preco_sugerido != null ? Number(data.preco_sugerido) : null }]);
      setNewProduto("");
      setAddingNew(false);
      toast.success("Produto adicionado");
    } catch { toast.error("Erro ao adicionar produto"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("dre_custos_produtos").delete().eq("id", id);
      if (error) throw error;
      setItens(prev => prev.filter(i => i.id !== id));
      toast.success("Produto removido");
    } catch { toast.error("Erro ao remover produto"); }
  };

  const filtered = itens.filter(i =>
    i.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderEditableCell = (item: CustoProduto, field: "custo" | "lucro" | "produto" | "preco_sugerido", displayValue: string, align: string = "text-right") => {
    if (editingField?.id === item.id && editingField.field === field) {
      return (
        <div className="flex items-center gap-1 justify-end">
          <Input
            ref={inputRef}
            type={field === "produto" ? "text" : "number"}
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-28 h-7 bg-white/10 border-white/20 text-white text-right"
          />
          <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300"><X className="h-3.5 w-3.5" /></button>
        </div>
      );
    }
    return (
      <button
        onClick={() => handleStartEdit(item, field)}
        className={`${align} font-medium text-white hover:text-blue-400 transition-colors cursor-pointer w-full block`}
      >
        {displayValue}
      </button>
    );
  };
  return (
    <MinimalistLayout
      title="Custos de Produtos"
      subtitle="Configure custo, lucro e veja o preço sugerido"
      backPath="/direcao/estrategia/dre"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Direção", path: "/direcao" },
        { label: "DRE", path: "/direcao/estrategia/dre" },
        { label: "Custos" },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            {addingNew ? (
              <div className="flex gap-1 items-center">
                <Input
                  ref={newInputRef}
                  placeholder="Nome do produto"
                  value={newProduto}
                  onChange={(e) => setNewProduto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddProduto(); if (e.key === "Escape") setAddingNew(false); }}
                  className="w-48 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
                <Button size="sm" onClick={handleAddProduto} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setAddingNew(true)} className="bg-white/10 hover:bg-white/20 text-white">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/70 w-12">Nº</TableHead>
                  <TableHead className="text-white/70">PRODUTO</TableHead>
                  <TableHead className="text-white/70 text-right">CUSTO</TableHead>
                  <TableHead className="text-white/70 text-right">LUCRO</TableHead>
                  <TableHead className="text-white/70 text-right">IMPOSTOS 10%</TableHead>
                  <TableHead className="text-white/70 text-right">COMISSÃO 8%</TableHead>
                  <TableHead className="text-white/70 text-right">CARTÃO 4%</TableHead>
                  <TableHead className="text-white/70 text-right">PREÇO SUGERIDO</TableHead>
                  <TableHead className="text-white/70 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-white/50 py-8">Nenhum produto encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((item, index) => (
                    <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white/50 font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        {renderEditableCell(item, "produto", item.produto, "text-left")}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderEditableCell(item, "custo", formatCurrency(item.custo))}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderEditableCell(item, "lucro", formatCurrency(item.lucro))}
                      </TableCell>
                      <TableCell className="text-right text-white/70">{formatCurrency(calcImpostos(item))}</TableCell>
                      <TableCell className="text-right text-white/70">{formatCurrency(calcComissao(item))}</TableCell>
                      <TableCell className="text-right text-white/70">{formatCurrency(calcCartao(item))}</TableCell>
                      <TableCell className="text-right">
                        {renderEditableCell(item, "preco_sugerido", formatCurrency(getPrecoSugerido(item)))}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-400/60 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter className="border-white/10 bg-white/5">
                  <TableRow className="hover:bg-white/5">
                    <TableCell colSpan={2} className="text-right font-bold text-white/80">TOTAIS</TableCell>
                    <TableCell className="text-right font-bold text-white">{formatCurrency(filtered.reduce((s, i) => s + i.custo, 0))}</TableCell>
                    <TableCell className="text-right font-bold text-white">{formatCurrency(filtered.reduce((s, i) => s + i.lucro, 0))}</TableCell>
                    <TableCell className="text-right font-bold text-white/70">{formatCurrency(filtered.reduce((s, i) => s + calcImpostos(i), 0))}</TableCell>
                    <TableCell className="text-right font-bold text-white/70">{formatCurrency(filtered.reduce((s, i) => s + calcComissao(i), 0))}</TableCell>
                    <TableCell className="text-right font-bold text-white/70">{formatCurrency(filtered.reduce((s, i) => s + calcCartao(i), 0))}</TableCell>
                    <TableCell className="text-right font-bold text-white">{formatCurrency(filtered.reduce((s, i) => s + getPrecoSugerido(i), 0))}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      )}
    </MinimalistLayout>
  );
}
