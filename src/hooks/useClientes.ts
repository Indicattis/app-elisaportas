import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoCliente = 'CE' | 'CR';

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  estado?: string | null;
  cidade?: string | null;
  cep?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  canal_aquisicao_id?: string | null;
  canal_aquisicao?: { id: string; nome: string } | null;
  observacoes?: string | null;
  tipo_cliente?: TipoCliente | null;
  fidelizado?: boolean | null;
  parceiro?: boolean | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  vendedor?: { id: string; nome: string; foto_perfil_url?: string | null } | null;
  total_vendas?: number;
  numero_vendas?: number;
  ultima_compra?: string | null;
}

export interface ClienteFormData {
  nome: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  estado?: string;
  cidade?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  canal_aquisicao_id?: string;
  observacoes?: string;
  tipo_cliente?: TipoCliente;
  fidelizado?: boolean;
  parceiro?: boolean;
}

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes" as any)
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (clientesError) throw clientesError;
      
      const { data: canaisData } = await supabase
        .from("canais_aquisicao")
        .select("id, nome");
      
      // Buscar usuários para mapear vendedores (usando user_id pois created_by armazena o auth.users id)
      const { data: usersData } = await supabase
        .from("admin_users")
        .select("id, nome, foto_perfil_url, user_id");
      
      // Buscar totais de vendas por cliente
      const { data: vendasData } = await supabase
        .from("vendas")
        .select("cliente_id, valor_venda, data_venda");
      
      // Calcular total de vendas, número de vendas e última compra por cliente
      const totaisVendas = new Map<string, number>();
      const numeroVendas = new Map<string, number>();
      const ultimaCompra = new Map<string, string>();
      (vendasData || []).forEach((venda: any) => {
        if (venda.cliente_id) {
          const atualTotal = totaisVendas.get(venda.cliente_id) || 0;
          totaisVendas.set(venda.cliente_id, atualTotal + (venda.valor_venda || 0));
          const atualNumero = numeroVendas.get(venda.cliente_id) || 0;
          numeroVendas.set(venda.cliente_id, atualNumero + 1);
          
          // Atualizar última compra se for mais recente
          const ultimaAtual = ultimaCompra.get(venda.cliente_id);
          if (!ultimaAtual || (venda.data_venda && venda.data_venda > ultimaAtual)) {
            ultimaCompra.set(venda.cliente_id, venda.data_venda);
          }
        }
      });
      
      const canaisMap = new Map(canaisData?.map(c => [c.id, c]) || []);
      const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || []);
      
      const clientes = (clientesData || []).map((cliente: any) => ({
        ...cliente,
        canal_aquisicao: cliente.canal_aquisicao_id 
          ? canaisMap.get(cliente.canal_aquisicao_id) || null 
          : null,
        vendedor: cliente.created_by 
          ? usersMap.get(cliente.created_by) || null 
          : null,
        total_vendas: totaisVendas.get(cliente.id) || 0,
        numero_vendas: numeroVendas.get(cliente.id) || 0,
        ultima_compra: ultimaCompra.get(cliente.id) || null
      }));

      return clientes as Cliente[];
    },
  });
}

// Hook para buscar clientes por nome ou CPF/CNPJ
export function useSearchClientes(searchTerm: string) {
  return useQuery({
    queryKey: ["clientes-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      // Normalizar busca removendo caracteres especiais para CPF/CNPJ
      const termNormalizado = searchTerm.replace(/\D/g, '');
      const isNumeric = termNormalizado.length >= 3;
      
      let query = supabase
        .from("clientes" as any)
        .select("*")
        .eq("ativo", true);
      
      if (isNumeric) {
        // Buscar por CPF/CNPJ (contém os números)
        query = query.ilike("cpf_cnpj", `%${termNormalizado}%`);
      } else {
        // Buscar por nome
        query = query.ilike("nome", `%${searchTerm}%`);
      }
      
      const { data, error } = await query.order("nome").limit(10);
      
      if (error) throw error;
      return (data || []) as unknown as Cliente[];
    },
    enabled: searchTerm.length >= 2,
  });
}

