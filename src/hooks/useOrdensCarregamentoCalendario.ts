import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useEffect } from "react";

export const useOrdensCarregamentoCalendario = (
  currentDate: Date,
  periodo: 'week' | 'month' = 'week'
) => {
  const queryClient = useQueryClient();

  // Calcular intervalo de datas baseado no período
  const getDateRange = () => {
    if (periodo === 'week') {
      return {
        inicio: format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        fim: format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      };
    } else {
      return {
        inicio: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        fim: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
      };
    }
  };

  const { inicio, fim } = getDateRange();

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens_carregamento_calendario", inicio, fim],
    queryFn: async () => {
      // 1. Buscar de ordens_carregamento
      const { data: ordensCarregamento, error: errorOrdens } = await supabase
        .from("ordens_carregamento")
        .select(`
          *,
          venda:vendas(
            id,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            estado,
            cidade,
            cep,
            bairro,
            data_prevista_entrega,
            tipo_entrega,
            metodo_pagamento,
            cliente:clientes(
              endereco
            ),
            produtos:produtos_vendas(
              tipo_produto,
              tamanho,
              largura,
              altura,
              quantidade,
              cor:catalogo_cores(
                nome,
                codigo_hex
              )
            )
          ),
          pedido:pedidos_producao!ordens_carregamento_pedido_id_fkey(
            id,
            numero_pedido,
            etapa_atual,
            instalacao:instalacoes(
              id,
              responsavel_instalacao_id,
              responsavel_instalacao_nome
            )
          )
        `)
        .gte("data_carregamento", inicio)
        .lte("data_carregamento", fim)
        .eq("carregamento_concluido", false)
        .order("data_carregamento", { ascending: true });

      if (errorOrdens) throw errorOrdens;

      // 2. Buscar instalações com data_carregamento agendada
      const { data: instalacoes, error: errorInstalacoes } = await supabase
        .from("instalacoes")
        .select(`
          id,
          nome_cliente,
          data_carregamento,
          hora_carregamento,
          tipo_carregamento,
          responsavel_carregamento_id,
          responsavel_carregamento_nome,
          status,
          carregamento_concluido,
          observacoes,
          created_at,
          updated_at,
          cidade,
          estado,
          cep,
          endereco,
          telefone_cliente,
          cor:catalogo_cores(
            nome,
            codigo_hex
          ),
          pedido:pedidos_producao(
            id,
            numero_pedido,
            etapa_atual
          ),
          venda:vendas(
            id,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            estado,
            cidade,
            cep,
            bairro,
            data_prevista_entrega,
            tipo_entrega,
            metodo_pagamento,
            cliente:clientes(
              endereco
            ),
            produtos:produtos_vendas(
              tipo_produto,
              tamanho,
              largura,
              altura,
              quantidade,
              cor:catalogo_cores(
                nome,
                codigo_hex
              )
            )
          )
        `)
        .not("data_carregamento", "is", null)
        .gte("data_carregamento", inicio)
        .lte("data_carregamento", fim)
        .eq("carregamento_concluido", false);

      if (errorInstalacoes) throw errorInstalacoes;

      // 2b. Buscar correcoes com data_carregamento agendada (carregamento de correção pela expedição)
      const { data: correcoesData, error: errorCorrecoes } = await supabase
        .from("correcoes")
        .select(`
          id,
          pedido_id,
          venda_id,
          nome_cliente,
          data_carregamento,
          hora_carregamento,
          tipo_carregamento,
          responsavel_carregamento_id,
          responsavel_carregamento_nome,
          status,
          carregamento_concluido,
          observacoes,
          created_at,
          updated_at,
          cidade,
          estado,
          pedido:pedidos_producao!correcoes_pedido_id_fkey(
            id,
            numero_pedido,
            etapa_atual
          ),
          venda:vendas(
            id,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            estado,
            cidade,
            cep,
            bairro,
            data_prevista_entrega,
            tipo_entrega,
            metodo_pagamento,
            cliente:clientes(
              endereco
            ),
            produtos:produtos_vendas(
              tipo_produto,
              tamanho,
              largura,
              altura,
              quantidade,
              cor:catalogo_cores(
                nome,
                codigo_hex
              )
            )
          )
        `)
        .not("data_carregamento", "is", null)
        .gte("data_carregamento", inicio)
        .lte("data_carregamento", fim)
        .eq("carregamento_concluido", false);

      if (errorCorrecoes) throw errorCorrecoes;

      const correcoesNormalizadas = (correcoesData || []).map((corr: any) => ({
        id: corr.id,
        pedido_id: corr.pedido?.id || corr.pedido_id || null,
        venda_id: corr.venda?.id || corr.venda_id || null,
        nome_cliente: corr.nome_cliente,
        tipo_carregamento: corr.tipo_carregamento,
        data_carregamento: corr.data_carregamento,
        hora: corr.hora_carregamento,
        hora_carregamento: corr.hora_carregamento,
        responsavel_carregamento_id: corr.responsavel_carregamento_id,
        responsavel_carregamento_nome: corr.responsavel_carregamento_nome,
        status: corr.status,
        carregamento_concluido: corr.carregamento_concluido,
        carregamento_concluido_em: null,
        carregamento_concluido_por: null,
        latitude: null,
        longitude: null,
        geocode_precision: null,
        last_geocoded_at: null,
        observacoes: corr.observacoes,
        created_at: corr.created_at,
        updated_at: corr.updated_at,
        created_by: null,
        fonte: 'correcoes' as const,
        pedido: corr.pedido ? {
          id: corr.pedido.id,
          numero_pedido: corr.pedido.numero_pedido,
          etapa_atual: corr.pedido.etapa_atual,
          instalacao: null,
        } : undefined,
        venda: corr.venda || null,
      }));

      // 3. Normalizar instalações para o formato OrdemCarregamento
      const instalacoesNormalizadas = (instalacoes || []).map((inst: any) => {
        // Se tem venda vinculada, usar dados da venda
        // Senão, criar objeto com dados próprios da instalação (instalações avulsas)
        const vendaOuDadosProprios = inst.venda || (inst.cidade || inst.endereco || inst.telefone_cliente ? {
          id: null,
          cliente_nome: inst.nome_cliente,
          cliente_telefone: inst.telefone_cliente,
          cliente_email: null,
          cidade: inst.cidade,
          estado: inst.estado,
          cep: inst.cep,
          bairro: inst.endereco, // endereco contém endereço completo
          data_prevista_entrega: null,
          tipo_entrega: 'instalacao' as const,
          produtos: inst.cor ? [{
            tipo_produto: 'porta_enrolar',
            tamanho: null,
            largura: null,
            altura: null,
            quantidade: 1,
            cor: inst.cor
          }] : []
        } : null);

        return {
          id: inst.id,
          pedido_id: inst.pedido?.id || null,
          venda_id: inst.venda?.id || null,
          nome_cliente: inst.nome_cliente,
          tipo_carregamento: inst.tipo_carregamento,
          data_carregamento: inst.data_carregamento,
          hora: inst.hora_carregamento,
          hora_carregamento: inst.hora_carregamento,
          responsavel_carregamento_id: inst.responsavel_carregamento_id,
          responsavel_carregamento_nome: inst.responsavel_carregamento_nome,
          status: inst.status,
          carregamento_concluido: inst.carregamento_concluido,
          carregamento_concluido_em: null,
          carregamento_concluido_por: null,
          latitude: null,
          longitude: null,
          geocode_precision: null,
          last_geocoded_at: null,
          observacoes: inst.observacoes,
          created_at: inst.created_at,
          updated_at: inst.updated_at,
          created_by: null,
          fonte: 'instalacoes' as const,
          pedido: inst.pedido ? {
            id: inst.pedido.id,
            numero_pedido: inst.pedido.numero_pedido,
            etapa_atual: inst.pedido.etapa_atual,
            instalacao: null
          } : undefined,
          venda: vendaOuDadosProprios
        };
      });

      // 4. Filtrar apenas entregas (instalações vêm da tabela instalacoes)
      const ordensEntrega = (ordensCarregamento || []).filter(
        (ordem: any) => {
          const tipoEntrega = ordem.venda?.tipo_entrega;
          return tipoEntrega === 'entrega' || !tipoEntrega;
        }
      );
      const ordensComFonte = ordensEntrega.map((ordem: any) => ({
        ...ordem,
        fonte: 'ordens_carregamento' as const
      }));

      // 5. Combinar ordens e instalações (filtros já aplicados nas queries)
      return [...ordensComFonte, ...instalacoesNormalizadas] as OrdemCarregamento[];
    },
  });

  const updateOrdemMutation = useMutation({
    mutationFn: async ({ 
      id, 
      data,
      fonte = 'ordens_carregamento' 
    }: { 
      id: string; 
      data: Partial<OrdemCarregamento>;
      fonte?: 'ordens_carregamento' | 'instalacoes' | 'correcoes';
    }) => {
      // Rotear para a tabela correta baseado na fonte
      if (fonte === 'correcoes') {
        // Correções: atualizar na tabela correcoes
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        if (data.data_carregamento !== undefined) updateData.data_carregamento = data.data_carregamento;
        if (data.hora !== undefined) updateData.hora_carregamento = data.hora;
        if (data.hora_carregamento !== undefined) updateData.hora_carregamento = data.hora_carregamento;
        if (data.tipo_carregamento !== undefined) updateData.tipo_carregamento = data.tipo_carregamento;
        if (data.responsavel_carregamento_id !== undefined) updateData.responsavel_carregamento_id = data.responsavel_carregamento_id;
        if (data.responsavel_carregamento_nome !== undefined) updateData.responsavel_carregamento_nome = data.responsavel_carregamento_nome;
        if (data.status !== undefined) updateData.status = data.status;

        const { error } = await supabase
          .from("correcoes")
          .update(updateData)
          .eq("id", id);

        if (error) throw error;
      } else if (fonte === 'instalacoes') {
        // Verificar se o registro existe na tabela instalacoes
        const { data: existing } = await supabase
          .from("instalacoes")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (!existing) {
          // Pedido órfão: buscar dados do pedido e criar registro
          const { data: pedido } = await supabase
            .from("pedidos_producao")
            .select("id, venda_id, vendas(cliente_nome)")
            .eq("id", id)
            .maybeSingle();

          const nomeCliente = (pedido as any)?.vendas?.cliente_nome || 'Cliente';

          const insertData: Record<string, any> = {
            pedido_id: id,
            venda_id: pedido?.venda_id || null,
            nome_cliente: nomeCliente,
            hora: '08:00',
            status: 'pronta_fabrica',
            instalacao_concluida: false,
            carregamento_concluido: false,
          };
          if (data.data_carregamento !== undefined) insertData.data_carregamento = data.data_carregamento;
          if (data.hora !== undefined) insertData.hora_carregamento = data.hora;
          if (data.hora_carregamento !== undefined) insertData.hora_carregamento = data.hora_carregamento;
          if (data.tipo_carregamento !== undefined) insertData.tipo_carregamento = data.tipo_carregamento;
          if (data.responsavel_carregamento_id !== undefined) insertData.responsavel_carregamento_id = data.responsavel_carregamento_id;
          if (data.responsavel_carregamento_nome !== undefined) insertData.responsavel_carregamento_nome = data.responsavel_carregamento_nome;

          const { error } = await supabase
            .from("instalacoes")
            .insert(insertData as any);

          if (error) throw error;
        } else {
          // Registro existe: fazer UPDATE normalmente
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };
          if (data.data_carregamento !== undefined) updateData.data_carregamento = data.data_carregamento;
          if (data.hora !== undefined) updateData.hora_carregamento = data.hora;
          if (data.hora_carregamento !== undefined) updateData.hora_carregamento = data.hora_carregamento;
          if (data.tipo_carregamento !== undefined) updateData.tipo_carregamento = data.tipo_carregamento;
          if (data.responsavel_carregamento_id !== undefined) updateData.responsavel_carregamento_id = data.responsavel_carregamento_id;
          if (data.responsavel_carregamento_nome !== undefined) updateData.responsavel_carregamento_nome = data.responsavel_carregamento_nome;
          if (data.status !== undefined && data.status !== 'agendada') updateData.status = data.status;

          const { error } = await supabase
            .from("instalacoes")
            .update(updateData)
            .eq("id", id);

          if (error) throw error;
        }
      } else {
        // Verificar se o registro existe na tabela ordens_carregamento
        const { data: existing } = await supabase
          .from("ordens_carregamento")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (!existing) {
          // Pedido órfão: buscar dados do pedido e criar registro
          const { data: pedido } = await supabase
            .from("pedidos_producao")
            .select("id, venda_id, vendas(cliente_nome)")
            .eq("id", id)
            .maybeSingle();

          const nomeCliente = (pedido as any)?.vendas?.cliente_nome || 'Cliente';

          const insertData: Record<string, any> = {
            pedido_id: id,
            venda_id: pedido?.venda_id || null,
            nome_cliente: nomeCliente,
            hora: '08:00',
            status: 'agendada',
            carregamento_concluido: false,
          };
          if (data.data_carregamento !== undefined) insertData.data_carregamento = data.data_carregamento;
          if (data.hora !== undefined) insertData.hora = data.hora;
          if (data.hora_carregamento !== undefined) insertData.hora = data.hora_carregamento;
          if (data.tipo_carregamento !== undefined) insertData.tipo_carregamento = data.tipo_carregamento;
          if (data.responsavel_carregamento_id !== undefined) insertData.responsavel_carregamento_id = data.responsavel_carregamento_id;
          if (data.responsavel_carregamento_nome !== undefined) insertData.responsavel_carregamento_nome = data.responsavel_carregamento_nome;

          const { error } = await supabase
            .from("ordens_carregamento")
            .insert(insertData as any);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("ordens_carregamento")
            .update({
              ...data,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_calendario"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento"] });
      queryClient.invalidateQueries({ queryKey: ["instalacoes"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
      queryClient.invalidateQueries({ queryKey: ["correcoes"] });
      queryClient.invalidateQueries({ queryKey: ["ordens-carregamento-disponiveis"] });
      queryClient.invalidateQueries({ queryKey: ["pedido-carregamento"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar ordem:", error);
      toast.error("Erro ao atualizar ordem de carregamento");
    },
  });

  const deleteOrdemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ordens_carregamento")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_calendario"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento"] });
      toast.success("Ordem excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar ordem:", error);
      toast.error("Erro ao excluir ordem de carregamento");
    },
  });

  // Subscription em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('ordens-carregamento-calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_carregamento'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_calendario", inicio, fim] });
          queryClient.invalidateQueries({ queryKey: ["ordens-carregamento-disponiveis"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instalacoes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_calendario", inicio, fim] });
          queryClient.invalidateQueries({ queryKey: ["ordens-carregamento-disponiveis"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inicio, fim, queryClient]);

  return {
    ordens,
    isLoading,
    updateOrdem: updateOrdemMutation.mutateAsync,
    deleteOrdem: deleteOrdemMutation.mutateAsync,
    isUpdating: updateOrdemMutation.isPending,
    isDeleting: deleteOrdemMutation.isPending,
  };
};
