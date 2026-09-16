import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface ProdutoUnificado {
  tipo_produto?: string | null;
  tamanho?: string | null;
  largura?: number | null;
  altura?: number | null;
  quantidade?: number | null;
  cor?: {
    nome: string;
    codigo_hex: string;
  } | null;
}

export interface OrdemCarregamentoUnificada {
  id: string;
  fonte: 'ordens_carregamento' | 'instalacoes' | 'correcoes';
  pedido_id: string | null;
  venda_id: string | null;
  nome_cliente: string;
  data_carregamento: string | null;
  hora_carregamento: string | null;
  hora?: string | null;
  tipo_carregamento: 'elisa' | 'autorizados' | 'terceiro' | null;
  responsavel_carregamento_id: string | null;
  responsavel_carregamento_nome: string | null;
  carregamento_concluido: boolean;
  status: string | null;
  tipo_entrega: 'entrega' | 'instalacao' | 'manutencao' | null;
  observacoes?: string | null;
  created_at?: string | null;
  pedido?: {
    id: string;
    numero_pedido: string;
    etapa_atual?: string;
    observacoes?: string;
    updated_at?: string;
    ficha_visita_url?: string | null;
    ficha_visita_nome?: string | null;
    endereco_rua?: string | null;
    endereco_numero?: string | null;
    endereco_bairro?: string | null;
    endereco_cidade?: string | null;
    endereco_estado?: string | null;
    endereco_cep?: string | null;
  } | null;
  venda?: {
    id: string;
    cliente_nome: string;
    cliente_telefone?: string | null;
    cliente_email?: string | null;
    cidade?: string | null;
    estado?: string | null;
    bairro?: string | null;
    cep?: string | null;
    tipo_entrega?: 'entrega' | 'instalacao' | 'manutencao' | null;
    produtos?: ProdutoUnificado[];
  } | null;
  vendedor?: {
    id: string;
    nome: string;
    foto_perfil_url: string | null;
  } | null;
}

