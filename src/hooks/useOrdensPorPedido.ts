import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EtapaPedido } from "@/types/pedidoEtapa";

export type TipoOrdem = 'soldagem' | 'perfiladeira' | 'separacao' | 'qualidade' | 'pintura' | 'embalagem' | 'carregamento' | 'instalacao';

export interface ResponsavelInfo {
  nome: string;
  foto_url: string | null;
  iniciais: string;
}

export interface LinhaProblemaInfo {
  id: string;
  item: string;
  quantidade: number;
  tamanho: string | null;
}

export interface OrdemStatus {
  existe: boolean;
  id: string | null;
  numero_ordem: string | null;
  status: string | null;
  tipo: TipoOrdem;
  responsavel: ResponsavelInfo | null;
  responsavel_id: string | null;
  pausada: boolean;
  justificativa_pausa: string | null;
  pausada_em: string | null;
  linha_problema: LinhaProblemaInfo | null;
  linhas_concluidas: number;
  total_linhas: number;
  // Campos para cronômetro
  capturada_em: string | null;
  tempo_acumulado_segundos: number | null;
  tempo_conclusao_segundos: number | null;
  // Campos para agendamento (carregamento/instalação)
  data_agendamento: string | null;
  hora_agendamento: string | null;
  responsavel_nome: string | null;
  tipo_responsavel: 'elisa' | 'autorizados' | 'terceiro' | null;
}

export interface CorInfo {
  nome: string;
  codigo_hex: string;
}

export interface VendedorInfo {
  nome: string;
  foto_url: string | null;
  iniciais: string;
}

