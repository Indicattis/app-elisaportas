import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function usePinturaFornadaCusto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["pintura-fornada-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pintura_fornada_config")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (novoValor: number) => {
      if (!data?.id) throw new Error("Config não encontrada");
      const { error } = await supabase
        .from("pintura_fornada_config")
        .update({ custo_por_fornada: novoValor, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pintura-fornada-config"] });
      toast({ title: "Custo atualizado", description: "Custo por fornada salvo com sucesso" });
    },
    onError: (e) => {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Não foi possível salvar",
        variant: "destructive",
      });
    },
  });

  return {
    custoPorFornada: Number(data?.custo_por_fornada ?? 0),
    isLoading,
    update,
  };
}