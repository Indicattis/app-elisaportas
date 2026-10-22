import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContratoVenda } from "@/types/contrato";

interface ContratosVendasFilters {
  vendaId?: string;
  clienteNome?: string;
  clienteCpf?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export function useContratosVendas(filters: ContratosVendasFilters = {}) {
  const queryClient = useQueryClient();

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos-vendas', filters],
    queryFn: async () => {
      let query = supabase
        .from('contratos_vendas')
        .select(`
          *,
          template:contratos_templates(*),
          venda:vendas(cliente_nome, cpf_cliente)
        `)
        .order('created_at', { ascending: false });
      
      if (filters.vendaId) {
        query = query.eq('venda_id', filters.vendaId);
      }
      
      if (filters.clienteNome) {
        query = query.ilike('venda.cliente_nome', `%${filters.clienteNome}%`);
      }
      
      if (filters.clienteCpf) {
        query = query.ilike('venda.cpf_cliente', `%${filters.clienteCpf}%`);
      }
      
      if (filters.dataInicio) {
        const dataInicioStr = filters.dataInicio.toISOString().split('T')[0];
        query = query.gte('created_at', dataInicioStr);
      }
      
      if (filters.dataFim) {
        const dataFimStr = new Date(filters.dataFim.getTime() + 86400000).toISOString().split('T')[0];
        query = query.lte('created_at', dataFimStr);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ContratoVenda[];
    }
  });

  const uploadContrato = useMutation({
    mutationFn: async ({ 
      file, 
      vendaId, 
      templateId, 
      observacoes,
      tipoContrato,
    }: { 
      file: File; 
      vendaId: string; 
      templateId?: string; 
      observacoes?: string;
      tipoContrato?: 'elisa' | 'kit';
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('contratos-vendas')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('contratos-vendas')
        .getPublicUrl(fileName);
      
      // Criar registro no banco
      const { data, error } = await supabase
        .from('contratos_vendas')
        .insert({
          venda_id: vendaId,
          template_id: templateId,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: file.name,
          tamanho_arquivo: file.size,
          observacoes,
          tipo_contrato: tipoContrato ?? null,
          uploaded_by: userData.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-vendas'] });
      toast.success('Contrato vinculado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao fazer upload do contrato:', error);
      toast.error('Erro ao fazer upload do contrato');
    }
  });


  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      // Buscar o contrato para deletar o arquivo do storage
      const { data: contrato } = await supabase
        .from('contratos_vendas')
        .select('arquivo_url')
        .eq('id', id)
        .single();
      
      if (contrato?.arquivo_url) {
        const fileName = contrato.arquivo_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('contratos-vendas')
            .remove([fileName]);
        }
      }
      
      // Deletar registro do banco
      const { error } = await supabase
        .from('contratos_vendas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-vendas'] });
      toast.success('Contrato excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir contrato:', error);
      toast.error('Erro ao excluir contrato');
    }
  });

  return {
    contratos,
    isLoading,
    uploadContrato: uploadContrato.mutate,
    isUploading: uploadContrato.isPending,
    deleteContrato: deleteContrato.mutate,
    isDeleting: deleteContrato.isPending
  };
}