export interface PedidoComOrdens {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  etapa_atual: string;
  prioridade_etapa: number | null;
  localizacao: string | null;
  tipo_entrega: 'instalacao' | 'entrega' | null;
  cores: CorInfo[];
  portas_p: number;
  portas_g: number;
  metragem_linear: number;
  metragem_quadrada: number;
  vendedor: VendedorInfo | null;
  ordens: {
    soldagem: OrdemStatus;
    perfiladeira: OrdemStatus;
    separacao: OrdemStatus;
    qualidade: OrdemStatus;
    pintura: OrdemStatus;
    embalagem: OrdemStatus;
    carregamento: OrdemStatus;
    instalacao: OrdemStatus;
  };
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function useOrdensPorPedido(etapa: EtapaPedido) {
  return useQuery({
    queryKey: ['ordens-por-pedido', etapa],
    queryFn: async (): Promise<PedidoComOrdens[]> => {
      // Buscar pedidos da etapa com dados expandidos
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos_producao')
        .select(`
          id,
          numero_pedido,
          etapa_atual,
          prioridade_etapa,
          venda:venda_id (
            id,
            cidade,
            estado,
            tipo_entrega,
            cliente_nome,
            cliente:cliente_id (nome),
            atendente:atendente_id (nome, foto_perfil_url)
          )
        `)
        .eq('etapa_atual', etapa)
        .order('prioridade_etapa', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (pedidosError) {
        console.error('Erro ao buscar pedidos:', pedidosError);
        return [];
      }

      if (!pedidos || pedidos.length === 0) return [];

      const pedidoIds = pedidos.map(p => p.id);
      const vendaIds = pedidos
        .map(p => (p.venda as any)?.id)
        .filter(Boolean);

      // Buscar ordens com responsáveis, produtos e linhas em paralelo
      const [
        soldagemRes,
        perfiladeiraRes,
        separacaoRes,
        qualidadeRes,
        pinturaRes,
        embalagemRes,
        carregamentoRes,
        instalacaoRes,
        produtosRes,
        linhasRes,
      ] = await Promise.all([
        supabase
          .from('ordens_soldagem')
          .select(`
            id, pedido_id, numero_ordem, status, responsavel_id, pausada, justificativa_pausa, pausada_em,
            capturada_em, tempo_acumulado_segundos, tempo_conclusao_segundos,
            linha_problema_id,
            linha_problema:linha_problema_id (id, item, quantidade, tamanho)
          `)
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_perfiladeira')
          .select(`
            id, pedido_id, numero_ordem, status, responsavel_id, metragem_linear, pausada, justificativa_pausa, pausada_em,
            capturada_em, tempo_acumulado_segundos, tempo_conclusao_segundos,
            linha_problema_id,
            linha_problema:linha_problema_id (id, item, quantidade, tamanho)
          `)
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_separacao')
          .select(`
            id, pedido_id, numero_ordem, status, responsavel_id, pausada, justificativa_pausa, pausada_em,
            capturada_em, tempo_acumulado_segundos, tempo_conclusao_segundos,
            linha_problema_id,
            linha_problema:linha_problema_id (id, item, quantidade, tamanho)
          `)
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_qualidade')
          .select('id, pedido_id, numero_ordem, status, responsavel_id, capturada_em, tempo_acumulado_segundos, tempo_conclusao_segundos')
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_pintura')
          .select('id, pedido_id, numero_ordem, status, responsavel_id, metragem_quadrada, capturada_em, tempo_conclusao_segundos')
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_embalagem')
          .select('id, pedido_id, numero_ordem, status, responsavel_id, capturada_em, tempo_conclusao_segundos')
          .in('pedido_id', pedidoIds),
        supabase
          .from('ordens_carregamento')
          .select('id, pedido_id, status, responsavel_carregamento_id, responsavel_carregamento_nome, tipo_carregamento, data_carregamento, hora_carregamento, carregamento_concluido')
          .in('pedido_id', pedidoIds),
        supabase
          .from('instalacoes')
          .select('id, pedido_id, status, responsavel_instalacao_id, responsavel_instalacao_nome, tipo_instalacao, data_instalacao, hora, instalacao_concluida')
          .in('pedido_id', pedidoIds),
        vendaIds.length > 0
          ? supabase
              .from('produtos_vendas')
              .select(`
                id,
                venda_id,
                tipo_produto,
                largura,
                altura,
                quantidade,
                cor:cor_id (nome, codigo_hex)
              `)
              .in('venda_id', vendaIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('linhas_ordens')
          .select('id, pedido_id, tipo_ordem, tamanho, quantidade, concluida')
          .in('pedido_id', pedidoIds),
      ]);

      // Coletar todos os responsavel_ids únicos
      const allResponsavelIds = new Set<string>();
      [soldagemRes.data, perfiladeiraRes.data, separacaoRes.data, qualidadeRes.data, pinturaRes.data, embalagemRes.data]
        .forEach(ordens => {
          ordens?.forEach((o: any) => {
            if (o.responsavel_id) allResponsavelIds.add(o.responsavel_id);
          });
        });
      // Adicionar responsáveis de carregamento e instalação
      carregamentoRes.data?.forEach((o: any) => {
        if (o.responsavel_carregamento_id) allResponsavelIds.add(o.responsavel_carregamento_id);
      });
      instalacaoRes.data?.forEach((o: any) => {
        if (o.responsavel_instalacao_id) allResponsavelIds.add(o.responsavel_instalacao_id);
        if (o.responsavel_carregamento_id) allResponsavelIds.add(o.responsavel_carregamento_id);
      });

      // Buscar dados dos responsáveis
      let responsaveisMap: Record<string, ResponsavelInfo> = {};
      if (allResponsavelIds.size > 0) {
        const { data: responsaveis } = await supabase
          .from('admin_users')
          .select('user_id, nome, foto_perfil_url')
          .in('user_id', Array.from(allResponsavelIds));

        responsaveis?.forEach(r => {
          responsaveisMap[r.user_id] = {
            nome: r.nome,
            foto_url: r.foto_perfil_url,
            iniciais: getIniciais(r.nome),
          };
        });
      }

      // Criar mapas para acesso rápido
      const produtosPorVenda: Record<string, any[]> = {};
      produtosRes.data?.forEach((p: any) => {
        if (!produtosPorVenda[p.venda_id]) produtosPorVenda[p.venda_id] = [];
        produtosPorVenda[p.venda_id].push(p);
      });

      // Mapa de linhas por pedido e tipo de ordem
      const linhasCountMap: Record<string, Record<TipoOrdem, { concluidas: number; total: number }>> = {};
      linhasRes.data?.forEach((l: any) => {
        const pedidoId = l.pedido_id;
        const tipoOrdem = l.tipo_ordem as TipoOrdem;
        if (!linhasCountMap[pedidoId]) {
          linhasCountMap[pedidoId] = {} as Record<TipoOrdem, { concluidas: number; total: number }>;
        }
        if (!linhasCountMap[pedidoId][tipoOrdem]) {
          linhasCountMap[pedidoId][tipoOrdem] = { concluidas: 0, total: 0 };
        }
        linhasCountMap[pedidoId][tipoOrdem].total += 1;
        if (l.concluida) {
          linhasCountMap[pedidoId][tipoOrdem].concluidas += 1;
        }
      });

      // Mapa separado para cálculo de metragem linear (perfiladeira)
      const linhasPorPedido: Record<string, any[]> = {};
      linhasRes.data?.forEach((l: any) => {
        if (l.tipo_ordem === 'perfiladeira') {
          if (!linhasPorPedido[l.pedido_id]) linhasPorPedido[l.pedido_id] = [];
          linhasPorPedido[l.pedido_id].push(l);
        }
      });

      // Mapas de ordens por pedido
      const ordensMap: Record<string, Record<TipoOrdem, any>> = {};
      const processOrdens = (data: any[] | null, tipo: TipoOrdem) => {
        if (!data) return;
        data.forEach(ordem => {
          if (!ordensMap[ordem.pedido_id]) {
            ordensMap[ordem.pedido_id] = {} as Record<TipoOrdem, any>;
          }
          ordensMap[ordem.pedido_id][tipo] = ordem;
        });
      };

      processOrdens(soldagemRes.data, 'soldagem');
      processOrdens(perfiladeiraRes.data, 'perfiladeira');
      processOrdens(separacaoRes.data, 'separacao');
      processOrdens(qualidadeRes.data, 'qualidade');
      processOrdens(pinturaRes.data, 'pintura');
      processOrdens(embalagemRes.data, 'embalagem');
      
      // Processar carregamento - mapear responsavel_carregamento_id para responsavel_id
      carregamentoRes.data?.forEach((ordem: any) => {
        if (!ordensMap[ordem.pedido_id]) {
          ordensMap[ordem.pedido_id] = {} as Record<TipoOrdem, any>;
        }
        ordensMap[ordem.pedido_id]['carregamento'] = {
          ...ordem,
          responsavel_id: ordem.responsavel_carregamento_id,
          responsavel_nome: ordem.responsavel_carregamento_nome,
          tipo_responsavel: ordem.tipo_carregamento,
          data_agendamento: ordem.data_carregamento,
          hora_agendamento: ordem.hora_carregamento,
          status: ordem.carregamento_concluido ? 'concluido' : (ordem.data_carregamento ? 'agendado' : 'pendente'),
        };
      });
      
      // Processar instalação - mapear responsavel_instalacao_id para responsavel_id
      instalacaoRes.data?.forEach((ordem: any) => {
        if (!ordensMap[ordem.pedido_id]) {
          ordensMap[ordem.pedido_id] = {} as Record<TipoOrdem, any>;
        }
        ordensMap[ordem.pedido_id]['instalacao'] = {
          ...ordem,
          responsavel_id: ordem.responsavel_instalacao_id,
          responsavel_nome: ordem.responsavel_instalacao_nome,
          tipo_responsavel: ordem.tipo_instalacao,
          data_agendamento: ordem.data_instalacao,
          hora_agendamento: ordem.hora,
          status: ordem.instalacao_concluida ? 'concluido' : (ordem.data_instalacao ? 'agendado' : 'pendente'),
        };
      });

      // Consolidar pedidos com ordens
      const resultado: PedidoComOrdens[] = pedidos.map(pedido => {
        const venda = pedido.venda as any;
        const vendaId = venda?.id;
        const produtos = vendaId ? (produtosPorVenda[vendaId] || []) : [];
        const linhas = linhasPorPedido[pedido.id] || [];
        const ordensDosPedido = ordensMap[pedido.id] || {};

        // Calcular cores únicas
        const coresMap = new Map<string, CorInfo>();
        produtos.forEach((p: any) => {
          if (p.cor?.nome && p.cor?.codigo_hex) {
            coresMap.set(p.cor.nome, {
              nome: p.cor.nome,
              codigo_hex: p.cor.codigo_hex,
            });
          }
        });

        // Calcular portas P/G (área > 25m² = G)
        let portas_p = 0;
        let portas_g = 0;
        produtos
          .filter((p: any) => p.tipo_produto === 'porta_enrolar')
          .forEach((p: any) => {
            const area = ((p.largura || 0) / 1000) * ((p.altura || 0) / 1000); // mm para m
            const qtd = p.quantidade || 1;
            if (area > 25) portas_g += qtd;
            else portas_p += qtd;
          });

        // Calcular metragem linear (das linhas de perfiladeira)
        let metragem_linear = 0;
        // Primeiro verificar se a ordem de perfiladeira tem metragem
        const ordemPerfiladeira = ordensDosPedido['perfiladeira'];
        if (ordemPerfiladeira?.metragem_linear) {
          metragem_linear = ordemPerfiladeira.metragem_linear;
        } else {
          // Calcular das linhas
          linhas.forEach((l: any) => {
            const metros = parseFloat(String(l.tamanho || '0').replace(',', '.')) || 0;
            metragem_linear += metros * (l.quantidade || 1);
          });
        }

        // Calcular metragem quadrada (para pintura)
        let metragem_quadrada = 0;
        const ordemPintura = ordensDosPedido['pintura'];
        if (ordemPintura?.metragem_quadrada) {
          metragem_quadrada = ordemPintura.metragem_quadrada;
        } else {
          produtos
            .filter((p: any) => p.tipo_produto === 'porta_enrolar')
            .forEach((p: any) => {
              const area = ((p.largura || 0) / 1000) * ((p.altura || 0) / 1000);
              metragem_quadrada += area * (p.quantidade || 1);
            });
        }

        // Vendedor
        const atendente = venda?.atendente;
        const vendedor: VendedorInfo | null = atendente ? {
          nome: atendente.nome,
          foto_url: atendente.foto_perfil_url,
          iniciais: getIniciais(atendente.nome),
        } : null;

        // Localização
        const cidade = venda?.cidade || '';
        const estado = venda?.estado || '';
        const localizacao = cidade && estado ? `${cidade}/${estado}` : (cidade || estado || null);

        // Tipo entrega
        const tipoEntregaRaw = venda?.tipo_entrega;
        const tipo_entrega: 'instalacao' | 'entrega' | null = 
          tipoEntregaRaw === 'instalacao' ? 'instalacao' :
          tipoEntregaRaw === 'entrega' || tipoEntregaRaw === 'coleta' || tipoEntregaRaw === 'autorizado' ? 'entrega' : null;

        const criarOrdemStatus = (tipo: TipoOrdem): OrdemStatus => {
          const ordem = ordensDosPedido[tipo];
          const responsavelId = ordem?.responsavel_id;
          const linhasCount = linhasCountMap[pedido.id]?.[tipo] || { concluidas: 0, total: 0 };
          const linhaProblema = ordem?.linha_problema;
          return {
            existe: !!ordem,
            id: ordem?.id || null,
            numero_ordem: ordem?.numero_ordem || null,
            status: ordem?.status || null,
            tipo,
            responsavel: responsavelId ? responsaveisMap[responsavelId] || null : null,
            responsavel_id: responsavelId || null,
            pausada: ordem?.pausada || false,
            justificativa_pausa: ordem?.justificativa_pausa || null,
            pausada_em: ordem?.pausada_em || null,
            linha_problema: linhaProblema ? {
              id: linhaProblema.id,
              item: linhaProblema.item,
              quantidade: linhaProblema.quantidade,
              tamanho: linhaProblema.tamanho,
            } : null,
            linhas_concluidas: linhasCount.concluidas,
            total_linhas: linhasCount.total,
            // Campos para cronômetro
            capturada_em: ordem?.capturada_em || null,
            tempo_acumulado_segundos: ordem?.tempo_acumulado_segundos || null,
            tempo_conclusao_segundos: ordem?.tempo_conclusao_segundos || null,
            // Campos para agendamento (carregamento/instalação)
            data_agendamento: ordem?.data_agendamento || null,
            hora_agendamento: ordem?.hora_agendamento || null,
            responsavel_nome: ordem?.responsavel_nome || null,
            tipo_responsavel: ordem?.tipo_responsavel || null,
          };
        };

        return {
          id: pedido.id,
          numero_pedido: pedido.numero_pedido,
          cliente_nome: (venda?.cliente as any)?.nome || venda?.cliente_nome || 'Cliente não encontrado',
          etapa_atual: pedido.etapa_atual,
          prioridade_etapa: pedido.prioridade_etapa,
          localizacao,
          tipo_entrega,
          cores: Array.from(coresMap.values()),
          portas_p,
          portas_g,
          metragem_linear,
          metragem_quadrada,
          vendedor,
          ordens: {
            soldagem: criarOrdemStatus('soldagem'),
            perfiladeira: criarOrdemStatus('perfiladeira'),
            separacao: criarOrdemStatus('separacao'),
            qualidade: criarOrdemStatus('qualidade'),
            pintura: criarOrdemStatus('pintura'),
            embalagem: criarOrdemStatus('embalagem'),
            carregamento: criarOrdemStatus('carregamento'),
            instalacao: criarOrdemStatus('instalacao'),
          },
        };
      });

      return resultado;
    },
    staleTime: 30 * 1000,
  });
}
