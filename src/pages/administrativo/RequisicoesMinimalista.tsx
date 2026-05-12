import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Plus, Eye, Trash2, Calendar, User, Package as PackageIcon, FileText, Clock, CheckCircle, TruckIcon, Download } from "lucide-react";
import { useRequisicoesCompra, RequisicaoCompra } from "@/hooks/useRequisicoesCompra";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { gerarPedidoCompraPDF } from "@/utils/pedidoCompraPDF";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  pendente_aprovacao: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  em_analise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  aprovada: "bg-green-500/20 text-green-400 border-green-500/30",
  aguardando_fornecedor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ok_financeiro: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  rejeitada: "bg-red-500/20 text-red-400 border-red-500/30",
  em_cotacao: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  pedido_realizado: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concluida: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const statusLabels: Record<string, string> = {
  pendente_aprovacao: "Pendente Aprovação",
  em_analise: "Em Análise",
  aprovada: "Aprovada",
  aguardando_fornecedor: "Aguardando Fornecedor",
  ok_financeiro: "Ok Financeiro",
  rejeitada: "Rejeitada",
  em_cotacao: "Em Cotação",
  pedido_realizado: "Pedido Realizado",
  concluida: "Concluída",
};

export default function RequisicoesMinimalista() {
  const navigate = useNavigate();
  const { requisicoes, isLoading, deleteRequisicao, isDeleting } = useRequisicoesCompra();
  const { settings: company } = useCompanySettings();
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [requisicaoSelecionada, setRequisicaoSelecionada] = useState<RequisicaoCompra | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requisicaoToDelete, setRequisicaoToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(
    () => sessionStorage.getItem("requisicoes_searchTerm") || ""
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    sessionStorage.setItem("requisicoes_searchTerm", value);
  };

  const requisicoesFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return requisicoes;
    const q = searchTerm.toLowerCase();
    return requisicoes.filter((r) =>
      [r.numero_requisicao, r.fornecedor_nome, r.solicitante_nome]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [requisicoes, searchTerm]);

  const handleVerDetalhes = (requisicao: RequisicaoCompra) => {
    setRequisicaoSelecionada(requisicao);
    setDetalhesOpen(true);
  };

  const handleDelete = (id: string) => {
    setRequisicaoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (requisicaoToDelete) {
      await deleteRequisicao(requisicaoToDelete);
      setDeleteDialogOpen(false);
      setRequisicaoToDelete(null);
    }
  };

  const handleExportarPDF = (req: RequisicaoCompra) => {
    gerarPedidoCompraPDF({
      numero: req.numero_requisicao,
      data_emissao: req.created_at,
      data_prevista: req.data_necessidade,
      observacoes: req.observacoes,
      itens: (req.itens || []).map((it) => ({
        descricao: it.produto_nome || "-",
        codigo: it.produto_sku ?? null,
        codigo_fornecedor: it.codigo_fornecedor ?? null,
        localizacao: it.localizacao ?? null,
        unidade: it.produto_unidade ?? null,
        quantidade: Number(it.quantidade) || 0,
        valor_unitario: Number(it.valor_unitario) || 0,
        ipi_percent: Number(it.ipi_percent) || 0,
      })),
      fornecedor: {
        nome: req.fornecedor_nome || "-",
        cnpj: req.fornecedor_cnpj,
        cidade: req.fornecedor_cidade,
        estado: req.fornecedor_estado,
      },
      empresa: {
        nome: company?.nome || "",
        cnpj: company?.cnpj,
        endereco: company?.endereco,
        cidade: company?.cidade,
        cep: company?.cep,
        telefone: company?.telefone,
      },
    });
  };

  const indicadores = useMemo(() => {
    const total = requisicoes.length;
    const emAnalise = requisicoes.filter(r => r.status === "em_analise").length;
    const aprovadas = requisicoes.filter(r => r.status === "aprovada").length;
    const aguardandoFornecedor = requisicoes.filter(r => r.status === "aguardando_fornecedor").length;
    const okFinanceiro = requisicoes.filter(r => r.status === "ok_financeiro").length;
    
    return { total, emAnalise, aprovadas, aguardandoFornecedor, okFinanceiro };
  }, [requisicoes]);

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Administrativo', path: '/administrativo' },
    { label: 'Compras', path: '/administrativo/compras' },
    { label: 'Requisições' }
  ];

  const headerActions = (
    <Button 
      onClick={() => navigate("/administrativo/compras/requisicoes/nova")}
      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nova Requisição
    </Button>
  );

  return (
    <MinimalistLayout
      title="Requisições de Compra"
      subtitle="Gestão de requisições de compra"
      backPath="/administrativo/compras"
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Total</span>
                <FileText className="h-4 w-4 text-white/40" />
              </div>
              <div className="text-2xl font-bold text-white">{indicadores.total}</div>
              <p className="text-xs text-white/40">requisições</p>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Em Análise</span>
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{indicadores.emAnalise}</div>
              <p className="text-xs text-white/40">pendentes</p>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Aprovadas</span>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{indicadores.aprovadas}</div>
              <p className="text-xs text-white/40">aprovadas</p>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Aguardando</span>
                <TruckIcon className="h-4 w-4 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white">{indicadores.aguardandoFornecedor}</div>
              <p className="text-xs text-white/40">em espera</p>
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/60">Ok Financeiro</span>
                <CheckCircle className="h-4 w-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white">{indicadores.okFinanceiro}</div>
              <p className="text-xs text-white/40">liberadas</p>
            </div>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-4 rounded-lg">
            <Input
              placeholder="Buscar por número, fornecedor ou solicitante..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* Lista de Requisições */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : requisicoesFiltradas.length === 0 ? (
          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex flex-col items-center justify-center py-12 rounded-lg">
              <ShoppingCart className="h-12 w-12 text-white/20 mb-4" />
              <p className="text-white/40 text-center">
                {searchTerm
                  ? "Nenhuma requisição encontrada para a busca."
                  : 'Nenhuma requisição cadastrada. Clique em "Nova Requisição" para começar.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Número</TableHead>
                    <TableHead className="text-white/60">Data</TableHead>
                    <TableHead className="text-white/60">Fornecedor</TableHead>
                    <TableHead className="text-white/60">Solicitante</TableHead>
                    <TableHead className="text-white/60">Necessário até</TableHead>
                    <TableHead className="text-center text-white/60">Itens</TableHead>
                    <TableHead className="text-white/60">Status</TableHead>
                    <TableHead className="text-right text-white/60">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisicoesFiltradas.map((requisicao) => (
                    <TableRow key={requisicao.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-semibold text-white">{requisicao.numero_requisicao}</TableCell>
                      <TableCell className="text-white/70">
                        {format(new Date(requisicao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-white">{requisicao.fornecedor_nome || "-"}</TableCell>
                      <TableCell className="text-white/80">{requisicao.solicitante_nome || "Sistema"}</TableCell>
                      <TableCell className="text-white/70">
                        {requisicao.data_necessidade
                          ? format(new Date(requisicao.data_necessidade), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center text-white">{requisicao.itens?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[requisicao.status]}>
                          {statusLabels[requisicao.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(requisicao)}
                            className="text-white hover:bg-white/10"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportarPDF(requisicao)}
                            className="text-white hover:bg-white/10"
                            title="Exportar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {requisicao.status === "pendente_aprovacao" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(requisicao.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Sheet open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-zinc-900 border-white/10 text-white">
          <SheetHeader>
            <SheetTitle className="text-white">Detalhes da Requisição</SheetTitle>
          </SheetHeader>

          {requisicaoSelecionada && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/60">Número</p>
                  <p className="font-semibold text-white">{requisicaoSelecionada.numero_requisicao}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Status</p>
                  <Badge className={statusColors[requisicaoSelecionada.status]}>
                    {statusLabels[requisicaoSelecionada.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-white/60">Solicitante</p>
                  <p className="font-medium text-white">{requisicaoSelecionada.solicitante_nome || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Fornecedor</p>
                  <p className="font-medium text-white">{requisicaoSelecionada.fornecedor_nome || "Não especificado"}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Data de Criação</p>
                  <p className="font-medium text-white">
                    {format(new Date(requisicaoSelecionada.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {requisicaoSelecionada.data_necessidade && (
                  <div>
                    <p className="text-sm text-white/60">Data de Necessidade</p>
                    <p className="font-medium text-white">
                      {format(new Date(requisicaoSelecionada.data_necessidade), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              {requisicaoSelecionada.observacoes && (
                <div>
                  <p className="text-sm text-white/60 mb-1">Observações</p>
                  <p className="text-sm text-white">{requisicaoSelecionada.observacoes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3 text-white">Itens da Requisição</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Produto</TableHead>
                      <TableHead className="text-white/60">Un</TableHead>
                      <TableHead className="text-center text-white/60">Quantidade</TableHead>
                      <TableHead className="text-right text-white/60">Valor unit.</TableHead>
                      <TableHead className="text-right text-white/60">IPI %</TableHead>
                      <TableHead className="text-right text-white/60">Total</TableHead>
                      <TableHead className="text-white/60">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisicaoSelecionada.itens?.map((item) => {
                      const qtd = Number(item.quantidade) || 0;
                      const vu = Number(item.valor_unitario) || 0;
                      const ipi = Number(item.ipi_percent) || 0;
                      const total = qtd * vu * (1 + ipi / 100);
                      const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      return (
                        <TableRow key={item.id} className="border-white/10">
                          <TableCell className="font-medium text-white">{item.produto_nome}</TableCell>
                          <TableCell className="text-white/80">{item.produto_unidade || "-"}</TableCell>
                          <TableCell className="text-center text-white">{qtd}</TableCell>
                          <TableCell className="text-right text-white/80">{fmt(vu)}</TableCell>
                          <TableCell className="text-right text-white/80">{ipi.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-white">{fmt(total)}</TableCell>
                          <TableCell className="text-white/60">{item.observacoes || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => handleExportarPDF(requisicaoSelecionada)}
                    className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}
