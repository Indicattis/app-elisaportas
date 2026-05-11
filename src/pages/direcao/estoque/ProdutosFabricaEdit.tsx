import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useEstoque } from "@/hooks/useEstoque";
import { useMateriasPrimas } from "@/hooks/useMateriasPrimas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Trash2, Package, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RegrasEtiquetasEditor } from "@/components/estoque/RegrasEtiquetasEditor";

const UNIDADES = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "M", label: "Metro (M)" },
  { value: "M2", label: "Metro² (M²)" },
  { value: "L", label: "Litro (L)" },
  { value: "CX", label: "Caixa (CX)" },
];

export default function ProdutosFabricaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const BACK_PATH = window.location.pathname.startsWith("/fabrica/produtos")
    ? "/fabrica/produtos"
    : "/direcao/estoque/configuracoes/produtos/fabrica";
  const queryClient = useQueryClient();
  const { fornecedores } = useFornecedores();
  const { excluirProduto } = useEstoque();
  const { materiasPrimas } = useMateriasPrimas();

  const [formData, setFormData] = useState({
    nome_produto: "",
    descricao_produto: "",
    quantidade: 0,
    quantidade_ideal: 0,
    quantidade_maxima: 0,
    custo_unitario: 0,
    unidade: "UN",
    fornecedor_id: "",
    conferir_estoque: true,
    materia_prima_id: "",
    materia_prima_conversao: 0,
    requer_pintura: false,
    modulo_calculo: "" as "" | "acrescimo" | "desconto",
    valor_calculo: 0,
    eixo_calculo: "" as "" | "largura" | "altura",
    item_padrao_porta_enrolar: false,
    quantidade_padrao: 1,
    qtd_eixo_calculo: "" as "" | "largura" | "altura" | "qtd_meia_cana",
    qtd_operador: "" as "" | "multiplicar" | "dividir" | "somar" | "subtrair",
    qtd_valor_calculo: 0,
    qtd_modo_calculo: "formula" as "formula" | "por_tamanho",
    qtd_porta_p: null as number | null,
    qtd_porta_g: null as number | null,
    qtd_porta_gg: null as number | null,
    setor_responsavel_producao: "" as "" | "perfiladeira" | "soldagem" | "separacao" | "pintura",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Buscar produto
  const { data: produto, isLoading } = useQuery({
    queryKey: ["estoque-produto", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque")
        .select("*, fornecedor:fornecedores(id, nome)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Buscar movimentações
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["estoque-movimentacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estoque_movimentacoes")
        .select("*")
        .eq("produto_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (produto) {
      setFormData({
        nome_produto: produto.nome_produto || "",
        descricao_produto: produto.descricao_produto || "",
        quantidade: produto.quantidade || 0,
        quantidade_ideal: produto.quantidade_ideal || 0,
        quantidade_maxima: produto.quantidade_maxima || 0,
        custo_unitario: produto.custo_unitario || 0,
        unidade: produto.unidade || "UN",
        fornecedor_id: produto.fornecedor_id || "",
        conferir_estoque: produto.conferir_estoque ?? true,
        materia_prima_id: (produto as any).materia_prima_id || "",
        materia_prima_conversao: Number((produto as any).materia_prima_conversao) || 0,
        requer_pintura: (produto as any).requer_pintura === true,
        modulo_calculo: ((produto as any).modulo_calculo || "") as any,
        valor_calculo: Number((produto as any).valor_calculo) || 0,
        eixo_calculo: ((produto as any).eixo_calculo || "") as any,
        item_padrao_porta_enrolar: (produto as any).item_padrao_porta_enrolar === true,
        quantidade_padrao: (produto as any).quantidade_padrao ?? 1,
        qtd_eixo_calculo: ((produto as any).qtd_eixo_calculo || "") as any,
        qtd_operador: ((produto as any).qtd_operador || "") as any,
        qtd_valor_calculo: Number((produto as any).qtd_valor_calculo) || 0,
        qtd_modo_calculo: ((produto as any).qtd_modo_calculo === "por_tamanho" ? "por_tamanho" : "formula"),
        qtd_porta_p: (produto as any).qtd_porta_p ?? null,
        qtd_porta_g: (produto as any).qtd_porta_g ?? null,
        qtd_porta_gg: (produto as any).qtd_porta_gg ?? null,
        setor_responsavel_producao: ((produto as any).setor_responsavel_producao || "") as any,
      });
    }
  }, [produto]);

  const handleSave = async () => {
    if (!formData.nome_produto.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("estoque")
        .update({
          nome_produto: formData.nome_produto,
          descricao_produto: formData.descricao_produto || null,
          quantidade_ideal: formData.quantidade_ideal,
          quantidade_maxima: formData.quantidade_maxima,
          custo_unitario: formData.custo_unitario,
          unidade: formData.unidade,
          fornecedor_id: formData.fornecedor_id || null,
          conferir_estoque: formData.conferir_estoque,
          materia_prima_id: formData.materia_prima_id || null,
          materia_prima_conversao: formData.materia_prima_id
            ? formData.materia_prima_conversao || null
            : null,
          requer_pintura: formData.requer_pintura,
          modulo_calculo: (formData.modulo_calculo || null) as any,
          valor_calculo: formData.valor_calculo || null,
          eixo_calculo: (formData.eixo_calculo || null) as any,
          item_padrao_porta_enrolar: formData.item_padrao_porta_enrolar,
          quantidade_padrao: formData.quantidade_padrao,
          qtd_eixo_calculo: (formData.qtd_eixo_calculo || null) as any,
          qtd_operador: (formData.qtd_operador || null) as any,
          qtd_valor_calculo: formData.qtd_valor_calculo || null,
          qtd_modo_calculo: formData.qtd_modo_calculo,
          qtd_porta_p: formData.qtd_modo_calculo === "por_tamanho" ? formData.qtd_porta_p : null,
          qtd_porta_g: formData.qtd_modo_calculo === "por_tamanho" ? formData.qtd_porta_g : null,
          qtd_porta_gg: formData.qtd_modo_calculo === "por_tamanho" ? formData.qtd_porta_gg : null,
          setor_responsavel_producao: (formData.setor_responsavel_producao || null) as any,
        })
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["estoque-produto", id] });
      toast.success("Produto atualizado com sucesso!");
      navigate(BACK_PATH);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await excluirProduto(id!);
      navigate(BACK_PATH);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  // Indicador de status do estoque
  const getStockStatus = () => {
    const { quantidade, quantidade_ideal, quantidade_maxima } = formData;
    
    if (quantidade < quantidade_ideal) {
      return { color: "destructive", icon: TrendingDown, text: "Estoque Baixo", description: "Abaixo do mínimo" };
    }
    if (quantidade_maxima > 0 && quantidade > quantidade_maxima) {
      return { color: "secondary", icon: TrendingUp, text: "Estoque Alto", description: "Acima do máximo" };
    }
    return { color: "default", icon: CheckCircle2, text: "Estoque Normal", description: "Dentro do ideal" };
  };

  const stockStatus = getStockStatus();

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Direção', path: '/direcao' },
    { label: 'Estoque', path: '/direcao/estoque' },
    { label: 'Configurações', path: '/direcao/estoque/configuracoes' },
    { label: 'Produtos', path: '/direcao/estoque/configuracoes/produtos' },
    { label: 'Fábrica', path: '/direcao/estoque/configuracoes/produtos/fabrica' },
    { label: 'Editar' }
  ];

  if (isLoading) {
    return (
      <MinimalistLayout title="Carregando..." breadcrumbItems={breadcrumbItems}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MinimalistLayout>
    );
  }

  if (!produto) {
    return (
      <MinimalistLayout title="Produto não encontrado" breadcrumbItems={breadcrumbItems}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Produto não encontrado</p>
          <Button variant="outline" onClick={() => navigate(BACK_PATH)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </MinimalistLayout>
    );
  }

  return (
    <MinimalistLayout 
      title="Editar Produto" 
      backPath={BACK_PATH}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(BACK_PATH)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Produto</h1>
              <p className="text-muted-foreground text-sm">Gerencie as informações de estoque</p>
            </div>
          </div>
          <Badge variant={stockStatus.color as any} className="gap-1">
            <stockStatus.icon className="h-3 w-3" />
            {stockStatus.text}
          </Badge>
        </div>

        {/* Informações do Produto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_produto">Nome do Produto *</Label>
              <Input
                id="nome_produto"
                value={formData.nome_produto}
                onChange={(e) => setFormData({ ...formData, nome_produto: e.target.value })}
                placeholder="Nome do produto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao_produto">Descrição</Label>
              <Textarea
                id="descricao_produto"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                placeholder="Descrição do produto (opcional)"
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="conferir_estoque"
                checked={formData.conferir_estoque}
                onCheckedChange={(checked) => setFormData({ ...formData, conferir_estoque: !!checked })}
              />
              <Label htmlFor="conferir_estoque" className="text-sm font-normal cursor-pointer">
                Conferir na conferência de estoque
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Controle de Estoque */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Controle de Estoque</CardTitle>
            <CardDescription>{stockStatus.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cards de info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Quantidade Atual</p>
                <p className="text-2xl font-bold">{formData.quantidade}</p>
                <p className="text-xs text-muted-foreground">{formData.unidade}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                <p className="text-2xl font-bold">
                  {(formData.quantidade * formData.custo_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>

            {/* Campos editáveis */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade_ideal">Quantidade Mínima</Label>
                <Input
                  id="quantidade_ideal"
                  type="number"
                  min={0}
                  value={formData.quantidade_ideal}
                  onChange={(e) => setFormData({ ...formData, quantidade_ideal: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_maxima">Quantidade Máxima</Label>
                <Input
                  id="quantidade_maxima"
                  type="number"
                  min={0}
                  value={formData.quantidade_maxima}
                  onChange={(e) => setFormData({ ...formData, quantidade_maxima: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custo_unitario">Custo Unitário (R$)</Label>
                <Input
                  id="custo_unitario"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.custo_unitario}
                  onChange={(e) => setFormData({ ...formData, custo_unitario: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade de Medida</Label>
                <Select value={formData.unidade} onValueChange={(v) => setFormData({ ...formData, unidade: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select value={formData.fornecedor_id || "none"} onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo com matéria-prima */}
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-1">
                <Label className="text-base">Matéria-prima vinculada</Label>
                <p className="text-xs text-muted-foreground">
                  Vincule este item a uma matéria-prima comprada (ex.: bobina) e informe quantos {formData.unidade} se obtém de 1 unidade da matéria-prima.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Matéria-prima</Label>
                  <Select
                    value={formData.materia_prima_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, materia_prima_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {materiasPrimas.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} ({m.unidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.materia_prima_id
                      ? `${formData.unidade} por 1 ${
                          materiasPrimas.find((m) => m.id === formData.materia_prima_id)?.unidade || "un"
                        }`
                      : "Conversão"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!formData.materia_prima_id}
                    value={formData.materia_prima_conversao}
                    onChange={(e) => setFormData({ ...formData, materia_prima_conversao: Number(e.target.value) })}
                    placeholder="Ex: 300"
                  />
                </div>
              </div>
              {formData.materia_prima_id && formData.materia_prima_conversao > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ex.: 1 {materiasPrimas.find((m) => m.id === formData.materia_prima_id)?.unidade} ={" "}
                  {formData.materia_prima_conversao} {formData.unidade} de {formData.nome_produto || "este item"}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produção */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requer_pintura"
                checked={formData.requer_pintura}
                onCheckedChange={(checked) => setFormData({ ...formData, requer_pintura: !!checked })}
              />
              <Label htmlFor="requer_pintura" className="text-sm font-normal cursor-pointer">
                Este item requer pintura na produção
              </Label>
            </div>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="setor_responsavel_producao">Setor de Produção</Label>
              <Select
                value={formData.setor_responsavel_producao || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, setor_responsavel_producao: value as any })
                }
              >
                <SelectTrigger id="setor_responsavel_producao">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perfiladeira">Perfiladeira</SelectItem>
                  <SelectItem value="soldagem">Soldagem</SelectItem>
                  <SelectItem value="separacao">Separação</SelectItem>
                  <SelectItem value="pintura">Pintura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Cálculo Automático */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cálculo Automático</CardTitle>
            <CardDescription>
              Configure o cálculo automático do tamanho e quantidade do item em relação às dimensões da porta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cálculo de tamanho */}
            <div className="space-y-3">
              <Label className="text-base">Cálculo de tamanho</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modulo_calculo">Módulo</Label>
                  <Select
                    value={formData.modulo_calculo || undefined}
                    onValueChange={(value) => setFormData({ ...formData, modulo_calculo: value as any })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acrescimo">Acréscimo</SelectItem>
                      <SelectItem value="desconto">Desconto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_calculo">Valor (m)</Label>
                  <Input
                    id="valor_calculo"
                    type="number"
                    step="0.01"
                    value={formData.valor_calculo}
                    onChange={(e) => setFormData({ ...formData, valor_calculo: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 0.14"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eixo_calculo">Eixo</Label>
                  <Select
                    value={formData.eixo_calculo || undefined}
                    onValueChange={(value) => setFormData({ ...formData, eixo_calculo: value as any })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="largura">Largura</SelectItem>
                      <SelectItem value="altura">Altura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t">
              <Checkbox
                id="item_padrao_porta_enrolar"
                checked={formData.item_padrao_porta_enrolar}
                onCheckedChange={(checked) => setFormData({ ...formData, item_padrao_porta_enrolar: !!checked })}
              />
              <Label htmlFor="item_padrao_porta_enrolar" className="text-sm font-normal cursor-pointer">
                Item padrão para porta de enrolar (será sugerido automaticamente nos pedidos)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade_padrao">Quantidade padrão</Label>
              <Input
                id="quantidade_padrao"
                type="number"
                min={1}
                value={formData.quantidade_padrao}
                onChange={(e) => setFormData({ ...formData, quantidade_padrao: parseInt(e.target.value) || 1 })}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Quantidade inserida automaticamente ao adicionar este item a um pedido.</p>
            </div>

            {/* Cálculo automático de quantidade */}
            <div className="space-y-3 pt-3 border-t">
              <div>
                <Label className="text-base">Cálculo automático de quantidade</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando configurado, a quantidade será calculada com base nas dimensões da porta ao inserir o item no pedido. Se não configurado, será usada a quantidade padrão acima.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, qtd_modo_calculo: "formula" })}
                  className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                    formData.qtd_modo_calculo === "formula"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  Por fórmula (eixo × operador × valor)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, qtd_modo_calculo: "por_tamanho" })}
                  className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                    formData.qtd_modo_calculo === "por_tamanho"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  Por tamanho de porta (P / G / GG)
                </button>
              </div>

              {formData.qtd_modo_calculo === "formula" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qtd_eixo_calculo">Eixo</Label>
                    <Select
                      value={formData.qtd_eixo_calculo || undefined}
                      onValueChange={(value) => setFormData({ ...formData, qtd_eixo_calculo: value as any })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o eixo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="largura">Largura</SelectItem>
                        <SelectItem value="altura">Altura</SelectItem>
                        <SelectItem value="qtd_meia_cana">Qtd Meia Cana (⌈Altura÷0.076⌉)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtd_operador">Operador</Label>
                    <Select
                      value={formData.qtd_operador || undefined}
                      onValueChange={(value) => setFormData({ ...formData, qtd_operador: value as any })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiplicar">Multiplicar</SelectItem>
                        <SelectItem value="dividir">Dividir</SelectItem>
                        <SelectItem value="somar">Somar</SelectItem>
                        <SelectItem value="subtrair">Subtrair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtd_valor_calculo">Valor</Label>
                    <Input
                      id="qtd_valor_calculo"
                      type="number"
                      step="0.01"
                      value={formData.qtd_valor_calculo}
                      onChange={(e) => setFormData({ ...formData, qtd_valor_calculo: parseFloat(e.target.value) || 0 })}
                      placeholder="Ex: 0.10"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Defina a quantidade fixa para cada faixa de largura da porta. Faixas: P (&lt; 2m), G (2m a 2,99m), GG (≥ 3m).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qtd_porta_p">Qtd para porta P</Label>
                      <Input
                        id="qtd_porta_p"
                        type="number"
                        min={0}
                        value={formData.qtd_porta_p ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          qtd_porta_p: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                        })}
                        placeholder="Ex: 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd_porta_g">Qtd para porta G</Label>
                      <Input
                        id="qtd_porta_g"
                        type="number"
                        min={0}
                        value={formData.qtd_porta_g ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          qtd_porta_g: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                        })}
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd_porta_gg">Qtd para porta GG</Label>
                      <Input
                        id="qtd_porta_gg"
                        type="number"
                        min={0}
                        value={formData.qtd_porta_gg ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          qtd_porta_gg: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                        })}
                        placeholder="Ex: 4"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Regras de Quebra de Etiqueta */}
        {id && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Regras de Quebra de Etiqueta</CardTitle>
            </CardHeader>
            <CardContent>
              <RegrasEtiquetasEditor estoqueId={id} nomeProduto={formData.nome_produto} />
            </CardContent>
          </Card>
        )}

        {/* Histórico de Movimentações */}
        {movimentacoes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Últimas Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Nova</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <Badge variant={m.tipo_movimentacao === "entrada" ? "default" : m.tipo_movimentacao === "saida" ? "destructive" : "secondary"}>
                          {m.tipo_movimentacao === "entrada" ? "Entrada" : m.tipo_movimentacao === "saida" ? "Saída" : "Alteração"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.quantidade}</TableCell>
                      <TableCell className="text-right">{m.quantidade_anterior}</TableCell>
                      <TableCell className="text-right">{m.quantidade_nova}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">{m.observacoes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O produto será desativado do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(BACK_PATH)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>
    </MinimalistLayout>
  );
}
