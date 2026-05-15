import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, ArrowLeft, Save, Search, Zap } from "lucide-react";
import { useRequisicoesCompra, RequisicaoCompraFormData, RequisicaoCompraItem } from "@/hooks/useRequisicoesCompra";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useEstoque } from "@/hooks/useEstoque";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { toast } from "sonner";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function NovaRequisicaoCompra() {
  const navigate = useNavigate();
  const { fornecedores } = useFornecedores();
  const { produtos: estoque } = useEstoque();
  const { createRequisicao, isCreating } = useRequisicoesCompra();

  const [formData, setFormData] = useState<RequisicaoCompraFormData>({
    fornecedor_id: "",
    data_necessidade: "",
    observacoes: "",
    itens: [],
  });

  const [pendingFornecedorChange, setPendingFornecedorChange] = useState<string | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickIndex, setQuickIndex] = useState(0);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const fornecedorAtual = useMemo(
    () => fornecedores.find((f) => f.id === formData.fornecedor_id) || null,
    [fornecedores, formData.fornecedor_id]
  );
  const codigoFornecedorStr = fornecedorAtual ? String(fornecedorAtual.codigo) : "";

  const itensDoFornecedor = useMemo(
    () =>
      estoque.filter(
        (p) => p.ativo && formData.fornecedor_id && p.fornecedor_id === formData.fornecedor_id
      ),
    [estoque, formData.fornecedor_id]
  );

  const quickMatches = useMemo(() => {
    const term = quickSearch.trim().toLowerCase();
    if (!term) return [];
    return itensDoFornecedor
      .filter((p) => {
        const nome = (p.nome_produto || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return nome.includes(term) || sku.includes(term);
      })
      .slice(0, 8);
  }, [itensDoFornecedor, quickSearch]);

  const adicionarProdutoRapido = (produto: any) => {
    const novo: RequisicaoCompraItem = {
      produto_id: produto.id,
      produto_nome: produto.nome_produto,
      produto_unidade: produto.unidade,
      produto_sku: produto.sku ?? null,
      quantidade: 1,
      valor_unitario: Number(produto.custo_unitario) || 0,
      ipi_percent: Number(produto.ipi_percent) || 0,
      codigo_fornecedor: codigoFornecedorStr,
      localizacao: "",
      observacoes: "",
    };
    setFormData((prev) => ({ ...prev, itens: [...prev.itens, novo] }));
    setQuickSearch("");
    setQuickIndex(0);
    setTimeout(() => quickInputRef.current?.focus(), 0);
  };

  const handleSelectFornecedor = (value: string) => {
    if (formData.itens.length > 0 && value !== formData.fornecedor_id) {
      setPendingFornecedorChange(value);
      return;
    }
    const novo = fornecedores.find((f) => f.id === value);
    const codigo = novo ? String(novo.codigo) : "";
    setFormData((prev) => ({
      ...prev,
      fornecedor_id: value,
      itens: prev.itens.map((it) => ({ ...it, codigo_fornecedor: codigo })),
    }));
  };

  const confirmFornecedorChange = () => {
    if (pendingFornecedorChange) {
      setFormData((prev) => ({
        ...prev,
        fornecedor_id: pendingFornecedorChange,
        itens: [],
      }));
      setPendingFornecedorChange(null);
    }
  };

  const handleAdicionarLinha = () => {
    if (!formData.fornecedor_id) {
      toast.error("Selecione um fornecedor primeiro");
      return;
    }
    const novoItem: RequisicaoCompraItem = {
      produto_id: "",
      quantidade: 1,
      valor_unitario: 0,
      ipi_percent: 0,
      codigo_fornecedor: codigoFornecedorStr,
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
          const produto: any = estoque.find((p) => p.id === patch.produto_id);
          if (produto) {
            merged.produto_nome = produto.nome_produto;
            merged.produto_unidade = produto.unidade;
            merged.produto_sku = produto.sku ?? null;
            merged.ipi_percent = Number(produto.ipi_percent) || 0;
            merged.valor_unitario = Number(produto.custo_unitario) || 0;
          }
          merged.codigo_fornecedor = codigoFornecedorStr;
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

  const handleSalvar = async () => {
    if (!formData.fornecedor_id) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (formData.itens.length === 0 || formData.itens.some((it) => !it.produto_id)) {
      toast.error("Adicione ao menos um item válido");
      return;
    }
    try {
      await createRequisicao(formData);
      navigate("/administrativo/compras/requisicoes");
    } catch (e) {
      // toast já tratado no hook
    }
  };

  const breadcrumbItems = [
    { label: "Home", path: "/home" },
    { label: "Administrativo", path: "/administrativo" },
    { label: "Compras", path: "/administrativo/compras" },
    { label: "Requisições", path: "/administrativo/compras/requisicoes" },
    { label: "Nova" },
  ];

  const headerActions = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/administrativo/compras/requisicoes")}
        className="border-white/10 text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Cancelar
      </Button>
      <Button
        size="sm"
        onClick={handleSalvar}
        disabled={isCreating}
        className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
      >
        <Save className="h-4 w-4 mr-2" />
        {isCreating ? "Salvando..." : "Salvar Requisição"}
      </Button>
    </div>
  );

  return (
    <MinimalistLayout
      title="Nova Requisição de Compra"
      subtitle="Cadastre uma nova requisição"
      backPath="/administrativo/compras/requisicoes"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6">
        {/* Dados gerais */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-5 rounded-lg space-y-4">
            <h3 className="font-semibold text-white">Dados gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Fornecedor *</Label>
                <Select value={formData.fornecedor_id} onValueChange={handleSelectFornecedor}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Data de Necessidade</Label>
                <Input
                  type="date"
                  value={formData.data_necessidade}
                  onChange={(e) => setFormData((p) => ({ ...p, data_necessidade: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-5 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">
                Itens da Requisição ({formData.itens.length})
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={handleAdicionarLinha}
                disabled={!formData.fornecedor_id}
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 disabled:opacity-50"
                title={!formData.fornecedor_id ? "Selecione um fornecedor primeiro" : ""}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
            </div>

            {!formData.fornecedor_id && (
              <p className="text-sm text-white/40">
                Selecione um fornecedor para liberar a lista de itens disponíveis.
              </p>
            )}

            {formData.fornecedor_id && itensDoFornecedor.length === 0 && (
              <p className="text-sm text-amber-300/80">
                Este fornecedor não possui itens cadastrados no estoque.
              </p>
            )}

            {formData.fornecedor_id && itensDoFornecedor.length > 0 && (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 focus-within:border-blue-400/50">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <Input
                    ref={quickInputRef}
                    value={quickSearch}
                    onChange={(e) => {
                      setQuickSearch(e.target.value);
                      setQuickIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setQuickIndex((i) => Math.min(i + 1, quickMatches.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setQuickIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const sel = quickMatches[quickIndex];
                        if (sel) adicionarProdutoRapido(sel);
                      } else if (e.key === "Escape") {
                        setQuickSearch("");
                      }
                    }}
                    placeholder="Inserção rápida: digite SKU ou nome e pressione Enter…"
                    className="border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    ↵ adicionar
                  </span>
                </div>
                {quickSearch && quickMatches.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-xl overflow-hidden">
                    {quickMatches.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          adicionarProdutoRapido(p);
                        }}
                        onMouseEnter={() => setQuickIndex(i)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 ${
                          i === quickIndex ? "bg-blue-500/20 text-white" : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Search className="h-3.5 w-3.5 text-white/40 shrink-0" />
                          <span className="truncate">{p.nome_produto}</span>
                        </span>
                        <span className="text-xs text-white/40 shrink-0">
                          {p.sku ? `SKU ${p.sku} · ` : ""}{p.unidade}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {quickSearch && quickMatches.length === 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-sm text-white/50">
                    Nenhum item encontrado para “{quickSearch}”.
                  </div>
                )}
              </div>
            )}

            {formData.itens.length > 0 && (
              <div className="border border-white/10 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="min-w-[220px] text-xs font-medium text-white/60">Produto *</TableHead>
                      <TableHead className="w-16 text-xs font-medium text-white/60">Un</TableHead>
                      <TableHead className="w-20 text-xs font-medium text-white/60">Qtde *</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-white/60">Valor unit.</TableHead>
                      <TableHead className="w-20 text-xs font-medium text-white/60">IPI %</TableHead>
                      <TableHead className="w-32 text-xs font-medium text-white/60">Cód. fornec.</TableHead>
                      <TableHead className="w-32 text-xs font-medium text-white/60">Localização</TableHead>
                      <TableHead className="min-w-[160px] text-xs font-medium text-white/60">Observações</TableHead>
                      <TableHead className="w-28 text-right text-xs font-medium text-white/60">Total</TableHead>
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
                        <TableRow key={index} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <Select
                              value={item.produto_id}
                              onValueChange={(v) => handleAlterarItem(index, { produto_id: v })}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {itensDoFornecedor.map((produto) => (
                                  <SelectItem key={produto.id} value={produto.id}>
                                    {produto.nome_produto}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
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
                              className="bg-white/5 border-white/10 text-white"
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
                              className="bg-white/5 border-white/10 text-white"
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
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.codigo_fornecedor ?? ""}
                              readOnly
                              tabIndex={-1}
                              className="bg-white/[0.03] border-white/10 text-white/70 cursor-not-allowed"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.localizacao ?? ""}
                              onChange={(e) =>
                                handleAlterarItem(index, { localizacao: e.target.value })
                              }
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.observacoes ?? ""}
                              onChange={(e) =>
                                handleAlterarItem(index, { observacoes: e.target.value })
                              }
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-white">
                            {fmtBRL(total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverItem(index)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm rounded-lg p-3 bg-white/5 border border-white/10 text-white">
                <div><span className="text-white/60">Itens:</span> <strong>{formData.itens.length}</strong></div>
                <div><span className="text-white/60">Qtdes:</span> <strong>{totais.qtd}</strong></div>
                <div><span className="text-white/60">Produtos:</span> <strong>{fmtBRL(totais.produtos)}</strong></div>
                <div><span className="text-white/60">IPI:</span> <strong>{fmtBRL(totais.ipi)}</strong></div>
                <div><span className="text-white/60">Total:</span> <strong>{fmtBRL(totais.total)}</strong></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendingFornecedorChange}
        onOpenChange={(o) => !o && setPendingFornecedorChange(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Trocar fornecedor?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Os itens já adicionados serão removidos pois pertencem ao fornecedor anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFornecedorChange}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white"
            >
              Trocar e limpar itens
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}