import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePedidosEtapas } from "./usePedidosEtapas";
import type { Processo } from "@/components/pedidos/ProcessoAvancoModal";

type TipoOrdem = 'soldagem' | 'perfiladeira' | 'separacao' | 'qualidade' | 'pintura' | 'porta_social' | 'embalagem';

export function usePedidoAutoAvanco() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const { moverParaProximaEtapa } = usePedidosEtapas();

  const verificarOrdensProducaoConcluidas = async (pedidoId: string): Promise<boolean> => {
    try {
      // 1. Buscar todas as linhas de ordens de produção (solda, perfiladeira, separação)
      const { data: linhas, error: linhasError } = await supabase
        .from('linhas_ordens')
        .select('concluida')
        .eq('pedido_id', pedidoId)
        .in('tipo_ordem', ['soldagem', 'perfiladeira', 'separacao']);

      if (linhasError) throw linhasError;
      
      // Se não há linhas, considerar como concluída
      if (!linhas || linhas.length === 0) return true;

      // Verificar se todas as linhas estão concluídas
      const todasLinhasConcluidas = linhas.every(linha => linha.concluida === true);
      if (!todasLinhasConcluidas) {
        console.log('[Auto-Avanço] Nem todas as linhas estão concluídas');
        return false;
      }

      // 2. Verificar se as ordens de cada setor estão formalmente concluídas
      const tabelas = ['ordens_soldagem', 'ordens_perfiladeira', 'ordens_separacao'] as const;
      
      for (const tabela of tabelas) {
        // Buscar TODAS as ordens (independente de histórico) para verificar pausadas
        const { data: ordens, error } = await supabase
          .from(tabela)
          .select('status, pausada, historico')
          .eq('pedido_id', pedidoId);
        
        if (error) throw error;
        
        if (ordens && ordens.length > 0) {
          // Verificar ordens pausadas (independente de histórico)
          if (ordens.some(o => o.pausada === true)) {
            console.log(`[Auto-Avanço] Ordem em ${tabela} está pausada - bloqueando avanço`);
            return false;
          }
          
          // Verificar ordens ativas (não histórico) que não estão concluídas
          const ordensAtivas = ordens.filter(o => !o.historico);
          if (ordensAtivas.some(o => o.status !== 'concluido')) {
            console.log(`[Auto-Avanço] Ordem ativa em ${tabela} ainda não concluída formalmente`);
            return false;
          }
        }
      }

      // 3. Verificar se a ordem de porta social (terceirização) está concluída
      const { data: ordensPortaSocial, error: portaSocialError } = await supabase
        .from('ordens_porta_social')
        .select('status')
        .eq('pedido_id', pedidoId)
        .eq('historico', false);

      if (portaSocialError) throw portaSocialError;

      if (ordensPortaSocial && ordensPortaSocial.length > 0) {
        const todasPortaSocialConcluidas = ordensPortaSocial.every(o => o.status === 'concluido');
        if (!todasPortaSocialConcluidas) {
          console.log('[Auto-Avanço] Ordem de porta social ainda não concluída');
          return false;
        }
      }

      // 4. Verificar se há linhas com problema
      const { data: linhasComProblema, error: linhasProblemaError } = await supabase
        .from('linhas_ordens')
        .select('id')
        .eq('pedido_id', pedidoId)
        .eq('com_problema', true)
        .in('tipo_ordem', ['soldagem', 'perfiladeira', 'separacao'])
        .limit(1);

      if (linhasProblemaError) throw linhasProblemaError;

      if (linhasComProblema && linhasComProblema.length > 0) {
        console.log('[Auto-Avanço] Há linhas com problema - bloqueando avanço');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar ordens de produção:', error);
      return false;
    }
  };

  const verificarOrdemQualidadeConcluida = async (pedidoId: string): Promise<boolean> => {
    try {
      const { data: linhas, error } = await supabase
        .from('linhas_ordens')
        .select('concluida')
        .eq('pedido_id', pedidoId)
        .eq('tipo_ordem', 'qualidade');

      if (error) throw error;
      
      // Se não há linhas, considerar como concluída
      if (!linhas || linhas.length === 0) return true;

      return linhas.every(linha => linha.concluida === true);
    } catch (error) {
      console.error('Erro ao verificar ordem de qualidade:', error);
      return false;
    }
  };

  const verificarOrdemPinturaConcluida = async (pedidoId: string): Promise<boolean> => {
    try {
      // Verificar se a ordem de pintura existe e está com status 'pronta'
      const { data: ordemPintura, error: ordemError } = await supabase
        .from('ordens_pintura')
        .select('id, status')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      if (ordemError) throw ordemError;
      
      // Se não existe ordem de pintura, considerar como concluída (não precisa de pintura)
      if (!ordemPintura) return true;
      
      // Verificar se o status da ordem é 'pronta'
      if (ordemPintura.status === 'pronta' || ordemPintura.status === 'concluido') return true;
      
      // Verificar linhas
      const { data: linhas, error } = await supabase
        .from('linhas_ordens')
        .select('concluida')
        .eq('pedido_id', pedidoId)
        .eq('tipo_ordem', 'pintura');

      if (error) throw error;
      
      // Se não há linhas, considerar como concluída
      if (!linhas || linhas.length === 0) return true;

      return linhas.every(linha => linha.concluida === true);
    } catch (error) {
      console.error('Erro ao verificar ordem de pintura:', error);
      return false;
    }
  };

  const verificarOrdemEmbalagemConcluida = async (pedidoId: string): Promise<boolean> => {
    try {
      const { data: ordens, error: ordemError } = await supabase
        .from('ordens_embalagem')
        .select('id, status')
        .eq('pedido_id', pedidoId);

      if (ordemError) throw ordemError;
      if (!ordens || ordens.length === 0) return true;
      // Considerar concluída quando todas as ordens estão concluídas
      if (ordens.every(o => o.status === 'concluido')) return true;

      const { data: linhas, error } = await supabase
        .from('linhas_ordens')
        .select('concluida')
        .eq('pedido_id', pedidoId)
        .eq('tipo_ordem', 'embalagem');

      if (error) throw error;
      if (!linhas || linhas.length === 0) return true;

      return linhas.every(linha => linha.concluida === true);
    } catch (error) {
      console.error('Erro ao verificar ordem de embalagem:', error);
      return false;
    }
  };

  const buscarEtapaAtual = async (pedidoId: string): Promise<string | null> => {
    try {
      // Buscar o pedido para pegar a etapa atual
      const { data: pedido, error } = await supabase
        .from('pedidos_producao')
        .select('etapa_atual')
        .eq('id', pedidoId)
        .maybeSingle();

      if (error) throw error;
      return pedido?.etapa_atual || null;
    } catch (error) {
      console.error('Erro ao buscar etapa atual:', error);
      return null;
    }
  };

  const executarAvanco = useCallback(async (pedidoId: string): Promise<boolean> => {
    // Inicializar processos
    const processosIniciais: Processo[] = [
      { id: 'verificacao', label: 'Verificando conclusão de ordens...', status: 'completed' },
      { id: 'avanco', label: 'Avançando pedido...', status: 'in_progress' },
    ];

    setProcessos(processosIniciais);
    setModalOpen(true);

    // Aguardar um pouco para o modal aparecer
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      await moverParaProximaEtapa.mutateAsync({
        pedidoId,
        skipCheckboxValidation: true,
        onProgress: (label: string, status: 'pending' | 'in_progress' | 'completed' | 'error') => {
          const processo: Processo = {
            id: label.toLowerCase().replace(/\s+/g, '_'),
            label,
            status
          };

          setProcessos(prev => {
            const newProcessos = [...prev];
            const verificacaoIdx = newProcessos.findIndex(p => p.id === 'verificacao');
            if (verificacaoIdx !== -1) {
              newProcessos[verificacaoIdx].status = 'completed';
            }

            const exists = newProcessos.find(p => p.id === processo.id);
            if (!exists) {
              newProcessos.push(processo);
            } else {
              const idx = newProcessos.findIndex(p => p.id === processo.id);
              if (idx !== -1) {
                newProcessos[idx] = processo;
              }
            }
            return newProcessos;
          });
        }
      });

      setProcessos(prev => prev.map(p => ({ ...p, status: 'completed' as const })));
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Pedido avançado",
        description: "O pedido foi movido para a próxima etapa com sucesso.",
      });

      setModalOpen(false);
      setProcessos([]);
      return true;
    } catch (error) {
      console.error('[Auto-Avanço] Erro ao avançar:', error);
      setProcessos(prev => prev.map(p => ({ ...p, status: 'error' as const })));
      
      toast({
        title: "Erro ao avançar pedido",
        description: "Não foi possível avançar o pedido.",
        variant: "destructive",
      });

      setTimeout(() => {
        setModalOpen(false);
        setProcessos([]);
      }, 2000);
      return false;
    }
  }, [moverParaProximaEtapa, toast]);

  const verificarEAvancarManual = useCallback(async (pedidoId: string): Promise<{ avancou: boolean; motivo?: string }> => {
    try {
      console.log(`[Verificação Manual] Iniciando para pedido ${pedidoId}`);
      
      const etapaAtual = await buscarEtapaAtual(pedidoId);
      if (!etapaAtual) {
        return { avancou: false, motivo: 'Etapa atual não encontrada' };
      }

      console.log(`[Verificação Manual] Etapa atual: ${etapaAtual}`);

      let deveAvancar = false;
      let motivo = '';

      if (etapaAtual === 'em_producao') {
        deveAvancar = await verificarOrdensProducaoConcluidas(pedidoId);
        if (!deveAvancar) {
          motivo = 'Nem todas as ordens de produção estão concluídas';
        }
      } else if (etapaAtual === 'inspecao_qualidade') {
        deveAvancar = await verificarOrdemQualidadeConcluida(pedidoId);
        if (!deveAvancar) {
          motivo = 'Ordem de qualidade não está concluída';
        }
      } else if (etapaAtual === 'aguardando_pintura') {
        deveAvancar = await verificarOrdemPinturaConcluida(pedidoId);
        if (!deveAvancar) {
          motivo = 'Ordem de pintura não está concluída';
        }
      } else if (etapaAtual === 'embalagem') {
        deveAvancar = await verificarOrdemEmbalagemConcluida(pedidoId);
        if (!deveAvancar) {
          motivo = 'Ordem de embalagem não está concluída';
        }
      } else {
        motivo = `Etapa "${etapaAtual}" não suporta avanço automático`;
      }

      if (deveAvancar) {
        const avancou = await executarAvanco(pedidoId);
        return { avancou, motivo: avancou ? undefined : 'Erro ao executar avanço' };
      }

      return { avancou: false, motivo };
    } catch (error) {
      console.error('[Verificação Manual] Erro:', error);
      return { avancou: false, motivo: 'Erro ao verificar condições de avanço' };
    }
  }, [executarAvanco]);

  const tentarAvancoAutomatico = useCallback(async (pedidoId: string, tipoOrdemConcluida: TipoOrdem) => {
    try {
      console.log(`[Auto-Avanço] ========================================`);
      console.log(`[Auto-Avanço] Iniciando verificação para pedido ${pedidoId}`);
      console.log(`[Auto-Avanço] Tipo de ordem concluída: ${tipoOrdemConcluida}`);

      const etapaAtual = await buscarEtapaAtual(pedidoId);
      if (!etapaAtual) {
        console.log('[Auto-Avanço] Etapa atual não encontrada');
        return;
      }

      console.log(`[Auto-Avanço] Etapa atual: ${etapaAtual}`);

      let deveAvancar = false;

      if (etapaAtual === 'em_producao') {
        if (['soldagem', 'perfiladeira', 'separacao', 'porta_social'].includes(tipoOrdemConcluida)) {
          console.log(`[Auto-Avanço] Verificando se todas as ordens de produção estão concluídas...`);
          deveAvancar = await verificarOrdensProducaoConcluidas(pedidoId);
          console.log(`[Auto-Avanço] Resultado da verificação: deveAvancar = ${deveAvancar}`);
        } else {
          console.log(`[Auto-Avanço] Tipo ${tipoOrdemConcluida} não é ordem de produção, ignorando`);
        }
      } else if (etapaAtual === 'inspecao_qualidade') {
        if (tipoOrdemConcluida === 'qualidade') {
          console.log(`[Auto-Avanço] Verificando se ordem de qualidade está concluída...`);
          deveAvancar = await verificarOrdemQualidadeConcluida(pedidoId);
          console.log(`[Auto-Avanço] Resultado da verificação: deveAvancar = ${deveAvancar}`);
        } else {
          console.log(`[Auto-Avanço] Tipo ${tipoOrdemConcluida} não é qualidade, ignorando`);
        }
      } else if (etapaAtual === 'aguardando_pintura') {
        if (tipoOrdemConcluida === 'pintura') {
          console.log(`[Auto-Avanço] Verificando se ordem de pintura está concluída...`);
          deveAvancar = await verificarOrdemPinturaConcluida(pedidoId);
          console.log(`[Auto-Avanço] Resultado da verificação: deveAvancar = ${deveAvancar}`);
        } else {
          console.log(`[Auto-Avanço] Tipo ${tipoOrdemConcluida} não é pintura, ignorando`);
        }
      } else if (etapaAtual === 'embalagem') {
        if (tipoOrdemConcluida === 'embalagem') {
          console.log(`[Auto-Avanço] Verificando se ordem de embalagem está concluída...`);
          deveAvancar = await verificarOrdemEmbalagemConcluida(pedidoId);
          console.log(`[Auto-Avanço] Resultado da verificação: deveAvancar = ${deveAvancar}`);
        } else {
          console.log(`[Auto-Avanço] Tipo ${tipoOrdemConcluida} não é embalagem, ignorando`);
        }
      } else {
        console.log(`[Auto-Avanço] Etapa ${etapaAtual} não é tratada para tipo ${tipoOrdemConcluida}`);
      }

      console.log(`[Auto-Avanço] Decisão final: deveAvancar = ${deveAvancar}`);
      
      if (deveAvancar) {
        console.log('[Auto-Avanço] ✅ Iniciando avanço automático...');
        await executarAvanco(pedidoId);
      }
    } catch (error) {
      console.error('[Auto-Avanço] Erro geral:', error);
    }
  }, [executarAvanco]);

  return {
    tentarAvancoAutomatico,
    verificarEAvancarManual,
    processos,
    modalOpen,
    setModalOpen,
  };
}