export const useOrdensCarregamentoUnificadas = () => {
  const queryClient = useQueryClient();

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens_carregamento_unificadas"],
    queryFn: async () => {
      // ===== 1. Buscar ordens de carregamento (APENAS ENTREGAS) =====
      const { data: ordensCarregamento, error: ocError } = await supabase
        .from("ordens_carregamento")
        .select(`
          *,
          venda:vendas(
            id,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            cidade,
            estado,
            bairro,
            cep,
            tipo_entrega,
            atendente_id,
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
            observacoes,
            updated_at,
            ficha_visita_url,
            ficha_visita_nome,
            endereco_rua,
            endereco_numero,
            endereco_bairro,
            endereco_cidade,
            endereco_estado,
            endereco_cep
          )
        `)
        .eq("carregamento_concluido", false)
        .order("created_at", { ascending: false });

      if (ocError) {
        console.error("[useOrdensCarregamentoUnificadas] Erro ao buscar ordens_carregamento:", ocError);
        throw ocError;
      }

      // Ordens comuns só ficam pendentes enquanto o pedido aguarda coleta.
      // Isso impede que registros antigos reapareçam após o pedido avançar.
      const todasOrdens = (ordensCarregamento || []).filter(
        (o) => o.pedido?.etapa_atual === 'aguardando_coleta'
      );

      // Deduplicar por pedido_id dentro de ordens_carregamento
      // Manter o registro mais relevante (com data agendada, ou o mais recente)
      const ordensUnicasPorPedido = (() => {
        const semPedido = todasOrdens.filter(o => !o.pedido_id);
        const comPedido = todasOrdens.filter(o => o.pedido_id);
        const porPedido = new Map<string, typeof comPedido[0]>();
        for (const ordem of comPedido) {
          const pedidoId = ordem.pedido_id;
          if (!pedidoId) continue;
          const existing = porPedido.get(pedidoId);
          if (!existing) {
            porPedido.set(pedidoId, ordem);
          } else {
            const ordemTemData = !!ordem.data_carregamento;
            const existingTemData = !!existing.data_carregamento;
            if (ordemTemData && !existingTemData) {
              porPedido.set(pedidoId, ordem);
            } else if (!ordemTemData && existingTemData) {
              // manter existing
            } else if (new Date(ordem.created_at || 0) > new Date(existing.created_at || 0)) {
              porPedido.set(pedidoId, ordem);
            }
          }
        }
        return [...semPedido, ...porPedido.values()];
      })();

      // Buscar dados dos vendedores (atendentes)
      const atendenteIds = [...new Set(ordensUnicasPorPedido.map(o => o.venda?.atendente_id).filter(Boolean))] as string[];
      const { data: vendedores } = atendenteIds.length > 0
        ? await supabase
            .from("admin_users")
            .select("user_id, nome, foto_perfil_url")
            .in("user_id", atendenteIds)
        : { data: [] };
      
      const vendedoresMap = new Map((vendedores || []).map(v => [v.user_id, v]));

      // ===== 2. Buscar instalações com carregamento pendente =====
      const { data: instalacoes, error: instError } = await supabase
        .from("instalacoes")
        .select(`
          *,
          venda:vendas(
            id,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            cidade,
            estado,
            bairro,
            cep,
            tipo_entrega,
            atendente_id,
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
          pedido:pedidos_producao!instalacoes_pedido_id_fkey(
            id,
            numero_pedido,
            etapa_atual,
            observacoes,
            updated_at,
            ficha_visita_url,
            ficha_visita_nome,
            endereco_rua,
            endereco_numero,
            endereco_bairro,
            endereco_cidade,
            endereco_estado,
            endereco_cep
          )
        `)
        .eq("carregamento_concluido", false)
        .eq("instalacao_concluida", false)
        .order("created_at", { ascending: false });

      if (instError) {
        console.error("[useOrdensCarregamentoUnificadas] Erro ao buscar instalacoes:", instError);
        throw instError;
      }

      // Filtrar instalações prontas para carregamento (incluindo aguardando_coleta)
      const instalacoesFiltradas = (instalacoes || []).filter(
        (inst) => inst.pedido?.etapa_atual === 'instalacoes' || inst.pedido?.etapa_atual === 'aguardando_coleta' || inst.status === 'pronta_fabrica'
      );

      // Manter apenas uma instalação pendente por pedido, priorizando a
      // agendada e, em seguida, o registro mais recente.
      const instalacoesParaCarregar = (() => {
        const semPedido = instalacoesFiltradas.filter((inst) => !inst.pedido_id);
        const porPedido = new Map<string, typeof instalacoesFiltradas[number]>();

        for (const instalacao of instalacoesFiltradas) {
          const pedidoId = instalacao.pedido_id;
          if (!pedidoId) continue;

          const existente = porPedido.get(pedidoId);
          if (!existente) {
            porPedido.set(pedidoId, instalacao);
            continue;
          }

          const instalacaoTemData = Boolean(instalacao.data_carregamento);
          const existenteTemData = Boolean(existente.data_carregamento);
          if (instalacaoTemData && !existenteTemData) {
            porPedido.set(pedidoId, instalacao);
          } else if (instalacaoTemData === existenteTemData && new Date(instalacao.created_at || 0) > new Date(existente.created_at || 0)) {
            porPedido.set(pedidoId, instalacao);
          }
        }

        return [...semPedido, ...porPedido.values()];
      })();

      // ===== 3. Buscar correções com carregamento pendente =====
      const { data: correcoes, error: corrError } = await supabase
        .from("correcoes")
        .select(`
          *,
          pedido:pedidos_producao!correcoes_pedido_id_fkey(
            id,
            numero_pedido,
            etapa_atual,
            observacoes,
            updated_at,
            ficha_visita_url,
            ficha_visita_nome,
            endereco_rua,
            endereco_numero,
            endereco_bairro,
            endereco_cidade,
            endereco_estado,
            endereco_cep
          )
        `)
        .eq("carregamento_concluido", false)
        .eq("concluida", false)
        .order("created_at", { ascending: false });

      if (corrError) {
        console.error("[useOrdensCarregamentoUnificadas] Erro ao buscar correcoes:", corrError);
        throw corrError;
      }

      // Filtrar correções cujo pedido está na etapa correcoes
      const correcoesParaCarregar = (correcoes || []).filter(
        (c) => c.pedido?.etapa_atual === 'correcoes'
      );

      // Deduplicar correções por pedido_id
      const correcoesUnicas = (() => {
        const porPedido = new Map<string, typeof correcoesParaCarregar[0]>();
        for (const corr of correcoesParaCarregar) {
          if (!corr.pedido_id) continue;
          const existing = porPedido.get(corr.pedido_id);
          if (!existing) {
            porPedido.set(corr.pedido_id, corr);
          } else {
            const corrTemData = !!corr.data_carregamento;
            const existingTemData = !!existing.data_carregamento;
            if (corrTemData && !existingTemData) {
              porPedido.set(corr.pedido_id, corr);
            } else if (!corrTemData && existingTemData) {
              // keep existing
            } else if (new Date(corr.created_at || 0) > new Date(existing.created_at || 0)) {
              porPedido.set(corr.pedido_id, corr);
            }
          }
        }
        return [...porPedido.values()];
      })();

      // Set de pedido_ids em correções para deduplicação
      const todosIdsCorrecoes = new Set(correcoesUnicas.map(c => c.pedido_id).filter(Boolean));

      // ===== 3b. Buscar todo o histórico de instalações para deduplicação =====
      // Registros concluídos também contam como existentes, evitando que o
      // pedido seja recriado abaixo como uma instalação "órfã" pendente.
      const { data: todosInstalacoesPedidoIds } = await supabase
        .from("instalacoes")
        .select("pedido_id")
        .not("pedido_id", "is", null);

      const todosIdsInstalacoes = new Set(
        (todosInstalacoesPedidoIds || []).map(i => i.pedido_id)
      );

      // ===== 3c. Buscar pedidos "órfãos" nas etapas corretas sem registro em nenhuma tabela =====
      const { data: pedidosOrfaos } = await supabase
        .from("pedidos_producao")
        .select(`
          id,
          numero_pedido,
          etapa_atual,
          observacoes,
          updated_at,
          ficha_visita_url,
          ficha_visita_nome,
          endereco_rua,
          endereco_numero,
          endereco_bairro,
          endereco_cidade,
          endereco_estado,
          endereco_cep,
          vendas:vendas!inner(
            id, cliente_nome, cliente_telefone, cliente_email,
            cidade, estado, bairro, cep, tipo_entrega, atendente_id,
            produtos:produtos_vendas(
              tipo_produto, tamanho, largura, altura, quantidade,
              cor:catalogo_cores(nome, codigo_hex)
            )
          )
        `)
        .in("etapa_atual", ["instalacoes", "aguardando_coleta"]);

      // IDs de pedidos já presentes em ordens_carregamento
      const pedidoIdsOrdens = new Set(ordensUnicasPorPedido.map(o => o.pedido_id).filter(Boolean));

      // Filtrar órfãos: não tem registro em instalacoes NEM em ordens_carregamento NEM em correcoes
      const orfaosReais = (pedidosOrfaos || []).filter(p => 
        !todosIdsInstalacoes.has(p.id) && !pedidoIdsOrdens.has(p.id) && !todosIdsCorrecoes.has(p.id)
      );

      // Buscar dados dos vendedores para instalações também
      const instAtendenteIds = [...new Set([
        ...instalacoesParaCarregar.map(i => i.venda?.atendente_id),
        ...orfaosReais.map(p => {
          const venda = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
          return venda?.atendente_id;
        })
      ].filter(Boolean))] as string[];
      const { data: instVendedores } = instAtendenteIds.length > 0
        ? await supabase
            .from("admin_users")
            .select("user_id, nome, foto_perfil_url")
            .in("user_id", instAtendenteIds.filter(id => !vendedoresMap.has(id)))
        : { data: [] };
      
      (instVendedores || []).forEach(v => vendedoresMap.set(v.user_id, v));

      // ===== 4. Deduplicar e normalizar =====
      const ordensDeduplicadas = ordensUnicasPorPedido.filter(o => !o.pedido_id || (!todosIdsInstalacoes.has(o.pedido_id) && !todosIdsCorrecoes.has(o.pedido_id)));

      const ordensNormalizadas: OrdemCarregamentoUnificada[] = [
        // Ordens de carregamento (deduplicadas)
        ...ordensDeduplicadas.map((ordem): OrdemCarregamentoUnificada => {
          const vendedorData = ordem.venda?.atendente_id ? vendedoresMap.get(ordem.venda.atendente_id) : null;
          return {
            id: ordem.id,
            fonte: 'ordens_carregamento',
            pedido_id: ordem.pedido_id,
            venda_id: ordem.venda_id,
            nome_cliente: ordem.nome_cliente,
            data_carregamento: ordem.data_carregamento,
            hora_carregamento: ordem.hora_carregamento || ordem.hora,
            hora: ordem.hora,
            tipo_carregamento: ordem.tipo_carregamento as 'elisa' | 'autorizados' | 'terceiro' | null,
            responsavel_carregamento_id: ordem.responsavel_carregamento_id,
            responsavel_carregamento_nome: ordem.responsavel_carregamento_nome,
            carregamento_concluido: ordem.carregamento_concluido || false,
            status: ordem.status,
            tipo_entrega: (ordem.venda?.tipo_entrega as 'entrega' | 'instalacao' | 'manutencao' | null) || 'entrega',
            observacoes: ordem.observacoes,
            created_at: ordem.created_at,
            pedido: ordem.pedido,
            venda: ordem.venda ? {
              ...ordem.venda,
              tipo_entrega: ordem.venda.tipo_entrega as 'entrega' | 'instalacao' | 'manutencao' | null,
            } : null,
            vendedor: vendedorData ? {
              id: vendedorData.user_id,
              nome: vendedorData.nome,
              foto_perfil_url: vendedorData.foto_perfil_url,
            } : null,
          };
        }),
        // Instalações (instalação/manutenção)
        ...instalacoesParaCarregar.map((inst): OrdemCarregamentoUnificada => {
          const vendedorData = inst.venda?.atendente_id ? vendedoresMap.get(inst.venda.atendente_id) : null;
          return {
            id: inst.id,
            fonte: 'instalacoes',
            pedido_id: inst.pedido_id,
            venda_id: inst.venda_id,
            nome_cliente: inst.nome_cliente,
            data_carregamento: inst.data_carregamento,
            hora_carregamento: inst.hora_carregamento || inst.hora,
            hora: inst.hora,
            tipo_carregamento: inst.tipo_carregamento as 'elisa' | 'autorizados' | 'terceiro' | null,
            responsavel_carregamento_id: inst.responsavel_carregamento_id,
            responsavel_carregamento_nome: inst.responsavel_carregamento_nome,
            carregamento_concluido: inst.carregamento_concluido || false,
            status: inst.status,
            tipo_entrega: inst.venda?.tipo_entrega === 'manutencao' ? 'manutencao' : 'instalacao',
            observacoes: inst.observacoes,
            created_at: inst.created_at,
            pedido: inst.pedido,
            venda: inst.venda ? {
              ...inst.venda,
              tipo_entrega: inst.venda.tipo_entrega as 'entrega' | 'instalacao' | 'manutencao' | null,
            } : null,
            vendedor: vendedorData ? {
              id: vendedorData.user_id,
              nome: vendedorData.nome,
              foto_perfil_url: vendedorData.foto_perfil_url,
            } : null,
          };
        }),
        // Pedidos "órfãos" (nas etapas corretas mas sem registro em instalacoes nem ordens_carregamento)
        ...orfaosReais.map((pedido): OrdemCarregamentoUnificada => {
          const venda = Array.isArray(pedido.vendas) ? pedido.vendas[0] : pedido.vendas;
          const vendedorData = venda?.atendente_id ? vendedoresMap.get(venda.atendente_id) : null;
          return {
            id: pedido.id, // usando pedido_id como id temporário
            fonte: 'instalacoes',
            pedido_id: pedido.id,
            venda_id: venda?.id || null,
            nome_cliente: venda?.cliente_nome || 'Cliente não identificado',
            data_carregamento: null,
            hora_carregamento: null,
            hora: null,
            tipo_carregamento: null,
            responsavel_carregamento_id: null,
            responsavel_carregamento_nome: null,
            carregamento_concluido: false,
            status: 'pendente_producao',
            tipo_entrega: (venda?.tipo_entrega as 'entrega' | 'instalacao' | 'manutencao' | null) || 'instalacao',
            observacoes: pedido.observacoes,
            created_at: pedido.updated_at,
            pedido: {
              id: pedido.id,
              numero_pedido: pedido.numero_pedido,
              etapa_atual: pedido.etapa_atual || undefined,
              observacoes: pedido.observacoes || undefined,
              updated_at: pedido.updated_at || undefined,
              ficha_visita_url: (pedido as any).ficha_visita_url || null,
              ficha_visita_nome: (pedido as any).ficha_visita_nome || null,
            },
            venda: venda ? {
              id: venda.id,
              cliente_nome: venda.cliente_nome,
              cliente_telefone: venda.cliente_telefone,
              cliente_email: venda.cliente_email,
              cidade: venda.cidade,
              estado: venda.estado,
              bairro: venda.bairro,
              cep: venda.cep,
              tipo_entrega: venda.tipo_entrega as 'entrega' | 'instalacao' | 'manutencao' | null,
              produtos: venda.produtos,
            } : null,
            vendedor: vendedorData ? {
              id: vendedorData.user_id,
              nome: vendedorData.nome,
              foto_perfil_url: vendedorData.foto_perfil_url,
            } : null,
          };
        }),
        // Correções com carregamento pendente
        ...correcoesUnicas.map((corr): OrdemCarregamentoUnificada => {
          return {
            id: corr.id,
            fonte: 'correcoes',
            pedido_id: corr.pedido_id,
            venda_id: corr.venda_id,
            nome_cliente: corr.nome_cliente,
            data_carregamento: corr.data_carregamento,
            hora_carregamento: corr.hora_carregamento || corr.hora,
            hora: corr.hora,
            tipo_carregamento: corr.tipo_carregamento as 'elisa' | 'autorizados' | 'terceiro' | null,
            responsavel_carregamento_id: corr.responsavel_carregamento_id,
            responsavel_carregamento_nome: corr.responsavel_carregamento_nome,
            carregamento_concluido: corr.carregamento_concluido || false,
            status: corr.status,
            tipo_entrega: 'entrega',
            observacoes: corr.observacoes,
            created_at: corr.created_at,
            pedido: corr.pedido,
            venda: {
              id: corr.venda_id || '',
              cliente_nome: corr.nome_cliente,
              cliente_telefone: corr.telefone_cliente,
              cidade: corr.cidade,
              estado: corr.estado,
              cep: corr.cep,
            },
          };
        }),
      ];

      // Ordenar por data de carregamento (null por último), depois por created_at
      ordensNormalizadas.sort((a, b) => {
        if (a.data_carregamento && b.data_carregamento) {
          return new Date(a.data_carregamento + 'T12:00:00').getTime() - new Date(b.data_carregamento + 'T12:00:00').getTime();
        }
        if (a.data_carregamento) return -1;
        if (b.data_carregamento) return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      return ordensNormalizadas;
    },
  });

  // Mutation para concluir carregamento (diferenciada por fonte)
  const concluirCarregamentoMutation = useMutation({
    mutationFn: async ({ ordem, observacoes, fotoFile }: { ordem: OrdemCarregamentoUnificada; observacoes?: string; fotoFile?: File }) => {
      console.log('[concluirCarregamentoUnificado] Concluindo:', ordem.id, 'Fonte:', ordem.fonte);

      // Upload da foto se fornecida
      let fotoUrl: string | null = null;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop() || 'jpg';
        const path = `${ordem.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-carregamento')
          .upload(path, fotoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('fotos-carregamento')
          .getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
      }
      
      if (ordem.fonte === 'ordens_carregamento') {
        const updateData: Record<string, any> = {};
        if (observacoes) updateData.observacoes = observacoes;
        if (fotoUrl) updateData.foto_carregamento_url = fotoUrl;
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("ordens_carregamento")
            .update(updateData)
            .eq("id", ordem.id);
        }

        const { error } = await supabase.rpc('concluir_carregamento_e_avancar_pedido', {
          p_ordem_carregamento_id: ordem.id
        });
        if (error) throw error;
      } else if (ordem.fonte === 'correcoes') {
        // Correções: atualizar observações/foto e marcar carregamento concluído
        const updateData: Record<string, any> = {
          carregamento_concluido: true,
        };
        if (observacoes) updateData.observacoes = observacoes;
        if (fotoUrl) updateData.foto_carregamento_url = fotoUrl;

        const { error: updateError } = await supabase
          .from("correcoes")
          .update(updateData)
          .eq("id", ordem.id);
        if (updateError) throw updateError;

        // Carregamento concluído — pedido permanece em 'correcoes'
        // O avanço para 'finalizado' ocorre quando o usuário confirma a conclusão em /logistica/instalacoes/ordens-instalacoes
      } else {
        const updateData: Record<string, any> = {};
        if (observacoes) updateData.observacoes = observacoes;
        if (fotoUrl) updateData.foto_carregamento_url = fotoUrl;
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("instalacoes")
            .update(updateData)
            .eq("id", ordem.id);
        }

        const { error } = await supabase.rpc('concluir_carregamento_instalacao', {
          p_instalacao_id: ordem.id
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
      queryClient.invalidateQueries({ queryKey: ["ordens_carregamento"] });
      queryClient.invalidateQueries({ queryKey: ["instalacoes"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-producao"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-etapas"] });
      
      if (variables.ordem.fonte === 'ordens_carregamento') {
        toast.success("Carregamento concluído! Pedido finalizado.");
      } else if (variables.ordem.fonte === 'correcoes') {
        toast.success("Carregamento da correção concluído! Aguardando conclusão da correção.");
      } else {
        toast.success("Carregamento concluído! Aguardando finalização da instalação.");
      }
    },
    onError: (error) => {
      console.error("[concluirCarregamentoUnificado] Erro:", error);
      toast.error("Erro ao concluir carregamento");
    },
  });

  // Subscription em tempo real para ambas as tabelas
  useEffect(() => {
    const channelOC = supabase
      .channel('ordens-carregamento-unificadas-oc')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_carregamento'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
        }
      )
      .subscribe();

    const channelInst = supabase
      .channel('ordens-carregamento-unificadas-inst')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instalacoes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
        }
      )
      .subscribe();

    const channelCorr = supabase
      .channel('ordens-carregamento-unificadas-corr')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'correcoes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ordens_carregamento_unificadas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelOC);
      supabase.removeChannel(channelInst);
      supabase.removeChannel(channelCorr);
    };
  }, [queryClient]);

  return {
    ordens,
    isLoading,
    concluirCarregamento: concluirCarregamentoMutation.mutateAsync,
    isConcluindo: concluirCarregamentoMutation.isPending,
  };
};
