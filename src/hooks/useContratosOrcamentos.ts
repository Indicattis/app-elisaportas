import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Filters {
  orcamentoId?: string;
}

export function useContratosOrcamentos(filters: Filters = {}) {
  const queryClient = useQueryClient();

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos-orcamentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('contratos_orcamentos')
        .select(`*, template:contratos_templates(*)`)
        .order('created_at', { ascending: false });

      if (filters.orcamentoId) query = query.eq('orcamento_id', filters.orcamentoId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!filters.orcamentoId,
  });

  const uploadContrato = useMutation({
    mutationFn: async ({
      file,
      orcamentoId,
      templateId,
      observacoes,
    }: {
      file: File;
      orcamentoId: string;
      templateId?: string;
      observacoes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `orcamentos/${orcamentoId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('contratos-vendas')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contratos-vendas')
        .getPublicUrl(path);

      const { data, error } = await supabase
        .from('contratos_orcamentos')
        .insert({
          orcamento_id: orcamentoId,
          template_id: templateId,
          arquivo_url: urlData.publicUrl,
          nome_arquivo: file.name,
          tamanho_arquivo: file.size,
          observacoes,
          uploaded_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-orcamentos'] });
      toast.success('Contrato vinculado ao orçamento');
    },
    onError: (error) => {
      console.error('Erro ao enviar contrato:', error);
      toast.error('Erro ao enviar contrato');
    },
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { data: contrato } = await supabase
        .from('contratos_orcamentos')
        .select('arquivo_url')
        .eq('id', id)
        .single();

      if (contrato?.arquivo_url) {
        // arquivo_url é publicUrl; extrair path após o bucket
        const marker = '/contratos-vendas/';
        const idx = contrato.arquivo_url.indexOf(marker);
        if (idx >= 0) {
          const path = contrato.arquivo_url.substring(idx + marker.length);
          await supabase.storage.from('contratos-vendas').remove([path]);
        }
      }

      const { error } = await supabase
        .from('contratos_orcamentos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-orcamentos'] });
      toast.success('Contrato excluído');
    },
    onError: (error) => {
      console.error('Erro ao excluir contrato:', error);
      toast.error('Erro ao excluir contrato');
    },
  });

  return {
    contratos,
    isLoading,
    uploadContrato: uploadContrato.mutate,
    isUploading: uploadContrato.isPending,
    deleteContrato: deleteContrato.mutate,
    isDeleting: deleteContrato.isPending,
  };
}