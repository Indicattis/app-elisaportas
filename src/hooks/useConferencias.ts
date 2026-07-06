import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Conferencia {
  id: string;
  veiculo_id: string;
  foto_url: string;
  km_atual: number;
  data_troca_oleo: string | null;
  agua_conferida: boolean;
  status: 'pronto' | 'atencao' | 'critico' | 'mecanico' | 'em_uso';
  conferido_por: string;
  created_at: string;
  conferente?: {
    nome: string;
    foto_perfil_url: string | null;
  };
}

export interface ConferenciaFormData {
  veiculo_id: string;
  foto_url: string;
  km_atual: number;
  data_troca_oleo?: string;
  agua_conferida: boolean;
  observacoes?: string;
  status: 'pronto' | 'atencao' | 'critico' | 'mecanico' | 'em_uso';
}

export function useConferencias(veiculoId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conferencias, isLoading } = useQuery({
    queryKey: ['conferencias', veiculoId],
    queryFn: async () => {
      if (!veiculoId) {
        return [];
      }

      const { data, error } = await supabase
        .from('veiculos_conferencias')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data?.map(c => ({
        ...c,
        status: c.status as 'pronto' | 'atencao' | 'critico' | 'mecanico' | 'em_uso'
      })) as Conferencia[];
    }
  });

  const createConferenciaMutation = useMutation({
    mutationFn: async (data: ConferenciaFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: conferencia, error } = await supabase
        .from('veiculos_conferencias')
        .insert([{ ...data, conferido_por: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return conferencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conferencias'] });
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      toast({
        title: 'Sucesso',
        description: 'Conferência registrada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar conferência',
        description: error.message,
      });
    }
  });

  const uploadFotoConferenciaMutation = useMutation({
    mutationFn: async ({ file, veiculo_id }: { file: File; veiculo_id: string }) => {
      // Compress/resize image to avoid "Load failed" on mobile with large photos
      const compressed = await compressImage(file, 1600, 0.8);
      const fileName = `conferencia-${veiculo_id}-${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('veiculos-fotos')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('veiculos-fotos')
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload da foto',
        description: error.message,
      });
    }
  });

  return {
    conferencias,
    isLoading,
    createConferencia: createConferenciaMutation.mutateAsync,
    uploadFotoConferencia: uploadFotoConferenciaMutation.mutateAsync,
    isCreating: createConferenciaMutation.isPending,
    isUploading: uploadFotoConferenciaMutation.isPending,
  };
}
