import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isVendaFaturada } from "@/lib/faturamentoStatus";
import type { VendaPendentePedido } from "@/hooks/useVendasPendentePedido";

export type VendaPendenteFaturamento = VendaPendentePedido;

export const useVendasPendenteFaturamento = () => {
  return useQuery({
    queryKey: ["vendas-pendente-faturamento"],
    queryFn: async (): Promise<VendaPendenteFaturamento[]> => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;

      const { data: vendas, error } = await supabase
        .from("vendas")
        .select(`
          id,
          data_venda,
          created_at,
          cliente_nome,
          valor_venda,
          valor_credito,
          valor_frete,
          frete_aprovado,
          status_aprovacao,
          lucro_total,
          is_rascunho,
          atendente_id,
          tipo_entrega,
          metodo_pagamento,
          numero_parcelas,
          quantidade_parcelas,
          pagamento_na_entrega,
          pago_na_instalacao,
          cidade,
          estado,
          produtos_vendas (
            id,
            faturamento,
            quantidade,
            tipo_produto,
            largura,
            altura,
            tamanho,
            desconto_valor,
            desconto_percentual,
            tipo_desconto,
            valor_produto,
            valor_pintura,
            valor_instalacao,
            catalogo_cores (
              nome,
              codigo_hex
            )
          ),
          pedidos_producao (
            id
          )
        `)
        .eq("is_rascunho", false)
        .eq("pedido_dispensado", false)
        .not("contrato_url", "is", null)
        .gte("data_venda", startOfYear)
        .order("data_venda", { ascending: false });

      if (error) throw error;
      if (!vendas) return [];

      // Fetch atendentes
      const { data: usuarios } = await supabase
        .from("admin_users")
        .select("user_id, nome, foto_perfil_url");

      const atendenteMap = new Map<string, { nome: string; foto: string | null }>();
      if (usuarios) {
        usuarios.forEach((u) => atendenteMap.set(u.user_id, { nome: u.nome, foto: u.foto_perfil_url }));
      }

      // Fetch payment methods
      const pagamentoMetodosPorVenda = new Map<string, string[]>();
      const parcelasPorVenda = new Map<string, number>();
      const pagoInstalacaoPorVenda = new Map<string, boolean>();
      try {
        const vendaIds = vendas.map((v: any) => v.id).filter(Boolean);
        if (vendaIds.length > 0) {
          const { data: contasReceber } = await supabase
            .from("contas_receber")
            .select("venda_id, metodo_pagamento, pago_na_instalacao")
            .in("venda_id", vendaIds);

          (contasReceber || []).forEach((conta: any) => {
            if (!conta?.venda_id) return;
            parcelasPorVenda.set(conta.venda_id, (parcelasPorVenda.get(conta.venda_id) || 0) + 1);
            if (conta.pago_na_instalacao) pagoInstalacaoPorVenda.set(conta.venda_id, true);
            if (conta.metodo_pagamento) {
              const atuais = pagamentoMetodosPorVenda.get(conta.venda_id) || [];
              if (!atuais.includes(conta.metodo_pagamento)) {
                atuais.push(conta.metodo_pagamento);
                pagamentoMetodosPorVenda.set(conta.venda_id, atuais);
              }
            }
          });
        }
      } catch (e) {
        console.error("Erro ao buscar métodos de pagamento:", e);
      }

      // Filter: NOT faturada + no pedido + not reprovado
      return vendas
        .filter((v: any) => {
          if (v.status_aprovacao === "reprovado") return false;
          if (isVendaFaturada(v)) return false;
          const pedidos = v.pedidos_producao || [];
          if (pedidos.length > 0) return false;
          return true;
        })
        .map((v: any) => {
          const produtos = v.produtos_vendas || [];
          const portas = produtos.filter((p: any) => p.tipo_produto === "porta_enrolar");
          const qtdPortas = portas.reduce((sum: number, p: any) => sum + (p.quantidade || 1), 0);

          const valorTabela = produtos.reduce((sum: number, p: any) => {
            const qty = p.quantidade || 1;
            return sum + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
          }, 0);

          const descontoTotal = produtos.reduce((sum: number, p: any) => {
            const qty = p.quantidade || 1;
            if (p.tipo_desconto === 'valor') return sum + (p.desconto_valor || 0);
            if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
              const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
              return sum + base * (p.desconto_percentual / 100);
            }
            return sum;
          }, 0);

          const coresUnicas = new Map<string, { nome: string; codigo_hex: string }>();
          produtos.forEach((p: any) => {
            const cor = p.catalogo_cores;
            if (cor?.nome && cor?.codigo_hex) coresUnicas.set(cor.nome, { nome: cor.nome, codigo_hex: cor.codigo_hex });
          });

          const portasInfo: Array<{ tamanho: 'P' | 'G'; largura: number; altura: number; area: number }> = [];
          portas.forEach((p: any) => {
            let largura = p.largura || 0;
            let altura = p.altura || 0;
            if (largura === 0 && altura === 0 && p.tamanho) {
              const match = p.tamanho.match(/(\d+[.,]?\d*)\s*[xX×]\s*(\d+[.,]?\d*)/);
              if (match) {
                largura = parseFloat(match[1].replace(',', '.'));
                altura = parseFloat(match[2].replace(',', '.'));
              }
            }
            const area = largura * altura;
            const cat = area > 25 ? 'G' as const : 'P' as const;
            const quantidade = p.quantidade || 1;
            for (let i = 0; i < quantidade; i++) portasInfo.push({ tamanho: cat, largura, altura, area });
          });

          const metodosExtras = (pagamentoMetodosPorVenda.get(v.id) || []).filter(
            (metodo) => metodo !== v.metodo_pagamento
          );

          return {
            id: v.id,
            data_venda: v.data_venda,
            created_at: v.created_at || null,
            cliente_nome: v.cliente_nome,
            valor_venda: v.valor_venda || 0,
            valor_credito: v.valor_credito || 0,
            valor_desconto_total: descontoTotal,
            valor_tabela: valorTabela,
            valor_frete: v.valor_frete || 0,
            quantidade_portas: qtdPortas,
            atendente_nome: v.atendente_id ? atendenteMap.get(v.atendente_id)?.nome || null : null,
            atendente_foto_url: v.atendente_id ? atendenteMap.get(v.atendente_id)?.foto || null : null,
            tipo_entrega: v.tipo_entrega || null,
            metodo_pagamento: v.metodo_pagamento || null,
            metodo_pagamento_entrega: metodosExtras[0] || null,
            numero_parcelas: parcelasPorVenda.get(v.id) || v.quantidade_parcelas || v.numero_parcelas || null,
            pago_na_instalacao: pagoInstalacaoPorVenda.get(v.id) || false,
            pagamento_na_entrega: v.pagamento_na_entrega || false,
            lucro_total: v.lucro_total ?? null,
            cidade: v.cidade || null,
            estado: v.estado || null,
            cores: Array.from(coresUnicas.values()),
            portas_info: portasInfo,
          };
        });
    },
    refetchInterval: 30000,
  });
};
