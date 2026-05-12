import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RequisicaoCompraItem {
  id?: string;
  produto_id: string;
  produto_nome?: string;
  produto_sku?: string | null;
  produto_unidade?: string | null;
  quantidade: number;
  preco_unitario?: number;
  preco_total?: number;
  valor_unitario?: number;
  ipi_percent?: number;
  codigo_fornecedor?: string | null;
  localizacao?: string | null;
  observacoes?: string;
}

export interface RequisicaoCompra {
  id: string;
  numero_requisicao: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string | null;
  fornecedor_cidade?: string | null;
  fornecedor_estado?: string | null;
  status: "pendente_aprovacao" | "em_analise" | "aprovada" | "aguardando_fornecedor" | "ok_financeiro" | "rejeitada" | "em_cotacao" | "pedido_realizado" | "concluida";
  solicitante_id?: string;
  solicitante_nome?: string;
  data_necessidade?: string;
  observacoes?: string;
  motivo_rejeicao?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  valor_total: number;
  created_at: string;
  updated_at: string;
  itens?: RequisicaoCompraItem[];
}

export interface RequisicaoCompraFormData {
  fornecedor_id?: string;
  data_necessidade?: string;
  observacoes?: string;
  itens: RequisicaoCompraItem[];
}

export const useRequisicoesCompra = () => {
  const queryClient = useQueryClient();

  const { data: requisicoes = [], isLoading } = useQuery({
    queryKey: ["requisicoes-compra"],
    queryFn: async () => {
      const { data: reqData, error: reqError } = await supabase
        .from("requisicoes_compra")
        .select(`
          *,
          fornecedores(nome, cnpj, cidade, estado)
        `)
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // Buscar nomes dos solicitantes separadamente (FK aponta para auth.users, não para admin_users)
      const solicitanteIds = Array.from(
        new Set((reqData || []).map((r: any) => r.solicitante_id).filter(Boolean))
      );
      const solicitanteMap: Record<string, string> = {};
      if (solicitanteIds.length > 0) {
        const { data: usersData } = await supabase
          .from("admin_users")
          .select("user_id, nome")
          .in("user_id", solicitanteIds);
        (usersData || []).forEach((u: any) => {
          if (u.user_id) solicitanteMap[u.user_id] = u.nome;
        });
      }

      // Buscar itens de cada requisição
      const requisicoesComItens = await Promise.all(
        (reqData || []).map(async (req: any) => {
          const { data: itensData, error: itensError } = await supabase
            .from("requisicoes_compra_itens")
            .select(`
              *,
              estoque(nome_produto, sku, unidade, ipi_percent)
            `)
            .eq("requisicao_id", req.id);

          if (itensError) throw itensError;

          return {
            ...req,
            fornecedor_nome: req.fornecedores?.nome,
            fornecedor_cnpj: req.fornecedores?.cnpj ?? null,
            fornecedor_cidade: req.fornecedores?.cidade ?? null,
            fornecedor_estado: req.fornecedores?.estado ?? null,
            solicitante_nome: solicitanteMap[req.solicitante_id] ?? null,
            itens: (itensData || []).map((item: any) => ({
              ...item,
              produto_nome: item.estoque?.nome_produto,
              produto_sku: item.estoque?.sku ?? null,
              produto_unidade: item.estoque?.unidade ?? null,
            })),
          };
        })
      );

      return requisicoesComItens as RequisicaoCompra[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (requisicao: RequisicaoCompraFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gerar número da requisição
      const { data: numeroData, error: numeroError } = await supabase
        .rpc("gerar_numero_requisicao");

      if (numeroError) throw numeroError;

      // Criar requisição
      const valorTotal = (requisicao.itens || []).reduce((acc, it) => {
        const qtd = Number(it.quantidade) || 0;
        const vu = Number(it.valor_unitario) || 0;
        const ipi = Number(it.ipi_percent) || 0;
        return acc + qtd * vu * (1 + ipi / 100);
      }, 0);

      const { data: reqData, error: reqError } = await supabase
        .from("requisicoes_compra")
        .insert([{
          numero_requisicao: numeroData,
          fornecedor_id: requisicao.fornecedor_id,
          data_necessidade: requisicao.data_necessidade || null,
          observacoes: requisicao.observacoes,
          status: "pendente_aprovacao",
          valor_total: valorTotal,
          solicitante_id: user.id,
        }])
        .select()
        .single();

      if (reqError) throw reqError;

      // Criar itens
      const itensParaInserir = requisicao.itens.map((item) => ({
        requisicao_id: reqData.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: Number(item.valor_unitario) || 0,
        ipi_percent: Number(item.ipi_percent) || 0,
        codigo_fornecedor: item.codigo_fornecedor || null,
        localizacao: item.localizacao || null,
        observacoes: item.observacoes,
      }));

      const { error: itensError } = await supabase
        .from("requisicoes_compra_itens")
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      return reqData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisicoes-compra"] });
      toast({
        title: "Requisição criada",
        description: "Requisição de compra criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar requisição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RequisicaoCompra> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("requisicoes_compra")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisicoes-compra"] });
      toast({
        title: "Requisição atualizada",
        description: "Requisição atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar requisição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("requisicoes_compra")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisicoes-compra"] });
      toast({
        title: "Requisição excluída",
        description: "Requisição excluída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir requisição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    requisicoes,
    isLoading,
    createRequisicao: createMutation.mutateAsync,
    updateRequisicao: updateMutation.mutateAsync,
    deleteRequisicao: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