// Hook para verificar duplicação de CPF/CNPJ
export function useCheckClienteDuplicado(cpfCnpj: string) {
  return useQuery({
    queryKey: ["cliente-duplicado", cpfCnpj],
    queryFn: async () => {
      if (!cpfCnpj) return null;
      
      const cpfNormalizado = cpfCnpj.replace(/\D/g, '');
      if (cpfNormalizado.length < 11) return null;
      
      const { data, error } = await supabase
        .from("clientes" as any)
        .select("id, nome, cpf_cnpj, telefone, email, estado, cidade, cep, endereco, bairro, canal_aquisicao_id")
        .eq("ativo", true)
        .ilike("cpf_cnpj", `%${cpfNormalizado}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as Cliente | null;
    },
    enabled: cpfCnpj.replace(/\D/g, '').length >= 11,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClienteFormData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: cliente, error } = await supabase
        .from("clientes" as any)
        .insert({
          ...data,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-search"] });
      toast.success("Cliente criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast.error("Erro ao criar cliente");
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClienteFormData }) => {
      const { data: cliente, error } = await supabase
        .from("clientes" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-search"] });
      toast.success("Cliente atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente");
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clientes" as any)
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-search"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente");
    },
  });
}

export interface VendedorTransferencia {
  user_id: string;
  nome: string;
  ativo: boolean;
  foto_perfil_url?: string | null;
  totalClientes: number;
}

export function useVendedoresParaTransferencia() {
  return useQuery({
    queryKey: ["vendedores-transferencia"],
    queryFn: async () => {
      const [{ data: usuarios, error: usuariosError }, { data: clientesData, error: clientesError }] = await Promise.all([
        supabase
          .from("admin_users")
          .select("user_id, nome, ativo, foto_perfil_url, tipo_usuario")
          .in("tipo_usuario", ["colaborador", "metamorfo"]),
        supabase
          .from("clientes" as any)
          .select("created_by")
          .eq("ativo", true),
      ]);

      if (usuariosError) throw usuariosError;
      if (clientesError) throw clientesError;

      const contagem = new Map<string, number>();
      (clientesData || []).forEach((c: any) => {
        if (c.created_by) contagem.set(c.created_by, (contagem.get(c.created_by) || 0) + 1);
      });

      const vendedores: VendedorTransferencia[] = (usuarios || [])
        .filter((u: any) => u.user_id)
        .map((u: any) => ({
          user_id: u.user_id,
          nome: u.nome,
          ativo: !!u.ativo,
          foto_perfil_url: u.foto_perfil_url,
          totalClientes: contagem.get(u.user_id) || 0,
        }));

      return {
        inativosComClientes: vendedores
          .filter(v => !v.ativo && v.totalClientes > 0)
          .sort((a, b) => b.totalClientes - a.totalClientes),
        ativos: vendedores
          .filter(v => v.ativo)
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      };
    },
  });
}

export function useTransferirClientes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ origemUserId, destinoUserId }: { origemUserId: string; destinoUserId: string }) => {
      if (origemUserId === destinoUserId) {
        throw new Error("Vendedor de origem e destino devem ser diferentes");
      }
      const { data, error } = await supabase
        .from("clientes" as any)
        .update({ created_by: destinoUserId })
        .eq("created_by", origemUserId)
        .select("id");

      if (error) throw error;
      return (data as any[])?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-search"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-transferencia"] });
      toast.success(`${count} cliente(s) transferido(s) com sucesso!`);
    },
    onError: (error: any) => {
      console.error("Erro ao transferir clientes:", error);
      toast.error(error?.message || "Erro ao transferir clientes");
    },
  });
}

export function useDelegarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clienteId, destinoUserId }: { clienteId: string; destinoUserId: string }) => {
      const { error } = await supabase
        .from("clientes" as any)
        .update({ created_by: destinoUserId })
        .eq("id", clienteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["meus-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-search"] });
      queryClient.invalidateQueries({ queryKey: ["vendedores-transferencia"] });
      toast.success("Cliente delegado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao delegar cliente:", error);
      toast.error(error?.message || "Erro ao delegar cliente");
    },
  });
}
